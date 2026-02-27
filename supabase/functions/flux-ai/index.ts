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
  const today = context?.today || new Date().toISOString().split("T")[0];
  const systemPrompt = `You are a world-class daily planning assistant for Flux, inspired by Motion and Notion AI.

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

async function handleDocumentTools(action: string, text: string, apiKey: string) {
  const prompts: Record<string, string> = {
    rewrite: `Rewrite the following text. Keep the same meaning but use different words and sentence structure. Return ONLY the rewritten text, nothing else.\n\nText:\n${text}`,
    improve: `Improve the tone of the following text. Make it more professional, polished, and clear. Return ONLY the improved text, nothing else.\n\nText:\n${text}`,
    summarize: `Summarize the following text in 1-3 concise sentences. Return ONLY the summary, nothing else.\n\nText:\n${text}`,
    expand: `Expand the following text with more detail, examples, and depth. Keep the same tone. Return ONLY the expanded text, nothing else.\n\nText:\n${text}`,
    shorten: `Shorten the following text while keeping the core message intact. Be concise. Return ONLY the shortened text, nothing else.\n\nText:\n${text}`,
    translate: `Detect the language of the following text. If it's Danish, translate to English. If it's English, translate to Danish. If another language, translate to English. Return ONLY the translated text, nothing else.\n\nText:\n${text}`,
  };

  const prompt = prompts[action] || prompts.rewrite;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const errResp = handleAIError(response);
  if (errResp) return errResp;

  if (!response.ok) {
    const t = await response.text();
    console.error("Document tools AI error:", response.status, t);
    throw new Error("AI gateway error");
  }

  const data = await response.json();
  const result = data.choices?.[0]?.message?.content || "";
  return new Response(JSON.stringify({ result }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleCouncilQuick(question: string, mode: string, personaKey: string | undefined, apiKey: string) {
  const PERSONAS_MAP: Record<string, string> = {
    oracle: "🔮 THE ORACLE — Intuition, pattern recognition, long-term wisdom. Speak with depth and foresight.",
    sage: "🌿 THE SAGE — Calm logic, first principles, evidence-based reasoning. Be analytical and grounded.",
    devil: "🌹 THE DEVIL'S ADVOCATE — Challenge every assumption. Find the fatal flaw. Be provocative.",
    stoic: "💧 THE STOIC — Emotional resilience, risk mitigation, steady execution. Be pragmatic.",
    visionary: "☀️ THE VISIONARY — Bold ideas, creative leaps, future possibilities. Be inspiring.",
  };

  let systemPrompt = "";
  if (mode === "debate") {
    systemPrompt = `You are "The Council" — 5 AI personas debating a topic. Format: each persona makes ONE sharp argument (2-3 sentences), then attacks another's point. Use: **🔮 Oracle:**, **🌿 Sage:**, **🌹 Devil's Advocate:**, **💧 Stoic:**, **☀️ Visionary:** as headers. Be concise, direct, and opinionated. Write in the same language as the user's input.`;
  } else if (mode === "single" && personaKey && PERSONAS_MAP[personaKey]) {
    systemPrompt = `You are ${PERSONAS_MAP[personaKey]} Respond in 3-5 sentences. Be direct and in character. Write in the same language as the user's input.`;
  } else {
    systemPrompt = `You are "The Council" — 5 distinct AI advisors. Each gives a short (2-3 sentence) take. Use: **🔮 Oracle:**, **🌿 Sage:**, **🌹 Devil's Advocate:**, **💧 Stoic:**, **☀️ Visionary:** as headers. Be concise and in character. Write in the same language as the user's input.`;
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: question }],
      stream: true,
    }),
  });

  const errResp = handleAIError(response);
  if (errResp) return errResp;
  if (!response.ok) { const t = await response.text(); throw new Error(`AI error: ${t}`); }
  return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
}

async function handleAura(messages: any[], context: string, apiKey: string) {
  const systemPrompt = `You are Aura, a brilliant personal AI assistant embedded in the user's Flux productivity dashboard. You have full visibility into the user's tasks (with IDs), schedule, goals, folders, sticky notes, and today's date.

PERSONALITY:
- Warm, proactive, and genuinely helpful — like the world's best executive assistant.
- Concise but insightful. Max 3 sentences for simple questions, more for complex analysis.
- Match the user's language exactly (Danish → respond in Danish, English → English, etc.)
- Proactively suggest improvements, flag risks, and offer feedback when relevant.

CAPABILITIES:
- Create, complete, update, and remove tasks (with folder assignment).
- Book meetings and add time blocks to the schedule.
- Clear entire days from the schedule.
- Create notes/documents for capturing ideas or information.
- Give productivity feedback, analyze workload, suggest task prioritization.
- Help plan projects by breaking them into tasks across the right folders.

CRITICAL RULES:
- When removing or completing tasks, use the EXACT task_id from context. NEVER guess or fabricate IDs.
- When user says "remove"/"delete" → use remove_task with the matching ID.
- When user says "done"/"finished" → use complete_task with the matching ID.
- When creating tasks, if the user mentions a project or folder, use the matching folder_id from "Available folders" in context.
- For dates: use the "Today" date in context. "Tomorrow" = today + 1 day. Always use YYYY-MM-DD format for due_date.
- Never invent data — only reference what's in the context.
- After performing actions, briefly confirm what you did in the user's language.
- You CAN call multiple tools in one response (e.g., add 3 tasks at once).

═══ DASHBOARD CONTEXT ═══
${context}
═══ END CONTEXT ═══`;

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
        ...messages,
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "add_task",
            description: "Add a new task to the user's task list, optionally assigned to a folder",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Task title" },
                priority: { type: "string", enum: ["low", "medium", "high"], description: "Task priority" },
                folder_id: { type: "string", description: "UUID of the folder to place the task in (from Available folders in context)" },
                due_date: { type: "string", description: "Due date in YYYY-MM-DD format" },
              },
              required: ["title"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "remove_task",
            description: "Remove/delete a task by its ID. Use the exact task_id from the dashboard context.",
            parameters: {
              type: "object",
              properties: {
                task_id: { type: "string", description: "The exact UUID of the task to remove" },
              },
              required: ["task_id"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "complete_task",
            description: "Mark a task as completed/done by its ID.",
            parameters: {
              type: "object",
              properties: {
                task_id: { type: "string", description: "The exact UUID of the task to complete" },
              },
              required: ["task_id"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "update_task",
            description: "Update a task's title, priority, or due date.",
            parameters: {
              type: "object",
              properties: {
                task_id: { type: "string", description: "The exact UUID of the task to update" },
                title: { type: "string", description: "New title (optional)" },
                priority: { type: "string", enum: ["low", "medium", "high"] },
                due_date: { type: "string", description: "YYYY-MM-DD format" },
              },
              required: ["task_id"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "book_meeting",
            description: "Book a meeting or appointment in the user's schedule",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Meeting title, e.g. 'Call with John'" },
                time: { type: "string", description: "Start time, e.g. 09:00, 14:30" },
                duration: { type: "string", description: "Duration, e.g. 30m, 60m, 90m" },
                date: { type: "string", description: "YYYY-MM-DD, defaults to today" },
              },
              required: ["title", "time"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "add_to_plan",
            description: "Add a generic time block to the user's daily schedule",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                time: { type: "string", description: "e.g. 09:00, 14:30" },
                duration: { type: "string", description: "e.g. 30m, 60m" },
                type: { type: "string", enum: ["deep", "meeting", "break", "workout", "custom"] },
                date: { type: "string", description: "YYYY-MM-DD, defaults to today" },
              },
              required: ["title", "time"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "clear_schedule",
            description: "Clear all schedule blocks for a given date",
            parameters: {
              type: "object",
              properties: {
                date: { type: "string", description: "YYYY-MM-DD, defaults to today" },
              },
            },
          },
        },
        {
          type: "function",
          function: {
            name: "create_note",
            description: "Create a new note/document to capture ideas, information, or plans. Use when user asks to note something, write something down, or create a document.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Note/document title" },
                content: { type: "string", description: "Initial content of the note (optional)" },
                folder_id: { type: "string", description: "UUID of the folder to place the note in (from Available folders in context)" },
              },
              required: ["title"],
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, messages, context, action, text, question, mode, persona_key, sender_name } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (type === "classify") return await handleClassify(messages, context, LOVABLE_API_KEY);
    if (type === "plan") return await handlePlan(context, LOVABLE_API_KEY);
    if (type === "aura") return await handleAura(messages || [], context || "", LOVABLE_API_KEY);
    if (type === "council") return await handleCouncil(messages ?? [{ role: "user", content: question || "" }], LOVABLE_API_KEY);
    if (type === "council-quick") return await handleCouncilQuick(question, mode, persona_key, LOVABLE_API_KEY);
    if (type === "document-chat") return await handleDocumentChat(messages, context, LOVABLE_API_KEY);
    if (type === "document-tools") return await handleDocumentTools(action, text, LOVABLE_API_KEY);
    if (type === "message-to-action") return await handleMessageToAction(text || "", sender_name || "Someone", LOVABLE_API_KEY);
    return await handleChat(Array.isArray(messages) ? messages : [], LOVABLE_API_KEY);
  } catch (e) {
    console.error("flux-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
