
-- Create leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Student Details
  student_name TEXT NOT NULL,
  gender TEXT,
  date_of_birth DATE,
  current_class TEXT,
  class_applying_for TEXT,
  academic_year TEXT,
  -- Parent Details
  father_name TEXT,
  mother_name TEXT,
  primary_contact_person TEXT DEFAULT 'father',
  primary_mobile TEXT NOT NULL,
  alternate_mobile TEXT,
  email TEXT,
  address TEXT,
  area_city TEXT,
  -- Parent Education & Occupation
  father_education TEXT,
  mother_education TEXT,
  father_occupation TEXT,
  mother_occupation TEXT,
  annual_income_range TEXT,
  -- Previous Academic Info
  previous_school TEXT,
  education_board TEXT,
  medium_of_instruction TEXT,
  last_class_passed TEXT,
  academic_performance TEXT,
  -- Lead Management
  status TEXT NOT NULL DEFAULT 'new_lead',
  next_followup_date DATE,
  remarks TEXT,
  assigned_teacher_id UUID REFERENCES public.teachers(id),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Lead status history
CREATE TABLE public.lead_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID NOT NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Lead call logs
CREATE TABLE public.lead_call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  called_by UUID NOT NULL,
  call_outcome TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_call_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leads
CREATE POLICY "Admins can manage all leads"
ON public.leads FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view own leads"
ON public.leads FOR SELECT
USING (
  has_role(auth.uid(), 'teacher'::app_role) 
  AND (
    created_by = auth.uid() 
    OR assigned_teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Teachers can create leads"
ON public.leads FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role) 
  AND created_by = auth.uid()
);

CREATE POLICY "Teachers can update own leads"
ON public.leads FOR UPDATE
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND (
    created_by = auth.uid()
    OR assigned_teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
  )
);

-- RLS for lead_status_history
CREATE POLICY "Admins can manage all status history"
ON public.lead_status_history FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view status history of own leads"
ON public.lead_status_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leads 
    WHERE leads.id = lead_status_history.lead_id 
    AND (
      leads.created_by = auth.uid() 
      OR leads.assigned_teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
    )
  )
);

CREATE POLICY "Teachers can insert status history"
ON public.lead_status_history FOR INSERT
WITH CHECK (changed_by = auth.uid());

-- RLS for lead_call_logs
CREATE POLICY "Admins can manage all call logs"
ON public.lead_call_logs FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view call logs of own leads"
ON public.lead_call_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leads 
    WHERE leads.id = lead_call_logs.lead_id 
    AND (
      leads.created_by = auth.uid() 
      OR leads.assigned_teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
    )
  )
);

CREATE POLICY "Teachers can insert call logs"
ON public.lead_call_logs FOR INSERT
WITH CHECK (called_by = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
