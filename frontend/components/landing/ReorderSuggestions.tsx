'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ShoppingCart, Plus, Minus, RotateCcw } from 'lucide-react';
import { fetchReorderSuggestions, type ReorderSuggestion } from '@/lib/api/orders';
import { useAuthStore } from '@/lib/store/authStore';
import { useCartStore } from '@/lib/store/cartStore';

export default function ReorderSuggestions() {
  const token = useAuthStore((s) => s.token);
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const [suggestions, setSuggestions] = useState<ReorderSuggestion[]>([]);

  useEffect(() => {
    if (!token) return;
    fetchReorderSuggestions(token)
      .then(setSuggestions)
      .catch(() => {});
  }, [token]);

  if (!token || suggestions.length === 0) return null;

  return (
    <section className="px-4 py-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <RotateCcw className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold text-dark" style={{ fontFamily: 'var(--font-serif)' }}>
          Order Again
        </h2>
        <span className="text-xs text-muted ml-1">Your frequent picks</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
        {suggestions.map((product) => {
          const cartItem = items.find((i) => i.product.id === product.id);
          const qty = cartItem?.quantity ?? 0;

          const asProduct = {
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image ?? '',
            description: '',
            category: product.category,
            rating: 0,
            reviewCount: 0,
            inStock: product.inStock,
            stock: product.stock,
            weight: product.weight ?? undefined,
          };

          return (
            <div
              key={product.id}
              className="flex-none w-36 bg-white rounded-2xl border border-border shadow-sm overflow-hidden snap-start"
            >
              {/* Image */}
              <div className="relative h-28 bg-cream">
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="144px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
                )}
                {!product.inStock && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <span className="text-xs font-semibold text-muted">Out of stock</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-2.5 space-y-1.5">
                <p className="text-xs font-semibold text-dark leading-tight line-clamp-2">{product.name}</p>
                {product.weight && <p className="text-[10px] text-muted">{product.weight}</p>}
                <p className="text-sm font-bold text-dark">₹{product.price}</p>

                {/* Cart control */}
                {product.inStock && (
                  qty === 0 ? (
                    <button
                      onClick={() => addItem(asProduct)}
                      className="w-full flex items-center justify-center gap-1 bg-primary hover:bg-primary-dark text-white text-xs font-semibold py-1.5 rounded-xl transition-colors"
                    >
                      <ShoppingCart className="w-3 h-3" />
                      Add
                    </button>
                  ) : (
                    <div className="flex items-center justify-between bg-primary rounded-xl overflow-hidden">
                      <button
                        onClick={() => { if (qty === 1) removeItem(product.id); else updateQuantity(product.id, qty - 1); }}
                        className="px-2 py-1.5 text-white hover:bg-primary-dark transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-white font-bold text-xs">{qty}</span>
                      <button
                        onClick={() => updateQuantity(product.id, qty + 1)}
                        disabled={qty >= product.stock}
                        className="px-2 py-1.5 text-white hover:bg-primary-dark disabled:opacity-50 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
