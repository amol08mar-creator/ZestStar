const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function headers(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function handle(res: Response) {
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? json?.message ?? 'Request failed');
  return json;
}

export interface CustomerSummary {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  order_count: number;
  total_spent: number;
  last_order_date: string | null;
  active_subscriptions: number;
}

export interface CustomerOrder {
  id: string;
  created_at: string;
  status: string;
  final_total: number;
  payment_status: string;
}

export interface CustomerSubscription {
  id: string;
  status: string;
  frequency: string;
  quantity: number;
  next_delivery_date: string | null;
  last_delivered_date: string | null;
  discount_pct: number;
  products: { name: string; image_url: string | null; price: number; weight: string | null } | null;
}

export interface CustomerDetail {
  customer: CustomerSummary;
  orders: CustomerOrder[];
  subscriptions: CustomerSubscription[];
}

export async function fetchCustomers(
  token: string,
  params?: { page?: number; limit?: number; search?: string },
): Promise<{ customers: CustomerSummary[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.search) qs.set('search', params.search);
  const res = await fetch(`${API}/admin/customers?${qs}`, { headers: headers(token) });
  const json = await handle(res);
  return { customers: json.data.customers ?? [], total: json.data.total ?? 0 };
}

export async function fetchCustomer(token: string, id: string): Promise<CustomerDetail> {
  const res = await fetch(`${API}/admin/customers/${id}`, { headers: headers(token) });
  const json = await handle(res);
  return json.data;
}
