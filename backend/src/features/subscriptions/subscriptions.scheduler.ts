import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CronJobsService } from '../cron-jobs/cron-jobs.service';
import { SubscriptionsService } from './subscriptions.service';

@Injectable()
export class SubscriptionsScheduler implements OnModuleInit {
  constructor(
    private svc: SubscriptionsService,
    private cronJobs: CronJobsService,
  ) {}

  onModuleInit() {
    this.cronJobs.registerRunner('subscription_deliveries', () => this.svc.processScheduled());
  }

  @Cron('0 6 * * *', { timeZone: 'Asia/Kolkata' })
  async runDailyDeliveries() {
    console.log('[Subscriptions] Running scheduled delivery job...');
    const logId = await this.cronJobs.logStart('subscription_deliveries').catch(() => null);
    try {
      const count = await this.svc.processScheduled();
      if (logId) await this.cronJobs.logComplete(logId, 'success', count);
      console.log(`[Subscriptions] Processed ${count} scheduled deliveries`);
    } catch (err) {
      if (logId) await this.cronJobs.logComplete(logId, 'failed', 0, (err as Error)?.message);
      console.error('[Subscriptions] Daily delivery job failed:', err);
    }
  }
}
