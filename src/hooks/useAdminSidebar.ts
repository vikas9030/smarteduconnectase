import { useModuleVisibility } from '@/hooks/useModuleVisibility';
import { getFilteredAdminSidebarItems } from '@/config/adminSidebar';

export function useAdminSidebar() {
  const { isModuleEnabled } = useModuleVisibility();
  return getFilteredAdminSidebarItems(isModuleEnabled);
}
