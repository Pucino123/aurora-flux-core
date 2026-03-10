
-- Team Sparks Pool (400 Sparks/seat → shared pool per team)
CREATE TABLE IF NOT EXISTS public.team_sparks_pool (
  id              UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id         UUID    NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  sparks_balance  INTEGER NOT NULL DEFAULT 0,
  seats           INTEGER NOT NULL DEFAULT 1,
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (team_id)
);

ALTER TABLE public.team_sparks_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view pool"
  ON public.team_sparks_pool FOR SELECT
  USING (public.is_team_member(team_id));

CREATE POLICY "Service role manages pool"
  ON public.team_sparks_pool FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Team admins can update pool"
  ON public.team_sparks_pool FOR UPDATE
  USING (public.is_team_admin(team_id));

-- Team Sparks audit log
CREATE TABLE IF NOT EXISTS public.team_sparks_transactions (
  id            UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id       UUID    NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id       UUID    NOT NULL,
  amount        INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reason        TEXT    NOT NULL,
  feature       TEXT,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.team_sparks_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view transactions"
  ON public.team_sparks_transactions FOR SELECT
  USING (public.is_team_member(team_id));

CREATE POLICY "Service role manages team transactions"
  ON public.team_sparks_transactions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Team members can log spend"
  ON public.team_sparks_transactions FOR INSERT
  WITH CHECK (public.is_team_member(team_id) AND auth.uid() = user_id);

-- Add team_id to stripe_subscriptions for Team plan linking
ALTER TABLE public.stripe_subscriptions
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
