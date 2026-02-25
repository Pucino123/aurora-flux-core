import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard } from "lucide-react";
import { isDanish } from "@/lib/i18n";

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; description: string }[];
}

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? "⌘" : "Ctrl";

const groups: ShortcutGroup[] = [
  {
    title: isDanish ? "Navigation" : "Navigation",
    shortcuts: [
      { keys: [mod, "K"], description: isDanish ? "Åbn kommandopaletten" : "Open command palette" },
      { keys: [mod, "?"], description: isDanish ? "Vis genveje" : "Show shortcuts" },
      { keys: [mod, "/"], description: isDanish ? "Global søgning" : "Global search" },
    ],
  },
  {
    title: isDanish ? "Opgaver" : "Tasks",
    shortcuts: [
      { keys: [mod, "N"], description: isDanish ? "Ny opgave" : "New task" },
      { keys: [mod, "⇧", "N"], description: isDanish ? "Ny note" : "New note" },
      { keys: [mod, "T"], description: isDanish ? "Vis alle opgaver" : "View all tasks" },
    ],
  },
  {
    title: isDanish ? "Visning" : "Views",
    shortcuts: [
      { keys: [mod, ","], description: isDanish ? "Indstillinger" : "Settings" },
      { keys: ["Esc"], description: isDanish ? "Luk modal / gå tilbage" : "Close modal / go back" },
    ],
  },
];

interface KeyboardShortcutsSheetProps {
  open: boolean;
  onClose: () => void;
}

const KeyboardShortcutsSheet = ({ open, onClose }: KeyboardShortcutsSheetProps) => {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-md z-50"
          >
            <div className="bg-card/80 backdrop-blur-2xl rounded-2xl shadow-2xl shadow-black/30 border border-border/30 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Keyboard size={14} className="text-primary" />
                  </div>
                  <h2 className="text-sm font-semibold text-foreground">
                    {isDanish ? "Tastaturgenveje" : "Keyboard Shortcuts"}
                  </h2>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors">
                  <X size={14} className="text-muted-foreground" />
                </button>
              </div>
              <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
                {groups.map((group) => (
                  <div key={group.title}>
                    <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-2.5">
                      {group.title}
                    </p>
                    <div className="space-y-1">
                      {group.shortcuts.map((s) => (
                        <div key={s.description} className="flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-secondary/30 transition-colors">
                          <span className="text-[13px] text-foreground/70">{s.description}</span>
                          <div className="flex items-center gap-1">
                            {s.keys.map((k, i) => (
                              <kbd
                                key={i}
                                className="min-w-[26px] h-[26px] flex items-center justify-center text-[11px] font-mono text-foreground/50 bg-secondary/60 border border-border/30 rounded-lg px-1.5 shadow-sm"
                              >
                                {k}
                              </kbd>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default KeyboardShortcutsSheet;
