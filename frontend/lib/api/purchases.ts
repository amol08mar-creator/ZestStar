const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function headers(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function handle(res: Response) {
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? json?.message ?? 'Request failed');
  return json;
}

export interface Vendor {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gst_number: string | null;
  is_active: boolean;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  products?: { name: string; image_url: string | null; weight: string | null } | null;
}

export interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  vendor_id: string | null;
  vendor_name: string;
  invoice_date: string;
  received_date: string | null;
  payment_status: 'unpaid' | 'partial' | 'paid';
  payment_due_date: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes: string | null;
  status: 'draft' | 'submitted' | 'cancelled';
  item_count?: number;
  purchase_invoice_items?: InvoiceItem[];
  created_at: string;
}

export interface CreateInvoicePayload {
  vendor_id?: string;
  vendor_name: string;
  invoice_number: string;
  invoice_date: string;
  received_date?: string;
  payment_status?: 'unpaid' | 'partial' | 'paid';
  payment_due_date?: string;
  tax_amount?: number;
  notes?: string;
  status?: 'draft' | 'submitted';
  items: { product_id: string; product_name: string; quantity: number; unit_cost: number }[];
}

// Vendors
export async function fetchVendors(token: string): Promise<Vendor[]> {
  const res = await fetch(`${API}/admin/vendors`, { headers: headers(token) });
  const json = await handle(res);
  return json.data.vendors ?? [];
}

export async function createVendor(token: string, dto: Partial<Vendor>): Promise<Vendor> {
  const res = await fetch(`${API}/admin/vendors`, { method: 'POST', headers: headers(token), body: JSON.stringify(dto) });
  const json = await handle(res);
  return json.data.vendor;
}

// Invoices
export async function fetchInvoices(token: string, params?: Record<string, string>): Promise<{ invoices: PurchaseInvoice[]; total: number }> {
  const qs = params ? `?${new URLSearchParams(params)}` : '';
  const res = await fetch(`${API}/admin/purchase-invoices${qs}`, { headers: headers(token) });
  const json = await handle(res);
  return { invoices: json.data.invoices ?? [], total: json.data.total ?? 0 };
}

export async function fetchInvoice(token: string, id: string): Promise<PurchaseInvoice> {
  const res = await fetch(`${API}/admin/purchase-invoices/${id}`, { headers: headers(token) });
  const json = await handle(res);
  return json.data.invoice;
}

export async function createInvoice(token: string, payload: CreateInvoicePayload): Promise<PurchaseInvoice> {
  const res = await fetch(`${API}/admin/purchase-invoices`, { method: 'POST', headers: headers(token), body: JSON.stringify(payload) });
  const json = await handle(res);
  return json.data.invoice;
}

export async function updatePaymentStatus(token: string, id: string, payment_status: 'unpaid' | 'partial' | 'paid'): Promise<void> {
  await fetch(`${API}/admin/purchase-invoices/${id}/payment`, { method: 'PATCH', headers: headers(token), body: JSON.stringify({ payment_status }) });
}

export async function updateInvoice(token: string, id: string, payload: CreateInvoicePayload): Promise<PurchaseInvoice> {
  const res = await fetch(`${API}/admin/purchase-invoices/${id}`, { method: 'PUT', headers: headers(token), body: JSON.stringify(payload) });
  const json = await handle(res);
  return json.data.invoice;
}

export async function submitInvoice(token: string, id: string): Promise<PurchaseInvoice> {
  const res = await fetch(`${API}/admin/purchase-invoices/${id}/submit`, { method: 'PATCH', headers: headers(token) });
  const json = await handle(res);
  return json.data.invoice;
}

export async function cancelInvoice(token: string, id: string): Promise<void> {
  await fetch(`${API}/admin/purchase-invoices/${id}/cancel`, { method: 'PATCH', headers: headers(token) });
}
