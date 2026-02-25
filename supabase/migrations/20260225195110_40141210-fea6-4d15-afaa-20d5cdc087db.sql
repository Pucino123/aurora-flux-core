-- Create storage bucket for document images
INSERT INTO storage.buckets (id, name, public) VALUES ('document-images', 'document-images', true);

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload document images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'document-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access
CREATE POLICY "Document images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'document-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own document images"
ON storage.objects FOR DELETE
USING (bucket_id = 'document-images' AND auth.uid()::text = (storage.foldername(name))[1]);