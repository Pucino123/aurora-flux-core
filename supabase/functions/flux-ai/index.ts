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
    // Classic council personas
    oracle: "🔮 THE ORACLE — Intuition, pattern recognition, long-term wisdom. Speak with depth and foresight.",
    sage: "🌿 THE SAGE — Calm logic, first principles, evidence-based reasoning. Be analytical and grounded.",
    devil: "🌹 THE DEVIL'S ADVOCATE — Challenge every assumption. Find the fatal flaw. Be provocative.",
    stoic: "💧 THE STOIC — Emotional resilience, risk mitigation, steady execution. Be pragmatic.",
    visionary: "☀️ THE VISIONARY — Bold ideas, creative leaps, future possibilities. Be inspiring.",
    // Boardroom advisor personas
    elena: "📊 ELENA VERNA (The Pragmatist) — Growth expert and unit economics specialist. Data-driven, supportive but rigorous. You validate ideas with numbers and market evidence. Respond in 3-5 sentences, staying in character.",
    helen: "💡 HELEN LEE KUPP (The Branding Expert) — Brand positioning and storytelling expert. Creative, balanced, obsessed with differentiation and emotional resonance. Respond in 3-5 sentences, staying in character.",
    anton: "⚠️ ANTON OSIKA (The Devil's Advocate) — Contrarian risk analyst. Skeptical, probing, you expose hidden assumptions and failure modes. Respond in 3-5 sentences, staying in character.",
    margot: "✨ MARGOT VAN LAER (The Visionary) — Long-term potential and community-building expert. Expansive, optimistic, you see transformative possibilities others miss. Respond in 3-5 sentences, staying in character.",
  };

  let systemPrompt = "";
  if (mode === "debate") {
    systemPrompt = `You are "The Council" — 5 AI personas debating a topic. Format: each persona makes ONE sharp argument (2-3 sentences), then attacks another's point. Use: **🔮 Oracle:**, **🌿 Sage:**, **🌹 Devil's Advocate:**, **💧 Stoic:**, **☀️ Visionary:** as headers. Be concise, direct, and opinionated. Write in the same language as the user's input.`;
  } else if ((mode === "single" || mode === "deep-dive") && personaKey && PERSONAS_MAP[personaKey]) {
    systemPrompt = `You are ${PERSONAS_MAP[personaKey]} Be direct, opinionated, and in character. Reference specific details from the user's question. Write in the same language as the user's input.`;
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
  const systemPrompt = `You are Aura — a fully functional, proactive Advanced Executive Assistant embedded in the user's Flux productivity dashboard. You have full permissions to Create, Read, Update, and Delete (CRUD) across tasks, calendars, documents, and spreadsheets.

PERSONALITY:
- Warm, proactive, and genuinely helpful — like the world's best executive assistant.
- Concise but insightful. Max 3 sentences for simple questions, more for complex analysis.
- Match the user's language exactly (Danish → respond in Danish, English → English, etc.)
- Proactively suggest improvements, flag risks, and offer feedback when relevant.

═══ CAPABILITIES — FULL CRUD ═══

TASK MANAGEMENT:
- Create new tasks with clear deadlines, priorities, and descriptions.
- Update/delete tasks — locate specific tasks to modify details, mark complete, or delete.
- Connect tasks to relevant meetings, documents, or spreadsheets.

CALENDAR & MEETINGS:
- Schedule meetings (title, time, attendees context, location/link).
- Reschedule meetings using update_calendar_block (change time, date, or duration).
- Cancel/delete specific schedule blocks using remove_block.
- When booking a complex meeting → automatically chain: create agenda note + create tracking spreadsheet + add review task.

DOCUMENT HANDLING:
- Create & write new documents or notes from scratch.
- Append to existing documents using append_to_document (adds without overwriting).
- Overwrite/replace only when user explicitly says "replace", "overwrite", or "rewrite".
- Delete entire documents using delete_document.
- Generate long-form content and inject into the active document.

SPREADSHEET MANAGEMENT:
- Create new spreadsheets and set up initial structures.
- Inject values or formulas into specific cells using inject_formula or update_spreadsheet_cell.
- Write data rows and update specific cells on request.

OTHER:
- Create folders, sticky notes, goals.
- Navigate to any view, toggle theme.
- Save persistent memories, generate images.

═══ CROSS-FUNCTIONAL INTEGRATION (CRITICAL) ═══

When receiving a complex request, think holistically and chain tools:
- "Book a meeting with the sales team about Q3 strategy tomorrow at 10 AM" →
  1. book_meeting: title="Sales Q3 Strategy", time="10:00", date=tomorrow
  2. create_note: title="Agenda: Q3 Strategy"
  3. create_spreadsheet: title="Q3 Sales Tracking"
  4. add_task: title="Review agenda and tracking sheet before the sales meeting", priority="high"

- "Prepare for the Magnus meeting" → create note "Meeting Notes - Magnus", create task "Prep for Magnus", open documents view.
- Always chain multiple tool calls in a single response without waiting for user confirmation.

═══ DOCUMENT-AWARE GENERATION RULES (CRITICAL) ═══

When a text document IS open in context (see "CURRENTLY OPEN DOCUMENT"):
- write_to_document with target="current" APPENDS by default — adds new content after existing content.
- Only REPLACE/OVERWRITE if user says "replace", "overwrite", or "rewrite".
- For append_to_document: appends a specific piece of text to the existing document.
- IMMEDIATELY write — no confirmation, no outline first. Write the FULL content.

When NO document is open:
- Use write_to_document with target="new" to create a fresh document.

NEVER ask the user whether to use current or new — default to open document if one exists.
The content field must contain the COMPLETE text — no placeholders, no "...".

═══ SMART DEFAULTS ═══

- "Book a meeting" → title="Meeting", time=next clean hour, duration="30m", date=today
- "Add a task" → title="New Task", priority="medium"
- "Reschedule to 3pm" → update_calendar_block with the block from context, new time="15:00"
- Infer missing details from context. Act immediately. Never ask for clarification on simple requests.

═══ CRITICAL RULES ═══

- Use EXACT IDs from context — NEVER fabricate IDs.
- remove_task / complete_task: use exact task_id from context.
- remove_block: use exact block_id from context (shown as [block_id:xxx]).
- delete_document: use exact doc_id from context (shown as [doc_id:xxx]).
- append_to_document: use exact doc_id from context when a document is open.
- update_calendar_block: use exact block_id from context.
- For dates: "Tomorrow" = today + 1 day. Always use YYYY-MM-DD format.
- After performing actions, confirm concisely in the user's language.
- Use save_memory for persistent user preferences.

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
      model: "google/gemini-3-flash-preview",
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
        {
          type: "function",
          function: {
            name: "set_theme",
            description: "Switch the app theme to dark or light mode. Use when user says 'dark mode', 'light mode', 'turn on dark mode', etc.",
            parameters: {
              type: "object",
              properties: {
                theme: { type: "string", enum: ["dark", "light"], description: "The theme to apply" },
              },
              required: ["theme"],
            },
          },
        },
          {
            type: "function",
            function: {
              name: "remove_block",
              description: "Remove/delete a single schedule block by its block_id. Use the exact block_id from the dashboard context. Use this when user says 'remove', 'delete', or 'cancel' a specific meeting or block.",
              parameters: {
                type: "object",
                properties: {
                  block_id: { type: "string", description: "The exact block_id from the schedule context" },
                },
                required: ["block_id"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "create_folder",
            description: "Create a new folder/project on the dashboard. Use when user asks to create a folder, project, or workspace.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Folder name" },
                icon: { type: "string", description: "Emoji icon for the folder (optional)" },
                color: { type: "string", description: "Color for the folder, e.g. #6366f1 (optional)" },
              },
              required: ["title"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "create_sticky_note",
            description: "Create a sticky note on the focus dashboard. Use when user asks to create a sticky note, reminder note, or quick note.",
            parameters: {
              type: "object",
              properties: {
                text: { type: "string", description: "The sticky note text content" },
                color: { type: "string", enum: ["yellow", "pink", "blue", "green", "purple"], description: "Sticky note color (default: yellow)" },
              },
              required: ["text"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "open_view",
            description: "Navigate to a specific view/section of the app. Use when user says 'open calendar', 'go to tasks', 'show documents', 'take me to settings', etc.",
            parameters: {
              type: "object",
              properties: {
                view: {
                  type: "string",
                  enum: ["focus", "canvas", "calendar", "tasks", "analytics", "documents", "projects", "settings", "council"],
                  description: "The view to navigate to",
                },
              },
              required: ["view"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "save_memory",
            description: "Save a persistent preference or fact about the user to long-term memory. Use when user expresses a preference like 'always remind me X minutes before meetings', 'I prefer dark mode', etc.",
            parameters: {
              type: "object",
              properties: {
                key: { type: "string", description: "Short snake_case key for the memory, e.g. 'meeting_reminder', 'preferred_language'" },
                value: { type: "string", description: "The value to store" },
              },
              required: ["key", "value"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "read_aloud",
            description: "Read a text aloud using text-to-speech. Use when user asks to 'read this out loud', 'say that again', or 'read aloud'.",
            parameters: {
              type: "object",
              properties: {
                text: { type: "string", description: "The text to speak aloud" },
              },
              required: ["text"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "create_spreadsheet",
            description: "Create a new spreadsheet document. Use when user asks to 'create a spreadsheet', 'make a table', 'new sheet', etc.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Spreadsheet title" },
                folder_id: { type: "string", description: "UUID of the folder to place the spreadsheet in (optional)" },
              },
              required: ["title"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "delete_folder",
            description: "Delete/remove a folder by its ID. Use when user asks to delete or remove a folder. Use the exact folder_id from context.",
            parameters: {
              type: "object",
              properties: {
                folder_id: { type: "string", description: "The exact UUID of the folder to delete (from Available folders in context)" },
              },
              required: ["folder_id"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "create_goal",
            description: "Create a new goal with a target amount and deadline. Use when user says they want to save money, achieve a target, or set a goal.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Goal title, e.g. 'Save for vacation'" },
                target_amount: { type: "number", description: "Target amount in local currency" },
                current_amount: { type: "number", description: "Current progress amount (default 0)" },
                deadline: { type: "string", description: "Deadline date in YYYY-MM-DD format (optional)" },
                folder_id: { type: "string", description: "UUID of the folder to link the goal to (optional)" },
              },
              required: ["title"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "pin_task",
            description: "Pin or unpin a task to make it appear at the top. Use when user says 'pin this task', 'prioritize', or 'put at top'.",
            parameters: {
              type: "object",
              properties: {
                task_id: { type: "string", description: "The exact UUID of the task to pin" },
                pinned: { type: "boolean", description: "true to pin, false to unpin" },
              },
              required: ["task_id", "pinned"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "rename_item",
            description: "Rename a folder or task. Use when user says 'rename folder X to Y' or 'rename task X'.",
            parameters: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["folder", "task"], description: "Whether to rename a folder or a task" },
                id: { type: "string", description: "The exact UUID of the item to rename" },
                new_title: { type: "string", description: "The new title/name" },
              },
              required: ["type", "id", "new_title"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "summarize_context",
            description: "Summarize the user's current dashboard state: tasks, schedule, goals. Use when user asks for a status report, 'what's on my plate', 'give me an overview', etc. No parameters needed — you already have the context.",
            parameters: {
              type: "object",
              properties: {},
            },
          },
        },
        {
          type: "function",
          function: {
            name: "generate_image",
            description: "Generate an image using AI. Use when the user asks to 'generate', 'create', 'draw', or 'make' an image, illustration, concept art, or any visual. Always include enough visual detail in the prompt.",
            parameters: {
              type: "object",
              properties: {
                prompt: { type: "string", description: "Detailed image generation prompt describing the visual content, style, mood, and composition" },
                target: { type: "string", enum: ["dashboard", "document"], description: "Where to place the image: 'dashboard' spawns a floating image widget, 'document' inserts into the currently open document" },
              },
              required: ["prompt", "target"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "write_to_document",
            description: "Write long-form content (report, essay, article, story, plan, etc.) into a document. Use when user asks to write anything substantial. If a text document is open, use target='current' to inject into it. Otherwise use target='new' to create a new document. The content must be the COMPLETE final text — no outlines or placeholders.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Title of the document (used when creating a new one)" },
                content: { type: "string", description: "The COMPLETE text content to write. Must be the full piece — no placeholders." },
                target: { type: "string", enum: ["current", "new"], description: "'current' = inject into the open document, 'new' = create a new document" },
                folder_id: { type: "string", description: "Folder UUID to place the new document in (optional)" },
              },
              required: ["title", "content", "target"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "inject_formula",
            description: "Inject a formula or value directly into a spreadsheet cell. Only use when a spreadsheet document is open (context says 'Open document' with a spreadsheet). The cell reference must be in A1 notation (e.g. B3, C10).",
            parameters: {
              type: "object",
              properties: {
                cell: { type: "string", description: "Cell reference in A1 notation, e.g. 'B3', 'C10'" },
                formula: { type: "string", description: "The formula or value to inject, e.g. '=SUM(A1:A10)' or '=A2*B2'" },
                note: { type: "string", description: "Brief explanation of what the formula does (optional)" },
              },
              required: ["cell", "formula"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "update_spreadsheet_cell",
            description: "Write a value or formula into a specific spreadsheet cell. Use when user asks to set a cell value, update a cell, or enter data in a specific cell. Only when a spreadsheet is open.",
            parameters: {
              type: "object",
              properties: {
                cell: { type: "string", description: "Cell reference in A1 notation, e.g. 'B3', 'C10'" },
                value: { type: "string", description: "The value or formula to write, e.g. '=SUM(A1:A10)', 'Hello', '42'" },
                note: { type: "string", description: "Brief explanation of what was written (optional)" },
              },
              required: ["cell", "value"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "delete_document",
            description: "Permanently delete a document by its ID. Use when user says 'delete this document', 'remove this file', or 'trash this document'. Use the doc_id from context ([doc_id:xxx]).",
            parameters: {
              type: "object",
              properties: {
                doc_id: { type: "string", description: "The exact UUID of the document to delete (from [doc_id:xxx] in context)" },
                title: { type: "string", description: "Document title for confirmation message (optional)" },
              },
              required: ["doc_id"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "append_to_document",
            description: "Append new text to an existing document WITHOUT overwriting previous content. Use when user says 'add to this document', 'append', 'continue writing', or 'add a section'. The doc_id comes from context ([doc_id:xxx]).",
            parameters: {
              type: "object",
              properties: {
                doc_id: { type: "string", description: "The exact UUID of the document to append to (from [doc_id:xxx] in context)" },
                content: { type: "string", description: "The COMPLETE text to append. Must be the full new section — no placeholders." },
              },
              required: ["doc_id", "content"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "update_calendar_block",
            description: "Reschedule an existing calendar block — change its time, date, or duration. Use when user says 'move the meeting to X', 'reschedule to', or 'change the time of'. Use the exact block_id from context ([block_id:xxx]).",
            parameters: {
              type: "object",
              properties: {
                block_id: { type: "string", description: "The exact block_id from the schedule context ([block_id:xxx])" },
                time: { type: "string", description: "New start time, e.g. '15:00', '09:30' (optional)" },
                scheduled_date: { type: "string", description: "New date in YYYY-MM-DD format (optional)" },
                duration: { type: "string", description: "New duration, e.g. '30m', '60m' (optional)" },
                title: { type: "string", description: "New title for the block (optional)" },
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
  // Extract base64 and mime type
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
  // Build slider-aware personality descriptions for each advisor
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

// ── Daily Summary handler ──────────────────────────────────────────────────
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

  try {
    const { type, messages, context, action, text, question, mode, persona_key, sender_name, prompt, idea, personality_sliders, blocks } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
