
-- Allow team creator to see their own team (needed for the INSERT...SELECT pattern)
DROP POLICY IF EXISTS "teams_select" ON public.teams;

CREATE POLICY "teams_select" ON public.teams
  FOR SELECT TO authenticated
  USING (public.is_team_member(id) OR auth.uid() = created_by);
