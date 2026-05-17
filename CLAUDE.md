# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ZestStar is a grocery & dry fruits eCommerce platform for the Indian market. Monorepo layout:

- `frontend/` — Next.js 14 (TypeScript, Tailwind, App Router)
- `backend/` — NestJS (TypeScript, Supabase client)

Hosted on Vercel (frontend) and Railway (backend), with Supabase as the central hub for PostgreSQL, Auth, Realtime, and Storage.

## Commands

### Frontend (`frontend/`)
```bash
npm run dev        # dev server (localhost:3000)
npm run build      # production build
npm run lint       # ESLint
```

### Backend (`backend/`)
```bash
npm run start:dev  # dev with watch (localhost:3001)
npm run build      # compile TypeScript
npm run test       # unit + integration (Jest)
```

## Architecture

### Backend — NestJS

Feature-based modules under `src/features/`. Each feature has a `module`, `controller`, and `service`. A shared `SupabaseService` at `src/supabase/` provides the admin client (uses `SUPABASE_SERVICE_ROLE_KEY`, bypasses RLS).

All protected routes use `SupabaseAuthGuard` from `src/guards/`. Admin-only routes additionally use `AdminGuard`. The guards validate Supabase JWTs and populate `req.user`.

Standard service method pattern:
```typescript
const { data, error } = await this.supabase.admin.from('table').select('*').eq('user_id', userId);
if (error) throw new BadRequestException(error.message);
return data;
```

**Feature modules** (`src/features/`):
`addresses`, `admin`, `auth`, `categories`, `coins`, `cron-jobs`, `delivery-slots`, `drivers`, `notifications`, `orders`, `products`, `promo`, `purchase-invoices`, `recipes`, `referral`, `reviews`, `serviceable-areas`, `stock-movements`, `subscriptions`, `wishlist`

### Frontend — Next.js 14 App Router

Route groups:
- `(auth)/` — phone OTP login flow (phone → OTP → profile setup)
- `(shop)/` — product catalog, cart sidebar
- `admin/` — admin dashboard (15+ tabs)
- `checkout/` — delivery slot + address + payment
- `notifications/` — notification centre + settings
- `orders/` — order list + live tracking (polling every 8-15s)
- `profile/` — user profile, addresses, loyalty tier, referral
- `shop/` — product detail with image gallery slider
- `subscriptions/` — recurring order management
- `wallet/` — ZestStar coins balance + history
- `wishlist/` — saved items + share link

Zustand stores: `authStore`, `cartStore`, `notificationsStore`, `wishlistStore`

API clients live in `frontend/lib/api/` — one file per domain. All call `NEXT_PUBLIC_API_URL`.

### API Response Format
```json
{ "data": { ... }, "message": "Success" }      // 200
{ "error": "...", "details": { ... } }           // 400
```

Pagination: `?page=1&limit=20` (max 100). Responses include `total` count.

### Database (Supabase/PostgreSQL)

Key tables:
- `products` — catalog with `image_url` (primary) + `image_urls text[]` (up to 5 images)
- `bundle_items` — bundle constituents (`bundle_id`, `product_id`, `quantity`)
- `orders`, `order_items`, `order_events` — order lifecycle + status timeline
- `user_wallet` — ZestStar coins (`coins_balance`, `total_earned`, `total_spent`, `total_order_value`, `tier`)
- `coins_ledger` — coin transaction log (earn/spend/refund)
- `subscriptions` — recurring orders (`frequency`: daily/weekly/monthly, `next_delivery_date`)
- `delivery_slots` — date+time windows with `capacity` and `booked` counters
- `stock_notifications` — back-in-stock opt-ins (`notified_at` reset on re-subscribe)
- `user_notifications` — persistent notification history (all types, read/unread)
- `notification_preferences` — per-user channel + type opt-in settings
- `push_subscriptions` — device push credentials (VAPID web push)
- `cron_job_logs` — scheduled job execution history (status, duration, records_processed)
- `referral_codes` — unique referral codes per user
- `referrals` — referral tracking (pending → rewarded on first order)
- `serviceable_areas` — delivery pincode allow-list
- `vendors`, `purchase_invoices`, `purchase_invoice_items` — stock purchasing
- `drivers` — delivery driver management

RLS is enabled on all customer-facing tables. The backend always uses the service role client (bypasses RLS).

### Brand Colors
- Primary green: `#2E7D32`
- Accent orange: `#F57C00`
- Background cream: `#FAFAF5`

## Key Architectural Decisions

**Stock management:**
- Bundle stock is virtual — computed as `min(floor(constituent_stock / required_qty))` by `applyBundleStockOverride()` in `products.service.ts`. Never stored directly.
- When a bundle is ordered, constituent stocks are decremented (not the bundle itself). Same for cancellation restores.
- Purchase invoices are the only way to add stock to non-bundle products. When invoice is submitted: stock incremented → if 0→>0, `triggerStockNotification()` fires automatically.
- The `subscribe()` upsert always includes `notified_at: null` so re-subscriptions reset the flag and customers get re-notified next time stock arrives.

**Orders:**
- `ordersService.create()` is the single source for stock decrement and 'sale' stock movements.
- Coin earn rate is multiplier-based on loyalty tier (Bronze 1×, Silver 1.5×, Gold 2×, Platinum 3× at ₹5k/₹15k/₹30k total spend thresholds). Updated in `coinsService.updateOrderValue()`.
- Delivery slot `booked` counter is incremented on order create, decremented on cancel.
- Referral reward fires on first non-cancelled order: 100 coins to both referrer and referred.

**Notifications:**
- `createNotification(userId, type, title, body, data)` checks `notification_preferences` before inserting into `user_notifications` and sending web push.
- Stock/price-drop triggers bypass `createNotification` — they handle email+push directly and insert to `user_notifications` separately as a non-fatal fire-and-forget. Always check Supabase insert errors explicitly (`const { error } = await ...insert(...)`) — Supabase never throws on failure.
- `user_notifications` purged daily at 2AM UTC — entries older than 15 days deleted.

**Delivery:**
- Pincode serviceability is optional at checkout. Backend validates `delivery_pincode` against `serviceable_areas` only if provided (backward compatible with no-pincode addresses).
- Slot selection is optional — the Place Order button enables based on address alone.

**Admin panel:**
- All admin panels in `frontend/components/admin/AdminXxxPanel.tsx`.
- Tabs: dashboard, inventory, categories, slots, orders, reorder, promos, subscriptions, recipes, purchases, customers, drivers, bundles, serviceable, cron-jobs.
- Cron Jobs tab shows real-time status cards, execution history table, and "Run Now" manual trigger.

**Referral & Loyalty:**
- 8-char referral codes generated on demand per user (`referral_codes` table).
- Profile setup page has an optional referral code field — `applyReferralCode()` called after `updateProfile()` succeeds.

## Scheduled Jobs

| Job name | Schedule | Purpose |
|---|---|---|
| `subscription_deliveries` | `0 6 * * *` Asia/Kolkata | Creates orders for due subscriptions, returns processed count |
| `notification_purge` | `EVERY_DAY_AT_2AM` UTC | Deletes `user_notifications` older than 15 days |

Both jobs register runners in `CronJobsService.registerRunner()` on module init, enabling manual triggering from the admin Cron Jobs tab. All executions logged to `cron_job_logs`.
