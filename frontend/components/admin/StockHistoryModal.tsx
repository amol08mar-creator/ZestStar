'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { History, Package, X } from 'lucide-react';
import { fetchMovements, type StockMovement } from '@/lib/api/stock-movements';
import type { Product } from '@/lib/api/products';

const TYPE_CONFIG = {
  purchase: { label: 'Purchase', color: 'bg-green-100 text-green-700 border-green-200', sign: '+', qty: 'text-green-700' },
  sale:     { label: 'Sale',     color: 'bg-orange-100 text-orange-700 border-orange-200', sign: '−', qty: 'text-orange-700' },
  adjustment: { label: 'Adjustment', color: 'bg-blue-100 text-blue-700 border-blue-200', sign: '±', qty: 'text-blue-700' },
  return:   { label: 'Return',   color: 'bg-purple-100 text-purple-700 border-purple-200', sign: '+', qty: 'text-purple-700' },
};

interface Props {
  product: Product;
  token: string;
  onClose: () => void;
}

function stockColor(stock: number) {
  if (stock === 0) return 'text-red-600 bg-red-50 border-red-200';
  if (stock <= 10) return 'text-orange-600 bg-orange-50 border-orange-200';
  return 'text-green-700 bg-green-50 border-green-200';
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    + ', '
    + d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function StockHistoryModal({ product, token, onClose }: Props) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMovements(token, product.id)
      .then(setMovements)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, product.id]);

  const totals = {
    purchase: movements.filter(m => m.type === 'purchase').reduce((s, m) => s + m.quantity, 0),
    sale:     movements.filter(m => m.type === 'sale').reduce((s, m) => s + m.quantity, 0),
    return:   movements.filter(m => m.type === 'return').reduce((s, m) => s + m.quantity, 0),
    adjustment: movements.filter(m => m.type === 'adjustment').reduce((s, m) => s + m.quantity, 0),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">

        {/* Title bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-dark">Stock History</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-muted" />
          </button>
        </div>

        {/* Product info */}
        <div className="px-6 py-4 border-b border-border bg-cream/40 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-cream border border-border shrink-0">
              {product.image_url ? (
                <Image src={product.image_url} alt={product.name} width={56} height={56} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-6 h-6 text-muted" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-dark text-base leading-snug">{product.name}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {product.weight && <span className="text-xs text-muted">{product.weight}</span>}
                <span className="text-xs text-muted capitalize bg-gray-100 px-2 py-0.5 rounded-full">{product.category}</span>
                <span className="text-xs font-semibold text-dark">₹{product.price}</span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] text-muted uppercase tracking-widest mb-1">Current Stock</p>
              <span className={`text-lg font-bold px-3 py-1 rounded-xl border ${stockColor(product.stock)}`}>
                {product.stock} units
              </span>
            </div>
          </div>
        </div>

        {/* Movement table */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-cream rounded-xl animate-pulse" />)}
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-16 text-muted">
              <History className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-semibold">No movements recorded yet</p>
              <p className="text-sm mt-1">Stock changes will appear here.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white border-b border-border z-10">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Date & Time</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Type</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Quantity</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Note / Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {movements.map((m) => {
                  const cfg = TYPE_CONFIG[m.type] ?? TYPE_CONFIG.adjustment;
                  return (
                    <tr key={m.id} className="hover:bg-cream/40 transition-colors">
                      <td className="px-5 py-3 text-xs text-muted whitespace-nowrap">
                        {fmtDateTime(m.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-bold ${cfg.qty}`}>
                          {cfg.sign}{m.quantity}
                        </span>
                        <span className="text-xs text-muted ml-1">units</span>
                      </td>
                      <td className="px-4 py-3">
                        {m.note ? (
                          <p className="text-sm text-dark">{m.note}</p>
                        ) : m.reference_id ? (
                          <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg border border-gray-200">
                            {m.reference_id}
                          </span>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Summary footer */}
        {movements.length > 0 && (
          <div className="border-t border-border px-6 py-4 shrink-0 bg-cream/30">
            <div className="flex items-center gap-6 flex-wrap">
              {(Object.entries(totals) as [keyof typeof totals, number][])
                .filter(([, val]) => val > 0)
                .map(([type, val]) => {
                  const cfg = TYPE_CONFIG[type];
                  return (
                    <div key={type} className="text-center">
                      <p className="text-[10px] text-muted uppercase tracking-widest mb-0.5">{cfg.label}</p>
                      <p className={`text-base font-bold ${cfg.qty}`}>{cfg.sign}{val}</p>
                    </div>
                  );
                })}
              <div className="text-center ml-auto">
                <p className="text-[10px] text-muted uppercase tracking-widest mb-0.5">Current Stock</p>
                <p className={`text-base font-bold ${stockColor(product.stock).split(' ')[0]}`}>{product.stock}</p>
              </div>
            </div>
            {movements.length >= 50 && (
              <p className="text-[10px] text-muted mt-2 text-center">Showing last 50 movements</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
