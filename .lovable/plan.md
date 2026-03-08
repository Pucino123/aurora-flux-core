
## Summary of what needs doing

**4 work streams:**

1. **TemplateChooserModal** — Full-modal theme sync + keyboard event isolation fix
2. **SettingsModal** — Profile picture upload + integrations fix + Sparks/Billing inline purchase + plan upgrade/downgrade
3. **Light mode border fix** — Remove hardcoded `border-white/10` patterns from widgets when in light mode
4. **Template document layout injection** — Already working via `content.html` / `content.rows`; the templates already inject structured content. The task asks for structural wrappers in the editors but since `templateId` is never passed to the editors, Phase 3 can be satisfied by enriching the `content.html` already injected per template.

---

## Stream 1: TemplateChooserModal upgrades

**File:** `src/components/focus/TemplateChooserModal.tsx`

### Phase 1 — Full-modal theme sync
The modal currently always renders with `background: "rgba(10,8,24,0.97)"` regardless of `previewTheme`. Change the outer modal `div` style to switch between:
- Dark: current `rgba(10,8,24,0.97)` + `rgba(255,255,255,0.07)` border
- Light: `rgba(250,250,252,0.98)` + `rgba(0,0,0,0.08)` border

Apply `isDark`-aware colors throughout the modal wrapper, title bar, sidebar, action bar, category buttons, template labels. Use the same `isDark` boolean already derived from `previewTheme`.

### Phase 2 — Keyboard event isolation
Currently the `useEffect` listens on `window`. Replace with an `onKeyDown` handler directly on the modal's focusable `<div ref={modalRef}>`. This naturally prevents propagation to the desktop. The handler also needs `e.stopPropagation()` added to prevent arrow key bleed.

The `useEffect` `window.addEventListener` approach is removed; instead the `<div>` gets `onKeyDown={handleKeyDown}` and the handler calls `e.stopPropagation()` at the top.

### Phase 3 — Document layout injection for templates
The templates already pass `content.html` for word docs and `content.rows` for spreadsheets. The editors already consume these and render them inside the editable canvas. No editor code needs touching.

For the specific layouts mentioned:
- **Modern Newsletter**: update its `content.html` to include inline styles for a full-width colored hero div + two-column CSS layout (using `column-count: 2` in a wrapping div)
- **Formal Letter**: content already has right-aligned sender block + left recipient + body
- **SaaS Churn Dashboard**: rows already defined; add a `kpi` block note in the first rows
- **Modern Invoice**: rows already have proper invoice structure

These are already substantially implemented. I'll enrich the Newsletter and Letter HTML structures to more closely match the thumbnail art.

---

## Stream 2: SettingsModal

**File:** `src/components/settings/SettingsModal.tsx`

### Profile picture upload in Settings
Currently the Account tab shows an Avatar but there's no upload button. The sidebar `UserSection` already has the upload logic using `supabase.storage.from("document-images")`. Copy that exact pattern into SettingsModal:
- Add `fileRef = useRef<HTMLInputElement>(null)` + `uploading` state
- Wrap the `<Avatar>` in a clickable div with camera-icon overlay on hover
- Add hidden `<input type="file">` and `handleAvatarUpload` function (same logic as `FluxSidebar`)

### Integrations tab fix
The current integrations connect but only store in local `connectedProviders` state — it's reset on close. Persist to `localStorage` so connections survive modal close. Also load the saved state on mount.

### Sparks & Billing tab — inline purchase + plan upgrade/downgrade
Currently the Sparks tab just shows balance + a single "Upgrade Plan" button that closes the modal and opens `BillingModal`. Instead, make the Sparks tab fully functional inline:
- **Spark packs**: show the 3 packages from `SparksCheckoutModal` (50/$5, 120/$10, 300/$20) as selectable cards. A "Buy Sparks" button triggers `SparksCheckoutModal` with the selected pack
- **Plan section**: show 3 plan cards (Starter/Pro/Team) with upgrade/downgrade buttons that call `setUserPlan(plan)` from `useMonetization` directly — no checkout required (same as `BillingModal`)

The `sparks` tab gets split into two sub-sections: "Your Balance" + Spark packs at the top, then a "Workspace Plan" section with the 3 plan cards below.

Import `SparksCheckoutModal` into SettingsModal and mount it when a spark pack is selected.

---

## Light mode border fix

The user said "i light mode, don't add white borders on widgets". The source is `@apply border-border;` in index.css applied globally, but many components use hardcoded `border-white/10` which stays white-ish in light mode because `white/10` = rgba(255,255,255,0.1) which is nearly invisible on a dark background but shows as a faint shimmer on light backgrounds.

The SettingsModal itself uses `border-white/10` throughout. Change all hardcoded `border-white/10` and `border-white/8` inside SettingsModal to `border-border/30` so they respect the CSS variable. This also applies to the input fields using `bg-black/20` — change to `bg-secondary/50` for light mode compatibility.

---

## Files to modify

```
MODIFY  src/components/focus/TemplateChooserModal.tsx
  - Full-modal theme sync (isDark affects entire modal styling)
  - Replace window keydown listener with onKeyDown on focusable div
  - e.stopPropagation() on all key handlers
  - Enrich Modern Newsletter HTML with 2-column layout

MODIFY  src/components/settings/SettingsModal.tsx
  - Add profile picture upload (camera overlay on avatar, file input, upload handler)
  - Persist integrations to localStorage
  - Expand Sparks tab: inline Spark pack cards + plan upgrade/downgrade cards
  - Fix light mode: replace border-white/10 → border-border/30, bg-black/20 → bg-secondary/50
```

## Execution order

1. `TemplateChooserModal.tsx` — keyboard isolation + theme sync
2. `SettingsModal.tsx` — avatar upload + integrations persistence + sparks/billing inline + light mode fix
