
## Root Cause

The `team_members` SELECT policy causes **infinite recursion** — it queries `team_members` from within a policy on `team_members`:

```sql
EXISTS (SELECT 1 FROM team_members tm2 WHERE tm2.team_id = team_members.team_id AND tm2.user_id = auth.uid())
```

This also triggers when inserting into `teams` (which has a SELECT policy referencing `team_members`), explaining why team creation fails with `42P17`.

## Fix Plan

**1. Database migration** — replace all self-referencing policies with SECURITY DEFINER functions:

- Create `public.is_team_member(p_team_id uuid)` as a `SECURITY DEFINER` function that safely checks membership without triggering RLS
- Drop and recreate `team_members` SELECT policy to use `is_team_member()` instead of the self-referencing subquery
- Drop and recreate `teams` SELECT policy to use `is_team_member()`  
- Drop and recreate `team_messages` SELECT + INSERT policies to use `is_team_member()`
- Fix `team_members` INSERT policy: allow `auth.uid() = user_id` (self-insert during team creation) OR `is_team_admin(team_id)` (admin adding others)
- All policies set as `PERMISSIVE` (not `RESTRICTIVE`) and scoped to `authenticated` role

**No code changes required** — this is a pure database fix.
