/**
 * SparksCheckoutModal — Apple Pay-style dopamine checkout with count-up animation.
 */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Sparkles, Zap, CreditCard } from "lucide-react";
import { useMonetization } from "@/context/MonetizationContext";

interface Package {
  sparks: number;
  price: string;
  label: string;
  popular?: boolean;
}

const PACKAGES: Package[] = [
  { sparks: 60,  price: "$5",  label: "Starter Pack" },
  { sparks: 150, price: "$10", label: "Power Pack", popular: true },
  { sparks: 400, price: "$25", label: "Pro Bundle" },
];

type PayState = "idle" | "processing" | "success";

interface Props {
  open: boolean;
  onClose: () => void;
}

const SparksCheckoutModal = ({ open, onClose }: Props) => {
  const { addSparks } = useMonetization();
  const [selected, setSelected] = useState<Package>(PACKAGES[1]);
  const [payState, setPayState] = useState<PayState>("idle");
  const [displayCount, setDisplayCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counterRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open && payState !== "processing") {
        onClose();
        setPayState("idle");
        setDisplayCount(0);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, payState, onClose]);

  // Count-up animation when success
  useEffect(() => {
    if (payState !== "success") return;
    let count = 0;
    const target = selected.sparks;
    counterRef.current = setInterval(() => {
      count += Math.ceil(target / 40);
      if (count >= target) {
        count = target;
        clearInterval(counterRef.current!);
      }
      setDisplayCount(count);
    }, 35);
    // Auto-close after 2.5s
    timerRef.current = setTimeout(() => {
      onClose();
      setPayState("idle");
      setDisplayCount(0);
    }, 2800);
    return () => {
      clearInterval(counterRef.current!);
      clearTimeout(timerRef.current!);
    };
  }, [payState]);

  const handlePay = async () => {
    if (payState !== "idle") return;
    setPayState("processing");
    await new Promise(r => setTimeout(r, 1500));
    addSparks(selected.sparks);
    setPayState("success");
  };

  const handleClose = () => {
    if (payState === "processing") return;
    setPayState("idle");
    setDisplayCount(0);
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
              className="pointer-events-auto w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-white/10"
              style={{
                background: "hsl(var(--card)/0.95)",
                backdropFilter: "blur(40px)",
                WebkitBackdropFilter: "blur(40px)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                    <Sparkles size={18} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Top Up Sparks</p>
                    <p className="text-[11px] text-muted-foreground">Power your AI workspace</p>
                  </div>
                </div>
                <button onClick={handleClose} disabled={payState === "processing"}
                  className="p-1.5 rounded-xl hover:bg-secondary transition-colors text-muted-foreground">
                  <X size={15} />
                </button>
              </div>

              {/* Success state */}
              <AnimatePresence mode="wait">
                {payState === "success" ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-6 pb-8 flex flex-col items-center text-center gap-4"
                  >
                    {/* Burst ring */}
                    <motion.div
                      initial={{ scale: 0, opacity: 1 }}
                      animate={{ scale: 2.5, opacity: 0 }}
                      transition={{ duration: 0.7, ease: "easeOut" }}
                      className="absolute w-16 h-16 rounded-full border-2 border-emerald-400/50"
                    />
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
                      className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.5)]"
                    >
                      <Check size={28} className="text-white" />
                    </motion.div>
                    <div>
                      <p className="text-lg font-bold text-foreground mb-1">Payment Successful!</p>
                      <motion.p
                        key={displayCount}
                        className="text-4xl font-black text-amber-400"
                      >
                        +{displayCount} ✨
                      </motion.p>
                      <p className="text-xs text-muted-foreground mt-2">Sparks added to your account</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="checkout" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {/* Package selector */}
                    <div className="px-6 pb-4 space-y-2.5">
                      {PACKAGES.map(pkg => (
                        <button
                          key={pkg.sparks}
                          onClick={() => setSelected(pkg)}
                          className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                            selected.sparks === pkg.sparks
                              ? "border-emerald-500/40 bg-emerald-500/8 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                              : "border-border/30 hover:border-border/60 hover:bg-secondary/30"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                              selected.sparks === pkg.sparks ? "bg-emerald-500/15" : "bg-secondary/60"
                            }`}>
                              <Zap size={15} className={selected.sparks === pkg.sparks ? "text-emerald-400" : "text-muted-foreground"} />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-semibold text-foreground">{pkg.sparks} Sparks</p>
                              <p className="text-[11px] text-muted-foreground">{pkg.label}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {pkg.popular && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">Popular</span>
                            )}
                            <span className="text-sm font-bold text-foreground">{pkg.price}</span>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Payment method */}
                    <div className="mx-6 mb-4 flex items-center gap-2.5 p-3 rounded-xl border border-border/20 bg-secondary/20">
                      <CreditCard size={14} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground flex-1">Visa ending in <span className="text-foreground font-medium">4242</span></span>
                      <span className="text-[10px] text-emerald-400 font-medium">Active</span>
                    </div>

                    {/* Pay button */}
                    <div className="px-6 pb-6">
                      <motion.button
                        onClick={handlePay}
                        disabled={payState === "processing"}
                        whileTap={{ scale: 0.97 }}
                        className="w-full py-3.5 rounded-2xl font-bold text-sm text-white relative overflow-hidden shadow-lg"
                        style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                      >
                        <AnimatePresence mode="wait">
                          {payState === "processing" ? (
                            <motion.span
                              key="processing"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex items-center justify-center gap-2"
                            >
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                                className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
                              />
                              Processing…
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
                              Pay {selected.price} · Get {selected.sparks} Sparks
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>
                      <p className="text-center text-[10px] text-muted-foreground/50 mt-2.5">Secure mock payment · No real charge</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SparksCheckoutModal;
