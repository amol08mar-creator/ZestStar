'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowRight, Sparkles, Zap, ShieldCheck, Star } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { fetchWallet } from '@/lib/api/coins';

function useCountUp(target: number, duration = 1500) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

const HERO_PRODUCTS = [
  { src: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=300&h=300&fit=crop', alt: 'Fresh Spinach', label: 'Fresh Greens', sub: 'From ₹45' },
  { src: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=300&h=300&fit=crop', alt: 'Mangoes', label: 'Seasonal Fruits', sub: 'From ₹99' },
  { src: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=300&h=300&fit=crop', alt: 'Almonds', label: 'Premium Dry Fruits', sub: 'From ₹279' },
  { src: 'https://images.unsplash.com/photo-1546094096-0df4bcaad337?w=300&h=300&fit=crop', alt: 'Tomatoes', label: 'Daily Essentials', sub: 'From ₹65' },
];

const TIER_CONFIG: Record<string, { emoji: string; pill: string; sub: string; color: string }> = {
  bronze:   { emoji: '🥉', pill: 'Bronze Member',   sub: 'Earn ZestStar coins on every order — they add up fast.',              color: 'text-amber-700 bg-amber-50 border-amber-200' },
  silver:   { emoji: '🥈', pill: 'Silver Member',   sub: 'You\'re earning 1.5× coins on every order. Keep it up!',              color: 'text-slate-600 bg-slate-50 border-slate-200' },
  gold:     { emoji: '🥇', pill: 'Gold Member',     sub: 'Gold perks unlocked — 2× coins and priority support on every order.', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  platinum: { emoji: '💎', pill: 'Platinum VIP',    sub: 'Platinum VIP — enjoy 3× coins and exclusive deals every day.',       color: 'text-purple-700 bg-purple-50 border-purple-200' },
};

export default function HeroSection() {
  const router = useRouter();
  const customers = useCountUp(10000);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const [tier, setTier] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchWallet(token).then((w) => { if (w.tier) setTier(w.tier.toLowerCase()); }).catch(() => {});
  }, [token]);

  return (
    <section className="bg-gradient-to-br from-cream via-[#FDF0EB] to-primary-light overflow-hidden relative">
      {/* Decorative blob */}
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />

      <div className="max-w-[1200px] mx-auto px-4 py-12 md:py-20 relative">
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
          {/* Left — Text */}
          <div className="flex-1 text-center lg:text-left">
            {/* Trust pill — personalised for logged-in users */}
            {tier && TIER_CONFIG[tier] ? (
              <div className={`inline-flex items-center gap-2 border text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6 shadow-sm ${TIER_CONFIG[tier].color}`}>
                <span>{TIER_CONFIG[tier].emoji}</span>
                <span>Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!</span>
                <span className="opacity-60">·</span>
                <span>{TIER_CONFIG[tier].pill}</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-primary/20 text-primary text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 fill-primary" />
                <span>Trusted by</span>
                <span className="font-bold tabular-nums">{customers.toLocaleString()}+</span>
                <span>urban families</span>
              </div>
            )}

            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-dark leading-[1.1] mb-5"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Fresh groceries for{' '}
              <span className="text-primary relative inline-block">
                busy families
                <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" preserveAspectRatio="none">
                  <path d="M0,5 Q50,0 100,4 T200,3" stroke="#D4960F" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                </svg>
              </span>
              ,<br className="hidden md:block" /> in 30 minutes
            </h1>

            <p className="text-base md:text-lg text-muted mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              {tier && TIER_CONFIG[tier]
                ? TIER_CONFIG[tier].sub
                : <>Skip the grocery run. Order from <span className="font-semibold text-dark">1,000+ products</span> and we&apos;ll deliver to your door — fresh, fast, family-sized.</>
              }
            </p>

            {/* Dual CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto lg:mx-0 mb-7">
              <button
                onClick={() => router.push('/shop')}
                className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark active:scale-[0.98] text-white font-semibold px-6 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-primary/25"
              >
                Start Shopping
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  document.getElementById('categories-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-cream active:scale-[0.98] text-dark font-semibold px-6 py-3.5 rounded-xl border border-border transition-all duration-200"
              >
                Browse Categories
              </button>
            </div>

            {/* Trust row */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-sm text-muted">
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 fill-primary text-primary" />
                <span><span className="font-semibold text-dark">30-min</span> delivery</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span><span className="font-semibold text-dark">100%</span> fresh</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-yellow text-yellow" />
                <span><span className="font-semibold text-dark">4.8</span> rating</span>
              </div>
            </div>
          </div>

          {/* Right — Product showcase grid */}
          <div className="hidden lg:grid grid-cols-2 gap-4 w-[440px] shrink-0">
            {HERO_PRODUCTS.map((item, i) => (
              <div
                key={i}
                className={`group bg-white rounded-2xl overflow-hidden shadow-sm border border-border hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${
                  i === 1 ? 'mt-6' : i === 3 ? '-mt-6' : ''
                }`}
              >
                <div className="relative h-40 overflow-hidden">
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                    sizes="200px"
                  />
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm text-dark">{item.label}</p>
                  <p className="text-primary font-bold text-sm">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
