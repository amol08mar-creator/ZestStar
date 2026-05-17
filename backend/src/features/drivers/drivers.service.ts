import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { CreateDriverDto, UpdateDriverDto } from './dto/create-driver.dto';

@Injectable()
export class DriversService {
  constructor(private supabase: SupabaseService) {}

  async list() {
    const { data, error } = await this.supabase.admin
      .from('drivers')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return { data: { drivers: data ?? [] }, message: 'Success' };
  }

  async create(dto: CreateDriverDto) {
    const { data, error } = await this.supabase.admin
      .from('drivers')
      .insert({
        name: dto.name.trim(),
        phone: dto.phone.trim(),
        vehicle_type: dto.vehicle_type ?? 'bike',
        is_active: dto.is_active ?? true,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { data: { driver: data }, message: 'Driver created' };
  }

  async update(id: string, dto: UpdateDriverDto) {
    const payload: Record<string, unknown> = { ...dto, updated_at: new Date().toISOString() };
    if (dto.name) payload['name'] = dto.name.trim();
    if (dto.phone) payload['phone'] = dto.phone.trim();

    const { data, error } = await this.supabase.admin
      .from('drivers')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Driver not found');
    return { data: { driver: data }, message: 'Driver updated' };
  }

  async toggle(id: string) {
    const { data: current, error: fetchError } = await this.supabase.admin
      .from('drivers')
      .select('is_active')
      .eq('id', id)
      .single();

    if (fetchError || !current) throw new NotFoundException('Driver not found');

    const { data, error } = await this.supabase.admin
      .from('drivers')
      .update({
        is_active: !(current as { is_active: boolean }).is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    const updated = data as { is_active: boolean };
    return {
      data: { driver: data },
      message: updated.is_active ? 'Driver activated' : 'Driver deactivated',
    };
  }
}
