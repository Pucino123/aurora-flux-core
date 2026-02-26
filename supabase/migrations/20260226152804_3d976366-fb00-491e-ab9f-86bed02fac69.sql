
-- Google Calendar integration tables

-- Store OAuth tokens per user
CREATE TABLE IF NOT EXISTS public.google_calendar_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamp with time zone,
  scope text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own google tokens"
  ON public.google_calendar_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Store synced Google Calendar events (source='google', safe to purge on disconnect)
CREATE TABLE IF NOT EXISTS public.google_calendar_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  google_event_id text NOT NULL,
  title text NOT NULL DEFAULT '',
  description text,
  start_time text NOT NULL,
  end_time text,
  scheduled_date date NOT NULL,
  all_day boolean NOT NULL DEFAULT false,
  calendar_id text,
  source text NOT NULL DEFAULT 'google',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, google_event_id)
);

ALTER TABLE public.google_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own google events"
  ON public.google_calendar_events
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Realtime for google_calendar_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.google_calendar_events;
