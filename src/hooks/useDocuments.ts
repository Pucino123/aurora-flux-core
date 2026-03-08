import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface DbDocument {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  type: "text" | "spreadsheet";
  content: any;
  created_at: string;
  updated_at: string;
}

const LS_KEY = "flux_local_documents";

function lsGetDocs(): DbDocument[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function lsSetDocs(docs: DbDocument[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(docs)); } catch {}
}

export function useDocuments(folderId?: string | null) {
  const { user } = useAuth();
  const [documents, setDocumentsRaw] = useState<DbDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setDocuments = useCallback((val: DbDocument[] | ((prev: DbDocument[]) => DbDocument[])) => {
    setDocumentsRaw((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      if (!user) lsSetDocs(next);
      return next;
    });
  }, [user]);

  const fetchDocuments = useCallback(async () => {
    if (!user) {
      // Load from localStorage
      let docs = lsGetDocs();
      if (folderId !== undefined) {
        if (folderId === null) {
          docs = docs.filter((d) => !d.folder_id);
        } else {
          docs = docs.filter((d) => d.folder_id === folderId);
        }
      }
      setDocumentsRaw(docs);
      setLoading(false);
      return;
    }
    let query = (supabase as any)
      .from("documents")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (folderId !== undefined) {
      if (folderId === null) {
        query = query.is("folder_id", null);
      } else {
        query = query.eq("folder_id", folderId);
      }
    }

    const { data } = await query;
    setDocumentsRaw((data || []) as DbDocument[]);
    setLoading(false);
  }, [user, folderId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const createDocument = useCallback(
    async (title: string, type: "text" | "spreadsheet", folder_id?: string | null) => {
      const defaultContent =
        type === "text"
          ? { html: "" }
          : { rows: Array.from({ length: 10 }, () => Array(5).fill("")) };

      const localId = crypto.randomUUID();
      const localUserId = user?.id || "local";

      if (!user) {
        const doc: DbDocument = {
          id: localId, user_id: localUserId, folder_id: folder_id || null,
          title, type, content: defaultContent,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        };
        // Update both filtered view and full localStorage
        setDocumentsRaw((prev) => [doc, ...prev]);
        const allDocs = lsGetDocs();
        lsSetDocs([doc, ...allDocs]);
        return doc;
      }

      const { data, error } = await (supabase as any)
        .from("documents")
        .insert({
          user_id: user.id,
          folder_id: folder_id || null,
          title, type,
          content: defaultContent,
        })
        .select()
        .single();

      if (error || !data) return null;
      const doc = data as DbDocument;
      setDocumentsRaw((prev) => [doc, ...prev]);
      return doc;
    },
    [user]
  );

  const updateDocument = useCallback(
    (id: string, updates: Partial<Pick<DbDocument, "title" | "content">>) => {
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
      );

      if (!user) {
        // Also update in full localStorage
        const allDocs = lsGetDocs();
        lsSetDocs(allDocs.map((d) => (d.id === id ? { ...d, ...updates } : d)));
        return;
      }

      // Debounced save
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        await (supabase as any)
          .from("documents")
          .update(updates)
          .eq("id", id)
          .eq("user_id", user.id);
      }, 800);
    },
    [user, setDocuments]
  );

  const removeDocument = useCallback(
    async (id: string) => {
      const doc = documents.find(d => d.id === id);
      // Pass to trash via callback if provided
      if (doc && onMoveToTrash) {
        onMoveToTrash({ id: doc.id, type: "document", title: doc.title, originalData: doc });
      }
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (!user) {
        const allDocs = lsGetDocs();
        lsSetDocs(allDocs.filter((d) => d.id !== id));
        return;
      }
      await (supabase as any)
        .from("documents")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
    },
    [user, setDocuments, documents, onMoveToTrash]
  );

  return { documents, loading, createDocument, updateDocument, removeDocument, refetch: fetchDocuments };
}
