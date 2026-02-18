import React from "react";
import DraggableWidget from "./DraggableWidget";
import { BudgetPreviewWidget, SavingsRingWidget } from "@/components/widgets/FinanceWidget";
import { WeeklyWorkoutWidget } from "@/components/widgets/FitnessWidget";
import { Top5TasksWidget, ProjectStatusWidget } from "@/components/widgets/ProductivityWidget";
import SmartPlanWidget from "@/components/widgets/SmartPlanWidget";
import GamificationCard from "@/components/GamificationCard";
import { useTeamChat } from "@/hooks/useTeamChat";
import { useAuth } from "@/hooks/useAuth";
import { useState, useRef, useCallback, useEffect } from "react";

/* ── Budget Preview ── */
export const FocusBudgetWidget = () => (
  <DraggableWidget id="budget-preview" title="Budget" defaultPosition={{ x: 60, y: 400 }} defaultSize={{ w: 340, h: 280 }} scrollable>
    <BudgetPreviewWidget />
  </DraggableWidget>
);

/* ── Savings Ring ── */
export const FocusSavingsWidget = () => (
  <DraggableWidget id="savings-ring" title="Savings" defaultPosition={{ x: 420, y: 400 }} defaultSize={{ w: 300, h: 260 }}>
    <SavingsRingWidget />
  </DraggableWidget>
);

/* ── Weekly Workout ── */
export const FocusWorkoutWidget = () => (
  <DraggableWidget id="weekly-workout" title="Workout" defaultPosition={{ x: 740, y: 400 }} defaultSize={{ w: 340, h: 280 }} scrollable>
    <WeeklyWorkoutWidget />
  </DraggableWidget>
);

/* ── Project Status ── */
export const FocusProjectStatusWidget = () => (
  <DraggableWidget id="project-status" title="Projects" defaultPosition={{ x: 740, y: 60 }} defaultSize={{ w: 340, h: 280 }} scrollable>
    <ProjectStatusWidget />
  </DraggableWidget>
);

/* ── Top Tasks ── */
export const FocusTopTasksWidget = () => (
  <DraggableWidget id="top-tasks" title="Tasks" defaultPosition={{ x: 60, y: 300 }} defaultSize={{ w: 340, h: 320 }} scrollable>
    <Top5TasksWidget />
  </DraggableWidget>
);

/* ── Smart Plan ── */
export const FocusSmartPlanWidget = () => (
  <DraggableWidget id="smart-plan" title="Smart Plan" defaultPosition={{ x: 420, y: 60 }} defaultSize={{ w: 380, h: 320 }} scrollable>
    <SmartPlanWidget />
  </DraggableWidget>
);

/* ── Gamification ── */
export const FocusGamificationWidget = () => (
  <DraggableWidget id="gamification" title="Streaks" defaultPosition={{ x: 740, y: 300 }} defaultSize={{ w: 340, h: 260 }} scrollable>
    <GamificationCard />
  </DraggableWidget>
);

/* ── Chat Widget ── */
export const FocusChatWidget = () => {
  const { user } = useAuth();
  const { teams, activeTeamId, setActiveTeamId, messages, sendMessage, onlineUsers } = useTeamChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const handleSend = useCallback(() => { if (!input.trim()) return; sendMessage(input.trim()); setInput(""); }, [input, sendMessage]);

  if (teams.length === 0) {
    return (
      <DraggableWidget id="chat" title="Chat" defaultPosition={{ x: 740, y: 60 }} defaultSize={{ w: 340, h: 380 }} scrollable>
        <div className="flex flex-col items-center justify-center h-full text-white/30 text-xs gap-2"><p>No teams yet</p><p className="text-[10px] text-white/20">Join a team to start chatting</p></div>
      </DraggableWidget>
    );
  }

  return (
    <DraggableWidget id="chat" title={`Chat${activeTeamId ? ` · ${teams.find(t => t.id === activeTeamId)?.name || ''}` : ''}`} defaultPosition={{ x: 740, y: 60 }} defaultSize={{ w: 340, h: 380 }}>
      <div className="flex flex-col h-full -mx-3 -my-2">
        {teams.length > 1 && (
          <div className="flex gap-1 px-3 pt-2 pb-1 border-b border-white/10">
            {teams.map(t => <button key={t.id} onClick={() => setActiveTeamId(t.id)} className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${activeTeamId === t.id ? "bg-white/15 text-white" : "text-white/30 hover:text-white/60"}`}>{t.name}</button>)}
          </div>
        )}
        {onlineUsers.length > 0 && (
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-white/5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><span className="text-[9px] text-white/30">{onlineUsers.length} online</span></div>
        )}
        <div ref={scrollRef} className="flex-1 overflow-y-auto council-hidden-scrollbar px-3 py-2 space-y-2">
          {messages.map(msg => (
            <div key={msg.id} className={`flex flex-col ${msg.user_id === user?.id ? "items-end" : "items-start"}`}>
              <div className={`max-w-[80%] px-3 py-1.5 rounded-xl text-xs ${msg.user_id === user?.id ? "bg-white/15 text-white" : "bg-white/5 text-white/70"}`}>{msg.content}</div>
              <span className="text-[8px] text-white/20 mt-0.5 px-1">{new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          ))}
        </div>
        <div className="px-3 py-2 border-t border-white/10">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()} placeholder="Message..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-white/20" />
        </div>
      </div>
    </DraggableWidget>
  );
};
