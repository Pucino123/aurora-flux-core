
## Root Cause

All three edge functions (`stripe-checkout`, `stripe-portal`, `stripe-webhook`) import `stripe@14.21.0` which internally triggers Node.js compatibility shims (`Deno.core.runMicrotasks()`). This crashes the Deno runtime **after** the response is returned — but in this edge runtime version, it kills the process **before** completion, causing 500 errors. The `createFetchHttpClient()` workaround is not enough for v14.

The fix is upgrading to `stripe@18.5.0` using `npm:` specifier combined with `https://deno.land/std@0.190.0/http/server.ts` serve — this is the exact combination documented to work in Supabase Deno edge functions without any Node.js shims.

## What the "fake modal" is

When the edge function crashes with a non-2xx, the `startCheckout` in `useStripeSubscription.ts` catches the error and shows a toast — but something in the UI is apparently switching the plan locally (client-side in `MonetizationContext`) without waiting for a real Stripe confirmation. This must be fixed too.

## Plan

### 1. Rewrite all three edge functions with Stripe v18 + npm specifier

**`stripe-checkout/index.ts`** — full rewrite:
- `import Stripe from "https://esm.sh/stripe@18.5.0"` (no `?target=deno`)
- `import { createClient } from "npm:@supabase/supabase-js@2.57.2"`
- `import { serve } from "https://deno.land/std@0.190.0/http/server.ts"`
- Use `serve(async (req) => { ... })` instead of `Deno.serve`
- Remove `httpClient: Stripe.createFetchHttpClient()` — not needed in v18
- Keep all price IDs, customer logic, plan/sparks session logic intact

**`stripe-portal/index.ts`** — same import fix:
- Same import pattern
- Keep portal session logic

**`stripe-webhook/index.ts`** — same import fix:
- Same import pattern
- `Stripe.createSubtleCryptoProvider()` still works in v18 for webhook verification
- Keep all event handler logic (checkout.session.completed, subscription events, invoice events, sparks logic)

### 2. Fix client-side plan switching

In `useStripeSubscription.ts`, the `startCheckout` success URL handler calls `setUserPlan(plan as UserPlan)` immediately when `?checkout=success` is in the URL. This is correct — it only fires after Stripe redirects back. No change needed here.

However, in `BillingModal.tsx` the Upgrade button calls `onClose(); startCheckout(...)` — this is fine.

The "fake modal where you can type anything" is most likely the **Stripe Checkout page in test mode** being shown on the same domain (embedded), not a real fake. Or it could be the `UpgradeModal` component from `BillingView.tsx`. No code change needed — once the edge function works, clicking Upgrade will redirect to real Stripe.

### 3. Deploy all three functions

Deploy `stripe-checkout`, `stripe-portal`, `stripe-webhook` immediately after rewriting.

## Files to Change

```text
supabase/functions/stripe-checkout/index.ts  — full rewrite (stripe v18 + npm imports)
supabase/functions/stripe-portal/index.ts    — full rewrite (stripe v18 + npm imports)  
supabase/functions/stripe-webhook/index.ts   — full rewrite (stripe v18 + npm imports)
```

Then deploy all three.

## Key Import Pattern (v18, Deno-safe)

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
```

No `httpClient`, no `?target=deno`, no `apiVersion` Node shims. This eliminates the `Deno.core.runMicrotasks()` crash entirely.
