import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
          content: `You are an Intelligent Dashboard Architect for a productivity app called Flux.

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
  const systemPrompt = `You are a world-class daily planning assistant for Flux, inspired by Motion and Notion AI.

You are a Proactive Productivity Strategist. You must think before generating.

REASONING PHASE — Think carefully before generating blocks:
1. SCAN all provided tasks. Categorize by: urgency (overdue/due today), priority (high > medium > low), type (creative, admin, communication).
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

async function handleChat(messages: any[], apiKey: string) {
  const systemPrompt = "You are Flux, a helpful productivity assistant. Keep answers clear, concise, and actionable.";

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
- Generate a bias_radar with 5 axes scored 0-10: ["Overconfidence", "Market Fit", "Execution Risk", "User Appeal", "Growth Potential"]
- Write in the same language as the user's input (Danish if Danish, English if English).
- Be direct, opinionated, and avoid generic platitudes.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userIdea },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "council_analysis",
            description: "Return structured analysis from all 5 Council personas",
            parameters: {
              type: "object",
              properties: {
                personas: {
                  type: "array",
                  description: "Exactly 5 persona analyses in order: Strategist, Operator, Skeptic, User Advocate, Growth Architect",
                  items: {
                    type: "object",
                    properties: {
                      analysis: { type: "string", description: "80-150 word analysis from this persona's perspective" },
                      vote: { type: "string", enum: ["GO", "EXPERIMENT", "PIVOT", "KILL"] },
                    },
                    required: ["analysis", "vote"],
                  },
                },
                bias_radar: {
                  type: "array",
                  description: "5 radar chart data points",
                  items: {
                    type: "object",
                    properties: {
                      axis: { type: "string" },
                      value: { type: "number", description: "Score 0-10" },
                    },
                    required: ["axis", "value"],
                  },
                },
              },
              required: ["personas", "bias_radar"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "council_analysis" } },
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
  return new Response(JSON.stringify({ personas: [], bias_radar: [] }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (type === "classify") return await handleClassify(messages, context, LOVABLE_API_KEY);
    if (type === "plan") return await handlePlan(context, LOVABLE_API_KEY);
    if (type === "council") return await handleCouncil(messages, LOVABLE_API_KEY);
    return await handleChat(messages, LOVABLE_API_KEY);
  } catch (e) {
    console.error("flux-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
