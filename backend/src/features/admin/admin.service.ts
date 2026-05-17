import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class AdminService {
  constructor(
    private supabase: SupabaseService,
    private subscriptions: SubscriptionsService,
  ) {}

  async getDashboard() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);

    const [
      todayResult, pendingResult, outOfStockResult, weeklyResult,
      placedResult, confirmedResult, packedResult, outForDeliveryResult, deliveredResult, cancelledResult,
    ] = await Promise.all([
      this.supabase.admin
        .from('orders')
        .select('final_total', { count: 'exact' })
        .gte('created_at', todayStart.toISOString())
        .lt('created_at', todayEnd.toISOString())
        .neq('status', 'cancelled'),

      this.supabase.admin
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['placed', 'confirmed']),

      this.supabase.admin
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('stock', 0)
        .eq('is_active', true),

      this.supabase.admin
        .from('orders')
        .select('created_at, final_total')
        .gte('created_at', sevenDaysAgo.toISOString())
        .neq('status', 'cancelled')
        .order('created_at', { ascending: true }),

      // Status breakdown
      this.supabase.admin.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'placed'),
      this.supabase.admin.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
      this.supabase.admin.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'packed'),
      this.supabase.admin.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'out_for_delivery'),
      this.supabase.admin.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered'),
      this.supabase.admin.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
    ]);

    const todayRevenue = (todayResult.data ?? []).reduce(
      (sum: number, o: { final_total: number }) => sum + (o.final_total ?? 0),
      0,
    );

    const weeklyMap = new Map<string, { orders: number; revenue: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      weeklyMap.set(d.toISOString().split('T')[0], { orders: 0, revenue: 0 });
    }
    for (const o of (weeklyResult.data ?? []) as { created_at: string; final_total: number }[]) {
      const key = o.created_at.slice(0, 10);
      if (weeklyMap.has(key)) {
        const entry = weeklyMap.get(key)!;
        entry.orders += 1;
        entry.revenue += o.final_total ?? 0;
      }
    }

    return {
      data: {
        today_orders: todayResult.count ?? 0,
        today_revenue: todayRevenue,
        pending_orders: pendingResult.count ?? 0,
        out_of_stock_count: outOfStockResult.count ?? 0,
        weekly_gmv: [...weeklyMap.entries()].map(([date, v]) => ({ date, ...v })),
        status_breakdown: {
          placed:           placedResult.count ?? 0,
          confirmed:        confirmedResult.count ?? 0,
          packed:           packedResult.count ?? 0,
          out_for_delivery: outForDeliveryResult.count ?? 0,
          delivered:        deliveredResult.count ?? 0,
          cancelled:        cancelledResult.count ?? 0,
        },
      },
      message: 'Success',
    };
  }

  async getSubscriptions() {
    const today = new Date().toISOString().slice(0, 10);

    const [allResult, todayCountResult] = await Promise.all([
      this.supabase.admin
        .from('subscriptions')
        .select('*, products(name, image_url, price, weight)')
        .order('created_at', { ascending: false }),

      this.supabase.admin
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('next_delivery_date', today),
    ]);

    const subs = (allResult.data ?? []) as Record<string, unknown>[];

    // Enrich with customer info
    const uniqueUserIds = [...new Set(subs.map((s) => s.user_id as string))];
    const userMap = new Map<string, { name: string | null; phone: string | null }>();
    await Promise.all(
      uniqueUserIds.map(async (uid) => {
        try {
          const { data } = await this.supabase.admin.auth.admin.getUserById(uid);
          const u = data?.user as { phone?: string | null; user_metadata?: Record<string, unknown> } | null;
          userMap.set(uid, {
            name: (u?.user_metadata?.['name'] as string) ?? null,
            phone: u?.phone ?? null,
          });
        } catch {
          userMap.set(uid, { name: null, phone: null });
        }
      }),
    );

    const enriched = subs.map((s) => ({
      ...s,
      customer: userMap.get(s.user_id as string) ?? { name: null, phone: null },
    }));

    const active = subs.filter((s) => s.status === 'active');
    const paused = subs.filter((s) => s.status === 'paused');
    const dueToday = active.filter((s) => s.next_delivery_date === today);
    const deliveredToday = subs.filter((s) => s.last_delivered_date === today);
    const pendingToday = dueToday.filter((s) => s.last_delivered_date !== today);

    const estimatedMRR = active.reduce((sum, s) => {
      const product = s.products as { price?: number } | null;
      const price = product?.price ?? 0;
      const discounted = Math.round(price * (1 - ((s.discount_pct as number) ?? 5) / 100));
      const multiplier = s.frequency === 'daily' ? 30 : s.frequency === 'weekly' ? 4 : 1;
      return sum + discounted * (s.quantity as number) * multiplier;
    }, 0);

    return {
      data: {
        stats: {
          active_count: active.length,
          paused_count: paused.length,
          today_deliveries: pendingToday.length,
          delivered_today: deliveredToday.length,
          total_due_today: dueToday.length,
          estimated_mrr: estimatedMRR,
        },
        subscriptions: enriched,
      },
      message: 'Success',
    };
  }

  async adminMarkDelivered(id: string) {
    await this.subscriptions.processOne(id);
    return { data: null, message: 'Marked as delivered and stock updated' };
  }

  async adminPause(id: string) {
    const { error } = await this.supabase.admin
      .from('subscriptions')
      .update({ status: 'paused' })
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
    return { data: null, message: 'Subscription paused' };
  }

  async adminResume(id: string) {
    const { data: sub, error: fetchErr } = await this.supabase.admin
      .from('subscriptions')
      .select('frequency, frequency_day')
      .eq('id', id)
      .single();

    if (fetchErr || !sub) throw new BadRequestException('Subscription not found');

    const next = this.computeNextDate(
      (sub as { frequency: string; frequency_day: number | null }).frequency,
      (sub as { frequency: string; frequency_day: number | null }).frequency_day,
    );

    const { error } = await this.supabase.admin
      .from('subscriptions')
      .update({ status: 'active', paused_until: null, next_delivery_date: next })
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { data: { next_delivery_date: next }, message: 'Subscription resumed' };
  }

  async adminCancel(id: string) {
    const { error } = await this.supabase.admin
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
    return { data: null, message: 'Subscription cancelled' };
  }

  async getAnalytics(start: string, end: string) {
    const startISO = `${start}T00:00:00.000Z`;
    const endISO = `${end}T23:59:59.999Z`;

    // Batch 1: orders in range + all-time subscription counts
    const [ordersRes, subsRes] = await Promise.all([
      this.supabase.admin
        .from('orders')
        .select('id, created_at, final_total, status, user_id')
        .gte('created_at', startISO)
        .lte('created_at', endISO),
      this.supabase.admin.from('subscriptions').select('status'),
    ]);

    const orders = (ordersRes.data ?? []) as {
      id: string; created_at: string; final_total: number; status: string; user_id: string;
    }[];

    const nonCancelledOrders = orders.filter((o) => o.status !== 'cancelled');
    const nonCancelledIds = nonCancelledOrders.map((o) => o.id);
    const uniqueUserIds = [...new Set(orders.map((o) => o.user_id))];

    // Batch 2: order items for product/category breakdown + prior orders for new-vs-returning
    const [itemsRes, priorOrdersRes] = await Promise.all([
      nonCancelledIds.length > 0
        ? this.supabase.admin
            .from('order_items')
            .select('product_id, product_name, quantity, total_price, products(category)')
            .in('order_id', nonCancelledIds)
        : Promise.resolve({ data: [] }),
      uniqueUserIds.length > 0
        ? this.supabase.admin
            .from('orders')
            .select('user_id')
            .in('user_id', uniqueUserIds)
            .lt('created_at', startISO)
        : Promise.resolve({ data: [] }),
    ]);

    // Revenue by date (zero-fill all days in range)
    const dateMap = new Map<string, { orders: number; revenue: number }>();
    const cursor = new Date(start);
    const endDate = new Date(end);
    while (cursor <= endDate) {
      dateMap.set(cursor.toISOString().slice(0, 10), { orders: 0, revenue: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    for (const o of nonCancelledOrders) {
      const key = o.created_at.slice(0, 10);
      const entry = dateMap.get(key);
      if (entry) { entry.orders += 1; entry.revenue += o.final_total ?? 0; }
    }
    const revenue_by_date = [...dateMap.entries()].map(([date, v]) => ({ date, ...v }));

    // Revenue by category + top products
    const categoryMap = new Map<string, { revenue: number; orders: number }>();
    const productMap = new Map<string, { name: string; quantity_sold: number; revenue: number }>();
    type ItemRow = { product_id: string | null; product_name: string; quantity: number; total_price: number; products: { category: string | null } | { category: string | null }[] | null };
    for (const item of (itemsRes.data ?? []) as unknown as ItemRow[]) {
      const productsField = Array.isArray(item.products) ? item.products[0] : item.products;
      const cat = productsField?.category ?? 'Uncategorised';
      const c = categoryMap.get(cat) ?? { revenue: 0, orders: 0 };
      c.revenue += item.total_price ?? 0;
      c.orders += 1;
      categoryMap.set(cat, c);

      if (item.product_id) {
        const p = productMap.get(item.product_id) ?? { name: item.product_name, quantity_sold: 0, revenue: 0 };
        p.quantity_sold += item.quantity;
        p.revenue += item.total_price ?? 0;
        productMap.set(item.product_id, p);
      }
    }
    const revenue_by_category = [...categoryMap.entries()]
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.revenue - a.revenue);
    const top_products = [...productMap.entries()]
      .map(([product_id, v]) => ({ product_id, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Subscription health
    const subs = (subsRes.data ?? []) as { status: string }[];
    const subTotal = subs.length;
    const subActive = subs.filter((s) => s.status === 'active').length;
    const subPaused = subs.filter((s) => s.status === 'paused').length;
    const subCancelled = subs.filter((s) => s.status === 'cancelled').length;

    // New vs returning customers
    const returningUserIds = new Set(
      (priorOrdersRes.data ?? []).map((o: { user_id: string }) => o.user_id),
    );
    const newCustomers = uniqueUserIds.filter((uid) => !returningUserIds.has(uid)).length;
    const returningCustomers = uniqueUserIds.filter((uid) => returningUserIds.has(uid)).length;

    // Summary
    const totalOrders = orders.length;
    const cancelledCount = orders.filter((o) => o.status === 'cancelled').length;
    const totalRevenue = nonCancelledOrders.reduce((s, o) => s + (o.final_total ?? 0), 0);

    return {
      data: {
        period: { start, end },
        summary: {
          total_orders: totalOrders,
          total_revenue: totalRevenue,
          avg_order_value: nonCancelledOrders.length > 0 ? Math.round(totalRevenue / nonCancelledOrders.length) : 0,
          cancelled_count: cancelledCount,
          cancellation_rate: totalOrders > 0 ? Math.round((cancelledCount / totalOrders) * 1000) / 10 : 0,
          new_customers: newCustomers,
          returning_customers: returningCustomers,
        },
        revenue_by_date,
        revenue_by_category,
        top_products,
        subscription_health: {
          total: subTotal,
          active: subActive,
          paused: subPaused,
          cancelled: subCancelled,
          churn_rate: subTotal > 0 ? Math.round((subCancelled / subTotal) * 1000) / 10 : 0,
        },
      },
      message: 'Success',
    };
  }

  async getCustomers(page: number, limit: number, search: string) {
    const { data: authData, error } = await this.supabase.admin.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw new BadRequestException(error.message);

    let users = (authData.users ?? []).filter(
      (u) => (u.app_metadata as Record<string, unknown>)?.['role'] !== 'admin',
    );

    if (search) {
      const q = search.toLowerCase();
      users = users.filter(
        (u) =>
          ((u.user_metadata as Record<string, unknown>)?.['name'] as string ?? '').toLowerCase().includes(q) ||
          (u.phone ?? '').includes(q) ||
          (u.email ?? '').toLowerCase().includes(q),
      );
    }

    const total = users.length;
    const pageUsers = users.slice((page - 1) * limit, page * limit);
    const userIds = pageUsers.map((u) => u.id);

    if (userIds.length === 0) {
      return { data: { customers: [], total }, message: 'Success' };
    }

    const [ordersRes, subsRes] = await Promise.all([
      this.supabase.admin
        .from('orders')
        .select('user_id, final_total, status, created_at')
        .in('user_id', userIds),
      this.supabase.admin
        .from('subscriptions')
        .select('user_id, status')
        .in('user_id', userIds)
        .eq('status', 'active'),
    ]);

    const ordersByUser = new Map<string, { count: number; spent: number; last: string | null }>();
    for (const uid of userIds) ordersByUser.set(uid, { count: 0, spent: 0, last: null });
    for (const o of (ordersRes.data ?? []) as { user_id: string; final_total: number; status: string; created_at: string }[]) {
      const entry = ordersByUser.get(o.user_id);
      if (!entry) continue;
      entry.count += 1;
      if (o.status !== 'cancelled') entry.spent += o.final_total ?? 0;
      if (!entry.last || o.created_at > entry.last) entry.last = o.created_at;
    }

    const subsByUser = new Map<string, number>();
    for (const s of (subsRes.data ?? []) as { user_id: string }[]) {
      subsByUser.set(s.user_id, (subsByUser.get(s.user_id) ?? 0) + 1);
    }

    const customers = pageUsers.map((u) => {
      const stats = ordersByUser.get(u.id) ?? { count: 0, spent: 0, last: null };
      return {
        id: u.id,
        name: (u.user_metadata as Record<string, unknown>)?.['name'] ?? null,
        phone: u.phone ?? null,
        email: u.email ?? null,
        created_at: u.created_at,
        order_count: stats.count,
        total_spent: stats.spent,
        last_order_date: stats.last,
        active_subscriptions: subsByUser.get(u.id) ?? 0,
      };
    });

    return { data: { customers, total }, message: 'Success' };
  }

  async getCustomer(id: string) {
    const { data, error } = await this.supabase.admin.auth.admin.getUserById(id);
    if (error || !data?.user) throw new NotFoundException('Customer not found');

    const u = data.user;
    const [ordersRes, subsRes] = await Promise.all([
      this.supabase.admin
        .from('orders')
        .select('id, created_at, status, final_total, payment_status')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
      this.supabase.admin
        .from('subscriptions')
        .select('*, products(name, image_url, price, weight)')
        .eq('user_id', id),
    ]);

    const orders = (ordersRes.data ?? []) as Record<string, unknown>[];
    const subs = (subsRes.data ?? []) as Record<string, unknown>[];

    const totalSpent = orders
      .filter((o) => o['status'] !== 'cancelled')
      .reduce((sum, o) => sum + ((o['final_total'] as number) ?? 0), 0);

    return {
      data: {
        customer: {
          id: u.id,
          name: (u.user_metadata as Record<string, unknown>)?.['name'] ?? null,
          phone: u.phone ?? null,
          email: u.email ?? null,
          created_at: u.created_at,
          order_count: orders.length,
          total_spent: totalSpent,
          active_subscriptions: subs.filter((s) => s['status'] === 'active').length,
        },
        orders,
        subscriptions: subs,
      },
      message: 'Success',
    };
  }

  private computeNextDate(frequency: string, frequencyDay: number | null): string {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (frequency === 'daily') {
      d.setDate(d.getDate() + 1);
    } else if (frequency === 'weekly') {
      const target = frequencyDay ?? 1;
      const daysUntil = ((target - d.getDay()) + 7) % 7 || 7;
      d.setDate(d.getDate() + daysUntil);
    } else {
      const target = frequencyDay ?? 1;
      d.setMonth(d.getMonth() + 1);
      d.setDate(Math.min(target, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
