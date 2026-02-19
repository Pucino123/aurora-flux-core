import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { trackWidgetToggle } from "@/hooks/useWidgetIntelligence";
export type TimerMode = "pomodoro" | "stopwatch" | "countdown";
export type TimerState = "idle" | "running" | "paused";
export type SystemMode = "focus" | "build" | "collaboration";

export interface BackgroundItem {
  id: string;
  url: string;
  type: "video" | "image" | "gradient";
  category: string;
  label: string;
  thumb?: string;
}

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type TaskTag = "Work" | "Personal" | "Urgent" | "Learning";

export interface BrainDumpTask {
  id: string;
  text: string;
  tag?: TaskTag;
}

interface FocusState {
  isZenMode: boolean;
  currentBackground: string;
  activeWidgets: string[];
  widgetPositions: Record<string, WidgetPosition>;
  audioVolumes: Record<string, number>;
  timerMode: TimerMode;
  goalText: string;
  spotifyUrl: string;
  brainDumpTasks: BrainDumpTask[];
  timeSlots: Record<string, string>;
  widgetOpacities: Record<string, number>;
  focusStickyNotes: { id: string; text: string; color: string; x: number; y: number; rotation: number; opacity: number }[];
  activeTaskId: string | null;
  taskTimeLog: Record<string, number>;
  quoteFontSize: number;
  widgetMinimalMode: boolean;
  clockFontSize: number;
  clockFont: string;
  clockColor: string;
  clockWeight: number;
  clockShowDate: boolean;
  clockShowSeconds: boolean;
  clockSecondaryTz: string;
  clockGlassEffect: boolean;
  clockDepthShadow: boolean;
  systemMode: SystemMode;
  desktopFolderPositions: Record<string, { x: number; y: number }>;
  desktopFolderOpacities: Record<string, number>;
  desktopFolderTitleSizes: Record<string, number>;
  desktopFolderIconFillOpacities: Record<string, number>;
  desktopFolderIconStrokeOpacities: Record<string, number>;
  desktopFolderCustomIcons: Record<string, string>;
  desktopFolderBgColors: Record<string, string>;
  // Document customization (mirrors folder pattern)
  desktopDocPositions: Record<string, { x: number; y: number }>;
  desktopDocOpacities: Record<string, number>;
  desktopDocTitleSizes: Record<string, number>;
  desktopDocBgColors: Record<string, string>;
  desktopDocCustomIcons: Record<string, string>;
  desktopDocIconColors: Record<string, string>;
}

const DEFAULT_STATE: FocusState = {
  isZenMode: false,
  currentBackground: "cozy-fireplace",
  activeWidgets: ["timer", "music", "planner"],
  widgetPositions: {},
  audioVolumes: {},
  timerMode: "pomodoro",
  goalText: "",
  spotifyUrl: "",
  brainDumpTasks: [],
  timeSlots: {},
  widgetOpacities: {},
  focusStickyNotes: [],
  activeTaskId: null,
  taskTimeLog: {},
  quoteFontSize: 14,
  widgetMinimalMode: false,
  clockFontSize: 60,
  clockFont: "inter",
  clockColor: "rgba(255,255,255,1)",
  clockWeight: 200,
  clockShowDate: true,
  clockShowSeconds: true,
  clockSecondaryTz: "",
  clockGlassEffect: false,
  clockDepthShadow: false,
  systemMode: "focus",
  desktopFolderPositions: {},
  desktopFolderOpacities: {},
  desktopFolderTitleSizes: {},
  desktopFolderIconFillOpacities: {},
  desktopFolderIconStrokeOpacities: {},
  desktopFolderCustomIcons: {},
  desktopFolderBgColors: {},
  desktopDocPositions: {},
  desktopDocOpacities: {},
  desktopDocTitleSizes: {},
  desktopDocBgColors: {},
  desktopDocCustomIcons: {},
  desktopDocIconColors: {},
};

const STORAGE_KEY = "flux-focus-prefs";

function loadState(): FocusState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const { widgetOpacity, ...rest } = parsed;
      const merged = { ...DEFAULT_STATE, ...rest };
      // Fix stale background IDs from removed catalogues
      if (merged.currentBackground && merged.currentBackground.startsWith("min-") ||
          merged.currentBackground?.startsWith("space-") ||
          merged.currentBackground?.startsWith("deep-") ||
          merged.currentBackground?.startsWith("cine-noir")) {
        merged.currentBackground = DEFAULT_STATE.currentBackground;
      }
      // Clear stale goal text that contains URLs
      if (merged.goalText && /^(https?:\/\/|www\.)/i.test(merged.goalText.trim())) {
        merged.goalText = "";
      }
      // Ensure numeric fields have valid values
      if (typeof merged.clockFontSize !== "number" || isNaN(merged.clockFontSize)) {
        merged.clockFontSize = DEFAULT_STATE.clockFontSize;
      }
      if (typeof merged.quoteFontSize !== "number" || isNaN(merged.quoteFontSize)) {
        merged.quoteFontSize = DEFAULT_STATE.quoteFontSize;
      }
      // Ensure sticky notes have opacity field
      if (Array.isArray(merged.focusStickyNotes)) {
        merged.focusStickyNotes = merged.focusStickyNotes.map((n: any) => ({
          ...n,
          opacity: typeof n.opacity === "number" ? n.opacity : 1,
        }));
      }
      // Sanitize breathing widget position
      const bp = merged.widgetPositions?.breathing;
      if (bp && (isNaN(bp.x) || isNaN(bp.y) || !isFinite(bp.x) || !isFinite(bp.y) || bp.x < -50 || bp.y < -50 || bp.x > 3000 || bp.y > 3000)) {
        delete merged.widgetPositions.breathing;
      }
      return merged;
    }
  } catch {}
  return DEFAULT_STATE;
}

interface FocusContextValue extends FocusState {
  setIsZenMode: (v: boolean) => void;
  setCurrentBackground: (id: string) => void;
  toggleWidget: (id: string) => void;
  updateWidgetPosition: (id: string, pos: Partial<WidgetPosition>) => void;
  setVolume: (key: string, vol: number) => void;
  setTimerMode: (m: TimerMode) => void;
  setGoalText: (t: string) => void;
  setSpotifyUrl: (u: string) => void;
  setBrainDumpTasks: (tasks: BrainDumpTask[]) => void;
  setTimeSlots: (slots: Record<string, string>) => void;
  getWidgetOpacity: (id: string) => number;
  setWidgetOpacity: (id: string, v: number) => void;
  setFocusStickyNotes: (notes: { id: string; text: string; color: string; x: number; y: number; rotation: number; opacity: number }[]) => void;
  setActiveTaskId: (id: string | null) => void;
  logTaskTime: (taskId: string, minutes: number) => void;
  setQuoteFontSize: (size: number) => void;
  setWidgetMinimalMode: (v: boolean) => void;
  setClockFontSize: (size: number) => void;
  setClockFont: (v: string) => void;
  setClockColor: (v: string) => void;
  setClockWeight: (v: number) => void;
  setClockShowDate: (v: boolean) => void;
  setClockShowSeconds: (v: boolean) => void;
  setClockSecondaryTz: (v: string) => void;
  setClockGlassEffect: (v: boolean) => void;
  setClockDepthShadow: (v: boolean) => void;
  setSystemMode: (m: SystemMode) => void;
  desktopFolderPositions: Record<string, { x: number; y: number }>;
  updateDesktopFolderPosition: (folderId: string, pos: { x: number; y: number }) => void;
  desktopFolderOpacities: Record<string, number>;
  updateDesktopFolderOpacity: (folderId: string, opacity: number) => void;
  desktopFolderTitleSizes: Record<string, number>;
  updateDesktopFolderTitleSize: (folderId: string, size: number) => void;
  desktopFolderIconFillOpacities: Record<string, number>;
  updateDesktopFolderIconFillOpacity: (folderId: string, v: number) => void;
  desktopFolderIconStrokeOpacities: Record<string, number>;
  updateDesktopFolderIconStrokeOpacity: (folderId: string, v: number) => void;
  desktopFolderCustomIcons: Record<string, string>;
  updateDesktopFolderCustomIcon: (folderId: string, url: string) => void;
  desktopFolderBgColors: Record<string, string>;
  updateDesktopFolderBgColor: (folderId: string, color: string) => void;
  // Document customization
  desktopDocPositions: Record<string, { x: number; y: number }>;
  updateDesktopDocPosition: (docId: string, pos: { x: number; y: number }) => void;
  desktopDocOpacities: Record<string, number>;
  updateDesktopDocOpacity: (docId: string, opacity: number) => void;
  desktopDocTitleSizes: Record<string, number>;
  updateDesktopDocTitleSize: (docId: string, size: number) => void;
  desktopDocBgColors: Record<string, string>;
  updateDesktopDocBgColor: (docId: string, color: string) => void;
  desktopDocCustomIcons: Record<string, string>;
  updateDesktopDocCustomIcon: (docId: string, url: string) => void;
  desktopDocIconColors: Record<string, string>;
  updateDesktopDocIconColor: (docId: string, color: string) => void;
  resetDashboard: () => void;
}

const FocusContext = createContext<FocusContextValue | null>(null);

export function FocusProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FocusState>(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const update = useCallback((partial: Partial<FocusState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const value: FocusContextValue = {
    ...state,
    setIsZenMode: (v) => update({ isZenMode: v }),
    setCurrentBackground: (id) => update({ currentBackground: id }),
    toggleWidget: (id) => {
      trackWidgetToggle(id);
      setState((prev) => ({
        ...prev,
        activeWidgets: prev.activeWidgets.includes(id)
          ? prev.activeWidgets.filter((w) => w !== id)
          : [...prev.activeWidgets, id],
      }));
    },
    updateWidgetPosition: (id, pos) =>
      setState((prev) => ({
        ...prev,
        widgetPositions: {
          ...prev.widgetPositions,
          [id]: { ...(prev.widgetPositions[id] || { x: 0, y: 0, w: 400, h: 300 }), ...pos },
        },
      })),
    setVolume: (key, vol) =>
      setState((prev) => ({ ...prev, audioVolumes: { ...prev.audioVolumes, [key]: vol } })),
    setTimerMode: (m) => update({ timerMode: m }),
    setGoalText: (t) => update({ goalText: t }),
    setSpotifyUrl: (u) => update({ spotifyUrl: u }),
    setBrainDumpTasks: (tasks) => update({ brainDumpTasks: tasks }),
    setTimeSlots: (slots) => update({ timeSlots: slots }),
    getWidgetOpacity: (id: string) => state.widgetOpacities[id] ?? 0,
    setWidgetOpacity: (id: string, v: number) =>
      setState((prev) => ({
        ...prev,
        widgetOpacities: { ...prev.widgetOpacities, [id]: v },
      })),
    setFocusStickyNotes: (notes) => update({ focusStickyNotes: notes }),
    setActiveTaskId: (id) => update({ activeTaskId: id }),
    logTaskTime: (taskId, minutes) =>
      setState((prev) => ({
        ...prev,
        taskTimeLog: {
          ...prev.taskTimeLog,
          [taskId]: (prev.taskTimeLog[taskId] || 0) + minutes,
        },
      })),
    setQuoteFontSize: (size) => update({ quoteFontSize: size }),
    setWidgetMinimalMode: (v) => update({ widgetMinimalMode: v }),
    setClockFontSize: (size) => update({ clockFontSize: size }),
    setClockFont: (v) => update({ clockFont: v }),
    setClockColor: (v) => update({ clockColor: v }),
    setClockWeight: (v) => update({ clockWeight: v }),
    setClockShowDate: (v) => update({ clockShowDate: v }),
    setClockShowSeconds: (v) => update({ clockShowSeconds: v }),
    setClockSecondaryTz: (v) => update({ clockSecondaryTz: v }),
    setClockGlassEffect: (v) => update({ clockGlassEffect: v }),
    setClockDepthShadow: (v) => update({ clockDepthShadow: v }),
    setSystemMode: (m) => update({ systemMode: m }),
    desktopFolderPositions: state.desktopFolderPositions,
    updateDesktopFolderPosition: (folderId, pos) =>
      setState((prev) => ({
        ...prev,
        desktopFolderPositions: { ...prev.desktopFolderPositions, [folderId]: pos },
      })),
    desktopFolderOpacities: state.desktopFolderOpacities,
    updateDesktopFolderOpacity: (folderId, opacity) =>
      setState((prev) => ({
        ...prev,
        desktopFolderOpacities: { ...prev.desktopFolderOpacities, [folderId]: opacity },
      })),
    desktopFolderTitleSizes: state.desktopFolderTitleSizes ?? {},
    updateDesktopFolderTitleSize: (folderId, size) =>
      setState((prev) => ({
        ...prev,
        desktopFolderTitleSizes: { ...(prev.desktopFolderTitleSizes ?? {}), [folderId]: size },
      })),
    desktopFolderIconFillOpacities: state.desktopFolderIconFillOpacities ?? {},
    updateDesktopFolderIconFillOpacity: (folderId, v) =>
      setState((prev) => ({
        ...prev,
        desktopFolderIconFillOpacities: { ...(prev.desktopFolderIconFillOpacities ?? {}), [folderId]: v },
      })),
    desktopFolderIconStrokeOpacities: state.desktopFolderIconStrokeOpacities ?? {},
    updateDesktopFolderIconStrokeOpacity: (folderId, v) =>
      setState((prev) => ({
        ...prev,
        desktopFolderIconStrokeOpacities: { ...(prev.desktopFolderIconStrokeOpacities ?? {}), [folderId]: v },
      })),
    desktopFolderCustomIcons: state.desktopFolderCustomIcons ?? {},
    updateDesktopFolderCustomIcon: (folderId, url) =>
      setState((prev) => ({
        ...prev,
        desktopFolderCustomIcons: { ...(prev.desktopFolderCustomIcons ?? {}), [folderId]: url },
      })),
    desktopFolderBgColors: state.desktopFolderBgColors ?? {},
    updateDesktopFolderBgColor: (folderId, color) =>
      setState((prev) => ({
        ...prev,
        desktopFolderBgColors: { ...(prev.desktopFolderBgColors ?? {}), [folderId]: color },
      })),
    // Document customization
    desktopDocPositions: state.desktopDocPositions ?? {},
    updateDesktopDocPosition: (docId, pos) =>
      setState((prev) => ({ ...prev, desktopDocPositions: { ...(prev.desktopDocPositions ?? {}), [docId]: pos } })),
    desktopDocOpacities: state.desktopDocOpacities ?? {},
    updateDesktopDocOpacity: (docId, opacity) =>
      setState((prev) => ({ ...prev, desktopDocOpacities: { ...(prev.desktopDocOpacities ?? {}), [docId]: opacity } })),
    desktopDocTitleSizes: state.desktopDocTitleSizes ?? {},
    updateDesktopDocTitleSize: (docId, size) =>
      setState((prev) => ({ ...prev, desktopDocTitleSizes: { ...(prev.desktopDocTitleSizes ?? {}), [docId]: size } })),
    desktopDocBgColors: state.desktopDocBgColors ?? {},
    updateDesktopDocBgColor: (docId, color) =>
      setState((prev) => ({ ...prev, desktopDocBgColors: { ...(prev.desktopDocBgColors ?? {}), [docId]: color } })),
    desktopDocCustomIcons: state.desktopDocCustomIcons ?? {},
    updateDesktopDocCustomIcon: (docId, url) =>
      setState((prev) => ({ ...prev, desktopDocCustomIcons: { ...(prev.desktopDocCustomIcons ?? {}), [docId]: url } })),
    desktopDocIconColors: state.desktopDocIconColors ?? {},
    updateDesktopDocIconColor: (docId, color) =>
      setState((prev) => ({ ...prev, desktopDocIconColors: { ...(prev.desktopDocIconColors ?? {}), [docId]: color } })),
    resetDashboard: () => setState({
      ...DEFAULT_STATE,
      currentBackground: state.currentBackground,
    }),
  };

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

export function useFocusStore() {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error("useFocusStore must be used within FocusProvider");
  return ctx;
}
