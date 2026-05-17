import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { CreateServiceableAreaDto } from './dto/create-serviceable-area.dto';

@Injectable()
export class ServiceableAreasService {
  constructor(private supabase: SupabaseService) {}

  async check(pincode: string) {
    const { data } = await this.supabase.admin
      .from('serviceable_areas')
      .select('area_name, is_active')
      .eq('pincode', pincode.trim())
      .maybeSingle();

    if (!data || !(data as { is_active: boolean }).is_active) {
      return { data: { serviceable: false, area_name: null }, message: 'Success' };
    }
    return {
      data: { serviceable: true, area_name: (data as { area_name: string | null }).area_name },
      message: 'Success',
    };
  }

  async isServiceable(pincode: string): Promise<boolean> {
    const result = await this.check(pincode);
    return result.data.serviceable;
  }

  async list() {
    const { data, error } = await this.supabase.admin
      .from('serviceable_areas')
      .select('*')
      .order('pincode');
    if (error) throw new BadRequestException(error.message);
    return { data: { areas: data ?? [] }, message: 'Success' };
  }

  async create(dto: CreateServiceableAreaDto) {
    const { data, error } = await this.supabase.admin
      .from('serviceable_areas')
      .insert({
        pincode: dto.pincode.trim(),
        area_name: dto.area_name ?? null,
        is_active: dto.is_active ?? true,
      })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return { data: { area: data }, message: 'Area added' };
  }

  async update(id: string, dto: Partial<CreateServiceableAreaDto>) {
    const payload: Record<string, unknown> = {};
    if (dto.pincode !== undefined) payload['pincode'] = dto.pincode.trim();
    if (dto.area_name !== undefined) payload['area_name'] = dto.area_name;
    if (dto.is_active !== undefined) payload['is_active'] = dto.is_active;

    const { data, error } = await this.supabase.admin
      .from('serviceable_areas')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Area not found');
    return { data: { area: data }, message: 'Area updated' };
  }

  async remove(id: string) {
    const { error } = await this.supabase.admin
      .from('serviceable_areas')
      .delete()
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
    return { data: null, message: 'Area removed' };
  }

  async toggle(id: string) {
    const { data: current } = await this.supabase.admin
      .from('serviceable_areas')
      .select('is_active')
      .eq('id', id)
      .single();
    if (!current) throw new NotFoundException('Area not found');
    return this.update(id, { is_active: !(current as { is_active: boolean }).is_active });
  }
}
