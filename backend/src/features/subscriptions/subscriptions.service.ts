import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { OrdersService } from '../orders/orders.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    private supabase: SupabaseService,
    private ordersService: OrdersService,
  ) {}

  private computeNextDate(frequency: string, frequencyDay: number | null, from?: Date): string {
    const base = from ?? new Date();
    const d = new Date(base);
    d.setHours(0, 0, 0, 0);

    if (frequency === 'daily') {
      d.setDate(d.getDate() + 1);
    } else if (frequency === 'weekly') {
      const targetDay = frequencyDay ?? 1; // Monday default
      const daysUntil = ((targetDay - d.getDay()) + 7) % 7 || 7;
      d.setDate(d.getDate() + daysUntil);
    } else if (frequency === 'monthly') {
      const targetDate = frequencyDay ?? 1;
      d.setMonth(d.getMonth() + 1);
      d.setDate(Math.min(targetDate, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
    }

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  async create(userId: string, dto: CreateSubscriptionDto) {
    const { data: product, error: productErr } = await this.supabase.admin
      .from('products')
      .select('id, name, price, is_active, stock')
      .eq('id', dto.product_id)
      .single();

    if (productErr || !product) throw new BadRequestException('Product not found');
    if (!product.is_active) throw new BadRequestException('Product is not available for subscription');

    const today = new Date().toISOString().slice(0, 10);
    const nextDeliveryDate: string = dto.start_date
      ?? (dto.frequency === 'daily'
        ? today
        : this.computeNextDate(dto.frequency, dto.frequency_day ?? null));

    const { data, error } = await this.supabase.admin
      .from('subscriptions')
      .insert({
        user_id: userId,
        product_id: dto.product_id,
        quantity: dto.quantity,
        delivery_address: dto.delivery_address,
        delivery_landmark: dto.delivery_landmark ?? null,
        frequency: dto.frequency,
        frequency_day: dto.frequency_day ?? null,
        discount_pct: 5,
        status: 'active',
        next_delivery_date: nextDeliveryDate,
        preferred_time_start: dto.preferred_time_start ?? null,
        preferred_time_end: dto.preferred_time_end ?? null,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Create today's order immediately if the subscription starts today
    if (nextDeliveryDate <= today) {
      await this.processScheduled();
    }

    return { data: { subscription: data }, message: 'Subscription created' };
  }

  async findAll(userId: string) {
    const { data, error } = await this.supabase.admin
      .from('subscriptions')
      .select('*, products(name, image_url, price, weight)')
      .eq('user_id', userId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return { data: { subscriptions: data ?? [] }, message: 'Success' };
  }

  async update(userId: string, id: string, dto: UpdateSubscriptionDto) {
    const { data: sub, error: fetchErr } = await this.supabase.admin
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchErr || !sub) throw new NotFoundException('Subscription not found');

    const s = sub as Record<string, unknown>;
    if (s['status'] === 'cancelled') throw new BadRequestException('Cannot modify a cancelled subscription');

    const updates: Record<string, unknown> = {};
    if (dto.quantity !== undefined)             updates.quantity = dto.quantity;
    if (dto.frequency !== undefined)            updates.frequency = dto.frequency;
    if (dto.frequency_day !== undefined)        updates.frequency_day = dto.frequency_day;
    if (dto.delivery_address !== undefined)     updates.delivery_address = dto.delivery_address;
    if (dto.delivery_landmark !== undefined)    updates.delivery_landmark = dto.delivery_landmark;
    if (dto.preferred_time_start !== undefined) updates.preferred_time_start = dto.preferred_time_start;
    if (dto.preferred_time_end !== undefined)   updates.preferred_time_end = dto.preferred_time_end;

    // Only recalculate next_delivery_date if frequency changed and subscription is active
    const freqChanged = dto.frequency !== undefined || dto.frequency_day !== undefined;
    if (freqChanged && s['status'] === 'active') {
      const newFreq = dto.frequency ?? (s['frequency'] as string);
      const newDay = dto.frequency_day !== undefined ? dto.frequency_day : (s['frequency_day'] as number | null);
      updates.next_delivery_date = this.computeNextDate(newFreq, newDay);
    }

    const { data: updated, error } = await this.supabase.admin
      .from('subscriptions')
      .update(updates)
      .eq('id', id)
      .select('*, products(name, image_url, price, weight)')
      .single();

    if (error) throw new BadRequestException(error.message);
    return { data: { subscription: updated }, message: 'Subscription updated' };
  }

  async pause(userId: string, id: string, pauseUntil?: string) {
    const { data: sub } = await this.supabase.admin
      .from('subscriptions')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!sub) throw new NotFoundException('Subscription not found');

    const { error } = await this.supabase.admin
      .from('subscriptions')
      .update({ status: 'paused', paused_until: pauseUntil ?? null })
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { data: null, message: 'Subscription paused' };
  }

  async resume(userId: string, id: string) {
    const { data: sub } = await this.supabase.admin
      .from('subscriptions')
      .select('id, frequency, frequency_day')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!sub) throw new NotFoundException('Subscription not found');

    const next = this.computeNextDate(sub.frequency, sub.frequency_day ?? null);

    const { error } = await this.supabase.admin
      .from('subscriptions')
      .update({ status: 'active', paused_until: null, next_delivery_date: next })
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { data: null, message: 'Subscription resumed' };
  }

  async cancel(userId: string, id: string) {
    const { data: sub } = await this.supabase.admin
      .from('subscriptions')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!sub) throw new NotFoundException('Subscription not found');

    const { error } = await this.supabase.admin
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { data: null, message: 'Subscription cancelled' };
  }

  async processScheduled(): Promise<number> {
    const today = new Date().toISOString().slice(0, 10);

    const { data: due, error } = await this.supabase.admin
      .from('subscriptions')
      .select('*, products(id, name, image_url, price, weight, stock)')
      .eq('status', 'active')
      .lte('next_delivery_date', today);

    if (error) {
      console.error('[Subscriptions] Failed to fetch due subscriptions:', error.message);
      return 0;
    }

    let processed = 0;
    for (const sub of due ?? []) {
      const product = sub.products as { id: string; name: string; image_url: string | null; price: number; weight: string | null; stock: number };

      if (!product || product.stock < sub.quantity) {
        console.warn(`[Subscriptions] Skipping sub ${sub.id}: product out of stock`);
        continue;
      }

      try {
        await this.processSub(sub, product, today);
        processed++;
      } catch (err) {
        console.error(`[Subscriptions] Failed to process sub ${sub.id}:`, (err as Error)?.message);
      }
    }

    return processed;
  }

  async processOne(id: string) {
    const today = new Date().toISOString().slice(0, 10);

    const { data: sub, error } = await this.supabase.admin
      .from('subscriptions')
      .select('*, products(id, name, image_url, price, weight, stock)')
      .eq('id', id)
      .single();

    if (error || !sub) throw new NotFoundException('Subscription not found');
    if (sub.last_delivered_date === today) throw new BadRequestException('Subscription already delivered today');

    const product = sub.products as { id: string; name: string; image_url: string | null; price: number; weight: string | null; stock: number };
    if (!product || product.stock < sub.quantity) throw new BadRequestException('Insufficient stock for this subscription');

    await this.processSub(sub, product, today);
  }

  private async processSub(
    sub: Record<string, unknown>,
    product: { id: string; name: string; image_url: string | null; price: number; weight: string | null; stock: number },
    today: string,
  ) {
    const discountedPrice = Math.round(product.price * (1 - (sub.discount_pct as number) / 100));
    const itemsTotal = discountedPrice * (sub.quantity as number);
    const deliveryFee = itemsTotal >= 500 ? 0 : 30;

    const timeSuffix = sub.preferred_time_start
      ? `Preferred delivery: ${sub.preferred_time_start}–${sub.preferred_time_end}`
      : null;
    const landmark = [(sub.delivery_landmark as string | null), timeSuffix].filter(Boolean).join(' · ') || undefined;

    await this.ordersService.create(sub.user_id as string, {
      delivery_address: sub.delivery_address as string,
      delivery_landmark: landmark,
      items_total: itemsTotal,
      delivery_fee: deliveryFee,
      final_total: itemsTotal + deliveryFee,
      items: [{
        product_id: sub.product_id as string,
        product_name: product.name,
        product_image: product.image_url ?? undefined,
        product_weight: product.weight ?? undefined,
        quantity: sub.quantity as number,
        unit_price: discountedPrice,
        total_price: discountedPrice * (sub.quantity as number),
      }],
    });

    const next = this.computeNextDate(sub.frequency as string, sub.frequency_day as number | null);
    await this.supabase.admin
      .from('subscriptions')
      .update({ next_delivery_date: next, last_delivered_date: today })
      .eq('id', sub.id as string);
  }
}
