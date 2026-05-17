'use client';
import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { fetchPublicProducts } from '@/lib/api/shop';
import type { Product } from '@/lib/types';
import ProductCard from './ProductCard';

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden animate-pulse">
      <div className="h-44 bg-cream" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-100 rounded w-3/4" />
        <div className="h-4 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-4 bg-gray-100 rounded w-1/3" />
        <div className="h-9 bg-gray-100 rounded-xl mt-3" />
      </div>
    </div>
  );
}

export default function TrendingProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicProducts({ sort: 'rating', limit: 8 })
      .then((res) => setProducts(res.products))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && products.length === 0) return null;

  return (
    <section className="max-w-[1200px] mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2
            className="text-2xl md:text-3xl font-bold text-dark"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Trending Now
          </h2>
          <p className="text-sm text-muted mt-1">Top picks across all categories</p>
        </div>
        <Link
          href="/shop?sort=rating"
          className="hidden md:flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
        >
          View All <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : products.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>

      <div className="flex justify-center mt-6">
        <Link
          href="/shop"
          className="flex items-center gap-2 border border-primary text-primary font-semibold px-6 py-2.5 rounded-xl hover:bg-primary-light transition-colors"
        >
          View All Products <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
