import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { CreateSlotDto } from './dto/create-slot.dto';
import { QuerySlotsDto } from './dto/query-slots.dto';

const STANDARD_WINDOWS = [
  { time_start: '09:00', time_end: '11:00' },
  { time_start: '11:00', time_end: '13:00' },
  { time_start: '13:00', time_end: '15:00' },
  { time_start: '15:00', time_end: '17:00' },
  { time_start: '17:00', time_end: '19:00' },
  { time_start: '19:00', time_end: '21:00' },
];

@Injectable()
export class DeliverySlotsService {
  constructor(private supabase: SupabaseService) {}

  async getAvailableByDate(date: string) {
    const { data, error } = await this.supabase.admin
      .from('delivery_slots')
      .select('*')
      .eq('date', date)
      .eq('is_enabled', true)
      .order('time_start');

    if (error) throw new BadRequestException(error.message);
    const available = (data ?? []).filter((s: { booked: number; capacity: number }) => s.booked < s.capacity);
    return { data: { slots: available }, message: 'Success' };
  }

  async getAvailableDates() {
    const today = new Date();
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const { data, error } = await this.supabase.admin
      .from('delivery_slots')
      .select('date, booked, capacity, is_enabled')
      .in('date', dates)
      .eq('is_enabled', true);

    if (error) throw new BadRequestException(error.message);

    const withAvailability = dates.filter((date) =>
      (data ?? []).some(
        (s: { date: string; booked: number; capacity: number }) =>
          s.date === date && s.booked < s.capacity,
      ),
    );

    return { data: { dates: withAvailability }, message: 'Success' };
  }

  async listAll(query: QuerySlotsDto) {
    let q = this.supabase.admin
      .from('delivery_slots')
      .select('*')
      .order('date', { ascending: true })
      .order('time_start', { ascending: true });

    if (query.date) q = q.eq('date', query.date);

    const { data, error } = await q;
    if (error) throw new BadRequestException(error.message);
    return { data: { slots: data ?? [], total: data?.length ?? 0 }, message: 'Success' };
  }

  async create(dto: CreateSlotDto) {
    const { data, error } = await this.supabase.admin
      .from('delivery_slots')
      .insert({ ...dto, is_enabled: dto.is_enabled ?? true, booked: 0 })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { data: { slot: data }, message: 'Slot created' };
  }

  async generateForDate(date: string) {
    const rows = STANDARD_WINDOWS.map((w) => ({
      date,
      time_start: w.time_start,
      time_end: w.time_end,
      capacity: 10,
      booked: 0,
      is_enabled: true,
    }));

    const { data, error } = await this.supabase.admin
      .from('delivery_slots')
      .insert(rows)
      .select();

    if (error) throw new BadRequestException(error.message);
    return { data: { slots: data ?? [], count: data?.length ?? 0 }, message: `${data?.length} slots generated` };
  }

  async update(id: string, dto: Partial<CreateSlotDto>) {
    const { data, error } = await this.supabase.admin
      .from('delivery_slots')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Slot not found');
    return { data: { slot: data }, message: 'Slot updated' };
  }

  async remove(id: string) {
    const { error } = await this.supabase.admin
      .from('delivery_slots')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { data: null, message: 'Slot deleted' };
  }
}
