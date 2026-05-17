'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Star, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import { fetchFeaturedReviews, type FeaturedReview } from '@/lib/api/reviews';
import { TESTIMONIALS } from '@/lib/data';

interface ReviewCardData {
  id: string;
  name: string;
  rating: number;
  text: string;
  productName?: string;
  productImage?: string | null;
  date?: string;
  verified: boolean;
}

function fromBackend(r: FeaturedReview): ReviewCardData {
  return {
    id: r.id,
    name: r.reviewer_name,
    rating: r.rating,
    text: r.review_text ?? '',
    productName: r.product?.name,
    productImage: r.product?.image_url ?? null,
    date: r.created_at,
    verified: true,
  };
}

function fromHardcoded(t: typeof TESTIMONIALS[0]): ReviewCardData {
  return {
    id: t.id,
    name: t.name,
    rating: t.rating,
    text: t.review,
    productName: undefined,
    productImage: t.avatar,
    date: undefined,
    verified: false,
  };
}

export default function Testimonials() {
  const [reviews, setReviews] = useState<ReviewCardData[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedReviews()
      .then((real) => {
        if (real.length > 0) {
          setReviews(real.map(fromBackend));
        } else {
          setReviews(TESTIMONIALS.map(fromHardcoded));
        }
      })
      .catch(() => setReviews(TESTIMONIALS.map(fromHardcoded)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="bg-cream py-14 md:py-20">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="text-center mb-10">
            <div className="h-8 bg-white rounded-lg w-64 mx-auto animate-pulse" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-48 bg-white rounded-2xl animate-pulse" />)}
          </div>
        </div>
      </section>
    );
  }

  if (reviews.length === 0) return null;

  const prev = () => setCurrent((c) => (c - 1 + reviews.length) % reviews.length);
  const next = () => setCurrent((c) => (c + 1) % reviews.length);

  return (
    <section className="bg-cream py-14 md:py-20">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="text-center mb-10">
          <h2
            className="text-2xl md:text-3xl font-bold text-dark mb-3"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            What <span className="text-primary">10,000+ families</span> say
          </h2>
          <p className="text-muted">Real reviews from verified buyers</p>
        </div>

        {/* Desktop grid (up to 4) */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reviews.slice(0, 8).map((r) => <ReviewCard key={r.id} r={r} />)}
        </div>

        {/* Mobile carousel */}
        <div className="md:hidden relative">
          <ReviewCard r={reviews[current]} />
          <div className="flex items-center justify-between mt-4">
            <button onClick={prev} className="p-2 bg-white border border-border rounded-xl text-muted hover:text-primary transition-colors" aria-label="Previous">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5">
              {reviews.slice(0, 8).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`rounded-full transition-all duration-200 ${
                    i === current ? 'w-4 h-2 bg-primary' : 'w-2 h-2 bg-border'
                  }`}
                  aria-label={`Go to ${i + 1}`}
                />
              ))}
            </div>
            <button onClick={next} className="p-2 bg-white border border-border rounded-xl text-muted hover:text-primary transition-colors" aria-label="Next">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReviewCard({ r }: { r: ReviewCardData }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-border hover:shadow-md transition-shadow flex flex-col h-full">
      {/* Header: name + verified */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">{r.name.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-dark truncate">{r.name}</p>
            {r.date && (
              <p className="text-[11px] text-muted">
                {new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>
        {r.verified && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full shrink-0">
            <ShieldCheck className="w-3 h-3" />
            Verified
          </span>
        )}
      </div>

      {/* Stars */}
      <div className="flex items-center gap-0.5 mb-3">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'fill-yellow text-yellow' : 'text-gray-200'}`} />
        ))}
      </div>

      {/* Review text */}
      <p className="text-sm text-dark leading-relaxed mb-4 flex-1 line-clamp-4">&ldquo;{r.text}&rdquo;</p>

      {/* Product context */}
      {r.productName && (
        <div className="flex items-center gap-2 pt-3 border-t border-border">
          {r.productImage && (
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-cream shrink-0">
              <Image src={r.productImage} alt={r.productName} width={32} height={32} className="object-cover w-full h-full" />
            </div>
          )}
          <p className="text-xs text-muted truncate">
            on <span className="font-semibold text-dark">{r.productName}</span>
          </p>
        </div>
      )}
    </div>
  );
}
