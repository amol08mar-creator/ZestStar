'use client';
import { create } from 'zustand';

interface NotificationsState {
  subscribedIds: string[];
  pushEnabled: boolean;
  unreadCount: number;
  setSubscribedIds: (ids: string[]) => void;
  addSubscription: (id: string) => void;
  removeSubscription: (id: string) => void;
  setPushEnabled: (v: boolean) => void;
  setUnreadCount: (n: number) => void;
  decrementUnread: () => void;
}

export const useNotificationsStore = create<NotificationsState>()((set) => ({
  subscribedIds: [],
  pushEnabled: false,
  unreadCount: 0,
  setSubscribedIds: (ids) => set({ subscribedIds: ids }),
  addSubscription: (id) =>
    set((s) => ({ subscribedIds: s.subscribedIds.includes(id) ? s.subscribedIds : [...s.subscribedIds, id] })),
  removeSubscription: (id) =>
    set((s) => ({ subscribedIds: s.subscribedIds.filter((i) => i !== id) })),
  setPushEnabled: (v) => set({ pushEnabled: v }),
  setUnreadCount: (n) => set({ unreadCount: n }),
  decrementUnread: () => set((s) => ({ unreadCount: Math.max(0, s.unreadCount - 1) })),
}));
