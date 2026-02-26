
## Root cause analysis

**1. Create Team fails (Critical)**
The network request shows: `"infinite recursion detected in policy for relation team_members"` (HTTP 500). Both RLS policies on `team_members` reference the `team_members` table itself:
- SELECT policy: `EXISTS (SELECT 1 FROM team_members tm WHERE ...)` — recursive
- INSERT policy: also queries `team_members` to check if caller is admin — recursive

This is why creating a team does nothing — the insert of the creator as admin member fails with 500. The team itself is created (in `teams`), but the `team_members` insert fails silently because `createTeam` doesn't show the error.

**Fix**: Replace both policies with non-recursive equivalents:
- SELECT: `auth.uid() = user_id` (a user can always see their own membership rows — simple, no recursion)
- INSERT: `auth.uid() = user_id` (a user inserts themselves; admin-adding others needs a separate approach or a security definer function)

**2. Unread message badge** — Already partially implemented in `ToolDrawer.tsx` (lines 66–104), but the "unread" logic is wrong — it counts all messages from last 24h regardless of whether they're from the current user or already-seen. Need to:
- Track `lastReadAt` in localStorage per team
- Count messages newer than `lastReadAt` that are NOT from the current user
- Reset `lastReadAt` when the modal opens

**3. Google Calendar sync** — No Google Calendar connector exists in the available connectors. This requires OAuth with Google Calendar API. The approach:
- Use Supabase OAuth to get a Google Calendar token (requires adding a `google_calendar_tokens` table)
- Create an edge function to fetch Google Calendar events using the stored token
- Store imported events with a `source: 'google'` flag so they can be purged without touching local events
- Add a `google_calendar_events` table (or add `source` column to `schedule_blocks`)

**However**, this is a complex OAuth integration. Looking at the available connectors, there is no Google Calendar connector. I need to implement this using a manual OAuth flow with Google. Let me plan what's needed:

### Database changes needed

**Migration 1**: Fix `team_members` RLS (non-recursive)
```sql
-- Drop recursive policies
DROP POLICY "Team members can view members" ON team_members;
DROP POLICY "Team admins can insert members" ON team_members;

-- Simple non-recursive: users see their own rows only
CREATE POLICY "Users see own membership" ON team_members
  FOR SELECT USING (auth.uid() = user_id);

-- Admins see all members of teams they admin via a security definer function
CREATE OR REPLACE FUNCTION public.is_team_admin(p_team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members WHERE team_id = p_team_id AND user_id = auth.uid() AND role = 'admin'
  );
$$;

-- Allow seeing all members if you're an admin or a member (via function to avoid recursion)
CREATE POLICY "Team members can view all members of their team" ON team_members
  FOR SELECT USING (auth.uid() = user_id OR is_team_admin(team_id));

-- Insert: user inserts themselves OR an admin inserts others
CREATE POLICY "Insert team members" ON team_members
  FOR INSERT WITH CHECK (auth.uid() = user_id OR is_team_admin(team_id));
```

Wait — this still has recursion if `is_team_admin` reads `team_members` and SELECT policy also triggers. SECURITY DEFINER functions bypass RLS, so this approach works.

**Migration 2**: Add `google_calendar_events` table with `user_id`, `google_event_id`, `title`, `start_time`, `end_time`, `scheduled_date`, `calendar_id`, `source = 'google'`

### Files to change

1. **Database migration** — Fix team_members RLS with security definer function (critical for create team to work)
2. **Database migration** — Add `google_calendar_tokens` table + `google_calendar_events` table
3. **`src/hooks/useTeamChat.ts`** — Add error logging to `createTeam`; also expose `lastReadAt` / mark-as-read logic; return `unreadCount` properly
4. **`src/components/focus/ToolDrawer.tsx`** — Fix unread badge to use proper last-read tracking, mark as read when modal opens
5. **`src/components/focus/CollabMessagesModal.tsx`** — Call markAsRead when modal opens/messages viewed
6. **`supabase/functions/google-calendar-sync/index.ts`** — New edge function to handle Google OAuth callback + fetch events
7. **`src/pages/FullCalendarView.tsx`** — Add Google Calendar sync button + display google events alongside local blocks
8. **`src/components/focus/GoogleCalendarSync.tsx`** — New component for connect/disconnect UI

### Plan summary

**Step 1 (DB)**: Create migration to fix recursive RLS on `team_members` using a SECURITY DEFINER helper function.

**Step 2 (DB)**: Create migration for Google Calendar tokens and events tables.

**Step 3 (Hook)**: Improve `useTeamChat` — proper unread tracking with localStorage `lastReadAt[teamId]`, expose `unreadCount` and `markAsRead`.

**Step 4 (UI)**: Update `ToolDrawer` badge + `CollabMessagesModal` to call `markAsRead` on open.

**Step 5 (Google Calendar)**: Edge function for OAuth + sync; UI in FullCalendarView for connect/disconnect + merged display.

## Implementation Plan

### 1. Fix team_members RLS (migration)
- Drop both existing policies
- Create `is_team_admin(uuid)` SECURITY DEFINER function that bypasses RLS
- New SELECT policy: `auth.uid() = user_id OR is_team_admin(team_id)`
- New INSERT policy: `auth.uid() = user_id OR is_team_admin(team_id)`

### 2. Google Calendar tables (migration)
- `google_calendar_tokens`: `user_id, access_token, refresh_token, expires_at, scope`
- `google_calendar_events`: `id, user_id, google_event_id, title, description, start_time, end_time, scheduled_date, all_day, calendar_id` — with RLS user-scoped

### 3. `useTeamChat.ts` — unread tracking
- Add `unreadCount: number` to return value
- Track `lastReadAt` per team in localStorage
- `markAsRead()` function that updates localStorage timestamp
- unreadCount = messages newer than lastReadAt[teamId] not from current user

### 4. `ToolDrawer.tsx` + `CollabMessagesModal.tsx`
- Pass `markAsRead` from hook
- Call `markAsRead()` when modal opens
- Badge shows `unreadCount` from hook (not the broken 24h heuristic)

### 5. Google Calendar edge function (`supabase/functions/google-calendar-sync/index.ts`)
- Handles POST to initiate OAuth (returns auth URL)
- Handles GET callback to exchange code for tokens, store in DB
- Handles POST `/sync` to fetch events from Google and upsert into `google_calendar_events`
- Handles DELETE `/disconnect` to remove token + all google events for user

### 6. `FullCalendarView.tsx`
- Add Google Calendar connect/disconnect button
- Fetch `google_calendar_events` and merge with `scheduleBlocks` in `dayEvents`
- Google events shown with a distinct Google-blue color
- Disconnect removes only google events (DELETE from `google_calendar_events` where user_id = current user)

### 7. New `src/components/focus/GoogleCalendarSync.tsx`
- Small button/badge component for the calendar header
- Shows "Connect Google Calendar" or "Synced · Disconnect" state
- Triggers OAuth flow or disconnect
