import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Bell, Calendar } from 'lucide-react';
import { parentSidebarItems } from '@/config/parentSidebar';

interface Announcement {
  id: string;
  title: string;
  content: string;
  target_audience: string[] | null;
  created_at: string;
}

export default function ParentAnnouncements() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && (!user || userRole !== 'parent')) {
      navigate('/auth');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    async function fetchAnnouncements() {
      if (!user) return;
      setLoadingData(true);

      try {
        // Get parent record
        const { data: parent } = await supabase
          .from('parents')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        let childClassIdentifiers: string[] = [];

        if (parent) {
          // Get linked students
          const { data: studentLinks } = await supabase
            .from('student_parents')
            .select('student_id')
            .eq('parent_id', parent.id);

          if (studentLinks && studentLinks.length > 0) {
            const studentIds = studentLinks.map(sl => sl.student_id);
            
            // Get students' class info
            const { data: students } = await supabase
              .from('students')
              .select('class_id')
              .in('id', studentIds);

            if (students) {
              const classIds = students.map(s => s.class_id).filter(Boolean) as string[];
              
              if (classIds.length > 0) {
                // Get class names
                const { data: classes } = await supabase
                  .from('classes')
                  .select('name, section')
                  .in('id', classIds);

                if (classes) {
                  childClassIdentifiers = classes.map(c => `class:${c.name}-${c.section}`);
                }
              }
            }
          }
        }

        // Fetch all announcements
        const { data } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false });

        if (data) {
          // Filter announcements parent can see:
          // - 'all' audience
          // - 'parents' audience
          // - their child's class announcements
          const filtered = data.filter(announcement => {
            const audiences = announcement.target_audience || ['all'];
            return audiences.some(audience => 
              audience === 'all' || 
              audience === 'parents' ||
              childClassIdentifiers.includes(audience)
            );
          });
          
          setAnnouncements(filtered);
        }
      } catch (error) {
        console.error('Error fetching announcements:', error);
      } finally {
        setLoadingData(false);
      }
    }
    fetchAnnouncements();
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
        <div>
          <h1 className="font-display text-2xl font-bold">Announcements</h1>
          <p className="text-muted-foreground">School announcements and updates</p>
        </div>

        {announcements.length === 0 ? (
          <Card className="card-elevated">
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No announcements yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <Card key={announcement.id} className="card-elevated">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-accent/10">
                        <Bell className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <CardTitle className="font-display text-lg">{announcement.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {new Date(announcement.created_at).toLocaleDateString('en-US', {
                              weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    {announcement.target_audience && announcement.target_audience.length > 0 && (
                      <div className="flex gap-1">
                        {announcement.target_audience.map((audience: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs capitalize">{audience}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{announcement.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      )}
    </DashboardLayout>
  );
}
