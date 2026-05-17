import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { CoinsService } from '../coins/coins.service';
import { NotificationsService } from '../notifications/notifications.service';

const REFERRER_COINS = 100;
const REFERRED_COINS = 100;

function generateCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

@Injectable()
export class ReferralService {
  constructor(
    private supabase: SupabaseService,
    private coins: CoinsService,
    private notifications: NotificationsService,
  ) {}

  async getOrCreate(userId: string) {
    const { data } = await this.supabase.admin
      .from('referral_codes')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (data) return data;

    let code = generateCode();
    for (let i = 0; i < 10; i++) {
      const { data: clash } = await this.supabase.admin
        .from('referral_codes')
        .select('id')
        .eq('code', code)
        .maybeSingle();
      if (!clash) break;
      code = generateCode();
    }

    const { data: created, error } = await this.supabase.admin
      .from('referral_codes')
      .insert({ user_id: userId, code })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return created;
  }

  async applyCode(userId: string, code: string): Promise<void> {
    const { data: refCode } = await this.supabase.admin
      .from('referral_codes')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .maybeSingle();

    if (!refCode) throw new BadRequestException('Invalid referral code');
    if ((refCode as { user_id: string }).user_id === userId) {
      throw new BadRequestException('Cannot use your own referral code');
    }

    const { data: existing } = await this.supabase.admin
      .from('referrals')
      .select('id')
      .eq('referred_user_id', userId)
      .maybeSingle();
    if (existing) return; // already referred — silently ignore

    await this.supabase.admin.from('referrals').insert({
      referrer_user_id: (refCode as { user_id: string }).user_id,
      referred_user_id: userId,
      referral_code_id: (refCode as { id: string }).id,
      status: 'pending',
    });
  }

  async rewardFirstOrder(referredUserId: string, orderId: string): Promise<void> {
    const { data: referral } = await this.supabase.admin
      .from('referrals')
      .select('*, referral_code:referral_code_id(referral_count, coins_earned)')
      .eq('referred_user_id', referredUserId)
      .eq('status', 'pending')
      .maybeSingle();

    if (!referral) return;

    const r = referral as {
      id: string;
      referrer_user_id: string;
      referral_code_id: string;
      referral_code: { referral_count: number; coins_earned: number };
    };

    await this.supabase.admin
      .from('referrals')
      .update({ status: 'rewarded', first_order_id: orderId, rewarded_at: new Date().toISOString() })
      .eq('id', r.id);

    await Promise.all([
      this.coins.addCoins(referredUserId, REFERRED_COINS, 'Referral bonus — first order', orderId),
      this.coins.addCoins(r.referrer_user_id, REFERRER_COINS, 'Referral reward — friend ordered', orderId),
      this.notifications.createNotification(referredUserId, 'referral_reward', 'Referral Bonus! 🎉', `You earned ${REFERRED_COINS} ZestStar Coins on your first order.`, {}).catch(() => {}),
      this.notifications.createNotification(r.referrer_user_id, 'referral_reward', 'Referral Reward! 🎉', `Your friend placed their first order. You earned ${REFERRER_COINS} ZestStar Coins!`, {}).catch(() => {}),
      this.supabase.admin
        .from('referral_codes')
        .update({
          referral_count: r.referral_code.referral_count + 1,
          coins_earned: r.referral_code.coins_earned + REFERRER_COINS,
        })
        .eq('id', r.referral_code_id),
    ]);
  }

  async getStats(userId: string) {
    const code = await this.getOrCreate(userId);
    const { data: referrals } = await this.supabase.admin
      .from('referrals')
      .select('status, rewarded_at, created_at')
      .eq('referrer_user_id', userId)
      .order('created_at', { ascending: false });
    return { ...(code as object), referrals: referrals ?? [] };
  }
}
