'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Mail, CheckCircle } from 'lucide-react';
import { sendOtp, sendEmailOtp } from '@/lib/api/auth';

type Mode = 'phone' | 'email';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('email');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError('');
    setEmailSent(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (mode === 'phone') {
      const digits = phone.replace(/\D/g, '');
      if (digits.length !== 10) { setError('Enter a valid 10-digit mobile number'); return; }
      setLoading(true);
      try {
        await sendOtp(digits);
        router.push(`/verify?type=phone&contact=${digits}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send OTP. Try again.');
      } finally {
        setLoading(false);
      }
    } else {
      if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { setError('Enter a valid email address'); return; }
      setLoading(true);
      try {
        await sendEmailOtp(email.trim());
        router.push(`/verify?type=email&contact=${encodeURIComponent(email.trim())}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send link. Try again.');
      } finally {
        setLoading(false);
      }
    }
  }

  // Email sent — show "check your inbox" screen
  if (emailSent) {
    return (
      <div className="bg-white rounded-2xl shadow-md border border-border p-8 text-center">
        <div className="w-14 h-14 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-dark mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
          Check your inbox
        </h2>
        <p className="text-sm text-muted mb-1">
          We sent a sign-in link to
        </p>
        <p className="text-sm font-semibold text-dark mb-6">{email}</p>
        <p className="text-xs text-muted mb-6">
          Click the <strong>Log In</strong> button in the email to sign in instantly. No password needed.
        </p>
        <button
          onClick={() => { setEmailSent(false); setEmail(''); }}
          className="text-sm text-primary font-semibold hover:underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  const canSubmit = mode === 'phone' ? phone.replace(/\D/g, '').length === 10 : email.includes('@');

  return (
    <div className="bg-white rounded-2xl shadow-md border border-border p-8">
      <h1 className="text-2xl font-bold text-dark mb-1" style={{ fontFamily: 'var(--font-serif)' }}>
        Sign in to ZestStar
      </h1>
      <p className="text-sm text-muted mb-6">
        {mode === 'email' ? 'Enter your email, then use PIN 123456 to sign in' : 'Get a 6-digit OTP on your phone'}
      </p>

      {/* Toggle */}
      <div className="flex gap-1 bg-cream border border-border rounded-xl p-1 mb-6">
        <button
          type="button"
          onClick={() => switchMode('email')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${
            mode === 'email' ? 'bg-white text-dark shadow-sm' : 'text-muted hover:text-dark'
          }`}
        >
          <Mail className="w-4 h-4" />
          Email
        </button>
        <button
          type="button"
          onClick={() => switchMode('phone')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${
            mode === 'phone' ? 'bg-white text-dark shadow-sm' : 'text-muted hover:text-dark'
          }`}
        >
          <Phone className="w-4 h-4" />
          Phone
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        {mode === 'email' ? (
          <div>
            <label className="block text-xs font-semibold text-dark mb-1">Email Address</label>
            <input
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-dark mb-1">Mobile Number</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 py-2.5 border border-r-0 border-border rounded-l-xl bg-cream text-sm font-semibold text-dark">
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="98765 43210"
                autoFocus
                className="flex-1 px-3 py-2.5 border border-border rounded-r-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !canSubmit}
          className="w-full bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {loading
            ? mode === 'email' ? 'Sending link…' : 'Sending OTP…'
            : mode === 'email' ? 'Send Magic Link' : 'Send OTP'}
        </button>
      </form>

      <p className="text-center text-xs text-muted mt-6">
        Admin?{' '}
        <a href="/admin" className="text-primary font-semibold hover:underline">
          Sign in here →
        </a>
      </p>
    </div>
  );
}
