import { useState } from "react";
import SEO from "@/components/SEO";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Zap, X, ArrowRight, Check, ArrowLeft, ExternalLink, Loader2, CreditCard, ShieldCheck } from "lucide-react";
import { useMonetization, type UserPlan } from "@/context/MonetizationContext";
import { useStripeSubscription } from "@/hooks/useStripeSubscription";
import SparksCheckoutModal from "./SparksCheckoutModal";

/* ─── Upgrade Modal ─── */
export function UpgradeModal() {
  const { upgradeTarget, closeUpgradeModal, openBilling } = useMonetization();

  if (!upgradeTarget) return null;

  const featureLabels: Record<string, string> = {
    "split-view": "Split-View Multitasking",
    "mail": "Mail Sync",
    "team-chat": "Team Chat",
    "full-council": "Full Council (4 Advisors)",
  };

  const label = featureLabels[upgradeTarget] || upgradeTarget;

  return (
    <AnimatePresence>
      <motion.div
        key="upgrade-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }}
      >
        <motion.div
          initial={{ scale: 0.92, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.92, y: 20 }}
          className="relative w-full max-w-md rounded-3xl p-8 shadow-2xl"
          style={{
            background: "hsl(var(--card))",
            border: "1.5px solid hsl(var(--border))",
          }}
        >
          <button onClick={closeUpgradeModal} className="absolute top-4 right-4 p-2 rounded-xl hover:bg-secondary/60 text-muted-foreground">
            <X size={16} />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Zap size={22} className="text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-foreground">Upgrade to Pro</h2>
          <p className="text-sm text-muted-foreground mb-6">
            <strong className="text-foreground">{label}</strong> is a Pro feature. Upgrade to unlock advanced capabilities.
          </p>
          <ul className="space-y-2 mb-6">
            {["Split-View Multitasking", "Mail Sync", "Full Council (4 Advisors)", "500 Sparks/month"].map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                <Check size={14} className="text-primary shrink-0" /> {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => { closeUpgradeModal(); openBilling(); }}
            className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
          >
            Upgrade Now <ArrowRight size={16} />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Out Of Sparks Modal ─── */
export function OutOfSparksModal() {
  const { showOutOfSparks, closeOutOfSparks } = useMonetization();
  return <SparksCheckoutModal open={showOutOfSparks} onClose={closeOutOfSparks} />;
}

/* ─── Billing View ─── */
const BillingView = () => {
  const { userPlan, sparksBalance, hasBYOK, setBYOK, closeBilling } = useMonetization();
  const { subscription, loading, startCheckout, openPortal } = useStripeSubscription();
  const [billingTab, setBillingTab] = useState<"plans" | "sparks">("plans");
  const [byokInput, setByokInput] = useState("");

  const PLANS: { name: UserPlan; price: string; description: string; features: string[]; missing: string[]; highlight?: boolean; sparkPackId?: string }[] = [
    {
      name: "Starter",
      price: "Free",
      description: "50 Sparks/month, core tools",
      features: ["50 ✨ Sparks/month", "1 Council Advisor", "Basic Dashboard", "Core Tasks & Calendar"],
      missing: ["Split-View", "Mail Sync", "Team Chat", "Full Council"],
    },
    {
      name: "Pro",
      price: "$19/mo",
      description: "500 Sparks/month, all features",
      features: ["500 ✨ Sparks/month", "Full Council (4 Advisors)", "Split-View Multitasking", "Mail Sync", "Priority Support"],
      missing: ["Team Chat", "Shared Folders"],
      highlight: true,
    },
    {
      name: "Team",
      price: "$12/user/mo",
      description: "Pro + collaboration",
      features: ["Everything in Pro", "Team Chat", "Shared Folders", "Team Analytics", "Admin Dashboard"],
      missing: [],
    },
  ];

  const SPARK_PACKS = [
    { id: "sparks_50", sparks: 50, price: "$5.00", label: "Starter", bonus: 0, rate: "10¢ / Spark" },
    { id: "sparks_120", sparks: 120, price: "$10.00", label: "Most Popular", bonus: 20, highlight: true, rate: "8¢ / Spark" },
    { id: "sparks_300", sparks: 300, price: "$20.00", label: "Mega", bonus: 100, rate: "6.7¢ / Spark" },
  ];

  const SPARK_ACTIONS = [
    { cost: 1, label: "Quick AI Answer / Basic Generation" },
    { cost: 2, label: "Live Council Context Review" },
    { cost: 3, label: "Deep Document Analysis / Smart Plan" },
    { cost: 5, label: "Full Council Consult (4 Advisors)" },
  ];

  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
      <SEO title="Billing & Plans" description="Manage your Dashiii subscription, Sparks balance and workspace plan." url="/" keywords="billing, pricing plans, Sparks, subscription, AI credits" />
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={closeBilling}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </button>
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-1">Billing & Plans</h2>
      <p className="text-sm text-muted-foreground mb-6">Manage your subscription and Sparks balance.</p>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-secondary/50 rounded-xl p-1 mb-8 w-fit">
        {(["plans", "sparks"] as const).map((tab) => (
          <button key={tab} onClick={() => setBillingTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              billingTab === tab ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}>
            {tab === "plans" ? "Workspace Plans" : "Spark Store"}
          </button>
        ))}
      </div>

      {billingTab === "plans" && (
        <div className="space-y-6">
          {/* Current subscription status */}
          {subscription && (
            <div className="flex items-center justify-between p-5 rounded-2xl bg-secondary/40 border border-border/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ShieldCheck size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {subscription.plan} — <span className={`text-xs font-normal ${subscription.status === "active" ? "text-emerald-500" : "text-yellow-500"}`}>{subscription.status}</span>
                  </p>
                  {periodEnd && (
                    <p className="text-xs text-muted-foreground">
                      {subscription.cancel_at_period_end ? `Cancels ${periodEnd}` : `Renews ${periodEnd}`}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={openPortal}
                disabled={loading}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
                Manage Subscription
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-3xl p-6 border transition-all ${
                  plan.highlight
                    ? "border-primary/50 ring-2 ring-primary/25 shadow-xl"
                    : "border-border"
                } ${userPlan === plan.name ? "bg-primary/5" : "bg-card"}`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-1 rounded-full bg-primary text-primary-foreground">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-bold text-foreground mb-0.5">{plan.name}</h3>
                <div className="text-2xl font-black text-primary mb-1">{plan.price}</div>
                <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                      <Check size={13} className="text-primary shrink-0" /> {f}
                    </li>
                  ))}
                  {plan.missing.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground/50">
                      <span className="w-3 h-3 shrink-0 text-center">—</span> {f}
                    </li>
                  ))}
                </ul>
                {userPlan === plan.name ? (
                  <div className="w-full py-2.5 rounded-2xl text-center text-sm font-medium text-primary border border-primary/30">
                    Current Plan
                  </div>
                ) : plan.name === "Starter" ? (
                  <button
                    onClick={openPortal}
                    disabled={loading}
                    className="w-full py-2.5 rounded-2xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                    Downgrade via Portal
                  </button>
                ) : (
                  <button
                    onClick={() => startCheckout("plan", { plan: plan.name })}
                    disabled={loading}
                    className="w-full py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                    Upgrade to {plan.name}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Manage via portal */}
          <div className="p-5 rounded-2xl bg-secondary/30 border border-border/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                <CreditCard size={16} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Payment & Invoices</p>
                <p className="text-xs text-muted-foreground">Manage cards, download invoices via Stripe portal</p>
              </div>
            </div>
            <button
              onClick={openPortal}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline disabled:opacity-50"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
              Open Portal
            </button>
          </div>
        </div>
      )}

      {billingTab === "sparks" && (
        <div className="space-y-8">
          {/* Balance ring */}
          <div className="flex items-center gap-6 p-6 rounded-3xl bg-card border border-border">
            <div className="relative w-20 h-20 shrink-0">
              <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                <circle cx="40" cy="40" r="32" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                <circle cx="40" cy="40" r="32" fill="none" stroke="hsl(var(--primary))" strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 32}`}
                  strokeDashoffset={`${2 * Math.PI * 32 * (1 - Math.min(sparksBalance, 500) / 500)}`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-foreground">{sparksBalance}</span>
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">{sparksBalance} ✨ Sparks remaining</div>
              <p className="text-sm text-muted-foreground">Your balance resets monthly with your plan.</p>
            </div>
          </div>

          {/* Packs */}
          <div>
            <h3 className="text-base font-semibold text-foreground mb-1">Top-Up Packs</h3>
            <p className="text-xs text-muted-foreground mb-4">Volume discounts included — more Sparks for less per unit.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {SPARK_PACKS.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => startCheckout("sparks", { sparkPackId: pack.id })}
                  disabled={loading}
                  className={`relative pt-6 pb-5 px-5 rounded-3xl border text-left transition-all hover:scale-[1.01] disabled:opacity-50 ${
                    pack.highlight ? "border-primary/50 ring-2 ring-primary/20 bg-primary/5" : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  {pack.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground whitespace-nowrap">
                      ⭐ Best Value
                    </span>
                  )}
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="text-2xl font-black text-foreground">{pack.sparks} ✨</span>
                    {pack.bonus > 0 && (
                      <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                        +{pack.bonus} bonus
                      </span>
                    )}
                  </div>
                  <div className="text-xl font-bold text-primary mb-0.5">{pack.price}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{pack.label}</span>
                    <span className="text-[10px] text-muted-foreground/60 bg-secondary/50 px-1.5 py-0.5 rounded">{pack.rate}</span>
                  </div>
                  {loading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-background/50">
                      <Loader2 size={20} className="animate-spin text-primary" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* What You Get cheat sheet */}
            <div className="p-5 rounded-2xl bg-secondary/30 border border-border/40">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                ✨ What does a Spark get you?
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SPARK_ACTIONS.map((a) => (
                  <div key={a.cost} className="flex items-center gap-3 text-sm">
                    <span className="font-bold text-primary shrink-0 w-14 text-right">{a.cost} ✨</span>
                    <span className="text-muted-foreground">{a.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* BYOK */}
          <div className="p-6 rounded-3xl bg-card border border-border">
            <h3 className="text-base font-semibold text-foreground mb-2">Bring Your Own Key (BYOK)</h3>
            <p className="text-sm text-muted-foreground mb-4">Connect your OpenAI or Anthropic API key for unlimited Sparks. Your key is encrypted and never exposed.</p>
            {hasBYOK ? (
              <div className="flex items-center gap-3">
                <div className="flex-1 px-4 py-2.5 rounded-xl border border-primary/30 bg-primary/5 text-sm text-primary font-medium">sk-...XXXX (connected)</div>
                <button onClick={() => setBYOK(false)} className="px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground">Disconnect</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="sk-..."
                  value={byokInput}
                  onChange={(e) => setByokInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-secondary/30 text-sm outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground"
                />
                <button
                  onClick={() => { if (byokInput.startsWith("sk-")) { setBYOK(true); setByokInput(""); } }}
                  className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
                >Connect</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingView;
