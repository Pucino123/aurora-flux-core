

## Plan: "Aura" AI Personal Assistant Widget

### Overview
Build a new dashboard widget with a Siri-inspired animated orb, streaming AI chat, voice input, and screen-aware context gathering. Integrates into the existing widget system (DraggableWidget, WidgetToggleBar, FocusContext).

### 1. Create the Aura Orb Component
**New file: `src/components/focus/AuraOrb.tsx`**
- Pure CSS `radial-gradient` + `conic-gradient` layered orb with purple/blue/pink/cyan palette
- 4 animation states via Framer Motion:
  - **Idle**: slow scale pulse (1.0 → 1.05), slow gradient rotation (20s cycle)
  - **Listening**: faster pulse, increased saturation, subtle waveform bounce on Y axis
  - **Processing**: rapid spin + contract/expand (scale 0.85 → 1.1)
  - **Speaking**: rhythmic pulse synced to ~200ms intervals while text streams
- Accept `state` prop: `"idle" | "listening" | "processing" | "speaking"`
- Multiple layered `<motion.div>` elements with different `radial-gradient` and `blur` filters for depth

### 2. Create the Aura Widget Component
**New file: `src/components/focus/AuraWidget.tsx`**
- Wraps in `DraggableWidget` (id: `"aura"`, default size ~380x480, proportional position)
- Layout: Orb at top center → scrollable chat history → input bar at bottom
- **Chat history**: array of `{role, content}` messages rendered with `ReactMarkdown`, fade-in animation
- **Input bar**: text input + mic button + send button
- **Voice input**: Browser `SpeechRecognition` API (with fallback toast if unsupported)
- **Streaming**: reuse existing pattern from `FocusCouncilWidget` — fetch to `flux-ai` edge function with SSE parsing

### 3. Context Gathering ("Screen Awareness")
Before sending each user message to the AI, silently collect dashboard state:
- From `useFocusStore()`: sticky notes text, active widgets, timer state, goal text, brain dump tasks
- From `useFlux()`: today's scheduled blocks (calendar), folder titles
- Append as a hidden system context string in the request body (not visible in chat UI)

### 4. Backend: Add `"aura"` handler to `flux-ai` edge function
**Edit: `supabase/functions/flux-ai/index.ts`**
- New `handleAura(messages, context, apiKey)` function
- System prompt: "You are Aura, a personal AI assistant embedded in the user's Flux dashboard. You can see the user's current dashboard state. Match the user's language. Be concise and helpful."
- Include context block with current sticky notes, today's plan, active widgets, goals
- Tool-calling for CRUD actions:
  - `add_task`: creates a task/sticky note
  - `add_to_plan`: adds a time block to today's schedule
  - `clear_schedule`: removes blocks for a given date
- Stream response back via SSE
- Wire up in the main `serve()` router: `type === "aura"`

### 5. Action Execution (CRUD via AI)
In `AuraWidget.tsx`, after streaming completes, check for tool calls in the response:
- `add_task` → push to brain dump tasks via `setBrainDumpTasks`
- `add_to_plan` → call `createBlock` from `useFlux()`
- `clear_schedule` → remove blocks via flux context
- Show confirmation toast after each action

### 6. Register in Widget System
- **Edit `src/components/focus/WidgetToggleBar.tsx`**: Add `{ id: "aura", label: "Aura", icon: Sparkles }` to `OVERFLOW_WIDGETS`
- **Edit `src/components/focus/FocusDashboardView.tsx`**: Import `AuraWidget`, render when `activeWidgets.includes("aura")`

### Technical Details

```text
Widget Architecture:
┌─────────────────────────┐
│  DraggableWidget "aura" │
│  ┌───────────────────┐  │
│  │   AuraOrb (CSS)   │  │
│  │  state-driven     │  │
│  │  gradient anim    │  │
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │  Chat History     │  │
│  │  (scrollable)     │  │
│  │  ReactMarkdown    │  │
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │ [input] [🎤] [→]  │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

- Orb: 3-4 nested `<motion.div>` with `radial-gradient(circle, #a855f7, #3b82f6, #06b6d4, #ec4899)`, each layer offset and blurred differently
- Voice: `window.SpeechRecognition || window.webkitSpeechRecognition`, `interimResults: true` for live transcription
- No new dependencies needed — uses framer-motion, react-markdown, existing flux-ai edge function

### Files to Create
1. `src/components/focus/AuraOrb.tsx`
2. `src/components/focus/AuraWidget.tsx`

### Files to Edit
1. `supabase/functions/flux-ai/index.ts` — add `handleAura` + tool definitions
2. `src/components/focus/WidgetToggleBar.tsx` — register "aura" widget
3. `src/components/focus/FocusDashboardView.tsx` — render AuraWidget

