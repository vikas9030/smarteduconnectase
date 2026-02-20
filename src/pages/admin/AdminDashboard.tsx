import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { adminSidebarItems } from '@/config/adminSidebar';
import StatCard from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  GraduationCap,
  BookOpen,
  Bell,
  Shield,
  Clock,
  Loader2,
  TrendingUp,
  FileText,
} from 'lucide-react';

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  todayAttendanceRate: number;
  pendingLeaves: number;
  pendingCertificates: number;
  openComplaints: number;
}

export default function AdminDashboard() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    todayAttendanceRate: 0,
    pendingLeaves: 0,
    pendingCertificates: 0,
    openComplaints: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [profileName, setProfileName] = useState('Principal');

  useEffect(() => {
    if (!loading && (!user || userRole !== 'admin')) {
      navigate('/auth');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) return;
      setLoadingStats(true);

      try {
        // Fetch profile name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profile?.full_name) {
          setProfileName(profile.full_name.split(' ')[0]);
        }

        // Fetch all counts in parallel
        const [
          studentsRes,
          teachersRes,
          classesRes,
          pendingLeavesRes,
          pendingCertsRes,
          openComplaintsRes,
          todayAttendanceRes,
          announcementsRes
        ] = await Promise.all([
          supabase.from('students').select('*', { count: 'exact', head: true }),
          supabase.from('teachers').select('*', { count: 'exact', head: true }),
          supabase.from('classes').select('*', { count: 'exact', head: true }),
          supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('certificate_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('status', 'open'),
          supabase.from('attendance').select('status').eq('date', new Date().toISOString().split('T')[0]),
          supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(4),
        ]);

        // Calculate today's attendance rate
        let attendanceRate = 0;
        if (todayAttendanceRes.data && todayAttendanceRes.data.length > 0) {
          const present = todayAttendanceRes.data.filter(a => a.status === 'present').length;
          attendanceRate = Math.round((present / todayAttendanceRes.data.length) * 100);
        }

        setStats({
          totalStudents: studentsRes.count || 0,
          totalTeachers: teachersRes.count || 0,
          totalClasses: classesRes.count || 0,
          todayAttendanceRate: attendanceRate,
          pendingLeaves: pendingLeavesRes.count || 0,
          pendingCertificates: pendingCertsRes.count || 0,
          openComplaints: openComplaintsRes.count || 0,
        });

        // Build recent activity from announcements
        const activities = (announcementsRes.data || []).map(a => ({
          title: a.title,
          time: getTimeAgo(new Date(a.created_at)),
          type: 'info',
        }));
        setRecentActivity(activities);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoadingStats(false);
      }
    }

    fetchDashboardData();
  }, [user]);

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} roleColor="admin">
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Section */}
        <div className="gradient-admin rounded-2xl p-6 text-white">
          <h1 className="font-display text-2xl font-bold">Welcome back, {profileName}!</h1>
          <p className="text-white/80 mt-1">Here's what's happening at your school today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Students"
            value={loadingStats ? '...' : stats.totalStudents.toString()}
            icon={<GraduationCap className="h-6 w-6" />}
          />
          <StatCard
            title="Total Teachers"
            value={loadingStats ? '...' : stats.totalTeachers.toString()}
            icon={<Users className="h-6 w-6" />}
          />
          <StatCard
            title="Classes"
            value={loadingStats ? '...' : stats.totalClasses.toString()}
            icon={<BookOpen className="h-6 w-6" />}
          />
          <StatCard
            title="Today's Attendance"
            value={loadingStats ? '...' : `${stats.todayAttendanceRate}%`}
            icon={<Clock className="h-6 w-6" />}
            variant="primary"
          />
        </div>

        {/* Quick Actions & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: <Users />, label: 'Add Teacher', path: '/admin/teachers' },
                  { icon: <GraduationCap />, label: 'View Students', path: '/admin/students' },
                  { icon: <Bell />, label: 'Announcement', path: '/admin/announcements' },
                  { icon: <FileText />, label: 'View Reports', path: '/admin/attendance' },
                ].map((action, index) => (
                  <button
                    key={index}
                    onClick={() => navigate(action.path)}
                    className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      {action.icon}
                    </div>
                    <span className="font-medium text-sm">{action.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No recent activity</p>
                  <p className="text-sm">Start by adding teachers and creating classes</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pending Approvals */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border bg-warning/5 border-warning/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-warning">Leave Requests</span>
                  <span className="text-2xl font-bold text-warning">{stats.pendingLeaves}</span>
                </div>
                <p className="text-xs text-muted-foreground">Pending approval</p>
              </div>
              <div className="p-4 rounded-xl border bg-primary/5 border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-primary">Certificates</span>
                  <span className="text-2xl font-bold text-primary">{stats.pendingCertificates}</span>
                </div>
                <p className="text-xs text-muted-foreground">Pending approval</p>
              </div>
              <div className="p-4 rounded-xl border bg-destructive/5 border-destructive/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-destructive">Complaints</span>
                  <span className="text-2xl font-bold text-destructive">{stats.openComplaints}</span>
                </div>
                <p className="text-xs text-muted-foreground">Unresolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
