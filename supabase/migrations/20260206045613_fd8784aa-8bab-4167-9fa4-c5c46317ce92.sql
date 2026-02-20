-- Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true);

-- Policy for public read access
CREATE POLICY "Public can view photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos');

-- Policy for authenticated users to upload
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'photos' AND auth.role() = 'authenticated');

-- Policy for users to update their own photos
CREATE POLICY "Users can update their photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'photos' AND auth.role() = 'authenticated');

-- Policy for users to delete their own photos
CREATE POLICY "Users can delete their photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'photos' AND auth.role() = 'authenticated');

-- Add class_teacher_id to classes table to link class to teacher
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS class_teacher_id uuid REFERENCES public.teachers(id);
