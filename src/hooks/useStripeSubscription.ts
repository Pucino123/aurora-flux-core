import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMonetization, type UserPlan } from "@/context/MonetizationContext";
import { toast } from "sonner";

export interface StripeSubscription {
  id: string;
  stripe_subscription_id: string | null;
  status: string;
  plan: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export function useStripeSubscription() {
  const { user } = useAuth();
  const { setUserPlan, refetchSparks } = useMonetization();
  const [subscription, setSubscription] = useState<StripeSubscription | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSubscription = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("stripe_subscriptions" as any)
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setSubscription(data as unknown as StripeSubscription);
      const planName = (data as unknown as any).plan as UserPlan;
      if (planName === "Pro" || planName === "Team") {
        setUserPlan(planName);
      }
    }
  }, [user, setUserPlan]);

  /** Call the sync-subscription edge function to pull fresh state from Stripe
   *  and grant any Sparks that the webhook may have missed.
   */
  const syncFromStripe = useCallback(async (silent = false) => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke("sync-subscription");
      if (error) throw error;
      if (data?.synced) {
        await fetchSubscription();
        refetchSparks();
        if (!silent && data.sparksGranted > 0) {
          toast.success(`✨ ${data.sparksGranted} Sparks credited to your account!`);
        }
      }
    } catch (err) {
      if (!silent) console.error("sync-subscription error:", err);
    }
  }, [user, fetchSubscription, refetchSparks]);

  // Handle ?checkout=success on page load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutResult = params.get("checkout");
    const plan = params.get("plan");
    const sparks = params.get("sparks");

    if (checkoutResult === "success") {
      window.history.replaceState({}, "", window.location.pathname);
      if (plan) {
        toast.success(`🎉 Velkommen til ${plan}! Din plan er nu aktiv.`);
        setUserPlan(plan as UserPlan);
        // Give Stripe a moment, then sync to grant Sparks
        setTimeout(() => syncFromStripe(false), 2000);
      } else if (sparks) {
        const amount = parseInt(sparks, 10);
        if (!isNaN(amount) && amount > 0) {
          // Sync will pick up the sparks from the purchase
          setTimeout(() => syncFromStripe(false), 2000);
        }
      }
    } else if (checkoutResult === "cancelled") {
      window.history.replaceState({}, "", window.location.pathname);
      toast.info("Checkout annulleret.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const startCheckout = useCallback(async (type: "plan" | "sparks", options: { plan?: string; sparkPackId?: string }) => {
    if (!user) { toast.error("Log ind for at fortsætte"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-checkout", {
        body: { type, ...options },
      });
      if (error || !data?.url) throw new Error(error?.message || "Kunne ikke oprette checkout session");
      // Open in new tab so Stripe Checkout works outside the iframe
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const openPortal = useCallback(async () => {
    if (!user) { toast.error("Log ind for at fortsætte"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-portal");
      if (error || !data?.url) throw new Error(error?.message || "Ingen Stripe-kunde fundet. Køb et abonnement først.");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { subscription, loading, startCheckout, openPortal, refetch: fetchSubscription, syncFromStripe };
}
