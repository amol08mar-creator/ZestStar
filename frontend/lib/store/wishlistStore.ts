'use client';
import { create } from 'zustand';

interface WishlistState {
  wishlistIds: string[];
  hydrated: boolean;
  setWishlistIds: (ids: string[]) => void;
  addToWishlist: (id: string) => void;
  removeFromWishlist: (id: string) => void;
  setHydrated: (v: boolean) => void;
}

export const useWishlistStore = create<WishlistState>()((set) => ({
  wishlistIds: [],
  hydrated: false,
  setWishlistIds: (ids) => set({ wishlistIds: ids }),
  addToWishlist: (id) =>
    set((s) => ({
      wishlistIds: s.wishlistIds.includes(id) ? s.wishlistIds : [...s.wishlistIds, id],
    })),
  removeFromWishlist: (id) =>
    set((s) => ({ wishlistIds: s.wishlistIds.filter((i) => i !== id) })),
  setHydrated: (v) => set({ hydrated: v }),
}));
