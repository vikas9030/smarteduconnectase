
-- App settings table (key-value store for global settings)
CREATE TABLE public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT 'false'::jsonb,
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Per-teacher lead permissions
CREATE TABLE public.teacher_lead_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(teacher_id)
);

-- Settings audit log
CREATE TABLE public.settings_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_lead_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS for app_settings
CREATE POLICY "Anyone can read app_settings"
ON public.app_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can manage app_settings"
ON public.app_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for teacher_lead_permissions
CREATE POLICY "Admins can manage teacher_lead_permissions"
ON public.teacher_lead_permissions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view own lead permission"
ON public.teacher_lead_permissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.teachers
    WHERE teachers.id = teacher_lead_permissions.teacher_id
    AND teachers.user_id = auth.uid()
  )
);

-- RLS for settings_audit_log
CREATE POLICY "Admins can manage audit log"
ON public.settings_audit_log FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES 
  ('leads_module_enabled', 'false'::jsonb),
  ('leads_permission_mode', '"all"'::jsonb);
