const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function headers(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function handle(res: Response) {
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? 'Request failed');
  return json;
}

export interface WeeklyGmvDay {
  date: string;
  orders: number;
  revenue: number;
}

export interface DashboardStats {
  today_orders: number;
  today_revenue: number;
  pending_orders: number;
  out_of_stock_count: number;
  weekly_gmv: WeeklyGmvDay[];
  status_breakdown: {
    placed: number;
    confirmed: number;
    packed: number;
    out_for_delivery: number;
    delivered: number;
    cancelled: number;
  };
}

export async function fetchDashboard(token: string): Promise<DashboardStats> {
  const res = await fetch(`${API}/admin/dashboard`, { headers: headers(token) });
  const json = await handle(res);
  return json.data as DashboardStats;
}

export interface AnalyticsData {
  period: { start: string; end: string };
  summary: {
    total_orders: number;
    total_revenue: number;
    avg_order_value: number;
    cancelled_count: number;
    cancellation_rate: number;
    new_customers: number;
    returning_customers: number;
  };
  revenue_by_date: { date: string; orders: number; revenue: number }[];
  revenue_by_category: { category: string; revenue: number; orders: number }[];
  top_products: { product_id: string; name: string; quantity_sold: number; revenue: number }[];
  subscription_health: { total: number; active: number; paused: number; cancelled: number; churn_rate: number };
}

export async function fetchAnalytics(token: string, start: string, end: string): Promise<AnalyticsData> {
  const res = await fetch(`${API}/admin/analytics?start=${start}&end=${end}`, { headers: headers(token) });
  const json = await handle(res);
  return json.data as AnalyticsData;
}

export interface AdminSubscriptionStats {
  active_count: number;
  paused_count: number;
  today_deliveries: number;
  delivered_today: number;
  total_due_today: number;
  estimated_mrr: number;
}

export interface AdminSubscription {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  frequency_day: number | null;
  discount_pct: number;
  status: 'active' | 'paused' | 'cancelled';
  next_delivery_date: string;
  delivery_address: string;
  created_at: string;
  products: { name: string; image_url: string | null; price: number; weight: string | null } | null;
  customer: { name: string | null; phone: string | null };
  last_delivered_date: string | null;
}

export async function fetchAdminSubscriptions(token: string): Promise<{ stats: AdminSubscriptionStats; subscriptions: AdminSubscription[] }> {
  const res = await fetch(`${API}/admin/subscriptions`, { headers: headers(token) });
  const json = await handle(res);
  return json.data;
}

export async function adminPauseSubscription(token: string, id: string): Promise<void> {
  await fetch(`${API}/admin/subscriptions/${id}/pause`, { method: 'PATCH', headers: headers(token) });
}

export async function adminResumeSubscription(token: string, id: string): Promise<void> {
  await fetch(`${API}/admin/subscriptions/${id}/resume`, { method: 'PATCH', headers: headers(token) });
}

export async function adminCancelSubscription(token: string, id: string): Promise<void> {
  await fetch(`${API}/admin/subscriptions/${id}`, { method: 'DELETE', headers: headers(token) });
}

export async function adminMarkDelivered(token: string, id: string): Promise<{ last_delivered_date: string }> {
  const res = await fetch(`${API}/admin/subscriptions/${id}/mark-delivered`, { method: 'PATCH', headers: headers(token) });
  const json = await handle(res);
  return json.data;
}
