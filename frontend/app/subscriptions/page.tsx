'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Pencil, Pause, Play, RefreshCw, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import {
  fetchSubscriptions, pauseSubscription, resumeSubscription, cancelSubscription,
  type Subscription, FREQUENCY_LABELS, DAY_NAMES, TIME_WINDOWS,
} from '@/lib/api/subscriptions';
import EditSubscriptionModal from '@/components/EditSubscriptionModal';

function frequencyDesc(sub: Subscription) {
  if (sub.frequency === 'daily') return 'Every day';
  if (sub.frequency === 'weekly') return `Every ${DAY_NAMES[sub.frequency_day ?? 1]}`;
  if (sub.frequency === 'monthly') {
    const d = sub.frequency_day ?? 1;
    return `Monthly on the ${d}${d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'}`;
  }
  return FREQUENCY_LABELS[sub.frequency] ?? sub.frequency;
}

function getUpcomingDates(sub: Subscription, count = 5): string[] {
  if (!sub.next_delivery_date) return [];
  const dates: string[] = [];
  const cur = new Date(sub.next_delivery_date + 'T00:00:00');
  for (let i = 0; i < count; i++) {
    dates.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`);
    if (sub.frequency === 'daily') cur.setDate(cur.getDate() + 1);
    else if (sub.frequency === 'weekly') cur.setDate(cur.getDate() + 7);
    else cur.setMonth(cur.getMonth() + 1);
  }
  return dates;
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-green-50 text-green-700 border-green-200',
  paused: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  cancelled: 'bg-gray-50 text-gray-500 border-gray-200',
};

export default function SubscriptionsPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [editSub, setEditSub] = useState<Subscription | null>(null);
  const [expandedUpcoming, setExpandedUpcoming] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    fetchSubscriptions(token)
      .then(setSubs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, router]);

  async function handlePause(id: string) {
    if (!token) return;
    setActionId(id);
    await pauseSubscription(token, id).catch(() => {});
    setSubs((prev) => prev.map((s) => s.id === id ? { ...s, status: 'paused' } : s));
    setActionId(null);
  }

  async function handleResume(id: string) {
    if (!token) return;
    setActionId(id);
    await resumeSubscription(token, id).catch(() => {});
    setSubs((prev) => prev.map((s) => s.id === id ? { ...s, status: 'active' } : s));
    setActionId(null);
  }

  async function handleCancel(id: string) {
    if (!token || !confirm('Cancel this subscription?')) return;
    setActionId(id);
    await cancelSubscription(token, id).catch(() => {});
    setSubs((prev) => prev.filter((s) => s.id !== id));
    setActionId(null);
  }

  return (
    <div className="min-h-screen bg-cream pb-10">
      <header className="bg-white border-b border-border sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-dark" />
          </button>
          <h1 className="font-bold text-dark text-lg" style={{ fontFamily: 'var(--font-serif)' }}>My Subscriptions</h1>
          {subs.length > 0 && (
            <span className="ml-auto text-xs text-muted">{subs.filter((s) => s.status === 'active').length} active</span>
          )}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-white rounded-2xl border border-border animate-pulse" />
            ))}
          </div>
        ) : subs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mb-4">
              <RefreshCw className="w-8 h-8 text-primary" />
            </div>
            <p className="font-semibold text-dark mb-1">No subscriptions yet</p>
            <p className="text-sm text-muted mb-6">Subscribe to your daily essentials and save 5% on every delivery</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors"
            >
              Browse Products
            </button>
          </div>
        ) : (
          subs.map((sub) => {
            const product = sub.products;
            const discountedPrice = Math.round((product?.price ?? 0) * 0.95);
            const isActioning = actionId === sub.id;
            const upcomingOpen = expandedUpcoming === sub.id;

            return (
              <div key={sub.id} className="bg-white rounded-2xl border border-border p-4">
                <div className="flex items-start gap-3">
                  {/* Product image */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-cream border border-border shrink-0">
                    {product?.image_url ? (
                      <Image src={product.image_url} alt={product.name ?? ''} width={56} height={56} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-dark text-sm truncate">{product?.name ?? 'Product'}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 capitalize ${STATUS_STYLE[sub.status]}`}>
                        {sub.status}
                      </span>
                    </div>

                    <p className="text-xs text-muted mt-0.5">
                      × {sub.quantity} · {frequencyDesc(sub)}
                    </p>
                    {sub.preferred_time_start && (
                      <p className="text-[11px] text-primary font-medium mt-0.5">
                        🕐 {TIME_WINDOWS.find((w) => w.start === sub.preferred_time_start)?.label ?? sub.preferred_time_start}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-bold text-dark">₹{discountedPrice * sub.quantity}</span>
                      <span className="text-[10px] text-green-600 font-semibold bg-green-50 px-1.5 py-0.5 rounded-full">{sub.discount_pct}% off</span>
                    </div>

                    {sub.status === 'active' && (
                      <div className="mt-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[11px] text-muted">
                            Next: {fmtDate(sub.next_delivery_date)}
                          </p>
                          <button
                            onClick={() => setExpandedUpcoming(upcomingOpen ? null : sub.id)}
                            className="text-[11px] text-primary hover:underline"
                          >
                            {upcomingOpen ? '▾ hide' : '▸ upcoming'}
                          </button>
                        </div>
                        {upcomingOpen && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {getUpcomingDates(sub).map((d) => (
                              <span
                                key={d}
                                className="text-[10px] bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full"
                              >
                                {fmtDate(d)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-border flex-wrap">
                  {sub.status === 'active' ? (
                    <button
                      onClick={() => handlePause(sub.id)}
                      disabled={isActioning}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-yellow-700 bg-yellow-50 hover:bg-yellow-100 rounded-xl transition-colors border border-yellow-200 disabled:opacity-50"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      Pause
                    </button>
                  ) : sub.status === 'paused' ? (
                    <button
                      onClick={() => handleResume(sub.id)}
                      disabled={isActioning}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-xl transition-colors border border-green-200 disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Resume
                    </button>
                  ) : null}

                  {sub.status !== 'cancelled' && (
                    <button
                      onClick={() => setEditSub(sub)}
                      disabled={isActioning}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/5 rounded-xl transition-colors border border-primary/30 disabled:opacity-50"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </button>
                  )}

                  <button
                    onClick={() => handleCancel(sub.id)}
                    disabled={isActioning}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-red-200 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {editSub && (
        <EditSubscriptionModal
          sub={editSub}
          token={token!}
          onClose={() => setEditSub(null)}
          onSaved={(updated) => {
            setSubs((prev) => prev.map((s) => s.id === updated.id ? { ...s, ...updated } : s));
            setEditSub(null);
          }}
        />
      )}
    </div>
  );
}
