# ZestStar React Native App — Complete Plan (6 Months to November)

> **Status:** Planning phase  
> **Target:** Android + iOS on Play Store & App Store by November 2026  
> **Approach:** Expo (Managed Workflow) + Expo Router + NativeWind

---

## Is It Worth It?

**Yes — unambiguously for an Indian grocery delivery app.**

- 95%+ of Indian users are on Android. A Play Store app with an icon on the home screen generates 2–3× more repeat orders than the mobile web.
- Push notifications through FCM (Firebase) are far more reliable than VAPID web push on mobile.
- App store credibility — Indian consumers trust apps more than websites for payments.
- With 6 months, you can ship a polished, full-featured app to both stores.
- **You can reuse 100% of the backend API** and **~70% of the business logic** (Zustand stores, TypeScript types, API functions). You're only rebuilding the UI layer.

---

## Tech Stack

| Choice | Why |
|---|---|
| **Expo** (Managed Workflow) | EAS Build (cloud builds — no Mac needed for iOS initially), EAS Submit, OTA updates |
| **Expo Router v3** | File-based routing identical to Next.js App Router — same mental model |
| **NativeWind v4** | Tailwind CSS classes work in React Native — drastically reduces styling effort |
| **Zustand** (same as web) | Cart, auth, wishlist, notifications stores work unchanged |
| **React Native MMKV** | Replaces localStorage for Zustand persistence — 10× faster than AsyncStorage |
| **expo-secure-store** | Secure token storage (replaces sessionStorage for admin, localStorage for auth) |
| **@supabase/supabase-js** | Same Supabase client — works in React Native |
| **expo-notifications** | FCM push notifications (replaces VAPID web push) |
| **expo-location** | GPS for address auto-fill |
| **react-native-reanimated** | Smooth animations (cart add, page transitions) |
| **@shopify/flash-list** | High-performance product catalog lists |
| **react-native-bottom-sheet** | Cart bottom sheet (like Blinkit/Zepto) |
| **Axios** | Already in the project — works in React Native unchanged |

### What Gets Reused (Zero Changes)
- ✅ All 22 API client files (`lib/api/*.ts`)
- ✅ All 4 Zustand stores (auth, cart, wishlist, notifications)
- ✅ All TypeScript types (`lib/types.ts`)
- ✅ All business logic (cart calculations, tier logic, etc.)
- ✅ NestJS backend (unchanged)

### What Gets Rebuilt (UI Only)
- All screens → React Native components + NativeWind
- Navigation → Expo Router
- Icons → @expo/vector-icons
- Push → FCM via expo-notifications
- Images → expo-image

---

## Project Structure

```
zeststar-mobile/
├── app/
│   ├── (auth)/
│   │   ├── login.tsx
│   │   ├── verify.tsx
│   │   └── profile-setup.tsx
│   ├── (tabs)/
│   │   ├── index.tsx        ← Home
│   │   ├── shop.tsx         ← Catalog
│   │   ├── orders.tsx       ← Orders
│   │   ├── wallet.tsx       ← Coins
│   │   └── profile.tsx      ← Profile
│   ├── shop/[id].tsx
│   ├── orders/[id].tsx
│   ├── checkout.tsx
│   ├── notifications.tsx
│   ├── notifications/settings.tsx
│   ├── wishlist.tsx
│   ├── subscriptions.tsx
│   ├── recipes/index.tsx
│   ├── recipes/[id].tsx
│   └── _layout.tsx
├── components/
├── lib/                     ← Copied from web (api/, store/, types.ts)
├── app.json
├── eas.json
└── tailwind.config.js
```

---

## Complete Screen List

### Auth (4 screens)
- [ ] Login — phone OTP input
- [ ] OTP Verify — 6-digit input + auto-submit
- [ ] Profile Setup — name + email for new users
- [ ] Auth Callback — deep link handler

### Bottom Tabs (5 tabs)
- [ ] Home — ReorderSuggestions, PromoCarousel, CategoriesGrid, FeaturedBundles, TrendingProducts
- [ ] Shop — Product catalog with search + category filter
- [ ] Orders — Order history list
- [ ] Wallet — Coins balance + ledger
- [ ] Profile — User info, addresses, tier, subscriptions, referral

### Shopping
- [ ] Product Detail — image gallery, Add to Cart, reviews, notify me
- [ ] Cart Bottom Sheet — items, qty controls, promo, coins, checkout CTA

### Checkout
- [ ] Address selection + add new + GPS + pincode check
- [ ] Delivery instructions (presets + custom)
- [ ] Delivery slot picker
- [ ] Promo code + coins
- [ ] Order summary + Place Order

### Orders
- [ ] Orders List — status-grouped, item thumbnails
- [ ] Order Detail — timeline, tracking, items, pricing, edit, rate, refund status

### Profile Section
- [ ] Profile — edit name/email, logout
- [ ] Addresses — list, add, edit, delete, set default, delivery instructions
- [ ] Loyalty Status — tier, progress bar, coin rate
- [ ] Subscriptions — list, pause, resume, cancel
- [ ] Referral — code, share, earnings

### Wallet
- [ ] Balance + tier card + progress bar
- [ ] Ledger history (paginated)

### Notifications
- [ ] Notifications List — grouped, read/unread, mark all read
- [ ] Settings — toggle per type + push/email

### Wishlist
- [ ] Product grid, remove, add to cart, share link

### Recipes
- [ ] Recipe List — grid cards
- [ ] Recipe Detail — ingredients, add all to cart

---

## 6-Month Timeline

| Month | Dates | Focus | Deliverable |
|---|---|---|---|
| **1** | May 17 – Jun 16 | Foundation, Auth, Home | App boots + OTP login |
| **2** | Jun 16 – Jul 16 | Catalog, Cart, Wishlist | Browse & add to cart |
| **3** | Jul 16 – Aug 16 | Checkout, Orders | Full order flow |
| **4** | Aug 16 – Sep 16 | Profile, Wallet, Subscriptions, Notifications | Complete account |
| **5** | Sep 16 – Oct 16 | Recipes, Reviews, Order Editing, Push Notifications | Feature parity |
| **6** | Oct 16 – Nov 16 | QA, Icons, Store Submission | **Both apps live** |

### Month 1 — Foundation
- [ ] W1: Create Expo project, NativeWind config, Expo Router setup, copy `lib/api/` + `lib/store/`
- [ ] W2: Login screen, OTP verify, profile setup, secure token storage
- [ ] W3: Home screen (reorder suggestions, categories, featured products)
- [ ] W4: Firebase setup, expo-notifications, FCM token registration

### Month 2 — Core Shopping
- [ ] W1: Product catalog — FlashList grid, search, category filter chips, sort
- [ ] W2: Product detail — image gallery (swipe), product info, Add to Cart, Notify Me
- [ ] W3: Cart bottom sheet — items, qty controls, promo input, coins, totals
- [ ] W4: Wishlist screen, stock notification subscription

### Month 3 — Checkout + Orders
- [ ] W1: Checkout — address selection, add new, GPS, pincode serviceability
- [ ] W2: Checkout — slot picker, promo, coins, summary, Place Order
- [ ] W3: Orders list — status tabs, order cards with thumbnails
- [ ] W4: Order detail — timeline, items, address, cancel, edit order

### Month 4 — User Account
- [ ] W1: Profile screen, saved addresses (CRUD), delivery instructions
- [ ] W2: Wallet — balance, tier card, progress bar, ledger
- [ ] W3: Subscriptions — list, pause, resume, cancel
- [ ] W4: Notifications (list + settings), Referral screen

### Month 5 — Advanced Features
- [ ] W1: Recipes list + detail (add all to cart)
- [ ] W2: Reviews + star rating (post-delivery), order editing
- [ ] W3: Push notification handlers (order status, price drops, back-in-stock, refund)
- [ ] W4: Performance — FlashList tuning, image caching, reduce re-renders

### Month 6 — QA + Store Launch
- [ ] W1: App icon (1024×1024), splash screen, UI polish
- [ ] W2: Real device testing (multiple Android sizes), bug fixes, TestFlight iOS
- [ ] W3: Play Store listing — screenshots, description, privacy policy URL, submit
- [ ] W4: App Store listing — screenshots, submit for review

---

## Navigation Structure

```
Stack Navigator (root)
├── Auth Stack
│   ├── Login
│   ├── OTP Verify
│   └── Profile Setup
└── Tab Navigator (authenticated)
    ├── Home
    ├── Shop → Product Detail
    ├── Orders → Order Detail
    ├── Wallet
    └── Profile → Addresses → Add/Edit Address
                → Subscriptions
                → Referral
                → Notifications Settings
```

---

## Testing Strategy

| Method | When |
|---|---|
| Android Emulator (Android Studio) | Daily during development |
| Physical Android via USB | Weekly real-world checks |
| Expo Go (scan QR) | Quick previews on any device |
| APK sideload via WhatsApp/Drive | Beta testing with friends/family |
| Google Play Internal Testing | Pre-launch (up to 100 testers) |
| TestFlight | iOS beta (requires $99 Apple account) |

---

## Store Requirements

### Google Play — $25 one-time
- App icon: 512×512 PNG
- Feature graphic: 1024×500 PNG
- Min 2 screenshots per device type
- Privacy policy URL (required)

### Apple App Store — $99/year
- App icon: 1024×1024 PNG
- Screenshots for 6.5" iPhone + 12.9" iPad
- Privacy policy URL
- Review time: 1–3 days

---

## Costs

| Item | Cost |
|---|---|
| Google Play Developer | $25 one-time |
| Apple Developer | $99/year |
| EAS Build (Expo) | Free tier sufficient |
| Firebase (FCM) | Free tier |
| **Total Year 1** | **~$124** |

---

## Environment Variables (Mobile)

```
EXPO_PUBLIC_API_URL=https://your-railway-backend.up.railway.app/api
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
# FCM configured via Firebase project (no env var needed for client)
```

---

## Feature Parity Tracker

| Feature | Web | Mobile |
|---|---|---|
| Phone OTP login | ✅ | ⬜ Month 1 |
| Home screen (reorder, promos, categories, bundles) | ✅ | ⬜ Month 1 |
| Product catalog + search | ✅ | ⬜ Month 2 |
| Product detail + image gallery | ✅ | ⬜ Month 2 |
| Cart + promo + coins | ✅ | ⬜ Month 2 |
| Wishlist + share | ✅ | ⬜ Month 2 |
| Checkout (address, slot, instructions) | ✅ | ⬜ Month 3 |
| Order list + tracking | ✅ | ⬜ Month 3 |
| Refund tracking | ✅ | ⬜ Month 3 |
| Profile + addresses | ✅ | ⬜ Month 4 |
| Wallet + loyalty tier (configurable) | ✅ | ⬜ Month 4 |
| Subscriptions | ✅ | ⬜ Month 4 |
| Referral program | ✅ | ⬜ Month 4 |
| Notifications centre + settings | ✅ | ⬜ Month 4 |
| Recipes | ✅ | ⬜ Month 5 |
| Reviews + ratings | ✅ | ⬜ Month 5 |
| Order editing | ✅ | ⬜ Month 5 |
| Push notifications (FCM) | ✅ VAPID | ⬜ Month 1 |
| Back-in-stock / price drop alerts | ✅ | ⬜ Month 5 |
| **Play Store (Android)** | — | ⬜ **November** |
| **App Store (iOS)** | — | ⬜ **November** |
