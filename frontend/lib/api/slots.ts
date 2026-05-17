import type { DeliverySlot } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function adminHeaders(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function handle(res: Response) {
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? json?.message ?? 'Request failed');
  return json;
}

export async function fetchSlotsByDate(date: string): Promise<DeliverySlot[]> {
  const res = await fetch(`${API}/delivery-slots?date=${date}`);
  const json = await handle(res);
  return json?.data?.slots ?? [];
}

export async function fetchAvailableDates(): Promise<string[]> {
  const res = await fetch(`${API}/delivery-slots/dates`);
  const json = await handle(res);
  return json?.data?.dates ?? [];
}

export async function fetchAdminSlots(token: string, date?: string): Promise<DeliverySlot[]> {
  const q = date ? `?date=${date}` : '';
  const res = await fetch(`${API}/admin/delivery-slots${q}`, { headers: adminHeaders(token) });
  const json = await handle(res);
  return json?.data?.slots ?? [];
}

export async function generateSlots(token: string, date: string) {
  const res = await fetch(`${API}/admin/delivery-slots/generate`, {
    method: 'POST',
    headers: adminHeaders(token),
    body: JSON.stringify({ date }),
  });
  return handle(res);
}

export async function createSlot(token: string, body: Omit<DeliverySlot, 'id' | 'booked' | 'created_at'>) {
  const res = await fetch(`${API}/admin/delivery-slots`, {
    method: 'POST',
    headers: adminHeaders(token),
    body: JSON.stringify(body),
  });
  return handle(res);
}

export async function updateSlot(token: string, id: string, body: Partial<DeliverySlot>) {
  const res = await fetch(`${API}/admin/delivery-slots/${id}`, {
    method: 'PUT',
    headers: adminHeaders(token),
    body: JSON.stringify(body),
  });
  return handle(res);
}

export async function deleteSlot(token: string, id: string) {
  const res = await fetch(`${API}/admin/delivery-slots/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(token),
  });
  return handle(res);
}
