'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, Check, Heart, Share2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { useWishlistStore } from '@/lib/store/wishlistStore';
import { fetchWishlist, shareWishlist } from '@/lib/api/wishlist';
import ProductCard from '@/components/landing/ProductCard';
import type { Product } from '@/lib/types';

function toProduct(raw: Record<string, unknown>): Product {
  return {
    id: raw.id as string,
    name: raw.name as string,
    description: (raw.description as string) ?? '',
    price: raw.price as number,
    originalPrice: raw.original_price as number | undefined,
    discount: raw.discount_percent as number | undefined,
    rating: (raw.rating as number) ?? 0,
    reviewCount: (raw.review_count as number) ?? 0,
    image: (raw.image_url as string) ?? '',
    category: (raw.category as string) ?? '',
    inStock: (raw.stock as number) > 0,
    stock: raw.stock as number | undefined,
    weight: raw.weight as string | undefined,
  };
}

export default function WishlistPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const setWishlistIds = useWishlistStore((s) => s.setWishlistIds);
  const setHydrated = useWishlistStore((s) => s.setHydrated);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }

    fetch(`${API}/wishlist`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((json) => {
        const rawProducts = (json?.data?.products ?? []) as Record<string, unknown>[];
        setProducts(rawProducts.filter(Boolean).map(toProduct));
        const ids = (json?.data?.product_ids ?? []) as string[];
        setWishlistIds(ids);
        setHydrated(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, router, setWishlistIds, setHydrated, API]);

  async function handleShare() {
    if (!token) return;
    setSharing(true);
    try {
      const url = await shareWishlist(token);
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* silent */ } finally {
      setSharing(false);
    }
  }

  const oosProducts = products.filter((p) => !p.inStock);

  return (
    <div className="min-h-screen bg-cream pb-10">
      <header className="bg-white border-b border-border sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-dark" />
          </button>
          <h1 className="font-bold text-dark text-lg" style={{ fontFamily: 'var(--font-serif)' }}>My Wishlist</h1>
          {products.length > 0 && (
            <>
              <span className="text-xs text-muted">{products.length} item{products.length !== 1 ? 's' : ''}</span>
              <button
                onClick={handleShare}
                disabled={sharing}
                className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary/5 border border-primary/30 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-60"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Share'}
              </button>
            </>
          )}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-white rounded-2xl border border-border animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <Heart className="w-8 h-8 text-red-300" />
            </div>
            <p className="font-semibold text-dark mb-1">No saved items yet</p>
            <p className="text-sm text-muted mb-6">Tap the ♡ on any product to save it here</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Out-of-stock banner */}
            {oosProducts.length > 0 && (
              <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl px-4 py-3 text-sm">
                <Bell className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>{oosProducts.length} item{oosProducts.length > 1 ? 's' : ''}</strong> out of stock — tap the 🔔 on each card to get notified when they're back.
                </span>
              </div>
            )}

            {/* Price-drop note */}
            <p className="text-xs text-muted text-center">
              💰 You'll be notified by email if prices drop on wishlisted items
            </p>

            {/* Product grid */}
            <div className="grid grid-cols-2 gap-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
