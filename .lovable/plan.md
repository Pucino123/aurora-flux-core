
## What's already in place
- Aura has a full tool-calling architecture in `flux-ai/index.ts` with 15+ tools
- `AuraWidget.tsx` handles all tool calls client-side
- Image generation model `google/gemini-3-pro-image-preview` is available via Lovable AI (no API key needed)
- `LOVABLE_API_KEY` is already configured as a secret
- Documents/spreadsheets are created via the Supabase `documents` table
- `HomeWidgets.tsx` renders draggable dashboard widgets via `DraggableWidget`
- `FocusDashboardView.tsx` renders widgets conditionally based on `activeWidgets`

## Scope for this plan (high-impact, feasible)

**Feature 1 — Code blocks with syntax highlighting**
Aura already streams markdown via `ReactMarkdown`. Add `react-syntax-highlighter` (or use a CSS-only approach with `<pre>/<code>` + Tailwind) to render fenced code blocks properly in the chat history in `AuraWidget.tsx`.

**Feature 2 — Image generation & dashboard spawning**
Add a new `generate_image` tool to the Aura edge function. Client-side, call a new edge-function endpoint `type: "generate-image"` which uses `google/gemini-3-pro-image-preview`. The returned base64 image is uploaded to the existing `document-images` storage bucket, and Aura spawns a new `ImageWidget` on the dashboard.

**Feature 3 — In-document image insertion**
When Aura is active inside a document context (injectedDocContext), the `generate_image` tool can also dispatch a `aura:insert-image` custom event with the image URL, which `DocumentView.tsx` listens to and inserts as an `<img>` tag at the end of the document HTML content.

**Feature 4 — Spreadsheet formula injection**
Add a `inject_formula` tool. When Aura is active with a spreadsheet document context, it writes a formula string into a specific cell. The document viewer listens for `aura:inject-formula` event with `{ cell, formula }` and updates the spreadsheet content.

**Out of scope (too risky/complex for this session):**
- Contextual code debugging with "Click to Fix" (requires selecting code in document, tracking cursor position — large UI change)
- Charting from spreadsheet data (requires recharts widget integration with live data binding)
- Direct file creation on the dashboard (dashboard already has desktop docs, but injecting generated code requires a new "code document" type)

---

## Files to change

### 1. `supabase/functions/flux-ai/index.ts`
Add two new handlers + tools:

**New handler `handleImageGenerate(prompt, apiKey)`:**
- Calls `https://ai.gateway.lovable.dev/v1/chat/completions` with `model: "google/gemini-3-pro-image-preview"` and `modalities: ["image", "text"]`
- Returns `{ imageBase64, mimeType }` as JSON
- Called when `type === "generate-image"`

**New tools in `handleAura`:**
```
generate_image: { prompt: string, target: "dashboard" | "document" }
inject_formula: { cell: string, formula: string, note?: string }
```

Update system prompt in `handleAura` to describe these new capabilities.

### 2. `src/components/focus/AuraWidget.tsx`
Handle two new tools in `handleToolCall`:

**`generate_image`:**
1. Show toast "Generating image…"
2. Call edge function `type: "generate-image"` with the prompt
3. Upload base64 to `document-images` bucket → get public URL
4. If `target === "dashboard"`: dispatch `aura:spawn-image-widget` with `{ url, prompt }`
5. If `target === "document"`: dispatch `aura:insert-image` with `{ url }`

**`inject_formula`:**
- Dispatch `aura:inject-formula` custom event with `{ cell, formula }` — DocumentView listens and updates spreadsheet

**Code block rendering:**
- In the chat history section, replace plain `<ReactMarkdown>` with a version that uses a custom `code` renderer — detect fenced code blocks and render them in a styled `<pre className="bg-black/40 rounded p-2 text-xs font-mono overflow-x-auto">` block with a copy button.

### 3. `src/components/focus/FocusDashboardView.tsx`
- Add listener for `aura:spawn-image-widget` event
- On event: add a new entry to a local `auraImages` state array `{ id, url, prompt }`
- Render `<AuraImageWidget>` for each entry (draggable via `DraggableWidget`)

### 4. `src/components/focus/AuraImageWidget.tsx` (new file)
Simple widget: displays the generated image with title from the prompt, a close/remove button, and a download button.

### 5. `src/components/documents/DocumentView.tsx`
**For text documents:**
- Add `useEffect` listening for `aura:insert-image` event
- On event: append `<img src="..." />` to the document HTML content via `onUpdate`

**For spreadsheet documents:**
- Add `useEffect` listening for `aura:inject-formula` event  
- On event: parse `cell` (e.g., "B3" → col 1, row 2), update the `cells` map in content, call `onUpdate`

---

## Implementation steps

1. Add `handleImageGenerate` to `flux-ai/index.ts`, add `generate_image` + `inject_formula` tools to `handleAura`, update system prompt
2. Create `src/components/focus/AuraImageWidget.tsx`
3. Update `AuraWidget.tsx`: handle `generate_image` + `inject_formula` tools, add code block renderer
4. Update `FocusDashboardView.tsx`: listen for `aura:spawn-image-widget`, render `AuraImageWidget` instances
5. Update `DocumentView.tsx`: listen for `aura:insert-image` and `aura:inject-formula` events
