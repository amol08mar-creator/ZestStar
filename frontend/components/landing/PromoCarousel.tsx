'use client';
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Tag } from 'lucide-react';
import { PROMO_SLIDES } from '@/lib/data';

export default function PromoCarousel() {
  const [current, setCurrent] = useState(0);
  const total = PROMO_SLIDES.length;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % total);
    }, 5000);
    return () => clearInterval(timer);
  }, [total]);

  const prev = () => setCurrent((c) => (c - 1 + total) % total);
  const next = () => setCurrent((c) => (c + 1) % total);

  return (
    <section className="max-w-[1200px] mx-auto px-4 py-6">
      <div className="relative rounded-2xl overflow-hidden shadow-md" style={{ height: '140px' }}>
        {PROMO_SLIDES.map((slide, i) => (
          <div
            key={slide.id}
            className={`absolute inset-0 bg-gradient-to-r ${slide.gradient} transition-opacity duration-500 ${
              i === current ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <div className="h-full flex items-center justify-between px-6 md:px-10">
              <div className="text-white">
                <h3 className="text-xl md:text-2xl font-bold mb-1">{slide.title}</h3>
                <p className="text-sm text-white/80 mb-3">{slide.subtitle}</p>
                <div className="flex items-center gap-3">
                  {slide.code && (
                    <div className="flex items-center gap-1.5 bg-white/20 border border-white/40 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                      <Tag className="w-3 h-3" />
                      {slide.code}
                    </div>
                  )}
                  <button className="bg-white text-dark text-sm font-bold px-5 py-2 rounded-xl hover:bg-gray-100 transition-colors active:scale-[0.98]">
                    {slide.cta}
                  </button>
                </div>
              </div>
              {/* Decorative circles */}
              <div className="hidden md:block opacity-20">
                <div className="w-28 h-28 rounded-full border-4 border-white" />
              </div>
            </div>
          </div>
        ))}

        {/* Arrows */}
        <button
          onClick={prev}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-black/20 hover:bg-black/40 text-white p-1.5 rounded-full transition-colors"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={next}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-black/20 hover:bg-black/40 text-white p-1.5 rounded-full transition-colors"
          aria-label="Next slide"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
          {PROMO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all duration-200 ${
                i === current ? 'bg-white w-4 h-2' : 'bg-white/50 w-2 h-2'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
