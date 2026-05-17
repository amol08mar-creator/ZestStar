'use client';
import { useEffect, useState } from 'react';
import { X, RefreshCw, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { fetchAddresses, type Address } from '@/lib/api/addresses';
import { createSubscription, TIME_WINDOWS } from '@/lib/api/subscriptions';
import type { Product } from '@/lib/types';

const DAY_OPTIONS = [
  { value: 1, label: 'Monday' }, { value: 2, label: 'Tuesday' }, { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' }, { value: 5, label: 'Friday' }, { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

interface Props {
  product: Product;
  onClose: () => void;
}

export default function SubscribeModal({ product, onClose }: Props) {
  const token = useAuthStore((s) => s.token);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [timeStart, setTimeStart] = useState('09:00');
  const [timeEnd, setTimeEnd] = useState('11:00');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const discountedPrice = Math.round(product.price * 0.95);

  useEffect(() => {
    if (!token) return;
    fetchAddresses(token).then((addrs) => {
      setAddresses(addrs);
      const def = addrs.find((a) => a.is_default) ?? addrs[0];
      if (def) setSelectedAddressId(def.id);
    }).catch(() => {});
  }, [token]);

  async function handleSubmit() {
    if (!token || !selectedAddressId) return;
    const address = addresses.find((a) => a.id === selectedAddressId);
    if (!address) return;

    setSubmitting(true);
    setError('');
    try {
      await createSubscription(token, {
        product_id: product.id,
        quantity,
        delivery_address: address.address,
        delivery_landmark: address.landmark ?? undefined,
        frequency,
        frequency_day: frequency === 'weekly' ? dayOfWeek : frequency === 'monthly' ? dayOfMonth : undefined,
        preferred_time_start: timeStart,
        preferred_time_end: timeEnd,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create subscription');
    } finally {
      setSubmitting(false);
    }
  }

  const frequencyLabel = frequency === 'daily' ? 'every day' :
    frequency === 'weekly' ? `every ${DAY_OPTIONS.find(d => d.value === dayOfWeek)?.label}` :
    `on the ${dayOfMonth}${dayOfMonth === 1 ? 'st' : dayOfMonth === 2 ? 'nd' : dayOfMonth === 3 ? 'rd' : 'th'} of each month`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-dark" style={{ fontFamily: 'var(--font-serif)' }}>Subscribe & Save 5%</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {success ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <RefreshCw className="w-8 h-8 text-green-600" />
              </div>
              <p className="font-bold text-dark text-lg">Subscription Created!</p>
              <p className="text-sm text-muted">
                <strong>{product.name}</strong> × {quantity} will be delivered {frequencyLabel} between <strong>{TIME_WINDOWS.find(w => w.start === timeStart)?.label}</strong> at ₹{discountedPrice}/unit.
              </p>
              <p className="text-xs text-muted">Manage it from your Profile → Subscriptions page.</p>
              <button onClick={onClose} className="mt-2 px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors">
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Product summary */}
              <div className="bg-cream rounded-xl p-3 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-white border border-border flex items-center justify-center text-xl shrink-0">
                  {product.image ? <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded-lg" /> : '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-dark truncate">{product.name}</p>
                  <p className="text-xs text-muted">
                    <span className="line-through">₹{product.price}</span>
                    <span className="text-green-600 font-bold ml-1.5">₹{discountedPrice}</span>
                    <span className="text-green-600 text-[10px] ml-1">(5% off)</span>
                  </p>
                </div>
              </div>

              {/* Frequency */}
              <div>
                <p className="text-xs font-semibold text-dark mb-2">Delivery Frequency</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['daily', 'weekly', 'monthly'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFrequency(f)}
                      className={`py-2 text-xs font-semibold rounded-xl border-2 transition-colors capitalize ${
                        frequency === f ? 'border-primary bg-primary text-white' : 'border-border text-muted hover:border-primary/50'
                      }`}
                    >
                      {f === 'daily' ? 'Every Day' : f === 'weekly' ? 'Weekly' : 'Monthly'}
                    </button>
                  ))}
                </div>

                {frequency === 'weekly' && (
                  <div className="mt-2">
                    <p className="text-xs text-muted mb-1.5">Which day?</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {DAY_OPTIONS.map((d) => (
                        <button
                          key={d.value}
                          onClick={() => setDayOfWeek(d.value)}
                          className={`py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                            dayOfWeek === d.value ? 'border-primary bg-primary-light text-primary' : 'border-border text-muted hover:border-primary/50'
                          }`}
                        >
                          {d.label.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {frequency === 'monthly' && (
                  <div className="mt-2">
                    <p className="text-xs text-muted mb-1.5">Date of month (1–28)</p>
                    <input
                      type="number" min={1} max={28} value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(Math.min(28, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-24 px-3 py-1.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div>
                <p className="text-xs font-semibold text-dark mb-2">Quantity per delivery</p>
                <div className="flex items-center gap-3">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 rounded-full border border-border text-dark hover:border-primary hover:text-primary transition-colors text-lg font-bold">−</button>
                  <span className="text-lg font-bold text-dark min-w-[2rem] text-center">{quantity}</span>
                  <button onClick={() => setQuantity(Math.min(20, quantity + 1))} className="w-8 h-8 rounded-full border border-border text-dark hover:border-primary hover:text-primary transition-colors text-lg font-bold">+</button>
                </div>
              </div>

              {/* Delivery Time */}
              <div>
                <p className="text-xs font-semibold text-dark mb-2">Preferred Delivery Time</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {TIME_WINDOWS.map((w) => (
                    <button
                      key={w.start}
                      onClick={() => { setTimeStart(w.start); setTimeEnd(w.end); }}
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border-2 transition-colors text-left ${
                        timeStart === w.start
                          ? 'border-primary bg-primary-light text-primary'
                          : 'border-border text-muted hover:border-primary/50'
                      }`}
                    >
                      🕐 {w.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Address */}
              {addresses.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-dark mb-2">Deliver to</p>
                  <div className="space-y-2">
                    {addresses.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => setSelectedAddressId(a.id)}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${
                          selectedAddressId === a.id ? 'border-primary bg-primary-light/30' : 'border-border hover:border-primary/40'
                        }`}
                      >
                        <p className="text-xs font-bold text-primary">{a.label}</p>
                        <p className="text-xs text-dark mt-0.5 line-clamp-1">{a.address}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
                <p className="font-semibold">₹{discountedPrice * quantity}/delivery</p>
                <p className="text-xs text-green-700 mt-0.5">
                  {product.name} × {quantity}, {frequencyLabel}
                </p>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}

              <button
                onClick={handleSubmit}
                disabled={submitting || !selectedAddressId}
                className="w-full py-3 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Setting up…</> : '✓ Start Subscription'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
