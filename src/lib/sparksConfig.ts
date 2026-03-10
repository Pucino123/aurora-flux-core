/**
 * ═══════════════════════════════════════════════════════
 *  SPARKS CONFIGURATION — single source of truth
 * ═══════════════════════════════════════════════════════
 *
 *  Plan Monthly Allowances
 *  ─────────────────────────────────────────────────────
 *  Starter  →  50 Sparks  (one-time on signup)
 *  Pro      →  500 Sparks / month
 *  Team     →  1500 Sparks / month (per seat)
 *
 *  Pricing Philosophy
 *  ─────────────────────────────────────────────────────
 *  Pro users get 500 Sparks/month.
 *  A typical Pro user can send ~50 Aura messages/month (10 Sparks each)
 *  OR run ~25 Council analyses (20 Sparks each).
 *  Light tasks (1-3 Sparks) should feel nearly free.
 *  Heavy multi-model chains (15-20 Sparks) are premium.
 */

export const PLAN_SPARKS: Record<string, number> = {
  Starter: 50,   // one-time signup gift
  Pro: 500,      // monthly per user
  Team: 400,     // per seat/month → deposited into shared team pool
};

/**
 * Sparks cost per AI action.
 * Keep this as the ONLY place to change prices.
 */
export const SPARKS_COSTS = {
  // ── Aura (general assistant) ──────────────────────────────
  aura_message: 2,          // each Aura chat message

  // ── Stream / classify ─────────────────────────────────────
  stream_classify: 3,       // AI classifies a new note/task

  // ── Daily Planner ─────────────────────────────────────────
  ai_daily_plan: 10,        // full AI schedule generation

  // ── Council ───────────────────────────────────────────────
  council_analysis: 15,     // full 5-persona council round
  council_quick: 5,         // single persona quick-fire
  council_thread: 3,        // reply to one persona
  council_execute: 10,      // execution pipeline generation
  council_simulate: 8,      // scenario simulation
  council_debate: 8,        // debate mode round
  council_weakness: 5,      // weakness scanner
  boardroom_consult: 10,    // boardroom advisor consult

  // ── Document AI tools ─────────────────────────────────────
  doc_rewrite: 5,
  doc_improve: 3,
  doc_summarize: 3,
  doc_expand: 5,
  doc_shorten: 3,
  doc_translate: 8,
  doc_chat: 2,              // document chat message

  // ── Image generation ──────────────────────────────────────
  generate_image: 8,

  // ── Smart plan / weekly digest ────────────────────────────
  smart_plan: 5,
  weekly_digest: 5,

  // ── Message-to-action (CommHub AI) ────────────────────────
  message_action: 2,

  // ── Daily summary ─────────────────────────────────────────
  daily_summary: 3,
} as const;

export type SparksAction = keyof typeof SPARKS_COSTS;

/** Labels shown in the UI next to each AI button */
export const ACTION_LABELS: Partial<Record<SparksAction, string>> = {
  aura_message: "Aura message",
  council_analysis: "Council analysis",
  council_quick: "Quick persona reply",
  council_thread: "Thread reply",
  council_execute: "Execution pipeline",
  doc_rewrite: "AI Rewrite",
  doc_improve: "Improve Tone",
  doc_summarize: "Summarize",
  doc_expand: "Expand",
  doc_shorten: "Shorten",
  doc_translate: "Translate",
  generate_image: "Image generation",
  ai_daily_plan: "AI Daily Plan",
};
