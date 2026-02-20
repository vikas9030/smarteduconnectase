import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import StatCard from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Bell,
  FileText,
  MessageSquare,
  Clock,
  LayoutDashboard,
  Loader2,
  ClipboardList,
  CheckSquare,
  AlertCircle,
} from 'lucide-react';

// Sidebar items from shared config with permission check
import { useTeacherSidebar } from '@/hooks/useTeacherSidebar';

interface DashboardStats {
  myClasses: number;
  totalStudents: number;
  pendingHomework: number;
  pendingAttendance: boolean;
}

interface TimetableEntry {
  id: string;
  start_time: string;
  end_time: string;
  day_of_week: string;
  classes: { name: string; section: string } | null;
  subjects: { name: string } | null;
}

export default function TeacherDashboard() {
  const teacherSidebarItems = useTeacherSidebar();
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    myClasses: 0,
    totalStudents: 0,
    pendingHomework: 0,
    pendingAttendance: true,
  });
  const [todaySchedule, setTodaySchedule] = useState<TimetableEntry[]>([]);
  const [profileName, setProfileName] = useState('Teacher');
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!loading && (!user || userRole !== 'teacher')) {
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

        // Get teacher record
        const { data: teacher } = await supabase
          .from('teachers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (teacher) {
          // Fetch assigned classes
          const { data: teacherClasses } = await supabase
            .from('teacher_classes')
            .select('class_id')
            .eq('teacher_id', teacher.id);

          const classIds = teacherClasses?.map(tc => tc.class_id) || [];
          
          // Fetch student count in assigned classes
          let studentCount = 0;
          if (classIds.length > 0) {
            const { count } = await supabase
              .from('students')
              .select('*', { count: 'exact', head: true })
              .in('class_id', classIds);
            studentCount = count || 0;
          }

          // Get today's day of week
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const today = days[new Date().getDay()];

          // Fetch today's timetable
          const { data: timetable } = await supabase
            .from('timetable')
            .select('id, start_time, end_time, day_of_week, classes(name, section), subjects(name)')
            .eq('teacher_id', teacher.id)
            .eq('day_of_week', today)
            .eq('is_published', true)
            .order('start_time');

          if (timetable) {
            setTodaySchedule(timetable as TimetableEntry[]);
          }

          // Check if attendance marked today
          const todayDate = new Date().toISOString().split('T')[0];
          const { count: attendanceCount } = await supabase
            .from('attendance')
            .select('*', { count: 'exact', head: true })
            .eq('marked_by', teacher.id)
            .eq('date', todayDate);

          setStats({
            myClasses: classIds.length,
            totalStudents: studentCount,
            pendingHomework: 0,
            pendingAttendance: (attendanceCount || 0) === 0,
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoadingStats(false);
      }
    }

    fetchDashboardData();
  }, [user]);

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout sidebarItems={teacherSidebarItems} roleColor="teacher">
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Section */}
        <div className="rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #1a3628, #2a5040)' }}>
          <h1 className="font-display text-2xl font-bold">Good Morning, {profileName}!</h1>
          <p className="text-white/80 mt-1">Ready for another day of inspiring young minds.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="My Classes"
            value={loadingStats ? '...' : stats.myClasses.toString()}
            icon={<BookOpen className="h-6 w-6" />}
          />
          <StatCard
            title="Total Students"
            value={loadingStats ? '...' : stats.totalStudents.toString()}
            icon={<Users className="h-6 w-6" />}
          />
          <StatCard
            title="Today's Classes"
            value={loadingStats ? '...' : todaySchedule.length.toString()}
            icon={<Calendar className="h-6 w-6" />}
          />
          <StatCard
            title="Attendance"
            value={loadingStats ? '...' : (stats.pendingAttendance ? 'Pending' : 'Done')}
            icon={<CheckSquare className="h-6 w-6" />}
            variant={stats.pendingAttendance ? 'secondary' : 'primary'}
          />
        </div>

        {/* Today's Schedule & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Today's Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todaySchedule.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No classes scheduled for today</p>
                  <p className="text-sm mt-1">Check your timetable or contact admin</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todaySchedule.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="flex items-center gap-4 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="text-sm font-medium text-muted-foreground w-28">
                        {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{schedule.subjects?.name || 'Subject'}</p>
                        <p className="text-sm text-muted-foreground">
                          {schedule.classes ? `Class ${schedule.classes.name} - ${schedule.classes.section}` : 'Class'}
                        </p>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: <Clock className="h-5 w-5" />, label: 'Mark Attendance', path: '/teacher/attendance' },
                  { icon: <BookOpen className="h-5 w-5" />, label: 'Add Homework', path: '/teacher/homework' },
                  { icon: <FileText className="h-5 w-5" />, label: 'Enter Marks', path: '/teacher/exams' },
                  { icon: <ClipboardList className="h-5 w-5" />, label: 'Student Report', path: '/teacher/reports' },
                  { icon: <Users className="h-5 w-5" />, label: 'Add Student', path: '/teacher/students' },
                  { icon: <MessageSquare className="h-5 w-5" />, label: 'Messages', path: '/teacher/messages' },
                ].map((action, index) => (
                  <button
                    key={index}
                    onClick={() => navigate(action.path)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    {action.icon}
                    <span className="text-sm font-medium text-center">{action.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
