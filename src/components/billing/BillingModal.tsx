/**
 * BillingModal — triggered from sidebar plan text.
 * Tabs: My Plan | Billing History
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, CreditCard, ChevronRight, Sparkles, ExternalLink, Loader2, ShieldCheck, Ban } from "lucide-react";
import { useMonetization, type UserPlan } from "@/context/MonetizationContext";
import { useStripeSubscription } from "@/hooks/useStripeSubscription";
import CancelSubscriptionDialog from "./CancelSubscriptionDialog";

const PLANS = [
  {
    name: "Starter" as UserPlan,
    price: "Free",
    billing: "",
    description: "Core tools, 50 Sparks/mo",
    features: ["50 ✨ Sparks/month", "1 Council Advisor", "Basic Dashboard", "Core Tasks & Calendar"],
    missing: ["Split-View", "Mail Sync", "Full Council", "Team Chat"],
    color: "border-border",
  },
  {
    name: "Pro" as UserPlan,
    price: "$19",
    billing: "/mo",
    description: "All features, 500 Sparks/mo",
    features: ["500 ✨ Sparks/month", "Full Council (4 Advisors)", "Split-View Multitasking", "Mail Sync", "Priority Support"],
    missing: ["Team Chat", "Shared Folders"],
    color: "border-emerald-500/60",
    glow: "shadow-[0_0_20px_rgba(16,185,129,0.2)]",
    badge: "Most Popular",
  },
  {
    name: "Team" as UserPlan,
    price: "$12",
    billing: "/user/mo",
    description: "Pro + collaboration",
    features: ["Everything in Pro", "Team Chat", "Shared Folders", "Team Analytics", "Admin Dashboard"],
    missing: [],
    color: "border-violet-500/40",
  },
];

interface Props { open: boolean; onClose: () => void }

const BillingModal = ({ open, onClose }: Props) => {
  const { userPlan, sparksBalance } = useMonetization();
  const { subscription, loading, startCheckout, openPortal } = useStripeSubscription();
  const [tab, setTab] = useState<"plan" | "history">("plan");
  const [cancelOpen, setCancelOpen] = useState(false);

  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "April 1, 2026";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9500] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(14px)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.94, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl"
            style={{
              background: "hsl(var(--card)/0.95)",
              border: "1.5px solid hsl(var(--border)/0.5)",
              backdropFilter: "blur(24px)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 pt-6 pb-4 border-b border-border/30">
              <div>
                <h2 className="text-xl font-bold text-foreground">Billing & Plans</h2>
                <p className="text-xs text-muted-foreground">Manage your subscription</p>
              </div>
              {/* Tab toggle */}
              <div className="flex gap-1 bg-secondary/60 rounded-xl p-1 mx-auto">
                {(["plan", "history"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`relative px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab === t && (
                      <motion.div
                        layoutId="billing-tab-bg"
                        className="absolute inset-0 bg-card rounded-lg shadow-sm"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{t === "plan" ? "My Plan" : "Billing Portal"}</span>
                  </button>
                ))}
              </div>
              <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto max-h-[75vh] p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  {tab === "plan" && (
                    <div className="space-y-6">
                      {/* Current plan banner */}
                      <div className="flex items-center justify-between p-5 rounded-2xl bg-secondary/40 border border-border/40">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Sparkles size={18} className="text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">Current Plan: {userPlan}</p>
                            <p className="text-xs text-muted-foreground">
                              {sparksBalance} Sparks remaining · {subscription?.cancel_at_period_end ? `Cancels ${periodEnd}` : `Renews ${periodEnd}`}
                            </p>
                          </div>
                        </div>
                        {subscription ? (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => { onClose(); openPortal(); }}
                              disabled={loading}
                              className="flex items-center gap-1.5 text-xs text-primary hover:underline disabled:opacity-50"
                            >
                              {loading ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
                              Manage
                            </button>
                            {!subscription.cancel_at_period_end && subscription.stripe_subscription_id && (
                              <button
                                onClick={() => setCancelOpen(true)}
                                className="flex items-center gap-1.5 text-xs text-destructive hover:underline transition-colors"
                              >
                                <Ban size={12} /> Cancel
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Free plan</span>
                        )}
                      </div>

                      {/* Plan cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {PLANS.map(plan => {
                          const isCurrent = userPlan === plan.name;
                          return (
                            <div
                              key={plan.name}
                              className={`relative rounded-2xl p-6 border transition-all ${plan.color} ${(plan as any).glow ?? ""} ${
                                isCurrent ? "ring-2 ring-emerald-500/30 bg-emerald-500/5" : "bg-card/60"
                              }`}
                            >
                              {(plan as any).badge && (
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-1 rounded-full bg-emerald-500 text-white whitespace-nowrap">
                                  {(plan as any).badge}
                                </span>
                              )}
                              <h3 className="text-base font-bold text-foreground mb-0.5">{plan.name}</h3>
                              <div className="flex items-baseline gap-0.5 mb-1">
                                <span className="text-2xl font-black text-primary">{plan.price}</span>
                                <span className="text-sm text-muted-foreground">{plan.billing}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>
                              <ul className="space-y-1.5 mb-5">
                                {plan.features.map(f => (
                                  <li key={f} className="flex items-center gap-2 text-xs text-foreground">
                                    <Check size={12} className="text-emerald-500 shrink-0" /> {f}
                                  </li>
                                ))}
                                {plan.missing.map(f => (
                                  <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground/40">
                                    <span className="w-3 shrink-0 text-center">—</span> {f}
                                  </li>
                                ))}
                              </ul>
                              {isCurrent ? (
                                <div className="w-full py-2 rounded-xl text-center text-xs font-semibold text-emerald-500 border border-emerald-500/30 bg-emerald-500/5">
                                  ✓ Current Plan
                                </div>
                              ) : plan.name === "Starter" ? (
                                <button
                                  onClick={() => { onClose(); openPortal(); }}
                                  disabled={loading}
                                  className="w-full py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                                >
                                  Downgrade via Portal
                                </button>
                              ) : (
                                <button
                                  onClick={() => { onClose(); startCheckout("plan", { plan: plan.name }); }}
                                  disabled={loading}
                                  className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                                >
                                  {loading ? <Loader2 size={12} className="animate-spin" /> : <ChevronRight size={12} />}
                                  Upgrade
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Payment method / portal */}
                      <div className="p-5 rounded-2xl bg-secondary/30 border border-border/30 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                            <CreditCard size={16} className="text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Payment & Invoices</p>
                            <p className="text-xs text-muted-foreground">Manage cards & download invoices</p>
                          </div>
                        </div>
                        <button
                          onClick={() => { onClose(); openPortal(); }}
                          disabled={loading}
                          className="flex items-center gap-1.5 text-xs text-primary hover:underline disabled:opacity-50"
                        >
                          {loading ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
                          Stripe Portal
                        </button>
                      </div>
                    </div>
                  )}

                  {tab === "history" && (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <ShieldCheck size={24} className="text-primary" />
                      </div>
                      <h3 className="text-base font-semibold text-foreground">Billing History via Stripe</h3>
                      <p className="text-sm text-muted-foreground text-center max-w-xs">
                        View and download all invoices securely in the Stripe customer portal.
                      </p>
                      <button
                        onClick={() => { onClose(); openPortal(); }}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                        Open Billing Portal
                      </button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Cancel Subscription Dialog */}
      {subscription?.stripe_subscription_id && (
        <CancelSubscriptionDialog
          open={cancelOpen}
          onClose={() => setCancelOpen(false)}
          subscriptionId={subscription.stripe_subscription_id}
          periodEnd={
            subscription.current_period_end
              ? new Date(subscription.current_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
              : "your current period end"
          }
        />
      )}
    </AnimatePresence>
  );
};

export default BillingModal;
