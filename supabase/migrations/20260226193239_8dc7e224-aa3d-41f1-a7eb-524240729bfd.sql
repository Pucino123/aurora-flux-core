-- Fix teams INSERT policy: was accidentally created as RESTRICTIVE, needs to be PERMISSIVE
DROP POLICY IF EXISTS "Users can create teams" ON public.teams;

CREATE POLICY "Users can create teams"
ON public.teams
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Also ensure SELECT policy is permissive
DROP POLICY IF EXISTS "Team members can view teams" ON public.teams;

CREATE POLICY "Team members can view teams"
ON public.teams
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
  )
);
