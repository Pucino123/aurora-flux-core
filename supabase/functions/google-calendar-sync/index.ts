import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Verify user auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    // ── GET auth URL ──
    if (req.method === "POST" && action === "auth-url") {
      const body = await req.json();
      const redirectUri = body.redirect_uri;

      if (!GOOGLE_CLIENT_ID) {
        return new Response(JSON.stringify({ error: "Google Calendar not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET secrets." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "https://www.googleapis.com/auth/calendar.readonly",
        access_type: "offline",
        prompt: "consent",
        state: user.id,
      });

      return new Response(JSON.stringify({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Exchange code for tokens ──
    if (req.method === "POST" && action === "exchange") {
      const { code, redirect_uri } = await req.json();
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri,
          grant_type: "authorization_code",
        }),
      });
      const tokens = await res.json();
      if (tokens.error) return new Response(JSON.stringify({ error: tokens.error_description || tokens.error }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
      await supabase.from("google_calendar_tokens" as any).upsert({
        user_id: user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        scope: tokens.scope,
      }, { onConflict: "user_id" });

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Sync events ──
    if (req.method === "POST" && action === "sync") {
      const { data: tokenRow } = await supabase.from("google_calendar_tokens" as any).select("*").eq("user_id", user.id).maybeSingle();
      if (!tokenRow) return new Response(JSON.stringify({ error: "Not connected" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      let accessToken = (tokenRow as any).access_token;

      // Refresh if expired
      const expiresAt = new Date((tokenRow as any).expires_at).getTime();
      if (Date.now() > expiresAt - 60000 && (tokenRow as any).refresh_token) {
        const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            refresh_token: (tokenRow as any).refresh_token,
            grant_type: "refresh_token",
          }),
        });
        const refreshed = await refreshRes.json();
        if (!refreshed.error) {
          accessToken = refreshed.access_token;
          await supabase.from("google_calendar_tokens" as any).update({
            access_token: refreshed.access_token,
            expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
          }).eq("user_id", user.id);
        }
      }

      // Fetch events from Google Calendar (next 60 days)
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
      const eventsRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=250`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const eventsData = await eventsRes.json();

      if (eventsData.error) return new Response(JSON.stringify({ error: eventsData.error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const items = eventsData.items || [];
      const rows = items.map((e: any) => {
        const allDay = !e.start?.dateTime;
        const startRaw = e.start?.dateTime || e.start?.date || "";
        const endRaw = e.end?.dateTime || e.end?.date || "";
        const scheduledDate = startRaw.slice(0, 10);
        const startTime = allDay ? "00:00" : new Date(startRaw).toTimeString().slice(0, 5);
        const endTime = allDay ? "23:59" : new Date(endRaw).toTimeString().slice(0, 5);

        return {
          user_id: user.id,
          google_event_id: e.id,
          title: e.summary || "(No title)",
          description: e.description || null,
          start_time: startTime,
          end_time: endTime,
          scheduled_date: scheduledDate,
          all_day: allDay,
          calendar_id: "primary",
          source: "google",
        };
      }).filter((r: any) => r.scheduled_date);

      if (rows.length > 0) {
        await supabase.from("google_calendar_events" as any).upsert(rows, { onConflict: "user_id,google_event_id" });
      }

      return new Response(JSON.stringify({ ok: true, count: rows.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Check connection status ──
    if (req.method === "GET" && action === "status") {
      const { data } = await supabase.from("google_calendar_tokens" as any).select("id, expires_at").eq("user_id", user.id).maybeSingle();
      return new Response(JSON.stringify({ connected: !!data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Disconnect ──
    if (req.method === "DELETE" && action === "disconnect") {
      await supabase.from("google_calendar_tokens" as any).delete().eq("user_id", user.id);
      await supabase.from("google_calendar_events" as any).delete().eq("user_id", user.id);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
