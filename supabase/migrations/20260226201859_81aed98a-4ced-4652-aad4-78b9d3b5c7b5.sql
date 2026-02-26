
-- Enable realtime for team_messages (already may exist, safe to re-add)
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;
