'use client';
import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Category {
  id: string;
  name: string;
  image_url: string | null;
}

function CategorySkeleton() {
  return (
    <div className="bg-cream rounded-2xl p-4 text-center border border-border animate-pulse">
      <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-gray-200" />
      <div className="h-4 bg-gray-200 rounded mx-auto w-3/4 mb-1" />
    </div>
  );
}

export default function CategoriesGrid() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/categories`)
      .then((r) => r.json())
      .then((json) => setCategories(json?.data?.categories ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && categories.length === 0) return null;

  return (
    <section id="categories-section" className="bg-white py-12 md:py-16">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2
              className="text-2xl md:text-3xl font-bold text-dark"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Find what your <span className="text-primary">family needs</span>
            </h2>
            <p className="text-sm text-muted mt-1.5">From daily essentials to weekly meal planning</p>
          </div>
          <button
            onClick={() => router.push('/shop')}
            className="hidden md:flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
          >
            All Categories <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <CategorySkeleton key={i} />)
            : categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => router.push(`/shop?category=${encodeURIComponent(cat.name)}`)}
                  className="group bg-cream rounded-2xl p-4 text-center hover:shadow-md hover:scale-[1.02] transition-all duration-300 border border-border hover:border-[#E8B89A]"
                  aria-label={`Browse ${cat.name}`}
                >
                  <div className="w-16 h-16 mx-auto mb-3 rounded-xl overflow-hidden bg-white border border-border flex items-center justify-center">
                    {cat.image_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={cat.image_url}
                        alt={cat.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <span className="text-2xl">🏷️</span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-dark leading-snug">{cat.name}</h3>
                </button>
              ))}
        </div>
      </div>
    </section>
  );
}
