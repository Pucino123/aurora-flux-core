import React, { useState, useEffect, useCallback } from "react";
import { Calendar, RefreshCw, Unlink, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const FUNCTION_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/google-calendar-sync`;

async function callSync(action: string, method: string, body?: object) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${FUNCTION_URL}?action=${action}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

interface Props {
  onSynced?: () => void;
}

const GoogleCalendarSync = ({ onSynced }: Props) => {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await callSync("status", "GET");
      setConnected(data.connected ?? false);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  // OAuth callback is handled by /calendar route (CalendarCallback.tsx)

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    // Use a fixed redirect URI — must match exactly what's registered in Google Cloud Console
    const redirect = `${window.location.origin}/calendar`;
    const res = await callSync("auth-url", "POST", { redirect_uri: redirect });
    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    // Redirect to Google OAuth — on return the URL will have ?code=... and ?state=userId
    window.location.href = res.url;
  };

  const handleSync = async () => {
    setSyncing(true);
    const res = await callSync("sync", "POST");
    if (res.error) toast.error("Sync error: " + res.error);
    else { toast.success(`Synced ${res.count ?? 0} events`); onSynced?.(); }
    setSyncing(false);
  };

  const handleDisconnect = async () => {
    setSyncing(true);
    const res = await callSync("disconnect", "POST");
    if (res.error) toast.error("Disconnect error: " + res.error);
    else {
      toast.success("Google Calendar disconnected.");
      setConnected(false);
      onSynced?.();
    }
    setSyncing(false);
  };

  if (loading) return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground">
      <Loader2 size={12} className="animate-spin" /> Checking...
    </div>
  );

  return (
    <div className="flex items-center gap-1.5">
      {error && (
        <span className="flex items-center gap-1 text-[10px] text-foreground/50 max-w-[200px] truncate">
          <AlertCircle size={10} /> {error}
        </span>
      )}
      {connected ? (
        <>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all disabled:opacity-50"
            title="Sync Google Calendar events"
          >
            {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            <span className="hidden sm:inline">{syncing ? "Syncing..." : "Sync"}</span>
          </button>
          <button
            onClick={handleDisconnect}
            disabled={syncing}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/80 border border-border/30 transition-all disabled:opacity-50"
            title="Disconnect Google Calendar"
          >
            <Unlink size={12} />
          </button>
        </>
      ) : (
        <button
          onClick={handleConnect}
          disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/30 transition-all"
        >
          <Calendar size={12} className="text-primary" />
          <span>Connect Calendars</span>
        </button>
      )}
    </div>
  );
};

export default GoogleCalendarSync;
