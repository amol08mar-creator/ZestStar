import { Module } from '@nestjs/common';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { CoinsModule } from '../coins/coins.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReferralController } from './referral.controller';
import { ReferralService } from './referral.service';

@Module({
  imports: [CoinsModule, NotificationsModule],
  controllers: [ReferralController],
  providers: [ReferralService, SupabaseAuthGuard],
  exports: [ReferralService],
})
export class ReferralModule {}
