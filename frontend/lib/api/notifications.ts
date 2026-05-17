const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface UserNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  order_updates: boolean;
  back_in_stock: boolean;
  price_drops: boolean;
  referral_rewards: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
}

function headers(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function handle(res: Response) {
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? 'Request failed');
  return json;
}

export async function fetchStockSubscriptions(token: string): Promise<string[]> {
  const res = await fetch(`${API}/notifications/stock`, { headers: headers(token) });
  const json = await handle(res);
  return json?.data?.product_ids ?? [];
}

export async function subscribeToStock(token: string, productId: string): Promise<void> {
  await fetch(`${API}/notifications/stock/${productId}`, {
    method: 'POST',
    headers: headers(token),
  });
}

export async function unsubscribeFromStock(token: string, productId: string): Promise<void> {
  await fetch(`${API}/notifications/stock/${productId}`, {
    method: 'DELETE',
    headers: headers(token),
  });
}

export async function savePushSubscription(
  token: string,
  sub: PushSubscription,
): Promise<void> {
  const key = sub.getKey('p256dh');
  const auth = sub.getKey('auth');
  await fetch(`${API}/notifications/stock/push/save`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      endpoint: sub.endpoint,
      p256dh: key ? btoa(String.fromCharCode(...new Uint8Array(key))) : '',
      auth: auth ? btoa(String.fromCharCode(...new Uint8Array(auth))) : '',
    }),
  });
}

export async function removePushSubscription(
  token: string,
  endpoint: string,
): Promise<void> {
  await fetch(`${API}/notifications/stock/push/remove`, {
    method: 'DELETE',
    headers: headers(token),
    body: JSON.stringify({ endpoint }),
  });
}

export async function fetchNotifications(
  token: string,
  page = 1,
): Promise<{ notifications: UserNotification[]; total: number }> {
  const res = await fetch(`${API}/notifications?page=${page}`, { headers: headers(token) });
  const json = await handle(res);
  return json.data as { notifications: UserNotification[]; total: number };
}

export async function fetchUnreadCount(token: string): Promise<number> {
  try {
    const res = await fetch(`${API}/notifications/unread-count`, { headers: headers(token) });
    const json = await handle(res);
    return (json.data as { count: number }).count ?? 0;
  } catch {
    return 0;
  }
}

export async function markNotificationRead(token: string, id: string): Promise<void> {
  await fetch(`${API}/notifications/${id}/read`, { method: 'PATCH', headers: headers(token) });
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  await fetch(`${API}/notifications/read-all`, { method: 'PATCH', headers: headers(token) });
}

export async function fetchNotificationPreferences(token: string): Promise<NotificationPreferences> {
  const res = await fetch(`${API}/notifications/preferences`, { headers: headers(token) });
  const json = await handle(res);
  return (json.data as { preferences: NotificationPreferences }).preferences;
}

export async function updateNotificationPreferences(
  token: string,
  prefs: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  const res = await fetch(`${API}/notifications/preferences`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify(prefs),
  });
  const json = await handle(res);
  return (json.data as { preferences: NotificationPreferences }).preferences;
}
