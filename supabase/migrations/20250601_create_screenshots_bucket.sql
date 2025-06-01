-- Create screenshots storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'screenshots',
  'screenshots',
  true,
  52428800, -- 50MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
);

-- Create policy to allow public read access to screenshots
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'screenshots');

-- Create policy to allow authenticated users to upload screenshots
CREATE POLICY "Allow authenticated uploads" ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'screenshots' AND auth.role() = 'authenticated');

-- Create policy to allow anon uploads for desktop app
CREATE POLICY "Allow anon uploads for desktop app" ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'screenshots' AND auth.role() = 'anon');

-- Create policy to allow users to update their own screenshots
CREATE POLICY "Allow users to update own screenshots" ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy to allow users to delete their own screenshots
CREATE POLICY "Allow users to delete own screenshots" ON storage.objects 
FOR DELETE 
USING (bucket_id = 'screenshots' AND auth.uid()::text = (storage.foldername(name))[1]); 