
## What needs to be done

**Two goals:**
1. Upgrade `AuraOrb.tsx` — layer an SVG `feTurbulence + feDisplacementMap` filter on top of the existing canvas to create true organic, cloud-like gas motion.
2. Ensure Aura is fully integrated — check `gatherContext` covers all available data (flux tasks, schedule, goals, sticky notes, goal text) and the `handleToolCall` dispatches all Aura tools correctly.

---

## 1. `AuraOrb.tsx` — SVG Turbulence Layer

**Approach:** Keep the canvas (soap bubble base + iridescent ring + specular). Add an SVG element stacked on top, clipped to the same circle, with:
- An `<feTurbulence>` filter (`type="turbulence"` or `fractalNoise`, `baseFrequency ~0.008`, `numOctaves=4`) animated via `<animate>` on `seed` — this morphs the noise over time giving true organic texture.
- A `<feDisplacementMap>` that warps the aurora color blobs (rendered as SVG radial gradients) using the turbulence as a displacement source.
- The SVG layer uses `mix-blend-mode: screen` so it composites additively over the canvas, not occluding it.
- The turbulence `baseFrequency` and the displacement `scale` change per `AuraState`:
  - `idle` → low baseFreq (0.006), low scale (8)
  - `listening` → higher (0.010, scale 18)
  - `processing` → highest (0.014, scale 24)
  - `speaking` → medium (0.008, scale 12)
- The `seed` `<animate>` duration:
  - `idle` → 18s, `listening/processing` → 5s

**SVG structure inside the orb div:**
```
<svg> (absolute, same size as canvas, pointer-events:none, z:20)
  <defs>
    <filter id="aura-turbulence">
      <feTurbulence type="fractalNoise" baseFrequency="0.008 0.008" numOctaves="4" seed="0" result="noise">
        <animate attributeName="seed" values="0;20;0" dur="18s" repeatCount="indefinite" />
      </feTurbulence>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="10" xChannelSelector="R" yChannelSelector="G" />
    </filter>
    <clipPath id="aura-clip">
      <circle cx="50%" cy="50%" r="46%" />
    </clipPath>
  </defs>
  <!-- Aurora color blobs — 3 circles with radial gradient fill, displaced by turbulence -->
  <g filter="url(#aura-turbulence)" clip-path="url(#aura-clip)" style="mix-blend-mode:screen; opacity:0.55">
    <circle cx="40%" cy="35%" r="38%" fill="url(#g-cyan)" />
    <circle cx="60%" cy="65%" r="35%" fill="url(#g-purple)" />
    <circle cx="55%" cy="40%" r="32%" fill="url(#g-pink)" />
  </g>
```

The SVG blobs are kept simple; the `feTurbulence` displacement warps them into organic shapes. The canvas underneath still provides the bubble structure, ring, and specular. The SVG layer adds fluid morphing texture.

**State reactivity:** Use a `useEffect` on `state` to update the SVG filter attributes via `svgRef.current.querySelector(...)` directly (no React re-render needed for perf).

---

## 2. Aura Integration Audit

Review `gatherContext` in `AuraWidget.tsx` — it already covers:
- ✅ sticky notes, goal text, brain dump tasks
- ✅ active widgets
- ✅ today's schedule blocks
- ✅ pending tasks with IDs (15 max), completed tasks (5 max)
- ✅ goals

**Missing from context:**
- ❌ Today's date (important for scheduling context) — add `Today: ${new Date().toLocaleDateString()}`
- ❌ Flux folders list — Aura can't know what folders exist when creating tasks

**Missing tool handlers in `handleToolCall`:**
- ❌ `update_task` — partially there but need to check it handles `due_date`
- ✅ All others present

**Aura system prompt in edge function** (`flux-ai/index.ts` line 565): Already good. Needs one addition: more explicit instruction about `gatherContext` data freshness and folder awareness.

**Fix**: Enhance `gatherContext` to also include `flux.folders` list (folder IDs + names) so Aura can correctly assign tasks to folders.

---

## Files to change

1. **`src/components/focus/AuraOrb.tsx`** — Add SVG turbulence layer on top of canvas
2. **`src/components/focus/AuraWidget.tsx`** — Enhance `gatherContext` with date + folders, fix `update_task` due_date handling
3. **`supabase/functions/flux-ai/index.ts`** — Upgrade Aura system prompt: add folder awareness, add `navigate` tool for switching views, add `create_note` tool for creating notes, add today's date to context injection. Also upgrade model to `google/gemini-2.5-pro` for better tool-call accuracy.
