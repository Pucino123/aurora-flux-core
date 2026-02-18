import { useFlux } from "@/context/FluxContext";
import { t } from "@/lib/i18n";
import { FileText, Pin } from "lucide-react";

export const RecentNotesWidget = () => {
  const { tasks } = useFlux();
  const notes = tasks
    .filter((tk) => tk.type === "note")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 4);

  return (
    <div className="h-full flex flex-col p-1">
      <div className="flex items-center gap-2 mb-2">
        <FileText size={14} className="text-primary" />
        <span className="text-xs font-semibold font-display">{t("widget.recent_notes")}</span>
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {notes.length === 0 ? (
          <span className="text-[10px] text-muted-foreground">{t("widget.no_notes")}</span>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="p-1.5 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors">
              <p className="text-[11px] font-medium truncate">{n.title}</p>
              {n.content && (
                <p className="text-[9px] text-muted-foreground truncate mt-0.5">{n.content}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export const PinnedNoteWidget = () => {
  const { tasks } = useFlux();
  const pinned = tasks.find((tk) => tk.pinned && tk.type === "note");

  return (
    <div className="h-full flex flex-col p-1">
      <div className="flex items-center gap-2 mb-2">
        <Pin size={14} className="text-primary fill-current" />
        <span className="text-xs font-semibold font-display">{t("widget.pinned_note")}</span>
      </div>
      {pinned ? (
        <div className="flex-1 overflow-y-auto">
          <p className="text-xs font-semibold mb-1">{pinned.title}</p>
          <p className="text-[11px] text-muted-foreground whitespace-pre-wrap">{pinned.content}</p>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground">{t("widget.no_pinned")}</span>
        </div>
      )}
    </div>
  );
};
