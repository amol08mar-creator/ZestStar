'use client';
import { useState } from 'react';
import { Smartphone, Check } from 'lucide-react';

export default function AppDownload() {
  const [phone, setPhone] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.replace(/\D/g, '').length >= 10) setSent(true);
  };

  return (
    <section className="bg-primary-dark py-14 md:py-20 overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
          {/* Text */}
          <div className="flex-1 text-center md:text-left">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto md:mx-0 mb-4">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <h2
              className="text-2xl md:text-3xl font-bold text-white mb-3"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Download ZestStar App
            </h2>
            <p className="text-white/70 mb-6 text-sm leading-relaxed max-w-md mx-auto md:mx-0">
              Get exclusive app-only discounts, faster checkout, and live order tracking.
              Available on iOS & Android.
            </p>

            {/* Store buttons */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-8">
              <button className="flex items-center gap-2.5 bg-black text-white px-5 py-3 rounded-xl hover:bg-gray-900 transition-colors border border-white/10">
                <span className="text-xl">🍎</span>
                <div className="text-left">
                  <p className="text-[10px] text-white/70">Download on the</p>
                  <p className="text-sm font-bold leading-none">App Store</p>
                </div>
              </button>
              <button className="flex items-center gap-2.5 bg-black text-white px-5 py-3 rounded-xl hover:bg-gray-900 transition-colors border border-white/10">
                <span className="text-xl">▶</span>
                <div className="text-left">
                  <p className="text-[10px] text-white/70">Get it on</p>
                  <p className="text-sm font-bold leading-none">Google Play</p>
                </div>
              </button>
            </div>

            {/* SMS link */}
            <p className="text-white/60 text-sm mb-3">Or get the download link via SMS:</p>
            {sent ? (
              <div className="flex items-center gap-2 text-primary-light">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">Link sent! Check your phone.</span>
              </div>
            ) : (
              <form onSubmit={handleSend} className="flex gap-2 max-w-sm mx-auto md:mx-0">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="flex-1 px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-white/50"
                  aria-label="Phone number for app download link"
                />
                <button
                  type="submit"
                  className="bg-accent hover:bg-accent-dark text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap"
                >
                  Send Link
                </button>
              </form>
            )}
          </div>

          {/* Phone mockup */}
          <div className="shrink-0 relative">
            <div className="w-48 h-[380px] bg-white/10 rounded-[2.5rem] border-4 border-white/20 flex flex-col overflow-hidden shadow-2xl">
              <div className="h-6 bg-white/10 flex items-center justify-center">
                <div className="w-16 h-1.5 bg-white/30 rounded-full" />
              </div>
              <div className="flex-1 bg-gradient-to-b from-primary-light to-cream p-3 space-y-2">
                <div className="bg-primary rounded-xl p-2 text-white text-center">
                  <p className="text-[10px] font-bold">ZestStar</p>
                  <p className="text-[8px] opacity-75">Fresh in 30 mins</p>
                </div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-lg p-2 flex gap-2 items-center shadow-sm">
                    <div className="w-8 h-8 bg-primary-light rounded-lg" />
                    <div className="flex-1 space-y-1">
                      <div className="h-2 bg-gray-200 rounded w-3/4" />
                      <div className="h-1.5 bg-gray-100 rounded w-1/2" />
                    </div>
                    <div className="w-6 h-6 bg-primary rounded-lg" />
                  </div>
                ))}
              </div>
              <div className="h-10 bg-white/10 flex items-center justify-around px-4">
                {['🏠', '🔍', '🛒', '👤'].map((icon) => (
                  <span key={icon} className="text-sm">{icon}</span>
                ))}
              </div>
            </div>
            {/* Decorative glow */}
            <div className="absolute inset-0 -z-10 bg-primary blur-3xl opacity-30 scale-75" />
          </div>
        </div>
      </div>
    </section>
  );
}
