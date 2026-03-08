
## Full Plan: 5 Tasks

### Current State Assessment
1. **CouncilBoardroom**: Full 2×2 grid with real AI already working. The `sendChat` deep dive sends all at once (non-streaming). Expand uses `flex: 7` layout. No full-screen modal.
2. **CRMWidget**: @dnd-kit DnD already fully implemented and working (DraggableDeal + DroppableStage + DragOverlay). No DB persistence.
3. **NotesWidget**: Full cloud persistence already implemented via `tasks` table. Rich text toolbar buttons exist but are cosmetic only (Bold/Italic/Underline don't apply formatting).
4. **flux-ai edge**: `handleCouncilQuick` already supports SSE streaming (`stream: true`). The deep dive chat uses `supabase.functions.invoke` (non-streaming). Need a new `boardroom-deep-dive` streaming handler, or adapt `council-quick` mode `deep-dive` to stream.

---

### Task 1 — Verify End-to-End + Fix Issues

Reading the code confirms:
- Notes lock/unlock: ✅ implemented (password "1234")
- CRM drag-and-drop: ✅ already uses @dnd-kit (DraggableDeal/DroppableStage/DragOverlay)
- Boardroom real AI: ✅ already calls `flux-ai` with `boardroom-consult`
- All features look correct as implemented

**One fix needed**: The `sendChat` in CouncilBoardroom uses `supabase.functions.invoke` (non-streaming). The `council-quick` handler already has SSE streaming mode with `mode: "deep-dive"` and `persona_key`. We need to wire the 1-on-1 chat to stream token-by-token using SSE.

---

### Task 2 — Stream 1-on-1 Chat Token-by-Token

**Current**: `sendChat` uses `supabase.functions.invoke` which returns after full response.

**Change**: Replace with direct SSE `fetch` to stream tokens. The edge function `council-quick` with `mode: "deep-dive"` already streams (`stream: true`, returns `text/event-stream`). Just need the frontend to consume the SSE stream.

**In `CouncilBoardroom.tsx` — `PersonaCard.sendChat`**:
- Replace `supabase.functions.invoke` with a `fetch` to `${VITE_SUPABASE_URL}/functions/v1/flux-ai`
- Body: `{ type: "council-quick", question: msg, mode: "deep-dive", persona_key: persona.key }`
- Parse SSE line-by-line: `reader.read()` → split by `\n` → strip `data: ` → parse JSON → `choices[0].delta.content`
- On each delta: `setStreamingText(prev => prev + chunk)` → show live
- Append as a single assistant message that grows token-by-token

**Edge function change**: The `council-quick` handler uses a generic `PERSONAS_MAP` that maps `oracle/sage/devil/stoic/visionary`. The boardroom uses `elena/helen/anton/margot` keys. Need to add boardroom persona system prompts to `PERSONAS_MAP` in `handleCouncilQuick`.

---

### Task 3 — CRM Persistence (New DB table)

**New migration**: Create `crm_deals` table:
```sql
CREATE TABLE public.crm_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  company text NOT NULL DEFAULT '',
  value numeric NOT NULL DEFAULT 0,
  stage text NOT NULL DEFAULT 'leads',
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own crm deals" ON public.crm_deals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

**`CRMWidget.tsx` changes**:
- Import `useAuth` + `supabase`
- On mount: load deals from `crm_deals` where `user_id = user.id`; if none, insert `INITIAL_DEALS` seeded for user
- On deal stage change: `supabase.from("crm_deals").update({ stage }).eq("id", deal.id)`
- On add deal: `supabase.from("crm_deals").insert({ name, company, value, stage: "leads", user_id })`
- Show loading spinner during initial load
- Guest/logged-out: use local state only (same as today)

---

### Task 4 — Full-Screen Persona Modal

**New component `PersonaFullscreenModal`** in `CouncilBoardroom.tsx`:
- Triggered by clicking on a revealed persona card (NOT just the Discuss button — clicking anywhere on the card should work if revealed, OR a new "Expand" button distinct from the current 1-on-1 inline expand)
- **Design**: Fixed overlay (`fixed inset-0 z-50 bg-black/70 backdrop-blur-xl`) containing a centered panel (`max-w-4xl w-full h-[85vh] rounded-3xl`)
- **Left (40%)**: Persona profile — large avatar ring, name, archetype, full analysis text, bolded terms, Socratic question
- **Right (60%)**: Full 1-on-1 chat thread (scrollable), with streaming input at bottom
- **Confidence history chart**: Small inline recharts `BarChart` showing `[previous, current]` confidence — using `[p.ringPct * 0.8, response.confidence]` as mock history data
- Uses the same `sendChat` SSE streaming logic from Task 2
- Triggered by a new "⬡ Full View" button on each revealed card (replacing or alongside the current MessageSquare Discuss button)

**Grid layout change**: The existing `flex: 7` deep dive inline stays as a "compact" mode. The full-screen modal is triggered by a different button (Maximize/Expand icon).

---

### Task 5 — Rich Text Notes (contenteditable)

**Current**: Plain `<textarea>` in `NoteContent`. Bold/Italic/Underline buttons are cosmetic.

**Change**: Replace `<textarea>` with a `contenteditable` div that uses `document.execCommand` (for B/I/U) + markdown shortcut conversion.

**Implementation in `NotesWidget.tsx`**:
- Replace `<textarea>` with `<div contentEditable ref={editorRef}` 
- `onInput`: read `editorRef.current.innerText` for title extraction + `innerHTML` for full content save
- Bold/Italic/Underline toolbar buttons: `document.execCommand("bold")` etc.
- **Markdown shortcuts**: `useEffect` on keydown — when user types ` ` or `Enter` after `**word**`, convert to `<b>word</b>`; similarly `*word*` → `<em>word</em>`; `_word_` → `<u>word</u>`
- **Syncing content**: Store `innerHTML` as content in state/DB (not plaintext). When rendering an existing note, set `editorRef.current.innerHTML = note.content` on note switch (via `useEffect` keyed on `selectedId`)
- **Title extraction**: `editorRef.current.innerText.split("\n")[0]?.trim()` for sidebar preview
- **Risk**: `document.execCommand` is deprecated but still works in all modern browsers for these basic operations; no alternative without a heavy library

---

### Files to Change

1. **`supabase/functions/flux-ai/index.ts`** — Add boardroom persona keys (elena/helen/anton/margot) to `PERSONAS_MAP` in `handleCouncilQuick`
2. **`src/components/council/CouncilBoardroom.tsx`** — (a) SSE streaming in `sendChat`, (b) `PersonaFullscreenModal` with chart, (c) "Full View" button on cards
3. **`src/components/focus/CRMWidget.tsx`** — Load/save/update from `crm_deals` DB table
4. **`src/components/focus/NotesWidget.tsx`** — Replace textarea with `contenteditable`, wire B/I/U commands, markdown shortcuts
5. **Migration** — Create `crm_deals` table with RLS

### Implementation Order
1. DB migration for `crm_deals`
2. CRM persistence (`CRMWidget.tsx`)
3. SSE streaming deep dive + fullscreen modal (`CouncilBoardroom.tsx` + edge function)
4. Rich text notes (`NotesWidget.tsx`)
