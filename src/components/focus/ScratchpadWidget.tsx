import React, { useState, useEffect, useRef, useCallback } from "react";
import { Trash2, Cloud, CloudOff } from "lucide-react";
import DraggableWidget from "./DraggableWidget";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const LOCAL_KEY = "flux-scratchpad";

const MOCK_TEXT = "• Call Sarah about the eco-project\n• Buy more oat milk\n• Schedule dentist appointment\n\nIdeas for tomorrow:\n- Deep work block 9–11am\n- Draft Q2 OKR proposal\n- Review team feedback";

const countWords = (text: string) => text.trim() ? text.trim().split(/\s+/).length : 0;

const timeAgo = (ts: number) => {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10) return "Just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

const ScratchpadWidget = () => {
  const { user } = useAuth();
  const [text, setText] = useState(() => {
    try { return localStorage.getItem(LOCAL_KEY) || MOCK_TEXT; } catch { return MOCK_TEXT; }
  });
  const [lastSaved, setLastSaved] = useState(Date.now());
  const [synced, setSynced] = useState(false);
  const [, forceUpdate] = useState(0);
  const dbTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isInitialLoad = useRef(true);

  // Load from DB on mount
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase.from as any)("dashboard_state")
        .select("state")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const saved = (data?.state as any)?.scratchpad_text;
      if (typeof saved === "string") {
        setText(saved);
        localStorage.setItem(LOCAL_KEY, saved);
        setSynced(true);
      }
      isInitialLoad.current = false;
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Re-sync from DB when tab becomes visible again (iOS background suspend)
  useEffect(() => {
    if (!user) return;
    const onVisible = async () => {
      if (document.visibilityState !== "visible") return;
      const { data } = await (supabase.from as any)("dashboard_state")
        .select("state")
        .eq("user_id", user.id)
        .maybeSingle();
      const saved = (data?.state as any)?.scratchpad_text;
      if (typeof saved === "string") {
        setText(saved);
        localStorage.setItem(LOCAL_KEY, saved);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [user]);

  // Refresh "last edited" display every 30s
  useEffect(() => {
    intervalRef.current = setInterval(() => forceUpdate(n => n + 1), 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    return () => { if (dbTimer.current) clearTimeout(dbTimer.current); };
  }, []);

  const saveToDb = useCallback((val: string) => {
    if (!user || isInitialLoad.current) return;
    if (dbTimer.current) clearTimeout(dbTimer.current);
    setSynced(false);
    dbTimer.current = setTimeout(async () => {
      localStorage.setItem(LOCAL_KEY, val);
      setLastSaved(Date.now());
      // Merge into dashboard_state preserving other keys
      const { data: existing } = await (supabase.from as any)("dashboard_state")
        .select("state")
        .eq("user_id", user.id)
        .maybeSingle();
      const prev = (existing?.state as Record<string, unknown>) || {};
      await (supabase.from as any)("dashboard_state").upsert(
        {
          user_id: user.id,
          state: { ...prev, scratchpad_text: val },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      setSynced(true);
    }, 1200);
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    // Immediate localStorage backup
    try { localStorage.setItem(LOCAL_KEY, val); } catch {}
    saveToDb(val);
  };

  const clear = () => {
    setText("");
    saveToDb("");
    setLastSaved(Date.now());
  };

  const words = countWords(text);
  const chars = text.length;

  return (
    <DraggableWidget
      id="scratchpad"
      title="Scratchpad"
      defaultPosition={{ x: typeof window !== "undefined" ? window.innerWidth - 420 : 800, y: 340 }}
      defaultSize={{ w: 360, h: 300 }}
    >
      <div className="h-full flex flex-col -mt-1">
        {/* Header actions */}
        <div className="flex items-center justify-between mb-1 shrink-0">
          <div className="flex items-center gap-1">
            {user && (
              synced
                ? <Cloud size={9} className="text-emerald-400/50" />
                : <CloudOff size={9} className="text-white/20" />
            )}
          </div>
          <button
            onClick={clear}
            className="flex items-center gap-1 text-[9px] text-white/20 hover:text-white/50 transition-colors"
          >
            <Trash2 size={9} /> Clear
          </button>
        </div>

        {/* Textarea */}
        <textarea
          value={text}
          onChange={handleChange}
          placeholder="Brain dump here..."
          className="flex-1 bg-transparent text-white/75 text-[12px] leading-relaxed placeholder:text-white/20 resize-none focus:outline-none font-light tracking-wide"
          style={{ fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace" }}
        />

        {/* Footer */}
        <div className="flex items-center justify-between pt-1.5 border-t border-white/6 shrink-0">
          <span className="text-[9px] text-white/20">{words} words · {chars} chars</span>
          <span className="text-[9px] text-white/15">Last edited: {timeAgo(lastSaved)}</span>
        </div>
      </div>
    </DraggableWidget>
  );
};

export default ScratchpadWidget;
