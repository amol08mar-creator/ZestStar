---
name: zeststar
description: "Build features for the ZestStar grocery & dry fruits eCommerce platform. Use this skill whenever the user is working on ZestStar — whether they're setting up the project, building auth, product catalog, cart, checkout, tracking, or admin features. The skill provides quick architectural decisions, code templates, database schemas, API contracts, and testing strategies. Triggers on: 'ZestStar', 'eCommerce platform', 'grocery app', 'next.js backend setup', or specific features like 'OTP login', 'product search', 'order tracking', 'delivery slots'."
compatibility: "Node.js 18+, npm, Next.js 14+, NestJS, PostgreSQL, Supabase"
---

# ZestStar — Quick Build Guide

**Stack:** Next.js 14 frontend + NestJS backend + Supabase (PostgreSQL/Auth/Realtime/Storage) + Railway hosting + Vercel frontend

**Color scheme:** Green #2E7D32 (primary) · Orange #F57C00 (accent) · Yellow #FDD835 (highlight) · Cream #FAFAF5 (bg)

---

## 1. Project Setup (5 min)

```bash
# Frontend (Next.js)
npx create-next-app@latest zeststar-web --ts --tailwind --eslint
cd zeststar-web
npm install @supabase/supabase-js @supabase/ssr zustand axios next-navigation

# Backend (NestJS) — separate folder
cd ..
npx @nestjs/cli@latest new zeststar-api --package-manager npm
cd zeststar-api
npm install @supabase/supabase-js @nestjs/throttler stripe dotenv class-validator class-transformer
```

**.env files:**

`frontend/.env.local:`
```
NEXT_PUBLIC_SUPABASE_URL=<your-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-key>
```

`backend/.env:`
```
DATABASE_URL=postgresql://user:pass@localhost/zeststar
SUPABASE_URL=<your-url>
SUPABASE_SERVICE_ROLE_KEY=<your-key>
JWT_SECRET=<32-char-random>
MSG91_AUTH_KEY=<your-key>
MSG91_TEMPLATE_ID=<template-id>
STRIPE_API_KEY=<stripe-key>
PORT=3001
```

---

## 2. Feature Checklist — Pick One

Each feature has a **5-min summary** + **code templates** + **tests to write**.

### ✓ Auth — Phone OTP Login (Done in Supabase)

**What Supabase handles:** OTP generation, hashing, 5-min expiry, 3-attempt limit, session tokens, refresh rotation.

**Your job:**
1. Enable Phone provider in Supabase dashboard
2. Create Supabase Edge Function for MSG91 SMS hook
3. Build Next.js UI: phone entry → OTP entry → profile setup
4. NestJS guard: validate JWT tokens on protected routes

**Frontend UI — 3 screens:**
- Screen 1: Phone input + Send OTP button
- Screen 2: 6-digit OTP entry + 30s resend timer
- Screen 3: New user profile setup (name, email)

**Code template:** See `/references/auth-phones-otp.md`

**Test:** E2E test — login flow end-to-end, session persists on refresh

---

### ✓ Product Catalog — Browse & Search

**Database schema:**
```sql
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  price_rupees integer NOT NULL,
  discount_percent integer DEFAULT 0,
  stock integer DEFAULT 0,
  description text,
  rating numeric DEFAULT 0,
  image_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_search ON products USING gin(to_tsvector('english', name || ' ' || description));
```

**Frontend:**
- Category sidebar (Vegetables, Fruits, Dry Fruits, Spices, etc.)
- Search bar with autocomplete
- Grid of product cards (image, name, price, discount badge, star rating)
- Infinite scroll or pagination

**API — GET /products:**
```json
{
  "products": [
    { "id": "uuid", "name": "Organic Spinach", "category": "vegetables", 
      "price": 45, "discount": 20, "image": "url", "rating": 4.8, "stock": 120 }
  ],
  "total": 2500
}
```

**Filter params:** `?category=vegetables&search=spinach&page=1&limit=20&sort=rating`

**Test:** Search "spinach" → returns spinach products. Filter by category → only that category shown.

---

### ✓ Smart Cart

**Database schema:**
```sql
CREATE TABLE carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  quantity integer DEFAULT 1,
  added_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_cart_user_product ON carts(user_id, product_id);
```

**Frontend features:**
- Add to cart → quantity +1 if product exists, else create
- Cart sidebar: list items, qty +/- buttons, remove button
- Subtotal + applied discounts + total
- "Save for later" (move to wishlist)
- "Buy again" (recent order quick-add)

**API — POST /cart/add:**
```json
{
  "product_id": "uuid",
  "quantity": 2
}
→ { "cart_id": "uuid", "items_count": 5, "total_rupees": 1200 }
```

**API — DELETE /cart/{product_id}:**
```json
→ { "items_count": 4, "total_rupees": 980 }
```

**Test:** Add 2 spinach → qty shows 2. Add 3 more → qty shows 5. Remove → cart empty.

---

### ✓ Delivery Slots — Pick Date & Time

**Database schema:**
```sql
CREATE TABLE delivery_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  time_start time NOT NULL,
  time_end time NOT NULL,
  capacity integer DEFAULT 100,
  booked integer DEFAULT 0,
  is_enabled boolean DEFAULT true
);

CREATE TABLE order_slots (
  order_id uuid REFERENCES orders(id),
  slot_id uuid REFERENCES delivery_slots(id),
  PRIMARY KEY (order_id, slot_id)
);
```

**Frontend:**
- Calendar picker (next 7 days only, hide past dates)
- For each date, show available 2-hour slots (10am-12pm, 2pm-4pm, 4pm-6pm, etc.)
- Disable slots with zero capacity
- Display "₹0 delivery" or "₹20 delivery" depending on cart total

**API — GET /delivery-slots?date=2025-04-20:**
```json
[
  { "id": "uuid", "time": "10:00-12:00", "available": 45, "delivery_fee": 0 },
  { "id": "uuid", "time": "14:00-16:00", "available": 12, "delivery_fee": 0 }
]
```

**API — POST /cart/apply-slot:**
```json
{
  "slot_id": "uuid"
}
→ { "slot": "10:00-12:00", "delivery_date": "2025-04-20", "delivery_fee": 0 }
```

**Test:** Pick date → available slots shown. Select slot → checkout shows "Delivery 10am-12pm".

---

### ✓ Checkout & Payment (Razorpay)

**Order schema:**
```sql
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  items_total integer NOT NULL,
  delivery_fee integer DEFAULT 0,
  discount_amount integer DEFAULT 0,
  final_total integer NOT NULL,
  slot_id uuid REFERENCES delivery_slots(id),
  payment_status text DEFAULT 'pending', -- pending, paid, failed
  razorpay_order_id text,
  razorpay_payment_id text,
  status text DEFAULT 'placed', -- placed, confirmed, shipped, delivered, cancelled
  created_at timestamptz DEFAULT now()
);
```

**Flow:**
1. Review cart + delivery slot + address
2. Click "Pay now" → Razorpay modal opens
3. User selects UPI/Card/Wallet
4. On success → order created, cart cleared, show "Order #XYZ placed"
5. On failure → show error, keep cart intact

**API — POST /checkout:**
```json
{
  "address_id": "uuid",
  "slot_id": "uuid",
  "payment_method": "upi"
}
→ {
  "razorpay_order_id": "order_...",
  "razorpay_key_id": "rzp_...",
  "amount_paise": 120000
}
```

**API — POST /checkout/verify:**
```json
{
  "razorpay_order_id": "order_...",
  "razorpay_payment_id": "pay_...",
  "razorpay_signature": "sig_..."
}
→ {
  "order_id": "uuid",
  "status": "paid",
  "order_number": "ORD-20250420-001"
}
```

**Razorpay fee:** 2% + 18% GST on card/netbanking. UPI is 0 MDR + ~1% platform fee.

**Test:** Add items → checkout → verify payment → order shows "Paid". Refresh page → order still shows.

---

### ✓ Order Tracking (Live Map + Timeline)

**Timeline events:**
```sql
CREATE TABLE order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  event_type text, -- 'order_placed', 'confirmed', 'packed', 'out_for_delivery', 'delivered'
  event_time timestamptz DEFAULT now(),
  driver_location geography(Point), -- lat, lng for live delivery
  notes text
);
```

**Frontend:**
- Timeline: placed (✓) → confirmed (✓) → packed (✓) → out for delivery (🔵 live) → delivered
- Live map: pin shows current driver location, delivery address pin, route preview
- Driver phone: "Call driver" button (masked)
- ETA: "Arriving in 12 mins"

**API — GET /orders/{order_id}:**
```json
{
  "order": { ... },
  "timeline": [
    { "event": "placed", "time": "2025-04-20 10:30", "status": "done" },
    { "event": "confirmed", "time": "2025-04-20 10:45", "status": "done" },
    { "event": "packed", "time": "2025-04-20 11:30", "status": "done" },
    { "event": "out_for_delivery", "time": "2025-04-20 13:50", "status": "in_progress" }
  ],
  "driver": { "name": "Raj", "phone": "+91 98765XXXX1", "vehicle": "Hero Bike" },
  "location": { "lat": 19.0176, "lng": 72.8479 },
  "eta_mins": 12
}
```

**WebSocket for live updates:** Supabase Realtime channel `order:{order_id}`
```javascript
supabase
  .channel(`order:${orderId}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'order_events' }, 
    (payload) => { /* update map + timeline */ })
  .subscribe();
```

**Test:** Place order → timeline shows "Placed". Manually insert "confirmed" event → UI updates live (no refresh).

---

### ✓ Admin Dashboard

**Features:**
- Orders list: filter by status (placed, shipped, delivered), date range
- Inventory: low-stock alerts, category-wise breakdown
- Analytics: GMV (gross merchandise value), order count, top products, top categories
- Settings: edit delivery slots, manage promo codes

**API — GET /admin/orders:**
```json
{
  "orders": [
    { "order_id": "ORD-001", "customer": "Priya", "total": "₹1,200", 
      "status": "out_for_delivery", "slot": "2pm-4pm", "date": "2025-04-20" }
  ],
  "total_count": 45,
  "filters": { "status": "all", "date_from": "2025-04-15", "date_to": "2025-04-20" }
}
```

**API — GET /admin/inventory:**
```json
{
  "low_stock": [
    { "product": "Organic Spinach", "stock": 3, "category": "vegetables", "reorder_qty": 50 }
  ],
  "by_category": {
    "vegetables": { "total": 520, "low_count": 2 },
    "fruits": { "total": 890, "low_count": 0 }
  }
}
```

**Test:** Admin filters orders by "Out for delivery" → shows only that status. Edit slot capacity → next API call reflects change.

---

## 3. Database Setup (Supabase)

1. Create project in Supabase (Mumbai region)
2. Run all migration SQLs (from feature refs)
3. Enable RLS on all public tables
4. Create RLS policies: users see only their own data
5. Enable Phone auth provider
6. Create Edge Function for SMS hook

---

## 4. NestJS Module Template

```typescript
// src/features/[feature]/[feature].module.ts
import { Module } from '@nestjs/common';
import { SupabaseService } from '@/supabase/supabase.service';
import { [Feature]Service } from './[feature].service';
import { [Feature]Controller } from './[feature].controller';

@Module({
  controllers: [[Feature]Controller],
  providers: [[Feature]Service, SupabaseService],
  exports: [[Feature]Service],
})
export class [Feature]Module {}

// src/features/[feature]/[feature].service.ts
@Injectable()
export class [Feature]Service {
  constructor(private supabase: SupabaseService) {}
  
  async list(userId: string) {
    const { data, error } = await this.supabase.admin
      .from('[table]')
      .select('*')
      .eq('user_id', userId);
    if (error) throw new BadRequestException(error.message);
    return data;
  }
}

// src/features/[feature]/[feature].controller.ts
@Controller('[route]')
export class [Feature]Controller {
  constructor(private [feature]Service: [Feature]Service) {}
  
  @UseGuards(SupabaseAuthGuard)
  @Get()
  async list(@Req() req) {
    return this.[feature]Service.list(req.user.id);
  }
}
```

Import in `app.module.ts`:
```typescript
import { [Feature]Module } from '@/features/[feature]/[feature].module';

@Module({
  imports: [[Feature]Module],
})
export class AppModule {}
```

---

## 5. Testing — Each Feature Needs:

**Unit test (Jest):** Service logic (filters, calculations)
```typescript
it('should calculate total with discount', () => {
  const result = calculateTotal(1000, 20);
  expect(result).toBe(800);
});
```

**Integration test:** API endpoint + database
```typescript
it('should create order and reduce inventory', async () => {
  const response = await request(app.getHttpServer())
    .post('/checkout')
    .send({ slot_id, address_id })
    .expect(201);
  expect(response.body.order_id).toBeDefined();
});
```

**E2E test (Playwright):** User flow
```typescript
test('should place order end-to-end', async () => {
  await page.goto('/');
  await page.click('text=Add to cart');
  await page.click('text=Checkout');
  // complete payment flow
  await expect(page).toHaveURL('/orders/success');
});
```

Run tests:
```bash
npm run test          # unit + integration
npm run test:e2e      # E2E
npm run test:cov      # coverage report
```

---

## 6. Common Patterns

**Rate limiting (NestJS):**
```typescript
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';

@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 req/min
@Post('/send-otp')
async sendOtp() { ... }
```

**Input validation:**
```typescript
import { IsPhoneNumber, IsEmail, Min, Max } from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  slot_id: string;
  
  @Min(100)
  @Max(100000)
  total_rupees: number;
}
```

**Error handling:**
```typescript
try {
  const result = await supabase.from('orders').insert(orderData);
  if (result.error) throw new BadRequestException(result.error.message);
  return result.data;
} catch (e) {
  this.logger.error(`Order creation failed: ${e.message}`);
  throw new InternalServerErrorException('Order creation failed');
}
```

**Pagination:**
```typescript
// Backend
const limit = Math.min(parseInt(query.limit) || 20, 100);
const offset = (parseInt(query.page) || 1 - 1) * limit;
const { data } = await supabase.from('products')
  .select('*', { count: 'exact' })
  .range(offset, offset + limit - 1);

// Frontend
const { data, count } = response;
const totalPages = Math.ceil(count / limit);
```

---

## 7. Deployment Checklist

- [ ] Env vars set on Railway + Vercel
- [ ] Supabase backups enabled
- [ ] Rate limiting active on all auth endpoints
- [ ] RLS policies tested on production DB
- [ ] Error tracking set up (Sentry recommended)
- [ ] Run `npm run build` locally — zero errors
- [ ] E2E tests pass on production URLs
- [ ] Domain mapped to Vercel + Railway
- [ ] SSL certificate auto-renewed

---

## 8. Quick Reference — API Response Format

**Success (200):**
```json
{
  "data": { ... },
  "message": "Success"
}
```

**Validation error (400):**
```json
{
  "error": "Invalid input",
  "details": { "email": "Must be valid email" }
}
```

**Unauthorized (401):**
```json
{
  "error": "Unauthorized",
  "message": "Please log in"
}
```

**Server error (500):**
```json
{
  "error": "Internal server error",
  "request_id": "req_xyz123"
}
```

---

## When to Ask Claude (Claude Code)

Use `/ask` when you need help with:
- **"Build feature X"** → Get full component + API + tests
- **"Fix this error"** → Paste error + code → get fix
- **"Database schema for Y"** → Get SQL + RLS policies
- **"How to deploy to Railway"** → Step-by-step guide
- **"Write E2E test for Z"** → Get Playwright test code
- **"Optimize this query"** → Get indexed version + explain

**Example:**
```bash
/ask Build the product search component with autocomplete
/ask Why is this Supabase query slow?
/ask Generate a migration to add category_id to products
```

---

## File Structure (by end)

```
zeststar/
├── frontend/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (shop)/
│   │   ├── orders/
│   │   └── admin/
│   ├── components/
│   ├── lib/
│   │   ├── supabase/
│   │   ├── auth/
│   │   └── api.ts
│   └── tailwind.config.ts
├── backend/
│   └── src/
│       ├── features/
│       │   ├── auth/
│       │   ├── products/
│       │   ├── cart/
│       │   ├── orders/
│       │   └── admin/
│       ├── guards/
│       ├── supabase/
│       └── app.module.ts
└── README.md
```

---

## Help & Resources

- Supabase docs: https://supabase.com/docs
- NestJS docs: https://docs.nestjs.com
- Next.js docs: https://nextjs.org/docs
- Razorpay API: https://razorpay.com/docs
- MSG91 OTP: https://www.msg91.com/api/v5/otp
