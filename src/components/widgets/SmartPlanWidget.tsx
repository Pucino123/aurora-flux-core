import React, { useState, useEffect, useCallback, useRef } from "react";
import { Sparkles, Clock, GripVertical, Plus, Loader2, X, Check, CalendarDays, LayoutList, Calendar as CalendarIcon, Zap, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday, isTomorrow, differenceInDays, parseISO, startOfDay } from "date-fns";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────
type BlockType = "work" | "meeting" | "break" | "ai";

interface ScheduleBlock {
  id: string;
  time: string;
  endTime: string;
  title: string;
  type: BlockType;
  isAI?: boolean;
  sort_order: number;
  scheduledDate: string; // YYYY-MM-DD
}

const TODAY = new Date().toISOString().slice(0, 10);

// ── Defaults ───────────────────────────────────────────────────────────────
const FALLBACK_BLOCKS: Omit<ScheduleBlock, "id">[] = [
  { time: "08:00", endTime: "08:30", title: "Morning Review",             type: "work",    isAI: true,  sort_order: 0, scheduledDate: TODAY },
  { time: "09:00", endTime: "10:30", title: "Deep Work: Product Roadmap", type: "work",                 sort_order: 1, scheduledDate: TODAY },
  { time: "10:30", endTime: "10:45", title: "Break — Stretch & Water",    type: "break",   isAI: true,  sort_order: 2, scheduledDate: TODAY },
  { time: "11:00", endTime: "12:00", title: "Team Standup + Planning",    type: "meeting",              sort_order: 3, scheduledDate: TODAY },
  { time: "13:00", endTime: "14:30", title: "Focus: Feature Development", type: "work",                 sort_order: 4, scheduledDate: TODAY },
  { time: "15:00", endTime: "15:30", title: "Email & Async Comms",        type: "work",                 sort_order: 5, scheduledDate: TODAY },
  { time: "16:00", endTime: "17:00", title: "Weekly Review",              type: "work",    isAI: true,  sort_order: 6, scheduledDate: TODAY },
];

const TYPE_STYLE: Record<BlockType, { bg: string; dot: string; text: string }> = {
  work:    { bg: "bg-blue-400/10 border-blue-400/20",       dot: "bg-blue-400",    text: "text-blue-300"    },
  meeting: { bg: "bg-amber-400/10 border-amber-400/20",     dot: "bg-amber-400",   text: "text-amber-300"   },
  break:   { bg: "bg-emerald-400/10 border-emerald-400/20", dot: "bg-emerald-400", text: "text-emerald-300" },
  ai:      { bg: "bg-violet-400/10 border-violet-400/30",   dot: "bg-violet-400",  text: "text-violet-300"  },
};

/** Human-friendly label for a future scheduled date */
function dateBadgeLabel(dateStr: string): string | null {
  if (dateStr === TODAY) return null;
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return null;
    if (isTomorrow(d)) return "Tomorrow";
    const days = differenceInDays(d, new Date());
    if (days < 0) return null;
    if (days <= 6) return format(d, "EEEE");
    return format(d, "MMM d");
  } catch {
    return null;
  }
}

/** Group blocks by date, returning sorted date keys */
function groupByDate(blocks: ScheduleBlock[]): { date: string; blocks: ScheduleBlock[] }[] {
  const map: Record<string, ScheduleBlock[]> = {};
  blocks.forEach(b => {
    if (!map[b.scheduledDate]) map[b.scheduledDate] = [];
    map[b.scheduledDate].push(b);
  });
  return Object.keys(map)
    .sort()
    .map(date => ({ date, blocks: map[date] }));
}

/** Human-friendly date group header */
function groupHeader(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    const days = differenceInDays(d, startOfDay(new Date()));
    if (days > 0 && days <= 6) return format(d, "EEEE");
    return format(d, "EEEE, MMM d");
  } catch {
    return dateStr;
  }
}

// ── Sortable row ───────────────────────────────────────────────────────────
function SortableBlock({
  block, idx, onDelete, onRename, showDateBadge,
}: {
  block: ScheduleBlock;
  idx: number;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => Promise<void>;
  showDateBadge?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });

  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(block.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setEditVal(block.title);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 30);
  };

  const commitEdit = async () => {
    const trimmed = editVal.trim();
    if (trimmed && trimmed !== block.title) {
      await onRename(block.id, trimmed);
    }
    setEditing(false);
  };

  const s = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    zIndex: isDragging ? 50 : "auto" as const,
  };
  const ts = TYPE_STYLE[block.isAI ? "ai" : block.type];
  const dateBadge = showDateBadge ? dateBadgeLabel(block.scheduledDate) : null;

  return (
    <motion.div
      ref={setNodeRef} style={s}
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: idx * 0.03 }}
      className={`flex items-center gap-2 p-2 rounded-xl border ${ts.bg} group`}
    >
      <button
        {...attributes} {...listeners}
        className="text-white/15 cursor-grab active:cursor-grabbing shrink-0 hover:text-white/40 transition-colors touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical size={12} />
      </button>
      <div className={`w-1.5 h-1.5 rounded-full ${ts.dot} shrink-0`} />
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={editVal}
            autoFocus
            onChange={e => setEditVal(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") setEditing(false);
            }}
            className="w-full bg-white/10 border border-violet-400/40 rounded px-1.5 py-0.5 text-[11px] font-medium text-white/90 outline-none leading-tight"
          />
        ) : (
          <p
            className="text-[11px] font-medium text-white/80 leading-tight truncate cursor-text hover:text-white/95 transition-colors"
            onDoubleClick={startEdit}
            title="Double-click to rename"
          >
            {block.title}
          </p>
        )}
        <div className="flex items-center gap-1.5">
          <p className={`text-[9px] ${ts.text}`}>{block.time} — {block.endTime}</p>
          {dateBadge && (
            <span className="flex items-center gap-0.5 text-[8px] text-white/35 bg-white/5 px-1 py-0.5 rounded-full border border-white/8">
              <CalendarDays size={7} /> {dateBadge}
            </span>
          )}
        </div>
      </div>
      {block.isAI && (
        <span className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[8px]">
          <Sparkles size={7} /> AI
        </span>
      )}
      <button
        onClick={() => onDelete(block.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded-md flex items-center justify-center text-white/20 hover:text-rose-400 hover:bg-rose-400/15 transition-all ml-0.5 shrink-0"
        aria-label="Delete block"
      >
        <X size={10} />
      </button>
    </motion.div>
  );
}

// ── Add Block Modal ────────────────────────────────────────────────────────
interface AddBlockModalProps {
  onClose: () => void;
  onAdd: (block: Omit<ScheduleBlock, "id" | "sort_order">) => Promise<void>;
}

function AddBlockModal({ onClose, onAdd }: AddBlockModalProps) {
  const [title, setTitle]         = useState("");
  const [startTime, setStart]     = useState("09:00");
  const [endTime, setEnd]         = useState("10:00");
  const [type, setType]           = useState<BlockType>("work");
  const [date, setDate]           = useState<Date>(new Date());
  const [dateOpen, setDateOpen]   = useState(false);
  const [saving, setSaving]       = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await onAdd({
      title: title.trim(),
      time: startTime,
      endTime,
      type,
      scheduledDate: format(date, "yyyy-MM-dd"),
    });
    setSaving(false);
    onClose();
  };

  const TYPE_OPTIONS: { value: BlockType; label: string; color: string }[] = [
    { value: "work",    label: "Work",    color: "bg-blue-400/30 text-blue-300 border-blue-400/30"        },
    { value: "meeting", label: "Meeting", color: "bg-amber-400/30 text-amber-300 border-amber-400/30"     },
    { value: "break",   label: "Break",   color: "bg-emerald-400/30 text-emerald-300 border-emerald-400/30" },
    { value: "ai",      label: "AI",      color: "bg-violet-400/30 text-violet-300 border-violet-400/30"  },
  ];

  const dateLabel = isToday(date) ? "Today" : isTomorrow(date) ? "Tomorrow" : format(date, "MMM d");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 4 }}
      className="absolute inset-x-0 bottom-0 z-20 mx-1 mb-1 p-3 rounded-2xl bg-[hsl(var(--card))] border border-white/10 shadow-2xl"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold text-white/80">New Time Block</p>
        <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
          <X size={13} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Block title…"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white/80 placeholder:text-white/25 outline-none focus:border-violet-400/50 transition-colors"
        />

        <div className="flex gap-2">
          <div className="flex-1">
            <p className="text-[9px] text-white/30 mb-1 uppercase tracking-wider">Date</p>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white/70 outline-none hover:border-violet-400/40 transition-colors flex items-center gap-1.5 justify-start",
                    dateOpen && "border-violet-400/50"
                  )}
                >
                  <CalendarDays size={10} className="text-violet-300 shrink-0" />
                  {dateLabel}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={d => { if (d) { setDate(d); setDateOpen(false); } }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex-1">
            <p className="text-[9px] text-white/30 mb-1 uppercase tracking-wider">Start</p>
            <input
              type="time"
              value={startTime}
              onChange={e => setStart(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white/70 outline-none focus:border-violet-400/50 transition-colors"
            />
          </div>
          <div className="flex-1">
            <p className="text-[9px] text-white/30 mb-1 uppercase tracking-wider">End</p>
            <input
              type="time"
              value={endTime}
              onChange={e => setEnd(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white/70 outline-none focus:border-violet-400/50 transition-colors"
            />
          </div>
        </div>

        <div>
          <p className="text-[9px] text-white/30 mb-1.5 uppercase tracking-wider">Type</p>
          <div className="flex gap-1.5 flex-wrap">
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className={`px-2.5 py-1 rounded-full border text-[9px] font-medium transition-all
                  ${type === opt.value ? opt.color : "bg-white/5 border-white/10 text-white/30 hover:text-white/50"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-0.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-1.5 rounded-lg border border-white/10 text-[10px] text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim() || saving}
            className="flex-1 py-1.5 rounded-lg bg-violet-500/30 hover:bg-violet-500/50 border border-violet-400/30 text-[10px] text-violet-300 font-medium transition-all flex items-center justify-center gap-1 disabled:opacity-40"
          >
            {saving ? <Loader2 size={10} className="animate-spin" /> : <><Check size={10} /> Add Block</>}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

// ── Main Widget ────────────────────────────────────────────────────────────
const SmartPlanWidget = () => {
  const { user } = useAuth();
  const [blocks, setBlocks]         = useState<ScheduleBlock[]>([]);
  const [loading, setLoading]       = useState(true);
  const [input, setInput]           = useState("");
  const [optimizing, setOptimizing] = useState(false);
  const [showAdd, setShowAdd]       = useState(false);
  /** false = Today only, true = All upcoming (grouped by date) */
  const [showAll, setShowAll]       = useState(false);
  /** Daily summary AI popover */
  const [summaryOpen, setSummaryOpen]     = useState(false);
  const [summary, setSummary]             = useState<string>("");
  const [summaryLoading, setSummaryLoading] = useState(false);

  const today = format(new Date(), "EEEE, MMM d");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // ── DB helpers ─────────────────────────────────────────────────────────
  const dbRowToBlock = (row: Record<string, unknown>, i: number): ScheduleBlock => ({
    id:            row.id as string,
    time:          row.time as string,
    endTime:       (row.end_time as string) ?? "",
    title:         row.title as string,
    type:          (row.type as BlockType) ?? "work",
    isAI:          (row.is_ai as boolean) ?? false,
    sort_order:    (row.sort_order as number) ?? i,
    scheduledDate: (row.scheduled_date as string) ?? TODAY,
  });

  // ── Load ────────────────────────────────────────────────────────────────
  const loadBlocks = useCallback(async () => {
    if (!user) {
      setBlocks(FALLBACK_BLOCKS.map((b, i) => ({ ...b, id: String(i + 1) })));
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("schedule_blocks")
      .select("*")
      .eq("user_id", user.id)
      .gte("scheduled_date", TODAY)
      .order("scheduled_date", { ascending: true })
      .order("sort_order", { ascending: true });

    if (!data || data.length === 0) {
      const { data: inserted } = await supabase
        .from("schedule_blocks")
        .insert(FALLBACK_BLOCKS.map(b => ({
          user_id: user.id,
          scheduled_date: b.scheduledDate,
          time: b.time,
          end_time: b.endTime,
          title: b.title,
          type: b.type,
          is_ai: b.isAI ?? false,
          sort_order: b.sort_order,
          duration: "30m",
        })))
        .select();
      setBlocks((inserted ?? []).map(dbRowToBlock));
    } else {
      setBlocks(data.map(dbRowToBlock));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadBlocks(); }, [loadBlocks]);

  // ── Persist reorder ─────────────────────────────────────────────────────
  const persistOrder = useCallback(async (ordered: ScheduleBlock[]) => {
    if (!user) return;
    await Promise.all(
      ordered.map((b, i) =>
        supabase.from("schedule_blocks").update({ sort_order: i }).eq("id", b.id).eq("user_id", user.id)
      )
    );
  }, [user]);

  /**
   * Universal drag-end handler for both Today and Scheduled views.
   * If the dragged block lands on a block from a different date group,
   * we also update scheduled_date so it moves into that date's group.
   */
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks(prev => {
      const oldIdx = prev.findIndex(b => b.id === active.id);
      const newIdx = prev.findIndex(b => b.id === over.id);
      if (oldIdx === -1 || newIdx === -1) return prev;

      const draggedBlock = prev[oldIdx];
      const targetBlock  = prev[newIdx];

      // If crossing date groups, adopt the target's date
      const newDate = targetBlock.scheduledDate;
      const dateChanged = draggedBlock.scheduledDate !== newDate;

      const updated = prev.map((b, i) =>
        i === oldIdx ? { ...b, scheduledDate: newDate } : b
      );
      const reordered = arrayMove(updated, oldIdx, newIdx).map((b, i) => ({ ...b, sort_order: i }));

      // Persist: sort_order for all + scheduled_date if changed
      if (user) {
        if (dateChanged) {
          supabase.from("schedule_blocks")
            .update({ scheduled_date: newDate })
            .eq("id", draggedBlock.id)
            .eq("user_id", user.id)
            .then(() => persistOrder(reordered));
        } else {
          persistOrder(reordered);
        }
      }
      return reordered;
    });
  }, [user, persistOrder]);

  // ── Add block ───────────────────────────────────────────────────────────
  const handleAddBlock = useCallback(async (block: Omit<ScheduleBlock, "id" | "sort_order">) => {
    const sortOrder = blocks.length;
    if (user) {
      const { data } = await supabase
        .from("schedule_blocks")
        .insert({
          user_id: user.id,
          scheduled_date: block.scheduledDate,
          time: block.time,
          end_time: block.endTime,
          title: block.title,
          type: block.type,
          is_ai: block.isAI ?? false,
          sort_order: sortOrder,
          duration: "30m",
        })
        .select()
        .single();
      if (data) {
        setBlocks(prev => {
          const updated = [...prev, dbRowToBlock(data as Record<string, unknown>, prev.length)];
          return updated
            .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.time.localeCompare(b.time))
            .map((b, i) => ({ ...b, sort_order: i }));
        });
      }
    } else {
      setBlocks(prev => {
        const updated = [...prev, { ...block, id: "local-" + Date.now(), sort_order: sortOrder }];
        return updated
          .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.time.localeCompare(b.time))
          .map((b, i) => ({ ...b, sort_order: i }));
      });
    }
  }, [user, blocks.length]);

  // ── Focus Block quick-add (90 min deep work at next round hour today) ──
  const addFocusBlock = useCallback(async () => {
    const now = new Date();
    // Round up to next full hour
    const nextHour = new Date(now);
    nextHour.setMinutes(0, 0, 0);
    nextHour.setHours(now.getMinutes() > 0 ? now.getHours() + 1 : now.getHours());
    const startStr = `${String(nextHour.getHours()).padStart(2, "0")}:00`;
    const endHour  = new Date(nextHour);
    endHour.setMinutes(90);
    const endStr   = `${String(Math.floor(endHour.getTime() / 3_600_000) % 24).padStart(2, "0")}:${String(endHour.getMinutes()).padStart(2, "0")}`;
    await handleAddBlock({
      title: "⚡ Deep Work — Focus Block",
      time: startStr,
      endTime: endStr,
      type: "work",
      isAI: false,
      scheduledDate: TODAY,
    });
  }, [handleAddBlock]);

  // ── Daily Summary ────────────────────────────────────────────────────────
  const fetchDailySummary = useCallback(async () => {
    const todayBlks = blocks.filter(b => b.scheduledDate === TODAY);
    if (todayBlks.length === 0) { setSummary("No blocks scheduled for today yet!"); setSummaryOpen(true); return; }
    setSummaryLoading(true);
    setSummaryOpen(true);
    try {
      const { data, error } = await supabase.functions.invoke("flux-ai", {
        body: { type: "daily-summary", blocks: todayBlks },
      });
      if (error || !data?.summary) throw new Error("No summary");
      setSummary(data.summary);
    } catch {
      setSummary("Couldn't generate summary right now. Check back later!");
    } finally {
      setSummaryLoading(false);
    }
  }, [blocks]);

  // ── Delete block ────────────────────────────────────────────────────────
  const handleDeleteBlock = useCallback(async (blockId: string) => {
    setBlocks(prev => prev.filter(b => b.id !== blockId));
    if (user) {
      await supabase.from("schedule_blocks").delete().eq("id", blockId).eq("user_id", user.id);
    }
  }, [user]);

  // ── Rename block ─────────────────────────────────────────────────────────
  const handleRenameBlock = useCallback(async (blockId: string, newTitle: string) => {
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, title: newTitle } : b));
    if (user) {
      await supabase.from("schedule_blocks").update({ title: newTitle }).eq("id", blockId).eq("user_id", user.id);
    }
  }, [user]);

  // ── Optimize ────────────────────────────────────────────────────────────
  const optimize = async () => {
    setOptimizing(true);
    await new Promise(r => setTimeout(r, 900));
    await handleAddBlock({
      title: "AI Suggested: Mindful Break",
      time: "14:30",
      endTime: "14:45",
      type: "break",
      isAI: true,
      scheduledDate: TODAY,
    });
    setOptimizing(false);
  };

  // ── Derived: filtered/grouped blocks ─────────────────────────────────
  const todayBlocks      = blocks.filter(b => b.scheduledDate === TODAY);
  const groupedBlocks    = groupByDate(blocks);
  const futureGroupCount = groupedBlocks.filter(g => g.date !== TODAY).length;

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden relative">
      {/* AI input */}
      <div className="shrink-0 flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && optimize()}
          placeholder="What do you need to achieve today?"
          className="flex-1 bg-transparent text-[11px] text-white/70 placeholder:text-white/25 outline-none"
        />
        <button
          onClick={optimize}
          disabled={optimizing}
          className="w-6 h-6 rounded-full bg-violet-500/30 hover:bg-violet-500/50 flex items-center justify-center text-violet-300 transition-all shrink-0"
        >
          {optimizing ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
        </button>
      </div>

      {/* Suggestion chips + Focus Block shortcut */}
      <div className="flex gap-1.5 shrink-0 flex-wrap">
        {["✨ Optimize Schedule", "✨ Find Focus Time", "+ Add Break"].map(chip => (
          <button
            key={chip}
            onClick={() => chip.startsWith("✨ Opt") && optimize()}
            className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/40 hover:bg-violet-500/15 hover:text-violet-300 hover:border-violet-400/25 transition-all"
          >
            {chip}
          </button>
        ))}
        {/* ⚡ Focus Block one-click shortcut */}
        <button
          onClick={addFocusBlock}
          title="Add 90-min deep work block at next round hour"
          className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/15 border border-blue-400/20 text-[10px] text-blue-300 hover:bg-blue-500/30 hover:border-blue-400/40 transition-all"
        >
          <Zap size={9} /> Focus Block
        </button>
      </div>

      {/* Today vs Scheduled toggle + date header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Clock size={11} className="text-white/30" />
          <span className="text-[10px] text-white/30">{today}</span>
        </div>
        {/* Toggle */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-white/5 border border-white/10">
          <button
            onClick={() => setShowAll(false)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-medium transition-all",
              !showAll
                ? "bg-violet-500/30 text-violet-300 border border-violet-400/30"
                : "text-white/30 hover:text-white/60"
            )}
          >
            <LayoutList size={9} /> Today
          </button>
          <button
            onClick={() => setShowAll(true)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-medium transition-all",
              showAll
                ? "bg-violet-500/30 text-violet-300 border border-violet-400/30"
                : "text-white/30 hover:text-white/60"
            )}
          >
            <CalendarIcon size={9} /> Scheduled
            {futureGroupCount > 0 && (
              <span className={cn(
                "ml-0.5 px-1 py-0 rounded-full text-[7px] font-bold",
                showAll ? "bg-violet-400/30 text-violet-200" : "bg-white/10 text-white/40"
              )}>
                {blocks.filter(b => b.scheduledDate !== TODAY).length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto council-hidden-scrollbar">
        <AnimatePresence mode="popLayout">
          {optimizing || loading ? (
            <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-12 rounded-xl bg-white/5 border border-white/8 relative overflow-hidden">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                </div>
              ))}
            </motion.div>
          ) : !showAll ? (
            /* ── TODAY VIEW ── */
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={todayBlocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                <motion.div key="today-blocks" className="space-y-1.5">
                  {todayBlocks.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="py-8 text-center text-[11px] text-white/20"
                    >
                      No blocks scheduled for today
                    </motion.div>
                  ) : todayBlocks.map((block, idx) => (
                    <SortableBlock
                      key={block.id}
                      block={block}
                      idx={idx}
                      onDelete={handleDeleteBlock}
                      onRename={handleRenameBlock}
                      showDateBadge={false}
                    />
                  ))}
                </motion.div>
              </SortableContext>
            </DndContext>
          ) : (
            /* ── SCHEDULED VIEW (grouped by date) ── */
            <motion.div key="all-blocks" className="space-y-3">
              {groupedBlocks.map(group => (
                <div key={group.date}>
                  {/* Date group header */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={cn(
                      "text-[9px] font-semibold uppercase tracking-wider",
                      group.date === TODAY ? "text-violet-300" : "text-white/40"
                    )}>
                      {groupHeader(group.date)}
                    </span>
                    <div className="flex-1 h-px bg-white/6" />
                    <span className="text-[8px] text-white/20">{group.blocks.length} blocks</span>
                  </div>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={group.blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-1.5">
                        {group.blocks.map((block, idx) => (
                          <SortableBlock
                            key={block.id}
                            block={block}
                            idx={idx}
                            onDelete={handleDeleteBlock}
                            onRename={handleRenameBlock}
                            showDateBadge={false}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              ))}
              {blocks.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-8 text-center text-[11px] text-white/20"
                >
                  No upcoming blocks
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setShowAdd(true)}
          className="mt-2 flex items-center gap-1.5 w-full py-2 rounded-xl border border-dashed border-white/10 text-white/20 hover:text-violet-300 hover:border-violet-400/30 hover:bg-violet-500/5 transition-all text-[10px] justify-center"
        >
          <Plus size={11} /> Add time block
        </button>
      </div>

      {/* Add Block Inline Modal */}
      <AnimatePresence>
        {showAdd && (
          <AddBlockModal
            onClose={() => setShowAdd(false)}
            onAdd={handleAddBlock}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default SmartPlanWidget;
