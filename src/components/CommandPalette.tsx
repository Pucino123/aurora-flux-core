import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, CheckSquare, User, CalendarDays, FileText, ArrowRight } from "lucide-react";
import { useFlux } from "@/context/FluxContext";
import { useCRM } from "@/context/CRMContext";
import { format } from "date-fns";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate?: (view: string) => void;
}

type ResultType = "task" | "contact" | "event" | "document";

interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  subtitle?: string;
  action?: () => void;
}

const TYPE_ICONS: Record<ResultType, React.ReactNode> = {
  task: <CheckSquare size={15} className="text-emerald-400 shrink-0" />,
  contact: <User size={15} className="text-blue-400 shrink-0" />,
  event: <CalendarDays size={15} className="text-violet-400 shrink-0" />,
  document: <FileText size={15} className="text-amber-400 shrink-0" />,
};

const TYPE_LABELS: Record<ResultType, string> = {
  task: "Tasks",
  contact: "Contacts",
  event: "Schedule",
  document: "Documents",
};

const CommandPalette = ({ open, onClose, onNavigate }: CommandPaletteProps) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { tasks, scheduleBlocks, setActiveView } = useFlux();
  const { deals } = useCRM();

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  const results: SearchResult[] = useCallback(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const out: SearchResult[] = [];

    // Tasks
    tasks.filter(t => t.title.toLowerCase().includes(q) || (t.content || "").toLowerCase().includes(q)).slice(0, 4).forEach(t => {
      out.push({
        id: `task-${t.id}`, type: "task", title: t.title,
        subtitle: `${t.status} · ${t.priority} priority${t.due_date ? ` · due ${format(new Date(t.due_date), "MMM d")}` : ""}`,
        action: () => { setActiveView("tasks"); onClose(); },
      });
    });

    // CRM contacts
    deals.filter(d => d.name.toLowerCase().includes(q) || d.company.toLowerCase().includes(q)).slice(0, 3).forEach(d => {
      out.push({
        id: `contact-${d.id}`, type: "contact", title: d.name,
        subtitle: `${d.company} · ${d.stage}`,
        action: () => { (setActiveView as any)("crm"); onClose(); },
      });
    });

    // Schedule blocks
    scheduleBlocks.filter(b => b.title.toLowerCase().includes(q)).slice(0, 3).forEach(b => {
      out.push({
        id: `event-${b.id}`, type: "event", title: b.title,
        subtitle: `${b.scheduled_date} at ${b.time}`,
        action: () => { setActiveView("calendar"); onClose(); },
      });
    });

    return out;
  }, [query, tasks, deals, scheduleBlocks, setActiveView, onClose])();

  // Group by type
  const grouped = results.reduce<Record<ResultType, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {} as any);

  const flat = results; // flat for keyboard nav

  useEffect(() => { setSelectedIndex(0); }, [query]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, flat.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    }
    if (e.key === "Enter" && flat[selectedIndex]) {
      flat[selectedIndex].action?.();
    }
  }, [flat, selectedIndex, onClose]);

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10001]"
            style={{ background: "hsl(var(--background) / 0.6)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -16 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed top-[12vh] left-1/2 -translate-x-1/2 w-full max-w-2xl z-[10001] px-4"
          >
            <div
              className="rounded-2xl overflow-hidden shadow-2xl"
              style={{
                background: "hsl(var(--card) / 0.95)",
                border: "1px solid hsl(var(--border))",
                backdropFilter: "blur(24px)",
                boxShadow: "0 0 60px hsl(var(--primary) / 0.1), 0 25px 50px hsl(0 0% 0% / 0.4)",
              }}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border/30">
                <Search size={20} className="text-muted-foreground shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search tasks, contacts, events…"
                  className="flex-1 text-lg bg-transparent outline-none placeholder:text-muted-foreground/40 text-foreground"
                />
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                  <X size={14} className="text-muted-foreground" />
                </button>
              </div>

              {/* Results */}
              <div className="py-2 max-h-96 overflow-y-auto">
                {query.trim() === "" && (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <Search size={28} className="text-muted-foreground/25" />
                    <p className="text-sm text-muted-foreground/50">Start typing to search everything…</p>
                    <div className="flex items-center gap-3 mt-3">
                      {(["task", "contact", "event"] as ResultType[]).map(t => (
                        <div key={t} className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40">
                          {TYPE_ICONS[t]}
                          <span>{TYPE_LABELS[t]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {query.trim() !== "" && flat.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No results for "{query}"</p>
                )}

                {Object.entries(grouped).map(([type, items]) => (
                  <div key={type} className="mb-1">
                    <div className="flex items-center gap-2 px-5 py-1.5">
                      {TYPE_ICONS[type as ResultType]}
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                        {TYPE_LABELS[type as ResultType]}
                      </span>
                    </div>
                    {items.map((result) => {
                      const globalIdx = flat.findIndex(r => r.id === result.id);
                      const isSelected = globalIdx === selectedIndex;
                      return (
                        <button
                          key={result.id}
                          onClick={result.action}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                          className={`w-full flex items-center gap-3 px-5 py-2.5 mx-0 text-left transition-colors ${isSelected ? "bg-white/8 text-foreground" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}
                        >
                          {TYPE_ICONS[result.type]}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{result.title}</p>
                            {result.subtitle && <p className="text-[11px] text-muted-foreground/60 truncate">{result.subtitle}</p>}
                          </div>
                          {isSelected && <ArrowRight size={13} className="text-muted-foreground/50 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Footer hint */}
              <div className="px-5 py-2.5 border-t border-border/20 flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40">
                  <kbd className="px-1 py-0.5 rounded bg-secondary text-[9px]">↑↓</kbd> Navigate
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40">
                  <kbd className="px-1 py-0.5 rounded bg-secondary text-[9px]">↵</kbd> Open
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40">
                  <kbd className="px-1 py-0.5 rounded bg-secondary text-[9px]">Esc</kbd> Close
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default CommandPalette;
