import { Module } from '@nestjs/common';
import { AdminGuard } from '../../guards/admin.guard';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { AdminPromoController, PromoController } from './promo.controller';
import { PromoService } from './promo.service';

@Module({
  controllers: [PromoController, AdminPromoController],
  providers: [PromoService, SupabaseAuthGuard, AdminGuard],
  exports: [PromoService],
})
export class PromoModule {}
