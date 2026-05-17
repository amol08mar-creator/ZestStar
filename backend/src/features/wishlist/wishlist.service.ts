import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class WishlistService {
  constructor(private supabase: SupabaseService) {}

  async list(userId: string) {
    const { data, error } = await this.supabase.admin
      .from('wishlists')
      .select('product_id, products(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);

    const productIds = (data ?? []).map((r: { product_id: string }) => r.product_id);
    const products = (data ?? []).map((r: { products: unknown }) => r.products);
    return { data: { product_ids: productIds, products }, message: 'Success' };
  }

  async add(userId: string, productId: string) {
    const { error } = await this.supabase.admin
      .from('wishlists')
      .upsert({ user_id: userId, product_id: productId }, { onConflict: 'user_id,product_id' });

    if (error) throw new BadRequestException(error.message);
    return { data: null, message: 'Added to wishlist' };
  }

  async remove(userId: string, productId: string) {
    const { error } = await this.supabase.admin
      .from('wishlists')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (error) throw new BadRequestException(error.message);
    return { data: null, message: 'Removed from wishlist' };
  }

  async createShare(userId: string): Promise<string> {
    const { data, error } = await this.supabase.admin
      .from('wishlist_shares')
      .upsert({ user_id: userId }, { onConflict: 'user_id' })
      .select('id')
      .single();

    if (error || !data) throw new BadRequestException('Could not create share link');
    return (data as { id: string }).id;
  }

  async getShared(shareToken: string) {
    const { data: share } = await this.supabase.admin
      .from('wishlist_shares')
      .select('user_id')
      .eq('id', shareToken)
      .single();

    if (!share) throw new NotFoundException('Share link not found');

    const { data, error } = await this.supabase.admin
      .from('wishlists')
      .select('product_id, products(*)')
      .eq('user_id', (share as { user_id: string }).user_id)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    const products = (data ?? []).map((r: { products: unknown }) => r.products).filter(Boolean);
    return { data: { products }, message: 'Success' };
  }
}
