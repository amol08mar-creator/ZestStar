'use client';
import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { verifyOtp, verifyEmailOtp, sendOtp, sendEmailOtp } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/authStore';

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = (searchParams.get('type') ?? 'email') as 'phone' | 'email';
  const contact = searchParams.get('contact') ?? '';

  const setSession = useAuthStore((s) => s.setSession);

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!contact) { router.replace('/login'); return; }
    inputRefs.current[0]?.focus();
  }, [contact, router]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  function handleDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...digits];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] ?? '';
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  async function handleVerify() {
    const otp = digits.join('');
    if (otp.length < 6) return;
    setLoading(true);
    setError('');
    try {
      const session = type === 'phone'
        ? await verifyOtp(contact, otp)
        : await verifyEmailOtp(contact, otp);
      setSession(session.access_token, session.refresh_token, session.user);
      router.push(session.user.is_new_user ? '/profile-setup' : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP. Try again.');
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError('');
    try {
      if (type === 'phone') await sendOtp(contact);
      else await sendEmailOtp(contact);
      setResendTimer(30);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP.');
    } finally {
      setResending(false);
    }
  }

  const maskedContact = type === 'phone' && contact.length === 10
    ? `+91 XXXXXX${contact.slice(-4)}`
    : contact;

  const otpFilled = digits.every((d) => d !== '');

  return (
    <div className="bg-white rounded-2xl shadow-md border border-border p-8">
      <h1 className="text-2xl font-bold text-dark mb-1" style={{ fontFamily: 'var(--font-serif)' }}>
        Enter OTP
      </h1>
      <p className="text-sm text-muted mb-6">
        {type === 'email' ? 'Enter the code from your inbox, or use test PIN · ' : 'Sent to '}
        <span className="font-semibold text-dark">{maskedContact}</span>
        {' · '}
        <button onClick={() => router.back()} className="text-primary hover:underline text-xs">
          Change
        </button>
      </p>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {/* 6-digit OTP inputs */}
      <div className="flex gap-2 justify-between mb-6" onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="tel"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleDigitChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-12 h-14 text-center text-xl font-bold border-2 rounded-xl focus:outline-none focus:border-primary transition-colors text-dark"
            style={{ borderColor: digit ? 'var(--color-primary, #2E7D32)' : undefined }}
          />
        ))}
      </div>

      <button
        onClick={handleVerify}
        disabled={loading || !otpFilled}
        className="w-full bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors mb-4"
      >
        {loading ? 'Verifying…' : 'Verify OTP'}
      </button>

      <div className="text-center text-sm text-muted">
        {resendTimer > 0 ? (
          <span>Resend OTP in <span className="font-semibold text-dark">{resendTimer}s</span></span>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending}
            className="text-primary font-semibold hover:underline disabled:opacity-60"
          >
            {resending ? 'Sending…' : 'Resend OTP'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
