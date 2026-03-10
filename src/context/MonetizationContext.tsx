import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  refetchSparks: () => void;
}

const LS_PLAN = "flux_user_plan";
const LS_BYOK = "flux_has_byok";

const MonetizationContext = createContext<MonetizationContextValue | null>(null);

export function MonetizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [userPlan, setUserPlanState] = useState<UserPlan>(() => {
    return (localStorage.getItem(LS_PLAN) as UserPlan) || "Starter";
  });
  const [sparksBalance, setSparksBalanceState] = useState<number>(50);
  const [hasBYOK, setHasBYOKState] = useState(() => localStorage.getItem(LS_BYOK) === "true");
  const [billingOpen, setBillingOpen] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<string | null>(null);
  const [showOutOfSparks, setShowOutOfSparks] = useState(false);
  const [floatAnims, setFloatAnims] = useState<FloatAnim[]>([]);
  const animRef = useRef(0);

  // ── DB sync helpers ────────────────────────────────────────────────────────
  const fetchSparks = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("sparks_balance")
      .eq("id", user.id)
      .maybeSingle();
    if (data && typeof (data as any).sparks_balance === "number") {
      setSparksBalanceState((data as any).sparks_balance);
    }
  }, [user]);

  const persistSparks = useCallback(async (newBalance: number) => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ sparks_balance: newBalance } as any)
      .eq("id", user.id);
  }, [user]);

  // Load from DB on mount / user change
  useEffect(() => {
    fetchSparks();
  }, [fetchSparks]);

  // ── Plan ───────────────────────────────────────────────────────────────────
  const setUserPlan = useCallback((plan: UserPlan) => {
    setUserPlanState(plan);
    localStorage.setItem(LS_PLAN, plan);
  }, []);

  const setBYOK = useCallback((value: boolean) => {
    setHasBYOKState(value);
    localStorage.setItem(LS_BYOK, String(value));
  }, []);

  // ── Sparks ─────────────────────────────────────────────────────────────────
  const addSparks = useCallback((amount: number) => {
    setSparksBalanceState((prev) => {
      const next = prev + amount;
      persistSparks(next);
      return next;
    });
  }, [persistSparks]);

  const consumeSparks = useCallback((cost: number, _featureName?: string): boolean => {
    if (hasBYOK) return true;
    if (sparksBalance >= cost) {
      setSparksBalanceState((prev) => {
        const next = prev - cost;
        persistSparks(next);
        return next;
      });
      // Float animation
      const id = `anim-${animRef.current++}`;
      const x = window.innerWidth / 2 + (Math.random() - 0.5) * 100;
      const y = window.innerHeight / 2 + (Math.random() - 0.5) * 60;
      setFloatAnims((prev) => [...prev, { id, cost, x, y }]);
      setTimeout(() => setFloatAnims((prev) => prev.filter((a) => a.id !== id)), 1500);
      return true;
    }
    setShowOutOfSparks(true);
    return false;
  }, [sparksBalance, hasBYOK, persistSparks]);

  const canAccess = useCallback((feature: "split-view" | "mail" | "team-chat" | "full-council"): boolean => {
    if (userPlan === "Pro" || userPlan === "Team") return true;
    if (feature === "team-chat") return (userPlan as string) === "Team";
    return false;
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
      refetchSparks: fetchSparks,
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
