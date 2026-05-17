'use client';
import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { fetchPublicProducts } from '@/lib/api/shop';
import type { Product } from '@/lib/types';
import ProductCard from './ProductCard';

function SkeletonCard() {
  return (
    <div className="min-w-[160px] md:min-w-0 bg-white rounded-2xl border border-border overflow-hidden animate-pulse">
      <div className="h-[140px] bg-cream" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-100 rounded w-3/4" />
        <div className="h-4 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-9 bg-gray-100 rounded-xl mt-2" />
      </div>
    </div>
  );
}

export default function FrequentlyBought() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicProducts({ sort: 'newest', limit: 20 })
      .then((res) => setProducts(res.products.filter((p) => p.inStock).slice(0, 6)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && products.length === 0) return null;

  const items = loading ? Array.from({ length: 6 }) : products;

  return (
    <section className="max-w-[1200px] mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2
            className="text-2xl md:text-3xl font-bold text-dark"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Most Popular This Week
          </h2>
          <p className="text-sm text-muted mt-1">Loved by 10,000+ customers</p>
        </div>
        <Link
          href="/shop"
          className="hidden md:flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
        >
          View All <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Horizontal scroll on mobile, grid on desktop */}
      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 md:grid md:grid-cols-3 lg:grid-cols-6">
        {loading
          ? items.map((_, i) => <SkeletonCard key={i} />)
          : products.map((product) => (
              <div key={product.id} className="min-w-[160px] md:min-w-0">
                <ProductCard product={product} compact />
              </div>
            ))}
      </div>

      <div className="flex md:hidden justify-center mt-4">
        <Link
          href="/shop"
          className="flex items-center gap-1 text-sm font-semibold text-primary border border-primary px-5 py-2 rounded-xl hover:bg-primary-light transition-colors"
        >
          View All <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
