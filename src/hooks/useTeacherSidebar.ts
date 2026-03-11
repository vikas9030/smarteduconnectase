import { useLeadPermissions } from '@/hooks/useLeadPermissions';
import { useModuleVisibility } from '@/hooks/useModuleVisibility';
import { getTeacherSidebarItems } from '@/config/teacherSidebar';

export function useTeacherSidebar() {
  const { hasAccess } = useLeadPermissions();
  const { isModuleEnabled } = useModuleVisibility();
  return getTeacherSidebarItems(hasAccess, isModuleEnabled);
}
