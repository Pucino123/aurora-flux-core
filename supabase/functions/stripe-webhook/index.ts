import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Monthly Sparks awarded per plan renewal
const PLAN_SPARKS: Record<string, number> = {
  Pro:  500,
  Team: 1500,
};

Deno.serve(async (req) => {
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
  if (!STRIPE_WEBHOOK_SECRET) {
    console.warn("STRIPE_WEBHOOK_SECRET not set — webhook signature verification skipped (not safe for production)");
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" as any });
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    if (STRIPE_WEBHOOK_SECRET && signature) {
      event = await stripe.webhooks.constructEventAsync(body, signature, STRIPE_WEBHOOK_SECRET);
    } else {
      // Fallback for initial setup (add STRIPE_WEBHOOK_SECRET to lock this down)
      event = JSON.parse(body);
    }
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  console.log("Stripe event:", event.type);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        if (!userId) break;

        if (session.mode === "subscription" && session.subscription) {
          const plan = session.metadata?.plan || "Pro";
          const subId = typeof session.subscription === "string"
            ? session.subscription
            : (session.subscription as any).id;

          const subscription = await stripe.subscriptions.retrieve(subId);

          await supabase.from("stripe_subscriptions").upsert({
            user_id: userId,
            stripe_subscription_id: subId,
            stripe_customer_id: typeof session.customer === "string"
              ? session.customer
              : (session.customer as any)?.id,
            status: subscription.status,
            plan,
            current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          }, { onConflict: "stripe_subscription_id" });

          // Award initial Sparks for new subscription
          const sparksToAdd = PLAN_SPARKS[plan] ?? 0;
          if (sparksToAdd > 0) {
            await supabase.rpc("increment_sparks", { p_user_id: userId, p_amount: sparksToAdd } as any)
              .then(() => {}) // best-effort, handled by SQL function below
              .catch(() => {
                // Fallback: direct update
                return supabase
                  .from("profiles")
                  .update({ sparks_balance: supabase.rpc as any })
                  .eq("id", userId);
              });
            // Direct increment via raw update
            await supabase
              .from("profiles")
              .select("sparks_balance")
              .eq("id", userId)
              .maybeSingle()
              .then(async ({ data }) => {
                const current = (data as any)?.sparks_balance ?? 50;
                await supabase
                  .from("profiles")
                  .update({ sparks_balance: current + sparksToAdd })
                  .eq("id", userId);
              });
          }
        } else if (session.mode === "payment") {
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

            // Add Sparks to profile balance
            const { data: profileData } = await supabase
              .from("profiles")
              .select("sparks_balance")
              .eq("id", userId)
              .maybeSingle();
            const current = (profileData as any)?.sparks_balance ?? 50;
            await supabase
              .from("profiles")
              .update({ sparks_balance: current + sparksAmount })
              .eq("id", userId);
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        // Find user_id
        let userId = subscription.metadata?.user_id;
        if (!userId) {
          const customerId = typeof subscription.customer === "string"
            ? subscription.customer
            : (subscription.customer as any).id;
          const { data } = await supabase
            .from("stripe_customers")
            .select("user_id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();
          if (!data?.user_id) break;
          userId = data.user_id;
        }

        const customerId = typeof subscription.customer === "string"
          ? subscription.customer
          : (subscription.customer as any).id;

        await supabase.from("stripe_subscriptions").upsert({
          user_id: userId,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customerId,
          status: subscription.status,
          plan: subscription.metadata?.plan || "Pro",
          current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }, { onConflict: "stripe_subscription_id" });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string"
          ? invoice.customer
          : (invoice.customer as any)?.id;

        if (!customerId) break;

        // Find user
        const { data: customerRow } = await supabase
          .from("stripe_customers")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();
        if (!customerRow?.user_id) break;

        const userId = customerRow.user_id;

        // Update subscription period end
        if ((invoice as any).subscription) {
          const subId = typeof (invoice as any).subscription === "string"
            ? (invoice as any).subscription
            : (invoice as any).subscription?.id;

          const sub = await stripe.subscriptions.retrieve(subId);
          const plan = sub.metadata?.plan || "Pro";

          await supabase.from("stripe_subscriptions").upsert({
            user_id: userId,
            stripe_subscription_id: subId,
            stripe_customer_id: customerId,
            status: sub.status,
            plan,
            current_period_end: new Date((sub as any).current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          }, { onConflict: "stripe_subscription_id" });

          // Award monthly Sparks on renewal (only for renewal invoices, not the first)
          if ((invoice as any).billing_reason === "subscription_cycle") {
            const sparksToAdd = PLAN_SPARKS[plan] ?? 0;
            if (sparksToAdd > 0) {
              const { data: profileData } = await supabase
                .from("profiles")
                .select("sparks_balance")
                .eq("id", userId)
                .maybeSingle();
              const current = (profileData as any)?.sparks_balance ?? 50;
              await supabase
                .from("profiles")
                .update({ sparks_balance: current + sparksToAdd })
                .eq("id", userId);
            }
          }
        }

        console.log(`Invoice payment_succeeded for customer ${customerId}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn(`Invoice payment_failed for customer ${invoice.customer}`);
        // Optionally notify user or downgrade plan here
        break;
      }
    }
  } catch (err) {
    console.error("Error processing webhook event:", err);
    return new Response(`Handler error: ${(err as Error).message}`, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});
