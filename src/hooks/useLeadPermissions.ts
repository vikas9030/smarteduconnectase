import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface LeadPermissions {
  isAdmin: boolean;
  moduleEnabled: boolean;
  permissionMode: 'all' | 'selected';
  teacherEnabled: boolean;
  loading: boolean;
  hasAccess: boolean;
}

export function useLeadPermissions(): LeadPermissions {
  const { user, userRole } = useAuth();
  const [moduleEnabled, setModuleEnabled] = useState(false);
  const [permissionMode, setPermissionMode] = useState<'all' | 'selected'>('all');
  const [teacherEnabled, setTeacherEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const isAdmin = userRole === 'admin';

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        // Fetch global settings
        const { data: settings } = await supabase
          .from('app_settings')
          .select('setting_key, setting_value')
          .in('setting_key', ['leads_module_enabled', 'leads_permission_mode']);

        const enabledSetting = settings?.find(s => s.setting_key === 'leads_module_enabled');
        const modeSetting = settings?.find(s => s.setting_key === 'leads_permission_mode');

        const enabled = enabledSetting?.setting_value === true;
        const mode = (modeSetting?.setting_value as string) || 'all';

        setModuleEnabled(enabled);
        setPermissionMode(mode as 'all' | 'selected');

        // If teacher and mode is 'selected', check individual permission
        if (userRole === 'teacher' && enabled && mode === 'selected') {
          // Get teacher record
          const { data: teacher } = await supabase
            .from('teachers')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (teacher) {
            const { data: perm } = await supabase
              .from('teacher_lead_permissions')
              .select('enabled')
              .eq('teacher_id', teacher.id)
              .maybeSingle();

            setTeacherEnabled(perm?.enabled ?? false);
          } else {
            setTeacherEnabled(false);
          }
        } else if (userRole === 'teacher' && enabled && mode === 'all') {
          setTeacherEnabled(true);
        } else {
          setTeacherEnabled(false);
        }
      } catch (error) {
        console.error('Error fetching lead permissions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user, userRole]);

  // Admin always has access
  const hasAccess = isAdmin || (moduleEnabled && teacherEnabled);

  return {
    isAdmin,
    moduleEnabled,
    permissionMode,
    teacherEnabled,
    loading,
    hasAccess,
  };
}
