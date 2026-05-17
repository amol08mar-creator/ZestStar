'use client';
import { useEffect } from 'react';
import { registerServiceWorker, getCurrentPushSubscription, isPushSupported } from '@/lib/push';
import { useNotificationsStore } from '@/lib/store/notificationsStore';

export default function PushInit() {
  const setPushEnabled = useNotificationsStore((s) => s.setPushEnabled);

  useEffect(() => {
    if (!isPushSupported()) return;
    registerServiceWorker().then(async () => {
      const sub = await getCurrentPushSubscription();
      setPushEnabled(!!sub && Notification.permission === 'granted');
    }).catch(() => {});
  }, [setPushEnabled]);

  return null;
}
