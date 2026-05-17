'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, Settings, CheckCheck } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { useNotificationsStore } from '@/lib/store/notificationsStore';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead, type UserNotification } from '@/lib/api/notifications';

const TYPE_ICON: Record<string, string> = {
  order_update: '📦',
  back_in_stock: '🔔',
  price_drop: '💰',
  referral_reward: '🎉',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function groupByDate(notifications: UserNotification[]): { label: string; items: UserNotification[] }[] {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const groups: Record<string, UserNotification[]> = {};
  for (const n of notifications) {
    const d = new Date(n.created_at).toDateString();
    const label = d === today ? 'Today' : d === yesterday ? 'Yesterday' : new Date(n.created_at).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  }
  return Object.entries(groups).map(([label, items]) => ({ label, items }));
}

export default function NotificationsPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const setUnreadCount = useNotificationsStore((s) => s.setUnreadCount);
  const decrementUnread = useNotificationsStore((s) => s.decrementUnread);

  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async (p: number, append = false) => {
    if (!token) return;
    if (p === 1) setLoading(true); else setLoadingMore(true);
    try {
      const res = await fetchNotifications(token, p);
      setTotal(res.total);
      setNotifications((prev) => append ? [...prev, ...res.notifications] : res.notifications);
    } catch {}
    finally { setLoading(false); setLoadingMore(false); }
  }, [token]);

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    load(1);
    const interval = setInterval(() => { load(1); }, 15000);
    return () => clearInterval(interval);
  }, [token, router, load]);

  async function handleClick(n: UserNotification) {
    if (!token) return;
    if (!n.read_at) {
      markNotificationRead(token, n.id).catch(() => {});
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x));
      decrementUnread();
    }
    const data = n.data as { order_id?: string; product_id?: string };
    if (data.order_id) router.push(`/orders/${data.order_id}`);
    else if (data.product_id) router.push(`/shop/${data.product_id}`);
  }

  async function handleMarkAllRead() {
    if (!token || markingAll) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
      setUnreadCount(0);
    } catch {}
    finally { setMarkingAll(false); }
  }

  async function handleLoadMore() {
    const next = page + 1;
    setPage(next);
    await load(next, true);
  }

  const hasUnread = notifications.some((n) => !n.read_at);
  const groups = groupByDate(notifications);

  return (
    <div className="min-h-screen bg-cream pb-10">
      <header className="bg-white border-b border-border sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-dark" />
          </button>
          <h1 className="flex-1 font-bold text-dark text-lg" style={{ fontFamily: 'var(--font-serif)' }}>Notifications</h1>
          {hasUnread && (
            <button onClick={handleMarkAllRead} disabled={markingAll} className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-dark disabled:opacity-60 transition-colors">
              <CheckCheck className="w-4 h-4" />
              {markingAll ? 'Marking…' : 'Mark all read'}
            </button>
          )}
          <button onClick={() => router.push('/notifications/settings')} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors" aria-label="Notification settings">
            <Settings className="w-4 h-4 text-muted" />
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-cream rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-cream rounded w-2/3" />
                    <div className="h-3 bg-cream rounded w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="w-12 h-12 mx-auto mb-3 text-muted/30" />
            <p className="font-semibold text-dark text-sm">No notifications yet</p>
            <p className="text-xs text-muted mt-1">Order updates, stock alerts, and more will appear here</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(({ label, items }) => (
              <div key={label}>
                <p className="text-xs font-semibold text-muted mb-2 px-1">{label}</p>
                <div className="space-y-2">
                  {items.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={`w-full text-left bg-white rounded-2xl p-4 flex items-start gap-3 transition-all hover:shadow-sm active:scale-[0.99] ${!n.read_at ? 'border-l-4 border-primary shadow-sm' : 'border border-border'}`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 ${!n.read_at ? 'bg-primary-light' : 'bg-cream'}`}>
                        {TYPE_ICON[n.type] ?? '🔔'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${!n.read_at ? 'font-bold text-dark' : 'font-medium text-dark'}`}>{n.title}</p>
                        <p className="text-xs text-muted mt-0.5 leading-snug">{n.body}</p>
                        <p className="text-[10px] text-muted/70 mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                      {!n.read_at && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {notifications.length < total && (
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="w-full py-3 text-sm font-semibold text-primary border border-primary/30 rounded-2xl hover:bg-primary-light transition-colors disabled:opacity-60"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
