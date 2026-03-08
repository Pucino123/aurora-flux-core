
-- =====================================================================
-- Fix: Convert all RESTRICTIVE RLS policies to PERMISSIVE
-- Drop insecure "Anyone can lookup invite by token" policy
-- =====================================================================

-- ── aura_memory ──
DROP POLICY IF EXISTS "Users manage own memories" ON public.aura_memory;
CREATE POLICY "Users manage own memories" ON public.aura_memory
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── calendar_events ──
DROP POLICY IF EXISTS "Users manage own calendar events" ON public.calendar_events;
CREATE POLICY "Users manage own calendar events" ON public.calendar_events
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── community_slots ──
DROP POLICY IF EXISTS "Authenticated users can view slots" ON public.community_slots;
DROP POLICY IF EXISTS "Users can claim slots" ON public.community_slots;
DROP POLICY IF EXISTS "Users can delete own slots" ON public.community_slots;
DROP POLICY IF EXISTS "Users can update own slots" ON public.community_slots;

CREATE POLICY "Authenticated users can view slots" ON public.community_slots
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() IS NOT NULL) AND ((status = 'approved'::text) OR (auth.uid() = user_id)));
CREATE POLICY "Users can claim slots" ON public.community_slots
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own slots" ON public.community_slots
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can update own slots" ON public.community_slots
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- ── council_debates ──
DROP POLICY IF EXISTS "Users can manage their own council debates" ON public.council_debates;
CREATE POLICY "Users can manage their own council debates" ON public.council_debates
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- ── council_decision_scores ──
DROP POLICY IF EXISTS "Users can manage their own decision scores" ON public.council_decision_scores;
CREATE POLICY "Users can manage their own decision scores" ON public.council_decision_scores
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- ── council_ideas ──
DROP POLICY IF EXISTS "Users can manage their own council ideas" ON public.council_ideas;
CREATE POLICY "Users can manage their own council ideas" ON public.council_ideas
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- ── council_responses ──
DROP POLICY IF EXISTS "Users can manage their own council responses" ON public.council_responses;
CREATE POLICY "Users can manage their own council responses" ON public.council_responses
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- ── council_simulations ──
DROP POLICY IF EXISTS "Users can manage their own simulations" ON public.council_simulations;
CREATE POLICY "Users can manage their own simulations" ON public.council_simulations
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- ── council_sticky_notes ──
DROP POLICY IF EXISTS "Users can create their own sticky notes" ON public.council_sticky_notes;
DROP POLICY IF EXISTS "Users can delete their own sticky notes" ON public.council_sticky_notes;
DROP POLICY IF EXISTS "Users can update their own sticky notes" ON public.council_sticky_notes;
DROP POLICY IF EXISTS "Users can view their own sticky notes" ON public.council_sticky_notes;

CREATE POLICY "Users can create their own sticky notes" ON public.council_sticky_notes
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sticky notes" ON public.council_sticky_notes
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own sticky notes" ON public.council_sticky_notes
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own sticky notes" ON public.council_sticky_notes
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ── council_threads ──
DROP POLICY IF EXISTS "Users can manage their own council threads" ON public.council_threads;
CREATE POLICY "Users can manage their own council threads" ON public.council_threads
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- ── crm_deals ──
DROP POLICY IF EXISTS "Users manage own crm deals" ON public.crm_deals;
CREATE POLICY "Users manage own crm deals" ON public.crm_deals
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── dashboard_state ──
DROP POLICY IF EXISTS "Users manage own dashboard state" ON public.dashboard_state;
CREATE POLICY "Users manage own dashboard state" ON public.dashboard_state
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── documents ──
DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;

CREATE POLICY "Users can delete own documents" ON public.documents
  AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON public.documents
  AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON public.documents
  AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own documents" ON public.documents
  AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ── focus_leaderboard ──
DROP POLICY IF EXISTS "Anyone can view leaderboard" ON public.focus_leaderboard;
DROP POLICY IF EXISTS "Users can delete own leaderboard entry" ON public.focus_leaderboard;
DROP POLICY IF EXISTS "Users can update own leaderboard entry" ON public.focus_leaderboard;
DROP POLICY IF EXISTS "Users can upsert own leaderboard entry" ON public.focus_leaderboard;

CREATE POLICY "Anyone can view leaderboard" ON public.focus_leaderboard
  AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own leaderboard entry" ON public.focus_leaderboard
  AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own leaderboard entry" ON public.focus_leaderboard
  AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can upsert own leaderboard entry" ON public.focus_leaderboard
  AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ── focus_sessions ──
DROP POLICY IF EXISTS "Users can delete own focus sessions" ON public.focus_sessions;
DROP POLICY IF EXISTS "Users can insert own focus sessions" ON public.focus_sessions;
DROP POLICY IF EXISTS "Users can view own focus sessions" ON public.focus_sessions;

CREATE POLICY "Users can delete own focus sessions" ON public.focus_sessions
  AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own focus sessions" ON public.focus_sessions
  AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own focus sessions" ON public.focus_sessions
  AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ── folders ──
DROP POLICY IF EXISTS "Users can delete own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can insert own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can update own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can view own folders" ON public.folders;

CREATE POLICY "Users can delete own folders" ON public.folders
  AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own folders" ON public.folders
  AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own folders" ON public.folders
  AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own folders" ON public.folders
  AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ── goals ──
DROP POLICY IF EXISTS "Users can delete own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can insert own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can update own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can view own goals" ON public.goals;

CREATE POLICY "Users can delete own goals" ON public.goals
  AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON public.goals
  AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON public.goals
  AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own goals" ON public.goals
  AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ── google_calendar_events ──
DROP POLICY IF EXISTS "Users manage own google events" ON public.google_calendar_events;
CREATE POLICY "Users manage own google events" ON public.google_calendar_events
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── google_calendar_tokens ──
DROP POLICY IF EXISTS "Users manage own google tokens" ON public.google_calendar_tokens;
CREATE POLICY "Users manage own google tokens" ON public.google_calendar_tokens
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── idea_versions ──
DROP POLICY IF EXISTS "Users can manage their own idea versions" ON public.idea_versions;
CREATE POLICY "Users can manage their own idea versions" ON public.idea_versions
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- ── message_reactions ──
DROP POLICY IF EXISTS "Team members can add reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Team members can view reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can remove own reactions" ON public.message_reactions;

CREATE POLICY "Team members can add reactions" ON public.message_reactions
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id) AND is_team_member(team_id));
CREATE POLICY "Team members can view reactions" ON public.message_reactions
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_team_member(team_id));
CREATE POLICY "Users can remove own reactions" ON public.message_reactions
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ── message_read_receipts ──
DROP POLICY IF EXISTS "Team members can view read receipts" ON public.message_read_receipts;
DROP POLICY IF EXISTS "Users can delete own read receipts" ON public.message_read_receipts;
DROP POLICY IF EXISTS "Users can update own read receipts" ON public.message_read_receipts;
DROP POLICY IF EXISTS "Users can upsert own read receipts" ON public.message_read_receipts;

CREATE POLICY "Team members can view read receipts" ON public.message_read_receipts
  AS PERMISSIVE FOR SELECT TO authenticated USING (is_team_member(team_id));
CREATE POLICY "Users can delete own read receipts" ON public.message_read_receipts
  AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own read receipts" ON public.message_read_receipts
  AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can upsert own read receipts" ON public.message_read_receipts
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id) AND is_team_member(team_id));

-- ── profiles ──
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile" ON public.profiles
  AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can view own profile" ON public.profiles
  AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = id);

-- ── schedule_blocks ──
DROP POLICY IF EXISTS "Users can delete own schedule" ON public.schedule_blocks;
DROP POLICY IF EXISTS "Users can insert own schedule" ON public.schedule_blocks;
DROP POLICY IF EXISTS "Users can update own schedule" ON public.schedule_blocks;
DROP POLICY IF EXISTS "Users can view own schedule" ON public.schedule_blocks;

CREATE POLICY "Users can delete own schedule" ON public.schedule_blocks
  AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own schedule" ON public.schedule_blocks
  AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own schedule" ON public.schedule_blocks
  AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own schedule" ON public.schedule_blocks
  AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ── tasks ──
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;

CREATE POLICY "Users can delete own tasks" ON public.tasks
  AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.tasks
  AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.tasks
  AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own tasks" ON public.tasks
  AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ── team_invites ──
DROP POLICY IF EXISTS "Anyone can lookup invite by token" ON public.team_invites;
DROP POLICY IF EXISTS "Team admins can create invites" ON public.team_invites;
DROP POLICY IF EXISTS "Team admins can delete invites" ON public.team_invites;
DROP POLICY IF EXISTS "Team members can view invites" ON public.team_invites;

CREATE POLICY "Team admins can create invites" ON public.team_invites
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = created_by) AND is_team_member(team_id));
CREATE POLICY "Team admins can delete invites" ON public.team_invites
  AS PERMISSIVE FOR DELETE TO authenticated
  USING ((auth.uid() = created_by) OR is_team_admin(team_id));
CREATE POLICY "Team members can view invites" ON public.team_invites
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_team_member(team_id));

-- ── team_members ──
DROP POLICY IF EXISTS "team_members_admin_delete" ON public.team_members;
DROP POLICY IF EXISTS "team_members_delete" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert" ON public.team_members;
DROP POLICY IF EXISTS "team_members_select" ON public.team_members;

CREATE POLICY "team_members_admin_delete" ON public.team_members
  AS PERMISSIVE FOR DELETE TO authenticated
  USING ((auth.uid() = user_id) OR is_team_admin(team_id));
CREATE POLICY "team_members_insert" ON public.team_members
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id) OR is_team_admin(team_id));
CREATE POLICY "team_members_select" ON public.team_members
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_team_member(team_id));

-- ── team_messages ──
DROP POLICY IF EXISTS "team_messages_delete" ON public.team_messages;
DROP POLICY IF EXISTS "team_messages_insert" ON public.team_messages;
DROP POLICY IF EXISTS "team_messages_select" ON public.team_messages;

CREATE POLICY "team_messages_delete" ON public.team_messages
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (is_team_admin(team_id));
CREATE POLICY "team_messages_insert" ON public.team_messages
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id) AND is_team_member(team_id));
CREATE POLICY "team_messages_select" ON public.team_messages
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_team_member(team_id));

-- ── teams ──
DROP POLICY IF EXISTS "teams_delete" ON public.teams;
DROP POLICY IF EXISTS "teams_insert" ON public.teams;
DROP POLICY IF EXISTS "teams_select" ON public.teams;

CREATE POLICY "teams_delete" ON public.teams
  AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "teams_insert" ON public.teams
  AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "teams_select" ON public.teams
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_team_member(id)) OR (auth.uid() = created_by));

-- ── workouts ──
DROP POLICY IF EXISTS "Users can delete own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can insert own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can update own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can view own workouts" ON public.workouts;

CREATE POLICY "Users can delete own workouts" ON public.workouts
  AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workouts" ON public.workouts
  AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workouts" ON public.workouts
  AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own workouts" ON public.workouts
  AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
