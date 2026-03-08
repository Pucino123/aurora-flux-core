
## SEO Optimization Plan for Dashiii

### Current State Analysis

**What exists:**
- `SEO.tsx` component with react-helmet-async — handles title, description, og tags, twitter cards, and JSON-LD schema
- `index.html` — has good baseline meta tags with OG image, but inconsistent branding (mixes "Dashiii" and "Flux Workspace")
- `public/robots.txt` — exists and allows all bots
- Only 4 views use `<SEO>`: InboxView, MultitaskingView, CommunityBoardView, CommunityAdminView

**Critical gaps:**
1. **Missing SEO on 10+ views** — Dashboard (canvas), Council, Calendar, Tasks, Analytics, Projects, Documents, Settings, CRM, Billing, Focus, Auth — none import or use `<SEO>`
2. **Brand inconsistency** — `SEO.tsx` says "Flux Workspace" but `index.html` says "Dashiii". The default title constant needs updating.
3. **No sitemap.xml** — search engines need this for proper indexing
4. **No canonical URL tag** — duplicate content risk
5. **`robots.txt` missing Sitemap reference** — should point to sitemap
6. **`index.html` missing `og:url`** — blank in current file
7. **Default OG image** — uses `/favicon.png` (tiny icon) — should point to the actual OG screenshot image already in the HTML
8. **No `<html lang>` attribute matters** — it's `en` which is fine

### Implementation Plan

#### 1. Fix `SEO.tsx` — unify branding + canonical + better defaults
- Change `DEFAULT_TITLE` from "Flux Workspace" → "Dashiii"
- Add canonical `<link rel="canonical">` tag
- Update `DEFAULT_IMAGE` to use the full OG image URL already in `index.html`
- Add `keywords` meta tag
- Fix JSON-LD name to "Dashiii"

#### 2. Add `<SEO>` to every view that lacks it
Wire per-view SEO tags directly into the view components (since they are the ones rendered in `Dashboard.tsx`'s switch):

| View component | Title | Description |
|---|---|---|
| `Canvas` (GridDashboard) | `Dashboard` | Your AI-powered command center |
| `TheCouncil` | `The Council` | AI advisory board for smarter decisions |
| `FullCalendarView` | `Calendar` | Smart scheduling and time management |
| `AITaskManager` | `Tasks` | AI-powered task and project management |
| `AnalyticsView` | `Analytics` | Revenue, productivity and insights dashboard |
| `ProjectsOverview` | `Projects` | Track and manage your projects |
| `DocumentsView` | `Documents` | Smart document editor with AI tools |
| `SettingsView` | `Settings` | Preferences, profile and workspace settings |
| `CRMPage` | `CRM` | Contacts, pipeline and invoice management |
| `BillingView` | `Billing` | Plans, Sparks and subscription management |
| `Auth` page | `Sign In` | Sign in to your Dashiii workspace |
| `Focus` page | `Focus Mode` | Deep work and focus session |
| `LandingPage` | root title (already in index.html) | handled by index.html |

#### 3. Create `public/sitemap.xml`
Static sitemap pointing to the canonical public routes: `/`, `/auth`, `/focus`, `/calendar` (if public).

#### 4. Update `public/robots.txt`
Add `Sitemap: https://aurora-flux-core.lovable.app/sitemap.xml` reference.

#### 5. Fix `index.html`
- Add missing `og:url` meta tag
- Fix the `og:image` to use the proper absolute URL (already has it, just ensure it's not blank)
- Keep "Dashiii | Your AI Workspace" title (already correct)

### Files to change
1. `src/components/SEO.tsx` — fix branding, add canonical, add keywords
2. `src/components/Canvas.tsx` — add `<SEO>`
3. `src/components/TheCouncil.tsx` — add `<SEO>`
4. `src/pages/FullCalendarView.tsx` — add `<SEO>`
5. `src/pages/AITaskManager.tsx` — add `<SEO>`
6. `src/components/AnalyticsView.tsx` — add `<SEO>`
7. `src/components/ProjectsOverview.tsx` — add `<SEO>`
8. `src/components/DocumentsView.tsx` — add `<SEO>`
9. `src/components/SettingsView.tsx` — add `<SEO>`
10. `src/pages/CRMPage.tsx` — add `<SEO>`
11. `src/components/billing/BillingView.tsx` — add `<SEO>`
12. `src/pages/Auth.tsx` — add `<SEO>`
13. `src/pages/Focus.tsx` — add `<SEO>`
14. `public/sitemap.xml` — create
15. `public/robots.txt` — add sitemap reference
16. `index.html` — add missing `og:url`
