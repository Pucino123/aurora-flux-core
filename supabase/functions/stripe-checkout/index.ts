import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Price IDs — we create them on first call if they don't exist, then cache in env
const PLAN_PRICES: Record<string, { unit_amount: number; interval?: string; product_name: string }> = {
  Pro: { unit_amount: 1900, interval: "month", product_name: "Flux Pro Plan" },
  Team: { unit_amount: 1200, interval: "month", product_name: "Flux Team Plan (per user)" },
};

const SPARK_PRICES: Record<string, { unit_amount: number; sparks: number; product_name: string }> = {
  sparks_50: { unit_amount: 500, sparks: 50, product_name: "50 Sparks Pack" },
  sparks_120: { unit_amount: 1000, sparks: 120, product_name: "120 Sparks Pack (Best Value)" },
  sparks_300: { unit_amount: 2000, sparks: 300, product_name: "300 Sparks Pack (Mega)" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" });

    // Get auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Verify JWT and get user
    const anonSupabase = createClient(
      SUPABASE_URL!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await anonSupabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { type, plan, sparkPackId } = body; // type: "plan" | "sparks"

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
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, display_name")
        .eq("id", user.id)
        .maybeSingle();

      const customer = await stripe.customers.create({
        email: profile?.email || user.email,
        name: profile?.display_name || undefined,
        metadata: { user_id: user.id },
      });
      stripeCustomerId = customer.id;

      await supabase.from("stripe_customers").insert({
        user_id: user.id,
        stripe_customer_id: stripeCustomerId,
      });
    }

    let session: Stripe.Checkout.Session;

    if (type === "plan" && plan && PLAN_PRICES[plan]) {
      const planConfig = PLAN_PRICES[plan];

      // Find or create price
      const prices = await stripe.prices.list({
        active: true,
        lookup_keys: [`flux_${plan.toLowerCase()}_monthly`],
        limit: 1,
      });

      let priceId: string;
      if (prices.data.length > 0) {
        priceId = prices.data[0].id;
      } else {
        // Create product + price
        const product = await stripe.products.create({
          name: planConfig.product_name,
          metadata: { plan },
        });
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: planConfig.unit_amount,
          currency: "usd",
          recurring: { interval: "month" },
          lookup_key: `flux_${plan.toLowerCase()}_monthly`,
        });
        priceId = price.id;
      }

      session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${origin}/?checkout=success&plan=${plan}`,
        cancel_url: `${origin}/?checkout=cancelled`,
        metadata: { user_id: user.id, plan, type: "plan" },
        subscription_data: {
          metadata: { user_id: user.id, plan },
        },
      });
    } else if (type === "sparks" && sparkPackId && SPARK_PRICES[sparkPackId]) {
      const packConfig = SPARK_PRICES[sparkPackId];

      const prices = await stripe.prices.list({
        active: true,
        lookup_keys: [`flux_${sparkPackId}`],
        limit: 1,
      });

      let priceId: string;
      if (prices.data.length > 0) {
        priceId = prices.data[0].id;
      } else {
        const product = await stripe.products.create({
          name: packConfig.product_name,
          metadata: { sparkPackId, sparks: String(packConfig.sparks) },
        });
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: packConfig.unit_amount,
          currency: "usd",
          lookup_key: `flux_${sparkPackId}`,
        });
        priceId = price.id;
      }

      session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: "payment",
        line_items: [{ price: priceId, quantity: 1 }],
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

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("stripe-checkout error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
