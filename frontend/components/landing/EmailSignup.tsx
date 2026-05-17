'use client';
import { useState } from 'react';
import { Mail, Check } from 'lucide-react';

export default function EmailSignup() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    setSubmitted(true);
  };

  return (
    <section className="bg-gradient-to-r from-accent to-accent-dark py-14">
      <div className="max-w-[1200px] mx-auto px-4 text-center">
        <div className="max-w-lg mx-auto">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6 text-white" />
          </div>

          <h2
            className="text-2xl md:text-3xl font-bold text-white mb-3"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Get Exclusive Offers!
          </h2>
          <p className="text-white/80 mb-8 text-sm">
            Subscribe to get{' '}
            <span className="text-white font-bold text-base">₹50 OFF</span> your first
            order + exclusive weekly deals & flash sales.
          </p>

          {submitted ? (
            <div className="flex items-center justify-center gap-3 bg-white/20 border border-white/40 rounded-2xl px-6 py-4">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 text-accent" />
              </div>
              <p className="text-white font-semibold">Check your email for the discount code!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    placeholder="Enter your email address"
                    className="w-full px-4 py-3 rounded-xl text-sm text-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50 bg-white"
                    aria-label="Email address"
                  />
                  {error && <p className="text-white/80 text-xs mt-1 text-left">{error}</p>}
                </div>
                <button
                  type="submit"
                  className="bg-primary-dark hover:bg-primary active:scale-[0.98] text-white font-bold px-6 py-3 rounded-xl transition-all duration-200 whitespace-nowrap shadow-lg"
                >
                  Subscribe & Save ₹50
                </button>
              </div>
            </form>
          )}

          <p className="text-white/50 text-xs mt-4">
            No spam, unsubscribe anytime. By subscribing you agree to our privacy policy.
          </p>
        </div>
      </div>
    </section>
  );
}
