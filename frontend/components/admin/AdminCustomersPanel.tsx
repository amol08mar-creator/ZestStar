'use client';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, RefreshCw, Search, Users } from 'lucide-react';
import {
  fetchCustomer,
  fetchCustomers,
  type CustomerDetail,
  type CustomerSummary,
} from '@/lib/api/customers';

const LIMIT = 20;

const STATUS_COLORS: Record<string, string> = {
  placed: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-indigo-100 text-indigo-700',
  packed: 'bg-yellow-100 text-yellow-700',
  out_for_delivery: 'bg-orange-100 text-orange-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

function fmt(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

function initials(name: string | null, phone: string | null) {
  if (name) return name.slice(0, 2).toUpperCase();
  if (phone) return phone.slice(-2);
  return '??';
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ── Profile View ──────────────────────────────────────────────────────────────
function CustomerProfile({
  token,
  id,
  onBack,
}: {
  token: string;
  id: string;
  onBack: () => void;
}) {
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    fetchCustomer(token, id)
      .then(setDetail)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, id]);

  if (loading) return <div className="text-center py-20 text-muted text-sm">Loading customer…</div>;
  if (error) return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted hover:text-dark transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Customers
      </button>
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
    </div>
  );
  if (!detail) return null;

  const { customer, orders, subscriptions } = detail;

  return (
    <div className="space-y-6">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted hover:text-dark transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Customers
      </button>

      {/* Customer header */}
      <div className="bg-white rounded-2xl border border-border p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-primary font-bold text-xl">{initials(customer.name, customer.phone)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-dark" style={{ fontFamily: 'var(--font-serif)' }}>
              {customer.name ?? 'Unnamed Customer'}
            </h2>
            <p className="text-sm text-muted mt-0.5">{customer.phone ?? '—'}</p>
            {customer.email && <p className="text-sm text-muted">{customer.email}</p>}
            <p className="text-xs text-muted mt-1">Joined {formatDate(customer.created_at)}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-border">
          <div className="text-center">
            <p className="text-2xl font-bold text-dark">{customer.order_count}</p>
            <p className="text-xs text-muted mt-0.5">Total Orders</p>
          </div>
          <div className="text-center border-x border-border">
            <p className="text-2xl font-bold text-dark">{fmt(customer.total_spent)}</p>
            <p className="text-xs text-muted mt-0.5">Total Spent</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-dark">{customer.active_subscriptions}</p>
            <p className="text-xs text-muted mt-0.5">Active Subs</p>
          </div>
        </div>
      </div>

      {/* Orders */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-dark text-sm">Recent Orders</h3>
        </div>
        {orders.length === 0 ? (
          <p className="text-center text-muted text-sm py-10">No orders yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50 text-xs text-muted">
                  <th className="text-left px-5 py-3 font-medium">Order ID</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-5 py-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-muted">{o.id.slice(0, 8)}…</td>
                    <td className="px-4 py-3 text-muted">{formatDateTime(o.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {o.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-dark">{fmt(o.final_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Subscriptions */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-dark text-sm">Subscriptions</h3>
        </div>
        {subscriptions.length === 0 ? (
          <p className="text-center text-muted text-sm py-10">No subscriptions</p>
        ) : (
          <div className="divide-y divide-border">
            {subscriptions.map((s) => (
              <div key={s.id} className="px-5 py-4 flex items-center gap-4">
                {s.products?.image_url ? (
                  <img src={s.products.image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-border" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-dark text-sm truncate">{s.products?.name ?? '—'}</p>
                  <p className="text-xs text-muted capitalize">
                    {s.frequency} · qty {s.quantity} · {s.discount_pct}% off
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                    s.status === 'active' ? 'bg-green-100 text-green-700'
                    : s.status === 'paused' ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                  }`}>
                    {s.status}
                  </span>
                  {s.next_delivery_date && (
                    <p className="text-xs text-muted mt-1">Next: {formatDate(s.next_delivery_date)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── List View ─────────────────────────────────────────────────────────────────
export default function AdminCustomersPanel({ token }: { token: string }) {
  const [view, setView] = useState<'list' | 'profile'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (p: number, q: string) => {
      setLoading(true);
      setError('');
      try {
        const res = await fetchCustomers(token, { page: p, limit: LIMIT, search: q });
        setCustomers(res.customers);
        setTotal(res.total);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load customers');
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    load(page, search);
  }, [load, page, search]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  function openProfile(id: string) {
    setSelectedId(id);
    setView('profile');
  }

  function backToList() {
    setView('list');
    setSelectedId(null);
  }

  const totalPages = Math.ceil(total / LIMIT);

  if (view === 'profile' && selectedId) {
    return <CustomerProfile token={token} id={selectedId} onBack={backToList} />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-dark" style={{ fontFamily: 'var(--font-serif)' }}>
              Customers
            </h1>
            <p className="text-xs text-muted">{total} customer{total !== 1 ? 's' : ''} total</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(page, search)}
            disabled={loading}
            className="p-2 border border-border rounded-xl text-muted hover:text-dark hover:bg-white transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search by name, phone, or email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors"
        >
          Search
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {loading && customers.length === 0 ? (
          <div className="text-center py-20 text-muted text-sm">Loading customers…</div>
        ) : customers.length === 0 ? (
          <div className="text-center py-20 text-muted text-sm">No customers found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50 text-xs text-muted">
                  <th className="text-left px-5 py-3 font-medium">Customer</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Joined</th>
                  <th className="text-right px-4 py-3 font-medium">Orders</th>
                  <th className="text-right px-4 py-3 font-medium">Spent</th>
                  <th className="text-right px-4 py-3 font-medium">Subs</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-primary font-semibold text-xs">{initials(c.name, c.phone)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-dark">{c.name ?? 'Unnamed'}</p>
                          <p className="text-xs text-muted">{c.phone ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">{c.email ?? '—'}</td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-dark">{c.order_count}</td>
                    <td className="px-4 py-3 text-right font-semibold text-dark">{fmt(c.total_spent)}</td>
                    <td className="px-4 py-3 text-right">
                      {c.active_subscriptions > 0 ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          {c.active_subscriptions} active
                        </span>
                      ) : (
                        <span className="text-muted text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => openProfile(c.id)}
                        className="text-xs font-semibold text-primary hover:underline whitespace-nowrap"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted text-xs">
            Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              className="p-1.5 border border-border rounded-lg text-muted hover:text-dark hover:bg-white disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-xs text-muted">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages}
              className="p-1.5 border border-border rounded-lg text-muted hover:text-dark hover:bg-white disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
