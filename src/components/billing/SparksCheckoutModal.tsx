/**
 * SparksCheckoutModal — Apple Pay-style dopamine checkout med rigtig Stripe.
 */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Sparkles, Zap, Loader2 } from "lucide-react";
import { useMonetization } from "@/context/MonetizationContext";
import { useStripeSubscription } from "@/hooks/useStripeSubscription";

interface Package {
  id: string;
  sparks: number;
  bonus?: number;
  price: string;
  label: string;
  bestValue?: boolean;
}

const PACKAGES: Package[] = [
  { id: "sparks_50",  sparks: 50,  price: "$5",  label: "Starter Pack" },
  { id: "sparks_120", sparks: 100, bonus: 20, price: "$10", label: "Power Pack", bestValue: true },
  { id: "sparks_300", sparks: 200, bonus: 100, price: "$20", label: "Pro Bundle" },
];

const VALUE_ITEMS = [
  { icon: "🧠", label: "Ask Aura AI",        cost: `${SPARKS_COSTS.aura_message} Sparks` },
  { icon: "⚖️", label: "Council Analysis",   cost: `${SPARKS_COSTS.council_analysis} Sparks` },
  { icon: "⚡", label: "Council Quick Reply", cost: `${SPARKS_COSTS.council_quick} Sparks` },
  { icon: "📄", label: "AI Document Rewrite", cost: `${SPARKS_COSTS.doc_rewrite} Sparks` },
  { icon: "📊", label: "AI Daily Plan",       cost: `${SPARKS_COSTS.ai_daily_plan} Sparks` },
  { icon: "🌐", label: "Document Translate",  cost: `${SPARKS_COSTS.doc_translate} Sparks` },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

const SparksCheckoutModal = ({ open, onClose }: Props) => {
  const { sparksBalance } = useMonetization();
  const { startCheckout, loading } = useStripeSubscription();
  const [selected, setSelected] = useState<Package>(PACKAGES[1]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, loading, onClose]);

  const handlePay = () => {
    startCheckout("sparks", { sparkPackId: selected.id });
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9990] bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed inset-0 z-[9991] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-border/20"
              style={{
                background: "hsl(var(--card)/0.95)",
                backdropFilter: "blur(40px)",
                WebkitBackdropFilter: "blur(40px)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Sparkles size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Top Up Sparks</p>
                    <p className="text-[11px] text-muted-foreground">{sparksBalance} ✨ remaining</p>
                  </div>
                </div>
                <button onClick={handleClose} disabled={loading}
                  className="p-1.5 rounded-xl hover:bg-secondary transition-colors text-muted-foreground">
                  <X size={15} />
                </button>
              </div>

              {/* Package selector */}
              <div className="px-6 pb-4 space-y-2">
                {PACKAGES.map(pkg => {
                  const isSelected = selected.id === pkg.id;
                  const totalSparks = pkg.sparks + (pkg.bonus ?? 0);
                  return (
                    <button
                      key={pkg.id}
                      onClick={() => setSelected(pkg)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all relative overflow-hidden ${
                        isSelected
                          ? "border-primary/40 bg-primary/8 shadow-[0_0_12px_hsl(var(--primary)/0.15)]"
                          : "border-border/30 hover:border-border/60 hover:bg-secondary/30"
                      }`}
                    >
                      {/* Best Value ribbon */}
                      {pkg.bestValue && (
                        <span className="absolute top-0 right-0 text-[9px] font-bold px-2 py-0.5 rounded-bl-xl bg-primary text-primary-foreground tracking-wide">
                          BEST VALUE
                        </span>
                      )}
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          isSelected ? "bg-primary/15" : "bg-secondary/60"
                        }`}>
                          <Zap size={15} className={isSelected ? "text-primary" : "text-muted-foreground"} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-foreground">
                            {totalSparks} Sparks
                            {pkg.bonus && (
                              <span className="ml-1.5 text-[10px] font-bold text-primary">+{pkg.bonus} bonus</span>
                            )}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{pkg.label}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-foreground">{pkg.price}</span>
                    </button>
                  );
                })}
              </div>

              {/* Value breakdown */}
              <div className="mx-6 mb-4 rounded-xl border border-border/20 bg-secondary/20 overflow-hidden">
                <p className="px-3 pt-2.5 pb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  What does a Spark get you?
                </p>
                <div className="grid grid-cols-2 gap-px bg-border/20">
                  {VALUE_ITEMS.map(item => (
                    <div key={item.label} className="flex items-center gap-2 px-3 py-2 bg-card/60">
                      <span className="text-base leading-none">{item.icon}</span>
                      <div>
                        <p className="text-[11px] font-medium text-foreground leading-tight">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground">{item.cost}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pay button */}
              <div className="px-6 pb-6">
                <motion.button
                  onClick={handlePay}
                  disabled={loading}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm text-primary-foreground relative overflow-hidden shadow-lg bg-primary hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <AnimatePresence mode="wait">
                    {loading ? (
                      <motion.span
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-center gap-2"
                      >
                        <Loader2 size={16} className="animate-spin" />
                        Redirecting to Stripe…
                      </motion.span>
                    ) : (
                      <motion.span
                        key="pay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-center gap-2"
                      >
                        <Sparkles size={16} />
                        Pay {selected.price} · Get {selected.sparks + (selected.bonus ?? 0)} Sparks
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
                <p className="text-center text-[10px] text-muted-foreground/50 mt-2.5 flex items-center justify-center gap-1">
                  🔒 Secure payment via Stripe
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SparksCheckoutModal;
