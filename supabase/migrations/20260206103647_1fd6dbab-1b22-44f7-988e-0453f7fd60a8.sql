-- Drop existing constraint and add new one with all certificate types
ALTER TABLE certificate_requests 
DROP CONSTRAINT IF EXISTS certificate_requests_certificate_type_check;

ALTER TABLE certificate_requests 
ADD CONSTRAINT certificate_requests_certificate_type_check 
CHECK (certificate_type = ANY (ARRAY[
  'Bonafide Certificate',
  'Transfer Certificate', 
  'Character Certificate',
  'Study Certificate',
  'Migration Certificate',
  'Conduct Certificate'
]));