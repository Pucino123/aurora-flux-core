
-- Allow team creator/admin to delete the team and its members
CREATE POLICY "teams_delete" ON public.teams
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "team_members_admin_delete" ON public.team_members
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_team_admin(team_id));

CREATE POLICY "team_messages_delete" ON public.team_messages
  FOR DELETE TO authenticated
  USING (public.is_team_admin(team_id));
