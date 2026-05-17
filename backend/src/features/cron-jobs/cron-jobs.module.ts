import { Module } from '@nestjs/common';
import { AdminGuard } from '../../guards/admin.guard';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { CronJobsController } from './cron-jobs.controller';
import { CronJobsService } from './cron-jobs.service';

@Module({
  controllers: [CronJobsController],
  providers: [CronJobsService, SupabaseAuthGuard, AdminGuard],
  exports: [CronJobsService],
})
export class CronJobsModule {}
