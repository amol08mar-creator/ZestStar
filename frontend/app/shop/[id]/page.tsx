'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowLeft, Bell, BellOff, ChevronLeft, ChevronRight,
  Heart, Loader2, Minus, Plus, ShoppingCart, Star,
} from 'lucide-react';
import { useCartStore } from '@/lib/store/cartStore';
import { useAuthStore } from '@/lib/store/authStore';
import { useNotificationsStore } from '@/lib/store/notificationsStore';
import { useWishlistStore } from '@/lib/store/wishlistStore';
import { fetchProduct, fetchBundleItems, fetchPublicProducts } from '@/lib/api/shop';
import { fetchProductReviews, fetchReviewSummary, checkCanReview, submitReview, type Review, type ReviewSummary } from '@/lib/api/reviews';
import { subscribeToStock, unsubscribeFromStock } from '@/lib/api/notifications';
import { fetchWishlist, addToWishlist, removeFromWishlist } from '@/lib/api/wishlist';
import ProductCard from '@/components/landing/ProductCard';
import SubscribeModal from '@/components/SubscribeModal';
import StarSelector from '@/components/StarSelector';
import Navbar from '@/components/landing/Navbar';
import type { BundleItem, Product } from '@/lib/types';

function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const w = size === 'md' ? 'w-4 h-4' : 'w-3 h-3';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${w} ${s <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-gray-200'}`}
        />
      ))}
    </div>
  );
}

function ProductDetailContent() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  // Stores
  const cartItems = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const token = useAuthStore((s) => s.token);
  const subscribedIds = useNotificationsStore((s) => s.subscribedIds);
  const addSubscription = useNotificationsStore((s) => s.addSubscription);
  const removeSubscription = useNotificationsStore((s) => s.removeSubscription);
  const wishlistIds = useWishlistStore((s) => s.wishlistIds);
  const wishlistHydrated = useWishlistStore((s) => s.hydrated);
  const setWishlistIds = useWishlistStore((s) => s.setWishlistIds);
  const setWishlistHydrated = useWishlistStore((s) => s.setHydrated);
  const addWishlist = useWishlistStore((s) => s.addToWishlist);
  const removeWishlist = useWishlistStore((s) => s.removeFromWishlist);

  // Product state
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);

  // Bundle state
  const [bundleItems, setBundleItems] = useState<BundleItem[]>([]);

  // Reviews state
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Write review state
  const [canReview, setCanReview] = useState<{ can: boolean; order_id?: string }>({ can: false });
  const [myRating, setMyRating] = useState(0);
  const [myText, setMyText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Related state
  const [related, setRelated] = useState<Product[]>([]);

  // UI state
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [showSubscribe, setShowSubscribe] = useState(false);

  const cartItem = cartItems.find((i) => i.product.id === id);
  const qty = cartItem?.quantity ?? 0;
  const isSubscribed = subscribedIds.includes(id);
  const isWishlisted = wishlistIds.includes(id);

  // Hydrate wishlist once
  useEffect(() => {
    if (!token || wishlistHydrated) return;
    setWishlistHydrated(true);
    fetchWishlist(token).then(setWishlistIds).catch(() => {});
  }, [token, wishlistHydrated, setWishlistIds, setWishlistHydrated]);

  // Load product + summary + bundle
  useEffect(() => {
    setLoading(true);
    setError('');
    fetchProduct(id)
      .then((p) => {
        setProduct(p);
        // Load bundle items, review summary, related products in parallel
        if (p.category === 'bundles') {
          fetchBundleItems(id).then(setBundleItems).catch(() => {});
        }
        fetchReviewSummary(id).then(setSummary).catch(() => {});
        fetchPublicProducts({ category: p.category, limit: 7 })
          .then((res) => setRelated(res.products.filter((r) => r.id !== id).slice(0, 6)))
          .catch(() => {});
        if (token) {
          checkCanReview(token, id).then(setCanReview).catch(() => {});
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Product not found'))
      .finally(() => setLoading(false));
  }, [id, token]);

  // Load reviews page
  const loadReviews = useCallback(async (pg: number) => {
    setReviewsLoading(true);
    try {
      const res = await fetchProductReviews(id, pg);
      setReviews(res.reviews);
      setReviewTotal(res.total);
      setReviewPage(pg);
    } catch { /* silent */ } finally {
      setReviewsLoading(false);
    }
  }, [id]);

  useEffect(() => { loadReviews(1); }, [loadReviews]);

  async function handleToggleNotify() {
    if (!token) { router.push('/login'); return; }
    setNotifyLoading(true);
    try {
      if (isSubscribed) {
        await unsubscribeFromStock(token, id);
        removeSubscription(id);
      } else {
        await subscribeToStock(token, id);
        addSubscription(id);
      }
    } catch { /* silent */ } finally { setNotifyLoading(false); }
  }

  async function handleToggleWishlist() {
    if (!token) { router.push('/login'); return; }
    if (isWishlisted) {
      removeWishlist(id);
      removeFromWishlist(token, id).catch(() => addWishlist(id));
    } else {
      addWishlist(id);
      addToWishlist(token, id).catch(() => removeWishlist(id));
    }
  }

  async function handleSubmitReview() {
    if (!token || !canReview.can || !canReview.order_id || myRating === 0) return;
    setSubmittingReview(true);
    try {
      await submitReview(token, { product_id: id, order_id: canReview.order_id, rating: myRating, review_text: myText || undefined });
      setReviewSuccess(true);
      setCanReview({ can: false });
      fetchReviewSummary(id).then(setSummary).catch(() => {});
      loadReviews(1);
    } catch { /* silent */ } finally { setSubmittingReview(false); }
  }

  if (loading) return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-8">
        <div className="animate-pulse space-y-6">
          <div className="h-5 w-24 bg-gray-200 rounded" />
          <div className="grid md:grid-cols-2 gap-8">
            <div className="h-80 bg-gray-200 rounded-2xl" />
            <div className="space-y-4">
              <div className="h-4 w-20 bg-gray-200 rounded" />
              <div className="h-8 bg-gray-200 rounded" />
              <div className="h-4 w-16 bg-gray-200 rounded" />
              <div className="h-16 bg-gray-200 rounded" />
              <div className="h-12 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (error || !product) return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-16 text-center">
        <p className="text-4xl mb-4">😕</p>
        <p className="text-lg font-semibold text-dark mb-2">{error || 'Product not found'}</p>
        <button onClick={() => router.push('/shop')} className="text-primary hover:underline text-sm font-semibold">
          Back to Shop
        </button>
      </div>
    </div>
  );

  const totalReviewPages = Math.ceil(reviewTotal / 10);
  const maxStar = summary ? Math.max(...Object.values(summary.distribution), 1) : 1;

  return (
    <div className="min-h-screen bg-cream pb-16">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-5 space-y-10">

        {/* Back */}
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted hover:text-dark transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* ── Hero ── */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Image gallery */}
          {(() => {
            const allImages = (product.images?.length ? product.images : [product.image]).filter(Boolean) as string[];
            const activeImage = allImages[activeIdx] ?? allImages[0] ?? '/placeholder.png';
            return (
              <div className="space-y-3">
                {/* Main image */}
                <div className="relative aspect-square max-h-96 w-full rounded-3xl overflow-hidden bg-white border border-border">
                  <Image
                    src={activeImage}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-contain p-4 transition-all duration-200"
                    priority
                  />
                  {/* Prev / Next arrows */}
                  {allImages.length > 1 && (
                    <>
                      <button
                        onClick={() => setActiveIdx((i) => (i - 1 + allImages.length) % allImages.length)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/85 backdrop-blur-sm shadow rounded-full p-1.5 hover:bg-white transition-colors"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="w-4 h-4 text-dark" />
                      </button>
                      <button
                        onClick={() => setActiveIdx((i) => (i + 1) % allImages.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/85 backdrop-blur-sm shadow rounded-full p-1.5 hover:bg-white transition-colors"
                        aria-label="Next image"
                      >
                        <ChevronRight className="w-4 h-4 text-dark" />
                      </button>
                    </>
                  )}
                  {product.discount && product.inStock && (
                    <span className="absolute top-4 left-4 bg-accent text-white text-sm font-bold px-3 py-1 rounded-full">
                      -{product.discount}%
                    </span>
                  )}
                  {/* Dot indicators */}
                  {allImages.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {allImages.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveIdx(i)}
                          className={`h-1.5 rounded-full transition-all ${i === activeIdx ? 'bg-primary w-4' : 'bg-gray-300 w-1.5'}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
                {/* Thumbnail strip */}
                {allImages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {allImages.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveIdx(i)}
                        className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                          i === activeIdx ? 'border-primary' : 'border-border opacity-60 hover:opacity-100'
                        }`}
                      >
                        <Image src={img} alt={`${product.name} view ${i + 1}`} width={64} height={64} className="object-cover w-full h-full" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Info */}
          <div className="flex flex-col gap-4">
            {/* Category chip */}
            <button
              onClick={() => router.push(`/shop?category=${encodeURIComponent(product.category)}`)}
              className="self-start text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full hover:bg-primary/20 transition-colors"
            >
              {product.category}
            </button>

            <h1 className="text-2xl font-bold text-dark leading-snug" style={{ fontFamily: 'var(--font-serif)' }}>
              {product.name}
            </h1>

            {product.weight && (
              <p className="text-sm text-muted">Net Qty: {product.weight}</p>
            )}

            {/* Rating */}
            <a href="#reviews" className="flex items-center gap-2 hover:opacity-75 transition-opacity">
              <StarDisplay rating={product.rating} size="md" />
              <span className="text-sm font-semibold text-dark">{product.rating.toFixed(1)}</span>
              <span className="text-sm text-primary underline">
                ({product.reviewCount} review{product.reviewCount !== 1 ? 's' : ''})
              </span>
            </a>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-dark">₹{product.price}</span>
              {product.originalPrice && (
                <span className="text-lg text-muted line-through">₹{product.originalPrice}</span>
              )}
            </div>

            {/* Stock status */}
            {!product.inStock && (
              <span className="text-sm font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl self-start">
                Out of Stock
              </span>
            )}

            {/* Description */}
            {product.description && (
              <p className="text-sm text-muted leading-relaxed">{product.description}</p>
            )}

            {/* Cart controls */}
            {product.inStock ? (
              <div className="space-y-2">
                {qty === 0 ? (
                  <button
                    onClick={() => addItem(product)}
                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-2xl transition-colors"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Add to Cart
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => qty === 1 ? removeItem(product.id) : updateQuantity(product.id, qty - 1)}
                      className="w-11 h-11 rounded-xl bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-primary transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-xl font-bold text-dark w-8 text-center">{qty}</span>
                    <button
                      onClick={() => updateQuantity(product.id, qty + 1)}
                      className="w-11 h-11 rounded-xl bg-primary hover:bg-primary-dark flex items-center justify-center text-white transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-muted ml-2">in cart</span>
                  </div>
                )}
                {token && (
                  <button
                    onClick={() => setShowSubscribe(true)}
                    className="w-full text-sm font-semibold text-primary hover:text-primary-dark border border-primary/30 hover:bg-primary/5 py-2.5 rounded-2xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    🔄 Subscribe & Save 5%
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={handleToggleNotify}
                disabled={notifyLoading}
                className={`flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-semibold text-sm transition-colors disabled:opacity-60 border ${
                  isSubscribed
                    ? 'border-primary/30 text-primary bg-primary/5 hover:bg-primary/10'
                    : 'border-border text-muted hover:border-primary hover:text-primary bg-white'
                }`}
              >
                {notifyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isSubscribed ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                {isSubscribed ? 'Cancel Notification' : 'Notify When Available'}
              </button>
            )}

            {/* Wishlist */}
            <button
              onClick={handleToggleWishlist}
              className={`flex items-center gap-2 text-sm font-semibold transition-colors ${
                isWishlisted ? 'text-red-500' : 'text-muted hover:text-red-400'
              }`}
            >
              <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-red-500' : ''}`} />
              {isWishlisted ? 'Saved to Wishlist' : 'Add to Wishlist'}
            </button>
          </div>
        </div>

        {/* ── Bundle Contents ── */}
        {product.category === 'bundles' && bundleItems.length > 0 && (
          <section className="bg-white rounded-2xl border border-border p-6">
            <h2 className="text-lg font-bold text-dark mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
              What's Inside
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {bundleItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-cream rounded-xl">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-border shrink-0 bg-white">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.name} width={48} height={48} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-dark truncate">{item.name}</p>
                    {item.weight && <p className="text-xs text-muted">{item.weight}</p>}
                  </div>
                  <span className="text-xs font-bold text-primary shrink-0">×{item.quantity}</span>
                </div>
              ))}
            </div>
            {(() => {
              const mrp = bundleItems.reduce((s, i) => s + (i.originalPrice ?? i.price) * i.quantity, 0);
              const constituentTotal = bundleItems.reduce((s, i) => s + i.price * i.quantity, 0);
              const productSavings = mrp - constituentTotal;
              const bundleSavings = constituentTotal - product.price;
              const totalSavings = mrp - product.price;
              const totalPct = mrp > 0 ? Math.round((totalSavings / mrp) * 100) : 0;
              if (totalSavings <= 0) return null;
              return (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-2xl p-4 space-y-2">
                  <p className="text-sm font-bold text-green-700">You save ₹{totalSavings} ({totalPct}% off MRP)</p>
                  <div className="text-xs text-green-600 space-y-1">
                    {mrp > 0 && (
                      <div className="flex justify-between">
                        <span>MRP if bought separately</span>
                        <s className="text-gray-400">₹{mrp}</s>
                      </div>
                    )}
                    {productSavings > 0 && (
                      <div className="flex justify-between">
                        <span>Product discounts</span>
                        <span>-₹{productSavings}</span>
                      </div>
                    )}
                    {bundleSavings > 0 && (
                      <div className="flex justify-between font-semibold">
                        <span>Extra bundle deal</span>
                        <span>-₹{bundleSavings}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-green-700 border-t border-green-200 pt-1 mt-1">
                      <span>Bundle price</span>
                      <span>₹{product.price}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </section>
        )}

        {/* ── Reviews ── */}
        <section id="reviews" className="space-y-6">
          <h2 className="text-lg font-bold text-dark" style={{ fontFamily: 'var(--font-serif)' }}>
            Customer Reviews
          </h2>

          {/* Summary */}
          {summary && (
            <div className="bg-white rounded-2xl border border-border p-5 flex flex-col sm:flex-row gap-6">
              <div className="text-center shrink-0">
                <p className="text-5xl font-bold text-dark">{summary.average.toFixed(1)}</p>
                <StarDisplay rating={summary.average} size="md" />
                <p className="text-xs text-muted mt-1">{summary.total} review{summary.total !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex-1 space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = summary.distribution[String(star)] ?? 0;
                  const pct = maxStar > 0 ? Math.round((count / maxStar) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted w-6 shrink-0">{star}★</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted w-6 text-right shrink-0">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Write a review */}
          {canReview.can && !reviewSuccess && (
            <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
              <h3 className="font-semibold text-dark text-sm">Write a Review</h3>
              <StarSelector value={myRating} onChange={setMyRating} />
              <textarea
                value={myText}
                onChange={(e) => setMyText(e.target.value)}
                placeholder="Share your experience (optional)"
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 border border-border rounded-xl text-sm resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={handleSubmitReview}
                disabled={submittingReview || myRating === 0}
                className="bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
              >
                {submittingReview ? 'Submitting…' : 'Submit Review'}
              </button>
            </div>
          )}
          {reviewSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl font-medium">
              ✓ Review submitted — thank you!
            </div>
          )}

          {/* Review list */}
          {reviewsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-center text-muted text-sm py-8">No reviews yet. Be the first!</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-dark">{r.reviewer_name}</p>
                      <p className="text-xs text-muted">
                        {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <StarDisplay rating={r.rating} />
                  </div>
                  {r.review_text && <p className="text-sm text-dark leading-relaxed">{r.review_text}</p>}
                </div>
              ))}

              {/* Pagination */}
              {totalReviewPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => loadReviews(reviewPage - 1)}
                    disabled={reviewPage === 1}
                    className="p-2 border border-border rounded-xl text-muted hover:text-dark disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-muted">{reviewPage} / {totalReviewPages}</span>
                  <button
                    onClick={() => loadReviews(reviewPage + 1)}
                    disabled={reviewPage === totalReviewPages}
                    className="p-2 border border-border rounded-xl text-muted hover:text-dark disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Related Products ── */}
        {related.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-dark" style={{ fontFamily: 'var(--font-serif)' }}>
              More from {product.category}
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} compact />
              ))}
            </div>
          </section>
        )}
      </div>

      {showSubscribe && (
        <SubscribeModal product={product} onClose={() => setShowSubscribe(false)} />
      )}
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cream flex items-center justify-center text-muted text-sm">Loading…</div>
    }>
      <ProductDetailContent />
    </Suspense>
  );
}
