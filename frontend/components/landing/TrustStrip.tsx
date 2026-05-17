'use client';
import { useEffect, useRef, useState } from 'react';
import { Users, ShoppingBag, Star, Rocket } from 'lucide-react';

interface Stat {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  suffix?: string;
  decimals?: number;
  label: string;
  sub: string;
  color: string;
  bg: string;
}

const STATS: Stat[] = [
  { icon: Users,       value: 10000, suffix: '+',  label: 'Families served',  sub: 'across Mumbai region', color: 'text-primary',     bg: 'bg-primary-light' },
  { icon: ShoppingBag, value: 1000,  suffix: '+',  label: 'Fresh products',    sub: 'sourced daily',         color: 'text-accent',      bg: 'bg-yellow-50' },
  { icon: Star,        value: 4.8,   decimals: 1,  label: 'Average rating',    sub: 'from 2,500+ reviews',   color: 'text-yellow-600',  bg: 'bg-yellow-50' },
  { icon: Rocket,      value: 30,    suffix: 'min',label: 'Delivery time',     sub: 'guaranteed or free',    color: 'text-primary',     bg: 'bg-primary-light' },
];

function CountUp({ target, decimals = 0, duration = 1500 }: { target: number; decimals?: number; duration?: number }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            setValue(target * eased);
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref} className="tabular-nums">{decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString()}</span>;
}

export default function TrustStrip() {
  return (
    <section className="bg-white py-10 md:py-14 border-y border-border">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          {STATS.map(({ icon: Icon, value, suffix, decimals, label, sub, color, bg }) => (
            <div
              key={label}
              className="bg-white rounded-2xl p-4 md:p-5 border border-border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group"
            >
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl ${bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <Icon className={`w-5 h-5 md:w-6 md:h-6 ${color}`} />
              </div>
              <p className="text-2xl md:text-3xl font-bold text-dark leading-none mb-1">
                <CountUp target={value} decimals={decimals ?? 0} />
                {suffix && <span className="text-primary">{suffix}</span>}
              </p>
              <p className="text-xs md:text-sm font-semibold text-dark mt-1.5">{label}</p>
              <p className="text-[11px] md:text-xs text-muted">{sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
