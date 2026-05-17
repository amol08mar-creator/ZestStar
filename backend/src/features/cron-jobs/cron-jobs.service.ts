import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class CronJobsService {
  constructor(private supabase: SupabaseService) {}

  private runners = new Map<string, () => Promise<number>>();

  registerRunner(jobName: string, runner: () => Promise<number>) {
    this.runners.set(jobName, runner);
  }

  async logStart(jobName: string): Promise<string> {
    const { data, error } = await this.supabase.admin
      .from('cron_job_logs')
      .insert({ job_name: jobName, status: 'running' })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    return (data as { id: string }).id;
  }

  async logComplete(
    logId: string,
    status: 'success' | 'failed',
    records = 0,
    errorMessage?: string,
  ) {
    const completedAt = new Date();
    const { data: log } = await this.supabase.admin
      .from('cron_job_logs')
      .select('started_at')
      .eq('id', logId)
      .single();
    const durationMs = log
      ? completedAt.getTime() - new Date((log as { started_at: string }).started_at).getTime()
      : null;

    await this.supabase.admin
      .from('cron_job_logs')
      .update({
        status,
        completed_at: completedAt.toISOString(),
        duration_ms: durationMs,
        records_processed: records,
        error_message: errorMessage ?? null,
      })
      .eq('id', logId);
  }

  async list() {
    const { data, error } = await this.supabase.admin
      .from('cron_job_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(100);
    if (error) throw new BadRequestException(error.message);
    return { data: { logs: data ?? [] }, message: 'Success' };
  }

  async trigger(jobName: string) {
    const runner = this.runners.get(jobName);
    if (!runner) throw new NotFoundException(`No runner registered for job: ${jobName}`);

    const logId = await this.logStart(jobName);
    try {
      const count = await runner();
      await this.logComplete(logId, 'success', count);
      return { data: { records_processed: count }, message: `${jobName} completed successfully` };
    } catch (err) {
      await this.logComplete(logId, 'failed', 0, (err as Error)?.message ?? 'Unknown error');
      throw new BadRequestException(`Job ${jobName} failed: ${(err as Error)?.message}`);
    }
  }
}
