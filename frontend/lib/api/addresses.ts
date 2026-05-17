const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface Address {
  id: string;
  user_id: string;
  label: string;
  address: string;
  landmark: string | null;
  pincode?: string | null;
  is_default: boolean;
  created_at: string;
  delivery_instructions?: string | null;
}

export interface CreateAddressPayload {
  label: string;
  address: string;
  landmark?: string;
  pincode?: string;
  is_default?: boolean;
  delivery_instructions?: string;
}

function headers(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function handle(res: Response) {
  const json = await res.json();
  if (!res.ok) throw new Error(json?.details?.reason ?? json?.error ?? 'Request failed');
  return json;
}

export async function fetchAddresses(token: string): Promise<Address[]> {
  const res = await fetch(`${API}/addresses`, { headers: headers(token) });
  const json = await handle(res);
  return json?.data?.addresses ?? [];
}

export async function createAddress(token: string, payload: CreateAddressPayload): Promise<Address> {
  const res = await fetch(`${API}/addresses`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  const json = await handle(res);
  return json.data.address as Address;
}

export async function updateAddress(
  token: string,
  id: string,
  payload: CreateAddressPayload,
): Promise<Address> {
  const res = await fetch(`${API}/addresses/${id}`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  const json = await handle(res);
  return json.data.address as Address;
}

export async function deleteAddress(token: string, id: string): Promise<void> {
  const res = await fetch(`${API}/addresses/${id}`, {
    method: 'DELETE',
    headers: headers(token),
  });
  await handle(res);
}
