import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type Stage = "leads" | "contacted" | "proposal" | "closed";

export interface CRMInvoice {
  id: string;
  amount: number;
  date: string;
  status: "Paid" | "Pending" | "Sent";
  description?: string;
}

export interface CRMContact {
  id: string;
  name: string;
  company: string;
  email?: string;
  phone?: string;
  invoices: CRMInvoice[];
}

export interface CRMDeal extends CRMContact {
  value: number;
  stage: Stage;
  user_id?: string;
  sort_order?: number;
  companyName?: string;
}

interface CRMContextValue {
  deals: CRMDeal[];
  loading: boolean;
  addDeal: (deal: Omit<CRMDeal, "id" | "invoices">) => Promise<void>;
  updateDeal: (id: string, data: Partial<CRMDeal>) => Promise<void>;
  removeDeal: (id: string) => Promise<void>;
  refreshDeals: () => Promise<void>;
  addInvoice: (contactId: string, invoice: CRMInvoice) => void;
}

const CRMContext = createContext<CRMContextValue | null>(null);

const LS_KEY = "dashiii_crm_deals";

const INITIAL_DEALS: CRMDeal[] = [
  { id: "d1", name: "Alex Turner",   company: "Apex Dynamics",   email: "alex@apexdynamics.com",  phone: "+1 555-0101", value: 12500, stage: "leads",     invoices: [] },
  { id: "d2", name: "Sofia Martins", company: "NovaBuild Ltd.",  email: "sofia@novabuild.io",     phone: "+1 555-0102", value: 8200,  stage: "leads",     invoices: [{ id: "INV-10001", amount: 1200, date: "2026-01-15", status: "Paid" }] },
  { id: "d3", name: "Jared Kim",     company: "CloudStack Inc.", email: "jared@cloudstack.io",    phone: "+1 555-0103", value: 21000, stage: "contacted",  invoices: [{ id: "INV-10002", amount: 5500, date: "2026-02-01", status: "Pending" }] },
  { id: "d4", name: "Priya Shah",    company: "Meridian Group",  email: "priya@meridiangrp.com",  phone: "+1 555-0104", value: 5500,  stage: "contacted",  invoices: [] },
  { id: "d5", name: "Lucas Weber",   company: "TechForge GmbH",  email: "lucas@techforge.de",     phone: "+49 555-0105",value: 33000, stage: "proposal",   invoices: [{ id: "INV-10003", amount: 8000, date: "2026-02-20", status: "Sent" }] },
  { id: "d6", name: "Amara Osei",    company: "Greenline Co.",   email: "amara@greenline.co",     phone: "+44 555-0106",value: 9800,  stage: "proposal",   invoices: [] },
  { id: "d7", name: "Nina Volkova",  company: "Stellar Systems", email: "nina@stellarsys.com",    phone: "+7 555-0107", value: 47500, stage: "closed",     invoices: [{ id: "INV-10004", amount: 22000, date: "2026-03-01", status: "Paid" }, { id: "INV-10005", amount: 12000, date: "2026-03-05", status: "Pending" }] },
];

export function CRMProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [deals, setDeals] = useState<CRMDeal[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshDeals = useCallback(async () => {
    if (!user) {
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
        email: d.email || undefined,
        phone: d.phone || undefined,
        value: d.value,
        stage: d.stage as Stage,
        user_id: d.user_id,
        sort_order: d.sort_order,
        invoices: [],
      }));
      setDeals(mapped.length > 0 ? mapped : INITIAL_DEALS);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { refreshDeals(); }, [refreshDeals]);

  const persist = (next: CRMDeal[]) => {
    if (!user) localStorage.setItem(LS_KEY, JSON.stringify(next));
  };

  const addDeal = useCallback(async (deal: Omit<CRMDeal, "id" | "invoices">) => {
    const localId = crypto.randomUUID();
    const optimistic: CRMDeal = { ...deal, id: localId, invoices: [] };
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
    const { email: _e, phone: _p, invoices: _i, ...dbData } = data;
    await supabase.from("crm_deals").update(dbData as any).eq("id", id).eq("user_id", user.id);
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

  const addInvoice = useCallback((contactId: string, invoice: CRMInvoice) => {
    setDeals(prev => {
      const next = prev.map(d => d.id === contactId
        ? { ...d, invoices: [...(d.invoices || []), invoice] }
        : d
      );
      persist(next);
      return next;
    });
  }, []);

  return (
    <CRMContext.Provider value={{ deals, loading, addDeal, updateDeal, removeDeal, refreshDeals, addInvoice }}>
      {children}
    </CRMContext.Provider>
  );
}

export function useCRM() {
  const ctx = useContext(CRMContext);
  if (!ctx) throw new Error("useCRM must be used within CRMProvider");
  return ctx;
}
