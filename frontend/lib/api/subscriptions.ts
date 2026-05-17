const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface Subscription {
  id: string;
  product_id: string;
  quantity: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  frequency_day: number | null;
  discount_pct: number;
  status: 'active' | 'paused' | 'cancelled';
  next_delivery_date: string;
  delivery_address: string;
  delivery_landmark: string | null;
  paused_until: string | null;
  preferred_time_start: string | null;
  preferred_time_end: string | null;
  created_at: string;
  products?: { name: string; image_url: string | null; price: number; weight: string | null };
}

export interface CreateSubscriptionPayload {
  product_id: string;
  quantity: number;
  delivery_address: string;
  delivery_landmark?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  frequency_day?: number;
  start_date?: string;
  preferred_time_start?: string;
  preferred_time_end?: string;
}

function headers(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function handle(res: Response) {
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? json?.message ?? 'Request failed');
  return json;
}

export async function fetchSubscriptions(token: string): Promise<Subscription[]> {
  const res = await fetch(`${API}/subscriptions`, { headers: headers(token) });
  const json = await handle(res);
  return json.data.subscriptions ?? [];
}

export async function createSubscription(token: string, payload: CreateSubscriptionPayload): Promise<Subscription> {
  const res = await fetch(`${API}/subscriptions`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  const json = await handle(res);
  return json.data.subscription;
}

export async function pauseSubscription(token: string, id: string, until?: string): Promise<void> {
  const url = `${API}/subscriptions/${id}/pause${until ? `?until=${until}` : ''}`;
  await fetch(url, { method: 'PATCH', headers: headers(token) });
}

export async function resumeSubscription(token: string, id: string): Promise<void> {
  await fetch(`${API}/subscriptions/${id}/resume`, { method: 'PATCH', headers: headers(token) });
}

export async function cancelSubscription(token: string, id: string): Promise<void> {
  await fetch(`${API}/subscriptions/${id}`, { method: 'DELETE', headers: headers(token) });
}

export interface UpdateSubscriptionPayload {
  quantity?: number;
  frequency?: 'daily' | 'weekly' | 'monthly';
  frequency_day?: number | null;
  delivery_address?: string;
  delivery_landmark?: string | null;
  preferred_time_start?: string | null;
  preferred_time_end?: string | null;
}

export async function updateSubscription(
  token: string,
  id: string,
  payload: UpdateSubscriptionPayload,
): Promise<Subscription> {
  const res = await fetch(`${API}/subscriptions/${id}`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  const json = await handle(res);
  return json.data.subscription;
}

export const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Every Day',
  weekly: 'Every Week',
  monthly: 'Every Month',
};

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const TIME_WINDOWS = [
  { start: '09:00', end: '11:00', label: '9 AM – 11 AM' },
  { start: '11:00', end: '13:00', label: '11 AM – 1 PM' },
  { start: '13:00', end: '15:00', label: '1 PM – 3 PM' },
  { start: '15:00', end: '17:00', label: '3 PM – 5 PM' },
  { start: '17:00', end: '19:00', label: '5 PM – 7 PM' },
  { start: '19:00', end: '21:00', label: '7 PM – 9 PM' },
];
