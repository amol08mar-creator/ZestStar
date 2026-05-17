const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function headers(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function handle(res: Response) {
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? json?.message ?? 'Request failed');
  return json;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle_type: 'bike' | 'scooter' | 'car';
  is_active: boolean;
  created_at: string;
}

export interface DriverForm {
  name: string;
  phone: string;
  vehicle_type: 'bike' | 'scooter' | 'car';
  is_active?: boolean;
}

export const VEHICLE_LABELS: Record<string, string> = {
  bike: '🚲 Bike',
  scooter: '🛵 Scooter',
  car: '🚗 Car',
};

export async function fetchDrivers(token: string): Promise<Driver[]> {
  const res = await fetch(`${API}/admin/drivers`, { headers: headers(token) });
  const json = await handle(res);
  return json.data.drivers ?? [];
}

export async function createDriver(token: string, dto: DriverForm): Promise<Driver> {
  const res = await fetch(`${API}/admin/drivers`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(dto),
  });
  const json = await handle(res);
  return json.data.driver;
}

export async function updateDriver(token: string, id: string, dto: Partial<DriverForm>): Promise<Driver> {
  const res = await fetch(`${API}/admin/drivers/${id}`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify(dto),
  });
  const json = await handle(res);
  return json.data.driver;
}

export async function toggleDriver(token: string, id: string): Promise<Driver> {
  const res = await fetch(`${API}/admin/drivers/${id}/toggle`, {
    method: 'PATCH',
    headers: headers(token),
  });
  const json = await handle(res);
  return json.data.driver;
}
