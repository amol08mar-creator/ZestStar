import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { QueryPublicProductsDto } from './dto/query-public-products.dto';
import { BundleItemDto } from './dto/set-bundle-items.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const LOW_STOCK_THRESHOLD = 10;

@Injectable()
export class ProductsService {
  constructor(
    private supabase: SupabaseService,
    private stockMovements: StockMovementsService,
    private notifications: NotificationsService,
  ) {}

  async listAll(query: QueryProductsDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    let q = this.supabase.admin.from('products').select('*', { count: 'exact' });

    if (query.search) {
      q = q.ilike('name', `%${query.search}%`);
    }
    if (query.category) {
      q = q.eq('category', query.category);
    }
    if (query.stock_status === 'out') {
      q = q.eq('stock', 0);
    } else if (query.stock_status === 'low') {
      q = q.gt('stock', 0).lte('stock', LOW_STOCK_THRESHOLD);
    } else if (query.stock_status === 'in') {
      q = q.gt('stock', LOW_STOCK_THRESHOLD);
    }

    const { data, error, count } = await q
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new BadRequestException(error.message);

    const products = await this.applyBundleStockOverride(data ?? []);
    return {
      data: { products, total: count ?? 0, page, limit },
      message: 'Success',
    };
  }

  async listPublic(query: QueryPublicProductsDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    let q = this.supabase.admin
      .from('products')
      .select('*', { count: 'exact' })
      .eq('is_active', true);

    if (query.search) {
      q = q.ilike('name', `%${query.search}%`);
    }
    if (query.category) {
      q = q.ilike('category', query.category);
    }

    if (query.sort === 'price_asc') {
      q = q.order('price', { ascending: true });
    } else if (query.sort === 'price_desc') {
      q = q.order('price', { ascending: false });
    } else if (query.sort === 'rating') {
      q = q.order('rating', { ascending: false });
    } else {
      q = q.order('created_at', { ascending: false });
    }

    if (query.min_price !== undefined) q = q.gte('price', query.min_price);
    if (query.max_price !== undefined) q = q.lte('price', query.max_price);
    if (query.min_rating !== undefined) q = q.gte('rating', query.min_rating);
    if (query.min_discount !== undefined) q = q.gte('discount_percent', query.min_discount);
    if (query.in_stock) q = q.gt('stock', 0);

    const { data, error, count } = await q.range(offset, offset + limit - 1);

    if (error) throw new BadRequestException(error.message);

    const products = await this.applyBundleStockOverride(data ?? []);
    return {
      data: { products, total: count ?? 0, page, limit },
      message: 'Success',
    };
  }

  async getOne(id: string) {
    const { data, error } = await this.supabase.admin
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !data) throw new NotFoundException('Product not found');

    const [product] = await this.applyBundleStockOverride([data]);
    return { data: { product }, message: 'Success' };
  }

  async getCategories() {
    const { data, error } = await this.supabase.admin
      .from('products')
      .select('category')
      .order('category');

    if (error) throw new BadRequestException(error.message);

    const unique = [...new Set((data ?? []).map((r: { category: string }) => r.category))].sort();
    return { data: { categories: unique }, message: 'Success' };
  }

  async getSuggestions(query: string, limit = 6) {
    const { data, error } = await this.supabase.admin
      .from('products')
      .select('id, name, image_url, category')
      .eq('is_active', true)
      .gt('stock', 0)
      .ilike('name', `%${query}%`)
      .order('name', { ascending: true })
      .limit(limit);

    if (error) throw new BadRequestException(error.message);
    return { data: { suggestions: data ?? [] }, message: 'Success' };
  }

  async getLowStock() {
    const { data, error } = await this.supabase.admin
      .from('products')
      .select('id, name, category, stock, image_url')
      .lte('stock', LOW_STOCK_THRESHOLD)
      .order('stock', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return { data: { products: data ?? [], count: data?.length ?? 0 }, message: 'Success' };
  }

  async create(dto: CreateProductDto) {
    const payload: Record<string, unknown> = { ...dto, is_active: dto.is_active ?? true };
    if (dto.image_urls?.length) payload['image_url'] = dto.image_urls[0];
    const { data, error } = await this.supabase.admin
      .from('products')
      .insert(payload)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { data: { product: data }, message: 'Product created' };
  }

  async update(id: string, dto: UpdateProductDto) {
    // Fetch current state to detect price drops
    const { data: current } = await this.supabase.admin
      .from('products')
      .select('name, price')
      .eq('id', id)
      .single();

    const updatePayload: Record<string, unknown> = { ...dto, updated_at: new Date().toISOString() };
    if (dto.image_urls?.length) updatePayload['image_url'] = dto.image_urls[0];
    const { data, error } = await this.supabase.admin
      .from('products')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Product not found');

    // Trigger price-drop notification to wishlist users if price decreased
    if (current && dto.price !== undefined) {
      const oldPrice = (current as { price: number }).price;
      const newPrice = dto.price;
      if (newPrice < oldPrice) {
        const name = (current as { name: string }).name;
        this.notifications.triggerPriceDropNotification(id, name, oldPrice, newPrice).catch(() => {});
      }
    }

    return { data: { product: data }, message: 'Product updated' };
  }

  async updateStock(id: string, quantity: number, operation: 'set' | 'increment' | 'decrement' = 'set') {
    // Always fetch current stock — needed for 0→>0 notification check and increment/decrement math
    const { data: current, error: fetchError } = await this.supabase.admin
      .from('products')
      .select('stock')
      .eq('id', id)
      .single();

    if (fetchError || !current) throw new NotFoundException('Product not found');

    const previousStock = (current as { stock: number }).stock;
    let newStock = quantity;
    if (operation === 'increment') newStock = previousStock + quantity;
    else if (operation === 'decrement') newStock = Math.max(0, previousStock - quantity);

    const { data, error } = await this.supabase.admin
      .from('products')
      .update({ stock: newStock, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, name, stock')
      .single();

    if (error) throw new BadRequestException(error.message);

    this.stockMovements.log(id, 'adjustment', Math.abs(quantity), 'Manual stock update').catch(() => {});

    // Trigger back-in-stock emails when stock goes from 0 to positive
    if (previousStock === 0 && newStock > 0) {
      this.notifications.triggerStockNotification(id).catch(() => {});
    }

    return { data: { product: data }, message: 'Stock updated' };
  }

  async remove(id: string) {
    const { error } = await this.supabase.admin.from('products').delete().eq('id', id);
    if (error) throw new BadRequestException(error.message);
    return { data: null, message: 'Product deleted' };
  }

  private async applyBundleStockOverride(products: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
    const bundleIds = products
      .filter((p) => p.category === 'bundles')
      .map((p) => p.id as string);

    if (bundleIds.length === 0) return products;

    // Fetch bundle items WITH quantity
    const { data: items, error: itemsError } = await this.supabase.admin
      .from('bundle_items')
      .select('bundle_id, product_id, quantity')
      .in('bundle_id', bundleIds);

    if (itemsError || !items || items.length === 0) {
      // No constituent items configured → all bundles are OOS
      return products.map((p) =>
        p.category === 'bundles' ? { ...p, stock: 0 } : p,
      );
    }

    // Fetch constituent stocks in one query
    const constituentIds = [...new Set((items as { product_id: string }[]).map((i) => i.product_id))];
    const { data: stockData } = await this.supabase.admin
      .from('products')
      .select('id, stock')
      .in('id', constituentIds);

    if (!stockData) return products;

    const stockMap = new Map<string, number>(
      (stockData as { id: string; stock: number }[]).map((p) => [p.id, p.stock]),
    );

    // Compute effective stock for each bundle:
    // effective = min(floor(constituent_stock / required_qty)) across all constituents
    const bundleStockMap = new Map<string, number>();
    for (const bundleId of bundleIds) {
      const bundleItems = (
        items as { bundle_id: string; product_id: string; quantity: number }[]
      ).filter((i) => i.bundle_id === bundleId);

      if (bundleItems.length === 0) {
        bundleStockMap.set(bundleId, 0);
        continue;
      }

      let effective = Infinity;
      for (const item of bundleItems) {
        const constituentStock = stockMap.get(item.product_id) ?? 0;
        const avail = item.quantity > 0 ? Math.floor(constituentStock / item.quantity) : 0;
        effective = Math.min(effective, avail);
      }
      bundleStockMap.set(bundleId, effective === Infinity ? 0 : effective);
    }

    // Override ALL bundle stocks with their computed virtual stock
    return products.map((p) => {
      if (p.category !== 'bundles') return p;
      return { ...p, stock: bundleStockMap.get(p.id as string) ?? 0 };
    });
  }

  async getBundleItems(bundleId: string) {
    const { data, error } = await this.supabase.admin
      .from('bundle_items')
      .select('id, quantity, constituent:product_id(id, name, price, original_price, image_url, weight, stock)')
      .eq('bundle_id', bundleId)
      .order('id');

    if (error) throw new BadRequestException(error.message);
    return { data: { items: data ?? [] }, message: 'Success' };
  }

  async setBundleItems(bundleId: string, items: BundleItemDto[]) {
    const { data: bundle, error: bundleErr } = await this.supabase.admin
      .from('products')
      .select('id, category')
      .eq('id', bundleId)
      .single();

    if (bundleErr || !bundle) throw new NotFoundException('Bundle product not found');
    if (bundle.category !== 'bundles') {
      throw new BadRequestException('Product is not a bundle');
    }

    const { error: delError } = await this.supabase.admin
      .from('bundle_items')
      .delete()
      .eq('bundle_id', bundleId);

    if (delError) throw new BadRequestException(delError.message);

    if (items.length > 0) {
      const rows = items.map((i) => ({ bundle_id: bundleId, product_id: i.product_id, quantity: i.quantity }));
      const { error: insError } = await this.supabase.admin.from('bundle_items').insert(rows);
      if (insError) throw new BadRequestException(insError.message);
    }

    return this.getBundleItems(bundleId);
  }
}
