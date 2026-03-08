import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type UserPlan = "Starter" | "Pro" | "Team";

interface FloatAnim {
  id: string;
  cost: number;
  x: number;
  y: number;
}

interface MonetizationContextValue {
  userPlan: UserPlan;
  sparksBalance: number;
  hasBYOK: boolean;
  setUserPlan: (plan: UserPlan) => void;
  setBYOK: (value: boolean) => void;
  consumeSparks: (cost: number, featureName?: string) => boolean;
  addSparks: (amount: number) => void;
  openBilling: () => void;
  closeBilling: () => void;
  billingOpen: boolean;
  showUpgradeModal: (feature: string) => void;
  upgradeTarget: string | null;
  closeUpgradeModal: () => void;
  showOutOfSparks: boolean;
  closeOutOfSparks: () => void;
  canAccess: (feature: "split-view" | "mail" | "team-chat" | "full-council") => boolean;
}

const LS_PLAN = "flux_user_plan";
const LS_SPARKS = "flux_sparks_balance";
const LS_BYOK = "flux_has_byok";

const MonetizationContext = createContext<MonetizationContextValue | null>(null);

export function MonetizationProvider({ children }: { children: ReactNode }) {
  const [userPlan, setUserPlanState] = useState<UserPlan>(() => {
    return (localStorage.getItem(LS_PLAN) as UserPlan) || "Starter";
  });
  const [sparksBalance, setSparksBalance] = useState<number>(() => {
    return parseInt(localStorage.getItem(LS_SPARKS) || "50", 10);
  });
  const [hasBYOK, setHasBYOKState] = useState(() => localStorage.getItem(LS_BYOK) === "true");
  const [billingOpen, setBillingOpen] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<string | null>(null);
  const [showOutOfSparks, setShowOutOfSparks] = useState(false);
  const [floatAnims, setFloatAnims] = useState<FloatAnim[]>([]);
  const animRef = useRef(0);

  const setUserPlan = useCallback((plan: UserPlan) => {
    setUserPlanState(plan);
    localStorage.setItem(LS_PLAN, plan);
  }, []);

  const setBYOK = useCallback((value: boolean) => {
    setHasBYOKState(value);
    localStorage.setItem(LS_BYOK, String(value));
  }, []);

  const addSparks = useCallback((amount: number) => {
    setSparksBalance((prev) => {
      const next = prev + amount;
      localStorage.setItem(LS_SPARKS, String(next));
      return next;
    });
  }, []);

  const consumeSparks = useCallback((cost: number, _featureName?: string): boolean => {
    if (hasBYOK) return true;
    if (sparksBalance >= cost) {
      setSparksBalance((prev) => {
        const next = prev - cost;
        localStorage.setItem(LS_SPARKS, String(next));
        return next;
      });
      // Trigger float animation near center of screen
      const id = `anim-${animRef.current++}`;
      const x = window.innerWidth / 2 + (Math.random() - 0.5) * 100;
      const y = window.innerHeight / 2 + (Math.random() - 0.5) * 60;
      setFloatAnims((prev) => [...prev, { id, cost, x, y }]);
      setTimeout(() => setFloatAnims((prev) => prev.filter((a) => a.id !== id)), 1500);
      return true;
    }
    setShowOutOfSparks(true);
    return false;
  }, [sparksBalance, hasBYOK]);

  const canAccess = useCallback((feature: "split-view" | "mail" | "team-chat" | "full-council"): boolean => {
    if (userPlan === "Pro" || userPlan === "Team") return true;
    if (feature === "team-chat") return (userPlan as string) === "Team";
    return false; // Starter cannot access split-view, mail, full-council
  }, [userPlan]);

  const openBilling = useCallback(() => setBillingOpen(true), []);
  const closeBilling = useCallback(() => setBillingOpen(false), []);
  const showUpgradeModal = useCallback((feature: string) => setUpgradeTarget(feature), []);
  const closeUpgradeModal = useCallback(() => setUpgradeTarget(null), []);
  const closeOutOfSparks = useCallback(() => setShowOutOfSparks(false), []);

  return (
    <MonetizationContext.Provider value={{
      userPlan, sparksBalance, hasBYOK,
      setUserPlan, setBYOK, consumeSparks, addSparks,
      openBilling, closeBilling, billingOpen,
      showUpgradeModal, upgradeTarget, closeUpgradeModal,
      showOutOfSparks, closeOutOfSparks, canAccess,
    }}>
      {children}
      {/* Float animations */}
      <AnimatePresence>
        {floatAnims.map((a) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -60, scale: 1.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="fixed pointer-events-none z-[9999] text-sm font-bold"
            style={{ left: a.x, top: a.y }}
          >
            <span className="text-yellow-400">-{a.cost} ✨</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </MonetizationContext.Provider>
  );
}

export function useMonetization() {
  const ctx = useContext(MonetizationContext);
  if (!ctx) throw new Error("useMonetization must be used within MonetizationProvider");
  return ctx;
}
