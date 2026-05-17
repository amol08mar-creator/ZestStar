const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  type: 'percentage' | 'fixed';
  value: number;
  min_order_amount: number;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  valid_until: string | null;
  max_uses_per_customer: number | null;
  first_order_only: boolean;
  applicable_categories: string[] | null;
  auto_apply: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface PromoForm {
  code: string;
  description?: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_order_amount: number;
  max_uses?: number;
  is_active: boolean;
  valid_until?: string;
  max_uses_per_customer?: number;
  first_order_only?: boolean;
  applicable_categories?: string[];
  auto_apply?: boolean;
}

export interface ValidatePromoResult {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  discount_amount: number;
  description: string | null;
  applicable_categories?: string[] | null;
}

function headers(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function handle(res: Response) {
  const json = await res.json();
  if (!res.ok) throw new Error(json?.details?.reason ?? json?.error ?? 'Request failed');
  return json;
}

export async function validatePromo(
  token: string,
  code: string,
  items_total: number,
  items?: { category: string; total: number }[],
): Promise<ValidatePromoResult> {
  const res = await fetch(`${API}/promo/validate`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ code, items_total, items }),
  });
  const json = await handle(res);
  return json.data as ValidatePromoResult;
}

export async function fetchAutoApplyPromo(
  token: string,
  items_total: number,
): Promise<ValidatePromoResult | null> {
  try {
    const res = await fetch(`${API}/promo/auto?items_total=${items_total}`, { headers: headers(token) });
    const json = await handle(res);
    return json.data ?? null;
  } catch { return null; }
}

export async function fetchAdminPromos(token: string): Promise<PromoCode[]> {
  const res = await fetch(`${API}/admin/promo`, { headers: headers(token) });
  const json = await handle(res);
  return json?.data?.promos ?? [];
}

export async function createPromo(token: string, body: PromoForm) {
  const res = await fetch(`${API}/admin/promo`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(body),
  });
  return handle(res);
}

export async function updatePromo(token: string, id: string, body: Partial<PromoForm>) {
  const res = await fetch(`${API}/admin/promo/${id}`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify(body),
  });
  return handle(res);
}

export async function deletePromo(token: string, id: string) {
  const res = await fetch(`${API}/admin/promo/${id}`, { method: 'DELETE', headers: headers(token) });
  return handle(res);
}

export async function togglePromo(token: string, id: string) {
  const res = await fetch(`${API}/admin/promo/${id}/toggle`, { method: 'PATCH', headers: headers(token) });
  return handle(res);
}
