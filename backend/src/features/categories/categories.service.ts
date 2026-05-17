import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private supabase: SupabaseService) {}

  async listPublic() {
    const { data, error } = await this.supabase.admin
      .from('categories')
      .select('id, name, image_url')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return { data: { categories: data ?? [] }, message: 'Success' };
  }

  async list() {
    const { data, error } = await this.supabase.admin
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return { data: { categories: data ?? [], total: data?.length ?? 0 }, message: 'Success' };
  }

  async create(dto: CreateCategoryDto) {
    const { data, error } = await this.supabase.admin
      .from('categories')
      .insert({ ...dto, is_active: dto.is_active ?? true })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { data: { category: data }, message: 'Category created' };
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const { data, error } = await this.supabase.admin
      .from('categories')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Category not found');
    return { data: { category: data }, message: 'Category updated' };
  }

  async remove(id: string) {
    const { error } = await this.supabase.admin
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { data: null, message: 'Category deleted' };
  }
}
