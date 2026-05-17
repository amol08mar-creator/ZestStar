import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { CreatePromoDto } from './dto/create-promo.dto';
import { UpdatePromoDto } from './dto/update-promo.dto';
import { ValidatePromoDto } from './dto/validate-promo.dto';

interface PromoRow {
  id: string;
  code: string;
  description: string | null;
  type: 'percentage' | 'fixed';
  value: number;
  min_order_amount: number;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  valid_until: string | null;
  max_uses_per_customer: number | null;
  first_order_only: boolean;
  applicable_categories: string[] | null;
  auto_apply: boolean;
  created_at: string;
  updated_at: string | null;
}

@Injectable()
export class PromoService {
  constructor(private supabase: SupabaseService) {}

  // Shared by validate endpoint AND orders service — throws BadRequestException if invalid
  async validateCode(
    code: string,
    items_total: number,
    userId?: string,
    items?: { category: string; total: number }[],
  ): Promise<{ promo: PromoRow; discount_amount: number }> {
    const normalized = code.trim().toUpperCase();

    const { data, error } = await this.supabase.admin
      .from('promo_codes')
      .select('*')
      .eq('code', normalized)
      .single();

    if (error || !data) throw new BadRequestException('Promo code not found');

    const promo = data as PromoRow;

    if (!promo.is_active) throw new BadRequestException('Promo code is inactive');

    if (promo.valid_until && new Date(promo.valid_until) < new Date())
      throw new BadRequestException('Promo code has expired');

    if (promo.max_uses !== null && promo.used_count >= promo.max_uses)
      throw new BadRequestException('Promo code usage limit reached');

    // Per-customer usage limit
    if (userId && promo.max_uses_per_customer !== null) {
      const { count } = await this.supabase.admin
        .from('promo_usage')
        .select('*', { count: 'exact', head: true })
        .eq('promo_id', promo.id)
        .eq('user_id', userId);
      if ((count ?? 0) >= promo.max_uses_per_customer)
        throw new BadRequestException('You have already used this code the maximum number of times');
    }

    // First-order-only
    if (userId && promo.first_order_only) {
      const { count } = await this.supabase.admin
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .neq('status', 'cancelled');
      if ((count ?? 0) > 0)
        throw new BadRequestException('This promo code is valid for first-time orders only');
    }

    if (items_total < promo.min_order_amount)
      throw new BadRequestException(
        `Minimum order of ₹${promo.min_order_amount} required for this code`,
      );

    // Category-aware discount calculation
    let discount_amount: number;

    if (promo.applicable_categories?.length && items?.length) {
      const eligibleTotal = items
        .filter((i) => promo.applicable_categories!.includes(i.category))
        .reduce((s, i) => s + i.total, 0);

      if (eligibleTotal === 0)
        throw new BadRequestException(
          `This code only applies to: ${promo.applicable_categories.join(', ')}`,
        );

      discount_amount = promo.type === 'percentage'
        ? Math.round((eligibleTotal * promo.value) / 100)
        : Math.min(promo.value, eligibleTotal);
    } else {
      discount_amount = promo.type === 'percentage'
        ? Math.round((items_total * promo.value) / 100)
        : promo.value;
    }

    discount_amount = Math.min(discount_amount, items_total);

    return { promo, discount_amount };
  }

  async validate(dto: ValidatePromoDto, userId: string) {
    const { promo, discount_amount } = await this.validateCode(
      dto.code, dto.items_total, userId, dto.items,
    );
    return {
      data: {
        code: promo.code,
        type: promo.type,
        value: promo.value,
        discount_amount,
        description: promo.description,
        applicable_categories: promo.applicable_categories,
      },
      message: 'Promo code applied',
    };
  }

  async getAutoApply(userId: string, itemsTotal: number, items?: { category: string; total: number }[]) {
    const { data: promos } = await this.supabase.admin
      .from('promo_codes')
      .select('*')
      .eq('is_active', true)
      .eq('auto_apply', true)
      .order('value', { ascending: false });

    for (const p of (promos ?? []) as PromoRow[]) {
      try {
        const { discount_amount } = await this.validateCode(p.code, itemsTotal, userId, items);
        return {
          data: {
            code: p.code,
            type: p.type,
            value: p.value,
            discount_amount,
            description: p.description,
          },
          message: 'Auto-apply promo found',
        };
      } catch { /* try next promo */ }
    }
    return { data: null, message: 'No auto-apply promos available' };
  }

  async list() {
    const { data, error } = await this.supabase.admin
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return { data: { promos: data ?? [], total: (data ?? []).length }, message: 'Success' };
  }

  async create(dto: CreatePromoDto) {
    if (dto.type === 'percentage' && dto.value > 100)
      throw new BadRequestException('Percentage discount cannot exceed 100');

    const { data, error } = await this.supabase.admin
      .from('promo_codes')
      .insert({
        code: dto.code.trim().toUpperCase(),
        description: dto.description ?? null,
        type: dto.type,
        value: dto.value,
        min_order_amount: dto.min_order_amount,
        max_uses: dto.max_uses ?? null,
        is_active: dto.is_active ?? true,
        valid_until: dto.valid_until ?? null,
        max_uses_per_customer: dto.max_uses_per_customer ?? null,
        first_order_only: dto.first_order_only ?? false,
        applicable_categories: dto.applicable_categories?.length ? dto.applicable_categories : null,
        auto_apply: dto.auto_apply ?? false,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new BadRequestException('Promo code already exists');
      throw new BadRequestException(error.message);
    }
    return { data: { promo: data }, message: 'Promo code created' };
  }

  async update(id: string, dto: UpdatePromoDto) {
    if (dto.type === 'percentage' && dto.value !== undefined && dto.value > 100)
      throw new BadRequestException('Percentage discount cannot exceed 100');

    const payload: Record<string, unknown> = { ...dto, updated_at: new Date().toISOString() };
    if (dto.code) payload['code'] = dto.code.trim().toUpperCase();
    if (dto.applicable_categories !== undefined) {
      payload['applicable_categories'] = dto.applicable_categories?.length ? dto.applicable_categories : null;
    }

    const { data, error } = await this.supabase.admin
      .from('promo_codes')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new BadRequestException('Promo code already exists');
      throw new BadRequestException(error.message);
    }
    if (!data) throw new NotFoundException('Promo code not found');
    return { data: { promo: data }, message: 'Promo code updated' };
  }

  async remove(id: string) {
    const { error } = await this.supabase.admin.from('promo_codes').delete().eq('id', id);
    if (error) throw new BadRequestException(error.message);
    return { data: null, message: 'Promo code deleted' };
  }

  async toggle(id: string) {
    const { data: current, error: fetchError } = await this.supabase.admin
      .from('promo_codes')
      .select('is_active')
      .eq('id', id)
      .single();

    if (fetchError || !current) throw new NotFoundException('Promo code not found');

    const { data, error } = await this.supabase.admin
      .from('promo_codes')
      .update({ is_active: !(current as { is_active: boolean }).is_active, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    const updated = data as { is_active: boolean };
    return { data: { promo: data }, message: `Promo code ${updated.is_active ? 'activated' : 'deactivated'}` };
  }

  // Called by OrdersService after successful order — records per-user usage + increments global count
  async recordUsage(promoId: string, userId: string, orderId: string) {
    await Promise.all([
      this.supabase.admin
        .from('promo_usage')
        .insert({ promo_id: promoId, user_id: userId, order_id: orderId }),
      this.supabase.admin.rpc('increment_promo_used_count', { promo_id: promoId }),
    ]).catch(() => {});
  }

  // Keep for backwards compatibility
  async incrementUsedCount(promoId: string) {
    await this.supabase.admin.rpc('increment_promo_used_count', { promo_id: promoId });
  }
}
