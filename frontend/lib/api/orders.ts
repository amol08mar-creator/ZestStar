const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface OrderItem {
  id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  product_weight: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface OrderCustomer {
  name: string | null;
  phone: string | null;
  email: string | null;
}

export interface Order {
  id: string;
  user_id: string;
  items_total: number;
  delivery_fee: number;
  discount_amount?: number;
  promo_code?: string | null;
  final_total: number;
  delivery_address: string;
  delivery_landmark: string | null;
  payment_method: string;
  payment_status: string;
  status: string;
  created_at: string;
  order_items: OrderItem[];
  customer?: OrderCustomer;
  driver_id?: string | null;
  driver_name?: string | null;
  delivery_instructions?: string | null;
  refund_status?: 'pending' | 'processing' | 'completed' | 'not_applicable' | null;
  refund_amount?: number | null;
  refund_notes?: string | null;
  refunded_at?: string | null;
}

export interface ReorderSuggestion {
  id: string;
  name: string;
  price: number;
  image: string | null;
  weight: string | null;
  inStock: boolean;
  stock: number;
  category: string;
}

export async function fetchReorderSuggestions(token: string): Promise<ReorderSuggestion[]> {
  const res = await fetch(`${API}/orders/reorder-suggestions`, { headers: headers(token) });
  const json = await handle(res);
  return json.data.suggestions as ReorderSuggestion[];
}

export interface OrderEditAlert {
  id: string;
  order_id: string;
  event_time: string;
  final_total: number;
  status: string;
  customer?: { name: string | null; phone: string | null };
}

export interface EditOrderItem {
  product_id?: string;
  product_name: string;
  product_image?: string;
  product_weight?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface CreateOrderPayload {
  delivery_address: string;
  delivery_landmark?: string;
  items_total: number;
  delivery_fee: number;
  final_total: number;
  promo_code?: string;
  discount_amount?: number;
  coins_redeemed?: number;
  delivery_slot_id?: string;
  delivery_pincode?: string;
  delivery_instructions?: string;
  items: {
    product_id?: string;
    product_name: string;
    product_image?: string;
    product_weight?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
}

function headers(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function handle(res: Response) {
  const json = await res.json();
  if (!res.ok) throw new Error(json?.details?.reason ?? json?.error ?? 'Request failed');
  return json;
}

export async function createOrder(token: string, payload: CreateOrderPayload): Promise<Order> {
  const res = await fetch(`${API}/orders`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  const json = await handle(res);
  return json.data.order as Order;
}

export async function fetchOrders(token: string): Promise<Order[]> {
  const res = await fetch(`${API}/orders`, { headers: headers(token) });
  const json = await handle(res);
  return json.data.orders as Order[];
}

export async function assignDriver(token: string, orderId: string, driverId: string | null): Promise<Order> {
  const res = await fetch(`${API}/admin/orders/${orderId}/assign-driver`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify({ driver_id: driverId }),
  });
  const json = await handle(res);
  return json.data.order as Order;
}

export async function fetchOrder(token: string, id: string): Promise<Order> {
  const res = await fetch(`${API}/orders/${id}`, { headers: headers(token) });
  const json = await handle(res);
  return json.data.order as Order;
}

export async function cancelOrder(token: string, orderId: string): Promise<void> {
  const res = await fetch(`${API}/orders/${orderId}/cancel`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(
      (json as { error?: string; message?: string }).error ?? (json as { message?: string }).message ?? 'Failed to cancel order',
    );
  }
}

export interface AdminOrdersFilters {
  status?: string;
  payment_status?: string;
  refund_status?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminOrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
}

export async function fetchAdminOrders(
  token: string,
  filters: AdminOrdersFilters = {},
): Promise<AdminOrdersResponse> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.payment_status) params.set('payment_status', filters.payment_status);
  if (filters.refund_status) params.set('refund_status', filters.refund_status);
  if (filters.date_from) params.set('date_from', filters.date_from);
  if (filters.date_to) params.set('date_to', filters.date_to);
  if (filters.search) params.set('search', filters.search);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  const res = await fetch(`${API}/admin/orders?${params}`, { headers: headers(token) });
  const json = await handle(res);
  return json.data as AdminOrdersResponse;
}

export async function updateOrderStatus(
  token: string,
  orderId: string,
  status: string,
): Promise<Order> {
  const res = await fetch(`${API}/admin/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify({ status }),
  });
  const json = await handle(res);
  return json.data.order as Order;
}

export async function updateOrderPaymentStatus(
  token: string,
  orderId: string,
  payment_status: string,
): Promise<Order> {
  const res = await fetch(`${API}/admin/orders/${orderId}/payment-status`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify({ payment_status }),
  });
  const json = await handle(res);
  return json.data.order as Order;
}

export async function fetchPendingEditAlerts(token: string): Promise<OrderEditAlert[]> {
  const res = await fetch(`${API}/admin/orders/edit-alerts`, { headers: headers(token) });
  const json = await handle(res);
  return json.data.alerts as OrderEditAlert[];
}

export async function acknowledgeEditAlert(token: string, eventId: string): Promise<void> {
  const res = await fetch(`${API}/admin/orders/${eventId}/acknowledge-edit`, {
    method: 'PATCH',
    headers: headers(token),
  });
  await handle(res);
}

export async function updateOrderItems(
  token: string,
  orderId: string,
  items: EditOrderItem[],
): Promise<Order> {
  const res = await fetch(`${API}/orders/${orderId}/items`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify({ items }),
  });
  const json = await handle(res);
  return json.data.order as Order;
}

export async function updateOrderRefundStatus(
  token: string,
  orderId: string,
  status: string,
  notes?: string,
  amount?: number,
): Promise<void> {
  const res = await fetch(`${API}/admin/orders/${orderId}/refund`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify({ status, notes, amount }),
  });
  await handle(res);
}
