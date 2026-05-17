'use client';
import { useEffect, useState } from 'react';
import { AlertTriangle, FileText, Package, RefreshCw } from 'lucide-react';
import { fetchLowStock } from '@/lib/api/products';

const LOW_STOCK_THRESHOLD = 10;

interface LowProduct {
  id: string;
  name: string;
  category: string;
  stock: number;
  image_url: string | null;
}

interface Props {
  token: string;
  onAddStock: (product: { id: string; name: string }) => void;
}

function stockBadge(stock: number): { cls: string; label: string } {
  if (stock === 0) return { cls: 'bg-red-100 text-red-700 border-red-200', label: 'Out of stock' };
  if (stock <= 5) return { cls: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Critical' };
  return { cls: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Low stock' };
}

export default function LowStockPanel({ token, onAddStock }: Props) {
  const [products, setProducts] = useState<LowProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetchLowStock(token);
      setProducts((res.data.products ?? []) as LowProduct[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const outCount = products.filter((p) => p.stock === 0).length;
  const lowCount = products.filter((p) => p.stock > 0).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-orange-500" />
          <div>
            <h1 className="text-xl font-bold text-dark" style={{ fontFamily: 'var(--font-serif)' }}>
              Low Stock Reorder
            </h1>
            {!loading && products.length > 0 && (
              <p className="text-xs text-muted mt-0.5">
                {outCount > 0 && <span className="text-red-600 font-semibold">{outCount} out of stock</span>}
                {outCount > 0 && lowCount > 0 && <span className="mx-1">·</span>}
                {lowCount > 0 && <span>{lowCount} low stock</span>}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 border border-border rounded-xl text-muted hover:text-dark hover:bg-white transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="bg-white border border-border rounded-2xl divide-y divide-border">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4 animate-pulse">
              <div className="w-11 h-11 bg-gray-100 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-44" />
                <div className="h-3 bg-gray-100 rounded w-24" />
              </div>
              <div className="w-32 h-9 bg-gray-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white border border-border rounded-2xl text-center py-24">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7 text-primary" />
          </div>
          <p className="font-bold text-dark mb-1">All stocked up!</p>
          <p className="text-sm text-muted">No products with low or zero stock right now.</p>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-2xl divide-y divide-border overflow-hidden">
          {/* Column headers */}
          <div className="hidden sm:grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-2 bg-cream text-xs font-semibold text-muted uppercase tracking-wide">
            <span>Product</span>
            <span className="text-center w-28">Current Stock</span>
            <span className="text-right w-36">Action</span>
          </div>

          {products.map((product) => {
            const { cls, label } = stockBadge(product.stock);

            return (
              <div key={product.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
                {/* Product info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-11 h-11 rounded-xl object-cover border border-border shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-cream flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-muted" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-dark text-sm truncate">{product.name}</p>
                    <p className="text-xs text-muted">{product.category}</p>
                  </div>
                </div>

                {/* Stock badge */}
                <div className="shrink-0 text-center w-28">
                  <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border ${cls}`}>
                    {product.stock} in stock
                  </span>
                  <p className="text-[10px] text-muted mt-0.5">{label}</p>
                </div>

                {/* Action */}
                <div className="shrink-0 w-36 flex justify-end">
                  <button
                    onClick={() => onAddStock({ id: product.id, name: product.name })}
                    className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors whitespace-nowrap"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Add Stock
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
