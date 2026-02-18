import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Folder, ListTodo, LayoutGrid } from "lucide-react";
import { useFlux, FolderNode, DbTask } from "@/context/FluxContext";
import { isDanish } from "@/lib/i18n";

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

type ResultItem = {
  type: "folder" | "task" | "widget";
  id: string;
  title: string;
  subtitle?: string;
};

const WIDGET_LIST = [
  "clock", "timer", "music", "planner", "notes", "stats",
  "scratchpad", "quote", "breathing", "council", "routine",
  "budget-preview", "savings-ring", "weekly-workout",
  "project-status", "top-tasks", "smart-plan", "gamification", "chat",
];

const GlobalSearch = ({ open, onClose }: GlobalSearchProps) => {
  const [query, setQuery] = useState("");
  const { folderTree, tasks, setActiveFolder, setActiveView } = useFlux();

  useEffect(() => {
    if (open) setQuery("");
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
      for (const n of nodes) {
        result.push(n);
        walk(n.children);
      }
    };
    walk(folderTree);
    return result;
  }, [folderTree]);

  const results = useMemo<ResultItem[]>(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const items: ResultItem[] = [];

    for (const f of flatFolders) {
      if (f.title.toLowerCase().includes(q)) {
        items.push({ type: "folder", id: f.id, title: f.title, subtitle: isDanish ? "Mappe" : "Folder" });
      }
    }
    for (const t of tasks) {
      if (t.title.toLowerCase().includes(q) || t.content?.toLowerCase().includes(q)) {
        items.push({ type: "task", id: t.id, title: t.title, subtitle: t.status });
      }
    }
    for (const w of WIDGET_LIST) {
      if (w.toLowerCase().includes(q)) {
        items.push({ type: "widget", id: w, title: w.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), subtitle: "Widget" });
      }
    }
    return items.slice(0, 20);
  }, [query, flatFolders, tasks]);

  const handleSelect = useCallback((item: ResultItem) => {
    if (item.type === "folder") {
      setActiveFolder(item.id);
      setActiveView("canvas");
    } else if (item.type === "task") {
      const task = tasks.find((t) => t.id === item.id);
      if (task?.folder_id) {
        setActiveFolder(task.folder_id);
        setActiveView("canvas");
      }
    }
    onClose();
  }, [setActiveFolder, setActiveView, tasks, onClose]);

  const iconFor = (type: string) => {
    if (type === "folder") return <Folder size={14} className="text-muted-foreground" />;
    if (type === "task") return <ListTodo size={14} className="text-muted-foreground" />;
    return <LayoutGrid size={14} className="text-muted-foreground" />;
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-[18%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50"
          >
            <div className="bg-card/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-border/50 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40">
                <Search size={16} className="text-muted-foreground shrink-0" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={isDanish ? "Søg mapper, opgaver, widgets…" : "Search folders, tasks, widgets…"}
                  className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground/60"
                />
                <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary transition-colors">
                  <X size={14} className="text-muted-foreground" />
                </button>
              </div>
              <div className="py-2 max-h-72 overflow-y-auto">
                {results.length > 0 ? (
                  results.map((item) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => handleSelect(item)}
                      className="w-full flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-secondary/60 transition-colors"
                    >
                      {iconFor(item.type)}
                      <span className="flex-1 text-left text-foreground truncate">{item.title}</span>
                      <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{item.subtitle}</span>
                    </button>
                  ))
                ) : query.trim() ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    {isDanish ? "Ingen resultater fundet" : "No results found"}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground/50 text-center py-6">
                    {isDanish ? "Begynd at skrive for at søge…" : "Start typing to search…"}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default GlobalSearch;
