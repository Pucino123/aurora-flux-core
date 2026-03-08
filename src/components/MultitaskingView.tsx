import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { FileText, Table, Folder, X, Layers, GripVertical } from "lucide-react";
import SEO from "@/components/SEO";

interface PanelItem {
  id: string;
  title: string;
  type: "text" | "spreadsheet" | "folder";
  content?: string;
}

const FILE_TYPE_ICONS: Record<string, any> = {
  text: FileText,
  spreadsheet: Table,
  folder: Folder,
};

const GlassWindow = ({ item, onClose, side }: { item: PanelItem; onClose: () => void; side: "left" | "right" }) => {
  const Icon = FILE_TYPE_ICONS[item.type] || FileText;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Window header */}
      <div
        className="flex items-center gap-2.5 px-4 py-2.5 border-b shrink-0"
        style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--card)/0.6)", backdropFilter: "blur(8px)" }}
      >
        {/* macOS close dot */}
        <button
          onClick={onClose}
          className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors shrink-0 flex items-center justify-center group"
          title="Close"
          aria-label="Close panel"
        >
          <X size={7} className="opacity-0 group-hover:opacity-100 text-red-900" />
        </button>
        <Icon size={13} className="text-muted-foreground shrink-0" />
        <span className="text-sm font-medium text-foreground flex-1 truncate">{item.title}</span>
        <span className="text-[10px] text-muted-foreground capitalize">{item.type}</span>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-5 min-h-0">
        {item.type === "spreadsheet" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>{["A", "B", "C", "D"].map((col) => (
                  <th key={col} className="border border-border/40 px-3 py-1.5 text-center font-semibold text-muted-foreground bg-secondary/20">{col}</th>
                ))}</tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, r) => (
                  <tr key={r}>
                    <td className="border border-border/40 px-2 py-1.5 text-center text-muted-foreground bg-secondary/10">{r + 1}</td>
                    {["B", "C", "D"].map((col) => (
                      <td key={col} className="border border-border/40 px-2 py-1.5 text-center text-foreground/60">—</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : item.type === "folder" ? (
          <div className="space-y-1">
            {["README.md", "notes.txt", "data.csv", "budget.xlsx"].map((f) => (
              <div key={f} className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-secondary/40 transition-colors cursor-default">
                <FileText size={13} className="text-muted-foreground" />
                <span className="text-sm text-foreground">{f}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="prose prose-sm max-w-none">
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
              {item.content || `# ${item.title}\n\nStart writing your document here…\n\nThis panel supports side-by-side viewing with another document.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const EmptyDropZone = ({ label, onDrop }: { label: string; onDrop: (item: PanelItem) => void }) => {
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        try {
          const data = JSON.parse(e.dataTransfer.getData("application/flux-item"));
          onDrop(data);
        } catch {}
      }}
      className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl m-3 transition-all duration-200 ${
        over ? "border-primary/60 bg-primary/5 scale-[1.01]" : "border-border/40"
      }`}
    >
      <Layers size={18} className="text-muted-foreground mb-2" />
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
};

const MultitaskingView = () => {
  const [panels, setPanels] = useState<[PanelItem | null, PanelItem | null]>([null, null]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  useEffect(() => {
    const handleDrag = () => setIsDraggingOver(true);
    const handleDragEnd = () => setIsDraggingOver(false);
    window.addEventListener("flux-drag-start", handleDrag);
    window.addEventListener("flux-drag-end", handleDragEnd);
    return () => {
      window.removeEventListener("flux-drag-start", handleDrag);
      window.removeEventListener("flux-drag-end", handleDragEnd);
    };
  }, []);

  const openPanel = useCallback((item: PanelItem, side?: "left" | "right") => {
    setPanels((prev) => {
      const next: [PanelItem | null, PanelItem | null] = [...prev] as any;
      if (side === "left") { next[0] = item; return next; }
      if (side === "right") { next[1] = item; return next; }
      // Auto-assign to first empty slot
      if (!next[0]) { next[0] = item; return next; }
      if (!next[1]) { next[1] = item; return next; }
      next[0] = item; // replace left if both occupied
      return next;
    });
  }, []);

  const closePanel = useCallback((idx: 0 | 1) => {
    setPanels((prev) => {
      const next: [PanelItem | null, PanelItem | null] = [...prev] as any;
      next[idx] = null;
      return next;
    });
  }, []);

  const [left, right] = panels;
  const bothOpen = !!left && !!right;
  const anyOpen = !!left || !!right;

  return (
    <div
      className="flex-1 flex flex-col min-h-screen min-w-0 relative"
      onDragOver={(e) => { e.preventDefault(); }}
      onDrop={(e) => {
        e.preventDefault();
        try {
          const data = JSON.parse(e.dataTransfer.getData("application/flux-item"));
          openPanel(data);
        } catch {}
      }}
    >
      <SEO title="Workspace" description="Split-View multitasking workspace — open documents and folders side-by-side." />
      <div className="px-6 py-4 border-b border-border/30">
        <h2 className="text-base font-semibold text-foreground">Workspace</h2>
        <p className="text-xs text-muted-foreground">Drag files from the sidebar to open them here</p>
      </div>

      {!anyOpen ? (
        /* Empty state */
        <div
          className="flex-1 flex flex-col items-center justify-center gap-4"
          onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingOver(false);
            try {
              const data = JSON.parse(e.dataTransfer.getData("application/flux-item"));
              openPanel(data);
            } catch {}
          }}
        >
          <motion.div
            animate={isDraggingOver ? { scale: 1.04, borderColor: "hsl(var(--primary))" } : {}}
            className="flex flex-col items-center gap-3 p-10 rounded-3xl border-2 border-dashed border-border/40 max-w-xs text-center transition-all"
          >
            <Layers size={32} className="text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">Select or drag a document from the sidebar to open your workspace.</p>
          </motion.div>
          {/* Demo buttons */}
          <div className="flex gap-2 mt-2">
            {[
              { title: "Q3 Financials", type: "spreadsheet" as const },
              { title: "Project Notes", type: "text" as const },
              { title: "Assets Folder", type: "folder" as const },
            ].map((demo) => (
              <button
                key={demo.title}
                onClick={() => openPanel({ id: demo.title, ...demo })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              >
                {(() => { const Icon = FILE_TYPE_ICONS[demo.type]; return <Icon size={12} />; })()}
                {demo.title}
              </button>
            ))}
          </div>
        </div>
      ) : bothOpen ? (
        /* Two panels with resizable handle */
        <PanelGroup direction="horizontal" className="flex-1 min-h-0">
          <Panel defaultSize={50} minSize={25} className="min-h-0 overflow-hidden rounded-tl-2xl">
            <div className="h-full bg-card/40 backdrop-blur-xl border-r border-border/30">
              <GlassWindow item={left!} onClose={() => closePanel(0)} side="left" />
            </div>
          </Panel>
          <PanelResizeHandle className="w-1.5 bg-border/20 hover:bg-primary/40 transition-colors cursor-col-resize flex items-center justify-center group">
            <GripVertical size={14} className="text-muted-foreground/40 group-hover:text-primary transition-colors" />
          </PanelResizeHandle>
          <Panel defaultSize={50} minSize={25} className="min-h-0 overflow-hidden rounded-tr-2xl">
            <div className="h-full bg-card/40 backdrop-blur-xl">
              <GlassWindow item={right!} onClose={() => closePanel(1)} side="right" />
            </div>
          </Panel>
        </PanelGroup>
      ) : (
        /* Single panel + drop zone */
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 bg-card/40 backdrop-blur-xl rounded-2xl m-3 overflow-hidden">
            <GlassWindow item={(left || right)!} onClose={() => closePanel(left ? 0 : 1)} side="left" />
          </div>
          <EmptyDropZone label="Drop here to open on Right" onDrop={(item) => openPanel(item, "right")} />
        </div>
      )}
    </div>
  );
};

export default MultitaskingView;
