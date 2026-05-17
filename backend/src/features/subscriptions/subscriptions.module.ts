import { Module } from '@nestjs/common';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { CronJobsModule } from '../cron-jobs/cron-jobs.module';
import { OrdersModule } from '../orders/orders.module';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsScheduler } from './subscriptions.scheduler';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [OrdersModule, CronJobsModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionsScheduler, SupabaseAuthGuard],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
