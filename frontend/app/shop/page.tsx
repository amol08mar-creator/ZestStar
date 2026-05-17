'use client';
import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import ProductCard from '@/components/landing/ProductCard';
import { fetchPublicProducts, fetchSuggestions, type Suggestion } from '@/lib/api/shop';
import { fetchStockSubscriptions } from '@/lib/api/notifications';
import { useNotificationsStore } from '@/lib/store/notificationsStore';
import { useAuthStore } from '@/lib/store/authStore';
import type { Product } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface CategoryOption { name: string; image_url: string | null; }

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'rating', label: 'Top Rated' },
];

const DISCOUNT_OPTIONS = [0, 10, 25, 50];
const RATING_OPTIONS = [0, 1, 2, 3, 4, 5];

function highlight(text: string, query: string) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-primary font-semibold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden animate-pulse">
      <div className="h-[140px] bg-cream" />
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

function ShopContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = useAuthStore((s) => s.token);
  const setSubscribedIds = useNotificationsStore((s) => s.setSubscribedIds);

  const urlSearch = searchParams.get('q') ?? '';
  const urlCategory = searchParams.get('category') ?? '';

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [category, setCategory] = useState(urlCategory);
  const [sort, setSort] = useState('newest');
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // Inline search with autocomplete
  const [localSearch, setLocalSearch] = useState(urlSearch);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const searchRef = useRef<HTMLFormElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Advanced filters
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [minDiscount, setMinDiscount] = useState(0);
  const [inStock, setInStock] = useState(false);

  const LIMIT = 20;

  const activeFilterCount = [minPrice, maxPrice, minRating > 0, minDiscount > 0, inStock].filter(Boolean).length;

  // Keep inline search in sync when URL changes (e.g. Navbar navigates here)
  useEffect(() => { setLocalSearch(urlSearch); }, [urlSearch]);

  const load = useCallback(
    async (pg: number, append = false) => {
      if (pg === 1) setLoading(true);
      else setLoadingMore(true);
      setError('');
      try {
        const res = await fetchPublicProducts({
          search: urlSearch || undefined,
          category: category || undefined,
          sort,
          page: pg,
          limit: LIMIT,
          min_price: minPrice ? Number(minPrice) : undefined,
          max_price: maxPrice ? Number(maxPrice) : undefined,
          min_rating: minRating || undefined,
          min_discount: minDiscount || undefined,
          in_stock: inStock || undefined,
        });
        setProducts((prev) => (append ? [...prev, ...res.products] : res.products));
        setTotal(res.total);
        setPage(pg);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load products');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [urlSearch, category, sort, minPrice, maxPrice, minRating, minDiscount, inStock],
  );

  useEffect(() => {
    fetch(`${API}/categories`)
      .then((r) => r.json())
      .then((json) => setCategories(json?.data?.categories ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (token) {
      fetchStockSubscriptions(token).then(setSubscribedIds).catch(() => {});
    }
  }, [token, setSubscribedIds]);

  useEffect(() => {
    const timer = setTimeout(() => load(1), urlSearch ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, urlSearch]);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setActiveIdx(-1);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSearchChange(value: string) {
    setLocalSearch(value);
    setActiveIdx(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const results = await fetchSuggestions(value);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 200);
  }

  function navigateSearch(q: string) {
    setShowSuggestions(false);
    setActiveIdx(-1);
    const url = q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : '/shop';
    router.replace(url);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (activeIdx >= 0 && suggestions[activeIdx]) {
      const name = suggestions[activeIdx].name;
      setLocalSearch(name);
      navigateSearch(name);
    } else {
      navigateSearch(localSearch);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)); }
    else if (e.key === 'Escape') { setShowSuggestions(false); setActiveIdx(-1); }
  }

  function selectSuggestion(name: string) {
    setLocalSearch(name);
    navigateSearch(name);
  }

  function handleCategoryChange(val: string) {
    setCategory(val);
    setPage(1);
  }

  const hasMore = products.length < total;

  return (
    <div className="min-h-screen bg-cream pb-24 md:pb-8">
      <Navbar />

      <main className="max-w-[1200px] mx-auto px-4 pt-6 space-y-4">
        {/* Title row */}
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-dark" style={{ fontFamily: 'var(--font-serif)' }}>
            {urlSearch ? `Results for "${urlSearch}"` : 'All Products'}
          </h1>
          {!loading && (
            <span className="text-sm text-muted">({total} item{total !== 1 ? 's' : ''})</span>
          )}
          {urlSearch && (
            <button
              onClick={() => router.push('/shop')}
              className="ml-auto text-xs text-primary hover:underline"
            >
              Clear search
            </button>
          )}
        </div>

        {/* Inline search with autocomplete */}
        <form onSubmit={handleSearchSubmit} ref={searchRef} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search products…"
            className="w-full pl-9 pr-10 py-2.5 border border-border rounded-2xl text-sm bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => { setLocalSearch(''); setSuggestions([]); setShowSuggestions(false); router.replace('/shop'); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-dark"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-2xl shadow-xl z-30 overflow-hidden">
              {suggestions.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => selectSuggestion(s.name)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === activeIdx ? 'bg-cream' : 'hover:bg-cream'}`}
                >
                  {s.image_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={s.image_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0 border border-border" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-dark truncate">{highlight(s.name, localSearch)}</p>
                    <p className="text-xs text-muted">{s.category}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </form>

        {/* Category + filter controls row */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 flex-1 scrollbar-hide">
            <button
              onClick={() => handleCategoryChange('')}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                category === ''
                  ? 'bg-primary text-white'
                  : 'bg-white text-dark border border-border hover:border-primary hover:text-primary'
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.name}
                onClick={() => handleCategoryChange(c.name)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  category === c.name
                    ? 'bg-primary text-white'
                    : 'bg-white text-dark border border-border hover:border-primary hover:text-primary'
                }`}
              >
                {c.image_url && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={c.image_url} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
                {c.name}
              </button>
            ))}
          </div>

          {/* Filters + sort */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-sm font-semibold transition-colors ${
                filtersOpen || activeFilterCount > 0
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-border text-muted hover:text-dark hover:border-gray-300'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-primary text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-3 py-1.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:border-primary"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Collapsible filter panel */}
        {filtersOpen && (
          <div className="bg-white border border-border rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Price range */}
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Price (₹)</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  min={0}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full px-2 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                />
                <span className="text-muted shrink-0">–</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  min={0}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full px-2 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Min rating */}
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Min Rating</p>
              <div className="flex gap-1 flex-wrap">
                {RATING_OPTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setMinRating(r)}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      minRating === r ? 'bg-primary text-white' : 'bg-gray-100 text-muted hover:bg-gray-200'
                    }`}
                  >
                    {r === 0 ? 'Any' : `${r}★`}
                  </button>
                ))}
              </div>
            </div>

            {/* Discount */}
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Min Discount</p>
              <div className="flex gap-1 flex-wrap">
                {DISCOUNT_OPTIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setMinDiscount(d)}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      minDiscount === d ? 'bg-primary text-white' : 'bg-gray-100 text-muted hover:bg-gray-200'
                    }`}
                  >
                    {d === 0 ? 'Any' : `${d}%+`}
                  </button>
                ))}
              </div>
            </div>

            {/* In-stock toggle */}
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Availability</p>
              <button
                onClick={() => setInStock((v) => !v)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                  inStock ? 'bg-primary text-white border-primary' : 'bg-white text-muted border-border hover:border-primary hover:text-dark'
                }`}
              >
                {inStock && <span>✓</span>}
                In Stock Only
              </button>
            </div>
          </div>
        )}

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {(minPrice || maxPrice) && (
              <span className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                ₹{minPrice || '0'} – {maxPrice ? `₹${maxPrice}` : '∞'}
                <button onClick={() => { setMinPrice(''); setMaxPrice(''); }} className="ml-1 hover:opacity-70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {minRating > 0 && (
              <span className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                {minRating}★ & above
                <button onClick={() => setMinRating(0)} className="ml-1 hover:opacity-70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {minDiscount > 0 && (
              <span className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                {minDiscount}%+ off
                <button onClick={() => setMinDiscount(0)} className="ml-1 hover:opacity-70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {inStock && (
              <span className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                In Stock Only
                <button onClick={() => setInStock(false)} className="ml-1 hover:opacity-70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={() => { setMinPrice(''); setMaxPrice(''); setMinRating(0); setMinDiscount(0); setInStock(false); }}
              className="px-3 py-1 text-xs font-semibold text-muted hover:text-dark transition-colors"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        {/* Product grid */}
        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3">
            {Array.from({ length: 14 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-lg font-semibold text-dark mb-1">No products found</p>
            <p className="text-sm text-muted">Try adjusting your search or filters.</p>
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setMinPrice(''); setMaxPrice(''); setMinRating(0); setMinDiscount(0); setInStock(false); }}
                className="mt-4 text-sm text-primary hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} compact />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => load(page + 1, true)}
                  disabled={loadingMore}
                  className="px-8 py-2.5 border border-border rounded-xl text-sm font-semibold text-dark hover:bg-white hover:border-primary transition-colors disabled:opacity-50"
                >
                  {loadingMore ? 'Loading…' : `Load more (${total - products.length} remaining)`}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cream flex items-center justify-center text-muted text-sm">
        Loading…
      </div>
    }>
      <ShopContent />
    </Suspense>
  );
}
