const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface StockMovement {
  id: string;
  product_id: string;
  type: 'purchase' | 'sale' | 'adjustment' | 'return';
  quantity: number;
  note: string | null;
  reference_id: string | null;
  created_at: string;
}

export interface StockSummaryRow {
  product_id: string;
  product_name: string;
  product_image: string | null;
  category: string;
  current_stock: number;
  purchased: number;
  sold: number;
  adjusted: number;
  returned: number;
}

function headers(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function handle(res: Response) {
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? 'Request failed');
  return json;
}

export async function fetchMovements(token: string, productId: string): Promise<StockMovement[]> {
  const res = await fetch(`${API}/admin/stock-movements?product_id=${productId}`, { headers: headers(token) });
  const json = await handle(res);
  return json?.data?.movements ?? [];
}

export async function fetchStockSummary(token: string): Promise<StockSummaryRow[]> {
  const res = await fetch(`${API}/admin/stock-movements/summary`, { headers: headers(token) });
  const json = await handle(res);
  return json?.data?.summary ?? [];
}

export async function addStockMovement(
  token: string,
  productId: string,
  type: 'purchase' | 'return',
  quantity: number,
  note?: string,
) {
  const res = await fetch(`${API}/admin/stock-movements`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ product_id: productId, type, quantity, note }),
  });
  return handle(res);
}
