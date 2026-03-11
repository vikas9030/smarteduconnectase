import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useAdminSidebar } from '@/hooks/useAdminSidebar';
import NotificationsPage from '@/components/notifications/NotificationsPage';

export default function AdminNotifications() {
  const adminSidebarItems = useAdminSidebar();
  return (
    <DashboardLayout sidebarItems={adminSidebarItems} roleColor="admin">
      <NotificationsPage />
    </DashboardLayout>
  );
}
