import { Module } from '@nestjs/common';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { AdminLoyaltyConfigController, CoinsController, PublicCoinsController } from './coins.controller';
import { CoinsService } from './coins.service';

@Module({
  controllers: [PublicCoinsController, CoinsController, AdminLoyaltyConfigController],
  providers: [CoinsService, SupabaseAuthGuard],
  exports: [CoinsService],
})
export class CoinsModule {}
