import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as webpush from 'web-push';
import { SupabaseService } from '../../supabase/supabase.service';
import { CronJobsService } from '../cron-jobs/cron-jobs.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

interface PushPayload {
  title: string;
  body: string;
  url: string;
  icon?: string;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(
    private supabase: SupabaseService,
    private cronJobs: CronJobsService,
  ) {}

  onModuleInit() {
    this.cronJobs.registerRunner('notification_purge', () => this.doPurgeOldNotifications());

    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT ?? 'mailto:info@zeststar.in',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY,
      );
      console.log('[Notifications] VAPID keys loaded — web push enabled');
    } else {
      console.warn('[Notifications] VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY missing — web push disabled');
    }
  }

  // ── Stock notification subscriptions ────────────────────────────────────────

  async subscribe(userId: string, productId: string) {
    const { error } = await this.supabase.admin
      .from('stock_notifications')
      .upsert(
        { user_id: userId, product_id: productId, notified_at: null },
        { onConflict: 'user_id,product_id' },
      );
    if (error) throw new Error(error.message);
    return { data: null, message: 'Subscribed' };
  }

  async unsubscribe(userId: string, productId: string) {
    const { error } = await this.supabase.admin
      .from('stock_notifications')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);
    if (error) throw new Error(error.message);
    return { data: null, message: 'Unsubscribed' };
  }

  async listByUser(userId: string): Promise<string[]> {
    const { data } = await this.supabase.admin
      .from('stock_notifications')
      .select('product_id')
      .eq('user_id', userId)
      .is('notified_at', null);
    return (data ?? []).map((r: { product_id: string }) => r.product_id);
  }

  // ── Push subscription management ────────────────────────────────────────────

  async savePushSubscription(
    userId: string,
    endpoint: string,
    p256dh: string,
    auth: string,
  ) {
    const { error } = await this.supabase.admin
      .from('push_subscriptions')
      .upsert(
        { user_id: userId, endpoint, p256dh, auth_key: auth },
        { onConflict: 'user_id,endpoint' },
      );
    if (error) throw new Error(error.message);
    return { data: null, message: 'Push subscription saved' };
  }

  async removePushSubscription(userId: string, endpoint: string) {
    const { error } = await this.supabase.admin
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint);
    if (error) throw new Error(error.message);
    return { data: null, message: 'Push subscription removed' };
  }

  async hasPushSubscription(userId: string): Promise<boolean> {
    const { count } = await this.supabase.admin
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    return (count ?? 0) > 0;
  }

  // ── Send web push to all devices of a user ──────────────────────────────────

  private async sendPushToUser(userId: string, payload: PushPayload) {
    const { data: subs } = await this.supabase.admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth_key')
      .eq('user_id', userId);

    if (!subs || subs.length === 0) return;

    await Promise.all(
      (subs as { endpoint: string; p256dh: string; auth_key: string }[]).map((sub) =>
        webpush
          .sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
            JSON.stringify(payload),
          )
          .catch(() => {}), // ignore expired/invalid subscriptions
      ),
    );
  }

  // ── Main trigger — called after stock goes 0 → >0 ───────────────────────────

  async triggerStockNotification(productId: string) {
    const { data: product } = await this.supabase.admin
      .from('products')
      .select('name')
      .eq('id', productId)
      .single();

    if (!product) return;
    const productName = (product as { name: string }).name;

    const { data: subs } = await this.supabase.admin
      .from('stock_notifications')
      .select('id, user_id')
      .eq('product_id', productId)
      .is('notified_at', null);

    console.log(`[Notifications] Stock trigger for "${productName}" — ${subs?.length ?? 0} subscriber(s)`);
    if (!subs || subs.length === 0) return;

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const shopUrl = `${frontendUrl}/shop?q=${encodeURIComponent(productName)}`;

    const pushPayload: PushPayload = {
      title: `🎉 ${productName} is back in stock!`,
      body: 'Tap to shop before it sells out.',
      url: shopUrl,
      icon: '/icon-192.png',
    };

    const sentIds: string[] = [];

    await Promise.all(
      (subs as { id: string; user_id: string }[]).map(async (sub) => {
        try {
          const { data: authData } = await this.supabase.admin.auth.admin.getUserById(sub.user_id);
          const authUser = authData?.user as {
            email?: string;
            user_metadata?: Record<string, unknown>;
          } | null;

          // Send email if available
          const email = authUser?.email;
          if (email) {
            const name = (authUser?.user_metadata?.['name'] as string) ?? 'there';
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'ZestStar <info@zeststar.in>',
                to: email,
                subject: `🎉 ${productName} is back in stock at ZestStar!`,
                html: `
                  <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
                    <h2 style="color:#2E7D32;margin-bottom:4px">ZestStar</h2>
                    <p style="color:#333;font-size:16px;margin-bottom:8px">Hi ${name},</p>
                    <p style="color:#555;font-size:15px;margin-bottom:24px">
                      Great news! <strong>${productName}</strong> is back in stock.
                      Grab it before it sells out again!
                    </p>
                    <a href="${shopUrl}"
                       style="display:inline-block;background:#2E7D32;color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px">
                      Shop Now →
                    </a>
                    <p style="color:#999;font-size:13px;margin-top:28px">
                      You received this because you opted in for back-in-stock alerts on ZestStar.
                    </p>
                  </div>`,
              }),
            }).catch(() => {});
          }

          // Send web push
          await this.sendPushToUser(sub.user_id, pushPayload);

          // Mark subscription as notified
          sentIds.push(sub.id);

          // Persist to notification centre (non-fatal — separate from push delivery)
          this.supabase.admin.from('user_notifications').insert({
            user_id: sub.user_id,
            type: 'back_in_stock',
            title: `${productName} is back in stock!`,
            body: 'Grab it before it sells out.',
            data: { product_id: productId },
          }).then(({ error }) => {
            if (error) console.error('[Notifications] Failed to store stock notification record:', error.message);
          });
        } catch (err) {
          console.error('[Notifications] Failed to notify user', sub.user_id, err);
        }
      }),
    );

    if (sentIds.length > 0) {
      await this.supabase.admin
        .from('stock_notifications')
        .update({ notified_at: new Date().toISOString() })
        .in('id', sentIds);
    }
  }

  // ── Price-drop trigger — called when admin lowers a product's price ──────────

  async triggerPriceDropNotification(
    productId: string,
    productName: string,
    oldPrice: number,
    newPrice: number,
  ) {
    // ── 1. Wishlist users ────────────────────────────────────────────────────
    const { data: wishers } = await this.supabase.admin
      .from('wishlists')
      .select('user_id')
      .eq('product_id', productId);
    const wishlistIds = new Set((wishers ?? []).map((w) => (w as { user_id: string }).user_id));

    // ── 2. Past purchasers (bought 30–90 days ago, not recently) ────────────
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: recentOrders } = await this.supabase.admin
      .from('orders')
      .select('user_id, created_at, order_items!inner(product_id)')
      .eq('order_items.product_id', productId)
      .neq('status', 'cancelled')
      .gte('created_at', ninetyDaysAgo);

    // Track each user's most recent purchase date for this product
    const userLatestOrder = new Map<string, Date>();
    for (const o of (recentOrders ?? []) as { user_id: string; created_at: string }[]) {
      const d = new Date(o.created_at);
      const existing = userLatestOrder.get(o.user_id);
      if (!existing || d > existing) userLatestOrder.set(o.user_id, d);
    }

    // Eligible: last purchase was 30–90 days ago (not within the last 30 days)
    const cutoff = new Date(thirtyDaysAgo);
    const pastPurchaserIds = [...userLatestOrder.entries()]
      .filter(([, d]) => d < cutoff)
      .map(([uid]) => uid);

    // ── 3. Merge & deduplicate ───────────────────────────────────────────────
    const allUserIds = [...new Set([...wishlistIds, ...pastPurchaserIds])];
    if (allUserIds.length === 0) return;

    // ── 4. Notify each user ──────────────────────────────────────────────────
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const shopUrl = `${frontendUrl}/shop/${productId}`;
    const saving = oldPrice - newPrice;

    const pushPayload: PushPayload = {
      title: `💰 Price drop: ${productName}`,
      body: `Now ₹${newPrice} (save ₹${saving}). Tap to shop!`,
      url: shopUrl,
      icon: '/icon-192.png',
    };

    await Promise.all(
      allUserIds.map(async (user_id) => {
        try {
          const isWishlistUser = wishlistIds.has(user_id);
          const emailFooter = isWishlistUser
            ? `You received this because ${productName} is on your ZestStar wishlist.`
            : `You received this because you previously purchased ${productName} from ZestStar.`;
          const emailIntro = isWishlistUser
            ? 'Good news! A product on your wishlist just dropped in price:'
            : 'Good news! A product you previously bought just dropped in price:';

          const { data: authData } = await this.supabase.admin.auth.admin.getUserById(user_id);
          const authUser = authData?.user as { email?: string; user_metadata?: Record<string, unknown> } | null;
          const email = authUser?.email;
          if (email) {
            const name = (authUser?.user_metadata?.['name'] as string) ?? 'there';
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'ZestStar <info@zeststar.in>',
                to: email,
                subject: `💰 Price drop! ${productName} is now ₹${newPrice}`,
                html: `
                  <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
                    <h2 style="color:#2E7D32;margin-bottom:4px">ZestStar</h2>
                    <p style="color:#333;font-size:16px">Hi ${name},</p>
                    <p style="color:#555;font-size:15px">${emailIntro}</p>
                    <p style="font-size:18px;font-weight:bold;color:#111">${productName}</p>
                    <p style="font-size:16px">
                      <s style="color:#999">₹${oldPrice}</s>
                      &nbsp;→&nbsp;
                      <span style="color:#2E7D32;font-size:20px;font-weight:bold">₹${newPrice}</span>
                      &nbsp;<span style="color:#F57C00;font-weight:bold">(Save ₹${saving}!)</span>
                    </p>
                    <a href="${shopUrl}" style="display:inline-block;margin-top:16px;background:#2E7D32;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px">
                      Shop Now →
                    </a>
                    <p style="color:#999;font-size:13px;margin-top:28px">${emailFooter}</p>
                  </div>`,
              }),
            }).catch(() => {});
          }

          await this.sendPushToUser(user_id, pushPayload);

          this.supabase.admin.from('user_notifications').insert({
            user_id,
            type: 'price_drop',
            title: `Price drop: ${productName}`,
            body: `Now ₹${newPrice} — save ₹${saving}. Tap to shop!`,
            data: { product_id: productId },
          }).then(({ error }) => {
            if (error) console.error('[Notifications] Failed to store price drop notification:', error.message);
          });
        } catch { /* non-fatal */ }
      }),
    );

    console.log(
      `[Notifications] Price drop "${productName}" ₹${oldPrice}→₹${newPrice} — ` +
      `${wishlistIds.size} wishlist + ${pastPurchaserIds.length} past purchaser(s) notified`,
    );
  }

  // ── Notification centre ─────────────────────────────────────────────────────

  private urlForType(type: string, data: Record<string, unknown>): string {
    if (type === 'order_update' && data['order_id']) return `/orders/${data['order_id']}`;
    if ((type === 'back_in_stock' || type === 'price_drop') && data['product_id']) return `/shop/${data['product_id']}`;
    return '/notifications';
  }

  async createNotification(
    userId: string,
    type: string,
    title: string,
    body: string,
    data: Record<string, unknown> = {},
  ): Promise<void> {
    // Check user preference for this type (skip if explicitly disabled)
    const prefKey = ({ order_update: 'order_updates', back_in_stock: 'back_in_stock', price_drop: 'price_drops', referral_reward: 'referral_rewards' } as Record<string, string>)[type];
    if (prefKey) {
      const { data: prefs } = await this.supabase.admin
        .from('notification_preferences').select(prefKey).eq('user_id', userId).maybeSingle();
      if (prefs && !(prefs as unknown as Record<string, boolean>)[prefKey]) return;
    }

    const { error: insertError } = await this.supabase.admin
      .from('user_notifications')
      .insert({ user_id: userId, type, title, body, data });
    if (insertError) throw new Error(insertError.message);

    // Send web push
    const url = this.urlForType(type, data);
    this.sendPushToUser(userId, { title, body, url, icon: '/icon-192.png' }).catch(() => {});
  }

  async listForUser(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const { data, error, count } = await this.supabase.admin
      .from('user_notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw new BadRequestException(error.message);
    return { data: { notifications: data ?? [], total: count ?? 0, page, limit }, message: 'Success' };
  }

  async getUnreadCount(userId: string) {
    const { count } = await this.supabase.admin
      .from('user_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);
    return { data: { count: count ?? 0 }, message: 'Success' };
  }

  async markRead(userId: string, id: string) {
    await this.supabase.admin
      .from('user_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id).eq('user_id', userId).is('read_at', null);
    return { data: null, message: 'Marked as read' };
  }

  async markAllRead(userId: string) {
    await this.supabase.admin
      .from('user_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId).is('read_at', null);
    return { data: null, message: 'All marked as read' };
  }

  async getPreferences(userId: string) {
    const { data } = await this.supabase.admin
      .from('notification_preferences').select('*').eq('user_id', userId).maybeSingle();
    const defaults = { order_updates: true, back_in_stock: true, price_drops: true, referral_rewards: true, push_enabled: true, email_enabled: true };
    return { data: { preferences: data ?? { user_id: userId, ...defaults } }, message: 'Success' };
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    const { data, error } = await this.supabase.admin
      .from('notification_preferences')
      .upsert({ user_id: userId, ...dto, updated_at: new Date().toISOString() })
      .select().single();
    if (error) throw new BadRequestException(error.message);
    return { data: { preferences: data }, message: 'Preferences updated' };
  }

  // Pure inner logic — used by both scheduler and manual trigger
  async doPurgeOldNotifications(): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 15);
    const { data, error } = await this.supabase.admin
      .from('user_notifications')
      .delete()
      .lt('created_at', cutoff.toISOString())
      .select('id');
    if (error) throw new Error(error.message);
    return Array.isArray(data) ? data.length : 0;
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async purgeOldNotifications() {
    const logId = await this.cronJobs.logStart('notification_purge').catch(() => null);
    try {
      const count = await this.doPurgeOldNotifications();
      if (logId) await this.cronJobs.logComplete(logId, 'success', count);
      console.log(`[Notifications] Purged ${count} notifications older than 15 days`);
    } catch (err) {
      if (logId) await this.cronJobs.logComplete(logId, 'failed', 0, (err as Error)?.message);
      console.error('[Notifications] Failed to purge old notifications:', err);
    }
  }
}
