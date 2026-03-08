
CREATE TABLE public.focus_leaderboard (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  username text NOT NULL DEFAULT 'Anonymous',
  week_start date NOT NULL DEFAULT date_trunc('week', current_date)::date,
  weekly_minutes integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

ALTER TABLE public.focus_leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view leaderboard"
  ON public.focus_leaderboard FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can upsert own leaderboard entry"
  ON public.focus_leaderboard FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leaderboard entry"
  ON public.focus_leaderboard FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own leaderboard entry"
  ON public.focus_leaderboard FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_focus_leaderboard_updated_at
  BEFORE UPDATE ON public.focus_leaderboard
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
