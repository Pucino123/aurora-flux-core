import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, Folder, ListTodo, LayoutGrid, FileText,
  Grid, ArrowRight, Command, Hash
} from "lucide-react";
import { useFlux, FolderNode, DbTask } from "@/context/FluxContext";
import { useDocuments } from "@/hooks/useDocuments";

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

type ResultItem = {
  type: "folder" | "task" | "widget" | "document" | "community";
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
};

const WIDGET_LIST = [
  { id: "clock", label: "Clock" },
  { id: "timer", label: "Focus Timer" },
  { id: "music", label: "Music Player" },
  { id: "planner", label: "Daily Planner" },
  { id: "notes", label: "Notes" },
  { id: "stats", label: "Focus Stats" },
  { id: "scratchpad", label: "Scratchpad" },
  { id: "quote", label: "Quote of the Day" },
  { id: "breathing", label: "Breathing Exercise" },
  { id: "council", label: "Council" },
  { id: "routine", label: "Routine Builder" },
  { id: "budget-preview", label: "Budget Preview" },
  { id: "savings-ring", label: "Savings Ring" },
  { id: "weekly-workout", label: "Weekly Workout" },
  { id: "project-status", label: "Project Status" },
  { id: "top-tasks", label: "Top Tasks" },
  { id: "smart-plan", label: "Smart Plan" },
  { id: "gamification", label: "Streaks & Gamification" },
  { id: "chat", label: "Team Chat" },
];

const DEMO_COMMUNITY = [
  { id: "slot-2", title: "NovaPulse", url: "https://example.com" },
  { id: "slot-7", title: "Zephyr UI", url: "https://example.com" },
];

// Simple fuzzy scorer: returns 0-1 (higher = better match)
function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t === q) return 1;
  if (t.startsWith(q)) return 0.9;
  if (t.includes(q)) return 0.7;
  // char-by-char fuzzy
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length ? 0.4 : 0;
}

const CATEGORIES = ["All", "Tasks", "Folders", "Docs", "Widgets", "Community"] as const;
type Category = (typeof CATEGORIES)[number];

const GlobalSearch = ({ open, onClose }: GlobalSearchProps) => {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { folderTree, tasks, setActiveFolder, setActiveView } = useFlux();
  const { documents } = useDocuments();

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setActiveCategory("All");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const flatFolders = useMemo(() => {
    const result: FolderNode[] = [];
    const walk = (nodes: FolderNode[]) => {
      for (const n of nodes) { result.push(n); walk(n.children); }
    };
    walk(folderTree);
    return result;
  }, [folderTree]);

  const results = useMemo<ResultItem[]>(() => {
    const q = query.trim();
    const items: ResultItem[] = [];

    // Folders
    for (const f of flatFolders) {
      const score = fuzzyScore(q || "", f.title);
      if (!q || score > 0)
        items.push({ type: "folder", id: f.id, title: f.title, subtitle: "Folder", meta: String(score) });
    }
    // Tasks
    for (const tk of tasks) {
      const score = Math.max(fuzzyScore(q || "", tk.title), fuzzyScore(q || "", tk.content || ""));
      if (!q || score > 0)
        items.push({ type: "task", id: tk.id, title: tk.title, subtitle: tk.status, meta: String(score) });
    }
    // Documents
    for (const doc of documents) {
      const score = fuzzyScore(q || "", doc.title);
      if (!q || score > 0)
        items.push({ type: "document", id: doc.id, title: doc.title, subtitle: doc.type === "spreadsheet" ? "Spreadsheet" : "Document", meta: String(score) });
    }
    // Widgets
    for (const w of WIDGET_LIST) {
      const score = fuzzyScore(q || "", w.label);
      if (!q || score > 0)
        items.push({ type: "widget", id: w.id, title: w.label, subtitle: "Widget", meta: String(score) });
    }
    // Community
    for (const c of DEMO_COMMUNITY) {
      const score = fuzzyScore(q || "", c.title);
      if (!q || score > 0)
        items.push({ type: "community", id: c.id, title: c.title, subtitle: "Community Board", meta: String(score) });
    }

    // Sort by score descending when searching
    if (q) items.sort((a, b) => Number(b.meta) - Number(a.meta));

    // Category filter
    const filtered = items.filter(item => {
      if (activeCategory === "All") return true;
      if (activeCategory === "Tasks") return item.type === "task";
      if (activeCategory === "Folders") return item.type === "folder";
      if (activeCategory === "Docs") return item.type === "document";
      if (activeCategory === "Widgets") return item.type === "widget";
      if (activeCategory === "Community") return item.type === "community";
      return true;
    });

    return filtered.slice(0, 12);
  }, [query, flatFolders, tasks, documents, activeCategory]);

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && results[selectedIdx]) { e.preventDefault(); handleSelect(results[selectedIdx]); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, results, selectedIdx]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[selectedIdx] as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  useEffect(() => { setSelectedIdx(0); }, [results]);

  const handleSelect = useCallback((item: ResultItem) => {
    if (item.type === "folder") {
      setActiveFolder(item.id);
      setActiveView("canvas");
    } else if (item.type === "task") {
      const task = tasks.find(t => t.id === item.id);
      if (task?.folder_id) { setActiveFolder(task.folder_id); setActiveView("canvas"); }
      else { setActiveFolder(null); setActiveView("tasks" as any); }
    } else if (item.type === "document") {
      const doc = documents.find(d => d.id === item.id);
      if (doc?.folder_id) { setActiveFolder(doc.folder_id); setActiveView("canvas"); }
    } else if (item.type === "community") {
      setActiveView("community" as any);
    }
    onClose();
  }, [setActiveFolder, setActiveView, tasks, documents, onClose]);

  const iconFor = (type: string) => {
    if (type === "folder") return <Folder size={14} className="text-primary/70" />;
    if (type === "task") return <ListTodo size={14} className="text-primary/70" />;
    if (type === "document") return <FileText size={14} className="text-primary/70" />;
    if (type === "community") return <Grid size={14} className="text-primary/70" />;
    return <LayoutGrid size={14} className="text-muted-foreground" />;
  };

  const badgeColor: Record<string, string> = {
    folder: "bg-primary/10 text-primary",
    task: "bg-amber-500/10 text-amber-500",
    document: "bg-blue-500/10 text-blue-500",
    widget: "bg-muted text-muted-foreground",
    community: "bg-green-500/10 text-green-500",
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9990]"
            onClick={onClose}
          />

          {/* Palette panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -16 }}
            transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed top-[16%] left-1/2 -translate-x-1/2 w-full max-w-xl z-[9991]"
          >
            <div
              className="rounded-2xl overflow-hidden shadow-2xl border border-border/40"
              style={{ background: "hsl(var(--card)/0.92)", backdropFilter: "blur(32px)", WebkitBackdropFilter: "blur(32px)" }}
            >
              {/* Search bar */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/30">
                <Search size={16} className="text-muted-foreground shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search tasks, folders, documents, widgets…"
                  className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50"
                />
                <div className="flex items-center gap-1.5">
                  <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded font-mono">
                    <Command size={9} /> K
                  </kbd>
                  <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary transition-colors">
                    <X size={13} className="text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Category tabs */}
              <div className="flex items-center gap-1 px-3 py-2 border-b border-border/20 overflow-x-auto">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      activeCategory === cat
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Results */}
              <div ref={listRef} className="py-1.5 max-h-80 overflow-y-auto">
                {results.length > 0 ? (
                  results.map((item, idx) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => handleSelect(item)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                        idx === selectedIdx ? "bg-primary/8" : "hover:bg-secondary/40"
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${badgeColor[item.type]}`}>
                        {iconFor(item.type)}
                      </span>
                      <span className="flex-1 text-left text-foreground truncate">{item.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide shrink-0 ${badgeColor[item.type]}`}>
                        {item.subtitle}
                      </span>
                      {idx === selectedIdx && <ArrowRight size={12} className="text-muted-foreground shrink-0" />}
                    </button>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <Hash size={24} className="text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      {query.trim() ? "No results found" : "Start typing to search…"}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer hints */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-border/20">
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50">
                  <span><kbd className="bg-muted px-1 rounded font-mono">↑↓</kbd> navigate</span>
                  <span><kbd className="bg-muted px-1 rounded font-mono">↵</kbd> open</span>
                  <span><kbd className="bg-muted px-1 rounded font-mono">Esc</kbd> close</span>
                </div>
                <span className="text-[10px] text-muted-foreground/40">{results.length} results</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default GlobalSearch;
