
## Plan

The user wants 3 things:

1. **"Soap Bubble" visual redesign** — completely transparent/clear glass sphere aesthetic (NOT a solid glowing mass). The interior should have semi-transparent, iridescent aurora swirls on a mostly transparent/clear background. Thin iridescent edge ring like a soap bubble.

2. **Cmd/Ctrl voice shortcut** — replace Alt key with `metaKey` (Mac) or `ctrlKey` (Win). Use `e.metaKey || e.ctrlKey`.

3. **Morphing pill UX refinements** — no changes needed (already exists), just cleanup + settings icon on widget + updated TIPS text to mention Cmd.

### Changes to `AuraOrb.tsx`

Completely rewrite the canvas rendering to achieve a soap bubble look:

- **Background**: Near-transparent (rgba 0,0,0,0 or very faint) instead of solid dark navy
- **Blobs**: Reduce opacity significantly (0.3–0.5 max), use `source-over` instead of `lighter` to prevent solid mass buildup
- **Blur**: Keep moderate blur but reduce so colors don't merge into a dark mass
- **Edge ring**: Add a thin iridescent stroke around the circumference (thin rainbow gradient stroke — this is the "soap bubble" effect)
- **Inner aurora**: Use translucent gradient meshes that you can see through — the whole bubble should feel hollow/glassy
- **Specular**: More pronounced white highlight top-left for glass sphere look
- **Outer glow wrapper**: Keep the framer-motion ambient glow but make it very subtle

### Changes to `AuraWidget.tsx`

- **Keyboard shortcut**: Change `e.key !== "Alt"` to use `(e.metaKey || e.ctrlKey)` with a specific key (e.g., press Space while holding Cmd/Ctrl — but spec says "press Cmd once, press again to stop"). Since Cmd alone is a modifier key without a specific keyCode event firing on keydown cleanly, the best approach is to listen for `keydown` where `e.key === "Meta"` on Mac or `e.key === "Control"` on Win. Use `e.key === "Meta" || e.key === "Control"` — press once to start, press again to stop.
- **Settings icon**: Add a small `Settings` lucide icon button in the widget, positioned absolutely near the orb (bottom-right), glassmorphic style, that could open a small settings popover (for now, just the icon as a placeholder or showing a toast).
- **Update TIPS**: Change "Hold Alt" to "Press ⌘/Ctrl to talk to me"
- **Remove the duplicate X in history box** (from previous iteration — only keep X in the pill input area)

### Files to edit
1. `src/components/focus/AuraOrb.tsx` — full rewrite of canvas drawing for soap bubble aesthetic
2. `src/components/focus/AuraWidget.tsx` — shortcut, settings icon, tip text update
