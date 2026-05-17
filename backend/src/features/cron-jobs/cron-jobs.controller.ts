import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../guards/admin.guard';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { CronJobsService } from './cron-jobs.service';

@Controller('admin/cron-jobs')
@UseGuards(SupabaseAuthGuard, AdminGuard)
export class CronJobsController {
  constructor(private cronJobs: CronJobsService) {}

  @Get()
  list() {
    return this.cronJobs.list();
  }

  @Post(':name/trigger')
  trigger(@Param('name') name: string) {
    return this.cronJobs.trigger(name);
  }
}
