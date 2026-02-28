import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Table, Sun, Moon, Clock, Keyboard, Maximize2, Minimize2 } from "lucide-react";
import { DbDocument } from "@/hooks/useDocuments";
import DocumentView from "@/components/documents/DocumentView";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

interface Props {
  document: DbDocument;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<DbDocument>) => void;
  onDelete: (id: string) => void;
}

const COLLAB_USERS = [
  { name: "You", color: "hsl(var(--primary))", active: true },
];

const ShortcutsPanel = ({ lightMode }: { lightMode: boolean }) => {
  const lm = lightMode;
  const shortcuts = [
    { keys: "\u2318 B", action: "Bold" },
    { keys: "\u2318 I", action: "Italic" },
    { keys: "\u2318 U", action: "Underline" },
    { keys: "\u2318 D", action: "Strikethrough" },
    { keys: "\u2318 K", action: "Insert link" },
    { keys: "\u2318 E", action: "Code block" },
    { keys: "\u2318 Z", action: "Undo" },
    { keys: "\u2318 \u21E7 Z", action: "Redo" },
    { keys: "\u2318 \u2325 1-3", action: "Heading 1-3" },
    { keys: "\u2318 \u21E7 7", action: "Ordered list" },
    { keys: "\u2318 \u21E7 8", action: "Bullet list" },
    { keys: "\u2318 \u21E7 9", action: "Blockquote" },
    { keys: "Tab", action: "Navigate cells (sheets)" },
  ];
  return (
    <div className={`grid grid-cols-2 gap-x-4 gap-y-1 p-3 text-[11px] ${lm ? "text-gray-600" : "text-muted-foreground"}`}>
      {shortcuts.map((s) => (
        <div key={s.keys} className="flex items-center justify-between gap-2">
          <kbd className={`px-1.5 py-0.5 rounded font-mono text-[10px] shrink-0 ${lm ? "bg-gray-100 text-gray-500" : "bg-secondary/40 text-muted-foreground/70"}`}>{s.keys}</kbd>
          <span className="truncate">{s.action}</span>
        </div>
      ))}
    </div>
  );
};

const DesktopDocumentViewer = ({ document: doc, onClose, onUpdate, onDelete }: Props) => {
  const [lightMode, setLightMode] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date>(new Date());

  const wrappedOnUpdate = (id: string, updates: Partial<DbDocument>) => {
    onUpdate(id, updates);
    setLastSaved(new Date());
  };

  const [savedAgo, setSavedAgo] = useState("just now");
  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.round((Date.now() - lastSaved.getTime()) / 1000);
      if (diff < 5) setSavedAgo("just now");
      else if (diff < 60) setSavedAgo(`${diff}s ago`);
      else setSavedAgo(`${Math.round(diff / 60)}m ago`);
    }, 1000);
    return () => clearInterval(interval);
  }, [lastSaved]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="doc-viewer-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] bg-black/60"
        onClick={onClose}
      />
      <motion.div
        key="doc-viewer"
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-[102] flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className={`relative flex flex-col backdrop-blur-2xl border rounded-2xl shadow-2xl pointer-events-auto overflow-hidden transition-all duration-300 ${
            expanded ? "w-full h-full max-w-none max-h-none rounded-none" : "w-full max-w-4xl max-h-[85vh]"
          } ${
            lightMode
              ? "bg-white/95 border-gray-200/60 text-gray-900"
              : "bg-card/80 border-border/50"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`flex items-center gap-3 px-5 pt-4 pb-2 border-b ${lightMode ? "border-gray-200/60" : "border-border/30"}`}>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {doc.type === "spreadsheet" ? (
                <Table size={18} className="text-emerald-500 shrink-0" />
              ) : (
                <FileText size={18} className="text-blue-400 shrink-0" />
              )}
              <span className={`text-lg font-semibold truncate ${lightMode ? "text-gray-900" : "text-foreground"}`}>
                {doc.title}
              </span>
            </div>

            <TooltipProvider delayDuration={200}>
              <div className="flex items-center gap-2">
                <div className="flex items-center -space-x-1.5">
                  {COLLAB_USERS.map((u, i) => (
                    <Tooltip key={i}>
                      <TooltipTrigger asChild>
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-card/80"
                          style={{ backgroundColor: u.color }}
                        >
                          {u.name[0]}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        {u.name} {u.active && <span className="text-emerald-400">● editing</span>}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full ${lightMode ? "bg-gray-100 text-gray-500" : "bg-secondary/30 text-muted-foreground/60"}`}>
                      <Clock size={10} />
                      <span>Saved {savedAgo}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Auto-saved on every edit</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setShowShortcuts(!showShortcuts)}
                      className={`p-2 rounded-lg transition-colors ${showShortcuts ? "bg-primary/10 text-primary" : lightMode ? "hover:bg-gray-100 text-gray-500" : "hover:bg-secondary/60 text-muted-foreground"}`}
                    >
                      <Keyboard size={16} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Keyboard shortcuts</TooltipContent>
                </Tooltip>

                <button
                  onClick={() => setLightMode(!lightMode)}
                  className={`p-2 rounded-lg transition-colors ${lightMode ? "hover:bg-gray-100 text-gray-500" : "hover:bg-secondary/60 text-muted-foreground"}`}
                >
                  {lightMode ? <Moon size={16} /> : <Sun size={16} />}
                </button>

                <button
                  onClick={() => setExpanded(!expanded)}
                  className={`p-2 rounded-lg transition-colors ${lightMode ? "hover:bg-gray-100 text-gray-500" : "hover:bg-secondary/60 text-muted-foreground"}`}
                >
                  {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>

                <button onClick={onClose} className="group flex items-center justify-center"
                  style={{ width: 13, height: 13, borderRadius: "50%", background: "#ff5f57", border: "0.5px solid rgba(0,0,0,0.12)", boxShadow: "0 0.5px 1px rgba(0,0,0,0.15)" }}>
                  <X size={7} strokeWidth={3} className="opacity-0 group-hover:opacity-100 transition-opacity duration-100" style={{ color: "rgba(80,0,0,0.7)" }} />
                </button>
              </div>
            </TooltipProvider>
          </div>

          <AnimatePresence>
            {showShortcuts && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`overflow-hidden border-b ${lightMode ? "border-gray-200/60 bg-gray-50/80" : "border-border/30 bg-secondary/10"}`}
              >
                <ShortcutsPanel lightMode={lightMode} />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 overflow-y-auto px-5 pb-5 min-h-0">
            <div className="h-full min-h-[400px]">
              <DocumentView
                document={doc}
                onBack={onClose}
                onUpdate={wrappedOnUpdate}
                onDelete={onDelete}
                lightMode={lightMode}
                onToggleLightMode={() => setLightMode(!lightMode)}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default DesktopDocumentViewer;
