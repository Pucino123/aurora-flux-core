import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Plus, Trash2, Sparkles, Calendar as CalendarIcon, GripVertical } from "lucide-react";
import { useFlux, DbScheduleBlock } from "@/context/FluxContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatShortDate } from "@/lib/locale";
import { t } from "@/lib/i18n";
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
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const typeClassMap: Record<string, string> = {
  meeting: "schedule-meeting",
  deep: "schedule-deep",
  break: "schedule-break",
  workout: "schedule-workout",
  reading: "schedule-reading",
  custom: "schedule-custom",
};

const typeOptions = [
  { value: "deep", label: t("sched.deep") },
  { value: "meeting", label: t("sched.meeting") },
  { value: "break", label: t("sched.break") },
  { value: "workout", label: t("sched.workout") },
  { value: "reading", label: t("sched.reading") },
  { value: "custom", label: t("sched.custom") },
];

const TIME_SLOTS = (() => {
  const slots: string[] = [];
  for (let h = 6; h < 23; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
})();

function snapTo15(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const snapped = Math.round(m / 15) * 15;
  const finalH = snapped === 60 ? h + 1 : h;
  const finalM = snapped === 60 ? 0 : snapped;
  return `${String(finalH).padStart(2, "0")}:${String(finalM).padStart(2, "0")}`;
}

function getCurrentBlockIndex(blocks: { time: string }[]): number {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  let idx = -1;
  for (let i = 0; i < blocks.length; i++) {
    const [h, m] = blocks[i].time.split(":").map(Number);
    if (nowMins >= h * 60 + (m || 0)) idx = i;
  }
  return idx;
}

function getNowTopPercent(blocks: { time: string }[]): number | null {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  if (blocks.length === 0) return null;
  const [firstH, firstM] = blocks[0].time.split(":").map(Number);
  const [lastH, lastM] = blocks[blocks.length - 1].time.split(":").map(Number);
  const start = firstH * 60 + (firstM || 0);
  const end = lastH * 60 + (lastM || 0) + 60;
  if (nowMins < start || nowMins > end) return null;
  return ((nowMins - start) / (end - start)) * 100;
}

function sortBlocksByTime(blocks: DbScheduleBlock[]): DbScheduleBlock[] {
  return [...blocks].sort((a, b) => {
    const [ah, am] = a.time.split(":").map(Number);
    const [bh, bm] = b.time.split(":").map(Number);
    return (ah * 60 + (am || 0)) - (bh * 60 + (bm || 0));
  });
}

// ── Sortable Block Item ──
const SortableBlock = ({
  block,
  index,
  currentIdx,
  isEditing,
  onStartEdit,
  onDelete,
  onReschedule,
  selectedDate,
  editState,
  onEditChange,
  onSaveEdit,
  onCancelEdit,
  folderName,
  folderColor,
  onBadgeClick,
}: {
  block: DbScheduleBlock;
  index: number;
  currentIdx: number;
  isEditing: boolean;
  onStartEdit: (block: DbScheduleBlock) => void;
  onDelete: (id: string) => void;
  onReschedule: (id: string, date: Date) => void;
  selectedDate: Date;
  editState: { title: string; time: string; duration: string; type: string };
  onEditChange: (field: string, value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  folderName?: string;
  folderColor?: string | null;
  onBadgeClick?: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div className="flex gap-3 pl-5">
        <div className={`absolute left-[4px] top-3 w-[7px] h-[7px] rounded-full z-[1] ${index <= currentIdx ? "bg-primary" : "bg-border"}`} />
        <div className="flex-1">
          <span className="text-[10px] text-muted-foreground font-medium">{block.time}</span>
          {isEditing ? (
            <div className="mt-1 mb-3 rounded-xl px-3.5 py-3 bg-white/80 border border-border space-y-2">
              <input value={editState.title} onChange={(e) => onEditChange("title", e.target.value)} className="w-full text-sm font-medium bg-transparent outline-none border-b border-border pb-1" autoFocus />
              <div className="flex gap-2">
                <input value={editState.time} onChange={(e) => onEditChange("time", e.target.value)} className="w-20 text-[11px] bg-transparent outline-none text-muted-foreground border-b border-border pb-1" placeholder="e.g. 10:30" />
                <input value={editState.duration} onChange={(e) => onEditChange("duration", e.target.value)} className="w-16 text-[11px] bg-transparent outline-none text-muted-foreground border-b border-border pb-1" placeholder="30m" />
                <select value={editState.type} onChange={(e) => onEditChange("type", e.target.value)} className="text-[11px] bg-transparent outline-none text-muted-foreground border-b border-border pb-1">
                  {typeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex gap-1.5">
                <button onClick={onSaveEdit} className="p-1 rounded bg-primary/10 text-primary hover:bg-primary/20"><Check size={12} /></button>
                <button onClick={onCancelEdit} className="p-1 rounded bg-secondary text-muted-foreground hover:bg-secondary/80"><X size={12} /></button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => onStartEdit(block)}
              className={`mt-1 mb-3 rounded-xl px-3.5 py-3 ${typeClassMap[block.type] || "schedule-custom"} transition-all hover:shadow-sm cursor-pointer group relative`}
            >
              {/* Context badge */}
              {folderName && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={(e) => { e.stopPropagation(); onBadgeClick?.(); }}
                  className="absolute -top-2.5 right-2 px-2 py-0.5 rounded-md text-[9px] font-semibold backdrop-blur-md bg-white/40 border border-white/30 text-foreground/70 hover:bg-white/60 hover:text-foreground transition-all shadow-sm z-10"
                  title={`Gå til ${folderName}`}
                  style={folderColor ? { borderColor: `${folderColor}40`, background: `${folderColor}15` } : undefined}
                >
                  {folderName}
                </motion.button>
              )}
              <div className="flex items-center">
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mr-2 opacity-0 group-hover:opacity-40 transition-opacity">
                  <GripVertical size={14} />
                </div>
                <div className="flex-1 pr-16">
                  <p className="text-sm font-medium">{block.title}</p>
                  <p className="text-[11px] opacity-70 mt-0.5">{block.duration}</p>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-2 right-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button onClick={(e) => e.stopPropagation()} className="p-0.5 rounded hover:bg-black/5" title="Reschedule">
                        <CalendarIcon size={12} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar mode="single" selected={selectedDate} onSelect={(d) => { if (d) onReschedule(block.id, d); }} className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(block.id); }} className="p-0.5 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive" title="Remove">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Scheduler ──
const Scheduler = () => {
  const { scheduleBlocks, tasks, folders, createBlock, updateBlock, removeBlock, replaceBlocksForDate, setActiveFolder, setActiveView } = useFlux();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];
  const selectedDateStr = selectedDate.toISOString().split("T")[0];
  const isToday = selectedDateStr === todayStr;

  const blocks = useMemo(
    () => sortBlocksByTime(scheduleBlocks.filter((b) => b.scheduled_date === selectedDateStr)),
    [scheduleBlocks, selectedDateStr]
  );

  // Build lookup: block → folder info via task_id → task.folder_id → folder
  const blockFolderMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string | null; folderId: string }>();
    for (const block of blocks) {
      if (block.task_id) {
        const task = tasks.find((t) => t.id === block.task_id);
        if (task?.folder_id) {
          const folder = folders.find((f) => f.id === task.folder_id);
          if (folder) {
            map.set(block.id, { name: folder.title, color: folder.color, folderId: folder.id });
          }
        }
      }
    }
    return map;
  }, [blocks, tasks, folders]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editType, setEditType] = useState("deep");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newDuration, setNewDuration] = useState("30m");
  const [newType, setNewType] = useState("deep");
  const [, setTick] = useState(0);
  const [hoveredNow, setHoveredNow] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Auto-rollover: move unfinished past blocks to today
  useEffect(() => {
    const pastBlocks = scheduleBlocks.filter((b) => {
      if (b.scheduled_date >= todayStr) return false;
      // Check if linked task is still undone
      if (b.task_id) {
        const linkedTask = tasks.find((t) => t.id === b.task_id);
        if (linkedTask?.done) return false;
      }
      return true;
    });
    if (pastBlocks.length > 0) {
      pastBlocks.forEach((b) => updateBlock(b.id, { scheduled_date: todayStr }));
      toast(`${pastBlocks.length} ${t("sched.rolled_over") || "block(s) moved to today"}`, { duration: 4000 });
    }
  }, [todayStr]); // only run once per day

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const currentIdx = isToday ? getCurrentBlockIndex(blocks) : -1;
  const nowPercent = isToday ? getNowTopPercent(blocks) : null;
  const nowTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const startEdit = (block: DbScheduleBlock) => {
    setEditingId(block.id);
    setEditTitle(block.title);
    setEditTime(block.time);
    setEditDuration(block.duration);
    setEditType(block.type);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateBlock(editingId, { title: editTitle, time: snapTo15(editTime), duration: editDuration, type: editType });
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    const block = blocks.find((b) => b.id === id);
    await removeBlock(id);
    toast(t("sched.block_removed"), {
      action: block ? {
        label: t("toast.undo"),
        onClick: () => createBlock({ title: block.title, time: block.time, duration: block.duration, type: block.type, scheduled_date: block.scheduled_date }),
      } : undefined,
    });
  };

  const rescheduleBlock = async (id: string, date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    await updateBlock(id, { scheduled_date: dateStr });
    toast.success(`${t("sched.rescheduled")} ${formatShortDate(date)}`);
  };

  const addBlock = async () => {
    if (!newTitle.trim() || !newTime.trim()) return;
    await createBlock({
      title: newTitle.trim(),
      time: snapTo15(newTime),
      duration: newDuration || "30m",
      type: newType,
      scheduled_date: selectedDateStr,
    });
    setNewTitle(""); setNewTime(""); setNewDuration("30m"); setNewType("deep");
    setShowAddForm(false);
    toast.success(t("sched.block_added"));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeBlock = blocks.find((b) => b.id === active.id);
    const overBlock = blocks.find((b) => b.id === over.id);
    if (!activeBlock || !overBlock) return;

    // Swap times (snap to 15-min grid)
    const newTime = snapTo15(overBlock.time);
    await updateBlock(activeBlock.id, { time: newTime });
    toast.success(`${t("sched.moved_to")} ${newTime}`);
  };

  const handleAIPlan = async () => {
    setAiLoading(true);
    try {
      // Gather real user data: tasks due today/overdue/high-priority + notes/content
      const today = new Date().toISOString().split("T")[0];
      // Gather ALL undone user items — tasks, notes, everything
      const relevantItems = tasks
        .filter((t) => !t.done)
        .map((t) => ({
          id: t.id, title: t.title, priority: t.priority,
          due_date: t.due_date, type: t.type, content: t.content,
        }));

      if (relevantItems.length === 0) {
        toast(t("sched.no_tasks"), { duration: 4000 });
        setAiLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("flux-ai", {
        body: { type: "plan", messages: [], context: { tasks: relevantItems } },
      });
      if (error) throw error;
      if (data?.blocks && Array.isArray(data.blocks)) {
        const newBlocks = data.blocks.map((b: any) => ({
          title: b.title, time: b.time, duration: b.duration || "30m",
          type: b.type || "deep", scheduled_date: todayStr,
          task_id: b.task_id || null,
        }));
        await replaceBlocksForDate(todayStr, newBlocks);
        toast.success(t("sched.plan_ready"));
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to generate plan");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-y-auto py-6 px-4">
      <div className="flex items-center justify-between mb-1 px-1">
        <h2 className="text-sm font-semibold font-display text-foreground">
          {isToday ? t("sched.today") : format(selectedDate, "MMM d")}
        </h2>
        <div className="flex items-center gap-1">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button className="p-1.5 rounded-lg hover:bg-white/30 transition-colors text-muted-foreground hover:text-foreground" title={t("sched.pick_date")}>
                <CalendarIcon size={14} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={selectedDate} onSelect={(d) => { if (d) { setSelectedDate(d); setCalendarOpen(false); } }} className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          <button onClick={() => setShowAddForm(!showAddForm)} className="p-1.5 rounded-lg hover:bg-white/30 transition-colors text-muted-foreground hover:text-foreground" title={t("sched.add_block")}>
            <Plus size={14} />
          </button>
          {isToday && (
            <button onClick={handleAIPlan} disabled={aiLoading} className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary flex items-center gap-1 disabled:opacity-50" title={t("sched.auto_plan")}>
              <Sparkles size={14} className={aiLoading ? "animate-spin" : ""} />
            </button>
          )}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground mb-5 px-1">
        {selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
      </p>

      {/* Add form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4 px-1">
            <div className="rounded-xl px-3.5 py-3 bg-white/80 border border-border space-y-2">
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full text-sm font-medium bg-transparent outline-none border-b border-border pb-1" placeholder="Block title..." autoFocus />
              <div className="flex gap-2">
                <input value={newTime} onChange={(e) => setNewTime(e.target.value)} className="w-20 text-[11px] bg-transparent outline-none text-muted-foreground border-b border-border pb-1" placeholder="e.g. 10:30" />
                <input value={newDuration} onChange={(e) => setNewDuration(e.target.value)} className="w-16 text-[11px] bg-transparent outline-none text-muted-foreground border-b border-border pb-1" placeholder="30m" />
                <select value={newType} onChange={(e) => setNewType(e.target.value)} className="text-[11px] bg-transparent outline-none text-muted-foreground border-b border-border pb-1">
                  {typeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex gap-1.5">
                <button onClick={addBlock} className="p-1 rounded bg-primary/10 text-primary hover:bg-primary/20"><Check size={12} /></button>
                <button onClick={() => setShowAddForm(false)} className="p-1 rounded bg-secondary text-muted-foreground hover:bg-secondary/80"><X size={12} /></button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative" ref={containerRef}>
        <div className="absolute left-[7px] top-0 bottom-0 w-px bg-border" />

        {nowPercent !== null && (
          <div className="absolute -left-1 right-0 z-10 flex items-center" style={{ top: `${nowPercent}%` }}>
            <div
              className="w-4 h-4 rounded-full bg-destructive border-2 border-background shadow-sm cursor-pointer"
              onMouseEnter={() => setHoveredNow(true)}
              onMouseLeave={() => setHoveredNow(false)}
            />
            <div className="flex-1 h-px bg-destructive/60" />
            <AnimatePresence>
              {hoveredNow && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="absolute left-6 -top-7 glass-pill text-[10px] font-mono text-destructive px-2 py-0.5 whitespace-nowrap z-20">
                  {nowTime}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1">
              {blocks.map((block, index) => {
                const folderInfo = blockFolderMap.get(block.id);
                return (
                  <SortableBlock
                    key={block.id}
                    block={block}
                    index={index}
                    currentIdx={currentIdx}
                    isEditing={editingId === block.id}
                    onStartEdit={startEdit}
                    onDelete={handleDelete}
                    onReschedule={rescheduleBlock}
                    selectedDate={selectedDate}
                    editState={{ title: editTitle, time: editTime, duration: editDuration, type: editType }}
                    onEditChange={(field, value) => {
                      if (field === "title") setEditTitle(value);
                      else if (field === "time") setEditTime(value);
                      else if (field === "duration") setEditDuration(value);
                      else if (field === "type") setEditType(value);
                    }}
                    onSaveEdit={saveEdit}
                    onCancelEdit={() => setEditingId(null)}
                    folderName={folderInfo?.name}
                    folderColor={folderInfo?.color}
                    onBadgeClick={folderInfo ? () => { setActiveView("canvas"); setActiveFolder(folderInfo.folderId); } : undefined}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

        {blocks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <p>{t("sched.no_blocks")}</p>
            <button onClick={() => setShowAddForm(true)} className="text-primary hover:underline mt-1 text-xs">{t("sched.add_manual")}</button>
            {isToday && (
              <>
                <span className="mx-1 text-xs">{t("sched.or")}</span>
               <button onClick={handleAIPlan} disabled={aiLoading} className="text-primary hover:underline mt-1 text-xs">
                  {aiLoading ? t("sched.generating") : t("sched.auto_plan_link")}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Scheduler;
