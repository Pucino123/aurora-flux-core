import React, { useState } from "react";
import { Plus, X, GripVertical, Play, Square } from "lucide-react";
import { useFocusStore, TaskTag } from "@/context/FocusContext";
import DraggableWidget from "./DraggableWidget";

const HOURS = Array.from({ length: 13 }, (_, i) => { const h = i + 8; return `${h.toString().padStart(2, "0")}:00`; });

const TAG_OPTIONS: { key: TaskTag; label: string; color: string }[] = [
  { key: "Work", label: "Work", color: "bg-blue-400" },
  { key: "Personal", label: "Personal", color: "bg-emerald-400" },
  { key: "Urgent", label: "Urgent", color: "bg-red-400" },
  { key: "Learning", label: "Learning", color: "bg-purple-400" },
];

const TAG_COLORS: Record<string, string> = {
  Work: "bg-blue-400/20 text-blue-300", Personal: "bg-emerald-400/20 text-emerald-300",
  Urgent: "bg-red-400/20 text-red-300", Learning: "bg-purple-400/20 text-purple-300",
};

const TimeBoxPlanner = () => {
  const { brainDumpTasks, setBrainDumpTasks, timeSlots, setTimeSlots, activeTaskId, setActiveTaskId, taskTimeLog } = useFocusStore();
  const [input, setInput] = useState("");
  const [selectedTag, setSelectedTag] = useState<TaskTag | undefined>();
  const [draggedTask, setDraggedTask] = useState<string | null>(null);

  const addTask = () => { if (!input.trim()) return; setBrainDumpTasks([...brainDumpTasks, { id: crypto.randomUUID(), text: input.trim(), tag: selectedTag }]); setInput(""); setSelectedTag(undefined); };
  const removeTask = (id: string) => { setBrainDumpTasks(brainDumpTasks.filter((t) => t.id !== id)); if (activeTaskId === id) setActiveTaskId(null); const newSlots = { ...timeSlots }; Object.entries(newSlots).forEach(([hour, taskId]) => { if (taskId === id) delete newSlots[hour]; }); setTimeSlots(newSlots); };
  const removeFromSlot = (hour: string) => { const newSlots = { ...timeSlots }; delete newSlots[hour]; setTimeSlots(newSlots); };
  const handleDrop = (hour: string) => { if (draggedTask) { setTimeSlots({ ...timeSlots, [hour]: draggedTask }); setDraggedTask(null); } };
  const getTask = (id: string) => brainDumpTasks.find((t) => t.id === id);

  return (
    <DraggableWidget id="planner" title="TimeBox Planner"
      defaultPosition={{ x: typeof window !== "undefined" ? window.innerWidth - 440 : 800, y: 80 }}
      defaultSize={{ w: 420, h: 520 }}>
      <div className="flex gap-3 h-full">
        <div className="w-1/2 flex flex-col gap-2">
          <h3 className="text-[11px] uppercase tracking-wider text-white/40 font-medium">Brain Dump</h3>
          <div className="flex gap-1.5">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} placeholder="Add task..."
              className="flex-1 bg-white/5 border border-white/15 rounded-lg text-white text-xs px-2.5 py-1.5 placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-white/30" />
            <button onClick={addTask} className="p-1.5 rounded-lg bg-white/10 border border-white/15 text-white/60 hover:text-white hover:bg-white/15 transition-all"><Plus size={14} /></button>
          </div>
          <div className="flex gap-1">
            {TAG_OPTIONS.map((t) => (
              <button key={t.key} onClick={() => setSelectedTag(selectedTag === t.key ? undefined : t.key)}
                className={`w-4 h-4 rounded-full border-2 transition-all ${t.color} ${selectedTag === t.key ? "border-white scale-125" : "border-transparent opacity-50 hover:opacity-80"}`} title={t.label} />
            ))}
          </div>
          <div className="flex-1 overflow-auto space-y-1">
            {brainDumpTasks.map((task) => {
              const isActive = activeTaskId === task.id;
              const logged = taskTimeLog[task.id];
              return (
                <div key={task.id} draggable onDragStart={() => setDraggedTask(task.id)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs cursor-grab active:cursor-grabbing transition-all group ${isActive ? "bg-white/15 border-white/30" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
                  <button onClick={() => setActiveTaskId(isActive ? null : task.id)} className="shrink-0 text-white/40 hover:text-white/80 transition-colors">{isActive ? <Square size={11} /> : <Play size={11} />}</button>
                  <GripVertical size={12} className="text-white/20 shrink-0" />
                  {task.tag && <span className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 ${TAG_COLORS[task.tag]}`}>{task.tag}</span>}
                  <span className="flex-1 truncate text-white/70">{task.text}</span>
                  {logged && logged > 0 && <span className="text-[9px] text-white/30 shrink-0">{logged}m</span>}
                  <button onClick={() => removeTask(task.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-white/30 hover:text-white/70 transition-all"><X size={10} /></button>
                </div>
              );
            })}
          </div>
        </div>
        <div className="w-1/2 flex flex-col gap-2">
          <h3 className="text-[11px] uppercase tracking-wider text-white/40 font-medium">Timeline</h3>
          <div className="flex-1 overflow-auto space-y-0.5">
            {HOURS.map((hour) => {
              const taskId = timeSlots[hour]; const task = taskId ? getTask(taskId) : null;
              return (
                <div key={hour} onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(hour)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all min-h-[32px] ${taskId ? "bg-[hsl(var(--aurora-violet)/0.15)] border-[hsl(var(--aurora-violet)/0.3)]" : "bg-white/3 border-white/5 border-dashed hover:border-white/15"}`}>
                  <span className="text-[10px] text-white/30 font-mono w-10 shrink-0">{hour}</span>
                  {task ? (
                    <div className="flex-1 flex items-center gap-1.5">
                      {task.tag && <span className={`text-[8px] px-1 py-0.5 rounded-full shrink-0 ${TAG_COLORS[task.tag]}`}>{task.tag}</span>}
                      <span className="text-xs text-white/70 truncate flex-1">{task.text}</span>
                      <button onClick={() => removeFromSlot(hour)} className="p-0.5 text-white/30 hover:text-white/70 transition-all"><X size={10} /></button>
                    </div>
                  ) : <span className="text-[10px] text-white/10">Drop task here</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DraggableWidget>
  );
};

export default TimeBoxPlanner;
