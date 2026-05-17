import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../guards/admin.guard';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { CreateServiceableAreaDto } from './dto/create-serviceable-area.dto';
import { ServiceableAreasService } from './serviceable-areas.service';

@Controller('delivery')
export class PublicServiceableAreasController {
  constructor(private service: ServiceableAreasService) {}

  @Get('serviceable')
  check(@Query('pincode') pincode: string) {
    if (!pincode?.trim()) {
      return { data: { serviceable: false, area_name: null }, message: 'Success' };
    }
    return this.service.check(pincode);
  }
}

@Controller('admin/serviceable-areas')
@UseGuards(SupabaseAuthGuard, AdminGuard)
export class AdminServiceableAreasController {
  constructor(private service: ServiceableAreasService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() dto: CreateServiceableAreaDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: CreateServiceableAreaDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Patch(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.service.toggle(id);
  }
}
