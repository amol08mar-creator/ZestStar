import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../guards/admin.guard';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { DeliverySlotsService } from './delivery-slots.service';
import { CreateSlotDto, GenerateSlotDto } from './dto/create-slot.dto';
import { QuerySlotsDto } from './dto/query-slots.dto';

@Controller('delivery-slots')
export class PublicDeliverySlotsController {
  constructor(private slots: DeliverySlotsService) {}

  @Get('dates')
  getAvailableDates() {
    return this.slots.getAvailableDates();
  }

  @Get()
  getByDate(@Query() query: QuerySlotsDto) {
    const date = query.date ?? new Date().toISOString().split('T')[0];
    return this.slots.getAvailableByDate(date);
  }
}

@UseGuards(SupabaseAuthGuard, AdminGuard)
@Controller('admin/delivery-slots')
export class DeliverySlotsController {
  constructor(private slots: DeliverySlotsService) {}

  @Get()
  listAll(@Query() query: QuerySlotsDto) {
    return this.slots.listAll(query);
  }

  @Post('generate')
  generate(@Body() dto: GenerateSlotDto) {
    return this.slots.generateForDate(dto.date);
  }

  @Post()
  create(@Body() dto: CreateSlotDto) {
    return this.slots.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: CreateSlotDto) {
    return this.slots.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.slots.remove(id);
  }
}
