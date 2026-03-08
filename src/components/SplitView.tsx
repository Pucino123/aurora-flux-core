/**
 * SplitView — iPadOS-style side-by-side document viewer.
 * Triggered from DocumentView header. Uses WorkspaceContext for state.
 */
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Maximize2, FileText, Table2, PanelRight } from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useDocuments } from "@/hooks/useDocuments";
import type { DbDocument } from "@/hooks/useDocuments";
import DocumentView from "@/components/documents/DocumentView";

const SplitView = () => {
  const { panels, closePanel, replacePanel, openInWorkspace } = useWorkspace();
  const { documents, updateDocument, removeDocument } = useDocuments(null);

  const leftDoc = panels[0]?.doc ?? null;
  const rightDoc = panels[1]?.doc ?? null;
  const isSplit = !!leftDoc && !!rightDoc;
  const hasSingle = !!leftDoc && !rightDoc;

  if (!leftDoc) return null;

  const typeIcon = (t: string) => t === "spreadsheet" ? <Table2 size={12} /> : <FileText size={12} />;

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden gap-0">
      {/* Left panel */}
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`flex flex-col min-h-0 overflow-hidden ${isSplit ? "flex-1 border-r border-border/40" : "flex-1"}`}
      >
        <DocumentView
          document={leftDoc}
          onBack={() => closePanel(0)}
          onUpdate={(id, upd) => updateDocument(id, upd)}
          onDelete={() => closePanel(0)}
          splitViewButton={
            !isSplit ? (
              <button
                onClick={() => replacePanel(1, leftDoc)} // triggers picker on right
                className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground"
                title="Open in Split View"
              >
                <PanelRight size={14} />
              </button>
            ) : (
              <button
                onClick={() => { closePanel(1); }}
                className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground"
                title="Expand to full"
              >
                <Maximize2 size={14} />
              </button>
            )
          }
        />
      </motion.div>

      {/* Right panel */}
      <AnimatePresence>
        {isSplit && rightDoc && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "50%", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            className="flex flex-col min-h-0 overflow-hidden"
            style={{ flexShrink: 0 }}
          >
            <DocumentView
              document={rightDoc}
              onBack={() => closePanel(1)}
              onUpdate={(id, upd) => updateDocument(id, upd)}
              onDelete={() => closePanel(1)}
              splitViewButton={
                <button
                  onClick={() => closePanel(1)}
                  className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground"
                  title="Expand to full"
                >
                  <Maximize2 size={14} />
                </button>
              }
            />
          </motion.div>
        )}

        {/* Right file picker (no rightDoc yet but slot exists) */}
        {!rightDoc && hasSingle && (
          <motion.div
            key="picker"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "50%", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            className="flex flex-col min-h-0"
            style={{ flexShrink: 0 }}
          >
            <div
              className="flex flex-col h-full"
              style={{
                background: "hsl(var(--card)/0.5)",
                backdropFilter: "blur(12px)",
                borderLeft: "1px solid hsl(var(--border)/0.4)",
              }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                <p className="text-xs font-semibold text-foreground">Select document for Split View</p>
                <button onClick={() => closePanel(1)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
                  <X size={13} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {documents.filter(d => d.id !== leftDoc.id).map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => replacePanel(1, doc)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-secondary/50 transition-colors text-left group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-secondary/60 flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
                      {typeIcon(doc.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">{doc.title}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{doc.type}</p>
                    </div>
                  </button>
                ))}
                {documents.filter(d => d.id !== leftDoc.id).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">No other documents available.</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SplitView;

// ── Split View trigger button (exported for use in toolbar) ──────────────────
export const SplitViewTrigger = ({ onTrigger }: { onTrigger: () => void }) => (
  <button
    onClick={onTrigger}
    className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground"
    title="Open in Split View"
  >
    <PanelRight size={14} />
  </button>
);
