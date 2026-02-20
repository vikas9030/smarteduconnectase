
-- Create gallery_folders table
CREATE TABLE public.gallery_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create gallery_images table
CREATE TABLE public.gallery_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id UUID NOT NULL REFERENCES public.gallery_folders(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.gallery_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view
CREATE POLICY "All authenticated can view folders" ON public.gallery_folders FOR SELECT TO authenticated USING (true);
CREATE POLICY "All authenticated can view images" ON public.gallery_images FOR SELECT TO authenticated USING (true);

-- Only admins can insert/update/delete folders
CREATE POLICY "Admins can insert folders" ON public.gallery_folders FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update folders" ON public.gallery_folders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete folders" ON public.gallery_folders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert/update/delete images
CREATE POLICY "Admins can insert images" ON public.gallery_images FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update images" ON public.gallery_images FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete images" ON public.gallery_images FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create gallery storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery', 'gallery', true);

-- Storage policies for gallery bucket
CREATE POLICY "Gallery images publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'gallery');
CREATE POLICY "Admins can upload gallery images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'gallery' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update gallery images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'gallery' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete gallery images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'gallery' AND public.has_role(auth.uid(), 'admin'));
