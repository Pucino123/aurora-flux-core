import React from "react";
import DraggableWidget from "./DraggableWidget";
import { BudgetPreviewWidget, SavingsRingWidget } from "@/components/widgets/FinanceWidget";
import { WeeklyWorkoutWidget } from "@/components/widgets/FitnessWidget";
import { Top5TasksWidget, ProjectStatusWidget } from "@/components/widgets/ProductivityWidget";
import SmartPlanWidget from "@/components/widgets/SmartPlanWidget";
import GamificationCard from "@/components/GamificationCard";
import BudgetWidget from "@/components/BudgetWidget";
import CRMWidget from "./CRMWidget";
import { useTeamChat } from "@/hooks/useTeamChat";
import { useAuth } from "@/hooks/useAuth";
import { useState, useRef, useCallback, useEffect } from "react";

/* ── Budget Widget (full interactive) ── */
export const FocusBudgetWidget = () => (
  <DraggableWidget id="budget-preview" title="Budget" defaultPosition={{ x: 60, y: 400 }} defaultSize={{ w: 420, h: 520 }} scrollable>
    <BudgetWidget />
  </DraggableWidget>
);

/* ── Savings Ring ── */
export const FocusSavingsWidget = () => (
  <DraggableWidget id="savings-ring" title="Savings" defaultPosition={{ x: 420, y: 400 }} defaultSize={{ w: 360, h: 480 }}>
    <SavingsRingWidget />
  </DraggableWidget>
);

/* ── Weekly Workout ── */
export const FocusWorkoutWidget = () => (
  <DraggableWidget id="weekly-workout" title="Workout" defaultPosition={{ x: 740, y: 400 }} defaultSize={{ w: 380, h: 480 }} scrollable>
    <WeeklyWorkoutWidget />
  </DraggableWidget>
);

/* ── Project Status ── */
export const FocusProjectStatusWidget = () => (
  <DraggableWidget id="project-status" title="Projects" defaultPosition={{ x: 740, y: 60 }} defaultSize={{ w: 380, h: 480 }} scrollable>
    <ProjectStatusWidget />
  </DraggableWidget>
);

/* ── Top Tasks ── */
export const FocusTopTasksWidget = () => (
  <DraggableWidget id="top-tasks" title="Tasks" defaultPosition={{ x: 60, y: 300 }} defaultSize={{ w: 380, h: 480 }} scrollable>
    <Top5TasksWidget />
  </DraggableWidget>
);

/* ── Smart Plan ── */
export const FocusSmartPlanWidget = () => (
  <DraggableWidget id="smart-plan" title="Smart Plan" defaultPosition={{ x: 420, y: 60 }} defaultSize={{ w: 400, h: 480 }} scrollable>
    <SmartPlanWidget />
  </DraggableWidget>
);

/* ── Gamification ── */
export const FocusGamificationWidget = () => (
  <DraggableWidget id="gamification" title="Streaks" defaultPosition={{ x: 740, y: 300 }} defaultSize={{ w: 360, h: 480 }} scrollable>
    <GamificationCard />
  </DraggableWidget>
);

/* ── CRM Pipeline ── */
export const FocusCRMWidget = () => <CRMWidget />;

