
## Replace bottom sections with large, deep feature showcase sections

### What's being replaced (line 276–373)
- Bento box grid ("Everything you need, unified.")
- Security banner
- Pricing teaser CTA
- Footer

Everything above line 276 (hero, video, marquee, mid-CTA) stays untouched.

### New design — alternating full-width feature sections

Each section: large heading, rich description, bullet points or sub-features, large illustrative icon/visual mock. Inspired by Notion/Linear/Arc landing pages — text-heavy, generous padding, cinematic feel.

**6 feature sections + Security + Final CTA + Footer:**

1. **The Council** — "Your personal board of advisors"
   - Left: heading + 3–4 bullet lines describing what each persona does
   - Right: mock UI card with 4 colored advisor avatars and a sample debate thread

2. **Focus Mode** — "Your space. Your rules."
   - Right: heading + description of draggable widgets, soundscapes, timer, background engine
   - Left: mock desktop with overlapping widget cards

3. **Smart Docs & Canvas** — "Write, plan, and build — in one place"
   - Left: heading + bullets (rich text, AI tools, spreadsheet mode, drawing canvas)
   - Right: document toolbar mock UI

4. **CRM & Finance** — "Run your work life from one dashboard"
   - Right: heading + bullets (contacts pipeline, invoices, budget tracker, savings goals)
   - Left: mini chart + deal pipeline visual

5. **AI Scheduler & Calendar** — "Let AI plan your day"
   - Left: heading + bullets (smart scheduling, Google Calendar sync, time blocking)
   - Right: calendar week view mock

6. **Fitness, Mood & Habits** — "Track what matters"
   - Right: heading + bullets (workout log, mood journal, streak heatmap, goals)
   - Left: progress rings + heatmap visual

7. **Security strip** (keep existing, just restyled slightly larger)

8. **Final CTA** (keep existing purple gradient CTA)

9. **Footer** (keep)

### Visual style
- Each section: `min-h-[500px] md:min-h-[600px]`, `max-w-6xl mx-auto`, `grid grid-cols-1 md:grid-cols-2 gap-12 items-center`
- Glass card for the visual/mock side
- Georgia serif headings, `text-4xl md:text-5xl`
- Alternating layout (text left / right)
- `whileInView` fade-up animation on both columns (staggered)
- Bullet points with `✓` or icon + text, `text-white/75`

### Files to change
1. `src/components/LandingPage.tsx` — replace lines 276–374 with the new sections
