ALTER TABLE public.fees ADD COLUMN IF NOT EXISTS reminder_sent boolean DEFAULT false;
ALTER TABLE public.fees ADD COLUMN IF NOT EXISTS reminder_days_before integer DEFAULT 3;