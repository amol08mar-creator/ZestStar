'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Star } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import StarSelector from '@/components/StarSelector';
import {
  checkCanReview,
  fetchProductReviews,
  fetchReviewSummary,
  submitReview,
  type CanReviewResult,
  type Review,
  type ReviewSummary,
} from '@/lib/api/reviews';

interface Props {
  productId: string;
  productName: string;
  onClose: () => void;
}

function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sz = size === 'md' ? 'w-5 h-5' : 'w-3.5 h-3.5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${sz} ${s <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`}
        />
      ))}
    </div>
  );
}

export default function ReviewsModal({ productId, productName, onClose }: Props) {
  const token = useAuthStore((s) => s.token);

  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Write-form state
  const [canReview, setCanReview] = useState<CanReviewResult | null>(null);
  const [writeMode, setWriteMode] = useState(false);
  const [formRating, setFormRating] = useState(0);
  const [formText, setFormText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    fetchReviewSummary(productId).then(setSummary).catch(() => {});
  }, [productId]);

  useEffect(() => {
    setLoading(true);
    fetchProductReviews(productId, page)
      .then(({ reviews: r, total: t }) => { setReviews(r); setTotal(t); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId, page]);

  useEffect(() => {
    if (!token) return;
    checkCanReview(token, productId).then(setCanReview).catch(() => {});
  }, [productId, token]);

  const totalPages = Math.ceil(total / 10);

  async function handleSubmitReview() {
    if (!token || !canReview?.order_id || formRating === 0) return;
    setSubmitting(true);
    try {
      await submitReview(token, {
        product_id: productId,
        order_id: canReview.order_id,
        rating: formRating,
        review_text: formText.trim() || undefined,
      });
      // Refresh summary and reviews list
      fetchReviewSummary(productId).then(setSummary).catch(() => {});
      fetchProductReviews(productId, 1)
        .then(({ reviews: r, total: t }) => { setReviews(r); setTotal(t); setPage(1); })
        .catch(() => {});
      setSubmitSuccess(true);
      setWriteMode(false);
      setFormRating(0);
      setFormText('');
      setCanReview({ can: false, reason: 'already_reviewed' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="font-bold text-dark" style={{ fontFamily: 'var(--font-serif)' }}>
            Reviews
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {/* Product name + summary */}
          <div>
            <p className="text-sm font-semibold text-dark mb-3">{productName}</p>

            {summary ? (
              summary.total === 0 ? (
                <div className="text-center py-6">
                  <Star className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm font-medium text-dark">No reviews yet</p>
                  <p className="text-xs text-muted mt-1">Be the first to review after purchase</p>
                </div>
              ) : (
                <div className="bg-cream rounded-2xl p-4 flex items-center gap-5">
                  {/* Big average */}
                  <div className="text-center shrink-0">
                    <p className="text-4xl font-bold text-dark">{summary.average.toFixed(1)}</p>
                    <StarDisplay rating={summary.average} size="md" />
                    <p className="text-xs text-muted mt-1">{summary.total} review{summary.total !== 1 ? 's' : ''}</p>
                  </div>

                  {/* Distribution bars */}
                  <div className="flex-1 space-y-1.5">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = summary.distribution[star] ?? 0;
                      const pct = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0;
                      return (
                        <div key={star} className="flex items-center gap-2 text-xs">
                          <span className="w-3 text-muted text-right">{star}</span>
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 shrink-0" />
                          <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-400 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-7 text-muted">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            ) : (
              <div className="h-24 bg-cream rounded-2xl animate-pulse" />
            )}
          </div>

          {/* Review list */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-cream rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="border border-border rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center shrink-0">
                        <span className="text-white text-xs font-bold">
                          {review.reviewer_name.charAt(0)}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-dark">{review.reviewer_name}</span>
                    </div>
                    <span className="text-xs text-muted shrink-0">
                      {new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <StarDisplay rating={review.rating} />
                  {review.review_text && (
                    <p className="text-sm text-dark leading-snug">{review.review_text}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm pt-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-border rounded-lg text-muted hover:text-dark disabled:opacity-40 transition-colors"
              >
                ← Prev
              </button>
              <span className="text-muted text-xs">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-border rounded-lg text-muted hover:text-dark disabled:opacity-40 transition-colors"
              >
                Next →
              </button>
            </div>
          )}

          {/* Write a Review section */}
          <div className="border-t border-border pt-4">
            {/* Not logged in */}
            {!token && (
              <p className="text-xs text-muted text-center">
                <Link href="/login" className="text-primary underline font-medium" onClick={onClose}>
                  Log in
                </Link>{' '}
                to write a review
              </p>
            )}

            {/* Eligible — show button or expanded form */}
            {token && canReview?.can === true && !submitSuccess && (
              <>
                {!writeMode ? (
                  <button
                    onClick={() => setWriteMode(true)}
                    className="w-full py-2.5 border border-primary text-primary text-sm font-semibold rounded-xl hover:bg-primary hover:text-white transition-colors"
                  >
                    Write a Review
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-dark">Your Review</p>
                    <StarSelector value={formRating} onChange={setFormRating} size="md" />
                    <textarea
                      value={formText}
                      onChange={(e) => setFormText(e.target.value)}
                      placeholder="Share your experience (optional)…"
                      rows={3}
                      maxLength={500}
                      className="w-full px-3 py-2 border border-border rounded-xl text-sm resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setWriteMode(false); setFormRating(0); setFormText(''); }}
                        className="flex-1 py-2 border border-border rounded-xl text-sm text-muted hover:text-dark transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmitReview}
                        disabled={submitting || formRating === 0}
                        className="flex-1 py-2 bg-primary disabled:opacity-50 text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors"
                      >
                        {submitting ? 'Submitting…' : 'Submit'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Already reviewed */}
            {token && canReview?.reason === 'already_reviewed' && (
              <p className="text-xs text-green-600 font-medium text-center">
                You&apos;ve reviewed this product ✓
              </p>
            )}

            {/* Post-submit success */}
            {submitSuccess && (
              <p className="text-xs text-green-600 font-medium text-center">
                Review submitted — thank you!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
