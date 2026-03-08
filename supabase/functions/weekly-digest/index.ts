import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version",
};

async function generateDigestContent(apiKey: string, data: {
  completedTasks: any[];
  pendingTasks: any[];
  workouts: any[];
  goals: any[];
  councilIdeas: any[];
  userEmail: string;
  displayName: string;
}): Promise<string> {
  const { completedTasks, pendingTasks, workouts, goals, displayName } = data;

  const prompt = `Generate a warm, motivating weekly productivity digest for ${displayName}.

Data summary:
- Completed tasks this week: ${completedTasks.length} (${completedTasks.slice(0, 5).map(t => `"${t.title}"`).join(", ")}${completedTasks.length > 5 ? ` +${completedTasks.length - 5} more` : ""})
- Pending tasks: ${pendingTasks.length}
- Workouts this week: ${workouts.length} (${workouts.map(w => w.activity).join(", ")})
- Active goals: ${goals.map(g => `"${g.title}" (${Math.round((g.current_amount / Math.max(g.target_amount, 1)) * 100)}%)`).join(", ")}

Write 3-4 sentences:
1. A warm greeting with their first name
2. Celebrate what they accomplished this week
3. Highlight one goal making strong progress or a fitness win
4. One motivating sentence to set the tone for next week

Be concise, warm, and specific. No bullet points — write in flowing prose.`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "You are Aura, a warm and motivating executive assistant. Write concise, genuine weekly digest messages." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!resp.ok) return `Hi ${displayName}, here's your weekly Dashiii digest!`;
  const json = await resp.json();
  return json.choices?.[0]?.message?.content || `Hi ${displayName}, here's your weekly Dashiii digest!`;
}

function buildEmailHtml(opts: {
  displayName: string;
  aiSummary: string;
  completedTasks: any[];
  pendingTasks: any[];
  workouts: any[];
  goals: any[];
  councilIdeas: any[];
  weekLabel: string;
}): string {
  const { displayName, aiSummary, completedTasks, pendingTasks, workouts, goals, weekLabel } = opts;

  const taskRows = completedTasks.slice(0, 8).map(t =>
    `<tr><td style="padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#374151;">✅ ${t.title}</td></tr>`
  ).join("");

  const goalRows = goals.slice(0, 4).map(g => {
    const pct = Math.min(100, Math.round((g.current_amount / Math.max(g.target_amount, 1)) * 100));
    return `
      <tr>
        <td style="padding:8px 0;">
          <div style="font-size:13px;font-weight:600;color:#374151;margin-bottom:4px;">${g.title}</div>
          <div style="background:#e5e7eb;border-radius:9999px;height:6px;overflow:hidden;">
            <div style="width:${pct}%;background:linear-gradient(90deg,#6366f1,#8b5cf6);height:100%;border-radius:9999px;"></div>
          </div>
          <div style="font-size:11px;color:#9ca3af;margin-top:3px;">${pct}% complete</div>
        </td>
      </tr>`;
  }).join("");

  const workoutBadges = workouts.slice(0, 6).map(w =>
    `<span style="display:inline-block;background:#f3f4f6;border-radius:9999px;padding:4px 12px;font-size:12px;color:#6b7280;margin:2px;">💪 ${w.activity}</span>`
  ).join(" ");

  const councilSection = opts.councilIdeas.length > 0 ? `
    <tr>
      <td style="padding:24px 40px 0;">
        <h2 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 12px;">💡 Council Ideas (${opts.councilIdeas.length})</h2>
        ${opts.councilIdeas.slice(0, 3).map(idea =>
          `<div style="background:#faf5ff;border-left:3px solid #8b5cf6;padding:10px 14px;border-radius:0 8px 8px 0;margin-bottom:8px;font-size:13px;color:#374151;">"${(idea.content || "").slice(0, 120)}…"</div>`
        ).join("")}
      </td>
    </tr>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Your Weekly Dashiii Digest</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);border:1px solid #e5e7eb;">

          <!-- Header gradient -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a78bfa 100%);padding:40px 40px 32px;text-align:center;">
              <div style="font-size:28px;margin-bottom:8px;">✨</div>
              <h1 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 4px;">Your Weekly Dashiii Digest</h1>
              <p style="font-size:13px;color:rgba(255,255,255,0.8);margin:0;">${weekLabel}</p>
            </td>
          </tr>

          <!-- AI summary -->
          <tr>
            <td style="padding:28px 40px 20px;">
              <div style="background:#fafafa;border-radius:12px;padding:20px 24px;border-left:4px solid #6366f1;">
                <p style="font-size:15px;line-height:1.7;color:#374151;margin:0;">${aiSummary}</p>
              </div>
            </td>
          </tr>

          <!-- Stats row -->
          <tr>
            <td style="padding:0 40px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background:#f0fdf4;border-radius:12px;padding:16px;width:31%;">
                    <div style="font-size:24px;font-weight:800;color:#16a34a;">${completedTasks.length}</div>
                    <div style="font-size:11px;color:#6b7280;margin-top:2px;">Tasks done</div>
                  </td>
                  <td width="3%"></td>
                  <td align="center" style="background:#eff6ff;border-radius:12px;padding:16px;width:31%;">
                    <div style="font-size:24px;font-weight:800;color:#2563eb;">${workouts.length}</div>
                    <div style="font-size:11px;color:#6b7280;margin-top:2px;">Workouts</div>
                  </td>
                  <td width="3%"></td>
                  <td align="center" style="background:#faf5ff;border-radius:12px;padding:16px;width:31%;">
                    <div style="font-size:24px;font-weight:800;color:#7c3aed;">${opts.councilIdeas.length}</div>
                    <div style="font-size:11px;color:#6b7280;margin-top:2px;">Council ideas</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${completedTasks.length > 0 ? `
          <!-- Completed tasks -->
          <tr>
            <td style="padding:0 40px 24px;">
              <h2 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 12px;">✅ Completed This Week</h2>
              <table width="100%" cellpadding="0" cellspacing="0">${taskRows}</table>
              ${completedTasks.length > 8 ? `<p style="font-size:12px;color:#9ca3af;margin:8px 0 0;">…and ${completedTasks.length - 8} more tasks</p>` : ""}
            </td>
          </tr>` : ""}

          ${goals.length > 0 ? `
          <!-- Goals progress -->
          <tr>
            <td style="padding:0 40px 24px;">
              <h2 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 12px;">🎯 Goals Progress</h2>
              <table width="100%" cellpadding="0" cellspacing="0">${goalRows}</table>
            </td>
          </tr>` : ""}

          ${workouts.length > 0 ? `
          <!-- Workouts -->
          <tr>
            <td style="padding:0 40px 24px;">
              <h2 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 12px;">🏋️ Workouts This Week</h2>
              <div>${workoutBadges}</div>
            </td>
          </tr>` : ""}

          ${councilSection}

          ${pendingTasks.length > 0 ? `
          <!-- Pending tasks preview -->
          <tr>
            <td style="padding:0 40px 24px;">
              <h2 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 8px;">📋 Up Next (${pendingTasks.length} tasks pending)</h2>
              <p style="font-size:13px;color:#6b7280;margin:0;">${pendingTasks.slice(0, 3).map(t => `"${t.title}"`).join(", ")}${pendingTasks.length > 3 ? ` and ${pendingTasks.length - 3} more` : ""}.</p>
            </td>
          </tr>` : ""}

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="font-size:12px;color:#9ca3af;margin:0 0 4px;">Sent by <strong style="color:#6366f1;">Flux</strong> — Your AI Productivity OS</p>
              <p style="font-size:11px;color:#d1d5db;margin:0;">You're receiving this because you have a Flux account.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const FROM_EMAIL = Deno.env.get("DIGEST_FROM_EMAIL") || "digest@flux.app";

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Allow manual trigger with specific user_id, or run for all users (cron mode)
    const body = await req.json().catch(() => ({}));
    const targetUserId = body?.user_id || null;

    const sb = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get users to send to
    const usersQuery = sb.from("profiles").select("id, email, display_name");
    if (targetUserId) usersQuery.eq("id", targetUserId);
    const { data: users, error: usersError } = await usersQuery;
    if (usersError) throw usersError;

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekStartStr = weekStart.toISOString();

    const weekLabel = `Week of ${weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;

    const results: any[] = [];

    for (const user of (users || [])) {
      if (!user.email) continue;
      try {
        // Fetch user data for the past week
        const [tasksRes, workoutsRes, goalsRes, ideasRes] = await Promise.all([
          sb.from("tasks").select("id,title,status,done,priority,updated_at").eq("user_id", user.id),
          sb.from("workouts").select("id,activity,energy,date").eq("user_id", user.id).gte("date", weekStart.toISOString().split("T")[0]),
          sb.from("goals").select("id,title,current_amount,target_amount,pinned").eq("user_id", user.id),
          sb.from("council_ideas").select("id,content,created_at").eq("user_id", user.id).gte("created_at", weekStartStr),
        ]);

        const allTasks = tasksRes.data || [];
        const completedTasks = allTasks.filter(t => t.done && t.updated_at >= weekStartStr);
        const pendingTasks = allTasks.filter(t => !t.done);
        const workouts = workoutsRes.data || [];
        const goals = goalsRes.data || [];
        const councilIdeas = ideasRes.data || [];

        // Skip users with no activity
        if (completedTasks.length === 0 && workouts.length === 0 && councilIdeas.length === 0) continue;

        // Generate AI summary
        const displayName = user.display_name || user.email.split("@")[0];
        const aiSummary = await generateDigestContent(LOVABLE_API_KEY!, {
          completedTasks, pendingTasks, workouts, goals, councilIdeas,
          userEmail: user.email, displayName,
        });

        // Build HTML email
        const html = buildEmailHtml({
          displayName, aiSummary, completedTasks, pendingTasks, workouts, goals, councilIdeas, weekLabel,
        });

        // Send via Resend
        const sendResp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: user.email,
            subject: `✨ Your weekly Flux digest — ${weekLabel}`,
            html,
          }),
        });

        const sendData = await sendResp.json();
        results.push({ userId: user.id, email: user.email, ok: sendResp.ok, resendId: sendData?.id });
      } catch (userErr) {
        console.error(`Failed for user ${user.id}:`, userErr);
        results.push({ userId: user.id, email: user.email, ok: false, error: String(userErr) });
      }
    }

    return new Response(JSON.stringify({ sent: results.filter(r => r.ok).length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("weekly-digest error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
