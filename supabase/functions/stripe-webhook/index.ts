import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// ── Sparks per plan (must match src/lib/sparksConfig.ts) ──────────────────
const PLAN_SPARKS: Record<string, number> = {
  Starter: 50,   // one-time on signup only
  Pro: 500,      // monthly
  Team: 400,     // per seat, monthly → deposited into team pool
};

const TEAM_SPARKS_PER_SEAT = 400;

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` — ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${d}`);
};

/** Safely convert a Stripe unix timestamp (seconds) to ISO string. */
function toISO(unixSeconds: number | null | undefined): string | null {
  if (unixSeconds == null || typeof unixSeconds !== "number" || isNaN(unixSeconds)) return null;
  const d = new Date(unixSeconds * 1000);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/** Grant Sparks to an individual user's profile. */
async function grantUserSparks(
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

  await supabase.from("profiles").update({ sparks_balance: newBalance }).eq("id", userId);

  await supabase.from("sparks_transactions").insert({
    user_id: userId,
    amount,
    balance_after: newBalance,
    reason,
    feature: "subscription",
  });

  logStep(`Sparks granted to user`, { userId, amount, current, newBalance, reason });
}

/** Grant Sparks into a Team's shared pool. */
async function grantTeamPoolSparks(
  supabase: ReturnType<typeof createClient>,
  teamId: string,
  userId: string,
  seats: number,
  reason: string
) {
  const amount = seats * TEAM_SPARKS_PER_SEAT;

  // Upsert the pool
  const { data: existing } = await supabase
    .from("team_sparks_pool")
    .select("sparks_balance")
    .eq("team_id", teamId)
    .maybeSingle();

  const current = (existing as any)?.sparks_balance ?? 0;
  const newBalance = current + amount;

  await supabase.from("team_sparks_pool").upsert(
    { team_id: teamId, sparks_balance: newBalance, seats, updated_at: new Date().toISOString() },
    { onConflict: "team_id" }
  );

  await supabase.from("team_sparks_transactions").insert({
    team_id: teamId,
    user_id: userId,
    amount,
    balance_after: newBalance,
    reason,
    feature: "subscription",
  });

  logStep(`Team pool Sparks granted`, { teamId, seats, amount, current, newBalance, reason });
}

/** Resolve a Stripe customer ID → internal user ID. */
async function resolveUserId(
  supabase: ReturnType<typeof createClient>,
  customerId: string,
  metaUserId?: string
): Promise<string | null> {
  if (metaUserId) return metaUserId;
  const { data } = await supabase
    .from("stripe_customers")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return (data as any)?.user_id ?? null;
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

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" as any });
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    if (STRIPE_WEBHOOK_SECRET && signature) {
      const cryptoProvider = Stripe.createSubtleCryptoProvider();
      event = await stripe.webhooks.constructEventAsync(
        body, signature, STRIPE_WEBHOOK_SECRET, undefined, cryptoProvider
      );
      logStep("Signature verified ✓");
    } else {
      logStep("WARN: No webhook secret — skipping signature verification");
      event = JSON.parse(body);
    }
  } catch (err) {
    logStep("Signature verification failed", { error: (err as Error).message });
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  logStep("Event received", { type: event.type });

  try {
    switch (event.type) {

      // ── Checkout completed ──────────────────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan || "Pro";
        const teamId = session.metadata?.team_id;

        if (!userId) {
          logStep("WARN: No user_id in session metadata");
          break;
        }

        const customerId = typeof session.customer === "string"
          ? session.customer : (session.customer as any)?.id;

        // Upsert customer record
        if (customerId) {
          await supabase.from("stripe_customers").upsert(
            { user_id: userId, stripe_customer_id: customerId },
            { onConflict: "stripe_customer_id" }
          );
        }

        if (session.mode === "subscription" && session.subscription) {
          const subId = typeof session.subscription === "string"
            ? session.subscription : (session.subscription as any).id;

          const subscription = await stripe.subscriptions.retrieve(subId);
          const seats = subscription.items.data[0]?.quantity ?? 1;

          await supabase.from("stripe_subscriptions").upsert({
            user_id: userId,
            stripe_subscription_id: subId,
            stripe_customer_id: customerId,
            status: subscription.status,
            plan,
            team_id: teamId || null,
            current_period_end: toISO((subscription as any).current_period_end),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          }, { onConflict: "stripe_subscription_id" });

          // Grant Sparks
          if (plan === "Team" && teamId) {
            await grantTeamPoolSparks(supabase, teamId, userId, seats, `${plan} plan — initial subscription`);
          } else {
            const sparksToAdd = PLAN_SPARKS[plan] ?? 0;
            if (sparksToAdd > 0) {
              await grantUserSparks(supabase, userId, sparksToAdd, `${plan} plan — initial subscription`);
            }
          }
          logStep(`New ${plan} subscription`, { userId, seats });

        } else if (session.mode === "payment") {
          // One-off Sparks purchase
          const sparksAmount = parseInt(session.metadata?.sparks_amount || "0", 10);
          if (sparksAmount > 0) {
            const paymentIntentId = typeof session.payment_intent === "string"
              ? session.payment_intent : (session.payment_intent as any)?.id;

            await supabase.from("sparks_purchases").insert({
              user_id: userId,
              stripe_payment_intent_id: paymentIntentId,
              sparks_amount: sparksAmount,
              price_paid_cents: session.amount_total || 0,
            });

            await grantUserSparks(supabase, userId, sparksAmount, `Sparks pack (${sparksAmount} Sparks)`);
          }
        }
        break;
      }

      // ── Subscription lifecycle ──────────────────────────────────────────
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === "string"
          ? subscription.customer : (subscription.customer as any).id;
        const userId = await resolveUserId(supabase, customerId, subscription.metadata?.user_id);

        if (!userId) {
          logStep("WARN: No user found for customer", { customerId });
          break;
        }

        await supabase.from("stripe_subscriptions").upsert({
          user_id: userId,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customerId,
          status: subscription.status,
          plan: subscription.metadata?.plan || "Pro",
          team_id: subscription.metadata?.team_id || null,
          current_period_end: toISO((subscription as any).current_period_end),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }, { onConflict: "stripe_subscription_id" });

        logStep(`${event.type}`, { userId, status: subscription.status });
        break;
      }

      // ── Invoice payment succeeded (renewals) ────────────────────────────
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string"
          ? invoice.customer : (invoice.customer as any)?.id;
        if (!customerId) break;

        const userId = await resolveUserId(supabase, customerId);
        if (!userId) {
          logStep("WARN: No user for customer on invoice", { customerId });
          break;
        }

        const subId = typeof (invoice as any).subscription === "string"
          ? (invoice as any).subscription : (invoice as any).subscription?.id;

        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          const plan = sub.metadata?.plan || "Pro";
          const teamId = sub.metadata?.team_id;
          const seats = sub.items.data[0]?.quantity ?? 1;

          await supabase.from("stripe_subscriptions").upsert({
            user_id: userId,
            stripe_subscription_id: subId,
            stripe_customer_id: customerId,
            status: sub.status,
            plan,
            team_id: teamId || null,
            current_period_end: toISO((sub as any).current_period_end),
            cancel_at_period_end: sub.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          }, { onConflict: "stripe_subscription_id" });

          // Only grant on renewal cycles (not initial — checkout.session.completed handles that)
          const billingReason = (invoice as any).billing_reason;
          if (billingReason === "subscription_cycle") {
            if (plan === "Team" && teamId) {
              await grantTeamPoolSparks(supabase, teamId, userId, seats, `${plan} plan — monthly renewal`);
            } else {
              const sparksToAdd = PLAN_SPARKS[plan] ?? 0;
              if (sparksToAdd > 0) {
                await grantUserSparks(supabase, userId, sparksToAdd, `${plan} plan — monthly renewal`);
              }
            }
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("WARN: invoice.payment_failed", { customer: invoice.customer });
        break;
      }

      default:
        logStep(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    logStep("Handler error", { error: (err as Error).message });
    return new Response(`Handler error: ${(err as Error).message}`, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});
