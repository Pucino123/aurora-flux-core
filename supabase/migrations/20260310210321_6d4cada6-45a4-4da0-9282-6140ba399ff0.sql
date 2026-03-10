-- Create sparks_transactions table for full audit trail
CREATE TABLE IF NOT EXISTS public.sparks_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  reason text NOT NULL,
  feature text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sparks_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sparks transactions"
  ON public.sparks_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage sparks transactions"
  ON public.sparks_transactions FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');