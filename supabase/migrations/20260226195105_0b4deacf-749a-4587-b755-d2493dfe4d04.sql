
-- Fix ALL team-related RLS policies to be PERMISSIVE (not RESTRICTIVE)

-- TEAMS table
DROP POLICY IF EXISTS "Users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Team members can view teams" ON public.teams;

CREATE POLICY "Users can create teams" ON public.teams
FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Team members can view teams" ON public.teams
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.team_members WHERE team_members.team_id = teams.id AND team_members.user_id = auth.uid())
);

-- TEAM_MEMBERS table
DROP POLICY IF EXISTS "Team members can insert" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view members" ON public.team_members;
DROP POLICY IF EXISTS "Users can leave teams" ON public.team_members;

CREATE POLICY "Team members can insert" ON public.team_members
FOR INSERT WITH CHECK (auth.uid() = user_id OR is_team_admin(team_id));

CREATE POLICY "Team members can view members" ON public.team_members
FOR SELECT USING (auth.uid() = user_id OR is_team_admin(team_id));

CREATE POLICY "Users can leave teams" ON public.team_members
FOR DELETE USING (auth.uid() = user_id);

-- TEAM_MESSAGES table
DROP POLICY IF EXISTS "Team members can send messages" ON public.team_messages;
DROP POLICY IF EXISTS "Team members can view messages" ON public.team_messages;

CREATE POLICY "Team members can send messages" ON public.team_messages
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM public.team_members WHERE team_members.team_id = team_messages.team_id AND team_members.user_id = auth.uid())
);

CREATE POLICY "Team members can view messages" ON public.team_messages
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.team_members WHERE team_members.team_id = team_messages.team_id AND team_members.user_id = auth.uid())
);
