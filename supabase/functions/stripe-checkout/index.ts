import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Hardcoded Dashiii Stripe price IDs
const PLAN_PRICE_IDS: Record<string, string> = {
  Pro:  "price_1T9UkXF0hqqlAweiLbmVm7vx",
  Team: "price_1T9UlDF0hqqlAweiCkwyllMT",
};

const SPARK_PRICE_IDS: Record<string, { priceId: string; sparks: number }> = {
  sparks_50:  { priceId: "price_1T9UlkF0hqqlAweiqwfntOCw", sparks: 50 },
  sparks_120: { priceId: "price_1T9UmQF0hqqlAweijz0qPOu0", sparks: 120 },
  sparks_300: { priceId: "price_1T9UmxF0hqqlAwei0v6yimCZ", sparks: 300 },
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2025-08-27.basil" as any,
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    logStep("Auth header found");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const anonSupabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await anonSupabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");
    logStep("User authenticated", { userId: user.id });

    const body = await req.json();
    const { type, plan, sparkPackId } = body;
    logStep("Request body", { type, plan, sparkPackId });

    const origin = req.headers.get("origin") || "https://aurora-flux-core.lovable.app";

    // Get or create Stripe customer
    let stripeCustomerId: string;
    const { data: existingCustomer } = await supabase
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingCustomer?.stripe_customer_id) {
      stripeCustomerId = existingCustomer.stripe_customer_id;
      logStep("Found existing customer", { stripeCustomerId });
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, display_name")
        .eq("id", user.id)
        .maybeSingle();

      const customer = await stripe.customers.create({
        email: (profile as any)?.email || user.email,
        name: (profile as any)?.display_name || undefined,
        metadata: { user_id: user.id },
      });
      stripeCustomerId = customer.id;
      logStep("Created new customer", { stripeCustomerId });

      await supabase.from("stripe_customers").insert({
        user_id: user.id,
        stripe_customer_id: stripeCustomerId,
      });
    }

    let session: any;

    if (type === "plan" && plan && PLAN_PRICE_IDS[plan]) {
      logStep("Creating subscription checkout", { plan });
      session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: "subscription",
        line_items: [{ price: PLAN_PRICE_IDS[plan], quantity: 1 }],
        success_url: `${origin}/?checkout=success&plan=${plan}`,
        cancel_url: `${origin}/?checkout=cancelled`,
        metadata: { user_id: user.id, plan, type: "plan" },
        // Collect payment method upfront and run 3D Secure so all future
        // recurring charges are authorized automatically (off-session)
        payment_method_collection: "always",
        subscription_data: {
          metadata: { user_id: user.id, plan },
          default_tax_rates: [],
        },
      });
    } else if (type === "sparks" && sparkPackId && SPARK_PRICE_IDS[sparkPackId]) {
      const packConfig = SPARK_PRICE_IDS[sparkPackId];
      logStep("Creating sparks checkout", { sparkPackId, sparks: packConfig.sparks });
      session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: "payment",
        line_items: [{ price: packConfig.priceId, quantity: 1 }],
        success_url: `${origin}/?checkout=success&sparks=${packConfig.sparks}`,
        cancel_url: `${origin}/?checkout=cancelled`,
        metadata: {
          user_id: user.id,
          type: "sparks",
          sparks_amount: String(packConfig.sparks),
          sparkPackId,
        },
      });
    } else {
      throw new Error("Invalid checkout type or plan");
    }

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const msg = (err as Error).message;
    console.error("stripe-checkout error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
