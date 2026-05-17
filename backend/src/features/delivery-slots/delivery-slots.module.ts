import { Module } from '@nestjs/common';
import { AdminGuard } from '../../guards/admin.guard';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { DeliverySlotsController, PublicDeliverySlotsController } from './delivery-slots.controller';
import { DeliverySlotsService } from './delivery-slots.service';

@Module({
  controllers: [DeliverySlotsController, PublicDeliverySlotsController],
  providers: [DeliverySlotsService, SupabaseAuthGuard, AdminGuard],
  exports: [DeliverySlotsService],
})
export class DeliverySlotsModule {}
