
-- Add bias_radar column to council_ideas
ALTER TABLE public.council_ideas ADD COLUMN IF NOT EXISTS bias_radar jsonb DEFAULT '[]'::jsonb;

-- Create council_sticky_notes table
CREATE TABLE IF NOT EXISTS public.council_sticky_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  parent_id UUID NOT NULL,
  parent_type TEXT NOT NULL DEFAULT 'idea',
  content TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'yellow',
  collapsed BOOLEAN NOT NULL DEFAULT false,
  emoji_reaction TEXT,
  priority_flag TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.council_sticky_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sticky notes" ON public.council_sticky_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own sticky notes" ON public.council_sticky_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sticky notes" ON public.council_sticky_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sticky notes" ON public.council_sticky_notes FOR DELETE USING (auth.uid() = user_id);
