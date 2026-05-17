const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface Category {
  id: string;
  name: string;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export type CategoryForm = {
  name: string;
  image_url?: string;
  is_active: boolean;
};

function headers(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function handle(res: Response) {
  const json = await res.json();
  if (!res.ok) throw new Error(json?.details?.reason ?? json?.error ?? 'Request failed');
  return json;
}

export async function fetchAdminCategories(token: string): Promise<Category[]> {
  const res = await fetch(`${API}/admin/categories`, { headers: headers(token) });
  const json = await handle(res);
  return json?.data?.categories ?? [];
}

export async function createCategory(token: string, body: CategoryForm) {
  const res = await fetch(`${API}/admin/categories`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(body),
  });
  return handle(res);
}

export async function updateCategory(token: string, id: string, body: Partial<CategoryForm>) {
  const res = await fetch(`${API}/admin/categories/${id}`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify(body),
  });
  return handle(res);
}

export async function deleteCategory(token: string, id: string) {
  const res = await fetch(`${API}/admin/categories/${id}`, {
    method: 'DELETE',
    headers: headers(token),
  });
  return handle(res);
}
