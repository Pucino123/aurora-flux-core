import React, { useState } from "react";
import { Plus, ChevronDown, ChevronRight, Calendar, Circle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Milestone {
  id: string;
  title: string;
  done: boolean;
}

interface Project {
  id: string;
  title: string;
  status: "planning" | "in-progress" | "completed" | "delayed";
  deadline: string;
  milestones: Milestone[];
}

const STATUS_CONFIG = {
  planning: { label: "Planning", color: "text-white/40", bg: "bg-white/8", dot: "bg-white/30" },
  "in-progress": { label: "In Progress", color: "text-blue-300", bg: "bg-blue-400/10", dot: "bg-blue-400" },
  completed: { label: "Completed", color: "text-emerald-300", bg: "bg-emerald-400/10", dot: "bg-emerald-400" },
  delayed: { label: "Delayed", color: "text-rose-300", bg: "bg-rose-400/10", dot: "bg-rose-400" },
};

const INITIAL_PROJECTS: Project[] = [
  {
    id: "1", title: "Mobile App Redesign", status: "in-progress", deadline: "Mar 28",
    milestones: [
      { id: "m1", title: "Wireframes approved", done: true },
      { id: "m2", title: "Design system updated", done: true },
      { id: "m3", title: "Prototype testing", done: false },
    ],
  },
  {
    id: "2", title: "API v3 Migration", status: "in-progress", deadline: "Apr 5",
    milestones: [
      { id: "m4", title: "Endpoints documented", done: true },
      { id: "m5", title: "Auth layer migrated", done: false },
      { id: "m6", title: "Load testing passed", done: false },
    ],
  },
  {
    id: "3", title: "Q1 Marketing Launch", status: "completed", deadline: "Mar 1",
    milestones: [
      { id: "m7", title: "Assets delivered", done: true },
      { id: "m8", title: "Campaign live", done: true },
      { id: "m9", title: "Analytics set up", done: true },
    ],
  },
  {
    id: "4", title: "Infrastructure Upgrade", status: "planning", deadline: "May 15",
    milestones: [
      { id: "m10", title: "Vendor selected", done: false },
      { id: "m11", title: "Migration plan drafted", done: false },
    ],
  },
];

type FilterType = "all" | "in-progress" | "completed" | "delayed";

const ProjectTrackerWidget = () => {
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [expanded, setExpanded] = useState<string | null>("1");
  const [filter, setFilter] = useState<FilterType>("all");

  const toggleMilestone = (projId: string, mId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projId) return p;
      return { ...p, milestones: p.milestones.map(m => m.id === mId ? { ...m, done: !m.done } : m) };
    }));
  };

  const getProgress = (p: Project) => {
    if (p.milestones.length === 0) return 0;
    return Math.round((p.milestones.filter(m => m.done).length / p.milestones.length) * 100);
  };

  const filtered = projects.filter(p => filter === "all" || p.status === filter);

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "in-progress", label: "Active" },
    { key: "completed", label: "Done" },
    { key: "delayed", label: "Delayed" },
  ];

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      {/* Filter tabs */}
      <div className="flex items-center gap-1 shrink-0">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
              filter === f.key ? "bg-white/15 text-white/90" : "text-white/30 hover:text-white/60"
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="ml-auto">
          <button className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all text-white/50">
            <Plus size={11} />
          </button>
        </div>
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto council-hidden-scrollbar space-y-2">
        {filtered.map(p => {
          const cfg = STATUS_CONFIG[p.status];
          const pct = getProgress(p);
          const isOpen = expanded === p.id;

          return (
            <div key={p.id} className="rounded-2xl border bg-white/5 border-white/8 overflow-hidden">
              {/* Card header */}
              <button
                onClick={() => setExpanded(isOpen ? null : p.id)}
                className="w-full flex items-start gap-2 p-3 hover:bg-white/4 transition-all text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color} flex items-center gap-1`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                    <div className="flex items-center gap-1 ml-auto text-[9px] text-white/30">
                      <Calendar size={8} />
                      <span>{p.deadline}</span>
                    </div>
                  </div>
                  <p className="text-[12px] font-semibold text-white/90 leading-tight truncate">{p.title}</p>

                  {/* Progress bar */}
                  <div className="mt-2">
                    <div className="flex justify-between text-[9px] text-white/30 mb-1">
                      <span>{p.milestones.filter(m => m.done).length}/{p.milestones.length} milestones</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-white/8 overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${
                          p.status === "completed" ? "bg-emerald-400"
                          : p.status === "delayed" ? "bg-rose-400"
                          : "bg-blue-400"
                        }`}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                </div>
                <div className="shrink-0 mt-0.5 text-white/30">
                  {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </div>
              </button>

              {/* Milestones */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-1.5 border-t border-white/5 pt-2">
                      {p.milestones.map(m => (
                        <button
                          key={m.id}
                          onClick={() => toggleMilestone(p.id, m.id)}
                          className="flex items-center gap-2 w-full group"
                        >
                          {m.done ? (
                            <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                          ) : (
                            <Circle size={13} className="text-white/20 group-hover:text-white/40 transition-colors shrink-0" />
                          )}
                          <span className={`text-[11px] text-left transition-all ${m.done ? "text-white/30 line-through" : "text-white/70"}`}>
                            {m.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProjectTrackerWidget;
