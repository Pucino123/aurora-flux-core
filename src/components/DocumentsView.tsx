import React, { useState } from "react";
import { useDocuments } from "@/hooks/useDocuments";
import { FileText, Plus, Trash2, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DocumentView from "./documents/DocumentView";

const DocumentsView = () => {
  const { documents, createDocument, updateDocument, removeDocument, loading } = useDocuments();
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = documents.filter(d => d.title.toLowerCase().includes(search.toLowerCase()));
  const activeDoc = documents.find(d => d.id === selectedDoc);

  if (activeDoc) {
    return (
      <DocumentView
        document={activeDoc}
        onBack={() => setSelectedDoc(null)}
        onUpdate={updateDocument}
        onDelete={(id) => { removeDocument(id); setSelectedDoc(null); }}
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2"><FileText size={22} /> Documents</h2>
          <p className="text-sm text-muted-foreground">Your notes and documents</p>
        </div>
        <button
          onClick={async () => {
            const doc = await createDocument("Untitled", "text");
            if (doc) setSelectedDoc(doc.id);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus size={14} /> New Document
        </button>
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
              <motion.button
                key={doc.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setSelectedDoc(doc.id)}
                className="w-full flux-card flex items-center justify-between hover:ring-1 hover:ring-primary/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-muted-foreground" />
                  <div className="text-left">
                    <p className="text-sm font-medium">{doc.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Updated {new Date(doc.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); removeDocument(doc.id); }}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default DocumentsView;
