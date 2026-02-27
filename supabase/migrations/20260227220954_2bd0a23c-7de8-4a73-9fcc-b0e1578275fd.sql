
CREATE TABLE public.aura_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  key text NOT NULL,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, key)
);
ALTER TABLE public.aura_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own memories" ON public.aura_memory FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_aura_memory_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_aura_memory_updated_at
BEFORE UPDATE ON public.aura_memory
FOR EACH ROW EXECUTE FUNCTION public.update_aura_memory_updated_at();
