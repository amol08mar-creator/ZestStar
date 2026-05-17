'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ChevronLeft, ChevronRight, Phone, RefreshCw, Search, ShoppingBag, User } from 'lucide-react';
import {
  assignDriver,
  fetchAdminOrders,
  fetchPendingEditAlerts,
  updateOrderPaymentStatus,
  updateOrderRefundStatus,
  updateOrderStatus,
  type AdminOrdersFilters,
  type Order,
  type OrderEditAlert,
} from '@/lib/api/orders';

const ACK_KEY = 'zs_admin_ack_edits';
function getAckedIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(ACK_KEY) ?? '[]')); }
  catch { return new Set(); }
}
function saveAckedId(id: string) {
  const ids = [...getAckedIds(), id].slice(-200);
  localStorage.setItem(ACK_KEY, JSON.stringify(ids));
}
import { fetchDrivers, VEHICLE_LABELS, type Driver } from '@/lib/api/drivers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const ALL_STATUSES = [
  { value: '', label: 'All Orders' },
  { value: 'placed', label: 'Placed' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'packed', label: 'Packed' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const ALL_PAYMENT_STATUSES = [
  { value: '', label: 'All Payments' },
  { value: 'pending', label: 'Pending (COD)' },
  { value: 'collected', label: 'Collected' },
  { value: 'failed', label: 'Failed' },
];

const STATUS_COLORS: Record<string, string> = {
  placed: 'bg-blue-50 text-blue-700 border-blue-200',
  confirmed: 'bg-green-50 text-green-700 border-green-200',
  packed: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  out_for_delivery: 'bg-orange-50 text-orange-700 border-orange-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_LABELS: Record<string, string> = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  packed: 'Packed',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const PAYMENT_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  collected: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
};

const PAYMENT_LABELS: Record<string, string> = {
  pending: 'Pending',
  collected: 'Collected',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const PAGE_LIMIT = 20;

interface Props {
  token: string;
  onEditAlertCountChange?: (count: number) => void;
}

function formatPhone(phone: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  const last10 = digits.slice(-10);
  return last10.length === 10
    ? `+91 ${last10.slice(0, 5)} ${last10.slice(5)}`
    : phone;
}

export default function AdminOrdersTable({ token, onEditAlertCountChange }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeDrivers, setActiveDrivers] = useState<Driver[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);
  const [updatingRefundId, setUpdatingRefundId] = useState<string | null>(null);
  // Per-row refund editing state: { [orderId]: { status, notes } }
  const [refundEdits, setRefundEdits] = useState<Record<string, { status: string; notes: string; amount: number | null }>>({});
  // Persistent edit alerts (DB-backed, survive page refresh)
  const [editAlerts, setEditAlerts] = useState<OrderEditAlert[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [refundFilter, setRefundFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadOrders = useCallback(
    async (p = page) => {
      setLoading(true);
      setError('');
      const filters: AdminOrdersFilters = {
        page: p,
        limit: PAGE_LIMIT,
        status: statusFilter || undefined,
        payment_status: paymentFilter || undefined,
        refund_status: refundFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        search: search || undefined,
      };
      try {
        const res = await fetchAdminOrders(token, filters);
        setOrders(res.orders);
        setTotal(res.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    },
    [token, page, statusFilter, paymentFilter, refundFilter, dateFrom, dateTo, search],
  );

  useEffect(() => {
    loadOrders(page);
  }, [page, statusFilter, paymentFilter, refundFilter, dateFrom, dateTo, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAlerts = useCallback(async () => {
    try {
      const all = await fetchPendingEditAlerts(token);
      const acked = getAckedIds();
      const pending = all.filter((a) => !acked.has(a.id));
      const hadNew = pending.length > 0;
      setEditAlerts(pending);
      onEditAlertCountChange?.(pending.length);
      // Refresh order list so admin sees updated items, not stale cached data
      if (hadNew) loadOrders(page);
    } catch { /* non-fatal */ }
  }, [token, onEditAlertCountChange, loadOrders, page]);

  // Load alerts on mount and poll every 30s
  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 30_000);
    return () => clearInterval(interval);
  }, [loadAlerts]);

  useEffect(() => {
    fetchDrivers(token)
      .then((all) => setActiveDrivers(all.filter((d) => d.is_active)))
      .catch(() => {});
  }, [token]);

  function handleSearchInput(val: string) {
    setSearchInput(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 400);
  }

  useEffect(() => {
    const channel = supabase
      .channel('admin-orders-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' },
        () => { loadOrders(1); setPage(1); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadOrders]);

  // Listen for edit events — no filter (client-side filter avoids RLS issues)
  useEffect(() => {
    const channel = supabase
      .channel('admin-order-edits')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_events' },
        (payload) => {
          if ((payload.new as { event_type: string }).event_type !== 'edited') return;
          loadAlerts();      // refresh alerts list
          loadOrders(page);  // refresh order rows so items are up to date
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadAlerts, loadOrders, page]);

  async function handleAssignDriver(orderId: string, driverId: string | null) {
    setAssigningId(orderId);
    setError('');
    try {
      await assignDriver(token, orderId, driverId);
      const driverName = driverId ? (activeDrivers.find((d) => d.id === driverId)?.name ?? null) : null;
      setOrders((prev) =>
        prev.map((o) => o.id === orderId ? { ...o, driver_id: driverId, driver_name: driverName } : o),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign driver');
    } finally {
      setAssigningId(null);
    }
  }

  async function handleStatusChange(orderId: string, status: string) {
    setUpdatingId(orderId);
    try {
      const updated = await updateOrderStatus(token, orderId, status);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: updated.status } : o)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status update failed');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handlePaymentStatusChange(orderId: string, paymentStatus: string) {
    setUpdatingPaymentId(orderId);
    try {
      const updated = await updateOrderPaymentStatus(token, orderId, paymentStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, payment_status: updated.payment_status } : o)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment status update failed');
    } finally {
      setUpdatingPaymentId(null);
    }
  }

  async function handleRefundUpdate(orderId: string) {
    const edit = refundEdits[orderId];
    if (!edit) return;
    setUpdatingRefundId(orderId);
    try {
      await updateOrderRefundStatus(
        token, orderId, edit.status,
        edit.notes || undefined,
        edit.amount != null ? edit.amount : undefined,
      );
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                refund_status: edit.status as Order['refund_status'],
                refund_notes: edit.notes || o.refund_notes,
                refund_amount: edit.amount ?? o.refund_amount,
                refunded_at: edit.status === 'completed' ? new Date().toISOString() : o.refunded_at,
              }
            : o,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refund update failed');
    } finally {
      setUpdatingRefundId(null);
    }
  }

  function handleAcknowledge(eventId: string, orderId: string) {
    saveAckedId(eventId);
    const updated = editAlerts.filter((a) => a.id !== eventId);
    setEditAlerts(updated);
    onEditAlertCountChange?.(updated.length);
    setExpandedId(orderId);
  }

  function initRefundEdit(order: Order) {
    if (!refundEdits[order.id]) {
      setRefundEdits((prev) => ({
        ...prev,
        [order.id]: { status: order.refund_status ?? 'pending', notes: order.refund_notes ?? '', amount: order.refund_amount ?? null },
      }));
    }
  }

  const hasActiveFilters = statusFilter || paymentFilter || refundFilter || dateFrom || dateTo || search;
  const totalPages = Math.ceil(total / PAGE_LIMIT);

  return (
    <div className="space-y-4">
      {/* Header */}
      {/* Modified Orders — persistent panel, survives page refresh */}
      {editAlerts.length > 0 && (
        <div className="border border-orange-200 rounded-2xl overflow-hidden">
          <div className="bg-orange-50 px-4 py-3 flex items-center justify-between border-b border-orange-200">
            <div className="flex items-center gap-2">
              <span className="text-orange-600 font-bold text-base">⚠️</span>
              <p className="text-sm font-bold text-orange-800">Modified Orders — review before packing</p>
            </div>
            <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {editAlerts.length} pending
            </span>
          </div>
          <div className="divide-y divide-orange-100">
            {editAlerts.map((alert) => {
              const shortId = alert.order_id.slice(0, 8).toUpperCase();
              const timeAgo = (() => {
                const diff = Date.now() - new Date(alert.event_time).getTime();
                const m = Math.floor(diff / 60000);
                if (m < 1) return 'just now';
                if (m < 60) return `${m}m ago`;
                const h = Math.floor(m / 60);
                if (h < 24) return `${h}h ago`;
                return `${Math.floor(h / 24)}d ago`;
              })();
              return (
                <div key={alert.id} className="bg-orange-50/40 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div>
                      <p className="text-sm font-semibold text-dark">Order #{shortId}</p>
                      <p className="text-xs text-muted">
                        {alert.customer?.name ?? 'Customer'} · ₹{alert.final_total} · {timeAgo}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setExpandedId(alert.order_id)}
                      className="text-xs font-semibold text-orange-700 border border-orange-300 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors"
                    >
                      View Items
                    </button>
                    <button
                      onClick={() => handleAcknowledge(alert.id, alert.order_id)}
                      className="text-xs font-semibold text-white bg-primary px-3 py-1.5 rounded-lg hover:bg-primary-dark transition-colors"
                    >
                      Done ✓
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-dark" style={{ fontFamily: 'var(--font-serif)' }}>
              Orders
            </h1>
            <p className="text-xs text-muted">{total} order{total !== 1 ? 's' : ''} total</p>
          </div>
        </div>
        <button
          onClick={() => loadOrders(page)}
          disabled={loading}
          className="p-2 border border-border rounded-xl text-muted hover:text-dark hover:bg-white transition-colors disabled:opacity-50 self-end sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[220px] space-y-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Phone, order ID, or address…"
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
            />
          </div>
          <p className="text-[11px] text-muted px-1">
            Try: <span className="font-mono">9876543210</span> · <span className="font-mono">A3F7B2C1</span> · <span className="italic">Andheri West</span>
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary bg-white self-start"
        >
          {ALL_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <select
          value={paymentFilter}
          onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary bg-white self-start"
        >
          {ALL_PAYMENT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <button
          onClick={() => {
            setRefundFilter(refundFilter === 'pending' ? '' : 'pending');
            setPage(1);
          }}
          className={`px-3 py-2 text-sm rounded-xl border transition-colors self-start whitespace-nowrap ${
            refundFilter === 'pending'
              ? 'bg-yellow-100 text-yellow-800 border-yellow-300 font-semibold'
              : 'bg-white text-muted border-border hover:text-dark'
          }`}
        >
          Pending Refunds
        </button>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary bg-white self-start"
          title="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary bg-white self-start"
          title="To date"
        />
        {hasActiveFilters && (
          <button
            onClick={() => {
              setStatusFilter(''); setPaymentFilter(''); setRefundFilter('');
              setDateFrom(''); setDateTo(''); setSearch(''); setSearchInput(''); setPage(1);
            }}
            className="px-3 py-2 text-sm text-muted hover:text-dark border border-border rounded-xl bg-white transition-colors self-start"
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        {loading && orders.length === 0 ? (
          <div className="text-center py-20 text-muted text-sm">Loading orders…</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 text-muted text-sm">No orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-cream text-xs font-semibold text-muted uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Order / Customer</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Address</th>
                  <th className="text-center px-4 py-3 hidden sm:table-cell">Items</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-left px-4 py-3">Payment</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => {
                  const shortId = order.id.slice(0, 8).toUpperCase();
                  const placed = new Date(order.created_at);
                  const isExpanded = expandedId === order.id;
                  const isUpdating = updatingId === order.id;
                  const isUpdatingPayment = updatingPaymentId === order.id;
                  const statusColor = STATUS_COLORS[order.status] ?? 'bg-gray-50 text-gray-700 border-gray-200';
                  const paymentColor = PAYMENT_COLORS[order.payment_status] ?? 'bg-gray-50 text-gray-700 border-gray-200';
                  const customer = order.customer;
                  const displayName = customer?.name ?? null;
                  const displayPhone = customer?.phone ? formatPhone(customer.phone) : null;
                  const isPaymentTerminal = order.payment_status === 'collected' || order.payment_status === 'failed' || order.payment_status === 'cancelled';

                  return (
                    <>
                      <tr
                        key={order.id}
                        className={`hover:bg-cream/60 transition-colors cursor-pointer ${isExpanded ? 'bg-cream/60' : ''}`}
                        onClick={() => {
                          setExpandedId(isExpanded ? null : order.id);
                          if (!isExpanded) initRefundEdit(order);
                        }}
                      >
                        {/* Order + customer */}
                        <td className="px-4 py-3">
                          <p className="font-semibold text-dark">#{shortId}</p>
                          {displayName && (
                            <p className="flex items-center gap-1 text-xs text-muted mt-0.5">
                              <User className="w-3 h-3 shrink-0" />{displayName}
                            </p>
                          )}
                          {displayPhone && (
                            <p className="flex items-center gap-1 text-xs text-muted mt-0.5">
                              <Phone className="w-3 h-3 shrink-0" />{displayPhone}
                            </p>
                          )}
                          {!displayName && !displayPhone && (
                            <p className="text-xs text-muted/50 mt-0.5">No profile</p>
                          )}
                        </td>

                        <td className="px-4 py-3 text-muted whitespace-nowrap">
                          {placed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          <span className="block text-xs">
                            {placed.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-muted hidden md:table-cell max-w-[180px] truncate">
                          {order.delivery_address}
                        </td>

                        <td className="px-4 py-3 text-center text-muted hidden sm:table-cell">
                          {order.order_items?.length ?? 0}
                        </td>

                        <td className="px-4 py-3 text-right font-bold text-dark whitespace-nowrap">
                          ₹{order.final_total}
                        </td>

                        {/* Payment status */}
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          {isPaymentTerminal ? (
                            <div className="space-y-1">
                              <span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full border ${paymentColor}`}>
                                {PAYMENT_LABELS[order.payment_status] ?? order.payment_status}
                              </span>
                              {order.refund_status && order.refund_status !== 'not_applicable' && (
                                <div>
                                  <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                    order.refund_status === 'completed'
                                      ? 'bg-green-100 text-green-700'
                                      : order.refund_status === 'processing'
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    Refund: {order.refund_status === 'completed' ? 'Done' :
                                             order.refund_status === 'processing' ? 'In Progress' : 'Pending'}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full border ${paymentColor}`}>
                                {PAYMENT_LABELS[order.payment_status] ?? order.payment_status}
                              </span>
                              <select
                                value={order.payment_status}
                                disabled={isUpdatingPayment}
                                onChange={(e) => handlePaymentStatusChange(order.id, e.target.value)}
                                className="px-2 py-1 border border-border rounded-lg text-xs focus:outline-none focus:border-primary bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="pending">Pending</option>
                                <option value="collected">Collected ✓</option>
                                <option value="failed">Failed ✗</option>
                              </select>
                              {isUpdatingPayment && (
                                <RefreshCw className="w-3 h-3 animate-spin text-muted shrink-0" />
                              )}
                            </div>
                          )}
                        </td>

                        {/* Order status badge */}
                        <td className="px-4 py-3">
                          <span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full border ${statusColor}`}>
                            {STATUS_LABELS[order.status] ?? order.status}
                          </span>
                        </td>

                        {/* Order status update */}
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={order.status}
                            disabled={isUpdating || order.status === 'delivered' || order.status === 'cancelled'}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            className="px-2 py-1.5 border border-border rounded-lg text-xs focus:outline-none focus:border-primary bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {ALL_STATUSES.filter((s) => s.value).map((s) => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                          {isUpdating && (
                            <RefreshCw className="inline ml-2 w-3 h-3 animate-spin text-muted" />
                          )}
                        </td>
                      </tr>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <tr key={`${order.id}-detail`} className="bg-cream/40">
                          <td colSpan={8} className="px-4 py-4">
                            <div className="space-y-3">
                              {/* Customer + address + payment summary */}
                              <div className="flex flex-wrap gap-6 text-sm pb-3 border-b border-border">
                                <div>
                                  <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Customer</p>
                                  <p className="font-medium text-dark">{displayName ?? '—'}</p>
                                  {displayPhone && (
                                    <a
                                      href={`tel:${customer?.phone}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-primary text-xs hover:underline flex items-center gap-1 mt-0.5"
                                    >
                                      <Phone className="w-3 h-3" /> {displayPhone}
                                    </a>
                                  )}
                                  {customer?.email && (
                                    <p className="text-xs text-muted mt-0.5">{customer.email}</p>
                                  )}
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Deliver To</p>
                                  <p className="text-dark">{order.delivery_address}</p>
                                  {order.delivery_landmark && (
                                    <p className="text-xs text-muted">{order.delivery_landmark}</p>
                                  )}
                                  {order.delivery_instructions && (
                                    <p className="text-xs mt-1 bg-yellow-50 border border-yellow-200 rounded-lg px-2 py-1 text-dark">
                                      📋 {order.delivery_instructions}
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Payment</p>
                                  <p className="text-dark font-medium">
                                    {order.payment_method?.toUpperCase() ?? 'COD'}
                                  </p>
                                  <span className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${PAYMENT_COLORS[order.payment_status] ?? ''}`}>
                                    {PAYMENT_LABELS[order.payment_status] ?? order.payment_status}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Driver</p>
                                  {order.driver_name ? (
                                    <p className="font-medium text-dark text-sm">{order.driver_name}</p>
                                  ) : (
                                    <p className="text-xs text-muted italic">Unassigned</p>
                                  )}
                                  {order.status !== 'delivered' && order.status !== 'cancelled' && (
                                    <select
                                      value={order.driver_id ?? ''}
                                      disabled={assigningId === order.id}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        handleAssignDriver(order.id, e.target.value || null);
                                      }}
                                      className="mt-1 px-2 py-1 border border-border rounded-lg text-xs focus:outline-none focus:border-primary bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <option value="">— Unassign —</option>
                                      {activeDrivers.map((d) => (
                                        <option key={d.id} value={d.id}>
                                          {d.name} ({VEHICLE_LABELS[d.vehicle_type] ?? d.vehicle_type})
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              </div>

                              {/* Items */}
                              <div className="space-y-1">
                                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Items</p>
                                {order.order_items?.map((item) => (
                                  <div key={item.id} className="flex items-center justify-between text-sm py-1">
                                    <div className="flex items-center gap-2">
                                      {item.product_image && (
                                        <img src={item.product_image} alt={item.product_name}
                                          className="w-8 h-8 rounded-lg object-cover border border-border" />
                                      )}
                                      <span className="text-dark font-medium">{item.product_name}</span>
                                      {item.product_weight && (
                                        <span className="text-muted text-xs">{item.product_weight}</span>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <span className="text-muted">×{item.quantity}</span>
                                      <span className="ml-3 font-semibold text-dark">₹{item.total_price}</span>
                                    </div>
                                  </div>
                                ))}
                                <div className="flex justify-between pt-2 border-t border-border text-sm mt-1">
                                  <span className="text-muted">
                                    Items ₹{order.items_total} · Delivery ₹{order.delivery_fee}
                                  </span>
                                  <span className="font-bold text-dark">Total ₹{order.final_total}</span>
                                </div>
                              </div>

                              {/* Refund management — only for cancelled orders with a refund */}
                              {order.status === 'cancelled' &&
                                order.refund_status &&
                                order.refund_status !== 'not_applicable' && (() => {
                                  const edit = refundEdits[order.id] ?? { status: order.refund_status, notes: order.refund_notes ?? '' };
                                  const isSaving = updatingRefundId === order.id;
                                  return (
                                    <div
                                      className="border-t border-border pt-3 space-y-2"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <p className="text-xs font-semibold text-muted uppercase tracking-wide">Refund</p>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <select
                                          value={edit.status}
                                          disabled={isSaving}
                                          onChange={(e) => {
                                            initRefundEdit(order);
                                            setRefundEdits((prev) => ({
                                              ...prev,
                                              [order.id]: { ...edit, status: e.target.value },
                                            }));
                                          }}
                                          className="px-2 py-1.5 border border-border rounded-lg text-xs focus:outline-none focus:border-primary bg-white disabled:opacity-50"
                                        >
                                          <option value="pending">Pending</option>
                                          <option value="processing">Processing</option>
                                          <option value="completed">Completed</option>
                                        </select>
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs text-muted">₹</span>
                                          <input
                                            type="number"
                                            min={0}
                                            value={edit.amount ?? ''}
                                            disabled={isSaving}
                                            placeholder={String(order.refund_amount ?? 0)}
                                            onChange={(e) => {
                                              initRefundEdit(order);
                                              setRefundEdits((prev) => ({
                                                ...prev,
                                                [order.id]: { ...edit, amount: e.target.value === '' ? null : Number(e.target.value) },
                                              }));
                                            }}
                                            className="w-20 px-2 py-1.5 border border-border rounded-lg text-xs focus:outline-none focus:border-primary bg-white disabled:opacity-50"
                                          />
                                        </div>
                                        <input
                                          type="text"
                                          value={edit.notes}
                                          disabled={isSaving}
                                          placeholder="Notes (optional)"
                                          onChange={(e) => {
                                            initRefundEdit(order);
                                            setRefundEdits((prev) => ({
                                              ...prev,
                                              [order.id]: { ...edit, notes: e.target.value },
                                            }));
                                          }}
                                          className="flex-1 min-w-[120px] px-2 py-1.5 border border-border rounded-lg text-xs focus:outline-none focus:border-primary bg-white disabled:opacity-50"
                                        />
                                        <button
                                          disabled={isSaving}
                                          onClick={() => {
                                            initRefundEdit(order);
                                            handleRefundUpdate(order.id);
                                          }}
                                          className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
                                        >
                                          {isSaving ? 'Saving…' : 'Save'}
                                        </button>
                                      </div>
                                      {order.refunded_at && order.refund_status === 'completed' && (
                                        <p className="text-xs text-green-700">
                                          Processed on {new Date(order.refunded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })()}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            Page {page} of {totalPages} · {total} orders
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 border border-border rounded-lg text-muted hover:text-dark hover:bg-white disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
