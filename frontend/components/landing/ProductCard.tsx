'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Bell, BellOff, Heart, Loader2, Minus, Plus, ShoppingCart, Star } from 'lucide-react';
import { useCartStore } from '@/lib/store/cartStore';
import { useAuthStore } from '@/lib/store/authStore';
import { useNotificationsStore } from '@/lib/store/notificationsStore';
import { useWishlistStore } from '@/lib/store/wishlistStore';
import { subscribeToStock, unsubscribeFromStock } from '@/lib/api/notifications';
import { fetchWishlist, addToWishlist, removeFromWishlist } from '@/lib/api/wishlist';
import { fetchBundleItems } from '@/lib/api/shop';
import ReviewsModal from '@/components/ReviewsModal';
import SubscribeModal from '@/components/SubscribeModal';
import type { BundleItem, Product } from '@/lib/types';

function BundleItemsList({ productId, bundlePrice }: { productId: string; bundlePrice: number }) {
  const [items, setItems] = useState<BundleItem[]>([]);

  useEffect(() => {
    fetchBundleItems(productId).then(setItems).catch(() => {});
  }, [productId]);

  if (items.length === 0) return null;

  const mrp = items.reduce((s, i) => s + (i.originalPrice ?? i.price) * i.quantity, 0);
  const constituentTotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const productSavings = mrp - constituentTotal;
  const bundleSavings = constituentTotal - bundlePrice;
  const totalSavings = mrp - bundlePrice;
  const totalPct = mrp > 0 ? Math.round((totalSavings / mrp) * 100) : 0;

  return (
    <div className="border-t border-border pt-2 mb-2 space-y-1">
      <ul className="text-xs text-muted space-y-0.5">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-1">
            <span className="truncate min-w-0">
              • {item.name}{item.weight ? ` (${item.weight})` : ''} × {item.quantity}
            </span>
            {item.originalPrice && item.originalPrice > item.price ? (
              <span className="shrink-0 text-right text-[10px]">
                <s className="text-gray-400">₹{item.originalPrice * item.quantity}</s>{' '}
                <span className="text-dark font-medium">₹{item.price * item.quantity}</span>
              </span>
            ) : (
              <span className="shrink-0 text-[10px]">₹{item.price * item.quantity}</span>
            )}
          </li>
        ))}
      </ul>
      {totalSavings > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-2 py-1.5 text-[10px] space-y-0.5">
          <p className="font-bold text-green-700">Save ₹{totalSavings} ({totalPct}% off MRP)</p>
          {productSavings > 0 && <p className="text-green-600">• ₹{productSavings} product discounts</p>}
          {bundleSavings > 0 && <p className="text-green-600">• ₹{bundleSavings} extra bundle deal</p>}
        </div>
      )}
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  compact?: boolean;
}

export default function ProductCard({ product, compact = false }: ProductCardProps) {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const subscribedIds = useNotificationsStore((s) => s.subscribedIds);
  const addSubscription = useNotificationsStore((s) => s.addSubscription);
  const removeSubscription = useNotificationsStore((s) => s.removeSubscription);

  const wishlistIds = useWishlistStore((s) => s.wishlistIds);
  const wishlistHydrated = useWishlistStore((s) => s.hydrated);
  const setWishlistIds = useWishlistStore((s) => s.setWishlistIds);
  const setWishlistHydrated = useWishlistStore((s) => s.setHydrated);
  const addWishlist = useWishlistStore((s) => s.addToWishlist);
  const removeWishlist = useWishlistStore((s) => s.removeFromWishlist);

  const [notifyLoading, setNotifyLoading] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [showSubscribe, setShowSubscribe] = useState(false);

  const isWishlisted = wishlistIds.includes(product.id);

  // Hydrate wishlist once across all cards
  useEffect(() => {
    if (!token || wishlistHydrated) return;
    setWishlistHydrated(true);
    fetchWishlist(token).then(setWishlistIds).catch(() => {});
  }, [token, wishlistHydrated, setWishlistIds, setWishlistHydrated]);

  async function handleToggleWishlist() {
    if (!token) { router.push('/login'); return; }
    if (isWishlisted) {
      removeWishlist(product.id);
      removeFromWishlist(token, product.id).catch(() => addWishlist(product.id));
    } else {
      addWishlist(product.id);
      addToWishlist(token, product.id).catch(() => removeWishlist(product.id));
    }
  }

  const cartItem = items.find((i) => i.product.id === product.id);
  const quantity = cartItem?.quantity ?? 0;
  const isSubscribed = subscribedIds.includes(product.id);

  async function handleToggleNotify() {
    if (!token) { router.push('/login'); return; }
    setNotifyLoading(true);
    try {
      if (isSubscribed) {
        await unsubscribeFromStock(token, product.id);
        removeSubscription(product.id);
      } else {
        await subscribeToStock(token, product.id);
        addSubscription(product.id);
      }
    } catch { /* silent */ } finally {
      setNotifyLoading(false);
    }
  }

  return (
    <>
    <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group flex flex-col">
      {/* Image */}
      <div
        onClick={() => router.push(`/shop/${product.id}`)}
        className="relative overflow-hidden bg-cream cursor-pointer"
        style={{ height: compact ? '140px' : '176px' }}
      >
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {product.inStock && product.category === 'bundles' && (
          <span className="absolute top-2 left-2 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            🎁 Bundle
          </span>
        )}
        {product.discount && product.inStock && product.category !== 'bundles' && (
          <span className="absolute top-2 left-2 bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full">
            -{product.discount}%
          </span>
        )}
        {/* Wishlist heart button */}
        <button
          onClick={(e) => { e.stopPropagation(); handleToggleWishlist(); }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 hover:bg-white shadow-sm flex items-center justify-center transition-all active:scale-90"
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart
            className={`w-3.5 h-3.5 transition-colors ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
          />
        </button>
        {!product.inStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-gray-600 text-xs font-semibold px-3 py-1 rounded-full">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1">
        <p className="text-xs text-muted mb-0.5 truncate">
          {product.weight ? `Net Qty: ${product.weight}` : product.description}
        </p>
        <button
          onClick={() => router.push(`/shop/${product.id}`)}
          className="font-semibold text-dark text-sm mb-1 line-clamp-1 leading-snug text-left hover:text-primary transition-colors w-full"
        >
          {product.name}
        </button>

        {/* Rating — clickable to open reviews modal */}
        <button
          onClick={() => setShowReviews(true)}
          className="flex items-center gap-1 mb-2 hover:opacity-75 transition-opacity text-left"
        >
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
          <span className="text-xs font-medium text-dark">{product.rating}</span>
          <span className="text-xs text-primary underline">
            ({product.reviewCount} review{product.reviewCount !== 1 ? 's' : ''})
          </span>
        </button>

        {/* Bundle items */}
        {product.category === 'bundles' && <BundleItemsList productId={product.id} bundlePrice={product.price} />}

        {/* Price */}
        <div className="flex items-center gap-2 mb-3 mt-auto">
          <span className="text-base font-bold text-dark">₹{product.price}</span>
          {product.originalPrice && (
            <span className="text-xs text-muted line-through">₹{product.originalPrice}</span>
          )}
        </div>

        {/* Cart Button */}
        {product.inStock ? (
          quantity === 0 ? (
            <div className="space-y-1.5">
              <button
                onClick={() => addItem(product)}
                className="w-full flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-dark active:scale-[0.98] text-white text-sm font-semibold py-2 rounded-xl transition-all duration-200"
                aria-label={`Add ${product.name} to cart`}
              >
                <ShoppingCart className="w-4 h-4" />
                Add to Cart
              </button>
              {token && (
                <button
                  onClick={() => setShowSubscribe(true)}
                  className="w-full text-[11px] font-semibold text-primary hover:text-primary-dark transition-colors py-0.5 flex items-center justify-center gap-1"
                >
                  🔄 Subscribe & Save 5%
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between bg-primary rounded-xl overflow-hidden">
              <button
                onClick={() => {
                  if (quantity === 1) removeItem(product.id);
                  else updateQuantity(product.id, quantity - 1);
                }}
                className="p-2 text-white hover:bg-primary-dark transition-colors active:scale-95"
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-white font-bold text-sm min-w-[1.5rem] text-center">
                {quantity}
              </span>
              <button
                onClick={() => updateQuantity(product.id, quantity + 1)}
                disabled={quantity >= (product.stock ?? Infinity)}
                className="p-2 text-white hover:bg-primary-dark disabled:opacity-50 transition-colors active:scale-95"
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )
        ) : (
          <div className="space-y-1.5">
            <button
              onClick={handleToggleNotify}
              disabled={notifyLoading}
              className={`w-full flex items-center justify-center gap-1.5 text-sm font-semibold py-2 rounded-xl transition-all ${
                isSubscribed
                  ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                  : 'bg-primary-light text-primary border border-primary/30 hover:bg-primary hover:text-white'
              } disabled:opacity-60`}
            >
              {notifyLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isSubscribed ? (
                <>
                  <BellOff className="w-4 h-4" />
                  <span className="group-hover:hidden">Notified ✓</span>
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  Notify Me
                </>
              )}
            </button>
            {!isSubscribed && token && !user?.email && (
              <p className="text-[10px] text-muted text-center leading-tight">
                Add email in Profile to receive alerts
              </p>
            )}
          </div>
        )}
      </div>
    </div>

    {showReviews && (
      <ReviewsModal
        productId={product.id}
        productName={product.name}
        onClose={() => setShowReviews(false)}
      />
    )}
    {showSubscribe && (
      <SubscribeModal
        product={product}
        onClose={() => setShowSubscribe(false)}
      />
    )}
    </>
  );
}
