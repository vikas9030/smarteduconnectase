import { useModuleVisibility } from '@/hooks/useModuleVisibility';
import { getFilteredParentSidebarItems } from '@/config/parentSidebar';

export function useParentSidebar() {
  const { isModuleEnabled } = useModuleVisibility();
  return getFilteredParentSidebarItems(isModuleEnabled);
}
