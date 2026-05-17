import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../guards/admin.guard';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { CreateMovementDto } from './dto/create-movement.dto';
import { StockMovementsService } from './stock-movements.service';

@UseGuards(SupabaseAuthGuard, AdminGuard)
@Controller('admin/stock-movements')
export class StockMovementsController {
  constructor(private movements: StockMovementsService) {}

  @Get('summary')
  summary() {
    return this.movements.summary();
  }

  @Get()
  list(@Query('product_id') productId: string) {
    return this.movements.listByProduct(productId);
  }

  @Post()
  create(@Body() dto: CreateMovementDto) {
    return this.movements.create(dto);
  }
}
