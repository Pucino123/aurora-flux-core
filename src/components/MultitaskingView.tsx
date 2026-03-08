import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { FileText, Table, X, Layers, GripVertical, Columns2 } from "lucide-react";
import SEO from "@/components/SEO";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useDocuments } from "@/hooks/useDocuments";
import DocumentView from "./documents/DocumentView";
import type { DbDocument } from "@/hooks/useDocuments";

/* ─── Window chrome wrapper ─── */
const GlassWindow = ({
  doc, onClose, onUpdate, onDelete,
}: {
  doc: DbDocument;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<DbDocument>) => void;
  onDelete: (id: string) => void;
}) => {
  const Icon = doc.type === "spreadsheet" ? Table : FileText;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* macOS-style window header */}
      <div
        className="flex items-center gap-2.5 px-4 py-2 border-b shrink-0 select-none"
        style={{
          borderColor: "hsl(var(--border))",
          background: "hsl(var(--card)/0.7)",
          backdropFilter: "blur(10px)",
        }}
      >
        <button
          onClick={onClose}
          className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors shrink-0 flex items-center justify-center group"
          title="Close"
          aria-label="Close panel"
        >
          <X size={7} className="opacity-0 group-hover:opacity-100 text-red-900" />
        </button>
        <Icon size={12} className="text-muted-foreground shrink-0" />
        <span className="text-xs font-medium text-foreground flex-1 truncate">{doc.title}</span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-md font-medium capitalize"
          style={{ background: "hsl(var(--secondary)/0.6)", color: "hsl(var(--muted-foreground))" }}
        >
          {doc.type === "spreadsheet" ? "Sheet" : "Doc"}
        </span>
      </div>

      {/* Real DocumentView — fills remaining height */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <DocumentView
          document={doc}
          onBack={onClose}
          onUpdate={onUpdate}
          onDelete={(id) => { onDelete(id); onClose(); }}
        />
      </div>
    </div>
  );
};

/* ─── Drop zone for second panel ─── */
const EmptyDropZone = ({
  label, onDropDoc,
}: {
  label: string;
  onDropDoc: (doc: DbDocument) => void;
}) => {
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        try {
          const data = JSON.parse(e.dataTransfer.getData("application/flux-doc"));
          onDropDoc(data);
        } catch {}
      }}
      className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl m-3 transition-all duration-200 cursor-pointer ${
        over
          ? "border-primary/70 bg-primary/5 scale-[1.01]"
          : "border-border/40 hover:border-border/70"
      }`}
    >
      <Columns2 size={20} className="text-muted-foreground mb-2" />
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-xs text-muted-foreground/60 mt-1">or drag a document here</p>
    </div>
  );
};

/* ─── Main MultitaskingView ─── */
const MultitaskingView = () => {
  const { panels, closePanel, replacePanel, openInWorkspace } = useWorkspace();
  const { updateDocument, removeDocument } = useDocuments();

  const [left, right] = panels;
  const bothOpen = !!left && !!right;
  const anyOpen = !!left || !!right;

  const handleDropOnEmpty = useCallback((doc: DbDocument) => {
    openInWorkspace(doc);
  }, [openInWorkspace]);

  return (
    <div
      className="flex-1 flex flex-col min-h-0 min-w-0 relative"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        try {
          const data = JSON.parse(e.dataTransfer.getData("application/flux-doc"));
          openInWorkspace(data);
        } catch {}
      }}
    >
      <SEO title="Workspace" description="Split-View — open documents and spreadsheets side by side." />

      {/* Header */}
      <div
        className="px-6 py-3 border-b shrink-0 flex items-center gap-3"
        style={{ borderColor: "hsl(var(--border)/0.3)" }}
      >
        <Layers size={16} className="text-muted-foreground" />
        <div>
          <h2 className="text-sm font-semibold text-foreground leading-none">Workspace</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {bothOpen
              ? "Two documents open — drag the divider to resize"
              : anyOpen
              ? "Drag a second document here to open it side by side"
              : "Click a document in the sidebar to open it here"}
          </p>
        </div>
        {anyOpen && (
          <span
            className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: "hsl(var(--primary)/0.12)", color: "hsl(var(--primary))" }}
          >
            {bothOpen ? "Split View" : "Single View"}
          </span>
        )}
      </div>

      {!anyOpen ? (
        /* Empty state */
        <div
          className="flex-1 flex flex-col items-center justify-center gap-4"
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={(e) => {
            e.preventDefault();
            try {
              const data = JSON.parse(e.dataTransfer.getData("application/flux-doc"));
              openInWorkspace(data);
            } catch {}
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-3 p-10 rounded-3xl border-2 border-dashed max-w-sm text-center"
            style={{ borderColor: "hsl(var(--border)/0.5)" }}
          >
            <Layers size={36} className="text-muted-foreground/30" />
            <div>
              <p className="font-semibold text-foreground mb-1">Open a document to get started</p>
              <p className="text-sm text-muted-foreground">
                Click any document or spreadsheet in the sidebar — it will open here.
                Open a second one to snap into Split View automatically.
              </p>
            </div>
          </motion.div>
        </div>
      ) : bothOpen ? (
        /* Two panels with resizable handle */
        <PanelGroup direction="horizontal" className="flex-1 min-h-0">
          <Panel defaultSize={50} minSize={20} className="min-h-0 overflow-hidden">
            <div
              className="h-full overflow-hidden"
              style={{
                background: "hsl(var(--card)/0.35)",
                backdropFilter: "blur(12px)",
              }}
            >
              <GlassWindow
                doc={left!.doc}
                onClose={() => closePanel(0)}
                onUpdate={updateDocument}
                onDelete={removeDocument}
              />
            </div>
          </Panel>

          <PanelResizeHandle className="w-1.5 relative group flex items-center justify-center cursor-col-resize"
            style={{ background: "hsl(var(--border)/0.3)" }}>
            <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-primary/20 transition-colors rounded" />
            <GripVertical size={14} className="text-muted-foreground/40 group-hover:text-primary transition-colors relative z-10" />
          </PanelResizeHandle>

          <Panel defaultSize={50} minSize={20} className="min-h-0 overflow-hidden">
            <div
              className="h-full overflow-hidden"
              style={{
                background: "hsl(var(--card)/0.35)",
                backdropFilter: "blur(12px)",
              }}
            >
              <GlassWindow
                doc={right!.doc}
                onClose={() => closePanel(1)}
                onUpdate={updateDocument}
                onDelete={removeDocument}
              />
            </div>
          </Panel>
        </PanelGroup>
      ) : (
        /* Single panel + drop zone on right */
        <div className="flex-1 flex min-h-0">
          <div
            className="flex-1 m-2 rounded-2xl overflow-hidden"
            style={{
              background: "hsl(var(--card)/0.35)",
              backdropFilter: "blur(12px)",
              border: "1px solid hsl(var(--border)/0.3)",
            }}
          >
            <GlassWindow
              doc={(left || right)!.doc}
              onClose={() => closePanel(left ? 0 : 1)}
              onUpdate={updateDocument}
              onDelete={removeDocument}
            />
          </div>
          <EmptyDropZone
            label="Drop here to open side by side"
            onDropDoc={handleDropOnEmpty}
          />
        </div>
      )}
    </div>
  );
};

export default MultitaskingView;
