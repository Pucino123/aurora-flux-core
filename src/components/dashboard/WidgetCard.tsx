import { useState, useRef, useEffect } from "react";
import { GripVertical, X, Pencil } from "lucide-react";

interface WidgetCardProps {
  widgetId: string;
  label: string;
  editMode: boolean;
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => void;
  children: React.ReactNode;
}

const WidgetCard = ({ widgetId, label, editMode, onRemove, onRename, children }: WidgetCardProps) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(label);
  }, [label]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commitRename = () => {
    const trimmed = editValue.trim();
    if (trimmed) {
      onRename(widgetId, trimmed);
    } else {
      setEditValue(label);
    }
    setEditing(false);
  };

  return (
    <div
      className={`relative overflow-hidden h-full rounded-2xl border transition-all duration-300 ${
        editMode
          ? "ring-1 ring-primary/20 border-primary/10"
          : "border-border/40"
      }`}
      style={{
        background: "hsl(var(--glass-bg))",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: "0 4px 24px -4px hsl(var(--background) / 0.3), inset 0 1px 0 hsl(0 0% 100% / 0.04)",
      }}
    >
      {/* Edit mode toolbar */}
      {editMode && (
        <div className="flex items-center justify-between px-3 pt-2 pb-1.5 border-b border-border/20 mb-1">
          {editing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") { setEditValue(label); setEditing(false); }
              }}
              className="flex-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-secondary border border-border outline-none focus:ring-1 focus:ring-primary/60 mr-1"
            />
          ) : (
            <div
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 cursor-text group/title flex-1 min-w-0"
            >
              <span className="text-xs font-semibold truncate text-foreground/80">{label}</span>
              <Pencil size={10} className="text-muted-foreground/40 group-hover/title:text-primary shrink-0 transition-colors" />
            </div>
          )}

          <div className="flex items-center gap-1 shrink-0 ml-1">
            <div className="widget-drag-handle p-1.5 cursor-grab text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary/50 transition-colors">
              <GripVertical size={12} />
            </div>
            <button
              onClick={() => onRemove(widgetId)}
              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      <div className="p-[var(--space-card)] pt-2">
        {children}
      </div>
    </div>
  );
};

export default WidgetCard;
