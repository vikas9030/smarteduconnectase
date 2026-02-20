
-- Add subject_id, description, and exam_type_label to weekly_exams
ALTER TABLE public.weekly_exams 
  ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES public.subjects(id),
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS exam_type_label text DEFAULT 'General';

-- Add index for subject lookup
CREATE INDEX IF NOT EXISTS idx_weekly_exams_subject_id ON public.weekly_exams(subject_id);
