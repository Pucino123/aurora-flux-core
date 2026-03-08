/**
 * AuraActionCard — premium glassmorphism card rendered inside the Aura chat stream
 * when the agent performs a CRUD action.
 */
import { motion } from "framer-motion";
import { CheckCircle2, Undo2, Edit3, Calendar, Mail, User, AlertCircle, TrendingUp, ArrowRight } from "lucide-react";
import { useFlux } from "@/context/FluxContext";

export type CardVariant =
  | "task_created"
  | "task_completed"
  | "task_list"
  | "event_created"
  | "email_draft"
  | "invoice_list"
  | "contact_financials"
  | "invoice_reminder"
  | "error";

interface AuraActionCardProps {
  variant: CardVariant;
  title: string;
  body?: string;
  items?: Array<{ label: string; value?: string; status?: string }>;
  taskId?: string;
  onUndo?: () => void;
  onEdit?: () => void;
  onConfirm?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  navigateTo?: string;
}

const VARIANT_META: Record<CardVariant, { icon: React.FC<any>; glow: string; border: string; badge: string }> = {
  task_created:        { icon: CheckCircle2, glow: "shadow-emerald-500/10",  border: "border-emerald-500/20", badge: "bg-emerald-500/10 text-emerald-400" },
  task_completed:      { icon: CheckCircle2, glow: "shadow-emerald-500/10",  border: "border-emerald-500/20", badge: "bg-emerald-500/10 text-emerald-400" },
  task_list:           { icon: CheckCircle2, glow: "shadow-primary/10",      border: "border-primary/20",     badge: "bg-primary/10 text-primary" },
  event_created:       { icon: Calendar,     glow: "shadow-violet-500/10",   border: "border-violet-500/20",  badge: "bg-violet-500/10 text-violet-400" },
  email_draft:         { icon: Mail,         glow: "shadow-cyan-500/10",     border: "border-cyan-500/20",    badge: "bg-cyan-500/10 text-cyan-400" },
  invoice_list:        { icon: TrendingUp,   glow: "shadow-amber-500/10",    border: "border-amber-500/20",   badge: "bg-amber-500/10 text-amber-400" },
  contact_financials:  { icon: User,         glow: "shadow-blue-500/10",     border: "border-blue-500/20",    badge: "bg-blue-500/10 text-blue-400" },
  invoice_reminder:    { icon: Mail,         glow: "shadow-rose-500/10",     border: "border-rose-500/20",    badge: "bg-rose-500/10 text-rose-400" },
  error:               { icon: AlertCircle,  glow: "shadow-red-500/10",      border: "border-red-500/20",     badge: "bg-red-500/10 text-red-400" },
};

const AuraActionCard = ({
  variant, title, body, items, onUndo, onEdit, onConfirm, onAction, actionLabel, navigateTo
}: AuraActionCardProps) => {
  const { setActiveView } = useFlux();
  const meta = VARIANT_META[variant];
  const Icon = meta.icon;

  const handleNavigate = () => {
    if (navigateTo) setActiveView(navigateTo as any);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`rounded-xl border ${meta.border} ${meta.glow} shadow-lg overflow-hidden`}
      style={{
        background: "hsl(var(--card)/0.6)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border/10">
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${meta.badge}`}>
          <Icon size={13} />
        </div>
        <p className="text-xs font-semibold text-foreground flex-1 leading-tight">{title}</p>
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${meta.badge}`}>
          Aura
        </span>
      </div>

      {/* Body */}
      {body && (
        <p className="px-3.5 py-2 text-xs text-muted-foreground leading-relaxed">{body}</p>
      )}

      {/* Items list */}
      {items && items.length > 0 && (
        <div className="px-3.5 pb-2 space-y-1.5 mt-1">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <span className="text-xs text-foreground/80 truncate flex-1">{item.label}</span>
              {item.value && <span className="text-xs font-medium text-foreground shrink-0">{item.value}</span>}
              {item.status && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                  item.status === "Paid" ? "bg-emerald-500/10 text-emerald-400" :
                  item.status === "Pending" ? "bg-amber-500/10 text-amber-400" :
                  "bg-muted text-muted-foreground"
                }`}>{item.status}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 px-3.5 py-2 border-t border-border/10">
        {onUndo && (
          <button
            onClick={onUndo}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
          >
            <Undo2 size={11} /> Undo
          </button>
        )}
        {onEdit && (
          <button
            onClick={onEdit}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
          >
            <Edit3 size={11} /> Edit
          </button>
        )}
        {onConfirm && (
          <button
            onClick={onConfirm}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-primary-foreground transition-all ${meta.badge}`}
            style={{ background: "hsl(var(--primary))" }}
          >
            <CheckCircle2 size={11} /> Confirm
          </button>
        )}
        {onAction && actionLabel && (
          <button
            onClick={onAction}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${meta.badge}`}
          >
            {actionLabel} <ArrowRight size={10} />
          </button>
        )}
        {navigateTo && (
          <button
            onClick={handleNavigate}
            className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
          >
            Open <ArrowRight size={10} />
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default AuraActionCard;
