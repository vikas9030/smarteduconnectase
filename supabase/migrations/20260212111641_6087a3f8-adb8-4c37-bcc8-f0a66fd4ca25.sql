
-- Add optional document attachment to leave_requests
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS attachment_url text;

-- Add optional attachment to messages for image/document sharing
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_type text;
