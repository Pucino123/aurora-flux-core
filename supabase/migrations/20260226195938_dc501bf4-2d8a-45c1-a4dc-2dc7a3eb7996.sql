
-- Fix team_members INSERT policy: allow user to add themselves without admin check
-- (admin check causes recursion issue when creating a brand new team)
DROP POLICY IF EXISTS "Team members can insert" ON public.team_members;

CREATE POLICY "Team members can insert" ON public.team_members
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Fix team_members SELECT: also allow viewing all members of teams you belong to
DROP POLICY IF EXISTS "Team members can view members" ON public.team_members;

CREATE POLICY "Team members can view members" ON public.team_members
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm2
    WHERE tm2.team_id = team_members.team_id
      AND tm2.user_id = auth.uid()
  )
);
