import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import StatCard from '@/components/StatCard';
import AttendanceSummary from '@/components/AttendanceSummary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  User,
  GraduationCap,
  BookOpen,
  Calendar,
  Bell,
  FileText,
  MessageSquare,
  Clock,
  LayoutDashboard,
  Loader2,
  CreditCard,
  Award,
  TrendingUp,
} from 'lucide-react';

import { parentSidebarItems } from '@/config/parentSidebar';

interface ChildData {
  id: string;
  full_name: string;
  admission_number: string;
  photo_url: string | null;
  status: string | null;
  classes: { name: string; section: string } | null;
}

export default function ParentDashboard() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [children, setChildren] = useState<ChildData[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && (!user || userRole !== 'parent')) {
      navigate('/auth');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoadingData(true);

      try {
        // Get parent record
        const { data: parentData } = await supabase
          .from('parents')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (parentData) {
          // Get linked students
          const { data: links } = await supabase
            .from('student_parents')
            .select('student_id')
            .eq('parent_id', parentData.id);

          if (links && links.length > 0) {
            const studentIds = links.map(l => l.student_id);
            const { data: studentsData } = await supabase
              .from('students')
              .select('id, full_name, admission_number, photo_url, status, classes(name, section)')
              .in('id', studentIds);

            if (studentsData) {
              setChildren(studentsData as ChildData[]);
            }
          }
        }

        // Fetch announcements
        const { data: announcementsData } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(4);

        if (announcementsData) {
          setAnnouncements(announcementsData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoadingData(false);
      }
    }

    fetchData();
  }, [user]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const isLoadingContent = loadingData;

  return (
    <DashboardLayout sidebarItems={parentSidebarItems} roleColor="parent">
      {isLoadingContent ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Section */}
        <div className="gradient-parent rounded-2xl p-6 text-white">
          <h1 className="font-display text-2xl font-bold">Welcome, Parent!</h1>
          <p className="text-white/80 mt-1">Stay connected with your child's educational journey.</p>
        </div>

        {/* Children Profiles */}
        {children.length === 0 ? (
          <Card className="card-elevated">
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No children linked to your account yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Please contact the school administration.</p>
            </CardContent>
          </Card>
        ) : (
          children.map((child) => (
            <div key={child.id} className="space-y-4">
              {/* Child Profile Card */}
              <Card className="card-elevated">
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <Avatar className="h-24 w-24 ring-4 ring-accent/20 ring-offset-2">
                      <AvatarImage src={child.photo_url || ''} />
                      <AvatarFallback className="gradient-parent text-white text-2xl">
                        {child.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center sm:text-left flex-1">
                      <h2 className="font-display text-xl font-bold">{child.full_name}</h2>
                      <p className="text-muted-foreground">
                        {child.classes ? `Class ${child.classes.name} - ${child.classes.section}` : 'No class assigned'}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                        <Badge className={child.status === 'active' ? 'status-active' : 'status-inactive'}>
                          {child.status || 'Active'}
                        </Badge>
                        <Badge variant="outline">
                          <GraduationCap className="h-3 w-3 mr-1" />
                          {child.admission_number}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Attendance Summary for this child */}
              <AttendanceSummary studentId={child.id} />
            </div>
          ))
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Children"
            value={children.length.toString()}
            icon={<User className="h-6 w-6" />}
          />
          <StatCard
            title="Pending Homework"
            value="--"
            icon={<BookOpen className="h-6 w-6" />}
          />
          <StatCard
            title="Upcoming Exams"
            value="--"
            icon={<FileText className="h-6 w-6" />}
          />
          <StatCard
            title="Fee Status"
            value="--"
            icon={<CreditCard className="h-6 w-6" />}
            variant="accent"
          />
        </div>

        {/* Announcements */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Bell className="h-5 w-5 text-accent" />
              Recent Announcements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {announcements.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No announcements yet.</p>
            ) : (
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-muted/50"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent/10 text-accent">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{announcement.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(announcement.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      )}
    </DashboardLayout>
  );
}
