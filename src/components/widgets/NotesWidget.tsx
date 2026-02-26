import { useFlux } from "@/context/FluxContext";
import { t } from "@/lib/i18n";
import { FileText, Pin, Type } from "lucide-react";
import { useState } from "react";

const FONT_FAMILIES = [
  { label: "System", value: "inherit" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Mono", value: "ui-monospace, monospace" },
  { label: "Rounded", value: "'Nunito', sans-serif" },
];

export const RecentNotesWidget = () => {
  const { tasks } = useFlux();
  const [showFontSettings, setShowFontSettings] = useState(false);
  const [fontFamily, setFontFamily] = useState("inherit");
  const [fontSize, setFontSize] = useState(11);
  const [fontWeight, setFontWeight] = useState(400);

  const notes = tasks
    .filter((tk) => tk.type === "note")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 4);

  return (
    <div className="h-full flex flex-col p-1">
      <div className="flex items-center gap-2 mb-2">
        <FileText size={14} className="text-primary" />
        <span className="text-xs font-semibold font-display flex-1">{t("widget.recent_notes")}</span>
        <button
          onClick={() => setShowFontSettings(!showFontSettings)}
          className={`p-1 rounded-lg transition-colors ${showFontSettings ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Type size={11} />
        </button>
      </div>

      {showFontSettings && (
        <div className="mb-2 p-2 rounded-xl bg-secondary/50 border border-border/20 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-12 shrink-0">Font</span>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="flex-1 text-[10px] bg-background border border-border/30 rounded-lg px-1.5 py-0.5 outline-none"
            >
              {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-12 shrink-0">Size</span>
            <input type="range" min={9} max={18} value={fontSize} onChange={(e) => setFontSize(+e.target.value)}
              className="flex-1 accent-primary" />
            <span className="text-[10px] text-muted-foreground w-6 text-right">{fontSize}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-12 shrink-0">Weight</span>
            <div className="flex gap-1">
              {[300, 400, 600, 700].map(w => (
                <button key={w} onClick={() => setFontWeight(w)}
                  className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${fontWeight === w ? "bg-primary/10 border-primary/30 text-primary" : "border-border/30 text-muted-foreground"}`}
                  style={{ fontWeight: w }}
                >
                  {w === 300 ? "Light" : w === 400 ? "Regular" : w === 600 ? "Semi" : "Bold"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {notes.length === 0 ? (
          <span className="text-[10px] text-muted-foreground">{t("widget.no_notes")}</span>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="p-1.5 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors">
              <p className="truncate" style={{ fontFamily, fontSize, fontWeight }}>{n.title}</p>
              {n.content && (
                <p className="text-muted-foreground truncate mt-0.5" style={{ fontFamily, fontSize: fontSize * 0.82, fontWeight }}>{n.content}</p>
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
  const [showFontSettings, setShowFontSettings] = useState(false);
  const [fontFamily, setFontFamily] = useState("inherit");
  const [fontSize, setFontSize] = useState(12);
  const [fontWeight, setFontWeight] = useState(400);
  const pinned = tasks.find((tk) => tk.pinned && tk.type === "note");

  return (
    <div className="h-full flex flex-col p-1">
      <div className="flex items-center gap-2 mb-2">
        <Pin size={14} className="text-primary fill-current" />
        <span className="text-xs font-semibold font-display flex-1">{t("widget.pinned_note")}</span>
        <button
          onClick={() => setShowFontSettings(!showFontSettings)}
          className={`p-1 rounded-lg transition-colors ${showFontSettings ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Type size={11} />
        </button>
      </div>

      {showFontSettings && (
        <div className="mb-2 p-2 rounded-xl bg-secondary/50 border border-border/20 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-12 shrink-0">Font</span>
            <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}
              className="flex-1 text-[10px] bg-background border border-border/30 rounded-lg px-1.5 py-0.5 outline-none">
              {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-12 shrink-0">Size</span>
            <input type="range" min={9} max={20} value={fontSize} onChange={(e) => setFontSize(+e.target.value)} className="flex-1 accent-primary" />
            <span className="text-[10px] text-muted-foreground w-6 text-right">{fontSize}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-12 shrink-0">Weight</span>
            <div className="flex gap-1">
              {[300, 400, 600, 700].map(w => (
                <button key={w} onClick={() => setFontWeight(w)}
                  className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${fontWeight === w ? "bg-primary/10 border-primary/30 text-primary" : "border-border/30 text-muted-foreground"}`}
                  style={{ fontWeight: w }}>
                  {w === 300 ? "Light" : w === 400 ? "Regular" : w === 600 ? "Semi" : "Bold"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {pinned ? (
        <div className="flex-1 overflow-y-auto">
          <p className="font-semibold mb-1" style={{ fontFamily, fontSize, fontWeight }}>{pinned.title}</p>
          <p className="text-muted-foreground whitespace-pre-wrap" style={{ fontFamily, fontSize: fontSize * 0.9, fontWeight }}>{pinned.content}</p>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground">{t("widget.no_pinned")}</span>
        </div>
      )}
    </div>
  );
};
