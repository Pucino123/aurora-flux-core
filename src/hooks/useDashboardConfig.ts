import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ResponsiveLayouts } from "react-grid-layout";

const DEFAULT_ACTIVE_WIDGETS = [
  "smart-plan", "top-tasks", "savings-ring",
  "budget-preview", "weekly-workout", "gamification",
  "project-status", "recent-notes",
];

// Default grid layout for new users — provides a polished starting experience
const DEFAULT_LAYOUTS = {
  lg: [
    { i: "smart-plan",      x: 0, y: 0, w: 4, h: 6, minW: 3, minH: 4 },
    { i: "top-tasks",       x: 4, y: 0, w: 4, h: 6, minW: 3, minH: 4 },
    { i: "savings-ring",    x: 8, y: 0, w: 4, h: 6, minW: 3, minH: 4 },
    { i: "budget-preview",  x: 0, y: 6, w: 4, h: 6, minW: 3, minH: 4 },
    { i: "weekly-workout",  x: 4, y: 6, w: 4, h: 6, minW: 3, minH: 4 },
    { i: "gamification",    x: 8, y: 6, w: 4, h: 6, minW: 3, minH: 4 },
    { i: "project-status",  x: 0, y: 12, w: 6, h: 6, minW: 3, minH: 4 },
    { i: "recent-notes",    x: 6, y: 12, w: 6, h: 6, minW: 3, minH: 4 },
  ],
  md: [
    { i: "smart-plan",      x: 0, y: 0,  w: 5, h: 6 },
    { i: "top-tasks",       x: 5, y: 0,  w: 5, h: 6 },
    { i: "savings-ring",    x: 0, y: 6,  w: 5, h: 6 },
    { i: "budget-preview",  x: 5, y: 6,  w: 5, h: 6 },
    { i: "weekly-workout",  x: 0, y: 12, w: 5, h: 6 },
    { i: "gamification",    x: 5, y: 12, w: 5, h: 6 },
    { i: "project-status",  x: 0, y: 18, w: 10, h: 6 },
    { i: "recent-notes",    x: 0, y: 24, w: 10, h: 6 },
  ],
  sm: [
    { i: "smart-plan",      x: 0, y: 0,  w: 6, h: 5 },
    { i: "top-tasks",       x: 0, y: 5,  w: 6, h: 5 },
    { i: "savings-ring",    x: 0, y: 10, w: 6, h: 5 },
    { i: "budget-preview",  x: 0, y: 15, w: 6, h: 5 },
    { i: "weekly-workout",  x: 0, y: 20, w: 6, h: 5 },
    { i: "gamification",    x: 0, y: 25, w: 6, h: 5 },
    { i: "project-status",  x: 0, y: 30, w: 6, h: 5 },
    { i: "recent-notes",    x: 0, y: 35, w: 6, h: 5 },
  ],
  xs: [
    { i: "smart-plan",      x: 0, y: 0,  w: 4, h: 5 },
    { i: "top-tasks",       x: 0, y: 5,  w: 4, h: 5 },
    { i: "savings-ring",    x: 0, y: 10, w: 4, h: 5 },
    { i: "budget-preview",  x: 0, y: 15, w: 4, h: 5 },
    { i: "weekly-workout",  x: 0, y: 20, w: 4, h: 5 },
    { i: "gamification",    x: 0, y: 25, w: 4, h: 5 },
    { i: "project-status",  x: 0, y: 30, w: 4, h: 5 },
    { i: "recent-notes",    x: 0, y: 35, w: 4, h: 5 },
  ],
  xxs: [
    { i: "smart-plan",      x: 0, y: 0,  w: 2, h: 5 },
    { i: "top-tasks",       x: 0, y: 5,  w: 2, h: 5 },
    { i: "savings-ring",    x: 0, y: 10, w: 2, h: 5 },
    { i: "budget-preview",  x: 0, y: 15, w: 2, h: 5 },
    { i: "weekly-workout",  x: 0, y: 20, w: 2, h: 5 },
    { i: "gamification",    x: 0, y: 25, w: 2, h: 5 },
    { i: "project-status",  x: 0, y: 30, w: 2, h: 5 },
    { i: "recent-notes",    x: 0, y: 35, w: 2, h: 5 },
  ],
};

interface DashboardConfig {
  activeWidgets: string[];
  widgetNames: Record<string, string>;
  layouts: ResponsiveLayouts | null;
  stickyNotes: Array<{ id: string; text: string; color: string }>;
}

const LOCAL_STORAGE_KEY = "flux-dashboard-config";

const DEFAULT_CONFIG: DashboardConfig = {
  activeWidgets: DEFAULT_ACTIVE_WIDGETS,
  widgetNames: {},
  layouts: DEFAULT_LAYOUTS as unknown as ResponsiveLayouts,
  stickyNotes: [],
};

function loadLocalCache(): DashboardConfig | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveLocalCache(config: DashboardConfig) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
  } catch {}
}

export function useDashboardConfig() {
  const { user } = useAuth();
  const [config, setConfig] = useState<DashboardConfig>(() => loadLocalCache() || DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref so visibilitychange handler always has latest config without stale closure
  const configRef = useRef(config);
  useEffect(() => { configRef.current = config; }, [config]);

  // Load from profile settings
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("settings")
        .eq("id", user.id)
        .single();

      if (data?.settings) {
        const s = data.settings as Record<string, any>;
        if (s.dashboard_config) {
          const loaded: DashboardConfig = {
            activeWidgets: s.dashboard_config.activeWidgets || DEFAULT_ACTIVE_WIDGETS,
            widgetNames: s.dashboard_config.widgetNames || {},
            layouts: s.dashboard_config.layouts || null,
            stickyNotes: s.dashboard_config.stickyNotes || [],
          };
          setConfig(loaded);
          saveLocalCache(loaded);
        }
      }
      setLoaded(true);
    })();
  }, [user]);

  // Core flush to DB (no debounce)
  const flushConfigToDb = useCallback(async (newConfig: DashboardConfig) => {
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("settings")
      .eq("id", user.id)
      .single();
    const currentSettings = (profile?.settings as Record<string, any>) || {};
    await supabase
      .from("profiles")
      .update({
        settings: {
          ...currentSettings,
          dashboard_config: {
            activeWidgets: newConfig.activeWidgets,
            widgetNames: newConfig.widgetNames,
            layouts: newConfig.layouts as any,
            stickyNotes: newConfig.stickyNotes,
          },
        } as any,
      })
      .eq("id", user.id);
  }, [user]);

  // Debounced save to DB
  const persistConfig = useCallback((newConfig: DashboardConfig) => {
    if (!user) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => flushConfigToDb(newConfig), 800);
  }, [user, flushConfigToDb]);

  // CRITICAL: flush immediately when tab hides so data is never lost on tab switch
  useEffect(() => {
    if (!user) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (saveTimer.current) {
          clearTimeout(saveTimer.current);
          saveTimer.current = null;
        }
        flushConfigToDb(configRef.current);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [user, flushConfigToDb]);

  const updateConfig = useCallback((partial: Partial<DashboardConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      saveLocalCache(next);
      persistConfig(next);
      return next;
    });
  }, [persistConfig]);

  return { config, updateConfig, loaded, DEFAULT_ACTIVE_WIDGETS };
}
