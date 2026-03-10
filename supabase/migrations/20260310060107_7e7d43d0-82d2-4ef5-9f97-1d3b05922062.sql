
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS visible_to text[] NOT NULL DEFAULT ARRAY['admin']::text[];
