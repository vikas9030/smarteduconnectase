
ALTER TABLE public.syllabus
ADD COLUMN completed_at timestamp with time zone DEFAULT NULL,
ADD COLUMN completed_by uuid DEFAULT NULL;
