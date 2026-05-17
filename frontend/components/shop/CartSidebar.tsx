'use client';
import { X, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/store/cartStore';
import Image from 'next/image';

export default function CartSidebar() {
  const router = useRouter();
  const cartOpen = useCartStore((s) => s.cartOpen);
  const setCartOpen = useCartStore((s) => s.setCartOpen);
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const getTotalPrice = useCartStore((s) => s.getTotalPrice);
  const getDeliveryFee = useCartStore((s) => s.getDeliveryFee);
  const getGrandTotal = useCartStore((s) => s.getGrandTotal);
  const clearCart = useCartStore((s) => s.clearCart);

  const subtotal = getTotalPrice();
  const deliveryFee = getDeliveryFee();
  const grandTotal = getGrandTotal();
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  function goToCheckout() {
    setCartOpen(false);
    router.push('/checkout');
  }

  return (
    <>
      {cartOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 transition-opacity" onClick={() => setCartOpen(false)} aria-hidden />
      )}

      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-white shadow-2xl flex flex-col transition-transform duration-300 ${
          cartOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-dark text-lg" style={{ fontFamily: 'var(--font-serif)' }}>Your Cart</h2>
            {itemCount > 0 && (
              <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">{itemCount}</span>
            )}
          </div>
          <button onClick={() => setCartOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors text-muted" aria-label="Close cart">
            <X className="w-5 h-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
            <div className="w-16 h-16 bg-cream rounded-full flex items-center justify-center text-3xl">🛒</div>
            <p className="font-semibold text-dark">Your cart is empty</p>
            <p className="text-sm text-muted">Add some fresh products to get started.</p>
            <button onClick={() => setCartOpen(false)} className="mt-2 bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
              Browse Products
            </button>
          </div>
        ) : (
          <>
            {/* 30-min promise banner */}
            <div className="mx-4 mt-3 bg-primary-light text-primary text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-2">
              <span>🚀</span>
              <span>Delivering in 30 minutes to your door</span>
            </div>

            <ul className="flex-1 overflow-y-auto divide-y divide-border px-5 py-2">
              {items.map(({ product, quantity }) => (
                <li key={product.id} className="py-4 flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-cream shrink-0 flex items-center justify-center">
                    {product.image ? (
                      <Image src={product.image} alt={product.name} width={56} height={56} className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-2xl">📦</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-dark text-sm leading-snug line-clamp-2">{product.name}</p>
                    {product.weight && <p className="text-xs text-muted mt-0.5">{product.weight}</p>}
                    <p className="text-sm font-bold text-primary mt-1">₹{product.price * quantity}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button onClick={() => removeItem(product.id)} className="p-1 text-muted hover:text-red-500 transition-colors" aria-label={`Remove ${product.name}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center bg-primary rounded-lg overflow-hidden">
                      <button onClick={() => updateQuantity(product.id, quantity - 1)} className="px-2 py-1 text-white hover:bg-primary-dark transition-colors">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 text-white font-bold text-xs min-w-[1.5rem] text-center">{quantity}</span>
                      <button onClick={() => updateQuantity(product.id, quantity + 1)} className="px-2 py-1 text-white hover:bg-primary-dark transition-colors">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Footer */}
            <div className="border-t border-border px-5 py-4 space-y-3 bg-white">
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Subtotal</span>
                  <span className="font-semibold text-dark">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Delivery fee</span>
                  {deliveryFee === 0
                    ? <span className="text-green-600 font-semibold">FREE</span>
                    : <span className="font-semibold text-dark">₹{deliveryFee}</span>}
                </div>
                {deliveryFee > 0 && (
                  <p className="text-[10px] text-muted">Add ₹{500 - subtotal} more for free delivery</p>
                )}
                <div className="flex justify-between pt-1.5 border-t border-border">
                  <span className="font-bold text-dark">Total</span>
                  <span className="text-lg font-bold text-dark">₹{grandTotal}</span>
                </div>
              </div>

              <button
                onClick={goToCheckout}
                className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                Proceed to Checkout — ₹{grandTotal}
              </button>

              <button onClick={clearCart} className="w-full text-xs text-muted hover:text-red-500 transition-colors py-1">
                Clear cart
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
