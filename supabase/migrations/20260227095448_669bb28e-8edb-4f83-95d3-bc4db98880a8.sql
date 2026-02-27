
-- Add file attachment columns to team_messages
ALTER TABLE public.team_messages 
  ADD COLUMN file_url text,
  ADD COLUMN file_type text,
  ADD COLUMN file_name text;

-- Add read_at tracking table for read receipts
CREATE TABLE public.message_read_receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  last_read_message_id uuid REFERENCES public.team_messages(id) ON DELETE CASCADE,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view read receipts"
  ON public.message_read_receipts FOR SELECT
  USING (is_team_member(team_id));

CREATE POLICY "Users can upsert own read receipts"
  ON public.message_read_receipts FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_team_member(team_id));

CREATE POLICY "Users can update own read receipts"
  ON public.message_read_receipts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own read receipts"
  ON public.message_read_receipts FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime for read receipts
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_read_receipts;

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', true);

-- Storage policies for chat attachments
CREATE POLICY "Authenticated users can upload chat attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'chat-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view chat attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-attachments');

CREATE POLICY "Users can delete own chat attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
