'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product } from '@/lib/types';

const FREE_DELIVERY_THRESHOLD = 500;
const DELIVERY_FEE = 30;

interface CartState {
  items: CartItem[];
  cartOpen: boolean;
  promoCode: string | null;
  discountAmount: number;
  coinsRedeemed: number;
  addItem: (product: Product) => void;
  addMultipleItems: (products: Product[]) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setCartOpen: (open: boolean) => void;
  setPromo: (code: string, discount: number) => void;
  clearPromo: () => void;
  setCoins: (n: number) => void;
  clearCoins: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getDeliveryFee: () => number;
  getGrandTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      cartOpen: false,
      promoCode: null,
      discountAmount: 0,
      coinsRedeemed: 0,

      setCartOpen: (open) => set({ cartOpen: open }),

      setPromo: (code, discount) => set({ promoCode: code, discountAmount: discount }),
      clearPromo: () => set({ promoCode: null, discountAmount: 0 }),

      setCoins: (n) => set({ coinsRedeemed: n }),
      clearCoins: () => set({ coinsRedeemed: 0 }),

      addItem: (product) => {
        const items = get().items;
        const existing = items.find((i) => i.product.id === product.id);
        if (existing) {
          if (existing.quantity >= (product.stock ?? Infinity)) return;
          set({
            items: items.map((i) =>
              i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
            ),
            promoCode: null,
            discountAmount: 0,
            coinsRedeemed: 0,
          });
        } else {
          set({ items: [...items, { product, quantity: 1 }], promoCode: null, discountAmount: 0, coinsRedeemed: 0 });
        }
      },

      addMultipleItems: (products) => {
        set((state) => {
          let items = [...state.items];
          for (const product of products) {
            const existing = items.find((i) => i.product.id === product.id);
            if (existing) {
              const newQty = Math.min(existing.quantity + 1, product.stock ?? Infinity);
              items = items.map((i) => i.product.id === product.id ? { ...i, quantity: newQty } : i);
            } else {
              items = [...items, { product, quantity: 1 }];
            }
          }
          return { items, promoCode: null, discountAmount: 0, coinsRedeemed: 0 };
        });
      },

      removeItem: (productId) =>
        set({ items: get().items.filter((i) => i.product.id !== productId), promoCode: null, discountAmount: 0, coinsRedeemed: 0 }),

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) { get().removeItem(productId); return; }
        const item = get().items.find((i) => i.product.id === productId);
        if (item && quantity > (item.product.stock ?? Infinity)) return;
        set({
          items: get().items.map((i) => i.product.id === productId ? { ...i, quantity } : i),
          promoCode: null,
          discountAmount: 0,
          coinsRedeemed: 0,
        });
      },

      clearCart: () => set({ items: [], promoCode: null, discountAmount: 0, coinsRedeemed: 0 }),

      getTotalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      getTotalPrice: () => get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
      getDeliveryFee: () => get().getTotalPrice() >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE,
      getGrandTotal: () => get().getTotalPrice() - get().discountAmount - get().coinsRedeemed + get().getDeliveryFee(),
    }),
    {
      name: 'zeststar-cart',
      partialize: (state) => ({
        items: state.items,
        promoCode: state.promoCode,
        discountAmount: state.discountAmount,
        coinsRedeemed: state.coinsRedeemed,
      }),
    },
  ),
);
