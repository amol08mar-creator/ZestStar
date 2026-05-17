const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  original_price: number | null;
  discount_percent: number;
  stock: number;
  description: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  weight: string | null;
  rating: number;
  review_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ProductForm = {
  name: string;
  category: string;
  price: number;
  original_price?: number;
  discount_percent?: number;
  stock: number;
  description?: string;
  image_url?: string;
  image_urls?: string[];
  weight?: string;
  is_active: boolean;
};

function headers(token: string) {
  const clean = token.replace(/\s+/g, '');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${clean}` };
}

async function handle(res: Response) {
  const json = await res.json();
  if (!res.ok) throw new Error(json?.details?.reason ?? json?.error ?? 'Request failed');
  return json;
}

export async function fetchProducts(
  token: string,
  params: { search?: string; category?: string; stock_status?: string; page?: number; limit?: number } = {},
) {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.category) q.set('category', params.category);
  if (params.stock_status) q.set('stock_status', params.stock_status);
  if (params.page) q.set('page', String(params.page));
  q.set('limit', String(params.limit ?? 100));

  const res = await fetch(`${API}/admin/products?${q}`, { headers: headers(token) });
  return handle(res);
}

export async function fetchLowStock(token: string) {
  const res = await fetch(`${API}/admin/products/low-stock`, { headers: headers(token) });
  return handle(res);
}

export async function createProduct(token: string, body: ProductForm) {
  const res = await fetch(`${API}/admin/products`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(body),
  });
  return handle(res);
}

export async function updateProduct(token: string, id: string, body: Partial<ProductForm>) {
  const res = await fetch(`${API}/admin/products/${id}`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify(body),
  });
  return handle(res);
}

export async function updateStock(
  token: string,
  id: string,
  quantity: number,
  operation: 'set' | 'increment' | 'decrement' = 'set',
) {
  const res = await fetch(`${API}/admin/products/${id}/stock`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify({ quantity, operation }),
  });
  return handle(res);
}

export async function deleteProduct(token: string, id: string) {
  const res = await fetch(`${API}/admin/products/${id}`, {
    method: 'DELETE',
    headers: headers(token),
  });
  return handle(res);
}

export async function fetchCategories(token: string): Promise<string[]> {
  const res = await fetch(`${API}/admin/products/categories`, { headers: headers(token) });
  const json = await res.json().catch(() => ({}));
  return json?.data?.categories ?? [];
}

export async function fetchAdminBundleItems(token: string, bundleId: string) {
  const res = await fetch(`${API}/admin/products/${bundleId}/bundle-items`, {
    headers: headers(token),
  });
  return handle(res);
}

export async function saveBundleItems(
  token: string,
  bundleId: string,
  items: { product_id: string; quantity: number }[],
) {
  const res = await fetch(`${API}/admin/products/${bundleId}/bundle-items`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify({ items }),
  });
  return handle(res);
}
