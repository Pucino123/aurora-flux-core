import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, ListTodo, FileText, Settings, X } from "lucide-react";
import { t } from "@/lib/i18n";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const commands = [
  { icon: Plus, label: t("cmd.create_task"), shortcut: "N" },
  { icon: ListTodo, label: t("cmd.view_tasks"), shortcut: "T" },
  { icon: FileText, label: t("cmd.new_note"), shortcut: "⇧N" },
  { icon: Search, label: t("cmd.search"), shortcut: "/" },
  { icon: Settings, label: t("cmd.settings"), shortcut: "," },
];

const CommandPalette = ({ open, onClose }: CommandPaletteProps) => {
  const [query, setQuery] = useState("");

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, handleKeyDown]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50"
          >
            <div className="bg-white/80 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/50 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
                <Search size={18} className="text-muted-foreground shrink-0" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("cmd.search_placeholder")}
                  className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/60"
                />
                <button onClick={onClose} className="p-1 rounded hover:bg-secondary transition-colors">
                  <X size={14} className="text-muted-foreground" />
                </button>
              </div>
              <div className="py-2 max-h-64 overflow-y-auto">
                {filtered.map((cmd) => (
                  <button
                    key={cmd.label}
                    className="w-full flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-secondary/60 transition-colors"
                    onClick={onClose}
                  >
                    <cmd.icon size={16} className="text-muted-foreground" />
                    <span className="flex-1 text-left text-foreground">{cmd.label}</span>
                    <kbd className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded font-mono">
                      ⌘{cmd.shortcut}
                    </kbd>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">{t("cmd.no_results")}</p>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
