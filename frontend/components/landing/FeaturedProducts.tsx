'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star, ShieldCheck, Clock, ShoppingCart, Plus, Minus } from 'lucide-react';
import { fetchPublicProducts, fetchBundleItems } from '@/lib/api/shop';
import { useCartStore } from '@/lib/store/cartStore';
import type { BundleItem, Product } from '@/lib/types';

interface BundleProduct extends Product {
  fetchedItems: BundleItem[];
}

function BundleCard({ bundle }: { bundle: BundleProduct }) {
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const cartItem = items.find((i) => i.product.id === bundle.id);
  const quantity = cartItem?.quantity ?? 0;

  const discountPct = bundle.discount ?? (
    bundle.originalPrice
      ? Math.round(((bundle.originalPrice - bundle.price) / bundle.originalPrice) * 100)
      : 0
  );

  const mrp = bundle.fetchedItems.reduce((s, i) => s + (i.originalPrice ?? i.price) * i.quantity, 0);
  const constituentTotal = bundle.fetchedItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const productSavings = mrp - constituentTotal;
  const bundleSavings = constituentTotal - bundle.price;
  const totalSavings = mrp > 0 ? mrp - bundle.price : 0;
  const totalPct = mrp > 0 ? Math.round((totalSavings / mrp) * 100) : 0;

  return (
    <Link href={`/shop/${bundle.id}`} className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden flex flex-col hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
      {/* Image */}
      <div className="relative h-44 shrink-0 bg-cream">
        {bundle.image ? (
          <Image
            src={bundle.image}
            alt={bundle.name}
            fill
            sizes="(max-width: 768px) 100vw, 192px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">🧺</div>
        )}
        {discountPct > 0 && (
          <div className="absolute top-2 left-2 bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {discountPct}% OFF
          </div>
        )}
        <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm text-primary text-[10px] font-bold px-2 py-1 rounded-full border border-primary/20 shadow-sm">
          👨‍👩‍👧 FAMILY PACK
        </div>
      </div>

      {/* Details */}
      <div className="p-5 flex flex-col justify-between flex-1">
        <div>
          <h3
            className="text-lg font-bold text-dark mb-1"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {bundle.name}
          </h3>
          {bundle.description && (
            <p className="text-xs text-muted mb-3 line-clamp-2">{bundle.description}</p>
          )}

          {/* Item chips */}
          {bundle.fetchedItems.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {bundle.fetchedItems.map((item) => (
                <span
                  key={item.id}
                  className="text-xs font-medium text-primary bg-primary-light px-2 py-0.5 rounded-full border border-[#E8B89A]"
                >
                  {item.name}{item.weight ? ` (${item.weight})` : ''} × {item.quantity}
                </span>
              ))}
            </div>
          )}

          {/* Savings breakdown */}
          {totalSavings > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs space-y-0.5 mb-3">
              <p className="font-bold text-green-700">Save ₹{totalSavings} ({totalPct}% off MRP)</p>
              {productSavings > 0 && <p className="text-green-600">• ₹{productSavings} product discounts</p>}
              {bundleSavings > 0 && <p className="text-green-600">• ₹{bundleSavings} extra bundle deal</p>}
            </div>
          )}

          {/* Rating */}
          {bundle.rating > 0 && (
            <div className="flex items-center gap-1.5 mb-3">
              <Star className="w-3.5 h-3.5 fill-yellow text-yellow" />
              <span className="text-xs font-bold text-dark">{bundle.rating}</span>
              {bundle.reviewCount > 0 && (
                <span className="text-xs text-muted">({bundle.reviewCount.toLocaleString()} ratings)</span>
              )}
            </div>
          )}

          {/* Trust badges */}
          <div className="flex gap-4 mb-4 text-xs text-muted">
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              100% Fresh
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-primary" />
              30–45 min delivery
            </div>
          </div>
        </div>

        {/* Price + Cart */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-dark">₹{bundle.price}</span>
            {bundle.originalPrice && (
              <span className="text-sm text-muted line-through">₹{bundle.originalPrice}</span>
            )}
          </div>

          {bundle.inStock ? (
            quantity === 0 ? (
              <button
                onClick={(e) => { e.preventDefault(); addItem(bundle); }}
                className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                Add to Cart
              </button>
            ) : (
              <div className="flex items-center bg-primary rounded-xl overflow-hidden">
                <button
                  onClick={(e) => { e.preventDefault(); if (quantity === 1) removeItem(bundle.id); else updateQuantity(bundle.id, quantity - 1); }}
                  className="px-3 py-2 text-white hover:bg-primary-dark transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-3 text-white font-bold text-sm">{quantity}</span>
                <button
                  onClick={(e) => { e.preventDefault(); updateQuantity(bundle.id, quantity + 1); }}
                  disabled={quantity >= (bundle.stock ?? Infinity)}
                  className="px-3 py-2 text-white hover:bg-primary-dark disabled:opacity-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )
          ) : (
            <span className="text-xs font-semibold text-muted bg-gray-100 px-4 py-2 rounded-xl">Out of Stock</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function FeaturedProducts() {
  const [bundles, setBundles] = useState<BundleProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicProducts({ category: 'bundles', sort: 'rating', limit: 5 })
      .then(async (res) => {
        const inStock = res.products.filter((p) => p.inStock);
        const withItems = await Promise.all(
          inStock.map(async (p) => ({
            ...p,
            fetchedItems: await fetchBundleItems(p.id),
          })),
        );
        setBundles(withItems);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && bundles.length === 0) return null;

  return (
    <section className="max-w-[1200px] mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2
            className="text-2xl md:text-3xl font-bold text-dark"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Family Essentials Bundles
          </h2>
          <p className="text-sm text-muted mt-1.5">Curated baskets that feed your family for a week — at up to 25% off</p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary-light border border-primary/20 px-3 py-1 rounded-full">
          🔥 Best Value
        </span>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="min-w-[300px] max-w-[300px] shrink-0 bg-white rounded-2xl border border-border h-64 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
          {bundles.map((bundle) => (
            <div key={bundle.id} className="min-w-[300px] max-w-[300px] snap-start shrink-0">
              <BundleCard bundle={bundle} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
