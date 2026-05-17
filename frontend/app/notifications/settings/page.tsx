'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { useNotificationsStore } from '@/lib/store/notificationsStore';
import { fetchNotificationPreferences, updateNotificationPreferences, savePushSubscription, removePushSubscription, type NotificationPreferences } from '@/lib/api/notifications';
import { subscribeToPush, unsubscribeFromPush, isPushSupported } from '@/lib/push';

const TYPE_PREFS: { key: keyof NotificationPreferences; label: string; desc: string }[] = [
  { key: 'order_updates', label: 'Order Updates', desc: 'Placed, confirmed, out for delivery, delivered, cancelled' },
  { key: 'back_in_stock', label: 'Back in Stock', desc: 'When a product you subscribed to is back in stock' },
  { key: 'price_drops', label: 'Price Drops', desc: 'When a wishlist item drops in price' },
  { key: 'referral_rewards', label: 'Referral Rewards', desc: 'When your referral earns you coins' },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-primary' : 'bg-gray-200'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const pushEnabled = useNotificationsStore((s) => s.pushEnabled);
  const setPushEnabled = useNotificationsStore((s) => s.setPushEnabled);

  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [pushLoading, setPushLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    fetchNotificationPreferences(token).then(setPrefs).catch(() => {}).finally(() => setLoading(false));
  }, [token, router]);

  async function handlePrefChange(key: keyof NotificationPreferences, value: boolean) {
    if (!token || !prefs) return;
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    updateNotificationPreferences(token, { [key]: value }).catch(() => {
      setPrefs(prefs); // rollback
    });
  }

  async function handlePushToggle() {
    if (!token || pushLoading) return;
    setPushLoading(true);
    try {
      if (pushEnabled) {
        const endpoint = await unsubscribeFromPush();
        if (endpoint) await removePushSubscription(token, endpoint).catch(() => {});
        setPushEnabled(false);
        updateNotificationPreferences(token, { push_enabled: false }).catch(() => {});
      } else {
        const sub = await subscribeToPush(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '');
        if (sub) {
          await savePushSubscription(token, sub).catch(() => {});
          setPushEnabled(true);
          updateNotificationPreferences(token, { push_enabled: true }).catch(() => {});
        }
      }
    } catch {}
    finally { setPushLoading(false); }
  }

  return (
    <div className="min-h-screen bg-cream pb-10">
      <header className="bg-white border-b border-border sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-dark" />
          </button>
          <h1 className="font-bold text-dark text-lg" style={{ fontFamily: 'var(--font-serif)' }}>Notification Settings</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-16 animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Notification types */}
            <div className="bg-white rounded-2xl border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="font-semibold text-dark text-sm">What to notify me about</h2>
                <p className="text-xs text-muted mt-0.5">Choose which notifications you want to receive</p>
              </div>
              <div className="divide-y divide-border">
                {TYPE_PREFS.map(({ key, label, desc }) => (
                  <div key={key} className="px-5 py-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-dark">{label}</p>
                      <p className="text-xs text-muted mt-0.5 leading-snug">{desc}</p>
                    </div>
                    <Toggle
                      checked={prefs ? (prefs[key] as boolean) : true}
                      onChange={(v) => handlePrefChange(key, v)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Channels */}
            <div className="bg-white rounded-2xl border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="font-semibold text-dark text-sm">Notification channels</h2>
                <p className="text-xs text-muted mt-0.5">How you receive notifications</p>
              </div>
              <div className="divide-y divide-border">
                {/* Web push */}
                {mounted && isPushSupported() && (
                  <div className="px-5 py-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-dark">Push Notifications</p>
                      <p className="text-xs text-muted mt-0.5">Browser push alerts on this device</p>
                    </div>
                    <Toggle
                      checked={pushEnabled}
                      onChange={handlePushToggle}
                    />
                  </div>
                )}
                {/* Email */}
                <div className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark">Email Notifications</p>
                    <p className="text-xs text-muted mt-0.5">Stock alerts and price drops via email</p>
                  </div>
                  <Toggle
                    checked={prefs?.email_enabled ?? true}
                    onChange={(v) => handlePrefChange('email_enabled', v)}
                  />
                </div>
              </div>
            </div>

            <p className="text-xs text-muted text-center px-4">
              Changes take effect immediately. In-app notification history is always available at <span className="text-primary">/notifications</span>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
