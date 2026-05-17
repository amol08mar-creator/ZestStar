'use client';
import { useEffect, useState } from 'react';
import { RefreshCw, Play, CheckCircle, XCircle, Clock, Loader2, AlertCircle } from 'lucide-react';
import { fetchCronJobLogs, triggerCronJob, type CronJobLog } from '@/lib/api/cronJobs';

interface JobDef {
  name: string;
  label: string;
  schedule: string;
  icon: string;
  description: string;
}

const JOBS: JobDef[] = [
  {
    name: 'subscription_deliveries',
    label: 'Subscription Deliveries',
    schedule: 'Daily at 6:00 AM IST',
    icon: '📦',
    description: 'Creates orders for all active subscriptions due for delivery',
  },
  {
    name: 'notification_purge',
    label: 'Notification Cleanup',
    schedule: 'Daily at 2:00 AM UTC',
    icon: '🗑️',
    description: 'Deletes notification records older than 15 days',
  },
];

function formatDuration(ms: number | null): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function StatusBadge({ status }: { status: CronJobLog['status'] }) {
  if (status === 'success') return (
    <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
      <CheckCircle className="w-3 h-3" /> Success
    </span>
  );
  if (status === 'failed') return (
    <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
      <XCircle className="w-3 h-3" /> Failed
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs font-bold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">
      <Loader2 className="w-3 h-3 animate-spin" /> Running
    </span>
  );
}

export default function AdminCronJobsPanel({ token }: { token: string }) {
  const [logs, setLogs] = useState<CronJobLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);
  const [triggerResult, setTriggerResult] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  async function load() {
    try {
      setLogs(await fetchCronJobLogs(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleTrigger(jobName: string) {
    if (triggeringJob) return;
    setTriggeringJob(jobName);
    setTriggerResult((prev) => ({ ...prev, [jobName]: '' }));
    try {
      const result = await triggerCronJob(token, jobName);
      setTriggerResult((prev) => ({ ...prev, [jobName]: `Done — ${result.records_processed} records processed` }));
      await load(); // refresh logs
    } catch (e) {
      setTriggerResult((prev) => ({ ...prev, [jobName]: `Error: ${e instanceof Error ? e.message : 'Failed'}` }));
    } finally {
      setTriggeringJob(null);
    }
  }

  // Latest log per job
  const latestByJob = JOBS.reduce<Record<string, CronJobLog | null>>((acc, job) => {
    acc[job.name] = logs.find((l) => l.job_name === job.name) ?? null;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-dark">Cron Jobs</h2>
          <p className="text-xs text-muted mt-0.5">Scheduled background tasks — status and manual triggers</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-primary border border-primary/30 px-3 py-1.5 rounded-xl hover:bg-primary-light transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}

      {/* Job cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {JOBS.map((job) => {
          const latest = latestByJob[job.name];
          const isTriggering = triggeringJob === job.name;
          const result = triggerResult[job.name];

          return (
            <div key={job.name} className="bg-white border border-border rounded-2xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{job.icon}</span>
                  <div>
                    <p className="font-bold text-dark text-sm">{job.label}</p>
                    <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> {job.schedule}
                    </p>
                  </div>
                </div>
                {latest ? <StatusBadge status={latest.status} /> : (
                  <span className="text-xs text-muted bg-gray-100 px-2 py-0.5 rounded-full">Not run yet</span>
                )}
              </div>

              <p className="text-xs text-muted">{job.description}</p>

              {latest && (
                <div className="bg-cream rounded-xl px-3 py-2 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted">Last run</span>
                    <span className="font-medium text-dark">{timeAgo(latest.started_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Duration</span>
                    <span className="font-medium text-dark">{formatDuration(latest.duration_ms)}</span>
                  </div>
                  {latest.records_processed !== null && (
                    <div className="flex justify-between">
                      <span className="text-muted">Records</span>
                      <span className="font-medium text-dark">{latest.records_processed}</span>
                    </div>
                  )}
                  {latest.status === 'failed' && latest.error_message && (
                    <div className="flex items-start gap-1 text-red-600 mt-1">
                      <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                      <span className="break-all">{latest.error_message}</span>
                    </div>
                  )}
                </div>
              )}

              {result && (
                <p className={`text-xs font-medium ${result.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>
                  {result}
                </p>
              )}

              <button
                onClick={() => handleTrigger(job.name)}
                disabled={!!triggeringJob}
                className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-primary border border-primary/30 py-2 rounded-xl hover:bg-primary-light transition-colors disabled:opacity-50"
              >
                {isTriggering
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Running…</>
                  : <><Play className="w-3.5 h-3.5" /> Run Now</>}
              </button>
            </div>
          );
        })}
      </div>

      {/* Execution history */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-dark text-sm">Execution History</h3>
          <p className="text-xs text-muted mt-0.5">Last 100 runs across all jobs</p>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted mx-auto" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-muted">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">No runs recorded yet</p>
            <p className="text-xs mt-1">Click "Run Now" to trigger a job manually</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-cream">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">Job</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">Started</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">Duration</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">Records</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-cream/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span>{JOBS.find((j) => j.name === log.job_name)?.icon ?? '⚙️'}</span>
                        <span className="font-medium text-dark text-xs">
                          {JOBS.find((j) => j.name === log.job_name)?.label ?? log.job_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                    <td className="px-4 py-3 text-xs text-muted">{timeAgo(log.started_at)}</td>
                    <td className="px-4 py-3 text-xs text-dark">{formatDuration(log.duration_ms)}</td>
                    <td className="px-4 py-3 text-xs text-dark">{log.records_processed ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-red-500 max-w-xs truncate">{log.error_message ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
