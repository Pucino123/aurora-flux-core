-- The team_members INSERT policy correctly allows auth.uid() = user_id,
-- but the issue is the teams INSERT might be causing cascade issues.
-- Let's also ensure team_members allows any authenticated user to add themselves.
DROP POLICY IF EXISTS "Team admins can insert members" ON public.team_members;

CREATE POLICY "Team members can insert"
ON public.team_members
FOR INSERT
WITH CHECK (
  auth.uid() = user_id  -- Users can add themselves
  OR is_team_admin(team_id)  -- Admins can add others
);
