
## Plan: Landing Page Overhaul

### Changes to `src/components/LandingPage.tsx`

**1. Remove `DashboardPreview` section** (lines 226–236) — delete the entire "flux.app · Dashboard" preview section and the `DashboardPreview` component (lines 26–88).

**2. Replace "More than just tasks" grid with auto-scrolling marquee banner**
- Create a `FeatureMarquee` component using CSS `@keyframes marquee` (infinite linear scroll left)
- Two rows: one scrolling left, one scrolling right — exactly like Joobie's "More than a match score" section
- Each card: glassmorphic `bg-white/12 backdrop-blur-xl`, icon + title + short desc
- Cards duplicated so the loop is seamless
- Use `animation: marquee 28s linear infinite` (CSS-in-JSX via Tailwind `animate-none` + inline style)
- Wrap each row in `overflow-hidden`, cards in a flex row with `gap-4`

**3. "See it in action" video section stays** — keep `VideoSection` component as-is (lines 91–163)

### Implementation approach for marquee:
```tsx
// Two rows, opposite directions
<div className="overflow-hidden">
  <div className="flex gap-4 animate-[marquee_30s_linear_infinite]">
    {[...FEATURES, ...FEATURES].map(card => <Card />)}
  </div>
</div>
<div className="overflow-hidden mt-4">
  <div className="flex gap-4 animate-[marquee-reverse_30s_linear_infinite]">
    {[...FEATURES2, ...FEATURES2].map(card => <Card />)}
  </div>
</div>
```

Add to `tailwind.config.ts`:
```ts
keyframes: {
  marquee: { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } },
  "marquee-reverse": { "0%": { transform: "translateX(-50%)" }, "100%": { transform: "translateX(0)" } },
}
animation: {
  marquee: "marquee 30s linear infinite",
  "marquee-reverse": "marquee-reverse 30s linear infinite",
}
```

### Section order after changes:
1. Navbar
2. Hero
3. ~~DashboardPreview~~ ← DELETED
4. Feature Marquee banner (auto-scrolling, 2 rows)
5. "See it in action" video section
6. How it works
7. CTA + Footer
