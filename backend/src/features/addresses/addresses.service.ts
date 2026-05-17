import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { CreateAddressDto } from './dto/create-address.dto';

const MAX_ADDRESSES = 5;

@Injectable()
export class AddressesService {
  constructor(private supabase: SupabaseService) {}

  async list(userId: string) {
    const { data, error } = await this.supabase.admin
      .from('user_addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return { data: { addresses: data ?? [] }, message: 'Success' };
  }

  async create(userId: string, dto: CreateAddressDto) {
    // Enforce max 3
    const { count } = await this.supabase.admin
      .from('user_addresses')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if ((count ?? 0) >= MAX_ADDRESSES) {
      throw new BadRequestException(`You can save a maximum of ${MAX_ADDRESSES} addresses. Please delete one to add a new address.`);
    }

    // If setting as default, unset others first
    if (dto.is_default) {
      await this.supabase.admin
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', userId);
    }

    // If this is the first address, make it default
    const isFirst = (count ?? 0) === 0;

    const { data, error } = await this.supabase.admin
      .from('user_addresses')
      .insert({
        user_id: userId,
        label: dto.label,
        address: dto.address,
        landmark: dto.landmark ?? null,
        pincode: dto.pincode ?? null,
        is_default: dto.is_default ?? isFirst,
        delivery_instructions: dto.delivery_instructions ?? null,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { data: { address: data }, message: 'Address saved' };
  }

  async update(userId: string, id: string, dto: CreateAddressDto) {
    if (dto.is_default) {
      await this.supabase.admin
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', userId);
    }

    const { data, error } = await this.supabase.admin
      .from('user_addresses')
      .update({
        label: dto.label,
        address: dto.address,
        landmark: dto.landmark ?? null,
        pincode: dto.pincode ?? null,
        is_default: dto.is_default ?? false,
        delivery_instructions: dto.delivery_instructions ?? null,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Address not found');
    return { data: { address: data }, message: 'Address updated' };
  }

  async remove(userId: string, id: string) {
    const { error } = await this.supabase.admin
      .from('user_addresses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw new BadRequestException(error.message);
    return { data: null, message: 'Address deleted' };
  }
}
