import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Monthly Sparks awarded per plan — must match src/lib/sparksConfig.ts
const PLAN_SPARKS: Record<string, number> = {
  Starter: 50,
  Pro: 500,
  Team: 1500,
};

/** Safely convert a Stripe unix timestamp (seconds) to ISO string. */
function toISO(unixSeconds: number | null | undefined): string | null {
  if (!unixSeconds || typeof unixSeconds !== "number" || isNaN(unixSeconds)) {
    return null;
  }
  const d = new Date(unixSeconds * 1000);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** Increment sparks in DB and log transaction. */
async function incrementSparks(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  amount: number,
  reason: string
) {
  const { data } = await supabase
    .from("profiles")
    .select("sparks_balance")
    .eq("id", userId)
    .maybeSingle();
  const current = (data as any)?.sparks_balance ?? 50;
  const newBalance = current + amount;

  await supabase
    .from("profiles")
    .update({ sparks_balance: newBalance })
    .eq("id", userId);

  // Log the transaction
  await supabase.from("sparks_transactions").insert({
    user_id: userId,
    amount,
    balance_after: newBalance,
    reason,
    feature: "subscription",
  });

  console.log(`[STRIPE-WEBHOOK] Sparks: +${amount} for user ${userId} (${current} → ${newBalance}) — ${reason}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
  const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!STRIPE_SECRET_KEY) {
    return new Response("STRIPE_SECRET_KEY not configured", { status: 500 });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2025-08-27.basil" as any,
  });
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    if (STRIPE_WEBHOOK_SECRET && signature) {
      const cryptoProvider = Stripe.createSubtleCryptoProvider();
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        STRIPE_WEBHOOK_SECRET,
        undefined,
        cryptoProvider
      );
      console.log("[STRIPE-WEBHOOK] Signature verified ✓");
    } else {
      console.warn("[STRIPE-WEBHOOK] No STRIPE_WEBHOOK_SECRET — skipping signature verification");
      event = JSON.parse(body);
    }
  } catch (err) {
    console.error("[STRIPE-WEBHOOK] Signature verification failed:", err);
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  console.log("[STRIPE-WEBHOOK] Event:", event.type);

  try {
    switch (event.type) {

      // ── Checkout completed ──────────────────────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        if (!userId) {
          console.warn("[STRIPE-WEBHOOK] No user_id in session metadata");
          break;
        }

        if (session.mode === "subscription" && session.subscription) {
          const plan = session.metadata?.plan || "Pro";
          const subId = typeof session.subscription === "string"
            ? session.subscription
            : (session.subscription as any).id;

          const subscription = await stripe.subscriptions.retrieve(subId);
          const customerId = typeof session.customer === "string"
            ? session.customer
            : (session.customer as any)?.id;

          // Upsert stripe_customers table for fast reverse-lookup
          if (customerId) {
            await supabase.from("stripe_customers").upsert(
              { user_id: userId, stripe_customer_id: customerId },
              { onConflict: "stripe_customer_id" }
            );
          }

          await supabase.from("stripe_subscriptions").upsert({
            user_id: userId,
            stripe_subscription_id: subId,
            stripe_customer_id: customerId,
            status: subscription.status,
            plan,
            current_period_end: toISO((subscription as any).current_period_end),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          }, { onConflict: "stripe_subscription_id" });

          const sparksToAdd = PLAN_SPARKS[plan] ?? 0;
          if (sparksToAdd > 0) {
            await incrementSparks(supabase, userId, sparksToAdd, `${plan} plan — initial subscription`);
          }
          console.log(`[STRIPE-WEBHOOK] New ${plan} subscription for user ${userId} — granted ${sparksToAdd} Sparks`);

        } else if (session.mode === "payment") {
          // One-off Sparks purchase
          const sparksAmount = parseInt(session.metadata?.sparks_amount || "0", 10);
          if (sparksAmount > 0) {
            const paymentIntentId = typeof session.payment_intent === "string"
              ? session.payment_intent
              : (session.payment_intent as any)?.id;

            await supabase.from("sparks_purchases").insert({
              user_id: userId,
              stripe_payment_intent_id: paymentIntentId,
              sparks_amount: sparksAmount,
              price_paid_cents: session.amount_total || 0,
            });

            await incrementSparks(supabase, userId, sparksAmount, `Sparks pack purchase (${sparksAmount} Sparks)`);
            console.log(`[STRIPE-WEBHOOK] Sparks purchase: +${sparksAmount} for user ${userId}`);
          }
        }
        break;
      }

      // ── Subscription lifecycle events ───────────────────────────────────────
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        let userId = subscription.metadata?.user_id;
        const customerId = typeof subscription.customer === "string"
          ? subscription.customer
          : (subscription.customer as any).id;

        if (!userId) {
          const { data } = await supabase
            .from("stripe_customers")
            .select("user_id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();
          if (!data?.user_id) {
            console.warn(`[STRIPE-WEBHOOK] No user found for customer ${customerId}`);
            break;
          }
          userId = data.user_id;
        }

        await supabase.from("stripe_subscriptions").upsert({
          user_id: userId,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customerId,
          status: subscription.status,
          plan: subscription.metadata?.plan || "Pro",
          current_period_end: toISO((subscription as any).current_period_end),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }, { onConflict: "stripe_subscription_id" });

        console.log(`[STRIPE-WEBHOOK] ${event.type} for user ${userId}: ${subscription.status}`);
        break;
      }

      // ── Invoice payment succeeded (renewals) ────────────────────────────────
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string"
          ? invoice.customer
          : (invoice.customer as any)?.id;

        if (!customerId) break;

        const { data: customerRow } = await supabase
          .from("stripe_customers")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();
        if (!customerRow?.user_id) {
          console.warn(`[STRIPE-WEBHOOK] invoice.payment_succeeded: no user for customer ${customerId}`);
          break;
        }

        const userId = customerRow.user_id;
        const subId = typeof (invoice as any).subscription === "string"
          ? (invoice as any).subscription
          : (invoice as any).subscription?.id;

        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          const plan = sub.metadata?.plan || "Pro";

          await supabase.from("stripe_subscriptions").upsert({
            user_id: userId,
            stripe_subscription_id: subId,
            stripe_customer_id: customerId,
            status: sub.status,
            plan,
            current_period_end: toISO((sub as any).current_period_end),
            cancel_at_period_end: sub.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          }, { onConflict: "stripe_subscription_id" });

          // Only grant Sparks on renewal, not on first payment (checkout.session.completed handles that)
          const billingReason = (invoice as any).billing_reason;
          if (billingReason === "subscription_cycle") {
            const sparksToAdd = PLAN_SPARKS[plan] ?? 0;
            if (sparksToAdd > 0) {
              await incrementSparks(supabase, userId, sparksToAdd, `${plan} plan — monthly renewal`);
              console.log(`[STRIPE-WEBHOOK] Monthly renewal: +${sparksToAdd} Sparks for user ${userId}`);
            }
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn(`[STRIPE-WEBHOOK] invoice.payment_failed for customer ${invoice.customer}`);
        break;
      }

      default:
        console.log(`[STRIPE-WEBHOOK] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error("[STRIPE-WEBHOOK] Error processing event:", err);
    return new Response(`Handler error: ${(err as Error).message}`, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});
