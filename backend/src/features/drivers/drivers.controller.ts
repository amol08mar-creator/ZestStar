import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../guards/admin.guard';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { CreateDriverDto, UpdateDriverDto } from './dto/create-driver.dto';
import { DriversService } from './drivers.service';

@UseGuards(SupabaseAuthGuard, AdminGuard)
@Controller('admin/drivers')
export class DriversController {
  constructor(private drivers: DriversService) {}

  @Get()
  list() {
    return this.drivers.list();
  }

  @Post()
  create(@Body() dto: CreateDriverDto) {
    return this.drivers.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDriverDto) {
    return this.drivers.update(id, dto);
  }

  @Patch(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.drivers.toggle(id);
  }
}
