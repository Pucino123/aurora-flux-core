import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type Stage = "leads" | "contacted" | "proposal" | "closed";

export interface CRMDeal {
  id: string;
  name: string;
  company: string;
  value: number;
  stage: Stage;
  user_id?: string;
  sort_order?: number;
}

interface CRMContextValue {
  deals: CRMDeal[];
  loading: boolean;
  addDeal: (deal: Omit<CRMDeal, "id">) => Promise<void>;
  updateDeal: (id: string, data: Partial<CRMDeal>) => Promise<void>;
  removeDeal: (id: string) => Promise<void>;
  refreshDeals: () => Promise<void>;
}

const CRMContext = createContext<CRMContextValue | null>(null);

const LS_KEY = "dashiii_crm_deals";

const INITIAL_DEALS: CRMDeal[] = [
  { id: "d1", name: "Alex Turner", company: "Apex Dynamics", value: 12500, stage: "leads" },
  { id: "d2", name: "Sofia Martins", company: "NovaBuild Ltd.", value: 8200, stage: "leads" },
  { id: "d3", name: "Jared Kim", company: "CloudStack Inc.", value: 21000, stage: "contacted" },
  { id: "d4", name: "Priya Shah", company: "Meridian Group", value: 5500, stage: "contacted" },
  { id: "d5", name: "Lucas Weber", company: "TechForge GmbH", value: 33000, stage: "proposal" },
  { id: "d6", name: "Amara Osei", company: "Greenline Co.", value: 9800, stage: "proposal" },
  { id: "d7", name: "Nina Volkova", company: "Stellar Systems", value: 47500, stage: "closed" },
];

export function CRMProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [deals, setDeals] = useState<CRMDeal[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshDeals = useCallback(async () => {
    if (!user) {
      // Use localStorage for anonymous mode
      try {
        const raw = localStorage.getItem(LS_KEY);
        setDeals(raw ? JSON.parse(raw) : INITIAL_DEALS);
      } catch {
        setDeals(INITIAL_DEALS);
      }
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("crm_deals")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true });
    if (!error && data) {
      const mapped: CRMDeal[] = (data as any[]).map(d => ({
        id: d.id,
        name: d.name,
        company: d.company,
        value: d.value,
        stage: d.stage as Stage,
        user_id: d.user_id,
        sort_order: d.sort_order,
      }));
      setDeals(mapped.length > 0 ? mapped : INITIAL_DEALS);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { refreshDeals(); }, [refreshDeals]);

  const persist = (next: CRMDeal[]) => {
    if (!user) localStorage.setItem(LS_KEY, JSON.stringify(next));
  };

  const addDeal = useCallback(async (deal: Omit<CRMDeal, "id">) => {
    const localId = crypto.randomUUID();
    const optimistic: CRMDeal = { ...deal, id: localId };
    setDeals(prev => {
      const next = [...prev, optimistic];
      persist(next);
      return next;
    });
    if (!user) return;
    const { data, error } = await supabase.from("crm_deals").insert({
      user_id: user.id,
      name: deal.name,
      company: deal.company,
      value: deal.value,
      stage: deal.stage,
      sort_order: deals.length,
    } as any).select().single();
    if (!error && data) {
      setDeals(prev => prev.map(d => d.id === localId ? { ...d, id: (data as any).id } : d));
    }
  }, [user, deals.length]);

  const updateDeal = useCallback(async (id: string, data: Partial<CRMDeal>) => {
    setDeals(prev => {
      const next = prev.map(d => d.id === id ? { ...d, ...data } : d);
      persist(next);
      return next;
    });
    if (!user) return;
    await supabase.from("crm_deals").update(data as any).eq("id", id).eq("user_id", user.id);
  }, [user]);

  const removeDeal = useCallback(async (id: string) => {
    setDeals(prev => {
      const next = prev.filter(d => d.id !== id);
      persist(next);
      return next;
    });
    if (!user) return;
    const { error } = await supabase.from("crm_deals").delete().eq("id", id).eq("user_id", user.id);
    if (error) { toast.error("Failed to delete deal"); refreshDeals(); }
  }, [user, refreshDeals]);

  return (
    <CRMContext.Provider value={{ deals, loading, addDeal, updateDeal, removeDeal, refreshDeals }}>
      {children}
    </CRMContext.Provider>
  );
}

export function useCRM() {
  const ctx = useContext(CRMContext);
  if (!ctx) throw new Error("useCRM must be used within CRMProvider");
  return ctx;
}
