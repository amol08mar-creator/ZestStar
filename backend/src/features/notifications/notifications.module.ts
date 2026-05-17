import { Module } from '@nestjs/common';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { CronJobsModule } from '../cron-jobs/cron-jobs.module';
import { NotificationsCentreController, NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [CronJobsModule],
  controllers: [NotificationsController, NotificationsCentreController],
  providers: [NotificationsService, SupabaseAuthGuard],
  exports: [NotificationsService],
})
export class NotificationsModule {}

