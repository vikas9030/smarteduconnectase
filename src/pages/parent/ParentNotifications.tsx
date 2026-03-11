import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useParentSidebar } from '@/hooks/useParentSidebar';
import NotificationsPage from '@/components/notifications/NotificationsPage';

export default function ParentNotifications() {
  const parentSidebarItems = useParentSidebar();
  return (
    <DashboardLayout sidebarItems={parentSidebarItems} roleColor="parent">
      <NotificationsPage />
    </DashboardLayout>
  );
}
