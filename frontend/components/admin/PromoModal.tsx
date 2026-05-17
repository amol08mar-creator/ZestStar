'use client';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { PromoCode, PromoForm } from '@/lib/api/promo';

interface Props {
  open: boolean;
  promo: PromoCode | null;
  onClose: () => void;
  onSave: (form: PromoForm) => Promise<void>;
}

const EMPTY: PromoForm = {
  code: '',
  description: '',
  type: 'percentage',
  value: 10,
  min_order_amount: 0,
  is_active: true,
};

export default function PromoModal({ open, promo, onClose, onSave }: Props) {
  const [form, setForm] = useState<PromoForm>(EMPTY);
  const [maxUsesInput, setMaxUsesInput] = useState('');
  const [validUntilInput, setValidUntilInput] = useState('');
  const [maxUsesPerCustomerInput, setMaxUsesPerCustomerInput] = useState('');
  const [categoriesInput, setCategoriesInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (promo) {
      setForm({
        code: promo.code,
        description: promo.description ?? '',
        type: promo.type,
        value: promo.value,
        min_order_amount: promo.min_order_amount,
        is_active: promo.is_active,
      });
      setMaxUsesInput(promo.max_uses !== null ? String(promo.max_uses) : '');
      setValidUntilInput(promo.valid_until ? new Date(promo.valid_until).toISOString().slice(0, 16) : '');
      setMaxUsesPerCustomerInput(promo.max_uses_per_customer != null ? String(promo.max_uses_per_customer) : '');
      setCategoriesInput((promo.applicable_categories ?? []).join(', '));
    } else {
      setForm(EMPTY);
      setMaxUsesInput('');
      setValidUntilInput('');
      setMaxUsesPerCustomerInput('');
      setCategoriesInput('');
    }
    setError('');
  }, [open, promo]);

  function set<K extends keyof PromoForm>(key: K, val: PromoForm[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.code.trim()) { setError('Code is required'); return; }
    if (form.value < 1) { setError('Value must be at least 1'); return; }
    if (form.type === 'percentage' && form.value > 100) { setError('Percentage cannot exceed 100'); return; }

    const payload: PromoForm = { ...form, code: form.code.trim().toUpperCase() };
    if (maxUsesInput.trim()) payload.max_uses = parseInt(maxUsesInput);
    if (validUntilInput) payload.valid_until = new Date(validUntilInput).toISOString();
    if (maxUsesPerCustomerInput.trim()) payload.max_uses_per_customer = parseInt(maxUsesPerCustomerInput);
    if (categoriesInput.trim()) {
      payload.applicable_categories = categoriesInput.split(',').map((s) => s.trim()).filter(Boolean);
    }

    setSaving(true);
    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-lg font-bold text-dark" style={{ fontFamily: 'var(--font-serif)' }}>
            {promo ? 'Edit Promo Code' : 'New Promo Code'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
          )}

          {/* Code */}
          <div>
            <label className="block text-xs font-semibold text-dark mb-1">Code *</label>
            <input
              value={form.code}
              onChange={(e) => set('code', e.target.value.toUpperCase())}
              placeholder="e.g. SAVE20"
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm font-mono tracking-widest focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary uppercase"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-dark mb-1">
              Description <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              value={form.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
              placeholder="e.g. 20% off on first order"
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Type toggle */}
          <div>
            <label className="block text-xs font-semibold text-dark mb-2">Discount Type *</label>
            <div className="flex gap-2">
              {(['percentage', 'fixed'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('type', t)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${
                    form.type === t
                      ? 'border-primary bg-primary text-white'
                      : 'border-border text-muted hover:border-primary/50'
                  }`}
                >
                  {t === 'percentage' ? '% Percentage' : '₹ Fixed Amount'}
                </button>
              ))}
            </div>
          </div>

          {/* Value */}
          <div>
            <label className="block text-xs font-semibold text-dark mb-1">
              {form.type === 'percentage' ? 'Discount %' : 'Discount Amount (₹)'} *
              {form.type === 'percentage' && <span className="font-normal text-muted ml-1">(1–100)</span>}
            </label>
            <input
              type="number"
              min={1}
              max={form.type === 'percentage' ? 100 : undefined}
              value={form.value}
              onChange={(e) => set('value', parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          {/* Min order amount */}
          <div>
            <label className="block text-xs font-semibold text-dark mb-1">
              Minimum Order Amount (₹)
            </label>
            <input
              type="number"
              min={0}
              value={form.min_order_amount}
              onChange={(e) => set('min_order_amount', parseInt(e.target.value) || 0)}
              placeholder="0 = no minimum"
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Max uses */}
          <div>
            <label className="block text-xs font-semibold text-dark mb-1">
              Max Uses <span className="font-normal text-muted">(leave blank for unlimited)</span>
            </label>
            <input
              type="number"
              min={1}
              value={maxUsesInput}
              onChange={(e) => setMaxUsesInput(e.target.value)}
              placeholder="Unlimited"
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Valid until */}
          <div>
            <label className="block text-xs font-semibold text-dark mb-1">
              Expires On <span className="font-normal text-muted">(leave blank = never expires)</span>
            </label>
            <input
              type="datetime-local"
              value={validUntilInput}
              onChange={(e) => setValidUntilInput(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Max uses per customer */}
          <div>
            <label className="block text-xs font-semibold text-dark mb-1">
              Max Uses Per Customer <span className="font-normal text-muted">(blank = unlimited)</span>
            </label>
            <input
              type="number"
              min={1}
              value={maxUsesPerCustomerInput}
              onChange={(e) => setMaxUsesPerCustomerInput(e.target.value)}
              placeholder="e.g. 1"
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Applicable categories */}
          <div>
            <label className="block text-xs font-semibold text-dark mb-1">
              Applicable Categories <span className="font-normal text-muted">(comma-separated, blank = all)</span>
            </label>
            <input
              value={categoriesInput}
              onChange={(e) => setCategoriesInput(e.target.value)}
              placeholder="e.g. Dry Fruits, Spices"
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* First order only */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.first_order_only ?? false}
              onChange={(e) => set('first_order_only', e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm text-dark">First-order only <span className="text-muted text-xs">(new customers only)</span></span>
          </label>

          {/* Auto apply */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.auto_apply ?? false}
              onChange={(e) => set('auto_apply', e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm text-dark">Auto-apply at checkout <span className="text-muted text-xs">(applied automatically)</span></span>
          </label>

          {/* Active */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => set('is_active', e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm text-dark">Active (customers can use this code)</span>
          </label>
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-border shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold border border-border rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-dark disabled:opacity-60 rounded-xl transition-colors"
          >
            {saving ? 'Saving…' : promo ? 'Save Changes' : 'Create Code'}
          </button>
        </div>
      </div>
    </div>
  );
}
