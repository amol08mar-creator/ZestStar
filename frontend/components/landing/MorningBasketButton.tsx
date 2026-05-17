'use client';
import { ShoppingCart, Plus, Minus } from 'lucide-react';
import { useCartStore } from '@/lib/store/cartStore';
import type { MorningBasket } from '@/lib/types';

interface Props {
  basket: MorningBasket;
}

export default function MorningBasketButton({ basket }: Props) {
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const product = {
    id: basket.id,
    name: basket.name,
    description: basket.description,
    price: basket.price,
    originalPrice: basket.originalPrice,
    discount: 33,
    rating: basket.rating,
    reviewCount: basket.reviewCount,
    image: basket.image,
    category: 'bundles',
    inStock: true,
    weight: undefined,
  };

  const cartItem = items.find((i) => i.product.id === basket.id);
  const quantity = cartItem?.quantity ?? 0;

  if (quantity === 0) {
    return (
      <button
        onClick={() => addItem(product)}
        className="flex items-center gap-2 bg-primary hover:bg-primary-dark active:scale-[0.98] text-white font-bold px-6 py-3 rounded-xl transition-all duration-200 shadow-md shadow-primary/20"
      >
        <ShoppingCart className="w-5 h-5" />
        Add to Cart
      </button>
    );
  }

  return (
    <div className="flex items-center gap-0 bg-primary rounded-xl overflow-hidden">
      <button
        onClick={() => {
          if (quantity === 1) removeItem(basket.id);
          else updateQuantity(basket.id, quantity - 1);
        }}
        className="px-4 py-3 text-white hover:bg-primary-dark transition-colors"
        aria-label="Decrease"
      >
        <Minus className="w-5 h-5" />
      </button>
      <span className="text-white font-bold text-lg min-w-[2rem] text-center">{quantity}</span>
      <button
        onClick={() => updateQuantity(basket.id, quantity + 1)}
        className="px-4 py-3 text-white hover:bg-primary-dark transition-colors"
        aria-label="Increase"
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
}
