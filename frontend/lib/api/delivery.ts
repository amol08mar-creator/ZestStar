const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface ServiceabilityResult {
  serviceable: boolean;
  area_name: string | null;
}

export async function checkServiceability(pincode: string): Promise<ServiceabilityResult> {
  const p = pincode.trim();
  if (p.length < 5) return { serviceable: false, area_name: null };
  try {
    const res = await fetch(`${API}/delivery/serviceable?pincode=${encodeURIComponent(p)}`);
    const json = await res.json();
    return (json?.data as ServiceabilityResult) ?? { serviceable: false, area_name: null };
  } catch {
    return { serviceable: false, area_name: null };
  }
}

export interface ServiceableArea {
  id: string;
  pincode: string;
  area_name: string | null;
  is_active: boolean;
  created_at: string;
}

function headers(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function handle(res: Response) {
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? 'Request failed');
  return json;
}

export async function fetchServiceableAreas(token: string): Promise<ServiceableArea[]> {
  const res = await fetch(`${API}/admin/serviceable-areas`, { headers: headers(token) });
  const json = await handle(res);
  return json.data.areas as ServiceableArea[];
}

export async function createServiceableArea(token: string, payload: { pincode: string; area_name?: string; is_active?: boolean }): Promise<ServiceableArea> {
  const res = await fetch(`${API}/admin/serviceable-areas`, {
    method: 'POST', headers: headers(token), body: JSON.stringify(payload),
  });
  const json = await handle(res);
  return json.data.area as ServiceableArea;
}

export async function updateServiceableArea(token: string, id: string, payload: { pincode?: string; area_name?: string }): Promise<ServiceableArea> {
  const res = await fetch(`${API}/admin/serviceable-areas/${id}`, {
    method: 'PUT', headers: headers(token), body: JSON.stringify(payload),
  });
  const json = await handle(res);
  return json.data.area as ServiceableArea;
}

export async function deleteServiceableArea(token: string, id: string): Promise<void> {
  const res = await fetch(`${API}/admin/serviceable-areas/${id}`, {
    method: 'DELETE', headers: headers(token),
  });
  await handle(res);
}

export async function toggleServiceableArea(token: string, id: string): Promise<ServiceableArea> {
  const res = await fetch(`${API}/admin/serviceable-areas/${id}/toggle`, {
    method: 'PATCH', headers: headers(token),
  });
  const json = await handle(res);
  return json.data.area as ServiceableArea;
}
