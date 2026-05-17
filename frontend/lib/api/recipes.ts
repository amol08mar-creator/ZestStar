import type { Recipe } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function authHeaders(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function handle(res: Response) {
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? 'Request failed');
  return json;
}

export async function fetchRecipes(): Promise<Recipe[]> {
  const res = await fetch(`${API}/recipes`);
  const json = await handle(res);
  return json.data.recipes ?? [];
}

export async function fetchRecipe(id: string): Promise<Recipe> {
  const res = await fetch(`${API}/recipes/${id}`);
  const json = await handle(res);
  return json.data.recipe;
}

export async function adminFetchRecipes(token: string): Promise<Recipe[]> {
  const res = await fetch(`${API}/admin/recipes`, { headers: authHeaders(token) });
  const json = await handle(res);
  return json.data.recipes ?? [];
}

export async function adminCreateRecipe(token: string, dto: Record<string, unknown>): Promise<Recipe> {
  const res = await fetch(`${API}/admin/recipes`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(dto),
  });
  const json = await handle(res);
  return json.data.recipe;
}

export async function adminUpdateRecipe(token: string, id: string, dto: Record<string, unknown>): Promise<Recipe> {
  const res = await fetch(`${API}/admin/recipes/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(dto),
  });
  const json = await handle(res);
  return json.data.recipe;
}

export async function adminDeleteRecipe(token: string, id: string): Promise<void> {
  await fetch(`${API}/admin/recipes/${id}`, { method: 'DELETE', headers: authHeaders(token) });
}

export interface IngredientPayload {
  product_id: string;
  quantity: number;
  display_quantity?: string;
}

export async function adminSetIngredients(token: string, id: string, items: IngredientPayload[]): Promise<Recipe> {
  const res = await fetch(`${API}/admin/recipes/${id}/ingredients`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ items }),
  });
  const json = await handle(res);
  return json.data.recipe;
}
