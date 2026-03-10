import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Loader2, CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStripeSubscription } from "@/hooks/useStripeSubscription";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  subscriptionId: string;
  periodEnd: string; // human-readable date string
}

export default function CancelSubscriptionDialog({ open, onClose, subscriptionId, periodEnd }: Props) {
  const [loading, setLoading] = useState(false);
  const { refetch } = useStripeSubscription();

  const handleCancel = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-cancel-subscription", {
        body: { subscriptionId },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);
      toast.success(`Subscription cancelled. You'll retain access until ${periodEnd}.`);
      await refetch();
      onClose();
    } catch (err) {
      toast.error((err as Error).message || "Failed to cancel subscription.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(14px)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl p-8 shadow-2xl"
            style={{
              background: "hsl(var(--card))",
              border: "1.5px solid hsl(var(--border)/0.6)",
            }}
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              <X size={15} />
            </button>

            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-5">
              <AlertTriangle size={26} className="text-destructive" />
            </div>

            <h2 className="text-xl font-bold text-foreground mb-2">Cancel Subscription?</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Are you sure you want to cancel your subscription? You will not be charged again, but you'll keep full access until your current period ends.
            </p>

            {/* Period end callout */}
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-6">
              <CalendarClock size={18} className="text-amber-500 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-amber-500">Access until</p>
                <p className="text-sm font-bold text-foreground">{periodEnd}</p>
              </div>
            </div>

            {/* What you lose */}
            <ul className="space-y-1.5 mb-7 text-sm text-muted-foreground">
              {["500 Sparks/month allowance", "Full Council (4 Advisors)", "Split-View Multitasking", "Mail Sync"].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl border border-border text-sm font-medium text-foreground hover:bg-secondary/60 transition-colors"
              >
                Keep My Plan
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 py-3 rounded-2xl bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                {loading ? "Cancelling…" : "Yes, Cancel"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
