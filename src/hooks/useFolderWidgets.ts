import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface FolderWidgetConfig {
  activeWidgets: string[];
  widgetNames: Record<string, string>;
}

const DEFAULT_CONFIG: FolderWidgetConfig = {
  activeWidgets: [],
  widgetNames: {},
};

/**
 * Per-folder widget configuration, stored in profiles.settings.folder_widgets[folderId]
 */
export function useFolderWidgets(folderId: string) {
  const { user } = useAuth();
  const [config, setConfig] = useState<FolderWidgetConfig>(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user || !folderId) return;
    setLoaded(false);
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("settings")
        .eq("id", user.id)
        .single();

      if (data?.settings) {
        const s = data.settings as Record<string, any>;
        const fw = s.folder_widgets?.[folderId];
        if (fw) {
          setConfig({
            activeWidgets: fw.activeWidgets || [],
            widgetNames: fw.widgetNames || {},
          });
        } else {
          setConfig(DEFAULT_CONFIG);
        }
      }
      setLoaded(true);
    })();
  }, [user, folderId]);

  const persistConfig = useCallback((newConfig: FolderWidgetConfig) => {
    if (!user || !folderId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("settings")
        .eq("id", user.id)
        .single();

      const currentSettings = (profile?.settings as Record<string, any>) || {};
      const folderWidgets = currentSettings.folder_widgets || {};
      await supabase
        .from("profiles")
        .update({
          settings: {
            ...currentSettings,
            folder_widgets: {
              ...folderWidgets,
              [folderId]: {
                activeWidgets: newConfig.activeWidgets,
                widgetNames: newConfig.widgetNames,
              },
            },
          } as any,
        })
        .eq("id", user.id);
    }, 800);
  }, [user, folderId]);

  const updateConfig = useCallback((partial: Partial<FolderWidgetConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      persistConfig(next);
      return next;
    });
  }, [persistConfig]);

  const addWidget = useCallback((id: string) => {
    setConfig((prev) => {
      if (prev.activeWidgets.includes(id)) return prev;
      const next = { ...prev, activeWidgets: [...prev.activeWidgets, id] };
      persistConfig(next);
      return next;
    });
  }, [persistConfig]);

  const removeWidget = useCallback((id: string) => {
    setConfig((prev) => {
      const next = { ...prev, activeWidgets: prev.activeWidgets.filter((w) => w !== id) };
      persistConfig(next);
      return next;
    });
  }, [persistConfig]);

  const renameWidget = useCallback((id: string, name: string) => {
    setConfig((prev) => {
      const next = { ...prev, widgetNames: { ...prev.widgetNames, [id]: name } };
      persistConfig(next);
      return next;
    });
  }, [persistConfig]);

  return { config, updateConfig, addWidget, removeWidget, renameWidget, loaded };
}
