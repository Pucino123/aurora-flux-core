
-- Create is_team_member SECURITY DEFINER function to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.is_team_member(p_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id
      AND user_id = auth.uid()
  );
$$;

-- Fix team_members policies: drop all existing ones
DROP POLICY IF EXISTS "Team members can view members" ON public.team_members;
DROP POLICY IF EXISTS "Team members can insert" ON public.team_members;
DROP POLICY IF EXISTS "Users can leave teams" ON public.team_members;

-- Recreate as PERMISSIVE
CREATE POLICY "team_members_select" ON public.team_members
  FOR SELECT TO authenticated
  USING (public.is_team_member(team_id));

CREATE POLICY "team_members_insert" ON public.team_members
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_team_admin(team_id));

CREATE POLICY "team_members_delete" ON public.team_members
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Fix teams policies
DROP POLICY IF EXISTS "Team members can view teams" ON public.teams;
DROP POLICY IF EXISTS "Users can create teams" ON public.teams;

CREATE POLICY "teams_select" ON public.teams
  FOR SELECT TO authenticated
  USING (public.is_team_member(id));

CREATE POLICY "teams_insert" ON public.teams
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Fix team_messages policies
DROP POLICY IF EXISTS "Team members can view messages" ON public.team_messages;
DROP POLICY IF EXISTS "Team members can send messages" ON public.team_messages;

CREATE POLICY "team_messages_select" ON public.team_messages
  FOR SELECT TO authenticated
  USING (public.is_team_member(team_id));

CREATE POLICY "team_messages_insert" ON public.team_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_team_member(team_id));
