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

  // Handle OAuth callback (code in URL hash/search after redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("gcal_code");
    if (!code) return;
    // Remove from URL
    const url = new URL(window.location.href);
    url.searchParams.delete("gcal_code");
    window.history.replaceState({}, "", url.toString());
    (async () => {
      setSyncing(true);
      const redirect = `${window.location.origin}${window.location.pathname}`;
      const res = await callSync("exchange", "POST", { code, redirect_uri: redirect });
      if (res.error) { toast.error("Google Calendar: " + res.error); setSyncing(false); return; }
      setConnected(true);
      // Auto-sync after connecting
      const syncRes = await callSync("sync", "POST");
      if (syncRes.error) toast.error("Sync error: " + syncRes.error);
      else toast.success(`Synced ${syncRes.count ?? 0} events from Google Calendar`);
      setSyncing(false);
      onSynced?.();
    })();
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    const redirect = `${window.location.origin}${window.location.pathname}`;
    const res = await callSync("auth-url", "POST", { redirect_uri: redirect });
    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    // Redirect to Google OAuth — on return the URL will have ?code=...
    // We rewrite the callback URL to include gcal_code param via a small redirect handler
    window.location.href = res.url.replace("response_type=code", "response_type=code").replace(
      `redirect_uri=${encodeURIComponent(redirect)}`,
      `redirect_uri=${encodeURIComponent(redirect)}`
    );
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
    const res = await callSync("disconnect", "DELETE");
    if (res.error) toast.error("Disconnect error: " + res.error);
    else { toast.success("Google Calendar disconnected. Your local events are safe."); setConnected(false); onSynced?.(); }
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
          <span>Connect Google Calendar</span>
        </button>
      )}
    </div>
  );
};

export default GoogleCalendarSync;
