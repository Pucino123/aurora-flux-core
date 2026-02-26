
-- Team invite links
CREATE TABLE IF NOT EXISTS public.team_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'base64url'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '7 days')
);

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view invites" ON public.team_invites
  FOR SELECT USING (is_team_member(team_id));

CREATE POLICY "Team admins can create invites" ON public.team_invites
  FOR INSERT WITH CHECK (auth.uid() = created_by AND is_team_member(team_id));

CREATE POLICY "Team admins can delete invites" ON public.team_invites
  FOR DELETE USING (auth.uid() = created_by OR is_team_admin(team_id));

-- Anyone authenticated can read an invite by token to join (select without team membership check)
CREATE POLICY "Anyone can lookup invite by token" ON public.team_invites
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Message reactions
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.team_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  team_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view reactions" ON public.message_reactions
  FOR SELECT USING (is_team_member(team_id));

CREATE POLICY "Team members can add reactions" ON public.message_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_team_member(team_id));

CREATE POLICY "Users can remove own reactions" ON public.message_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
