'use client';
import { useEffect, useState } from 'react';
import { ShoppingBag, X } from 'lucide-react';

interface RecentOrder {
  name: string;
  city: string;
  product: string;
  minutesAgo: number;
}

const RECENT_ORDERS: RecentOrder[] = [
  { name: 'Priya M.',   city: 'Panvel',       product: 'family essentials bundle', minutesAgo: 2 },
  { name: 'Rajesh K.',  city: 'Navi Mumbai',  product: 'fresh vegetables pack',    minutesAgo: 4 },
  { name: 'Sneha P.',   city: 'Kharghar',     product: 'premium dry fruits',       minutesAgo: 7 },
  { name: 'Amit S.',    city: 'Vashi',        product: 'weekly groceries',         minutesAgo: 11 },
  { name: 'Neha R.',    city: 'Belapur',      product: 'organic produce bundle',   minutesAgo: 14 },
  { name: 'Karan D.',   city: 'Kamothe',      product: 'monthly staples',          minutesAgo: 18 },
  { name: 'Anjali V.',  city: 'Ulwe',         product: 'fresh fruits basket',      minutesAgo: 22 },
  { name: 'Vikram P.',  city: 'Airoli',       product: 'family combo pack',        minutesAgo: 28 },
];

const SUPPRESS_KEY = 'zeststar-ticker-suppressed';

export default function LiveOrderTicker() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(SUPPRESS_KEY) === '1') return;

    // Initial delay before showing first one
    const initialDelay = setTimeout(() => setVisible(true), 4000);
    return () => clearTimeout(initialDelay);
  }, []);

  useEffect(() => {
    if (!visible || dismissed) return;
    const cycle = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % RECENT_ORDERS.length);
        setVisible(true);
      }, 500);
    }, 5000);
    return () => clearInterval(cycle);
  }, [visible, dismissed]);

  function handleDismiss() {
    setDismissed(true);
    setVisible(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SUPPRESS_KEY, '1');
    }
  }

  if (dismissed) return null;

  const order = RECENT_ORDERS[index];

  return (
    <div
      className={`hidden md:flex fixed bottom-6 left-6 z-40 items-center gap-3 bg-white border border-border rounded-2xl shadow-xl px-4 py-3 max-w-xs transition-all duration-500 ${
        visible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="relative shrink-0">
        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
          <ShoppingBag className="w-4 h-4 text-green-600" />
        </div>
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-white animate-pulse" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-dark leading-snug">
          <span className="font-bold">{order.name}</span> from <span className="font-medium">{order.city}</span> just ordered
        </p>
        <p className="text-[11px] text-muted truncate">
          {order.product} • {order.minutesAgo} min ago
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="shrink-0 p-1 text-muted hover:text-dark hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
