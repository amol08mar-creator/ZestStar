import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { CreateMovementDto } from './dto/create-movement.dto';

@Injectable()
export class StockMovementsService {
  constructor(private supabase: SupabaseService) {}

  async log(
    productId: string,
    type: string,
    quantity: number,
    note?: string,
    referenceId?: string,
  ) {
    const { error } = await this.supabase.admin
      .from('stock_movements')
      .insert({ product_id: productId, type, quantity, note: note ?? null, reference_id: referenceId ?? null });
    if (error) throw new BadRequestException(error.message);
  }

  async create(dto: CreateMovementDto) {
    await this.log(dto.product_id, dto.type, dto.quantity, dto.note, dto.reference_id);
    return { data: null, message: 'Movement recorded' };
  }

  async listByProduct(productId: string) {
    const { data, error } = await this.supabase.admin
      .from('stock_movements')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new BadRequestException(error.message);
    return { data: { movements: data ?? [] }, message: 'Success' };
  }

  async summary() {
    const { data, error } = await this.supabase.admin
      .from('stock_movements')
      .select('product_id, type, quantity');

    if (error) throw new BadRequestException(error.message);

    const map = new Map<string, { purchased: number; sold: number; adjusted: number; returned: number }>();
    for (const row of (data ?? []) as { product_id: string; type: string; quantity: number }[]) {
      const entry = map.get(row.product_id) ?? { purchased: 0, sold: 0, adjusted: 0, returned: 0 };
      if (row.type === 'purchase') entry.purchased += row.quantity;
      else if (row.type === 'sale') entry.sold += row.quantity;
      else if (row.type === 'adjustment') entry.adjusted += row.quantity;
      else if (row.type === 'return') entry.returned += row.quantity;
      map.set(row.product_id, entry);
    }

    const { data: products } = await this.supabase.admin
      .from('products')
      .select('id, name, stock, image_url, category')
      .order('name');

    const result = (products ?? []).map((p: { id: string; name: string; stock: number; image_url: string; category: string }) => ({
      product_id: p.id,
      product_name: p.name,
      product_image: p.image_url,
      category: p.category,
      current_stock: p.stock,
      ...(map.get(p.id) ?? { purchased: 0, sold: 0, adjusted: 0, returned: 0 }),
    }));

    return { data: { summary: result }, message: 'Success' };
  }
}
