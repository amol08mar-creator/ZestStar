const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface WalletData {
  coins_balance: number;
  total_earned: number;
  total_spent: number;
  total_order_value?: number;
  tier?: string;
}

export interface LedgerEntry {
  id: string;
  type: 'earn' | 'spend' | 'refund';
  amount: number;
  note: string | null;
  order_id: string | null;
  created_at: string;
}

function headers(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function handle(res: Response) {
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? 'Request failed');
  return json;
}

export async function fetchWallet(token: string): Promise<WalletData> {
  const res = await fetch(`${API}/coins/balance`, { headers: headers(token) });
  const json = await handle(res);
  return json.data as WalletData;
}

export interface LoyaltyTierConfig {
  tier: string;
  min_spend: number;
  coin_rate: number;
}

export async function fetchLoyaltyConfig(): Promise<LoyaltyTierConfig[]> {
  const res = await fetch(`${API}/coins/loyalty-config`);
  const json = await res.json();
  return (json?.data?.tiers ?? []) as LoyaltyTierConfig[];
}

export async function updateLoyaltyConfig(
  token: string,
  tiers: LoyaltyTierConfig[],
): Promise<LoyaltyTierConfig[]> {
  const res = await fetch(`${API}/admin/loyalty-config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ tiers }),
  });
  const json = await handle(res);
  return json.data.tiers as LoyaltyTierConfig[];
}

export async function fetchCoinHistory(
  token: string,
  page = 1,
): Promise<{ entries: LedgerEntry[]; total: number; page: number; limit: number }> {
  const res = await fetch(`${API}/coins/history?page=${page}`, { headers: headers(token) });
  const json = await handle(res);
  return json.data as { entries: LedgerEntry[]; total: number; page: number; limit: number };
}
