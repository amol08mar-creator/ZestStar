'use client';
import { useState } from 'react';
import { X, PackagePlus } from 'lucide-react';
import { addStockMovement } from '@/lib/api/stock-movements';
import { updateStock } from '@/lib/api/products';
import type { Product } from '@/lib/api/products';

interface Props {
  product: Product;
  token: string;
  onClose: () => void;
  onSuccess: (newStock: number) => void;
}

export default function AddStockModal({ product, token, onClose, onSuccess }: Props) {
  const [type, setType] = useState<'purchase' | 'return'>('purchase');
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (quantity < 1) { setError('Quantity must be at least 1'); return; }
    setSaving(true);
    setError('');
    try {
      // Log the movement
      await addStockMovement(token, product.id, type, quantity, note.trim() || undefined);
      // Increment the product stock
      const res = await updateStock(token, product.id, quantity);
      onSuccess(res.data.product.stock);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add stock');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-dark">Add Stock</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-muted" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-muted truncate">
            <span className="font-semibold text-dark">{product.name}</span>
            {' · '}Current stock: <strong className="text-dark">{product.stock ?? 0}</strong>
          </p>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-dark mb-1">Movement Type</label>
            <div className="flex gap-2">
              {(['purchase', 'return'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-colors capitalize ${
                    type === t ? 'border-primary bg-primary text-white' : 'border-border text-muted hover:border-primary/50'
                  }`}
                >
                  {t === 'purchase' ? '📦 Purchase' : '↩️ Return'}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-semibold text-dark mb-1">Quantity *</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <p className="text-xs text-muted mt-1">
              New stock will be: <strong className="text-dark">{(product.stock ?? 0) + quantity}</strong>
            </p>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-dark mb-1">
              Note <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. From supplier ABC, Batch #12"
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="flex-1 py-2 text-sm font-semibold border border-border rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark disabled:opacity-60 rounded-xl transition-colors"
          >
            {saving ? 'Saving…' : `Add ${quantity} units`}
          </button>
        </div>
      </div>
    </div>
  );
}
