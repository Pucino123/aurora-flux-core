
## Full picture of current state

**Plans in the app** (from BillingView + BillingModal):
- **Starter** — Free (no Stripe product needed, it's the default)
- **Pro** — $19/month
- **Team** — $12/user/month

**Spark Packs** (one-time payments):
- sparks_50 — 50 sparks, $5.00
- sparks_120 — 120 sparks, $10.00
- sparks_300 — 300 sparks, $20.00

**Current Stripe state**: No products exist yet in Stripe (list_products returned `[]`).

**Current checkout function**: Already creates products/prices on demand via lookup_keys. But it has issues:
- Uses old Stripe API version `2024-04-10` instead of `2025-08-27.basil`
- Doesn't use `save_default_payment_method: 'on_subscription'` (needed to avoid repeated 3DS)
- `invoice.payment_succeeded` handler is empty — doesn't renew Sparks or update subscription period
- No `customer.subscription.created` handler
- `STRIPE_WEBHOOK_SECRET` fallback allows unsigned payloads in production (security hole)
- Sparks purchases are recorded in DB but NOT added to the user's in-app balance server-side (only done client-side via URL param)
- `sparks_balance` is only in localStorage — not persisted to DB

**What needs to be done**:

### Step 1 — Create Stripe products NOW via tools
Create 4 products + prices in Stripe with correct lookup keys so the checkout function finds them immediately:
- `Flux Pro Plan` → $19/month recurring → lookup_key: `flux_pro_monthly`
- `Flux Team Plan (per user)` → $12/month recurring → lookup_key: `flux_team_monthly`
- `50 Sparks Pack` → $5.00 one-time → lookup_key: `flux_sparks_50`
- `120 Sparks Pack (Best Value)` → $10.00 one-time → lookup_key: `flux_sparks_120`
- `300 Sparks Pack (Mega)` → $20.00 one-time → lookup_key: `flux_sparks_300`

### Step 2 — Harden the checkout edge function
- Upgrade to Stripe API `2025-08-27.basil`
- Add `payment_settings: { save_default_payment_method: 'on_subscription' }` + `payment_behavior: 'default_incomplete'` on subscription sessions → SCA approved once, silent auto-renewal forever
- Hardcode the price IDs (from step 1) directly in the function instead of dynamic lookup, for reliability and speed

### Step 3 — Fix the webhook edge function (the critical piece)
- Require `STRIPE_WEBHOOK_SECRET` — reject all requests without a valid signature (remove the fallback that allows unsigned payloads)
- Handle `customer.subscription.created` (same as updated)
- Handle `invoice.payment_succeeded` properly:
  - Update `stripe_subscriptions` with new `current_period_end`
  - Add monthly Sparks to user's `sparks_balance` in DB (500 for Pro, team TBD)
- Handle `checkout.session.completed` for sparks: record in `sparks_purchases` AND update profile's sparks balance in DB
- Add `sparks_balance` column to `profiles` table so balance is server-side, not just localStorage

### Step 4 — Add sparks_balance to DB
Migration: add `sparks_balance integer default 50` to `profiles` table. Update `MonetizationContext` to sync from DB on login.

### Step 5 — Guide for Stripe Dashboard webhook setup
Detailed step-by-step shown in the plan presentation.

---

## Plan

**Database change:**
- Add `sparks_balance` column (integer, default 50) to `profiles` table

**Edge function rewrites:**
- `stripe-checkout/index.ts`: upgrade API version, hardcode price IDs, add SCA payment settings
- `stripe-webhook/index.ts`: enforce signature verification, full event handling, DB sparks update

**Code changes:**
- `MonetizationContext.tsx`: load `sparks_balance` from DB on mount (via supabase query), sync writes back to DB
- `useStripeSubscription.ts`: after checkout success, refetch subscription AND sparks balance from DB

**Stripe Dashboard steps (shown as clear instructions):**

```text
1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Endpoint URL: https://hnslobscylxeouzpwmws.supabase.co/functions/v1/stripe-webhook
4. Click "Select events" and check:
   - checkout.session.completed
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_succeeded
   - invoice.payment_failed
5. Click "Add endpoint"
6. On the endpoint detail page, click "Reveal" under "Signing secret"
7. Copy the whsec_... value
```

**Environment variables:**
- `STRIPE_SECRET_KEY` — already stored
- `STRIPE_WEBHOOK_SECRET` — needs to be stored after user creates webhook in dashboard
- `STRIPE_PUBLISHABLE_KEY` — for frontend (not needed server-side; frontend uses supabase.functions.invoke)

**Implementation order:**
1. Create Stripe products (via tools now)
2. DB migration — add sparks_balance to profiles
3. Rewrite stripe-checkout function with hardcoded price IDs + SCA settings
4. Rewrite stripe-webhook function with full event handling + DB sparks sync
5. Update MonetizationContext to read sparks from DB
6. Prompt user to add STRIPE_WEBHOOK_SECRET secret
