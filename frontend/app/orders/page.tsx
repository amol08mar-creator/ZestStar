'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, ChevronUp, ChevronRight, RotateCcw, XCircle } from 'lucide-react';
import Image from 'next/image';
import { cancelOrder, fetchOrders, type Order, type OrderItem } from '@/lib/api/orders';
import { useAuthStore } from '@/lib/store/authStore';
import { useCartStore } from '@/lib/store/cartStore';
import type { Product } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  placed: 'bg-blue-50 text-blue-700',
  confirmed: 'bg-primary-light text-primary',
  packed: 'bg-yellow-50 text-yellow-700',
  out_for_delivery: 'bg-orange-50 text-orange-700',
  delivered: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  placed: 'Order Placed',
  confirmed: 'Confirmed',
  packed: 'Packed',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const MAX_THUMBS = 4;

export default function OrdersPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearPromo = useCartStore((s) => s.clearPromo);
  const setCartOpen = useCartStore((s) => s.setCartOpen);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    fetchOrders(token)
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, router]);

  // Poll for status updates every 15s while non-terminal orders exist
  useEffect(() => {
    const hasLiveOrders = orders.some(
      (o) => !['delivered', 'cancelled'].includes(o.status),
    );
    if (!token || !hasLiveOrders) return;

    const interval = setInterval(async () => {
      try {
        const fresh = await fetchOrders(token);
        setOrders(fresh);
      } catch {
        // silently ignore — stale data is acceptable
      }
    }, 15_000);

    return () => clearInterval(interval);
  }, [token, orders]);

  function cartifyItems(items: OrderItem[]) {
    for (const item of items) {
      if (!item.product_id) continue;
      const product: Product = {
        id: item.product_id,
        name: item.product_name,
        price: item.unit_price,
        image: item.product_image ?? '',
        description: '',
        category: '',
        rating: 0,
        reviewCount: 0,
        inStock: true,
        weight: item.product_weight ?? undefined,
      };
      addItem(product);
      updateQuantity(item.product_id, item.quantity);
    }
    clearPromo();
  }

  function handleOrderAgain(e: React.MouseEvent, order: Order) {
    e.stopPropagation();
    setReorderingId(order.id);
    cartifyItems(order.order_items ?? []);
    setReorderingId(null);
    setCartOpen(true); // open cart sidebar — customer can add more before checking out
  }

  async function handleCancel(e: React.MouseEvent, orderId: string) {
    e.stopPropagation();
    if (!token) return;
    setCancellingId(orderId);
    setConfirmCancelId(null);
    try {
      await cancelOrder(token, orderId);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: 'cancelled' } : o));
    } catch {
      // Realtime will sync the status if it actually succeeded
    } finally {
      setCancellingId(null);
    }
  }

  function goToProduct(name: string) {
    router.push(`/shop?q=${encodeURIComponent(name)}`);
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-border sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-dark" />
          </button>
          <h1 className="font-bold text-dark text-lg" style={{ fontFamily: 'var(--font-serif)' }}>My Orders</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-border h-28 animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-cream rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🛍️</div>
            <p className="font-semibold text-dark mb-1">No orders yet</p>
            <p className="text-sm text-muted mb-6">Your order history will appear here.</p>
            <button onClick={() => router.push('/')} className="bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm">
              Start Shopping
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((order) => {
              const shortId = order.id.slice(0, 8).toUpperCase();
              const placed = new Date(order.created_at);
              const statusLabel = STATUS_LABELS[order.status] ?? order.status;
              const statusColor = STATUS_COLORS[order.status] ?? 'bg-gray-50 text-gray-700';
              const items = order.order_items ?? [];
              const isExpanded = expandedId === order.id;
              const isReordering = reorderingId === order.id;
              const isCancelling = cancellingId === order.id;
              const isConfirmingCancel = confirmCancelId === order.id;
              const canReorder = items.some((i) => i.product_id);
              const canCancel = ['placed', 'confirmed'].includes(order.status);
              const thumbItems = items.slice(0, MAX_THUMBS);
              const overflowCount = Math.max(0, items.length - MAX_THUMBS);

              return (
                <li key={order.id}>
                  <div className={`bg-white rounded-2xl border transition-all ${isExpanded ? 'border-primary/30 shadow-sm' : 'border-border'}`}>

                    {/* ── Card header — tap to expand ── */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : order.id)}
                      className="w-full text-left px-4 pt-4 pb-3"
                    >
                      {/* Order ID + status + chevron */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="font-semibold text-dark text-sm">Order #{shortId}</p>
                          <p className="text-xs text-muted mt-0.5">
                            {placed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {' · '}
                            {placed.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusColor}`}>
                            {statusLabel}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/orders/${order.id}`); }}
                            className="text-[11px] font-semibold text-primary hover:underline"
                            title="View order details"
                          >
                            View
                          </button>
                          {isExpanded
                            ? <ChevronUp className="w-4 h-4 text-muted" />
                            : <ChevronDown className="w-4 h-4 text-muted" />}
                        </div>
                      </div>

                      {/* Thumbnail strip + total */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {thumbItems.map((item, idx) => (
                            <button
                              key={idx}
                              onClick={(e) => { e.stopPropagation(); goToProduct(item.product_name); }}
                              className="w-9 h-9 rounded-lg overflow-hidden border border-border bg-cream shrink-0 hover:ring-2 hover:ring-primary/40 transition-all"
                              title={item.product_name}
                            >
                              {item.product_image ? (
                                <Image src={item.product_image} alt={item.product_name} width={36} height={36} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-base">📦</div>
                              )}
                            </button>
                          ))}
                          {overflowCount > 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); router.push(`/orders/${order.id}`); }}
                              className="w-9 h-9 rounded-lg bg-cream border border-border flex items-center justify-center shrink-0 hover:bg-primary-light transition-colors"
                              title="View all items"
                            >
                              <span className="text-xs font-semibold text-muted">+{overflowCount}</span>
                            </button>
                          )}
                        </div>
                        <p className="font-bold text-dark shrink-0">₹{order.final_total}</p>
                      </div>
                    </button>

                    {/* Actions — visible when collapsed */}
                    {!isExpanded && (canReorder || canCancel) && !isConfirmingCancel && (
                      <div className="px-4 pb-3 flex justify-end gap-2">
                        {canCancel && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmCancelId(order.id); }}
                            disabled={isCancelling}
                            className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-60"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Cancel
                          </button>
                        )}
                        {canReorder && (
                          <button
                            onClick={(e) => handleOrderAgain(e, order)}
                            disabled={isReordering}
                            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary-light border border-primary/30 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-60"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            {isReordering ? 'Adding…' : 'Order Again'}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Inline cancel confirmation — collapsed view */}
                    {!isExpanded && isConfirmingCancel && (
                      <div className="px-4 pb-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs text-red-600 font-medium flex-1">Cancel this order?</span>
                        <button
                          onClick={(e) => handleCancel(e, order.id)}
                          disabled={isCancelling}
                          className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-xl disabled:opacity-60 transition-colors"
                        >
                          {isCancelling ? 'Cancelling…' : 'Yes, Cancel'}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmCancelId(null); }}
                          className="text-xs font-semibold text-muted hover:text-dark px-2 py-1.5 rounded-xl transition-colors"
                        >
                          No
                        </button>
                      </div>
                    )}

                    {/* ── Expanded: clickable item list ── */}
                    {isExpanded && (
                      <div className="border-t border-border divide-y divide-border">
                        {items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => goToProduct(item.product_name)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-cream/60 transition-colors text-left group"
                          >
                            {/* Image */}
                            <div className="w-11 h-11 rounded-xl overflow-hidden border border-border bg-cream shrink-0 group-hover:ring-2 group-hover:ring-primary/30 transition-all">
                              {item.product_image ? (
                                <Image src={item.product_image} alt={item.product_name} width={44} height={44} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
                              )}
                            </div>

                            {/* Name + weight */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-dark truncate">{item.product_name}</p>
                              {item.product_weight && <p className="text-xs text-muted">{item.product_weight}</p>}
                            </div>

                            {/* Price + chevron */}
                            <div className="text-right shrink-0 flex items-center gap-2">
                              <div>
                                <p className="text-sm font-semibold text-dark">₹{item.total_price}</p>
                                <p className="text-xs text-muted">×{item.quantity}</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </button>
                        ))}

                        {/* Actions inside expanded */}
                        {(canReorder || canCancel) && (
                          <div className="px-4 py-3 flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            {canCancel && !isConfirmingCancel && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setConfirmCancelId(order.id); }}
                                disabled={isCancelling}
                                className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-60"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Cancel Order
                              </button>
                            )}
                            {canCancel && isConfirmingCancel && (
                              <>
                                <span className="text-xs text-red-600 font-medium self-center">Cancel this order?</span>
                                <button
                                  onClick={(e) => handleCancel(e, order.id)}
                                  disabled={isCancelling}
                                  className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-xl disabled:opacity-60 transition-colors"
                                >
                                  {isCancelling ? 'Cancelling…' : 'Yes, Cancel'}
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setConfirmCancelId(null); }}
                                  className="text-xs font-semibold text-muted hover:text-dark px-2 py-1.5 rounded-xl transition-colors"
                                >
                                  No
                                </button>
                              </>
                            )}
                            {canReorder && (
                              <button
                                onClick={(e) => handleOrderAgain(e, order)}
                                disabled={isReordering}
                                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary-light border border-primary/30 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-60"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                {isReordering ? 'Adding…' : 'Order Again'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
