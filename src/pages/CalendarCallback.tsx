import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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

const CalendarCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");

    if (!code || !state || !/^[0-9a-f-]{36}$/i.test(state)) {
      // No OAuth params — just redirect to home
      navigate("/", { replace: true });
      return;
    }

    (async () => {
      const redirect = `${window.location.origin}/calendar`;
      const res = await callSync("exchange", "POST", { code, redirect_uri: redirect });
      if (res.error) {
        toast.error("Google Calendar: " + res.error);
      } else {
        const syncRes = await callSync("sync", "POST");
        if (syncRes.error) toast.error("Sync error: " + syncRes.error);
        else toast.success(`Synced ${syncRes.count ?? 0} events from Google Calendar`);
      }
      navigate("/", { replace: true });
    })();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 size={28} className="animate-spin text-primary" />
        <p className="text-sm">Connecting Google Calendar…</p>
      </div>
    </div>
  );
};

export default CalendarCallback;
