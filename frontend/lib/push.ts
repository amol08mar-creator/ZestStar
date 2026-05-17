'use client';

// Convert URL-safe base64 VAPID key to ArrayBuffer
// Using ArrayBuffer (not Uint8Array) avoids TypeScript generic type conflicts
function vapidKeyToBuffer(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    view[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    console.log('[Push] Service worker registered:', reg.scope);
    return reg;
  } catch (err) {
    console.error('[Push] Service worker registration failed:', err);
    return null;
  }
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

// vapidKey passed in by the caller (read directly from process.env in the component)
// Throws on failure — caller must catch and show the error
export async function subscribeToPush(vapidKey: string): Promise<PushSubscription> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported in this browser.');
  }
  if (!vapidKey) {
    throw new Error('VAPID public key is empty. Check that NEXT_PUBLIC_VAPID_PUBLIC_KEY is in frontend/.env.local and restart the dev server.');
  }
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: vapidKeyToBuffer(vapidKey),
  });
}

export async function unsubscribeFromPush(): Promise<string | null> {
  const sub = await getCurrentPushSubscription();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe().catch(() => {});
  return endpoint;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getPermissionState(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}
