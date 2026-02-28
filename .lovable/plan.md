
## Issues to Fix

### Issue 1: Input text overflow
The `<input>` element is single-line and overflows when text is too long. Replace with a `<textarea>` that auto-resizes based on content.

### Issue 2: Send button disappears in conversation
When `messages.length > 0`, the send button is replaced entirely by an X (close) button. The user cannot send follow-up messages. Fix: always show the Send button, and move the X/close button to a separate position (e.g. top-right of the pill or alongside the send button).

### Issue 3: Aura overlay not appearing in documents
The document viewer opens as a modal/overlay that creates its own CSS stacking context (e.g. `z-index: 101`). Even though `AuraWidget` sets `zIndex: 9999` on `DraggableWidget`, the widget lives inside the Focus dashboard's DOM tree which is behind the document modal stacking context.

**Fix:** When `injectedDocContext` is set (i.e. Aura is summoned from inside a document), use `createPortal(widget, document.body)` to break out of the stacking context and render directly on `document.body`. This is safe because we only portal when `injectedDocContext` is active, and the toggle/close still works through the existing event system.

### Issue 4: Processing dots missing after send/voice
The dots show during `pillMode === "processing"`. Looking at the send flow: `send()` correctly sets `setPillMode("processing")`. However the `motion.div` with `key="active-pill"` only mounts when `pillMode === "input" || pillMode === "processing" || pillMode === "response"`. The `AnimatePresence mode="wait"` means switching from `"input"` to `"processing"` triggers an exit-then-enter animation on the same key — so the dots should appear. 

The real issue: the streaming starts very fast and immediately sets `setPillMode("response")` via the `onDelta` callback, skipping the "processing" visual. Fix: add a minimum 400ms delay before transitioning from "processing" to "response" so the dots are visible for at least a moment, OR keep showing the dots inside the `"response"` pill as well (show dots when `isLoading && !responseText`).

## Files to Edit

### `src/components/focus/AuraWidget.tsx`
1. Replace `<input>` with auto-resizing `<textarea>` (using `onInput` to adjust height, reset on clear)
2. Fix send/X button logic: always render Send button; add a small X button alongside it (not replacing it)
3. Add portal rendering when `injectedDocContext` is active: `isActive && injectedDocContext ? createPortal(widget, document.body) : widget`
4. Show processing dots while `isLoading && !responseText` inside the response pill (so dots are visible before first chunk arrives)
