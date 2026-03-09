
-- Allow all users (including anonymous) to read community slots — this is a public board
DROP POLICY IF EXISTS "Anyone can view community slots" ON public.community_slots;
CREATE POLICY "Anyone can view community slots"
  ON public.community_slots FOR SELECT
  USING (true);

-- Authenticated users can insert their own slot claims
DROP POLICY IF EXISTS "Authenticated users can claim slots" ON public.community_slots;
CREATE POLICY "Authenticated users can claim slots"
  ON public.community_slots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own slots; admin can update any
DROP POLICY IF EXISTS "Users can update their own slots" ON public.community_slots;
CREATE POLICY "Users can update their own slots"
  ON public.community_slots FOR UPDATE
  USING (auth.uid() = user_id OR auth.email() = 'kevin.therkildsen@icloud.com');
