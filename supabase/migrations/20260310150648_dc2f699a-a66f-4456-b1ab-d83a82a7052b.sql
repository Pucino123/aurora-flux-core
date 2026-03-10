
-- Fjern de brede service-role policies og erstat med role-check
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.stripe_subscriptions;
DROP POLICY IF EXISTS "Service role can manage sparks purchases" ON public.sparks_purchases;

-- Brug auth.role() = 'service_role' for webhook-adgang
CREATE POLICY "Service role can manage subscriptions"
  ON public.stripe_subscriptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can manage sparks purchases"
  ON public.sparks_purchases FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Tilføj INSERT policy for service_role på stripe_customers også
CREATE POLICY "Service role can manage stripe customers"
  ON public.stripe_customers FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
