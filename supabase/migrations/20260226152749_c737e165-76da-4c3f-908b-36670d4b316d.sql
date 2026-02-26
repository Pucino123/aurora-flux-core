
-- Fix infinite recursion in team_members RLS policies

-- Drop the recursive policies
DROP POLICY IF EXISTS "Team members can view members" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can insert members" ON public.team_members;

-- Create a SECURITY DEFINER function to check team admin status (bypasses RLS, preventing recursion)
CREATE OR REPLACE FUNCTION public.is_team_admin(p_team_id uuid)
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
      AND role = 'admin'
  );
$$;

-- New SELECT policy: user sees their own rows, or all rows if they're an admin of that team
CREATE POLICY "Team members can view members"
  ON public.team_members
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_team_admin(team_id));

-- New INSERT policy: user inserts themselves, OR an admin inserts others
CREATE POLICY "Team admins can insert members"
  ON public.team_members
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_team_admin(team_id));

-- Add DELETE policy so users can leave teams
CREATE POLICY "Users can leave teams"
  ON public.team_members
  FOR DELETE
  USING (auth.uid() = user_id);
