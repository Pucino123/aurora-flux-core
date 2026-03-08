import React, { useState, useEffect } from "react";
import SEO from "./SEO";
import { useDocuments } from "@/hooks/useDocuments";
import { FileText, Table, Plus, Trash2, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DocumentView from "./documents/DocumentView";
import { useFlux } from "@/context/FluxContext";
import { useWorkspace } from "@/context/WorkspaceContext";

const DocumentsView = () => {
  const { documents, createDocument, updateDocument, removeDocument, loading } = useDocuments();
  const { pendingDocumentId, setPendingDocumentId, setActiveView } = useFlux();
  const { openInWorkspace } = useWorkspace();
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Open pending document from sidebar click → go to workspace
  useEffect(() => {
    if (pendingDocumentId && documents.length > 0) {
      const found = documents.find(d => d.id === pendingDocumentId);
      if (found) {
        openInWorkspace(found);
        setActiveView("multitask" as any);
      }
      setPendingDocumentId(null);
    }
  }, [pendingDocumentId, documents, setPendingDocumentId, openInWorkspace, setActiveView]);

  const filtered = documents.filter(d => d.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2"><FileText size={22} /> Documents</h2>
          <p className="text-sm text-muted-foreground">Click a document to open it in Workspace — drag to open side by side</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              const doc = await createDocument("Untitled", "text");
              if (doc) { openInWorkspace(doc); setActiveView("multitask" as any); }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:opacity-90 transition-opacity border border-border"
          >
            <Plus size={14} /> Doc
          </button>
          <button
            onClick={async () => {
              const doc = await createDocument("Untitled Sheet", "spreadsheet");
              if (doc) { openInWorkspace(doc); setActiveView("multitask" as any); }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Table size={14} /> Sheet
          </button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search documents..."
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-secondary/50 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-secondary/50 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flux-card text-center py-16">
          <FileText size={32} className="mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="font-semibold font-display mb-2 text-lg">No documents yet</h3>
          <p className="text-sm text-muted-foreground">Create your first document to get started.</p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((doc, i) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <div
                  draggable
                  onDragStart={(e: React.DragEvent) => {
                    e.dataTransfer.setData("application/flux-doc", JSON.stringify(doc));
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => { openInWorkspace(doc); setActiveView("multitask" as any); }}
                  className="flux-card flex items-center justify-between hover:ring-1 hover:ring-primary/20 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    {doc.type === "spreadsheet"
                      ? <Table size={16} className="text-emerald-500 shrink-0" />
                      : <FileText size={16} className="text-blue-400 shrink-0" />}
                    <div className="text-left">
                      <p className="text-sm font-medium">{doc.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {doc.type === "spreadsheet" ? "Spreadsheet" : "Document"} · Updated {new Date(doc.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); removeDocument(doc.id); }}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default DocumentsView;
