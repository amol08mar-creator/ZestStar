import type { BundleItem, Product } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export function toProduct(p: Record<string, unknown>): Product {
  return {
    id: p.id as string,
    name: p.name as string,
    description: (p.description as string) ?? '',
    price: p.price as number,
    originalPrice: (p.original_price as number) ?? undefined,
    discount: (p.discount_percent as number) > 0 ? (p.discount_percent as number) : undefined,
    rating: Number(p.rating ?? 0),
    reviewCount: (p.review_count as number) ?? 0,
    image: (p.image_url as string) ?? '',
    images: (p.image_urls as string[] | null)?.filter(Boolean) ?? [],
    category: p.category as string,
    inStock: (p.stock as number) > 0,
    stock: (p.stock as number) ?? 0,
    weight: (p.weight as string) ?? undefined,
  };
}

export interface Suggestion {
  id: string;
  name: string;
  image_url: string | null;
  category: string;
}

export async function fetchSuggestions(query: string): Promise<Suggestion[]> {
  if (query.trim().length < 2) return [];
  try {
    const res = await fetch(
      `${API}/products/suggestions?q=${encodeURIComponent(query.trim())}&limit=6`,
    );
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data?.suggestions ?? [];
  } catch {
    return [];
  }
}

export async function fetchBundleItems(productId: string): Promise<BundleItem[]> {
  try {
    const res = await fetch(`${API}/products/${productId}/bundle-items`);
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.data?.items ?? []).map((i: Record<string, unknown>) => {
      const c = i.constituent as Record<string, unknown>;
      return {
        id: i.id as string,
        productId: c.id as string,
        name: c.name as string,
        price: c.price as number,
        originalPrice: (c.original_price as number) > 0 ? (c.original_price as number) : undefined,
        imageUrl: (c.image_url as string) ?? '',
        weight: (c.weight as string) ?? undefined,
        quantity: i.quantity as number,
      };
    });
  } catch {
    return [];
  }
}

export async function fetchProduct(id: string): Promise<Product> {
  const res = await fetch(`${API}/products/${id}`);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { error?: string }).error ?? 'Product not found');
  }
  const json = await res.json();
  return toProduct(json.data.product as Record<string, unknown>);
}

export async function fetchPublicProducts(params: {
  search?: string;
  category?: string;
  sort?: string;
  page?: number;
  limit?: number;
  min_price?: number;
  max_price?: number;
  min_rating?: number;
  min_discount?: number;
  in_stock?: boolean;
} = {}): Promise<{ products: Product[]; total: number; page: number; limit: number }> {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.category) q.set('category', params.category);
  if (params.sort) q.set('sort', params.sort);
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.min_price !== undefined) q.set('min_price', String(params.min_price));
  if (params.max_price !== undefined) q.set('max_price', String(params.max_price));
  if (params.min_rating !== undefined) q.set('min_rating', String(params.min_rating));
  if (params.min_discount !== undefined) q.set('min_discount', String(params.min_discount));
  if (params.in_stock) q.set('in_stock', 'true');

  const res = await fetch(`${API}/products?${q}`);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { error?: string }).error ?? 'Failed to load products');
  }
  const json = await res.json();
  const raw: Record<string, unknown>[] = json?.data?.products ?? [];
  return {
    products: raw.map(toProduct),
    total: json?.data?.total ?? 0,
    page: json?.data?.page ?? 1,
    limit: json?.data?.limit ?? 20,
  };
}
