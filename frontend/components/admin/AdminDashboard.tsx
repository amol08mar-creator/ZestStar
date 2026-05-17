'use client';
import { useEffect, useState } from 'react';
import { AlertTriangle, ChevronRight, Clock, Download, IndianRupee, RefreshCw, ShoppingBag, TrendingUp } from 'lucide-react';
import { fetchAnalytics, fetchDashboard, type AnalyticsData, type DashboardStats } from '@/lib/api/admin';

interface Props {
  token: string;
  onGoToOrders: () => void;
  onGoToInventory: () => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN').format(n);
}

function fmtRupees(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${fmt(n)}`;
}

function fmtDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (iso === today.toISOString().split('T')[0]) return 'Today';
  if (iso === yesterday.toISOString().split('T')[0]) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function fmtShortDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function defaultRange(days: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  return { start: isoDate(start), end: isoDate(end) };
}

function exportCsv(data: AnalyticsData) {
  const rows = [
    ['Date', 'Orders', 'Revenue (₹)'],
    ...data.revenue_by_date.map((d) => [d.date, String(d.orders), String(d.revenue)]),
  ];
  const csv = rows.map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zeststar-analytics-${data.period.start}-to-${data.period.end}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminDashboard({ token, onGoToOrders, onGoToInventory }: Props) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Analytics state
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [aLoading, setALoading] = useState(true);
  const [aError, setAError] = useState('');
  const [preset, setPreset] = useState<7 | 30 | 90>(30);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setStats(await fetchDashboard(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function loadAnalytics(start: string, end: string) {
    setALoading(true);
    setAError('');
    try {
      setAnalytics(await fetchAnalytics(token, start, end));
    } catch (err) {
      setAError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setALoading(false);
    }
  }

  function applyPreset(days: 7 | 30 | 90) {
    setPreset(days);
    setIsCustom(false);
    const { start, end } = defaultRange(days);
    loadAnalytics(start, end);
  }

  function applyCustom() {
    if (!customStart || !customEnd || customStart > customEnd) return;
    setIsCustom(true);
    loadAnalytics(customStart, customEnd);
  }

  useEffect(() => {
    load();
    const { start, end } = defaultRange(30);
    loadAnalytics(start, end);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const maxRevenue = Math.max(...(stats?.weekly_gmv.map((d) => d.revenue) ?? [1]));
  const maxARevenue = Math.max(...(analytics?.revenue_by_date.map((d) => d.revenue) ?? [1]), 1);
  const maxCatRevenue = Math.max(...(analytics?.revenue_by_category.map((c) => c.revenue) ?? [1]), 1);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-dark" style={{ fontFamily: 'var(--font-serif)' }}>
            Dashboard
          </h1>
          <p className="text-xs text-muted mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 border border-border rounded-xl text-muted hover:text-dark hover:bg-white transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {/* ── Today KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wide">Today's Orders</span>
            <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-primary" />
            </div>
          </div>
          {loading ? <div className="h-8 bg-gray-100 rounded animate-pulse w-16" /> : (
            <p className="text-3xl font-bold text-dark">{fmt(stats?.today_orders ?? 0)}</p>
          )}
          <p className="text-xs text-muted">orders placed today</p>
        </div>

        <div className="bg-white border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wide">Today's Revenue</span>
            <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-primary" />
            </div>
          </div>
          {loading ? <div className="h-8 bg-gray-100 rounded animate-pulse w-24" /> : (
            <p className="text-3xl font-bold text-dark">{fmtRupees(stats?.today_revenue ?? 0)}</p>
          )}
          <p className="text-xs text-muted">excluding cancelled</p>
        </div>

        <button
          onClick={onGoToOrders}
          className="bg-white border border-border rounded-2xl p-4 space-y-3 text-left hover:border-orange-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wide">Needs Action</span>
            <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center">
              <Clock className="w-4 h-4 text-orange-500" />
            </div>
          </div>
          {loading ? <div className="h-8 bg-gray-100 rounded animate-pulse w-12" /> : (
            <p className={`text-3xl font-bold ${(stats?.pending_orders ?? 0) > 0 ? 'text-orange-600' : 'text-dark'}`}>
              {fmt(stats?.pending_orders ?? 0)}
            </p>
          )}
          <p className="text-xs text-muted group-hover:text-orange-600 transition-colors">placed / confirmed orders →</p>
        </button>

        <button
          onClick={onGoToInventory}
          className="bg-white border border-border rounded-2xl p-4 space-y-3 text-left hover:border-red-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wide">Out of Stock</span>
            <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
          </div>
          {loading ? <div className="h-8 bg-gray-100 rounded animate-pulse w-12" /> : (
            <p className={`text-3xl font-bold ${(stats?.out_of_stock_count ?? 0) > 0 ? 'text-red-600' : 'text-dark'}`}>
              {fmt(stats?.out_of_stock_count ?? 0)}
            </p>
          )}
          <p className="text-xs text-muted group-hover:text-red-600 transition-colors">active products →</p>
        </button>
      </div>

      {/* ── Order Pipeline ── */}
      {(stats?.status_breakdown || loading) && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-dark">Order Pipeline</h3>
            <button onClick={onGoToOrders} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
              All Orders <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { key: 'placed',           label: 'Placed',           border: 'border-t-blue-400',   bg: 'bg-blue-50',       text: 'text-blue-700'   },
              { key: 'confirmed',        label: 'Confirmed',         border: 'border-t-primary',    bg: 'bg-primary-light', text: 'text-primary'    },
              { key: 'packed',           label: 'Packed',            border: 'border-t-yellow-400', bg: 'bg-yellow-50',     text: 'text-yellow-700' },
              { key: 'out_for_delivery', label: 'Out for Delivery',  border: 'border-t-orange-400', bg: 'bg-orange-50',     text: 'text-orange-700' },
              { key: 'delivered',        label: 'Delivered',         border: 'border-t-green-400',  bg: 'bg-green-50',      text: 'text-green-700'  },
              { key: 'cancelled',        label: 'Cancelled',         border: 'border-t-red-300',    bg: 'bg-red-50',        text: 'text-red-600'    },
            ].map(({ key, label, border, bg, text }) => (
              <button
                key={key}
                onClick={onGoToOrders}
                className={`${bg} rounded-2xl border border-border border-t-4 ${border} p-4 text-left hover:shadow-md active:scale-[0.98] transition-all`}
              >
                {loading ? (
                  <div className="h-7 bg-white/60 rounded animate-pulse w-10 mb-2" />
                ) : (
                  <p className={`text-2xl font-bold ${text} leading-none mb-1`}>
                    {fmt(stats?.status_breakdown[key as keyof typeof stats.status_breakdown] ?? 0)}
                  </p>
                )}
                <p className="text-xs font-semibold text-muted leading-snug">{label}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Weekly GMV ── */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-dark">Weekly GMV — Last 7 Days</h2>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-9 bg-gray-50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {(stats?.weekly_gmv ?? []).map((day, idx) => {
              const barPct = maxRevenue > 0 ? Math.round((day.revenue / maxRevenue) * 100) : 0;
              const isToday = idx === (stats?.weekly_gmv.length ?? 0) - 1;
              return (
                <div key={day.date} className={`flex items-center gap-4 px-5 py-3 ${isToday ? 'bg-primary/5' : ''}`}>
                  <div className="w-24 shrink-0">
                    <span className={`text-sm font-semibold ${isToday ? 'text-primary' : 'text-dark'}`}>{fmtDate(day.date)}</span>
                  </div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${isToday ? 'bg-primary' : 'bg-primary/40'}`} style={{ width: `${barPct}%` }} />
                  </div>
                  <div className="w-16 text-right shrink-0">
                    <span className="text-xs text-muted">{day.orders} order{day.orders !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="w-20 text-right shrink-0">
                    <span className={`text-sm font-bold ${isToday ? 'text-primary' : 'text-dark'}`}>
                      {day.revenue > 0 ? fmtRupees(day.revenue) : '—'}
                    </span>
                  </div>
                </div>
              );
            })}
            {stats && (
              <div className="flex items-center gap-4 px-5 py-3 bg-cream">
                <div className="w-24 shrink-0">
                  <span className="text-xs font-bold text-muted uppercase tracking-wide">7-day Total</span>
                </div>
                <div className="flex-1" />
                <div className="w-16 text-right shrink-0">
                  <span className="text-xs font-semibold text-dark">{fmt(stats.weekly_gmv.reduce((s, d) => s + d.orders, 0))} orders</span>
                </div>
                <div className="w-20 text-right shrink-0">
                  <span className="text-sm font-bold text-dark">{fmtRupees(stats.weekly_gmv.reduce((s, d) => s + d.revenue, 0))}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* ── ANALYTICS SECTION ── */}
      {/* ════════════════════════════════════════════════════════ */}

      {/* Date range selector */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
        <h2 className="text-base font-bold text-dark shrink-0" style={{ fontFamily: 'var(--font-serif)' }}>
          Analytics
        </h2>
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {([7, 30, 90] as const).map((d) => (
            <button
              key={d}
              onClick={() => applyPreset(d)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                !isCustom && preset === d ? 'bg-primary text-white' : 'bg-white border border-border text-muted hover:text-dark'
              }`}
            >
              {d}d
            </button>
          ))}
          <div className="flex items-center gap-1 ml-1">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2 py-1 border border-border rounded-lg text-xs focus:outline-none focus:border-primary bg-white"
            />
            <span className="text-xs text-muted">→</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2 py-1 border border-border rounded-lg text-xs focus:outline-none focus:border-primary bg-white"
            />
            <button
              onClick={applyCustom}
              disabled={!customStart || !customEnd}
              className="px-3 py-1 bg-primary text-white rounded-lg text-xs font-semibold disabled:opacity-50 hover:bg-primary-dark transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
        {analytics && (
          <button
            onClick={() => exportCsv(analytics)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-semibold text-muted hover:text-dark hover:bg-white transition-colors shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        )}
      </div>

      {aError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{aError}</div>
      )}

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Revenue', value: aLoading ? null : fmtRupees(analytics?.summary.total_revenue ?? 0), sub: 'excl. cancelled' },
          { label: 'Total Orders',  value: aLoading ? null : fmt(analytics?.summary.total_orders ?? 0),       sub: `${analytics?.summary.cancelled_count ?? 0} cancelled` },
          { label: 'Avg Order Value', value: aLoading ? null : fmtRupees(analytics?.summary.avg_order_value ?? 0), sub: 'per successful order' },
          { label: 'Cancellation Rate', value: aLoading ? null : `${analytics?.summary.cancellation_rate ?? 0}%`, sub: `${analytics?.summary.cancelled_count ?? 0} orders` },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-white border border-border rounded-2xl p-4">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">{label}</p>
            {value === null ? (
              <div className="h-7 bg-gray-100 rounded animate-pulse w-20 mb-1" />
            ) : (
              <p className="text-2xl font-bold text-dark">{value}</p>
            )}
            <p className="text-xs text-muted mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue over time */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-dark">Revenue Over Time</h3>
          </div>
          {analytics && (
            <span className="text-xs text-muted">
              {fmtShortDate(analytics.period.start)} – {fmtShortDate(analytics.period.end)}
            </span>
          )}
        </div>
        {aLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-7 bg-gray-50 rounded-xl animate-pulse" />)}
          </div>
        ) : analytics?.revenue_by_date.length === 0 ? (
          <p className="text-center text-muted text-sm py-10">No orders in this period</p>
        ) : (
          <div className="divide-y divide-border max-h-96 overflow-y-auto">
            {(analytics?.revenue_by_date ?? []).map((day, idx, arr) => {
              const barPct = maxARevenue > 0 ? Math.round((day.revenue / maxARevenue) * 100) : 0;
              const isLast = idx === arr.length - 1;
              const showLabel = arr.length <= 14 || idx % Math.ceil(arr.length / 14) === 0 || isLast;
              return (
                <div key={day.date} className={`flex items-center gap-4 px-5 py-2 ${isLast ? 'bg-primary/5' : ''}`}>
                  <div className="w-20 shrink-0">
                    <span className={`text-xs font-semibold ${isLast ? 'text-primary' : 'text-dark'} ${!showLabel ? 'invisible' : ''}`}>
                      {fmtShortDate(day.date)}
                    </span>
                  </div>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${isLast ? 'bg-primary' : 'bg-primary/50'}`} style={{ width: `${barPct}%` }} />
                  </div>
                  <div className="w-14 text-right shrink-0">
                    <span className="text-xs text-muted">{day.orders}×</span>
                  </div>
                  <div className="w-18 text-right shrink-0">
                    <span className={`text-xs font-bold ${isLast ? 'text-primary' : 'text-dark'}`}>
                      {day.revenue > 0 ? fmtRupees(day.revenue) : '—'}
                    </span>
                  </div>
                </div>
              );
            })}
            {analytics && (
              <div className="flex items-center gap-4 px-5 py-3 bg-cream">
                <div className="w-20 shrink-0">
                  <span className="text-xs font-bold text-muted uppercase tracking-wide">Total</span>
                </div>
                <div className="flex-1" />
                <div className="w-14 text-right shrink-0">
                  <span className="text-xs font-semibold text-dark">
                    {fmt(analytics.revenue_by_date.reduce((s, d) => s + d.orders, 0))}×
                  </span>
                </div>
                <div className="w-18 text-right shrink-0">
                  <span className="text-sm font-bold text-dark">
                    {fmtRupees(analytics.revenue_by_date.reduce((s, d) => s + d.revenue, 0))}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Revenue by category + top products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue by category */}
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-bold text-dark">Revenue by Category</h3>
          </div>
          {aLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 bg-gray-50 rounded-xl animate-pulse" />)}
            </div>
          ) : !analytics || analytics.revenue_by_category.length === 0 ? (
            <p className="text-center text-muted text-sm py-10">No data</p>
          ) : (
            <div className="divide-y divide-border">
              {analytics.revenue_by_category.map((cat) => {
                const pct = Math.round((cat.revenue / maxCatRevenue) * 100);
                return (
                  <div key={cat.category} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-28 shrink-0 truncate">
                      <span className="text-xs font-medium text-dark">{cat.category}</span>
                    </div>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="w-24 text-right shrink-0">
                      <span className="text-xs font-bold text-dark">{fmtRupees(cat.revenue)}</span>
                      <span className="text-xs text-muted ml-1">({cat.orders})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top 10 products */}
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-bold text-dark">Top Products</h3>
          </div>
          {aLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 bg-gray-50 rounded-xl animate-pulse" />)}
            </div>
          ) : !analytics || analytics.top_products.length === 0 ? (
            <p className="text-center text-muted text-sm py-10">No data</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-gray-50/50 text-muted">
                    <th className="text-left px-5 py-2.5 font-medium w-8">#</th>
                    <th className="text-left px-2 py-2.5 font-medium">Product</th>
                    <th className="text-right px-2 py-2.5 font-medium">Qty</th>
                    <th className="text-right px-5 py-2.5 font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {analytics.top_products.map((p, i) => (
                    <tr key={p.product_id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-2.5 text-muted font-semibold">{i + 1}</td>
                      <td className="px-2 py-2.5 font-medium text-dark max-w-[140px] truncate">{p.name}</td>
                      <td className="px-2 py-2.5 text-right text-muted">{fmt(p.quantity_sold)}</td>
                      <td className="px-5 py-2.5 text-right font-bold text-dark">{fmtRupees(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Customer split + Subscription health */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* New vs returning */}
        <div className="bg-white border border-border rounded-2xl p-5">
          <h3 className="text-sm font-bold text-dark mb-4">Customers in Period</h3>
          {aLoading ? (
            <div className="space-y-2">
              <div className="h-8 bg-gray-100 rounded animate-pulse" />
              <div className="h-8 bg-gray-100 rounded animate-pulse" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center bg-primary/5 rounded-xl p-4">
                <p className="text-3xl font-bold text-primary">{analytics?.summary.new_customers ?? 0}</p>
                <p className="text-xs text-muted mt-1">New Customers</p>
              </div>
              <div className="text-center bg-gray-50 rounded-xl p-4">
                <p className="text-3xl font-bold text-dark">{analytics?.summary.returning_customers ?? 0}</p>
                <p className="text-xs text-muted mt-1">Returning</p>
              </div>
            </div>
          )}
        </div>

        {/* Subscription health */}
        <div className="bg-white border border-border rounded-2xl p-5">
          <h3 className="text-sm font-bold text-dark mb-4">Subscription Health (All-time)</h3>
          {aLoading ? (
            <div className="space-y-2">
              <div className="h-8 bg-gray-100 rounded animate-pulse" />
              <div className="h-8 bg-gray-100 rounded animate-pulse" />
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: 'Active',    value: analytics?.subscription_health.active    ?? 0, color: 'text-green-600' },
                { label: 'Paused',    value: analytics?.subscription_health.paused    ?? 0, color: 'text-yellow-600' },
                { label: 'Cancelled', value: analytics?.subscription_health.cancelled ?? 0, color: 'text-red-600' },
                { label: 'Churn',     value: `${analytics?.subscription_health.churn_rate ?? 0}%`, color: analytics?.subscription_health.churn_rate ?? 0 > 20 ? 'text-red-600' : 'text-dark' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-muted mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
