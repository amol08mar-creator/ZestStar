'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile } from '@/lib/api/auth';
import { applyReferralCode } from '@/lib/api/referral';
import { useAuthStore } from '@/lib/store/authStore';

export default function ProfileSetupPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) { setError('Name must be at least 2 characters'); return; }
    setLoading(true);
    setError('');
    try {
      const updated = await updateProfile(token!, name.trim(), email.trim() || undefined);
      updateUser({ name: updated.name, email: updated.email });
      if (referralCode.trim()) {
        applyReferralCode(token!, referralCode.trim()).catch(() => {});
      }
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-md border border-border p-8">
      <h1 className="text-2xl font-bold text-dark mb-1" style={{ fontFamily: 'var(--font-serif)' }}>
        Complete your profile
      </h1>
      <p className="text-sm text-muted mb-6">Just a few details to get you started</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <div>
          <label className="block text-xs font-semibold text-dark mb-1">Your Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            placeholder="e.g. Priya Sharma"
            className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-dark mb-1">
            Email <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="For order receipts"
            className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-dark mb-1">
            Referral Code <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            placeholder="Enter a friend's referral code"
            maxLength={8}
            className="w-full px-3 py-2.5 border border-border rounded-xl text-sm font-mono tracking-widest focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <p className="text-xs text-muted mt-1">Both you and your friend earn 100 ZestStar Coins on your first order!</p>
        </div>

        <button
          type="submit"
          disabled={loading || name.trim().length < 2}
          className="w-full bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {loading ? 'Saving…' : 'Continue to Shop'}
        </button>
      </form>
    </div>
  );
}
