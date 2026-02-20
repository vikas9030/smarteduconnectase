
-- Add optional document attachment to certificate_requests
ALTER TABLE public.certificate_requests ADD COLUMN IF NOT EXISTS attachment_url text;
