import { t } from "@/lib/i18n";

const PRIORITIES = [
  { key: "critical", emoji: "🔴", label: "notes.critical", color: "hsl(var(--priority-critical))", shadow: "0 0 12px hsl(var(--priority-critical) / 0.4)" },
  { key: "high", emoji: "🟠", label: "notes.high", color: "hsl(var(--priority-high))", shadow: "none" },
  { key: "normal", emoji: "🟡", label: "notes.normal", color: "hsl(var(--priority-medium))", shadow: "none" },
  { key: "low", emoji: "🟢", label: "notes.low", color: "hsl(var(--priority-low))", shadow: "none" },
  { key: "none", emoji: "⚪", label: "notes.none", color: "hsl(var(--priority-none))", shadow: "none" },
] as const;

export type NotePriority = typeof PRIORITIES[number]["key"];

interface NotePrioritySelectorProps {
  value: string | null;
  onChange: (priority: NotePriority) => void;
  compact?: boolean;
}

export const getNotePriorityStyle = (priority: string | null) => {
  switch (priority) {
    case "critical":
      return {
        borderColor: "hsl(var(--priority-critical))",
        boxShadow: "0 0 12px hsl(var(--priority-critical) / 0.3)",
        borderWidth: "2px",
      };
    case "high":
      return {
        borderColor: "hsl(var(--priority-high))",
        borderWidth: "2px",
      };
    case "low":
      return { opacity: 0.85 };
    case "none":
      return { opacity: 0.7 };
    default:
      return {};
  }
};

export const getNotePriorityBadge = (priority: string | null) => {
  const p = PRIORITIES.find((pr) => pr.key === priority);
  if (!p || p.key === "normal" || p.key === "none") return null;
  return p;
};

const NotePrioritySelector = ({ value, onChange, compact }: NotePrioritySelectorProps) => {
  return (
    <div className={`flex items-center ${compact ? "gap-1" : "gap-1.5"}`}>
      {PRIORITIES.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
            value === p.key
              ? "bg-foreground/10 ring-1 ring-foreground/20"
              : "hover:bg-secondary"
          }`}
          title={t(p.label)}
        >
          <span>{p.emoji}</span>
          {!compact && <span>{t(p.label)}</span>}
        </button>
      ))}
    </div>
  );
};

export default NotePrioritySelector;
