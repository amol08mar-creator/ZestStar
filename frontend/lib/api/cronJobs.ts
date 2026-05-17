const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface CronJobLog {
  id: string;
  job_name: string;
  status: 'running' | 'success' | 'failed';
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  records_processed: number | null;
  error_message: string | null;
}

function headers(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function handle(res: Response) {
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? json?.message ?? 'Request failed');
  return json;
}

export async function fetchCronJobLogs(token: string): Promise<CronJobLog[]> {
  const res = await fetch(`${API}/admin/cron-jobs`, { headers: headers(token) });
  const json = await handle(res);
  return json.data.logs as CronJobLog[];
}

export async function triggerCronJob(token: string, name: string): Promise<{ records_processed: number }> {
  const res = await fetch(`${API}/admin/cron-jobs/${name}/trigger`, {
    method: 'POST',
    headers: headers(token),
  });
  const json = await handle(res);
  return json.data as { records_processed: number };
}
