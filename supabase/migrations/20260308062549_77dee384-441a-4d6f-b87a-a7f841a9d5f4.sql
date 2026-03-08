-- Add tags column to council_ideas
ALTER TABLE public.council_ideas ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Index for faster tag filtering
CREATE INDEX IF NOT EXISTS idx_council_ideas_tags ON public.council_ideas USING GIN(tags);