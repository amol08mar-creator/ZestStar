import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

export interface ReviewRow {
  id: string;
  user_id: string;
  product_id: string;
  order_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  updated_at: string | null;
}

@Injectable()
export class ReviewsService {
  constructor(private supabase: SupabaseService) {}

  async create(userId: string, dto: CreateReviewDto) {
    // 1. Verify the order belongs to user and is delivered
    const { data: order, error: orderErr } = await this.supabase.admin
      .from('orders')
      .select('id')
      .eq('id', dto.order_id)
      .eq('user_id', userId)
      .eq('status', 'delivered')
      .single();

    if (orderErr || !order) {
      throw new BadRequestException('Order not found or not yet delivered');
    }

    // 2. Verify the product is in that order
    const { data: item, error: itemErr } = await this.supabase.admin
      .from('order_items')
      .select('id')
      .eq('order_id', dto.order_id)
      .eq('product_id', dto.product_id)
      .single();

    if (itemErr || !item) {
      throw new BadRequestException('Product was not part of this order');
    }

    // 3. Upsert review (onConflict = user_id,product_id unique constraint)
    const { data: review, error } = await this.supabase.admin
      .from('reviews')
      .upsert(
        {
          user_id: userId,
          product_id: dto.product_id,
          order_id: dto.order_id,
          rating: dto.rating,
          review_text: dto.review_text ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,product_id' },
      )
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new BadRequestException('You have already reviewed this product');
      throw new BadRequestException(error.message);
    }

    // 4. Recalculate product rating
    await this.recalcRating(dto.product_id);

    return { data: { review }, message: 'Review submitted' };
  }

  async update(userId: string, reviewId: string, dto: UpdateReviewDto) {
    const { data: existing, error: fetchErr } = await this.supabase.admin
      .from('reviews')
      .select('product_id')
      .eq('id', reviewId)
      .eq('user_id', userId)
      .single();

    if (fetchErr || !existing) throw new NotFoundException('Review not found');

    const { data: review, error } = await this.supabase.admin
      .from('reviews')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', reviewId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    await this.recalcRating((existing as { product_id: string }).product_id);
    return { data: { review }, message: 'Review updated' };
  }

  async remove(userId: string, reviewId: string) {
    const { data: existing, error: fetchErr } = await this.supabase.admin
      .from('reviews')
      .select('product_id')
      .eq('id', reviewId)
      .eq('user_id', userId)
      .single();

    if (fetchErr || !existing) throw new NotFoundException('Review not found');

    const { error } = await this.supabase.admin
      .from('reviews')
      .delete()
      .eq('id', reviewId);

    if (error) throw new BadRequestException(error.message);

    await this.recalcRating((existing as { product_id: string }).product_id);
    return { data: null, message: 'Review deleted' };
  }

  async getByProduct(productId: string, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const { data, error, count } = await this.supabase.admin
      .from('reviews')
      .select('*', { count: 'exact' })
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new BadRequestException(error.message);

    const reviews = await this.enrichWithNames(data ?? []);
    return {
      data: { reviews, total: count ?? 0, page, limit },
      message: 'Success',
    };
  }

  async getSummary(productId: string) {
    const { data } = await this.supabase.admin
      .from('reviews')
      .select('rating')
      .eq('product_id', productId);

    const ratings = (data ?? []).map((r: { rating: number }) => r.rating);
    const total = ratings.length;
    const average = total > 0 ? Math.round((ratings.reduce((s, r) => s + r, 0) / total) * 10) / 10 : 0;

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of ratings) distribution[r] = (distribution[r] ?? 0) + 1;

    return { data: { average, total, distribution }, message: 'Success' };
  }

  async getByUser(userId: string) {
    const { data, error } = await this.supabase.admin
      .from('reviews')
      .select('id, product_id, order_id, rating, review_text, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return { data: { reviews: data ?? [] }, message: 'Success' };
  }

  async getFeaturedReviews(limit = 8) {
    const { data, error } = await this.supabase.admin
      .from('reviews')
      .select('id, user_id, rating, review_text, created_at, product_id, products(name, image_url)')
      .gte('rating', 4)
      .not('review_text', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new BadRequestException(error.message);

    const enriched = await this.enrichWithNames((data ?? []) as unknown as ReviewRow[]);
    return { data: { reviews: enriched.map((r, i) => ({ ...r, product: (data?.[i] as { products?: unknown })?.products ?? null })) }, message: 'Success' };
  }

  async canReview(userId: string, productId: string) {
    const { data: existing } = await this.supabase.admin
      .from('reviews')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .maybeSingle();

    if (existing) return { data: { can: false, reason: 'already_reviewed' }, message: 'Success' };

    const { data: item } = await this.supabase.admin
      .from('order_items')
      .select('order_id, orders!inner(id, status, user_id)')
      .eq('product_id', productId)
      .eq('orders.user_id', userId)
      .eq('orders.status', 'delivered')
      .limit(1)
      .maybeSingle();

    if (item) return { data: { can: true, order_id: item.order_id }, message: 'Success' };
    return { data: { can: false, reason: 'no_purchase' }, message: 'Success' };
  }

  // Recalculate product's avg rating and review_count after any review change
  private async recalcRating(productId: string) {
    const { data } = await this.supabase.admin
      .from('reviews')
      .select('rating')
      .eq('product_id', productId);

    const ratings = (data ?? []).map((r: { rating: number }) => r.rating);
    const count = ratings.length;
    const avg = count > 0 ? Math.round((ratings.reduce((s, r) => s + r, 0) / count) * 10) / 10 : 0;

    await this.supabase.admin
      .from('products')
      .update({ rating: avg, review_count: count })
      .eq('id', productId);
  }

  // Fetch user display names and mask them (e.g. "Priya Sharma" → "P***")
  private async enrichWithNames(reviews: ReviewRow[]): Promise<(ReviewRow & { reviewer_name: string })[]> {
    const uniqueUserIds = [...new Set(reviews.map((r) => r.user_id))];

    const nameMap = new Map<string, string>();
    await Promise.all(
      uniqueUserIds.map(async (uid) => {
        try {
          const { data } = await this.supabase.admin.auth.admin.getUserById(uid);
          const u = data?.user as { user_metadata?: Record<string, unknown> } | null;
          const name = (u?.user_metadata?.['name'] as string) ?? 'Customer';
          nameMap.set(uid, name.charAt(0).toUpperCase() + '***');
        } catch {
          nameMap.set(uid, 'C***');
        }
      }),
    );

    return reviews.map((r) => ({
      ...r,
      reviewer_name: nameMap.get(r.user_id) ?? 'C***',
    }));
  }
}
