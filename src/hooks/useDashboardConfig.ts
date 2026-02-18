import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ResponsiveLayouts } from "react-grid-layout";

const DEFAULT_ACTIVE_WIDGETS = [
  "smart-plan", "top-tasks", "savings-ring",
  "budget-preview", "weekly-workout", "gamification",
  "project-status", "recent-notes",
];

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
  layouts: null,
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
          setConfig({
            activeWidgets: s.dashboard_config.activeWidgets || DEFAULT_ACTIVE_WIDGETS,
            widgetNames: s.dashboard_config.widgetNames || {},
            layouts: s.dashboard_config.layouts || null,
            stickyNotes: s.dashboard_config.stickyNotes || [],
          });
        }
      }
      setLoaded(true);
      // Cache to localStorage for instant load next time
      if (data?.settings) {
        const s = data.settings as Record<string, any>;
        if (s.dashboard_config) saveLocalCache({
          activeWidgets: s.dashboard_config.activeWidgets || DEFAULT_ACTIVE_WIDGETS,
          widgetNames: s.dashboard_config.widgetNames || {},
          layouts: s.dashboard_config.layouts || null,
          stickyNotes: s.dashboard_config.stickyNotes || [],
        });
      }
    })();
  }, [user]);

  // Debounced save to DB
  const persistConfig = useCallback((newConfig: DashboardConfig) => {
    if (!user) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
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
    }, 800);
  }, [user]);

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
