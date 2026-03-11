import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { superAdminSidebarItems } from '@/config/superAdminSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users, GraduationCap, Shield, ToggleLeft } from 'lucide-react';
import { useModuleVisibility } from '@/hooks/useModuleVisibility';

export default function SuperAdminDashboard() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const { modules } = useModuleVisibility();
  const [stats, setStats] = useState({ admins: 0, teachers: 0, students: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!loading && (!user || userRole !== 'super_admin')) {
      navigate('/auth');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    async function fetchStats() {
      const [admins, teachers, students] = await Promise.all([
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).in('role', ['admin', 'super_admin']),
        supabase.from('teachers').select('id', { count: 'exact', head: true }),
        supabase.from('students').select('id', { count: 'exact', head: true }),
      ]);
      setStats({
        admins: admins.count || 0,
        teachers: teachers.count || 0,
        students: students.count || 0,
      });
      setLoadingStats(false);
    }
    if (user) fetchStats();
  }, [user]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const enabledCount = modules.filter(m => m.is_enabled).length;

  return (
    <DashboardLayout sidebarItems={superAdminSidebarItems} roleColor="super_admin">
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-display text-2xl font-bold">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">System overview and control center</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Admins', value: stats.admins, icon: Shield, color: 'text-primary' },
            { label: 'Teachers', value: stats.teachers, icon: Users, color: 'text-emerald-600' },
            { label: 'Students', value: stats.students, icon: GraduationCap, color: 'text-blue-600' },
            { label: 'Active Modules', value: `${enabledCount}/${modules.length}`, icon: ToggleLeft, color: 'text-amber-600' },
          ].map((stat) => (
            <Card key={stat.label} className="card-elevated">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{loadingStats ? '...' : stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
