'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, MapPin, Clock, Package, ArrowLeft, Banknote, RotateCcw, Star, Pencil, Plus, Minus, X, Search } from 'lucide-react';
import { cancelOrder, fetchOrder, updateOrderItems, type EditOrderItem, type Order } from '@/lib/api/orders';
import { useAuthStore } from '@/lib/store/authStore';
import { useCartStore } from '@/lib/store/cartStore';
import { fetchMyReviews, submitReview, type MyReview } from '@/lib/api/reviews';
import { fetchPublicProducts } from '@/lib/api/shop';
import StarSelector from '@/components/StarSelector';
import type { Product } from '@/lib/types';
import Image from 'next/image';

const STATUS_STEPS = [
  { key: 'placed', label: 'Order Placed', icon: '📋' },
  { key: 'confirmed', label: 'Confirmed', icon: '✅' },
  { key: 'packed', label: 'Packed', icon: '📦' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: '🛵' },
  { key: 'delivered', label: 'Delivered', icon: '🎉' },
];

function StatusTimeline({ status }: { status: string }) {
  const currentIdx = STATUS_STEPS.findIndex((s) => s.key === status);
  return (
    <div className="flex items-center gap-0">
      {STATUS_STEPS.map((step, i) => {
        const done = i <= currentIdx;
        const active = i === currentIdx;
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base border-2 transition-colors ${
                done ? 'border-primary bg-primary text-white' : 'border-border bg-white text-muted'
              } ${active ? 'ring-2 ring-primary/30' : ''}`}>
                {step.icon}
              </div>
              <p className={`text-[9px] font-semibold mt-1 text-center leading-tight max-w-[50px] ${done ? 'text-primary' : 'text-muted'}`}>
                {step.label}
              </p>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-4 rounded-full transition-colors ${i < currentIdx ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearPromo = useCartStore((s) => s.clearPromo);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reordering, setReordering] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  // Edit order state
  const [editing, setEditing] = useState(false);
  const [editItems, setEditItems] = useState<EditOrderItem[]>([]);
  const [addSearch, setAddSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reviews state
  const [myReviews, setMyReviews] = useState<MyReview[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    fetchOrder(token, id)
      .then((o) => {
        setOrder(o);
        if (o.status === 'delivered') {
          fetchMyReviews(token).then(setMyReviews).catch(() => {});
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load order'))
      .finally(() => setLoading(false));
  }, [id, token, router]);

  // Poll for status updates every 8s while order is not in a terminal state
  useEffect(() => {
    if (!token || !order) return;
    if (['delivered', 'cancelled'].includes(order.status)) return;

    const interval = setInterval(async () => {
      try {
        const fresh = await fetchOrder(token, id);
        setOrder(fresh);
        if (fresh.status === 'delivered') {
          fetchMyReviews(token).then(setMyReviews).catch(() => {});
        }
      } catch {
        // silently ignore
      }
    }, 8_000);

    return () => clearInterval(interval);
  }, [token, id, order?.status]);

  if (loading) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !order) return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 text-center">
      <div>
        <p className="text-red-600 font-semibold mb-4">{error || 'Order not found'}</p>
        <button onClick={() => router.push('/')} className="text-primary font-semibold hover:underline">Go home</button>
      </div>
    </div>
  );

  function handleReorder() {
    if (!order) return;
    setReordering(true);
    const validItems = order.order_items.filter((i) => i.product_id);
    for (const item of validItems) {
      const product: Product = {
        id: item.product_id!,
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
      updateQuantity(item.product_id!, item.quantity);
    }
    clearPromo();
    setReordering(false);
    router.push('/checkout');
  }

  const canReorder = order.order_items.some((i) => i.product_id);
  const canCancel = ['placed', 'confirmed'].includes(order.status);
  const canEdit = ['placed', 'confirmed'].includes(order.status);

  function startEdit() {
    setEditItems(order.order_items.map((i) => ({
      product_id: i.product_id ?? undefined,
      product_name: i.product_name,
      product_image: i.product_image ?? undefined,
      product_weight: i.product_weight ?? undefined,
      quantity: i.quantity,
      unit_price: i.unit_price,
      total_price: i.total_price,
    })));
    setAddSearch('');
    setSearchResults([]);
    setEditError('');
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setSearchResults([]);
    setAddSearch('');
    setEditError('');
  }

  function changeQty(idx: number, delta: number) {
    setEditItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item;
      const newQty = Math.max(1, item.quantity + delta);
      return { ...item, quantity: newQty, total_price: item.unit_price * newQty };
    }));
  }

  function removeItem(idx: number) {
    setEditItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function addProductFromSearch(product: Product) {
    setEditItems((prev) => {
      const existing = prev.findIndex((i) => i.product_id === product.id);
      if (existing !== -1) {
        return prev.map((item, i) => {
          if (i !== existing) return item;
          const newQty = item.quantity + 1;
          return { ...item, quantity: newQty, total_price: item.unit_price * newQty };
        });
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        product_image: product.image || undefined,
        product_weight: product.weight || undefined,
        quantity: 1,
        unit_price: product.price,
        total_price: product.price,
      }];
    });
    setAddSearch('');
    setSearchResults([]);
  }

  function handleSearchInput(val: string) {
    setAddSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!val.trim()) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetchPublicProducts({ search: val.trim(), in_stock: true, limit: 6 });
        setSearchResults(res.products);
      } catch { /* ignore */ }
    }, 350);
  }

  async function handleEditSave() {
    if (!token || editItems.length === 0) return;
    setSavingEdit(true);
    setEditError('');
    try {
      const updated = await updateOrderItems(token, id, editItems);
      setOrder(updated);
      setEditing(false);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Failed to save changes');
    } finally {
      setSavingEdit(false);
    }
  }

  const editSubtotal = editItems.reduce((s, i) => s + i.total_price, 0);

  async function handleCancel() {
    if (!token) return;
    setCancelling(true);
    setConfirmCancel(false);
    try {
      await cancelOrder(token, id);
      setOrder((prev) => prev ? { ...prev, status: 'cancelled' } : prev);
    } catch {
      // Realtime subscription will sync the status if it succeeded
    } finally {
      setCancelling(false);
    }
  }

  async function handleSubmitReviews() {
    if (!token || !order) return;
    setSubmitting(true);
    const items = order.order_items.filter(
      (i) => i.product_id && ratings[i.product_id] && !myReviews.find((r) => r.product_id === i.product_id),
    );
    await Promise.allSettled(
      items.map((item) =>
        submitReview(token, {
          product_id: item.product_id!,
          order_id: order.id,
          rating: ratings[item.product_id!],
          review_text: texts[item.product_id!] || undefined,
        }),
      ),
    );
    const updated = await fetchMyReviews(token).catch(() => myReviews);
    setMyReviews(updated);
    setRatings({});
    setTexts({});
    setReviewSuccess(true);
    setSubmitting(false);
  }
  const shortId = order.id.slice(0, 8).toUpperCase();
  const placed = new Date(order.created_at);

  return (
    <div className="min-h-screen bg-cream pb-8">
      <header className="bg-white border-b border-border sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.push('/')} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-dark" />
          </button>
          <h1 className="font-bold text-dark text-lg" style={{ fontFamily: 'var(--font-serif)' }}>Order #{shortId}</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Success banner */}
        <div className="bg-primary text-white rounded-2xl px-5 py-4 flex items-center gap-4">
          <CheckCircle className="w-10 h-10 shrink-0" />
          <div>
            <p className="font-bold text-lg">Order Placed!</p>
            <p className="text-sm text-white/80">
              {order.status === 'placed' ? '🚀 Arriving in ~30 minutes' : `Status: ${order.status}`}
            </p>
          </div>
        </div>

        {/* Status timeline */}
        <div className="bg-white rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide">Order Progress</p>
            {order.status !== 'delivered' && order.status !== 'cancelled' && (
              <span className="flex items-center gap-1.5 text-xs text-green-600 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live
              </span>
            )}
          </div>
          <StatusTimeline status={order.status} />
        </div>

        {/* Order info */}
        {order.driver_name && order.status === 'out_for_delivery' && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl shrink-0">🛵</span>
            <div>
              <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Your Delivery Driver</p>
              <p className="font-semibold text-dark">{order.driver_name}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-border p-5 space-y-3">
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-muted">Delivery Address</p>
              <p className="text-sm text-dark mt-0.5">{order.delivery_address}</p>
              {order.delivery_landmark && <p className="text-xs text-muted">{order.delivery_landmark}</p>}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-muted">Placed At</p>
              <p className="text-sm text-dark mt-0.5">
                {placed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' · '}
                {placed.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Banknote className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-muted">Payment</p>
              <p className="text-sm text-dark mt-0.5">Cash on Delivery (COD)</p>
            </div>
          </div>
          {order.delivery_instructions && (
            <div className="flex items-start gap-3">
              <span className="text-base mt-0.5 shrink-0">📋</span>
              <div>
                <p className="text-xs font-semibold text-muted">Delivery Instructions</p>
                <p className="text-sm text-dark mt-0.5">{order.delivery_instructions}</p>
              </div>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-dark">Items ({order.order_items.length})</p>
          </div>
          <ul className="space-y-3 mb-4">
            {order.order_items.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-cream shrink-0">
                  {item.product_image ? (
                    <Image src={item.product_image} alt={item.product_name} width={40} height={40} className="object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark truncate">{item.product_name}</p>
                  {item.product_weight && <p className="text-xs text-muted">{item.product_weight}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-dark">₹{item.total_price}</p>
                  <p className="text-xs text-muted">× {item.quantity}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="border-t border-border pt-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span className="text-dark">₹{order.items_total}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Delivery</span>
              {order.delivery_fee === 0
                ? <span className="text-green-600 font-semibold">FREE</span>
                : <span className="text-dark">₹{order.delivery_fee}</span>}
            </div>
            {(order.discount_amount ?? 0) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-600 font-medium">
                  Promo discount{order.promo_code ? ` (${order.promo_code})` : ''}
                </span>
                <span className="text-green-600 font-semibold">−₹{order.discount_amount}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-border font-bold">
              <span className="text-dark">Total</span>
              <span className="text-dark">₹{order.final_total}</span>
            </div>
          </div>
        </div>

        {/* Edit Order — shown when status is placed/confirmed and not already editing */}
        {canEdit && !editing && (
          <button
            onClick={startEdit}
            className="w-full flex items-center justify-center gap-2 border border-primary/40 text-primary bg-primary-light hover:bg-primary/10 font-semibold py-3 rounded-2xl transition-colors text-sm"
          >
            <Pencil className="w-4 h-4" /> Edit Order
          </button>
        )}

        {/* Edit panel */}
        {editing && (
          <div className="bg-white border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-dark text-sm">Edit Items</p>
              <button onClick={cancelEdit} className="text-muted hover:text-dark transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Editable items */}
            <ul className="space-y-3">
              {editItems.map((item, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-cream shrink-0">
                    {item.product_image
                      ? <Image src={item.product_image} alt={item.product_name} width={40} height={40} className="object-cover w-full h-full" />
                      : <div className="w-full h-full flex items-center justify-center text-lg">📦</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark truncate">{item.product_name}</p>
                    {item.product_weight && <p className="text-xs text-muted">{item.product_weight}</p>}
                    <p className="text-xs text-muted">₹{item.unit_price} each</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => changeQty(idx, -1)} className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-cream transition-colors">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-semibold w-5 text-center">{item.quantity}</span>
                    <button onClick={() => changeQty(idx, 1)} className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-cream transition-colors">
                      <Plus className="w-3 h-3" />
                    </button>
                    <button onClick={() => removeItem(idx)} className="w-7 h-7 rounded-full flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Add product search */}
            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-xs font-semibold text-muted">Add a product</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                <input
                  type="text"
                  value={addSearch}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  placeholder="Search products…"
                  className="w-full pl-9 pr-4 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              {searchResults.length > 0 && (
                <ul className="border border-border rounded-xl divide-y divide-border overflow-hidden">
                  {searchResults.map((p) => (
                    <li key={p.id} className="flex items-center justify-between px-3 py-2 hover:bg-cream transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        {p.image && <Image src={p.image} alt={p.name} width={32} height={32} className="w-8 h-8 rounded-lg object-cover shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-dark truncate">{p.name}</p>
                          {p.weight && <p className="text-[10px] text-muted">{p.weight}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-semibold text-dark">₹{p.price}</span>
                        <button
                          onClick={() => addProductFromSearch(p)}
                          className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Subtotal + save */}
            <div className="border-t border-border pt-3 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted">New subtotal</span>
                <span className="font-bold text-dark">₹{editSubtotal}</span>
              </div>
              {editError && <p className="text-xs text-red-600">{editError}</p>}
              <button
                onClick={handleEditSave}
                disabled={savingEdit || editItems.length === 0}
                className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
              >
                {savingEdit ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* Refund status — for cancelled orders where cash was collected */}
        {order.status === 'cancelled' &&
          order.refund_status &&
          order.refund_status !== 'not_applicable' && (
          <div className={`rounded-2xl border p-4 space-y-2 ${
            order.refund_status === 'completed'
              ? 'bg-green-50 border-green-200'
              : order.refund_status === 'processing'
              ? 'bg-blue-50 border-blue-200'
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-dark">Refund Status</p>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                order.refund_status === 'completed'
                  ? 'bg-green-200 text-green-800'
                  : order.refund_status === 'processing'
                  ? 'bg-blue-200 text-blue-800'
                  : 'bg-yellow-200 text-yellow-800'
              }`}>
                {order.refund_status === 'completed' ? 'Processed' :
                 order.refund_status === 'processing' ? 'Processing' : 'Pending'}
              </span>
            </div>
            {order.refund_amount != null && (
              <p className="text-sm text-dark">
                Amount: <span className="font-semibold">₹{order.refund_amount}</span>
              </p>
            )}
            {order.refund_status === 'completed' && order.refunded_at && (
              <p className="text-xs text-muted">
                Processed on {new Date(order.refunded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
            {order.refund_notes && (
              <p className="text-xs text-dark/80">{order.refund_notes}</p>
            )}
            {order.refund_status === 'pending' && !order.refund_notes && (
              <p className="text-xs text-muted">Our team will process your refund shortly.</p>
            )}
          </div>
        )}

        {/* Rate Your Items — only for delivered orders */}
        {order.status === 'delivered' && (
          <div className="bg-white rounded-2xl border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <h2 className="font-semibold text-dark text-sm">Rate Your Items</h2>
            </div>

            {reviewSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm mb-4">
                ✓ Reviews submitted! Thank you for your feedback.
              </div>
            )}

            <div className="space-y-4">
              {order.order_items
                .filter((item) => item.product_id)
                .map((item) => {
                  const alreadyReviewed = myReviews.find((r) => r.product_id === item.product_id);
                  const currentRating = ratings[item.product_id!] ?? 0;

                  return (
                    <div key={item.id} className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-border bg-cream shrink-0">
                          {item.product_image ? (
                            <Image src={item.product_image} alt={item.product_name} width={40} height={40} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-dark truncate">{item.product_name}</p>
                          {alreadyReviewed ? (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <StarSelector value={alreadyReviewed.rating} onChange={() => {}} readonly size="sm" />
                              <span className="text-xs text-green-600 font-semibold">Reviewed ✓</span>
                            </div>
                          ) : (
                            <StarSelector
                              value={currentRating}
                              onChange={(v) => setRatings((r) => ({ ...r, [item.product_id!]: v }))}
                              size="sm"
                            />
                          )}
                        </div>
                      </div>

                      {!alreadyReviewed && currentRating > 0 && (
                        <textarea
                          value={texts[item.product_id!] ?? ''}
                          onChange={(e) => setTexts((t) => ({ ...t, [item.product_id!]: e.target.value }))}
                          placeholder="Write a review (optional)…"
                          rows={2}
                          maxLength={500}
                          className="w-full px-3 py-2 border border-border rounded-xl text-sm resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      )}
                    </div>
                  );
                })}
            </div>

            {Object.keys(ratings).length > 0 && (
              <button
                onClick={handleSubmitReviews}
                disabled={submitting}
                className="w-full mt-4 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
              >
                {submitting ? 'Submitting…' : 'Submit Reviews'}
              </button>
            )}
          </div>
        )}

        {confirmCancel && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <p className="text-sm text-red-700 flex-1 font-medium">Cancel this order?</p>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition-colors"
            >
              {cancelling ? 'Cancelling…' : 'Yes, Cancel'}
            </button>
            <button
              onClick={() => setConfirmCancel(false)}
              className="px-3 py-2 text-sm font-semibold text-muted hover:text-dark transition-colors"
            >
              No
            </button>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => router.push('/')}
            className="flex-1 border border-border bg-white hover:bg-cream text-dark font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            Continue Shopping
          </button>
          {canCancel && !confirmCancel && (
            <button
              onClick={() => setConfirmCancel(true)}
              className="flex-1 flex items-center justify-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              Cancel Order
            </button>
          )}
          <button
            onClick={handleReorder}
            disabled={!canReorder || reordering}
            title={!canReorder ? 'These items are no longer available' : ''}
            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            {reordering ? 'Adding…' : 'Reorder'}
          </button>
        </div>
      </div>
    </div>
  );
}
