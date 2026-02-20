-- Add additional student details fields
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS blood_group text,
ADD COLUMN IF NOT EXISTS emergency_contact text,
ADD COLUMN IF NOT EXISTS emergency_contact_name text,
ADD COLUMN IF NOT EXISTS parent_name text,
ADD COLUMN IF NOT EXISTS parent_phone text;