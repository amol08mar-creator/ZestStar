'use client';
import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { CheckCircle2, RefreshCw, Users, PauseCircle, Truck, TrendingUp, Pause, Play, Trash2 } from 'lucide-react';
import { TIME_WINDOWS } from '@/lib/api/subscriptions';
import {
  fetchAdminSubscriptions,
  adminPauseSubscription,
  adminResumeSubscription,
  adminCancelSubscription,
  adminMarkDelivered,
  type AdminSubscription,
  type AdminSubscriptionStats,
} from '@/lib/api/admin';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function fmtRupees(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}

function timeLabel(preferred_time_start: string | null | undefined, preferred_time_end: string | null | undefined) {
  if (!preferred_time_start) return '—';
  const w = TIME_WINDOWS.find((w) => w.start === preferred_time_start);
  return w?.label ?? `${preferred_time_start}–${preferred_time_end}`;
}

function frequencyLabel(sub: AdminSubscription) {
  if (sub.frequency === 'daily') return 'Every Day';
  if (sub.frequency === 'weekly') return `Every ${DAY_NAMES[sub.frequency_day ?? 1]}`;
  const d = sub.frequency_day ?? 1;
  return `${d}${d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'} of month`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-green-50 text-green-700 border-green-200',
  paused: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
};

const FILTER_TABS = ['all', 'active', 'due-today', 'delivered-today', 'paused', 'cancelled'] as const;
type FilterTab = typeof FILTER_TABS[number];

interface Props { token: string; }

export default function AdminSubscriptionsPanel({ token }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [stats, setStats] = useState<AdminSubscriptionStats | null>(null);
  const [subs, setSubs] = useState<AdminSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchAdminSubscriptions(token)
      .then(({ stats: s, subscriptions }) => { setStats(s); setSubs(subscriptions); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const filtered = (() => {
    if (filter === 'all') return subs;
    if (filter === 'due-today') return subs.filter((s) => s.status === 'active' && s.next_delivery_date === today && s.last_delivered_date !== today);
    if (filter === 'delivered-today') return subs.filter((s) => s.last_delivered_date === today);
    return subs.filter((s) => s.status === filter);
  })();

  async function handlePause(id: string) {
    setActionId(id);
    await adminPauseSubscription(token, id).catch(() => {});
    setSubs((prev) => prev.map((s) => s.id === id ? { ...s, status: 'paused' as const } : s));
    if (stats) setStats({ ...stats, active_count: stats.active_count - 1, paused_count: stats.paused_count + 1 });
    setActionId(null);
  }

  async function handleResume(id: string) {
    setActionId(id);
    await adminResumeSubscription(token, id).catch(() => {});
    setSubs((prev) => prev.map((s) => s.id === id ? { ...s, status: 'active' as const } : s));
    if (stats) setStats({ ...stats, active_count: stats.active_count + 1, paused_count: stats.paused_count - 1 });
    setActionId(null);
  }

  async function handleCancel(id: string) {
    if (!confirm('Cancel this subscription? This cannot be undone.')) return;
    setActionId(id);
    await adminCancelSubscription(token, id).catch(() => {});
    setSubs((prev) => prev.map((s) => s.id === id ? { ...s, status: 'cancelled' as const } : s));
    setActionId(null);
  }

  async function handleMarkDelivered(id: string) {
    setActionId(id);
    await adminMarkDelivered(token, id).catch(() => {});
    setSubs((prev) => prev.map((s) => s.id === id ? { ...s, last_delivered_date: today } : s));
    if (stats) setStats({
      ...stats,
      today_deliveries: Math.max(0, stats.today_deliveries - 1),
      delivered_today: stats.delivered_today + 1,
    });
    setActionId(null);
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-cream rounded-2xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-cream rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl border border-border p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <p className="text-[10px] font-semibold text-muted uppercase tracking-widest">Active</p>
            <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center">
              <Users className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-green-600 leading-none">{(stats?.active_count ?? 0).toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-white rounded-2xl border border-border p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <p className="text-[10px] font-semibold text-muted uppercase tracking-widest">Paused</p>
            <div className="w-8 h-8 rounded-xl bg-yellow-50 flex items-center justify-center">
              <PauseCircle className="w-4 h-4 text-yellow-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-yellow-600 leading-none">{(stats?.paused_count ?? 0).toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-white rounded-2xl border border-border p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <p className="text-[10px] font-semibold text-muted uppercase tracking-widest">Due Today</p>
            <div className="w-8 h-8 rounded-xl bg-primary-light flex items-center justify-center">
              <Truck className="w-4 h-4 text-primary" />
            </div>
          </div>
          <p className="text-2xl font-bold text-primary leading-none">{(stats?.today_deliveries ?? 0).toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-muted mt-0.5">pending</p>
        </div>

        <div className="bg-white rounded-2xl border border-border p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setFilter('delivered-today')}>
          <div className="flex items-start justify-between mb-3">
            <p className="text-[10px] font-semibold text-muted uppercase tracking-widest">Delivered Today</p>
            <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-green-600 leading-none">{(stats?.delivered_today ?? 0).toLocaleString('en-IN')}</p>
          {(stats?.total_due_today ?? 0) > 0 && (
            <p className="text-[11px] text-muted mt-0.5">of {stats!.total_due_today} due</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-border p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <p className="text-[10px] font-semibold text-muted uppercase tracking-widest">Est. MRR</p>
            <div className="w-8 h-8 rounded-xl bg-yellow-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-accent" />
            </div>
          </div>
          <p className="text-2xl font-bold text-accent leading-none">{fmtRupees(stats?.estimated_mrr ?? 0)}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: 'all',            label: `All (${subs.length})` },
          { key: 'active',         label: `Active (${subs.filter(s => s.status === 'active').length})` },
          { key: 'due-today',      label: `Due Today (${stats?.today_deliveries ?? 0})` },
          { key: 'delivered-today',label: `Delivered (${stats?.delivered_today ?? 0})` },
          { key: 'paused',         label: `Paused (${subs.filter(s => s.status === 'paused').length})` },
          { key: 'cancelled',      label: `Cancelled (${subs.filter(s => s.status === 'cancelled').length})` },
        ] as { key: FilterTab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
              filter === key ? 'bg-primary text-white border-primary' : 'bg-white text-muted border-border hover:text-dark'
            }`}
          >
            {label}
          </button>
        ))}
        <button onClick={load} className="ml-auto p-1.5 text-muted hover:text-primary hover:bg-cream rounded-lg transition-colors" title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <RefreshCw className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No subscriptions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-cream/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Product</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Qty</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Frequency</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Delivery Time</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Next Delivery</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((sub) => {
                  const product = sub.products;
                  const isActing = actionId === sub.id;

                  return (
                    <tr key={sub.id} className={`hover:bg-cream/40 transition-colors ${sub.last_delivered_date === today ? 'border-l-4 border-l-green-400 bg-green-50/20' : ''}`}>
                      {/* Customer */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-dark text-sm">{sub.customer.name ?? 'Unknown'}</p>
                        {sub.customer.phone && <p className="text-xs text-muted">{sub.customer.phone}</p>}
                      </td>

                      {/* Product */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-cream overflow-hidden shrink-0">
                            {product?.image_url ? (
                              <Image src={product.image_url} alt={product.name ?? ''} width={32} height={32} className="w-full h-full object-cover" />
                            ) : <div className="w-full h-full flex items-center justify-center text-sm">📦</div>}
                          </div>
                          <div>
                            <p className="font-medium text-dark text-xs leading-snug">{product?.name ?? '—'}</p>
                            {product?.price && (
                              <p className="text-[11px] text-muted">
                                ₹{Math.round(product.price * 0.95)}/unit
                                <span className="ml-1 text-green-600">{sub.discount_pct}% off</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Qty */}
                      <td className="px-3 py-3 text-center">
                        <span className="font-semibold text-dark">{sub.quantity}</span>
                      </td>

                      {/* Frequency */}
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-dark">{frequencyLabel(sub)}</span>
                      </td>

                      {/* Delivery Time */}
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${(sub as unknown as { preferred_time_start?: string }).preferred_time_start ? 'text-primary' : 'text-muted'}`}>
                          {timeLabel((sub as unknown as { preferred_time_start?: string }).preferred_time_start, (sub as unknown as { preferred_time_end?: string }).preferred_time_end)}
                        </span>
                      </td>

                      {/* Next delivery */}
                      <td className="px-4 py-3">
                        {sub.status === 'cancelled' ? (
                          <span className="text-xs text-muted">—</span>
                        ) : (
                          <span className={`text-xs font-semibold ${
                            fmtDate(sub.next_delivery_date) === 'Today' ? 'text-primary' : 'text-dark'
                          }`}>
                            {fmtDate(sub.next_delivery_date)}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLE[sub.status]}`}>
                          {sub.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Mark Delivered — only for active subs due today that aren't yet delivered */}
                          {sub.status === 'active' && sub.next_delivery_date === today && sub.last_delivered_date !== today && (
                            <button
                              onClick={() => handleMarkDelivered(sub.id)}
                              disabled={isActing}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-40 border border-green-200"
                              title="Mark as Delivered"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {/* Already delivered badge */}
                          {sub.last_delivered_date === today && (
                            <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                              ✓ Delivered
                            </span>
                          )}
                          {sub.status === 'active' && (
                            <button
                              onClick={() => handlePause(sub.id)}
                              disabled={isActing}
                              className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors disabled:opacity-40"
                              title="Pause"
                            >
                              <Pause className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {sub.status === 'paused' && (
                            <button
                              onClick={() => handleResume(sub.id)}
                              disabled={isActing}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-40"
                              title="Resume"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {sub.status !== 'cancelled' && (
                            <button
                              onClick={() => handleCancel(sub.id)}
                              disabled={isActing}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                              title="Cancel"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
