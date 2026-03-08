
-- Drop the old restrictive "Public can view approved slots" policy
DROP POLICY IF EXISTS "Public can view approved slots" ON public.community_slots;

-- Allow all authenticated users to see approved slots, plus owners see their own
CREATE POLICY "Authenticated users can view slots"
  ON public.community_slots
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (status = 'approved' OR auth.uid() = user_id)
  );

-- Enable realtime for community_slots
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_slots;
