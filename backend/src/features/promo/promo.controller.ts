import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { User } from '@supabase/supabase-js';
import { Request } from 'express';
import { AdminGuard } from '../../guards/admin.guard';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { CreatePromoDto } from './dto/create-promo.dto';
import { UpdatePromoDto } from './dto/update-promo.dto';
import { ValidatePromoDto } from './dto/validate-promo.dto';
import { PromoService } from './promo.service';

type AuthRequest = Request & { user: User };

@UseGuards(SupabaseAuthGuard)
@Controller('promo')
export class PromoController {
  constructor(private promo: PromoService) {}

  @Post('validate')
  validate(@Req() req: AuthRequest, @Body() dto: ValidatePromoDto) {
    return this.promo.validate(dto, req.user.id);
  }

  @Get('auto')
  getAutoApply(@Req() req: AuthRequest, @Query('items_total') itemsTotal: string) {
    return this.promo.getAutoApply(req.user.id, Number(itemsTotal) || 0);
  }
}

@UseGuards(SupabaseAuthGuard, AdminGuard)
@Controller('admin/promo')
export class AdminPromoController {
  constructor(private promo: PromoService) {}

  @Get()
  list() {
    return this.promo.list();
  }

  @Post()
  create(@Body() dto: CreatePromoDto) {
    return this.promo.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePromoDto) {
    return this.promo.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.promo.remove(id);
  }

  @Patch(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.promo.toggle(id);
  }
}
