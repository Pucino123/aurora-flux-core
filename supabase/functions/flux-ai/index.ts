import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Sparks costs — single source of truth (must mirror sparksConfig.ts) ──────
const SPARKS_COSTS: Record<string, number> = {
  aura_message: 2,
  stream_classify: 3,
  ai_daily_plan: 10,
  council_analysis: 15,
  council_quick: 5,
  council_thread: 3,
  council_execute: 10,
  council_simulate: 8,
  council_debate: 8,
  council_weakness: 5,
  boardroom_consult: 10,
  doc_rewrite: 5,
  doc_improve: 3,
  doc_summarize: 3,
  doc_expand: 5,
  doc_shorten: 3,
  doc_translate: 8,
  doc_chat: 2,
  generate_image: 8,
  smart_plan: 5,
  weekly_digest: 5,
  message_action: 2,
  daily_summary: 3,
};

// Map request type → sparks action key
const TYPE_TO_SPARKS_ACTION: Record<string, string> = {
  "aura": "aura_message",
  "classify": "stream_classify",
  "plan": "ai_daily_plan",
  "council": "council_analysis",
  "council-quick": "council_quick",
  "boardroom-consult": "boardroom_consult",
  "document-chat": "doc_chat",
  "document-tools": "doc_rewrite", // overridden per-action below
  "generate-image": "generate_image",
  "message-to-action": "message_action",
  "daily-summary": "daily_summary",
};

// Document tools sub-action → sparks key
const DOC_ACTION_TO_SPARKS: Record<string, string> = {
  rewrite: "doc_rewrite",
  improve: "doc_improve",
  summarize: "doc_summarize",
  expand: "doc_expand",
  shorten: "doc_shorten",
  translate: "doc_translate",
};

// ── Server-side atomic Spark deduction ───────────────────────────────────────
async function deductSparks(
  userId: string,
  cost: number,
  reason: string,
  feature: string,
  supabaseAdmin: any
): Promise<{ success: boolean; balance?: number; error?: string }> {
  // Fetch current balance
  const { data: profile, error: fetchErr } = await supabaseAdmin
    .from("profiles")
    .select("sparks_balance")
    .eq("id", userId)
    .single();

  if (fetchErr || !profile) {
    return { success: false, error: "Could not fetch user balance" };
  }

  const current = profile.sparks_balance as number;
  if (current < cost) {
    return { success: false, error: `Insufficient Sparks (have ${current}, need ${cost})` };
  }

  const newBalance = current - cost;

  // Atomic update — only succeeds if balance hasn't changed since we read it
  const { error: updateErr } = await supabaseAdmin
    .from("profiles")
    .update({ sparks_balance: newBalance })
    .eq("id", userId)
    .eq("sparks_balance", current); // optimistic lock

  if (updateErr) {
    // Retry once with fresh read (handles rare race condition)
    const { data: fresh } = await supabaseAdmin
      .from("profiles")
      .select("sparks_balance")
      .eq("id", userId)
      .single();
    if (!fresh || (fresh.sparks_balance as number) < cost) {
      return { success: false, error: "Insufficient Sparks or concurrent update conflict" };
    }
    const nb2 = (fresh.sparks_balance as number) - cost;
    await supabaseAdmin.from("profiles").update({ sparks_balance: nb2 }).eq("id", userId);
    await supabaseAdmin.from("sparks_transactions").insert({
      user_id: userId,
      amount: -cost,
      balance_after: nb2,
      reason,
      feature,
    });
    return { success: true, balance: nb2 };
  }

  // Log transaction
  await supabaseAdmin.from("sparks_transactions").insert({
    user_id: userId,
    amount: -cost,
    balance_after: newBalance,
    reason,
    feature,
  });

  return { success: true, balance: newBalance };
}

function handleAIError(response: Response) {
  if (response.status === 429) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (response.status === 402) {
    return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }), {
      status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return null;
}

async function handleClassify(messages: any[], context: any, apiKey: string) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: `You are an Intelligent Dashboard Architect for a productivity app called Dashiii.

You are NOT a chatbot. You are a structured system that thinks before acting.

═══ INTERNAL PROCESS (execute ALL steps before responding) ═══

STEP 1 — INTENT DETECTION:
- What is the core ACTION? (create, edit, add, delete, plan, analyze)
- What is the DOMAIN? (finance, fitness, project, notes)
- What is the correct OUTPUT TYPE for this domain?

STEP 2 — CONTEXT CHECK:
- Current page/view: ${context?.currentPage || "stream"}
- Active folder ID: ${context?.currentFolderId || "none"}
- Active folder type: ${context?.currentFolderType || "none"}
- Active folder title: ${context?.currentFolderTitle || "none"}

STEP 3 — FOLDER SCAN:
Existing folders: ${context?.existingFolders ? JSON.stringify(context.existingFolders) : "none"}
- Match semantically: "Economy" = "Finance" = "Økonomi", "Workout" = "Training" = "Træning"
- If relevant folder exists → use it (set use_current_folder or match folder_type)
- If not → system will create one

STEP 4 — DUPLICATE RISK ASSESSMENT:
- Does similar content already exist? Consider name, value, domain.
- Factor this into your confidence_score.

STEP 5 — CONFIDENCE SCORING (0-100):
Calculate based on:
- Intent clarity (is the request unambiguous?)
- Context match (does the current folder align with the domain?)
- Domain certainty (is the domain clearly identifiable?)
- Duplicate risk (does similar content likely exist?)

Rules:
- Score ≥ 85 → classify immediately with full confidence
- Score 70-84 → classify but the frontend may show a suggestion panel
- Score 50-69 → set category to "question" to trigger clarification
- Score < 50 → set category to "question" to ask for more info

═══ CLASSIFICATION RULES (pick exactly ONE) ═══

- "savings_goal": User wants to SAVE money toward a target. Extract target_amount and deadline.
- "budget": User provides a LIST of expense items with amounts.
- "fitness": User mentions workouts, training plans, exercise routines. ALWAYS generate 4-8 specific exercises in "tasks" (e.g., "Squat 4x12", "Bench Press 3x10"). Create a real, structured training plan.
- "project": Multi-step project or initiative. Extract 3-6 actionable task titles.
- "note": Simple text, thought, or idea that doesn't fit other categories.
- "question": User is asking a question OR confidence is below 50.

═══ DOMAIN → OUTPUT TYPE MAPPING (CRITICAL) ═══

- savings_goal → "dashboard" (progress tracker with charts, deposit input, timeline)
- budget → "table" (expense table with categories and totals)
- fitness → "tracker" (training plan with exercises, sets/reps, heatmap)
- project → "board" (task board with checkboxes, priorities, inline editing)
- note → "note" (structured note with sections)
- question → "chat" (conversational response)

NEVER generate a "note" for structured requests like savings goals, budgets, or training plans.

═══ CONTEXT AWARENESS ═══

- If user says "here" or "her" → set use_current_folder = true
- If currentFolderType is "fitness" and user adds content → place in fitness folder
- If currentFolderType is "finance" and user creates content → place in finance folder
- If no folder context and category is "note" → folder_type = "notes"

═══ ABSOLUTE RULES ═══

- Return EXACTLY ONE category per input
- "Save 20,000" → savings_goal ONLY, not a note
- "Plan a marketing strategy" → project with tasks, not a note
- For projects AND fitness: ALWAYS populate "tasks" array with specific items
- title: max 5 words, concise
- NEVER generate placeholder text — all content must be actionable
- ALWAYS set confidence_score based on the scoring rules above`,
        },
        ...messages,
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "classify_intent",
            description: "Classify user input with confidence scoring and structured layout hints",
            parameters: {
              type: "object",
              properties: {
                category: {
                  type: "string",
                  enum: ["budget", "savings_goal", "fitness", "project", "note", "question"],
                },
                title: { type: "string", description: "Short title (max 5 words)" },
                folder_type: {
                  type: "string",
                  enum: ["finance", "fitness", "project", "notes"],
                },
                output_type: {
                  type: "string",
                  enum: ["dashboard", "table", "tracker", "board", "note", "chat"],
                  description: "Determines which UI layout component to render",
                },
                confidence_score: {
                  type: "number",
                  description: "Confidence score 0-100 based on intent clarity, context match, domain certainty, and duplicate risk",
                },
                budget_items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      item: { type: "string" },
                      cost: { type: "number" },
                      category: { type: "string" },
                    },
                    required: ["item", "cost"],
                  },
                },
                target_amount: { type: "number" },
                currency: { type: "string" },
                deadline: { type: "string" },
                tasks: {
                  type: "array",
                  items: { type: "string" },
                },
                use_current_folder: {
                  type: "boolean",
                  description: "True if user explicitly wants to place content in the current active folder",
                },
              },
              required: ["category", "title", "folder_type", "output_type", "confidence_score"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "classify_intent" } },
    }),
  });

  const errResp = handleAIError(response);
  if (errResp) return errResp;

  if (!response.ok) {
    const t = await response.text();
    console.error("AI gateway error:", response.status, t);
    throw new Error("AI gateway error");
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall) {
    const args = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ category: "note", title: "Note", folder_type: "notes", output_type: "note", confidence_score: 50 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handlePlan(context: any, apiKey: string) {
  const today = context?.today || new Date().toISOString().split("T")[0];
  const systemPrompt = `You are a world-class daily planning assistant for Dashiii, inspired by Motion and Notion AI.

You are a Proactive Productivity Strategist. You must think before generating.

TODAY'S DATE: ${today}

ORDERING RULES (CRITICAL — apply in this exact order):
1. PRIORITY 1 — Tasks with scheduled_date = "${today}" MUST appear FIRST in the schedule, starting at 08:00.
2. PRIORITY 2 — Tasks with due_date = "${today}" are URGENT. Schedule them before 12:00.
3. PRIORITY 3 — Tasks with priority = "high" → morning slots (08:00-12:00).
4. PRIORITY 4 — Tasks with priority = "medium" → midday slots (12:00-14:00).
5. PRIORITY 5 — Tasks with priority = "low" → afternoon slots (14:00-17:00).
6. Tasks already sorted by the frontend in priority order — respect that order within each priority bucket.

REASONING PHASE — Think carefully before generating blocks:
1. SCAN all provided tasks. Categorize by: urgency (overdue/due today via due_date), priority (high > medium > low), scheduled_date (today = highest priority).
2. Also scan goals and notes — include relevant ones as review or action blocks.
3. ANALYZE dependencies — which tasks should come first?
4. OPTIMIZE for flow state — group similar tasks together, place creative/deep work in morning (8:00-12:00), meetings/calls midday (12:00-14:00), admin/light tasks afternoon (14:00-17:00).
5. BALANCE energy — alternate intense 90-min blocks with 15-min breaks.
6. Account for task content/description to determine duration and type.
7. Group by domain (finance, fitness, project) when possible for better context switching.

GENERATION RULES:
- ONLY use items from the provided list. NEVER invent tasks.
- Every provided task MUST appear in the schedule — skip nothing.
- Start at 08:00, end by 17:00.
- Include 15-min breaks after every 2 hours of deep work.
- Default duration: "45m" for tasks, "30m" for meetings, "15m" for breaks.
- For large tasks (content mentions multiple steps or complexity), allocate 60-90m.
- Use the task's own title (you may shorten slightly).
- Link each block to its task_id when available.
- Type mapping: "video|filming|content|strategy|plan|research|design|write|build|code" → "deep"; "call|sync|meeting|standup|review" → "meeting"; "run|gym|workout|yoga|walk" → "workout"; "read|study|learn" → "reading"; breaks → "break"
- If gaps remain after all tasks + breaks, add "Free Flow" blocks with type "break".
- NEVER generate admin tasks, email tasks, or other filler — only what the user provided.

OUTPUT: Return blocks sorted by time, with proper task_id linkage.`;

  const taskData = context?.tasks || [];
  const goalData = context?.goals || [];

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Here are my pending tasks and notes:\n${JSON.stringify(taskData)}\n\nHere are my active goals:\n${JSON.stringify(goalData)}\n\nGenerate my optimal daily plan. Think step-by-step about priority, energy management, and flow state before scheduling.` },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "generate_plan",
            description: "Generate a daily schedule plan",
            parameters: {
              type: "object",
              properties: {
                blocks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      time: { type: "string", description: "e.g. 8:00, 10:30" },
                      title: { type: "string" },
                      duration: { type: "string", description: "e.g. 30m, 45m, 60m, 90m" },
                      type: { type: "string", enum: ["deep", "meeting", "break", "workout", "reading", "custom"] },
                      task_id: { type: "string", description: "ID of linked task if applicable" },
                    },
                    required: ["time", "title", "duration", "type"],
                  },
                },
              },
              required: ["blocks"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "generate_plan" } },
    }),
  });

  const errResp = handleAIError(response);
  if (errResp) return errResp;
  if (!response.ok) throw new Error("AI gateway error");

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall) {
    const args = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ blocks: [] }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleDocumentChat(messages: any[], context: any, apiKey: string) {
  const documentContent = context?.documentContent || "";
  const systemPrompt = `You are a sharp, objective sparring partner for a text editor. Like a smart friend who gives honest, brief feedback.

RULES:
- MAX 2-3 sentences. Be brutally concise.
- Be objective: say what works, what doesn't, and why.
- Match the user's language (Danish → Danish, English → English).
- Don't repeat what the user said. Don't summarize the document.

MANDATORY HIGHLIGHTING — THIS IS YOUR #1 RULE:
Every single time you reference, quote, or comment on ANY specific text from the document, you MUST wrap it in [[highlight:exact text here]]. 
This makes the text glow yellow in the editor so the user can see what you're talking about.
If you don't use [[highlight:...]], your feedback is useless because the user can't see what you mean.

Examples of correct usage:
- "[[highlight:Den gamle mand gik langsomt]] — dette billede er stærkt, men tempoet halter."
- "Åbningen [[highlight:Det var en mørk og stormfuld nat]] er en kliché."

For changes, use [[suggest:original text|improved text]] — this shows a diff with an Apply button.
Example: [[suggest:Han gik langsomt ned ad vejen|Han slæbte sig ned ad den øde vej]]

Both MUST use VERBATIM text from the document — character for character.
Max 3 highlights and 2 suggestions per response.

═══ DOCUMENT ═══
${documentContent}
═══ END ═══`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
    }),
  });

  const errResp = handleAIError(response);
  if (errResp) return errResp;

  if (!response.ok) {
    const t = await response.text();
    console.error("Document chat AI error:", response.status, t);
    throw new Error("AI gateway error");
  }

  return new Response(response.body, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
}

async function handleChat(messages: any[], apiKey: string) {
  const systemPrompt = "You are Aura, a helpful productivity assistant inside Dashiii. Keep answers clear, concise, and actionable.";

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
    }),
  });

  const errResp = handleAIError(response);
  if (errResp) return errResp;

  if (!response.ok) {
    const t = await response.text();
    console.error("AI gateway error:", response.status, t);
    throw new Error("AI gateway error");
  }

  return new Response(response.body, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
}

async function handleCouncil(messages: any[], apiKey: string) {
  const userIdea = messages[messages.length - 1]?.content || "";

  const systemPrompt = `You are "The Council" — a strategic advisory board of 5 distinct AI personas analyzing a business/product idea. You must provide analysis from ALL 5 perspectives simultaneously.

THE 5 PERSONAS:

1. 🧠 THE STRATEGIST (Purple) — Vision, positioning, 10x thinking, market opportunity, long-term moats.
2. 💰 THE OPERATOR (Green) — Execution feasibility, costs, bottlenecks, timeline, resource needs.
3. ⚖️ THE SKEPTIC (Red) — Risks, failure points, competitors, market timing, blind spots.
4. 👤 THE USER ADVOCATE (Blue) — UX, emotional impact, simplicity, user pain points, adoption barriers.
5. 🚀 THE GROWTH ARCHITECT (Orange) — Scale potential, virality, momentum, distribution channels, growth loops.

RULES:
- Each persona MUST reference at least one other persona's point (e.g., Skeptic attacking Strategist's optimism).
- Each analysis should be 80-150 words, substantive and specific to the idea.
- Each persona MUST vote: GO (+2), EXPERIMENT (+1), PIVOT (0), or KILL (-2).
- Vote scores: GO=+2, EXPERIMENT=+1, PIVOT=0, KILL=-2.
- Consensus score = sum of all votes (range: -10 to +10).

RESPONSE FORMAT: You MUST use the generate_council_analysis tool.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "generate_council_analysis",
            description: "Generate analysis from all 5 council personas",
            parameters: {
              type: "object",
              properties: {
                personas: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      key: { type: "string", enum: ["strategist", "operator", "skeptic", "user_advocate", "growth_architect"] },
                      analysis: { type: "string" },
                      vote: { type: "string", enum: ["GO", "EXPERIMENT", "PIVOT", "KILL"] },
                      vote_score: { type: "number" },
                    },
                    required: ["key", "analysis", "vote", "vote_score"],
                  },
                  minItems: 5,
                  maxItems: 5,
                },
                consensus_score: { type: "number" },
                bias_radar: { type: "array", items: { type: "object" } },
              },
              required: ["personas", "consensus_score"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "generate_council_analysis" } },
    }),
  });

  const errResp = handleAIError(response);
  if (errResp) return errResp;
  if (!response.ok) {
    const t = await response.text();
    console.error("Council AI error:", response.status, t);
    throw new Error("AI gateway error");
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall) {
    const args = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ personas: [], consensus_score: 0 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleCouncilQuick(question: string, mode: string, persona_key: string, apiKey: string) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: `You are the ${persona_key} persona from The Council. Mode: ${mode}. Give a sharp, 2-3 sentence response to the user's question. Be direct and specific.`,
        },
        { role: "user", content: question },
      ],
    }),
  });

  const errResp = handleAIError(response);
  if (errResp) return errResp;
  if (!response.ok) throw new Error("AI gateway error");

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  return new Response(JSON.stringify({ reply: content }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleDocumentTools(action: string, text: string, apiKey: string) {
  const prompts: Record<string, string> = {
    rewrite: "Rewrite this text to be clearer and more engaging. Keep the same meaning but improve the flow and word choice. Return only the rewritten text.",
    improve: "Improve the tone of this text to be more professional and polished. Keep the core message. Return only the improved text.",
    summarize: "Summarize this text in 2-3 concise sentences. Return only the summary.",
    expand: "Expand this text with more detail, examples, and supporting points. Keep the same tone. Return only the expanded text.",
    shorten: "Shorten this text by removing redundancy while keeping the key points. Return only the shortened text.",
    translate: "Translate this text to English if it's not already in English, or to the most common other language if it is in English. Return only the translated text.",
  };

  const systemPrompt = prompts[action] || prompts.rewrite;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
    }),
  });

  const errResp = handleAIError(response);
  if (errResp) return errResp;
  if (!response.ok) throw new Error("AI gateway error");

  const data = await response.json();
  const result = data.choices?.[0]?.message?.content || text;
  return new Response(JSON.stringify({ result }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleAura(messages: any[], context: string, apiKey: string) {
  const systemPrompt = `You are Aura — a sharp, empathetic AI assistant living inside Dashiii, a productivity OS.

PERSONALITY: Direct, warm, smart. You sound like a brilliant friend who actually gets things done.

CONTEXT ABOUT THE USER'S WORKSPACE:
${context || "No specific context provided."}

CAPABILITIES — you can take actions in Dashiii by returning structured tool calls:
- create_task: Create a task with title, priority, folder
- create_folder: Create a new folder/project
- add_note: Add a note to a folder
- add_schedule_block: Add a block to today's schedule
- navigate_to: Navigate to a view (focus, council, calendar, tasks, documents)
- search_workspace: Search tasks, notes, folders

RULES:
- If the user asks you to DO something (create, add, schedule) → use the appropriate tool
- If it's a question or conversation → reply conversationally, no tool needed
- Keep replies under 150 words unless asked for detail
- Use markdown sparingly (bold for emphasis, bullets for lists)
- NEVER make up data about the user's tasks or projects`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "create_task",
            description: "Create a new task in the user's workspace",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                priority: { type: "string", enum: ["high", "medium", "low"] },
                folder_id: { type: "string" },
                due_date: { type: "string" },
              },
              required: ["title"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "navigate_to",
            description: "Navigate to a view in Dashiii",
            parameters: {
              type: "object",
              properties: {
                view: { type: "string", enum: ["focus", "council", "calendar", "tasks", "documents", "analytics"] },
              },
              required: ["view"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "add_schedule_block",
            description: "Add a time block to the user's schedule",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                time: { type: "string" },
                duration: { type: "string" },
                type: { type: "string", enum: ["deep", "meeting", "break", "workout"] },
                block_id: { type: "string" },
              },
              required: ["block_id"],
            },
          },
        },
      ],
      stream: true,
    }),
  });

  const errResp = handleAIError(response);
  if (errResp) return errResp;
  if (!response.ok) {
    const t = await response.text();
    console.error("Aura AI error:", response.status, t);
    throw new Error("AI gateway error");
  }

  return new Response(response.body, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
}

async function handleImageGenerate(prompt: string, apiKey: string) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-pro-image-preview",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  const errResp = handleAIError(response);
  if (errResp) return errResp;
  if (!response.ok) {
    const t = await response.text();
    console.error("Image gen error:", response.status, t);
    throw new Error("Image generation failed");
  }
  const data = await response.json();
  const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!imageData) throw new Error("No image returned");
  const match = imageData.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image format");
  return new Response(JSON.stringify({ imageBase64: match[2], mimeType: match[1] }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleMessageToAction(messageText: string, senderName: string, apiKey: string) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: "You rewrite chat messages into actionable task titles. Be concise (max 8 words). Append '(Requested by [Name])' at the end. Reply with ONLY the task title, nothing else." },
        { role: "user", content: `Message from ${senderName}: "${messageText}"` },
      ],
    }),
  });
  const errResp = handleAIError(response);
  if (errResp) return errResp;
  if (!response.ok) throw new Error("AI gateway error");
  const data = await response.json();
  const title = data.choices?.[0]?.message?.content?.trim() || messageText;
  return new Response(JSON.stringify({ title }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleBoardroomConsult(idea: string, personalitySliders: Record<string, { riskTolerance: number; innovation: number; pragmatism: number }> | undefined, apiKey: string) {
  const sliderDesc = (key: string) => {
    const s = personalitySliders?.[key];
    if (!s) return "";
    const risk = s.riskTolerance <= 30 ? "very conservative on risk" : s.riskTolerance >= 70 ? "very risk-tolerant" : "moderately risk-aware";
    const innov = s.innovation <= 30 ? "pragmatic and grounded" : s.innovation >= 70 ? "highly visionary and forward-thinking" : "balanced between pragmatic and visionary";
    const prag = s.pragmatism <= 30 ? "theoretical and abstract" : s.pragmatism >= 70 ? "extremely direct and action-oriented" : "balanced between theory and practice";
    return ` [PERSONALITY TUNING: Be ${risk}, ${innov}, ${prag} in your response.]`;
  };

  const systemPrompt = `You are a simulation engine for "The Council" — a boardroom of 4 expert advisors who review business ideas.

You must generate responses for EXACTLY these 4 advisors, in this exact order:
1. elena — Elena Verna, The Pragmatist (growth & unit economics expert). Supportive but data-driven. Confidence 70-90.${sliderDesc("elena")}
2. helen — Helen Lee Kupp, The Branding Expert (positioning & storytelling). Balanced, creative. Confidence 50-75.${sliderDesc("helen")}
3. anton — Anton Osika, The Devil's Advocate (risk & contrarian). Skeptical, probing. Confidence 20-45. MUST reference and disagree with at least one point Elena made.${sliderDesc("anton")}
4. margot — Margot van Laer, The Visionary (long-term potential & community). Expansive, optimistic. Confidence 80-98. MUST build on at least one point another advisor made.${sliderDesc("margot")}

RULES:
- Each analysis must be 3-4 sentences, specific to the idea
- Cross-references are REQUIRED: e.g. "Building on Elena's point about...", "I disagree with Helen here..."
- Each advisor ends with a bold Socratic question in the format "**Question text?**"
- Action plan: 3 concrete steps derived from the collective insights
- Be specific to the idea — no generic business advice

The idea to analyze: "${idea}"`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analyze this idea with all 4 advisors: "${idea}"` },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "boardroom_responses",
            description: "Return structured responses from all 4 boardroom advisors",
            parameters: {
              type: "object",
              properties: {
                personas: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      key: { type: "string", enum: ["elena", "helen", "anton", "margot"] },
                      analysis: { type: "string", description: "3-4 sentence analysis with cross-references to other advisors" },
                      question: { type: "string", description: "Bold Socratic question starting with **" },
                      confidence: { type: "number", description: "Confidence score 0-100" },
                    },
                    required: ["key", "analysis", "question", "confidence"],
                    additionalProperties: false,
                  },
                  minItems: 4,
                  maxItems: 4,
                },
                action_plan: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 3,
                  maxItems: 3,
                  description: "3 concrete action steps derived from the advisors' collective insights",
                },
              },
              required: ["personas", "action_plan"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "boardroom_responses" } },
    }),
  });

  const errResp = handleAIError(response);
  if (errResp) return errResp;
  if (!response.ok) throw new Error("AI gateway error for boardroom-consult");

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call in boardroom response");

  const parsed = JSON.parse(toolCall.function.arguments);
  return new Response(JSON.stringify(parsed), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleDailySummary(blocks: any[], apiKey: string) {
  const systemPrompt = `You are a concise productivity coach. Summarize today's schedule in 3-5 sentences.
Focus on: total focus/work time, meeting count, break time, and 1 key insight about the day's structure.
Be motivating and specific. End with a brief tip for staying on track.
Keep it under 80 words total. No bullet points — flowing prose only.`;

  const blockList = blocks.map(b => `${b.time}-${b.endTime}: [${b.type}] ${b.title}`).join("\n");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Today's schedule:\n${blockList}\n\nWrite a brief daily summary.` },
      ],
    }),
  });

  const errResp = handleAIError(response);
  if (errResp) return errResp;
  if (!response.ok) throw new Error("AI gateway error");

  const data = await response.json();
  const summary = data.choices?.[0]?.message?.content ?? "No summary available.";
  return new Response(JSON.stringify({ summary }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // ── Auth guard ──────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const body = await req.json();
    const { type, messages, context, action, text, question, mode, persona_key, sender_name, prompt, idea, personality_sliders, blocks } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // ── Server-side Sparks validation ─────────────────────────────────────────
    // Determine the sparks cost for this request type
    const sparksActionKey = type === "document-tools"
      ? (DOC_ACTION_TO_SPARKS[action as string] || "doc_rewrite")
      : (TYPE_TO_SPARKS_ACTION[type as string] || null);

    const sparksCost = sparksActionKey ? (SPARKS_COSTS[sparksActionKey] ?? 0) : 0;

    // For AI actions that have a cost, validate and deduct server-side
    if (sparksCost > 0) {
      // Initialize admin Supabase client
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Supabase configuration missing");
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      });

      // Verify the user's JWT to get their real user ID
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Invalid or expired session. Please log in again." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Deduct sparks atomically
      const deductResult = await deductSparks(
        user.id,
        sparksCost,
        `${type}${action ? `:${action}` : ""}`,
        sparksActionKey || type,
        supabaseAdmin
      );

      if (!deductResult.success) {
        return new Response(JSON.stringify({
          error: deductResult.error || "Insufficient Sparks",
          sparks_required: sparksCost,
          code: "INSUFFICIENT_SPARKS",
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Route to handler ───────────────────────────────────────────────────────
    if (type === "classify") return await handleClassify(messages, context, LOVABLE_API_KEY);
    if (type === "plan") return await handlePlan(context, LOVABLE_API_KEY);
    if (type === "generate-image") return await handleImageGenerate(prompt || "", LOVABLE_API_KEY);
    if (type === "aura") return await handleAura(messages || [], context || "", LOVABLE_API_KEY);
    if (type === "council") return await handleCouncil(messages ?? [{ role: "user", content: question || "" }], LOVABLE_API_KEY);
    if (type === "council-quick") return await handleCouncilQuick(question, mode, persona_key, LOVABLE_API_KEY);
    if (type === "boardroom-consult") return await handleBoardroomConsult(idea || question || (messages?.[0]?.content) || "a new business idea", personality_sliders, LOVABLE_API_KEY);
    if (type === "document-chat") return await handleDocumentChat(messages, context, LOVABLE_API_KEY);
    if (type === "document-tools") return await handleDocumentTools(action, text, LOVABLE_API_KEY);
    if (type === "message-to-action") return await handleMessageToAction(text || "", sender_name || "Someone", LOVABLE_API_KEY);
    if (type === "daily-summary") return await handleDailySummary(blocks ?? [], LOVABLE_API_KEY);
    return await handleChat(Array.isArray(messages) ? messages : [], LOVABLE_API_KEY);
  } catch (e) {
    console.error("flux-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
