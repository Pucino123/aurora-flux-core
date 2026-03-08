
## Security Audit — Full Picture

### What the scan found (3 issues)

**Issue 1 — CRITICAL: All 76 RLS policies are RESTRICTIVE-only (no PERMISSIVE)**
PostgreSQL's security model requires at least one PERMISSIVE policy to grant access. RESTRICTIVE policies only *further limit* rows already allowed by PERMISSIVE ones. With zero PERMISSIVE policies, the default-deny applies to all 30 tables — meaning either:
- The app uses the `service_role` key (which bypasses RLS entirely — catastrophic), or
- All users get empty data for everything

This must be fixed by converting every policy from `RESTRICTIVE` to `PERMISSIVE`. The logic of each policy (e.g., `auth.uid() = user_id`) is correct — only the TYPE is wrong.

**Issue 2 — WARNING: Leaked password protection disabled**
The auth config doesn't check new passwords against the HaveIBeenPwned database. Easy fix via auth config.

**Issue 3 — WARNING: Team invite tokens readable by any authenticated user**
The `Anyone can lookup invite by token` policy (`auth.uid() IS NOT NULL`) lets any logged-in user read ALL invite tokens for ALL teams. Once the RESTRICTIVE→PERMISSIVE fix is applied, this would allow token enumeration attacks. Fix: delete this policy and rely solely on the `is_team_member` policy for SELECT access.

**Issue 4 (discovered) — CRITICAL: flux-ai edge function has `verify_jwt = false`**
All 4 edge functions have JWT verification disabled, meaning anyone on the internet can call them without being logged in. The `flux-ai` function does NOT manually check for a valid bearer token either. This means:
- Anyone can make unlimited free AI calls (API cost abuse)
- The Aura endpoint receives user context data without authenticating who sent it

Fix: Add a manual JWT/auth check at the top of the function handler, returning 401 if no valid session token is present.

---

## Implementation Plan

### 1 migration file to fix all database RLS policies

A single SQL migration that:
- Drops all 76 RESTRICTIVE policies
- Re-creates every one as PERMISSIVE (identical logic, just `AS PERMISSIVE`)
- Deletes the `Anyone can lookup invite by token` policy entirely (not recreated)
- Enables leaked password protection via `auth.config` update

### 1 edge function update

In `supabase/functions/flux-ai/index.ts`:
- Add an auth check at the very top of the `serve` handler (before parsing body)
- Read the `Authorization: Bearer <token>` header
- Call the Supabase auth API to verify the token
- Return `401 Unauthorized` if no valid session — prevents anonymous abuse of the AI endpoint
- The `google-calendar-sync` function also needs this check since it handles OAuth tokens

### Tables covered (all 30)
`aura_memory`, `calendar_events`, `community_slots`, `council_debates`, `council_decision_scores`, `council_ideas`, `council_responses`, `council_simulations`, `council_sticky_notes`, `council_threads`, `crm_deals`, `dashboard_state`, `documents`, `focus_leaderboard`, `focus_sessions`, `folders`, `goals`, `google_calendar_events`, `google_calendar_tokens`, `idea_versions`, `message_reactions`, `message_read_receipts`, `profiles`, `schedule_blocks`, `tasks`, `team_invites`, `team_members`, `team_messages`, `teams`, `workouts`

### What stays the same
All policy CONDITIONS remain 100% identical — only the `RESTRICTIVE` type becomes `PERMISSIVE`. No data access rules change, only the broken PostgreSQL type classification.

### Files to change
1. New migration: `supabase/migrations/` — fix all 76 RLS policies to PERMISSIVE + drop the invite token leakage policy
2. `supabase/functions/flux-ai/index.ts` — add auth verification guard at top of handler
3. `supabase/functions/google-calendar-sync/index.ts` — add auth verification guard
