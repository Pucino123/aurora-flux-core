/**
 * sync-subscription
 * Called from the frontend after checkout success to immediately sync
 * the subscription status and grant Sparks without waiting for a webhook.
 * This is a safety-net — webhooks are the primary path.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PLAN_SPARKS: Record<string, number> = {
  Starter: 50,
  Pro: 500,
  Team: 400, // per seat
};

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` — ${JSON.stringify(details)}` : "";
  console.log(`[SYNC-SUBSCRIPTION] ${step}${d}`);
};

function toISO(unixSeconds: number | null | undefined): string | null {
  if (unixSeconds == null || typeof unixSeconds !== "number" || isNaN(unixSeconds)) return null;
  const d = new Date(unixSeconds * 1000);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const anonSupabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await anonSupabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");
    logStep("User authenticated", { userId: user.id });

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" as any });

    // Look up the Stripe customer
    const { data: customerRow } = await supabase
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!customerRow?.stripe_customer_id) {
      return new Response(JSON.stringify({ synced: false, reason: "no_customer" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customerRow.stripe_customer_id;
    logStep("Customer found", { customerId });

    // Fetch active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 5,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active subscriptions");
      return new Response(JSON.stringify({ synced: false, reason: "no_active_subscription" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    let sparksGranted = 0;
    const results = [];

    for (const sub of subscriptions.data) {
      const plan = sub.metadata?.plan || "Pro";
      const teamId = sub.metadata?.team_id;
      const seats = sub.items.data[0]?.quantity ?? 1;

      // Upsert subscription record
      await supabase.from("stripe_subscriptions").upsert({
        user_id: user.id,
        stripe_subscription_id: sub.id,
        stripe_customer_id: customerId,
        status: sub.status,
        plan,
        team_id: teamId || null,
        current_period_end: toISO((sub as any).current_period_end),
        cancel_at_period_end: sub.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      }, { onConflict: "stripe_subscription_id" });

      // Check if we already granted sparks for this subscription cycle
      const { data: existingTx } = await supabase
        .from("sparks_transactions")
        .select("id")
        .eq("user_id", user.id)
        .ilike("reason", `%${sub.id}%`)
        .limit(1);

      if (!existingTx || existingTx.length === 0) {
        // Grant sparks for this plan
        if (plan === "Team" && teamId) {
          const amount = seats * 400;
          // Upsert team pool
          const { data: pool } = await supabase
            .from("team_sparks_pool")
            .select("sparks_balance")
            .eq("team_id", teamId)
            .maybeSingle();
          const currentPool = (pool as any)?.sparks_balance ?? 0;
          const newPool = currentPool + amount;
          await supabase.from("team_sparks_pool").upsert(
            { team_id: teamId, sparks_balance: newPool, seats, updated_at: new Date().toISOString() },
            { onConflict: "team_id" }
          );
          await supabase.from("team_sparks_transactions").insert({
            team_id: teamId, user_id: user.id,
            amount, balance_after: newPool,
            reason: `Team plan initial sync — sub ${sub.id}`, feature: "subscription",
          });
          sparksGranted += amount;
          logStep("Team pool synced", { teamId, amount });
        } else {
          const amount = PLAN_SPARKS[plan] ?? 0;
          if (amount > 0) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("sparks_balance")
              .eq("id", user.id)
              .maybeSingle();
            const current = (profile as any)?.sparks_balance ?? 50;
            const newBalance = current + amount;
            await supabase.from("profiles").update({ sparks_balance: newBalance }).eq("id", user.id);
            await supabase.from("sparks_transactions").insert({
              user_id: user.id,
              amount,
              balance_after: newBalance,
              reason: `${plan} plan initial sync — sub ${sub.id}`,
              feature: "subscription",
            });
            sparksGranted += amount;
            logStep("User sparks synced", { userId: user.id, amount, newBalance });
          }
        }
      } else {
        logStep("Sparks already granted for this subscription", { subId: sub.id });
      }

      results.push({ plan, status: sub.status, seats });
    }

    return new Response(JSON.stringify({
      synced: true,
      subscriptions: results,
      sparksGranted,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    const msg = (err as Error).message;
    console.error("[SYNC-SUBSCRIPTION] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
