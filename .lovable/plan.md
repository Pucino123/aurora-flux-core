
## Problem Analysis

The user wants:
- ✅ The background behind the document **remains blurred** (restore `backdrop-blur-md` on the backdrop)
- ✅ When clicking Aura inside a document, **Aura appears sharp** (not blurred by the backdrop)
- ✅ Clicking the Aura button again closes/blurs Aura back out

### Root Cause

The document backdrop div (`z-[100]`) had `backdrop-blur-md` removed in the last fix. The user wants it back.

The reason Aura appeared blurred: CSS `backdrop-filter` on the backdrop element creates a compositing layer. Elements with higher z-index that sit above the backdrop can appear to have blur applied to them because they're being composited on top of the blurred layer — but only if the Aura portal element itself has `backdrop-filter` or `filter` styles inherited.

Looking at the portal div in `AuraWidget.tsx` (line 1045): the processing pill has `backdropFilter: "none"` already. The input/response pill at line 1052 does NOT — it just uses `background: rgba(20,20,30,0.85)`.

The actual Aura widget when portalled renders inside a `DraggableWidget` which may apply styles, OR the issue is the main `widget` variable (the DraggableWidget) is being rendered at both `{widget}` AND in the portal — causing duplication.

### Fix Plan

**File: `src/components/focus/DesktopDocumentViewer.tsx`**
- Restore `backdrop-blur-md` on the backdrop div (line 85): change back to `className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md"`

**File: `src/components/focus/AuraWidget.tsx`**
- The portal wrapper div (line 1011) needs `filter: "none"` added to its style to break out of any compositing chain
- Remove the duplicate `{widget}` render at line 1009 — currently when `injectedDocContext && isActive`, it renders BOTH the normal widget position AND the portal. Remove `{widget}` so only the portal version shows.
- Add `filter: "none"` and `WebkitFilter: "none"` to the portal wrapper to ensure no blur bleeds through
