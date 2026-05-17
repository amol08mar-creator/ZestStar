'use client';
import { useState, useCallback } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';

const CATEGORIES = [
  { label: '🥦 Vegetables', slug: 'vegetables' },
  { label: '🍎 Fruits', slug: 'fruits' },
  { label: '🌰 Dry Fruits', slug: 'dry-fruits' },
  { label: '🌶️ Spices', slug: 'spices' },
  { label: '🥛 Dairy', slug: 'dairy' },
  { label: '🌿 Organic', slug: 'organic' },
  { label: '🫙 Staples', slug: 'staples' },
  { label: '🍫 Snacks', slug: 'snacks' },
];

export default function SearchNav() {
  const [active, setActive] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  return (
    <section className="bg-white border-b border-border sticky top-16 z-40 shadow-sm">
      <div className="max-w-[1200px] mx-auto px-4 py-3 space-y-3">
        {/* Mobile search bar */}
        <div className="md:hidden relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search fresh vegetables, fruits..."
            value={query}
            onChange={handleSearch}
            className="w-full pl-9 pr-10 py-2.5 bg-cream border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            aria-label="Search products"
          />
          <button className="absolute right-3 top-1/2 -translate-y-1/2">
            <SlidersHorizontal className="w-4 h-4 text-muted" />
          </button>
        </div>

        {/* Category pills */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5">
          <button
            onClick={() => setActive(null)}
            className={`shrink-0 text-xs font-semibold px-4 py-2 rounded-full border transition-all duration-200 ${
              active === null
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-dark border-border hover:border-primary hover:text-primary'
            }`}
          >
            All
          </button>
          {CATEGORIES.map(({ label, slug }) => (
            <button
              key={slug}
              onClick={() => setActive(active === slug ? null : slug)}
              className={`shrink-0 text-xs font-semibold px-4 py-2 rounded-full border transition-all duration-200 ${
                active === slug
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-dark border-border hover:border-primary hover:text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
