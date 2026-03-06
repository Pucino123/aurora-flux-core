
## Upgrade Aura to Advanced Executive Assistant

### What's changing

**Goal:** Make Aura a fully integrated executive assistant that can holistically manage tasks, calendar, documents, and spreadsheets — including cross-functional chaining (booking a meeting auto-creates agenda + spreadsheet + task).

---

### 1. New tools to add in the edge function (`flux-ai/index.ts`)

| Tool | Purpose |
|---|---|
| `update_spreadsheet_cell` | Write a value or formula into a specific cell of an open spreadsheet |
| `delete_document` | Delete/remove an existing document by its ID |
| `append_to_document` | Append new text to an existing document without overwriting |
| `update_calendar_block` | Reschedule an existing block (change time/date/duration) |

### 2. System prompt overhaul (`handleAura`)

Replace the current prompt with the Advanced Executive Assistant spec:
- Explicit CRUD capabilities listed per domain (Tasks, Calendar, Documents, Spreadsheets)
- **Cross-functional chaining rule:** When a complex meeting is booked → chain `create_note` (agenda) + `create_spreadsheet` (tracking) + `add_task` (review task)
- **Append vs overwrite:** `write_to_document` with `target="current"` defaults to **appending** unless user says "replace", "overwrite", or "rewrite"
- **Confirmation protocol:** After any action(s), concise confirmation in user's language
- Smart defaults remain (no confirmation on simple requests)

### 3. New tool handlers in `AuraWidget.tsx`

Wire up the 4 new tools:
- `update_spreadsheet_cell` → fires `aura:inject-formula` event (already handled by the spreadsheet editor), includes a value mode
- `delete_document` → calls Supabase `documents` delete by ID, shows toast
- `append_to_document` → fires `aura:stream-to-document` with `append: true`
- `update_calendar_block` → calls `flux.updateBlock(id, { time, duration, scheduled_date })`

### 4. Context enrichment

Add open document's ID to context string so Aura can reference it when calling `delete_document` or `append_to_document`. Currently only title/content is passed — add `[doc_id: xxx]` to the injected doc context.

---

### Files to edit

```text
supabase/functions/flux-ai/index.ts   — system prompt + 4 new tool definitions
src/components/focus/AuraWidget.tsx   — 4 new tool handlers + context doc ID
```

### Technical notes

- `update_spreadsheet_cell` reuses the existing `aura:inject-formula` event — the spreadsheet editor already handles this
- `append_to_document` uses the existing `aura:stream-to-document` with `append: true` flag
- `delete_document` requires the doc ID from context — Aura gets it from the enriched context string `[doc_id: xxx]`
- `update_calendar_block` needs `flux.updateBlock` — need to verify it exists in FluxContext
