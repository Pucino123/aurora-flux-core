-- 1. Backfill missing profiles for existing users
INSERT INTO public.profiles (id, email, display_name, sparks_balance)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)),
  50
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- 2. Ensure handle_new_user trigger is properly attached
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, sparks_balance)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    50
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Unique index on stripe_subscription_id so upsert works correctly
CREATE UNIQUE INDEX IF NOT EXISTS stripe_subscriptions_sub_id_unique 
  ON public.stripe_subscriptions (stripe_subscription_id) 
  WHERE stripe_subscription_id IS NOT NULL;