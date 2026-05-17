import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { CoinsService } from '../coins/coins.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PromoService } from '../promo/promo.service';
import { ReferralService } from '../referral/referral.service';
import { ServiceableAreasService } from '../serviceable-areas/serviceable-areas.service';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import { AdminOrdersQueryDto } from './dto/admin-orders-query.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateRefundStatusDto } from './dto/update-refund-status.dto';
import { UpdateOrderItemsDto } from './dto/update-order-items.dto';

@Injectable()
export class OrdersService {
  constructor(
    private supabase: SupabaseService,
    private stockMovements: StockMovementsService,
    private promoService: PromoService,
    private coinsService: CoinsService,
    private referralService: ReferralService,
    private serviceableAreas: ServiceableAreasService,
    private notifications: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateOrderDto) {
    // Re-validate promo server-side if provided — rejects tampered discount amounts
    let verifiedPromoId: string | null = null;
    let verifiedDiscount = 0;

    if (dto.promo_code) {
      const { promo, discount_amount } = await this.promoService.validateCode(
        dto.promo_code,
        dto.items_total,
        userId, // for per-customer and first-order-only checks
      );
      verifiedPromoId = promo.id;

      if ((promo as unknown as { applicable_categories?: string[] | null }).applicable_categories?.length) {
        // For category-specific promos, trust client discount (was computed with items at validate-time)
        verifiedDiscount = Math.min(dto.discount_amount ?? 0, dto.items_total);
      } else {
        verifiedDiscount = discount_amount;
        if (dto.discount_amount !== undefined && dto.discount_amount !== verifiedDiscount) {
          throw new BadRequestException(
            'Discount amount mismatch — please re-apply the promo code.',
          );
        }
      }
    }

    let coinDiscount = 0;
    if (dto.coins_redeemed) {
      const result = await this.coinsService.validateRedemption(userId, dto.coins_redeemed);
      coinDiscount = result.discountAmount;
    }

    const serverFinalTotal = (dto.promo_code || dto.coins_redeemed)
      ? Math.max(0, dto.items_total - verifiedDiscount - coinDiscount + dto.delivery_fee)
      : dto.final_total;

    // Validate delivery area serviceability
    if (dto.delivery_pincode) {
      const serviceable = await this.serviceableAreas.isServiceable(dto.delivery_pincode);
      if (!serviceable) {
        throw new BadRequestException(
          `We don't currently deliver to pincode ${dto.delivery_pincode}. Please use a different address.`,
        );
      }
    }

    // Validate delivery slot if provided
    let slot: { id: string; booked: number } | null = null;
    if (dto.delivery_slot_id) {
      const { data: slotData, error: slotErr } = await this.supabase.admin
        .from('delivery_slots')
        .select('id, booked, capacity, is_enabled')
        .eq('id', dto.delivery_slot_id)
        .single();
      if (slotErr || !slotData) throw new BadRequestException('Delivery slot not found');
      const s = slotData as { id: string; booked: number; capacity: number; is_enabled: boolean };
      if (!s.is_enabled) throw new BadRequestException('Delivery slot is not available');
      if (s.booked >= s.capacity) throw new BadRequestException('Delivery slot is fully booked');
      slot = s;
    }

    const { data: order, error: orderError } = await this.supabase.admin
      .from('orders')
      .insert({
        user_id: userId,
        items_total: dto.items_total,
        delivery_fee: dto.delivery_fee,
        final_total: serverFinalTotal,
        promo_code: dto.promo_code?.trim().toUpperCase() ?? null,
        discount_amount: verifiedDiscount,
        delivery_address: dto.delivery_address,
        delivery_landmark: dto.delivery_landmark ?? null,
        delivery_slot_id: dto.delivery_slot_id ?? null,
        delivery_instructions: dto.delivery_instructions ?? null,
        payment_method: 'cod',
        payment_status: 'pending',
        status: 'placed',
      })
      .select()
      .single();

    if (orderError) throw new BadRequestException(orderError.message);

    // Increment slot booked count after successful order creation
    if (slot) {
      await this.supabase.admin
        .from('delivery_slots')
        .update({ booked: slot.booked + 1 })
        .eq('id', slot.id);
    }

    const itemRows = dto.items.map((i) => ({
      order_id: order.id,
      product_id: i.product_id ?? null,
      product_name: i.product_name,
      product_image: i.product_image ?? null,
      product_weight: i.product_weight ?? null,
      quantity: i.quantity,
      unit_price: i.unit_price,
      total_price: i.total_price,
    }));

    const { error: itemsError } = await this.supabase.admin
      .from('order_items')
      .insert(itemRows);

    if (itemsError) throw new BadRequestException(itemsError.message);

    // Decrement stock for each product ordered (bundles → decrement constituents)
    const orderedItems = dto.items.filter((i) => i.product_id);

    if (orderedItems.length > 0) {
      const { data: products } = await this.supabase.admin
        .from('products')
        .select('id, stock, category')
        .in('id', orderedItems.map((i) => i.product_id as string));

      if (products) {
        const productMap = new Map(
          (products as { id: string; stock: number; category: string }[]).map((p) => [p.id, p]),
        );

        // Fetch bundle_items for any bundle products in this order
        const bundleOrderedIds = orderedItems
          .filter((i) => productMap.get(i.product_id!)?.category === 'bundles')
          .map((i) => i.product_id as string);

        const bundleItemsMap = new Map<string, { product_id: string; quantity: number }[]>();
        if (bundleOrderedIds.length > 0) {
          const { data: bundleItems } = await this.supabase.admin
            .from('bundle_items')
            .select('bundle_id, product_id, quantity')
            .in('bundle_id', bundleOrderedIds);
          if (bundleItems) {
            for (const bi of bundleItems as { bundle_id: string; product_id: string; quantity: number }[]) {
              const arr = bundleItemsMap.get(bi.bundle_id) ?? [];
              arr.push({ product_id: bi.product_id, quantity: bi.quantity });
              bundleItemsMap.set(bi.bundle_id, arr);
            }
          }
        }

        const shortId = order.id.slice(0, 8).toUpperCase();
        await Promise.all(
          orderedItems.map(async (i) => {
            const product = productMap.get(i.product_id!);
            if (!product) return;

            if (product.category === 'bundles') {
              // Decrement each constituent by (bundle_item.qty × order_item.qty)
              const constituents = bundleItemsMap.get(i.product_id!) ?? [];
              await Promise.all(
                constituents.map(async (bi) => {
                  const needed = bi.quantity * i.quantity;
                  const { data: constitProd } = await this.supabase.admin
                    .from('products').select('id, stock').eq('id', bi.product_id).single();
                  if (!constitProd) return;
                  const newStock = Math.max(0, (constitProd as { stock: number }).stock - needed);
                  await this.supabase.admin
                    .from('products')
                    .update({ stock: newStock, updated_at: new Date().toISOString() })
                    .eq('id', bi.product_id);
                  await this.stockMovements.log(bi.product_id, 'sale', needed, `Bundle Order ${shortId}`, order.id);
                }),
              );
            } else {
              // Regular product
              const newStock = Math.max(0, (product.stock ?? 0) - i.quantity);
              await this.supabase.admin
                .from('products')
                .update({ stock: newStock, updated_at: new Date().toISOString() })
                .eq('id', i.product_id as string);
              await this.stockMovements.log(i.product_id as string, 'sale', i.quantity, `Order ${shortId}`, order.id);
            }
          }),
        );
      }
    }

    // Record promo usage per-customer + increment global count
    if (verifiedPromoId) {
      this.promoService.recordUsage(verifiedPromoId, userId, order.id).catch(() => {});
    }

    // Update loyalty tier tracking and check for referral reward (non-fatal)
    this.coinsService.updateOrderValue(userId, serverFinalTotal).catch(() => {});

    const { count: orderCount } = await this.supabase.admin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .neq('status', 'cancelled');
    if (orderCount === 1) {
      this.referralService.rewardFirstOrder(userId, order.id).catch(() => {});
    }

    // Notify user: order placed
    const shortId = order.id.slice(0, 8).toUpperCase();
    this.notifications.createNotification(
      userId, 'order_update', 'Order Placed! 🎉',
      `Your order #${shortId} has been placed successfully.`,
      { order_id: order.id },
    ).catch(() => {});

    // Award ZestStar Coins based on loyalty tier — non-fatal: coins failure must not break orders
    const userTier = await this.coinsService.getUserTier(userId).catch(() => 'bronze');
    const tierMultiplier = await this.coinsService.getTierMultiplier(userTier).catch(() => 1);
    const coinsEarned = Math.floor(serverFinalTotal / 100 * tierMultiplier);
    try {
      if (coinsEarned > 0) {
        await this.coinsService.addCoins(userId, coinsEarned, `Order #${shortId}`, order.id);
      }
      if (dto.coins_redeemed) {
        await this.coinsService.spendCoins(
          userId,
          dto.coins_redeemed,
          `Redeemed in order #${shortId}`,
          order.id,
        );
      }
    } catch (coinsErr) {
      console.error('[Coins] Failed to award/spend coins for order', shortId, ':', (coinsErr as Error)?.message ?? coinsErr);
    }

    return { data: { order, coins_earned: coinsEarned }, message: 'Order placed successfully' };
  }

  async getReorderSuggestions(userId: string) {
    // Fetch last 10 non-cancelled orders with their items
    const { data: orders } = await this.supabase.admin
      .from('orders')
      .select('order_items(product_id, product_name)')
      .eq('user_id', userId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!orders || orders.length === 0) return { data: { suggestions: [] }, message: 'Success' };

    // Count product frequency across all fetched orders
    const countMap = new Map<string, number>();
    for (const order of orders as { order_items: { product_id: string | null }[] }[]) {
      for (const item of order.order_items ?? []) {
        if (!item.product_id) continue;
        countMap.set(item.product_id, (countMap.get(item.product_id) ?? 0) + 1);
      }
    }

    // Sort by frequency, take top 6 product IDs
    const topIds = [...countMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id]) => id);

    if (topIds.length === 0) return { data: { suggestions: [] }, message: 'Success' };

    // Fetch current price / stock from products table
    const { data: products } = await this.supabase.admin
      .from('products')
      .select('id, name, price, image_url, stock, weight, category')
      .in('id', topIds)
      .eq('is_active', true);

    // Return in frequency order, filtering out inactive/deleted products
    const productMap = new Map(
      (products ?? []).map((p) => [(p as { id: string }).id, p]),
    );
    const suggestions = topIds
      .map((pid) => productMap.get(pid))
      .filter(Boolean)
      .map((p) => {
        const prod = p as { id: string; name: string; price: number; image_url: string | null; stock: number; weight: string | null; category: string };
        return {
          id: prod.id,
          name: prod.name,
          price: prod.price,
          image: prod.image_url,
          weight: prod.weight,
          inStock: prod.stock > 0,
          stock: prod.stock,
          category: prod.category,
        };
      });

    return { data: { suggestions }, message: 'Success' };
  }

  async findAll(userId: string) {
    const { data, error } = await this.supabase.admin
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return { data: { orders: data ?? [] }, message: 'Success' };
  }

  async findOne(userId: string, orderId: string) {
    const { data, error } = await this.supabase.admin
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();

    if (error) throw new NotFoundException('Order not found');
    return { data: { order: data }, message: 'Success' };
  }

  async assignDriver(orderId: string, driverId: string | null) {
    let driver_name: string | null = null;
    if (driverId) {
      const { data: driver } = await this.supabase.admin
        .from('drivers')
        .select('name')
        .eq('id', driverId)
        .single();
      driver_name = driver ? (driver as { name: string }).name : null;
    }

    const { data, error } = await this.supabase.admin
      .from('orders')
      .update({ driver_id: driverId, driver_name })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { data: { order: data }, message: driverId ? 'Driver assigned' : 'Driver removed' };
  }

  async cancelByUser(userId: string, orderId: string) {
    const { data: order, error } = await this.supabase.admin
      .from('orders')
      .select('id, status, user_id')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();

    if (error || !order) throw new NotFoundException('Order not found');

    const s = (order as Record<string, unknown>)['status'] as string;
    if (!['placed', 'confirmed'].includes(s)) {
      throw new BadRequestException(
        `Order cannot be cancelled at this stage (status: ${s})`,
      );
    }

    return this.updateStatus(orderId, 'cancelled');
  }

  async updateOrderItems(userId: string, orderId: string, dto: UpdateOrderItemsDto) {
    if (dto.items.length === 0) throw new BadRequestException('Order must have at least one item');

    // Fetch current order + existing items
    const { data: order, error: fetchErr } = await this.supabase.admin
      .from('orders')
      .select('id, status, user_id, delivery_fee, discount_amount, order_items(*)')
      .eq('id', orderId)
      .single();

    if (fetchErr || !order) throw new NotFoundException('Order not found');

    const o = order as {
      id: string; status: string; user_id: string;
      delivery_fee: number; discount_amount: number | null;
      order_items: { product_id: string | null; quantity: number }[];
    };

    if (o.user_id !== userId) throw new NotFoundException('Order not found');
    if (!['placed', 'confirmed'].includes(o.status)) {
      throw new BadRequestException(`Order cannot be edited at this stage (status: ${o.status})`);
    }

    const shortId = orderId.slice(0, 8).toUpperCase();

    // ── Build old/new quantity maps (product_id → qty, skip null product_ids) ──
    const oldQtyMap = new Map<string, number>();
    for (const item of o.order_items) {
      if (item.product_id) oldQtyMap.set(item.product_id, (oldQtyMap.get(item.product_id) ?? 0) + item.quantity);
    }
    const newQtyMap = new Map<string, number>();
    for (const item of dto.items) {
      if (item.product_id) newQtyMap.set(item.product_id, (newQtyMap.get(item.product_id) ?? 0) + item.quantity);
    }

    // ── Compute net deltas (positive = need to consume stock, negative = restore) ──
    const allProductIds = new Set([...oldQtyMap.keys(), ...newQtyMap.keys()]);
    const deltas = new Map<string, number>();
    for (const pid of allProductIds) {
      const delta = (newQtyMap.get(pid) ?? 0) - (oldQtyMap.get(pid) ?? 0);
      if (delta !== 0) deltas.set(pid, delta);
    }

    if (deltas.size > 0) {
      const { data: products } = await this.supabase.admin
        .from('products')
        .select('id, stock, category, name')
        .in('id', [...deltas.keys()]);

      const productMap = new Map(
        (products as { id: string; stock: number; category: string; name: string }[]).map((p) => [p.id, p]),
      );

      // Fetch bundle constituents for any bundle products with deltas
      const bundleIds = [...deltas.keys()].filter((id) => productMap.get(id)?.category === 'bundles');
      const bundleItemsMap = new Map<string, { product_id: string; quantity: number }[]>();
      if (bundleIds.length > 0) {
        const { data: bundleItems } = await this.supabase.admin
          .from('bundle_items').select('bundle_id, product_id, quantity').in('bundle_id', bundleIds);
        if (bundleItems) {
          for (const bi of bundleItems as { bundle_id: string; product_id: string; quantity: number }[]) {
            const arr = bundleItemsMap.get(bi.bundle_id) ?? [];
            arr.push({ product_id: bi.product_id, quantity: bi.quantity });
            bundleItemsMap.set(bi.bundle_id, arr);
          }
        }
      }

      // Apply stock changes for each delta
      await Promise.all(
        [...deltas.entries()].map(async ([pid, delta]) => {
          const product = productMap.get(pid);
          if (!product) return;

          if (product.category === 'bundles') {
            const constituents = bundleItemsMap.get(pid) ?? [];
            await Promise.all(
              constituents.map(async (bi) => {
                const needed = bi.quantity * Math.abs(delta);
                const { data: cp } = await this.supabase.admin
                  .from('products').select('id, stock').eq('id', bi.product_id).single();
                if (!cp) return;
                const currentStock = (cp as { stock: number }).stock;
                if (delta > 0 && currentStock < needed) {
                  throw new BadRequestException(`Insufficient stock for ${product.name}`);
                }
                const newStock = Math.max(0, currentStock + (delta > 0 ? -needed : needed));
                await this.supabase.admin
                  .from('products').update({ stock: newStock, updated_at: new Date().toISOString() }).eq('id', bi.product_id);
                await this.stockMovements.log(
                  bi.product_id, delta > 0 ? 'sale' : 'return',
                  needed, `${delta > 0 ? 'Edit Order' : 'Edit Cancel'} ${shortId}`, orderId,
                );
              }),
            );
          } else {
            const currentStock = product.stock;
            if (delta > 0 && currentStock < delta) {
              throw new BadRequestException(`Insufficient stock for ${product.name}`);
            }
            const newStock = Math.max(0, currentStock - delta);
            await this.supabase.admin
              .from('products').update({ stock: newStock, updated_at: new Date().toISOString() }).eq('id', pid);
            await this.stockMovements.log(
              pid, delta > 0 ? 'sale' : 'return',
              Math.abs(delta), `${delta > 0 ? 'Edit Order' : 'Edit Cancel'} ${shortId}`, orderId,
            );
          }
        }),
      );
    }

    // ── Replace order_items ────────────────────────────────────────────────────
    await this.supabase.admin.from('order_items').delete().eq('order_id', orderId);

    const newItemRows = dto.items.map((i) => ({
      order_id: orderId,
      product_id: i.product_id ?? null,
      product_name: i.product_name,
      product_image: i.product_image ?? null,
      product_weight: i.product_weight ?? null,
      quantity: i.quantity,
      unit_price: i.unit_price,
      total_price: i.total_price,
    }));
    const { error: insertErr } = await this.supabase.admin.from('order_items').insert(newItemRows);
    if (insertErr) throw new BadRequestException(insertErr.message);

    // ── Recalculate totals ─────────────────────────────────────────────────────
    const newItemsTotal = dto.items.reduce((sum, i) => sum + i.total_price, 0);
    const newFinalTotal = Math.max(0, newItemsTotal + (o.delivery_fee ?? 0) - (o.discount_amount ?? 0));

    const { data: updatedOrder, error: updateErr } = await this.supabase.admin
      .from('orders')
      .update({ items_total: newItemsTotal, final_total: newFinalTotal })
      .eq('id', orderId)
      .select('*, order_items(*)')
      .single();
    if (updateErr) throw new BadRequestException(updateErr.message);

    // ── Log edit event (triggers admin realtime notification) ──────────────────
    await this.supabase.admin.from('order_events').insert({ order_id: orderId, event_type: 'edited' });

    return { data: { order: updatedOrder }, message: 'Order updated' };
  }

  async getPendingEditAlerts() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: events, error } = await this.supabase.admin
      .from('order_events')
      .select('id, order_id, created_at')
      .eq('event_type', 'edited')
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    if (!events || events.length === 0) return { data: { alerts: [] }, message: 'Success' };

    const orderIds = (events as { order_id: string }[]).map((e) => e.order_id);
    const { data: orders } = await this.supabase.admin
      .from('orders')
      .select('id, user_id, final_total, status')
      .in('id', orderIds);

    const orderMap = new Map(
      (orders ?? []).map((o) => [
        (o as { id: string }).id,
        o as { id: string; user_id: string; final_total: number; status: string },
      ]),
    );

    const uniqueUserIds = [...new Set((orders ?? []).map((o) => (o as { user_id: string }).user_id))];
    const userMap = new Map<string, { name: string | null; phone: string | null }>();
    await Promise.all(
      uniqueUserIds.map(async (uid) => {
        try {
          const result = await this.supabase.admin.auth.admin.getUserById(uid);
          const u = result.data?.user as { phone?: string | null; user_metadata?: Record<string, unknown> } | null;
          if (u) {
            userMap.set(uid, {
              name: (u.user_metadata?.['name'] as string) ?? null,
              phone: u.phone ?? null,
            });
          }
        } catch { /* non-fatal */ }
      }),
    );

    const alerts = (events as { id: string; order_id: string; created_at: string }[]).map((event) => {
      const order = orderMap.get(event.order_id);
      return {
        id: event.id,
        order_id: event.order_id,
        event_time: event.created_at,
        final_total: order?.final_total ?? 0,
        status: order?.status ?? '',
        customer: order ? (userMap.get(order.user_id) ?? { name: null, phone: null }) : { name: null, phone: null },
      };
    });

    return { data: { alerts }, message: 'Success' };
  }

  async findAllAdmin(filters: AdminOrdersQueryDto) {
    const limit = Math.min(parseInt(filters.limit ?? '20'), 100);
    const page = Math.max(parseInt(filters.page ?? '1'), 1);
    const offset = (page - 1) * limit;

    let query = this.supabase.admin
      .from('orders')
      .select('*, order_items(*)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.payment_status) query = query.eq('payment_status', filters.payment_status);
    if (filters.refund_status) query = query.eq('refund_status', filters.refund_status);
    if (filters.date_from) query = query.gte('created_at', filters.date_from);
    if (filters.date_to) query = query.lte('created_at', filters.date_to + 'T23:59:59.999Z');

    if (filters.search) {
      const s = filters.search.trim();
      // Detect phone: optional +91/91 prefix then 6-9 leading digit + 5-9 more digits
      const isPhone = /^(\+91|91)?[6-9]\d{5,9}$/.test(s.replace(/[\s-]/g, ''));

      if (isPhone) {
        const ids = await this.userIdsByPhone(s);
        if (ids.length === 0) {
          return { data: { orders: [], total: 0, page, limit }, message: 'Success' };
        }
        query = query.in('user_id', ids);
      } else {
        const esc = s.replace(/"/g, ''); // strip literal quotes to keep filter syntax valid

        // Order ID: purely hex chars (UUID alphabet), no spaces.
        // Use gte/lte UUID range — no type casting needed, works reliably.
        // e.g. prefix "6C147AA2" → range [6c147aa2-0000-…-000000000000, 6c147aa2-ffff-…-ffffffffffff]
        const isOrderId = /^[a-f0-9-]{4,36}$/i.test(s) && !s.includes(' ');

        if (isOrderId) {
          const hex = s.toLowerCase().replace(/-/g, '').slice(0, 32);
          const lo = hex.padEnd(32, '0');
          const hi = hex.padEnd(32, 'f');
          const fmt = (h: string) =>
            `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
          query = query.gte('id', fmt(lo)).lte('id', fmt(hi));
        } else {
          // Customer name search: look up users whose name contains the term, then OR their
          // user_ids into the address filter so one query handles both at once.
          const nameIds = await this.userIdsByName(s);
          const orParts = [
            `delivery_address.ilike."%${esc}%"`,
            `delivery_landmark.ilike."%${esc}%"`,
          ];
          if (nameIds.length > 0) {
            orParts.push(`user_id.in.(${nameIds.join(',')})`);
          }
          query = query.or(orParts.join(','));
        }
      }
    }

    const { data, error, count } = await query;
    if (error) throw new BadRequestException(error.message);

    const orders = await this.enrichWithCustomers(data ?? []);

    return {
      data: { orders, total: count ?? 0, page, limit },
      message: 'Success',
    };
  }

  // Returns user IDs whose phone number ends with the last 10 digits of `raw`
  private async userIdsByPhone(raw: string): Promise<string[]> {
    const last10 = raw.replace(/\D/g, '').slice(-10);
    const { data } = await this.supabase.admin.auth.admin.listUsers({ perPage: 1000 });
    if (!data?.users) return [];
    const ids: string[] = [];
    for (const u of data.users as { id: string; phone?: string | null }[]) {
      if (u.phone && u.phone.replace(/\D/g, '').endsWith(last10)) ids.push(u.id);
    }
    return ids;
  }

  // Returns user IDs whose display name contains `term` (case-insensitive)
  private async userIdsByName(term: string): Promise<string[]> {
    const { data } = await this.supabase.admin.auth.admin.listUsers({ perPage: 1000 });
    if (!data?.users) return [];
    const lower = term.toLowerCase();
    const ids: string[] = [];
    for (const u of data.users as { id: string; user_metadata?: Record<string, unknown> }[]) {
      const name = ((u.user_metadata?.['name'] as string) ?? '').toLowerCase();
      if (name && name.includes(lower)) ids.push(u.id);
    }
    return ids;
  }

  // Attaches { name, phone, email } to each order from auth.users (parallel lookups)
  private async enrichWithCustomers(
    orders: Record<string, unknown>[],
  ): Promise<Record<string, unknown>[]> {
    if (orders.length === 0) return [];

    const uniqueIds = [...new Set(orders.map((o) => o.user_id as string))];

    const userMap = new Map<string, { name: string | null; phone: string | null; email: string | null }>();

    await Promise.all(
      uniqueIds.map(async (uid) => {
        try {
          const result = await this.supabase.admin.auth.admin.getUserById(uid);
          const u = result.data?.user as {
            phone?: string | null;
            email?: string | null;
            user_metadata?: Record<string, unknown>;
          } | null;
          if (u) {
            userMap.set(uid, {
              name: (u.user_metadata?.['name'] as string) ?? null,
              phone: u.phone ?? null,
              email: u.email ?? null,
            });
          }
        } catch {
          // Non-fatal: user may have been deleted
        }
      }),
    );

    return orders.map((o) => ({
      ...o,
      customer: userMap.get(o.user_id as string) ?? { name: null, phone: null, email: null },
    }));
  }

  async updatePaymentStatus(orderId: string, paymentStatus: string) {
    const { data: order, error } = await this.supabase.admin
      .from('orders')
      .update({ payment_status: paymentStatus })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { data: { order }, message: 'Payment status updated' };
  }

  async updateRefundStatus(orderId: string, dto: UpdateRefundStatusDto) {
    const { data: order } = await this.supabase.admin
      .from('orders')
      .select('user_id, refund_amount')
      .eq('id', orderId)
      .single();

    const update: Record<string, unknown> = { refund_status: dto.status };
    if (dto.notes !== undefined) update['refund_notes'] = dto.notes;
    if (dto.amount !== undefined) update['refund_amount'] = dto.amount;
    if (dto.status === 'completed') update['refunded_at'] = new Date().toISOString();

    const { error } = await this.supabase.admin.from('orders').update(update).eq('id', orderId);
    if (error) throw new BadRequestException(error.message);

    if (dto.status === 'completed' && order) {
      const o = order as { user_id: string; refund_amount: number };
      const displayAmount = dto.amount ?? o.refund_amount;
      this.notifications.createNotification(
        o.user_id, 'order_update', 'Refund Processed',
        `Your refund of ₹${displayAmount} has been processed.`,
        { order_id: orderId },
      ).catch(() => {});
    }

    return { data: {}, message: 'Refund status updated' };
  }

  async updateStatus(orderId: string, status: string) {
    // Fetch current order + items before updating (needed for idempotency + stock restoration)
    const { data: current, error: fetchError } = await this.supabase.admin
      .from('orders')
      .select('status, user_id, delivery_slot_id, payment_status, items_total, final_total, order_items(*)')
      .eq('id', orderId)
      .single();

    if (fetchError) throw new NotFoundException('Order not found');

    const updatePayload: Record<string, string> = { status };
    if (status === 'cancelled') updatePayload['payment_status'] = 'cancelled';

    const { data: order, error } = await this.supabase.admin
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Insert order_event — triggers Supabase Realtime for the customer's tracking page
    await this.supabase.admin
      .from('order_events')
      .insert({ order_id: orderId, event_type: status });

    // Notify customer of status change
    const statusNotifications: Record<string, { title: string; body: string }> = {
      confirmed: { title: 'Order Confirmed ✅', body: 'Your order is confirmed and being prepared.' },
      packed: { title: 'Order Packed 📦', body: 'Your order is packed and ready for dispatch.' },
      out_for_delivery: { title: 'Out for Delivery 🚀', body: 'Your order is on its way!' },
      delivered: { title: 'Order Delivered 🎉', body: 'Your order has been delivered. Enjoy!' },
      cancelled: { title: 'Order Cancelled', body: 'Your order has been cancelled.' },
    };
    const statusMsg = statusNotifications[status];
    if (statusMsg && status !== (current as { status: string }).status) {
      const uid = (current as { user_id: string }).user_id;
      this.notifications.createNotification(uid, 'order_update', statusMsg.title, statusMsg.body, { order_id: orderId }).catch(() => {});
    }

    // Unbook delivery slot when order is cancelled
    if (status === 'cancelled' && current.status !== 'cancelled') {
      const slotId = (current as unknown as { delivery_slot_id?: string | null }).delivery_slot_id;
      if (slotId) {
        const { data: slotData } = await this.supabase.admin
          .from('delivery_slots')
          .select('booked')
          .eq('id', slotId)
          .single();
        if (slotData) {
          await this.supabase.admin
            .from('delivery_slots')
            .update({ booked: Math.max(0, (slotData as { booked: number }).booked - 1) })
            .eq('id', slotId);
        }
      }
    }

    // Refund coins earned for cancelled order
    if (status === 'cancelled' && current.status !== 'cancelled') {
      await this.coinsService.refundCoins(
        (current as { user_id: string }).user_id,
        orderId,
      ).catch(() => {}); // non-fatal
    }

    // Auto-create cash refund record based on prior payment status
    // Default refund = items_total only (delivery is non-refundable). Admin can override.
    if (status === 'cancelled' && current.status !== 'cancelled') {
      const prevPaymentStatus = (current as { payment_status?: string }).payment_status;
      const itemsTotal = (current as { items_total?: number }).items_total;
      if (prevPaymentStatus === 'collected') {
        await this.supabase.admin
          .from('orders')
          .update({ refund_status: 'pending', refund_amount: itemsTotal })
          .eq('id', orderId);
      } else {
        await this.supabase.admin
          .from('orders')
          .update({ refund_status: 'not_applicable' })
          .eq('id', orderId);
      }
    }

    // Restore inventory when cancelled (bundles → restore constituents)
    if (status === 'cancelled' && current.status !== 'cancelled') {
      const items = (
        current.order_items as { product_id: string | null; quantity: number }[]
      ).filter((i) => i.product_id);

      if (items.length > 0) {
        const { data: products } = await this.supabase.admin
          .from('products')
          .select('id, stock, category')
          .in('id', items.map((i) => i.product_id as string));

        if (products) {
          const productMap = new Map(
            (products as { id: string; stock: number; category: string }[]).map((p) => [p.id, p]),
          );

          const bundleIds = items
            .filter((i) => productMap.get(i.product_id!)?.category === 'bundles')
            .map((i) => i.product_id as string);

          const bundleItemsMap = new Map<string, { product_id: string; quantity: number }[]>();
          if (bundleIds.length > 0) {
            const { data: bundleItems } = await this.supabase.admin
              .from('bundle_items')
              .select('bundle_id, product_id, quantity')
              .in('bundle_id', bundleIds);
            if (bundleItems) {
              for (const bi of bundleItems as { bundle_id: string; product_id: string; quantity: number }[]) {
                const arr = bundleItemsMap.get(bi.bundle_id) ?? [];
                arr.push({ product_id: bi.product_id, quantity: bi.quantity });
                bundleItemsMap.set(bi.bundle_id, arr);
              }
            }
          }

          const shortId = orderId.slice(0, 8).toUpperCase();
          await Promise.all(
            items.map(async (item) => {
              const product = productMap.get(item.product_id!);
              if (!product) return;

              if (product.category === 'bundles') {
                // Restore each constituent
                const constituents = bundleItemsMap.get(item.product_id!) ?? [];
                await Promise.all(
                  constituents.map(async (bi) => {
                    const restore = bi.quantity * item.quantity;
                    const { data: constitProd } = await this.supabase.admin
                      .from('products').select('id, stock').eq('id', bi.product_id).single();
                    if (!constitProd) return;
                    const newStock = (constitProd as { stock: number }).stock + restore;
                    await this.supabase.admin
                      .from('products')
                      .update({ stock: newStock, updated_at: new Date().toISOString() })
                      .eq('id', bi.product_id);
                    await this.stockMovements.log(bi.product_id, 'return', restore, `Cancel Bundle ${shortId}`, orderId);
                  }),
                );
              } else {
                // Regular product
                const newStock = (product.stock ?? 0) + item.quantity;
                await this.supabase.admin
                  .from('products')
                  .update({ stock: newStock, updated_at: new Date().toISOString() })
                  .eq('id', item.product_id as string);
                await this.stockMovements.log(item.product_id as string, 'return', item.quantity, `Cancel ${shortId}`, orderId);
              }
            }),
          );
        }
      }
    }

    return { data: { order }, message: 'Status updated' };
  }
}
