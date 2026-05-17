const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface Review {
  id: string;
  product_id: string;
  order_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  reviewer_name: string;
}

export interface ReviewSummary {
  average: number;
  total: number;
  distribution: Record<string, number>;
}

export interface MyReview {
  id: string;
  product_id: string;
  order_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
}

function headers(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function handle(res: Response) {
  const json = await res.json();
  if (!res.ok) throw new Error(json?.details?.reason ?? json?.error ?? 'Request failed');
  return json;
}

export async function fetchProductReviews(
  productId: string,
  page = 1,
): Promise<{ reviews: Review[]; total: number }> {
  const res = await fetch(`${API}/reviews/product/${productId}?page=${page}&limit=10`);
  const json = await handle(res);
  return { reviews: json.data.reviews ?? [], total: json.data.total ?? 0 };
}

export async function fetchReviewSummary(productId: string): Promise<ReviewSummary> {
  const res = await fetch(`${API}/reviews/product/${productId}/summary`);
  const json = await handle(res);
  return json.data as ReviewSummary;
}

export async function fetchMyReviews(token: string): Promise<MyReview[]> {
  const res = await fetch(`${API}/reviews/my`, { headers: headers(token) });
  const json = await handle(res);
  return json.data.reviews ?? [];
}

export async function submitReview(
  token: string,
  payload: { product_id: string; order_id: string; rating: number; review_text?: string },
): Promise<void> {
  const res = await fetch(`${API}/reviews`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  await handle(res);
}

export async function deleteReview(token: string, reviewId: string): Promise<void> {
  const res = await fetch(`${API}/reviews/${reviewId}`, {
    method: 'DELETE',
    headers: headers(token),
  });
  await handle(res);
}

export interface CanReviewResult {
  can: boolean;
  order_id?: string;
  reason?: 'already_reviewed' | 'no_purchase';
}

export async function checkCanReview(token: string, productId: string): Promise<CanReviewResult> {
  const res = await fetch(`${API}/reviews/can-review/${productId}`, { headers: headers(token) });
  const json = await handle(res);
  return json.data as CanReviewResult;
}

export interface FeaturedReview {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  product_id: string;
  reviewer_name: string;
  product: { name: string; image_url: string | null } | null;
}

export async function fetchFeaturedReviews(): Promise<FeaturedReview[]> {
  const res = await fetch(`${API}/reviews/featured`);
  const json = await handle(res);
  return (json?.data?.reviews ?? []) as FeaturedReview[];
}
