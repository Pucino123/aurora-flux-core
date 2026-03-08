/**
 * Aura Agent — intent parser + action executor
 * Parses natural language and maps to workspace CRUD operations.
 */

export type AuraActionType =
  | "create_task"
  | "complete_task"
  | "delete_task"
  | "list_tasks"
  | "schedule_event"
  | "reschedule_event"
  | "draft_email"
  | "summarize_inbox"
  | "show_unpaid_invoices"
  | "show_contact_invoices"
  | "send_invoice_reminder"
  | "undo"
  | "none";

export interface ParsedIntent {
  action: AuraActionType;
  params: Record<string, string>;
  confidence: number;
}

// ── Keyword patterns ──────────────────────────────────────────────────────────
const PATTERNS: Array<{ regex: RegExp; action: AuraActionType; extract?: (m: RegExpMatchArray) => Record<string, string> }> = [
  // Undo
  { regex: /^(undo|revert|go back)$/i, action: "undo", extract: () => ({}) },

  // Task creation
  { regex: /\b(add|create|new)\b.{0,30}\btask\b/i, action: "create_task",
    extract: (m) => {
      const raw = m.input || "";
      const titleMatch = raw.match(/(?:task\s+(?:to\s+)?|add\s+(?:a\s+)?(?:high\s+priority\s+)?task\s+(?:to\s+)?)(.+)/i);
      const title = titleMatch ? titleMatch[1].replace(/[.!?]$/, "").trim() : "New Task";
      const priority = /high|urgent|important/i.test(raw) ? "high" : /low/i.test(raw) ? "low" : "medium";
      return { title, priority };
    }
  },
  { regex: /\b(remind me to|i need to|make sure to)\b/i, action: "create_task",
    extract: (m) => {
      const raw = m.input || "";
      const title = raw.replace(/\b(remind me to|i need to|make sure to)\b\s*/i, "").replace(/[.!?]$/, "").trim();
      return { title, priority: "medium" };
    }
  },

  // Complete / mark done
  { regex: /\b(mark|complete|finish|done|tick off)\b.+\b(task|todo|item)\b/i, action: "complete_task",
    extract: (m) => {
      const raw = m.input || "";
      const parts = raw.split(/\b(mark|complete|finish|done|tick off)\b/i);
      const title = (parts[2] || "").replace(/\s*as\s*(done|complete|finished)/i, "").replace(/\bthe\b/i, "").trim();
      return { title };
    }
  },
  { regex: /\bmark\s+(.+?)\s+as\s+(done|complete|finished)/i, action: "complete_task",
    extract: (m) => ({ title: m[1]?.trim() || "" })
  },

  // List / summarize tasks
  { regex: /\b(what('s| is)? (on )?my (tasks?|todos?|list|agenda))|(what do i need to do)|(show (me )?(my )?(tasks?|todos?))/i, action: "list_tasks", extract: () => ({}) },
  { regex: /\b(today's|today|this week('s)?)\s+(tasks?|todos?|priorities)/i, action: "list_tasks", extract: (m) => ({ filter: /week/i.test(m[0]) ? "week" : "today" }) },

  // Schedule event
  { regex: /\b(schedule|book|set up|arrange|create)\b.{0,40}\b(meeting|call|event|session|appointment)\b/i, action: "schedule_event",
    extract: (m) => {
      const raw = m.input || "";
      const withMatch = raw.match(/\bwith\s+([A-Z][a-z]+)/);
      const timeMatch = raw.match(/\bat\s+([\d:]+\s*(?:am|pm)?)/i);
      const dayMatch = raw.match(/\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
      const durMatch = raw.match(/(\d+)\s*(?:-?min|minute|hour)/i);
      return {
        contact: withMatch ? withMatch[1] : "",
        time: timeMatch ? timeMatch[1] : "14:00",
        day: dayMatch ? dayMatch[1] : "tomorrow",
        duration: durMatch ? durMatch[1] : "30",
        title: raw.replace(/\b(schedule|book|set up|arrange|create)\b\s*/i, "")
                   .replace(/\bwith\s+\w+/i, "")
                   .replace(/\bat\s+[\d:]+\s*(?:am|pm)?/i, "")
                   .replace(/[.!?]$/, "").trim().slice(0, 60),
      };
    }
  },

  // Reschedule
  { regex: /\b(move|reschedule|change|shift)\b.{0,40}\b(meeting|call|event)\b/i, action: "reschedule_event",
    extract: (m) => {
      const raw = m.input || "";
      const toMatch = raw.match(/\bto\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|[\d:]+)/i);
      const withMatch = raw.match(/\bwith\s+([A-Z][a-z]+)/);
      return {
        contact: withMatch ? withMatch[1] : "",
        newDay: toMatch ? toMatch[1] : "friday",
      };
    }
  },

  // Draft email
  { regex: /\b(draft|write|compose)\b.{0,20}\b(email|message|mail)\b/i, action: "draft_email",
    extract: (m) => {
      const raw = m.input || "";
      const toMatch = raw.match(/\bto\s+(?:the\s+)?(.+?)\s+about/i);
      const aboutMatch = raw.match(/\babout\s+(.+)/i);
      return {
        to: toMatch ? toMatch[1].trim() : "team",
        subject: aboutMatch ? aboutMatch[1].replace(/[.!?]$/, "").trim() : "Update",
      };
    }
  },

  // Summarize inbox
  { regex: /\b(summarize?|show|read)\b.{0,20}\b(unread|inbox|emails?|messages?)\b/i, action: "summarize_inbox", extract: () => ({}) },

  // Financial / invoice
  { regex: /\b(who owes|unpaid|outstanding|owe)\b/i, action: "show_unpaid_invoices", extract: () => ({}) },
  { regex: /\b(how much does|invoices? for|balance for)\s+([A-Z][a-z]+)/i, action: "show_contact_invoices",
    extract: (m) => ({ contact: m[2]?.trim() || "" })
  },
  { regex: /\b(send|email).{0,20}\b(reminder|payment)\b.{0,20}\bto\s+([A-Z][a-z]+)/i, action: "send_invoice_reminder",
    extract: (m) => ({ contact: m[3]?.trim() || "" })
  },
];

export function parseIntent(input: string): ParsedIntent {
  for (const { regex, action, extract } of PATTERNS) {
    const m = input.match(regex);
    if (m) {
      return { action, params: extract ? extract(m) : {}, confidence: 0.85 };
    }
  }
  return { action: "none", params: {}, confidence: 0 };
}

// ── Action history for undo ────────────────────────────────────────────────────
export interface HistoryEntry {
  type: "create_task" | "update_task" | "delete_task" | "create_event" | "update_event";
  payload: any; // previous state to restore
}

const history: HistoryEntry[] = [];

export function pushHistory(entry: HistoryEntry) {
  history.push(entry);
  if (history.length > 50) history.shift(); // cap at 50
}

export function popHistory(): HistoryEntry | undefined {
  return history.pop();
}
