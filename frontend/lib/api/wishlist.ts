const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function headers(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function handle(res: Response) {
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? 'Request failed');
  return json;
}

export async function fetchWishlist(token: string): Promise<string[]> {
  const res = await fetch(`${API}/wishlist`, { headers: headers(token) });
  const json = await handle(res);
  return json?.data?.product_ids ?? [];
}

export async function addToWishlist(token: string, productId: string): Promise<void> {
  await fetch(`${API}/wishlist/${productId}`, { method: 'POST', headers: headers(token) });
}

export async function removeFromWishlist(token: string, productId: string): Promise<void> {
  await fetch(`${API}/wishlist/${productId}`, { method: 'DELETE', headers: headers(token) });
}

export async function shareWishlist(token: string): Promise<string> {
  const res = await fetch(`${API}/wishlist/share`, { headers: headers(token) });
  const json = await handle(res);
  return json.data.share_url as string;
}

export async function fetchPublicWishlist(shareToken: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${API}/wishlist/public/${shareToken}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? 'Wishlist not found');
  return (json.data.products ?? []) as Record<string, unknown>[];
}
