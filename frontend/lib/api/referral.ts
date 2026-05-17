const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface ReferralEntry {
  status: string;
  rewarded_at: string | null;
  created_at: string;
}

export interface ReferralStats {
  code: string;
  referral_count: number;
  coins_earned: number;
  referrals: ReferralEntry[];
}

function headers(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export async function fetchReferralStats(token: string): Promise<ReferralStats> {
  const res = await fetch(`${API}/referral/stats`, { headers: headers(token) });
  const json = await res.json();
  if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Failed to fetch referral stats');
  return (json.data ?? json) as ReferralStats;
}

export async function applyReferralCode(token: string, code: string): Promise<void> {
  const res = await fetch(`${API}/referral/apply`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(
      (json as { error?: string; message?: string }).error ??
      (json as { message?: string }).message ??
      'Failed to apply referral code',
    );
  }
}
