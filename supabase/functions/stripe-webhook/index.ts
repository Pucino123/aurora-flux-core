import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
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

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" });
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    if (STRIPE_WEBHOOK_SECRET && signature) {
      event = await stripe.webhooks.constructEventAsync(body, signature, STRIPE_WEBHOOK_SECRET);
    } else {
      // During testing without webhook secret
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
            : session.subscription.id;

          const subscription = await stripe.subscriptions.retrieve(subId);

          await supabase.from("stripe_subscriptions").upsert({
            user_id: userId,
            stripe_subscription_id: subId,
            stripe_customer_id: typeof session.customer === "string"
              ? session.customer
              : session.customer?.id,
            status: subscription.status,
            plan,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          }, { onConflict: "stripe_subscription_id" });
        } else if (session.mode === "payment") {
          // Sparks purchase
          const sparksAmount = parseInt(session.metadata?.sparks_amount || "0", 10);
          if (sparksAmount > 0) {
            await supabase.from("sparks_purchases").insert({
              user_id: userId,
              stripe_payment_intent_id: typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent?.id,
              sparks_amount: sparksAmount,
              price_paid_cents: session.amount_total || 0,
            });
          }
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;
        if (!userId) {
          // Try to find user via customer
          const { data } = await supabase
            .from("stripe_customers")
            .select("user_id")
            .eq("stripe_customer_id", typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer.id)
            .maybeSingle();
          if (!data?.user_id) break;

          await supabase.from("stripe_subscriptions").upsert({
            user_id: data.user_id,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer.id,
            status: subscription.status,
            plan: subscription.metadata?.plan || "Pro",
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          }, { onConflict: "stripe_subscription_id" });
          break;
        }

        await supabase.from("stripe_subscriptions").upsert({
          user_id: userId,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id,
          status: subscription.status,
          plan: subscription.metadata?.plan || "Pro",
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }, { onConflict: "stripe_subscription_id" });
        break;
      }

      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`Invoice ${event.type} for customer ${invoice.customer}`);
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
