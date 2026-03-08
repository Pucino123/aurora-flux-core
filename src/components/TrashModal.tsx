import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, RotateCcw, AlertTriangle, FileText, CheckSquare, Users } from "lucide-react";
import { useTrash, TrashItem } from "@/context/TrashContext";
import { useFlux } from "@/context/FluxContext";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

interface TrashModalProps {
  open: boolean;
  onClose: () => void;
}

const TYPE_ICONS = {
  task: <CheckSquare size={14} className="text-emerald-400" />,
  contact: <Users size={14} className="text-blue-400" />,
  document: <FileText size={14} className="text-amber-400" />,
};

const TYPE_LABELS = {
  task: "Task",
  contact: "Contact",
  document: "Document",
};

function TrashRow({ item, onRestore, onDelete }: { item: TrashItem; onRestore: () => void; onDelete: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.18 }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl group transition-colors hover:bg-foreground/5"
      style={{ border: "1px solid hsl(var(--border) / 0.15)" }}
    >
      <div className="shrink-0">{TYPE_ICONS[item.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate font-medium">{item.title}</p>
        <p className="text-[11px] text-muted-foreground">
          {TYPE_LABELS[item.type]} · Deleted {format(parseISO(item.deletedAt), "MMM d, h:mm a")}
        </p>
      </div>
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={onRestore}
          title="Restore"
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
        >
          <RotateCcw size={11} />
          Restore
        </button>
        <button
          onClick={onDelete}
          title="Delete permanently"
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
        >
          <X size={11} />
          Delete
        </button>
      </div>
    </motion.div>
  );
}

const TrashModal = ({ open, onClose }: TrashModalProps) => {
  const { trash, restoreItem, permanentlyDelete, emptyTrash } = useTrash();
  const { createTask } = useFlux();

  const handleRestore = async (item: TrashItem) => {
    const restored = restoreItem(item.id);
    if (!restored) return;
    if (restored.type === "task") {
      await createTask(restored.originalData);
      toast.success(`"${restored.title}" restored to Tasks`);
    } else {
      toast.success(`"${restored.title}" restored`);
    }
  };

  const handleDelete = (item: TrashItem) => {
    permanentlyDelete(item.id);
    toast.info(`"${item.title}" permanently deleted`);
  };

  const handleEmptyTrash = () => {
    emptyTrash();
    toast.info("Trash emptied");
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10005]"
            style={{ background: "hsl(var(--background) / 0.6)", backdropFilter: "blur(6px)" }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ type: "spring", stiffness: 500, damping: 38 }}
            className="fixed inset-0 z-[10006] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
              style={{
                background: "hsl(var(--card) / 0.95)",
                backdropFilter: "blur(28px)",
                WebkitBackdropFilter: "blur(28px)",
                border: "1px solid hsl(var(--border) / 0.4)",
                boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
                maxHeight: "70vh",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/20 shrink-0">
                <div className="flex items-center gap-2.5">
                  <Trash2 size={16} className="text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">Recently Deleted</span>
                  {trash.length > 0 && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-foreground/10 text-muted-foreground">
                      {trash.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {trash.length > 0 && (
                    <button
                      onClick={handleEmptyTrash}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-rose-400 hover:text-rose-300 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 transition-colors border border-rose-500/20"
                    >
                      <Trash2 size={11} />
                      Empty Trash
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="w-6 h-6 rounded-full flex items-center justify-center bg-foreground/8 hover:bg-foreground/15 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto py-2 px-2">
                {trash.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Trash2 size={32} className="text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground/50">Nothing in trash</p>
                    <p className="text-xs text-muted-foreground/30">Deleted items will appear here for recovery</p>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    <div className="space-y-1">
                      {trash.map(item => (
                        <TrashRow
                          key={item.id}
                          item={item}
                          onRestore={() => handleRestore(item)}
                          onDelete={() => handleDelete(item)}
                        />
                      ))}
                    </div>
                  </AnimatePresence>
                )}
              </div>

              {/* Footer */}
              {trash.length > 0 && (
                <div className="px-5 py-3 border-t border-border/20 shrink-0">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
                    <AlertTriangle size={11} />
                    Items permanently deleted after 30 days
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default TrashModal;
