'use client';
import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Heart } from 'lucide-react';
import { fetchPublicWishlist } from '@/lib/api/wishlist';
import ProductCard from '@/components/landing/ProductCard';
import Navbar from '@/components/landing/Navbar';
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

function SharedWishlistContent() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPublicWishlist(token)
      .then((raw) => setProducts(raw.filter(Boolean).map(toProduct)))
      .catch((e) => setError(e instanceof Error ? e.message : 'Wishlist not found'))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen bg-cream pb-10">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-5">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => router.push('/shop')} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-dark" />
          </button>
          <div>
            <h1 className="font-bold text-dark text-lg" style={{ fontFamily: 'var(--font-serif)' }}>
              Shared Wishlist
            </h1>
            {!loading && !error && (
              <p className="text-xs text-muted">{products.length} item{products.length !== 1 ? 's' : ''}</p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-white rounded-2xl border border-border animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-4xl mb-4">😕</p>
            <p className="font-semibold text-dark mb-1">Wishlist not found</p>
            <p className="text-sm text-muted mb-6">This share link may be invalid or expired.</p>
            <button onClick={() => router.push('/shop')} className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors">
              Browse Products
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <Heart className="w-8 h-8 text-red-300" />
            </div>
            <p className="font-semibold text-dark mb-1">This wishlist is empty</p>
            <p className="text-sm text-muted">Nothing saved here yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SharedWishlistPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cream flex items-center justify-center text-muted text-sm">
        Loading…
      </div>
    }>
      <SharedWishlistContent />
    </Suspense>
  );
}
