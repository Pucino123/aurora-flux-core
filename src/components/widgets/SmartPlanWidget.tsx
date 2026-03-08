import React, { useState, useEffect, useCallback } from "react";
import { Sparkles, Clock, GripVertical, Plus, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
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

interface ScheduleBlock {
  id: string;
  db_id?: string;
  time: string;
  endTime: string;
  title: string;
  type: "work" | "meeting" | "break" | "ai";
  isAI?: boolean;
  sort_order: number;
}

const FALLBACK_BLOCKS: ScheduleBlock[] = [
  { id: "1", time: "08:00", endTime: "08:30", title: "Morning Review", type: "work", isAI: true, sort_order: 0 },
  { id: "2", time: "09:00", endTime: "10:30", title: "Deep Work: Product Roadmap", type: "work", sort_order: 1 },
  { id: "3", time: "10:30", endTime: "10:45", title: "Break — Stretch & Water", type: "break", isAI: true, sort_order: 2 },
  { id: "4", time: "11:00", endTime: "12:00", title: "Team Standup + Planning", type: "meeting", sort_order: 3 },
  { id: "5", time: "13:00", endTime: "14:30", title: "Focus: Feature Development", type: "work", sort_order: 4 },
  { id: "6", time: "15:00", endTime: "15:30", title: "Email & Async Comms", type: "work", sort_order: 5 },
  { id: "7", time: "16:00", endTime: "17:00", title: "Weekly Review", type: "work", isAI: true, sort_order: 6 },
];

const TYPE_STYLE = {
  work: { bg: "bg-blue-400/10 border-blue-400/20", dot: "bg-blue-400", text: "text-blue-300" },
  meeting: { bg: "bg-amber-400/10 border-amber-400/20", dot: "bg-amber-400", text: "text-amber-300" },
  break: { bg: "bg-emerald-400/10 border-emerald-400/20", dot: "bg-emerald-400", text: "text-emerald-300" },
  ai: { bg: "bg-violet-400/10 border-violet-400/30", dot: "bg-violet-400", text: "text-violet-300" },
};

const TODAY = new Date().toISOString().slice(0, 10);

// ── Sortable Row ──────────────────────────────────────────────────────────────
function SortableBlock({ block, idx }: { block: ScheduleBlock; idx: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  const typeStyle = TYPE_STYLE[block.isAI ? "ai" : block.type];

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04 }}
      className={`flex items-center gap-2 p-2 rounded-xl border ${typeStyle.bg} group`}
    >
      <button
        {...attributes}
        {...listeners}
        className="text-white/15 cursor-grab active:cursor-grabbing shrink-0 hover:text-white/40 transition-colors touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical size={12} />
      </button>
      <div className={`w-1.5 h-1.5 rounded-full ${typeStyle.dot} shrink-0`} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-white/80 leading-tight truncate">{block.title}</p>
        <p className={`text-[9px] ${typeStyle.text}`}>{block.time} — {block.endTime}</p>
      </div>
      {block.isAI && (
        <span className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[8px]">
          <Sparkles size={7} /> AI
        </span>
      )}
    </motion.div>
  );
}

// ── Main Widget ───────────────────────────────────────────────────────────────
const SmartPlanWidget = () => {
  const { user } = useAuth();
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [optimizing, setOptimizing] = useState(false);

  const today = format(new Date(), "EEEE, MMM d");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // ── Load blocks from DB ──────────────────────────────────────────────────
  const loadBlocks = useCallback(async () => {
    if (!user) { setBlocks(FALLBACK_BLOCKS); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("schedule_blocks")
      .select("*")
      .eq("user_id", user.id)
      .eq("scheduled_date", TODAY)
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) {
      // Seed default blocks for today
      if (user && (!data || data.length === 0)) {
        const inserts = FALLBACK_BLOCKS.map((b, i) => ({
          user_id: user.id,
          scheduled_date: TODAY,
          time: b.time,
          end_time: b.endTime,
          title: b.title,
          type: b.type,
          is_ai: b.isAI ?? false,
          sort_order: i,
          duration: "30m",
        }));
        const { data: inserted } = await supabase
          .from("schedule_blocks")
          .insert(inserts)
          .select();
        if (inserted) {
          setBlocks(inserted.map((row, i) => ({
            id: row.id,
            db_id: row.id,
            time: row.time,
            endTime: (row as any).end_time ?? "",
            title: row.title,
            type: row.type as ScheduleBlock["type"],
            isAI: (row as any).is_ai ?? false,
            sort_order: row.sort_order ?? i,
          })));
        } else {
          setBlocks(FALLBACK_BLOCKS);
        }
      } else {
        setBlocks(FALLBACK_BLOCKS);
      }
    } else {
      setBlocks(data.map((row, i) => ({
        id: row.id,
        db_id: row.id,
        time: row.time,
        endTime: (row as any).end_time ?? "",
        title: row.title,
        type: row.type as ScheduleBlock["type"],
        isAI: (row as any).is_ai ?? false,
        sort_order: row.sort_order ?? i,
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadBlocks(); }, [loadBlocks]);

  // ── Persist reorder ──────────────────────────────────────────────────────
  const persistOrder = useCallback(async (ordered: ScheduleBlock[]) => {
    if (!user) return;
    const updates = ordered.map((b, i) =>
      supabase
        .from("schedule_blocks")
        .update({ sort_order: i })
        .eq("id", b.id)
        .eq("user_id", user.id)
    );
    await Promise.all(updates);
  }, [user]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks(prev => {
      const oldIdx = prev.findIndex(b => b.id === active.id);
      const newIdx = prev.findIndex(b => b.id === over.id);
      const reordered = arrayMove(prev, oldIdx, newIdx).map((b, i) => ({ ...b, sort_order: i }));
      persistOrder(reordered);
      return reordered;
    });
  }, [persistOrder]);

  // ── Optimize ─────────────────────────────────────────────────────────────
  const optimize = async () => {
    setOptimizing(true);
    await new Promise(r => setTimeout(r, 900));

    const newBlock: Omit<ScheduleBlock, "id" | "db_id"> = {
      time: "14:30", endTime: "14:45",
      title: "AI Suggested: Mindful Break",
      type: "break", isAI: true,
      sort_order: blocks.length,
    };

    if (user) {
      const { data } = await supabase
        .from("schedule_blocks")
        .insert({
          user_id: user.id,
          scheduled_date: TODAY,
          time: newBlock.time,
          end_time: newBlock.endTime,
          title: newBlock.title,
          type: newBlock.type,
          is_ai: true,
          sort_order: newBlock.sort_order,
          duration: "15m",
        })
        .select()
        .single();
      if (data) {
        setBlocks(prev => {
          const updated = [...prev, { ...newBlock, id: data.id, db_id: data.id }]
            .sort((a, b) => a.time.localeCompare(b.time))
            .map((b, i) => ({ ...b, sort_order: i }));
          persistOrder(updated);
          return updated;
        });
      }
    } else {
      setBlocks(prev =>
        [...prev, { ...newBlock, id: "ai-break-" + Date.now() }]
          .sort((a, b) => a.time.localeCompare(b.time))
          .map((b, i) => ({ ...b, sort_order: i }))
      );
    }
    setOptimizing(false);
  };

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
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

      {/* Suggestion chips */}
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
      </div>

      {/* Date header */}
      <div className="flex items-center gap-2 shrink-0">
        <Clock size={11} className="text-white/30" />
        <span className="text-[10px] text-white/30">{today}</span>
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
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                <motion.div key="blocks" className="space-y-1.5">
                  {blocks.map((block, idx) => (
                    <SortableBlock key={block.id} block={block} idx={idx} />
                  ))}
                </motion.div>
              </SortableContext>
            </DndContext>
          )}
        </AnimatePresence>

        <button className="mt-2 flex items-center gap-1.5 w-full py-2 rounded-xl border border-dashed border-white/10 text-white/20 hover:text-white/40 hover:border-white/20 transition-all text-[10px] justify-center">
          <Plus size={11} /> Add time block
        </button>
      </div>
    </div>
  );
};

export default SmartPlanWidget;
