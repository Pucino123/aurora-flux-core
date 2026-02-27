
## Understanding the current state

Aura already has:
- Streaming AI chat via `flux-ai` edge function (`handleAura`)
- Tool calling: `add_task`, `remove_task`, `complete_task`, `update_task`, `book_meeting`, `add_to_plan`, `clear_schedule`, `create_note`
- Voice input via Web Speech API + Web Audio API amplitude tracking
- Context injection (tasks, folders, schedule, goals, sticky notes)
- Draggable widget with morphing pill UI

## What this spec asks for (scoped realistically)

The spec has 5 sections with ~20 sub-features. Many require entirely new infrastructure (sandboxed code execution, ambient screen capture, personal knowledge graph, full undo/redo state history). I'll implement the highest-impact features that build directly on existing infrastructure:

**Phase 1 — Core agent upgrades (this PR):**
1. Expand Aura's tool set with `set_theme`, `create_folder`, `create_sticky_note`, `open_view` (OS control)
2. Add `aura_memory` table for persistent user preferences — Aura reads/writes memories
3. Add `read_aloud` tool using Web Speech API synthesis (TTS)
4. Multi-step workflow chaining (already partially works via multiple tool calls, improve prompt)
5. Proactive time/event awareness — check if a meeting starts soon, surface alert in pill

**Out of scope for this plan (too complex/risky):**
- Undo/redo global state history stack (requires instrumenting every context mutation)
- Sandboxed code execution / CSV → chart (requires backend sandbox)
- Semantic fuzzy search across all file contents (requires embeddings/vector DB)
- Personal knowledge graph (requires graph DB or embeddings)
- Predictive ghost drafting in documents (separate document editor concern)
- Notification gatekeeper (requires intercepting toast/notification system)
- Custom automation triggers (requires persistent trigger engine)
- External web agent (Perplexity connector available but separate feature)
- Ambient microphone continuous processing (privacy/performance concern)
- In-document Aura overlay (separate document component concern)

---

## Concrete plan

### 1. Database migration — `aura_memory` table
```sql
CREATE TABLE public.aura_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  key text NOT NULL,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, key)
);
ALTER TABLE public.aura_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own memories" ON public.aura_memory FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### 2. `supabase/functions/flux-ai/index.ts` — expand `handleAura`

Add new tools to the Aura tool array:

**`set_theme`** — `{ theme: "dark" | "light" }` — Aura changes the app theme
**`create_folder`** — `{ title, icon?, color? }` — Aura creates a new folder
**`create_sticky_note`** — `{ text, color? }` — Aura creates a focus sticky note  
**`open_view`** — `{ view: "focus" | "canvas" | "calendar" | "tasks" | "analytics" | "documents" | "projects" | "settings" | "council" }` — Aura navigates to a view
**`save_memory`** — `{ key, value }` — Aura stores a preference to `aura_memory`

Update system prompt to:
- Include memories from context: `"Your persistent memories about this user: ..."`
- Describe new tools
- Add smart default instructions: "NEVER ask for clarification on simple requests. Infer the most logical values. If user says 'book a meeting', create it at the next available slot."
- Add multi-step workflow guidance: "You can chain multiple tool calls in one response."

### 3. `src/components/focus/AuraWidget.tsx` — handle new tools + read aloud

**New tool handlers in `handleToolCall`:**
```
set_theme → call setTheme() from next-themes
create_folder → call flux.createFolder(...)
create_sticky_note → add to focusStore sticky notes
open_view → call flux.setActiveView(...)
save_memory → upsert to aura_memory table in Supabase
```

**Read-aloud capability:**
- Add a "🔊" button in the chat history next to assistant messages
- Use `window.speechSynthesis.speak(new SpeechSynthesisUtterance(text))` when clicked
- Aura can also trigger this via a new `read_aloud` tool that accepts `{ text }`

**Load memories at startup:**
- On mount (when user is available), fetch `aura_memory` for user and inject into `gatherContext()`
- Format as: `"Your stored memories: meeting_reminder=10min_before, preferred_language=Danish"`

**Proactive meeting alert:**
- Add a `useEffect` that checks `flux.scheduleBlocks` every 60 seconds
- If a block starts within 5 minutes, switch pill to "hint" mode with: `"Your [meeting] starts in X minutes"`

### 4. `src/context/FluxContext.tsx` — expose `setTheme` passthrough

`setActiveView` already exists. Need to confirm `createFolder` and `createTask` are already exposed (they are). The theme setter needs to be passed from `next-themes` — this is handled in the widget itself via importing `useTheme`.

---

## Files to change

1. **Migration** — new `aura_memory` table
2. **`supabase/functions/flux-ai/index.ts`** — add 5 new tools + update Aura system prompt  
3. **`src/components/focus/AuraWidget.tsx`** — handle new tools, load memories, proactive alert, read-aloud button
