'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { updateSubscription, type Subscription, type UpdateSubscriptionPayload, TIME_WINDOWS, DAY_NAMES } from '@/lib/api/subscriptions';
import { fetchAddresses, type Address } from '@/lib/api/addresses';

interface Props {
  sub: Subscription;
  token: string;
  onClose: () => void;
  onSaved: (updated: Subscription) => void;
}

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
] as const;

export default function EditSubscriptionModal({ sub, token, onClose, onSaved }: Props) {
  const product = sub.products;

  // Form state — pre-filled from subscription
  const [quantity, setQuantity] = useState(sub.quantity);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>(sub.frequency);
  const [frequencyDay, setFrequencyDay] = useState<number>(sub.frequency_day ?? 1);
  const [timeStart, setTimeStart] = useState(sub.preferred_time_start ?? '');
  const [timeEnd, setTimeEnd] = useState(sub.preferred_time_end ?? '');

  // Address state
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAddresses(token)
      .then((list) => {
        setAddresses(list);
        // Pre-select the address that matches sub.delivery_address
        const match = list.find((a) => a.address === sub.delivery_address);
        setSelectedAddressId(match?.id ?? (list[0]?.id ?? null));
      })
      .catch(() => {});
  }, [token, sub.delivery_address]);

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
      const payload: UpdateSubscriptionPayload = {
        quantity,
        frequency,
        frequency_day: frequency === 'daily' ? undefined : frequencyDay,
        delivery_address: selectedAddress?.address,
        delivery_landmark: selectedAddress?.landmark ?? null,
        preferred_time_start: timeStart || null,
        preferred_time_end: timeEnd || null,
      };
      const updated = await updateSubscription(token, sub.id, payload);
      onSaved(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  const discountedPrice = Math.round((product?.price ?? 0) * (1 - (sub.discount_pct ?? 5) / 100));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-border px-5 py-4 flex items-center gap-3 rounded-t-3xl sm:rounded-t-2xl z-10">
          {product?.image_url && (
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-border shrink-0">
              <Image src={product.image_url} alt={product.name ?? ''} width={40} height={40} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-dark text-sm truncate">{product?.name ?? 'Subscription'}</p>
            <p className="text-xs text-muted">Edit subscription</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-6">
          {/* Quantity */}
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Quantity</p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-xl border border-border text-lg font-bold text-dark hover:bg-gray-50 transition-colors flex items-center justify-center"
              >
                −
              </button>
              <span className="text-xl font-bold text-dark w-8 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                className="w-9 h-9 rounded-xl border border-border text-lg font-bold text-dark hover:bg-gray-50 transition-colors flex items-center justify-center"
              >
                +
              </button>
              <span className="text-xs text-muted ml-1">
                = ₹{discountedPrice * quantity}/delivery ({sub.discount_pct}% off)
              </span>
            </div>
          </div>

          {/* Frequency */}
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Frequency</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {FREQUENCY_OPTIONS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFrequency(f.value)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                    frequency === f.value
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-dark border-border hover:border-primary'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {frequency === 'weekly' && (
              <div className="grid grid-cols-7 gap-1">
                {DAY_NAMES.map((day, idx) => (
                  <button
                    key={day}
                    onClick={() => setFrequencyDay(idx)}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      frequencyDay === idx
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-muted hover:bg-gray-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            )}

            {frequency === 'monthly' && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted">Day of month:</span>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={frequencyDay}
                  onChange={(e) => setFrequencyDay(Math.min(28, Math.max(1, Number(e.target.value))))}
                  className="w-16 px-2 py-1.5 border border-border rounded-lg text-sm text-center focus:outline-none focus:border-primary"
                />
              </div>
            )}
          </div>

          {/* Delivery time */}
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Preferred Delivery Time</p>
            <div className="grid grid-cols-2 gap-2">
              {TIME_WINDOWS.map((w) => (
                <button
                  key={w.start}
                  onClick={() => { setTimeStart(w.start); setTimeEnd(w.end); }}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors ${
                    timeStart === w.start
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-dark border-border hover:border-primary'
                  }`}
                >
                  {w.label}
                </button>
              ))}
              <button
                onClick={() => { setTimeStart(''); setTimeEnd(''); }}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors ${
                  !timeStart
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-muted border-border hover:border-primary'
                }`}
              >
                Any time
              </button>
            </div>
          </div>

          {/* Delivery address */}
          {addresses.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Delivery Address</p>
              <div className="space-y-2">
                {addresses.map((addr) => (
                  <button
                    key={addr.id}
                    onClick={() => setSelectedAddressId(addr.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                      selectedAddressId === addr.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-white hover:border-gray-300'
                    }`}
                  >
                    <p className="text-sm font-semibold text-dark">{addr.label}</p>
                    <p className="text-xs text-muted mt-0.5 truncate">{addr.address}</p>
                    {addr.landmark && <p className="text-xs text-muted truncate">{addr.landmark}</p>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-semibold rounded-xl transition-colors"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
