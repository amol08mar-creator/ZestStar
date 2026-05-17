import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

export interface WalletRow {
  user_id: string;
  coins_balance: number;
  total_earned: number;
  total_spent: number;
}

export interface LoyaltyTierConfig {
  tier: string;
  min_spend: number;
  coin_rate: number;
}

const MAX_COINS_PER_ORDER = 100;

@Injectable()
export class CoinsService {
  constructor(private supabase: SupabaseService) {}

  // ── Loyalty config (DB-driven, 60s cache) ───────────────────────────────────

  private configCache: { tiers: LoyaltyTierConfig[]; expiry: number } | null = null;

  async getLoyaltyConfig(): Promise<LoyaltyTierConfig[]> {
    if (this.configCache && Date.now() < this.configCache.expiry) {
      return this.configCache.tiers;
    }
    const { data, error } = await this.supabase.admin
      .from('loyalty_config')
      .select('tier, min_spend, coin_rate')
      .order('min_spend', { ascending: true });
    if (error) throw new BadRequestException(error.message);
    const tiers = (data ?? []) as LoyaltyTierConfig[];
    this.configCache = { tiers, expiry: Date.now() + 60_000 };
    return tiers;
  }

  async updateLoyaltyConfig(updates: { tier: string; min_spend: number; coin_rate: number }[]) {
    for (const u of updates) {
      const { error } = await this.supabase.admin
        .from('loyalty_config')
        .update({ min_spend: u.min_spend, coin_rate: u.coin_rate, updated_at: new Date().toISOString() })
        .eq('tier', u.tier);
      if (error) throw new BadRequestException(error.message);
    }
    this.configCache = null; // bust cache so next read picks up changes
    return this.getLoyaltyConfig();
  }

  private computeTierFromConfig(totalOrderValue: number, tiers: LoyaltyTierConfig[]): string {
    const sorted = [...tiers].sort((a, b) => b.min_spend - a.min_spend);
    return sorted.find((t) => totalOrderValue >= t.min_spend)?.tier ?? 'bronze';
  }

  async getTierMultiplier(tier: string): Promise<number> {
    const tiers = await this.getLoyaltyConfig();
    return tiers.find((t) => t.tier === tier)?.coin_rate ?? 1;
  }

  // ── Wallet ───────────────────────────────────────────────────────────────────

  async getWallet(userId: string): Promise<WalletRow> {
    const { data, error } = await this.supabase.admin
      .from('user_wallet')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);

    if (!data) {
      const { data: created, error: createErr } = await this.supabase.admin
        .from('user_wallet')
        .insert({ user_id: userId, coins_balance: 0, total_earned: 0, total_spent: 0 })
        .select()
        .single();
      if (createErr) throw new BadRequestException(createErr.message);
      return created as WalletRow;
    }

    return data as WalletRow;
  }

  async addCoins(userId: string, amount: number, note: string, orderId?: string) {
    if (amount <= 0) return;

    const wallet = await this.getWallet(userId);

    const { error: updateErr } = await this.supabase.admin
      .from('user_wallet')
      .update({
        coins_balance: wallet.coins_balance + amount,
        total_earned: wallet.total_earned + amount,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateErr) throw new BadRequestException(updateErr.message);

    const { error: ledgerErr } = await this.supabase.admin
      .from('coins_ledger')
      .insert({ user_id: userId, type: 'earn', amount, note, order_id: orderId });
    if (ledgerErr) throw new BadRequestException(ledgerErr.message);
  }

  async spendCoins(userId: string, amount: number, note: string, orderId: string) {
    const wallet = await this.getWallet(userId);

    if (wallet.coins_balance < amount) {
      throw new BadRequestException('Insufficient coins balance');
    }

    const { error: updateErr } = await this.supabase.admin
      .from('user_wallet')
      .update({
        coins_balance: wallet.coins_balance - amount,
        total_spent: wallet.total_spent + amount,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateErr) throw new BadRequestException(updateErr.message);

    const { error: ledgerErr } = await this.supabase.admin
      .from('coins_ledger')
      .insert({ user_id: userId, type: 'spend', amount, note, order_id: orderId });
    if (ledgerErr) throw new BadRequestException(ledgerErr.message);
  }

  async validateRedemption(userId: string, coinsToSpend: number) {
    if (coinsToSpend > MAX_COINS_PER_ORDER) {
      throw new BadRequestException(`Max ${MAX_COINS_PER_ORDER} coins can be redeemed per order`);
    }

    const wallet = await this.getWallet(userId);

    if (coinsToSpend > wallet.coins_balance) {
      throw new BadRequestException('Insufficient coins balance');
    }

    return { discountAmount: coinsToSpend }; // 1 coin = ₹1
  }

  async refundCoins(userId: string, orderId: string) {
    const { data: earned } = await this.supabase.admin
      .from('coins_ledger')
      .select('amount')
      .eq('user_id', userId)
      .eq('order_id', orderId)
      .eq('type', 'earn')
      .maybeSingle();

    if (!earned || earned.amount <= 0) return;

    const wallet = await this.getWallet(userId);

    await this.supabase.admin
      .from('user_wallet')
      .update({
        coins_balance: Math.max(0, wallet.coins_balance - earned.amount),
        total_earned: Math.max(0, wallet.total_earned - earned.amount),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    const { error: ledgerErr } = await this.supabase.admin
      .from('coins_ledger')
      .insert({ user_id: userId, type: 'refund', amount: earned.amount, note: 'Cancelled order refund', order_id: orderId });
    if (ledgerErr) throw new BadRequestException(ledgerErr.message);
  }

  async getUserTier(userId: string): Promise<string> {
    const wallet = await this.getWallet(userId);
    return (wallet as unknown as { tier?: string }).tier ?? 'bronze';
  }

  async updateOrderValue(userId: string, orderValue: number): Promise<void> {
    const wallet = await this.getWallet(userId);
    const w = wallet as unknown as { total_order_value?: number };
    const newValue = (w.total_order_value ?? 0) + orderValue;
    const tiers = await this.getLoyaltyConfig().catch(() => [] as LoyaltyTierConfig[]);
    const newTier = tiers.length > 0
      ? this.computeTierFromConfig(newValue, tiers)
      : (newValue >= 30000 ? 'platinum' : newValue >= 15000 ? 'gold' : newValue >= 5000 ? 'silver' : 'bronze');
    await this.supabase.admin
      .from('user_wallet')
      .update({ total_order_value: newValue, tier: newTier, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
  }

  async checkTablesExist(): Promise<{ wallet: boolean; ledger: boolean }> {
    const { error: e1 } = await this.supabase.admin.from('user_wallet').select('id').limit(1);
    const { error: e2 } = await this.supabase.admin.from('coins_ledger').select('id').limit(1);
    return { wallet: !e1, ledger: !e2 };
  }

  async getHistory(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const { data, error, count } = await this.supabase.admin
      .from('coins_ledger')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new BadRequestException(error.message);
    return { data: { entries: data ?? [], total: count ?? 0, page, limit }, message: 'Success' };
  }
}
