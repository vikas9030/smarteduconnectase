import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Clock, FileText, Table } from 'lucide-react';
import { parentSidebarItems } from '@/config/parentSidebar';
import { downloadTimetableAsCSV, downloadTimetableAsPDF } from '@/utils/timetableDownload';

interface TimetableEntry {
  id: string;
  day_of_week: string;
  period_number: number;
  start_time: string;
  end_time: string;
  subjects: { name: string } | null;
  teacherName?: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ParentTimetable() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [childClass, setChildClass] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && (!user || userRole !== 'parent')) {
      navigate('/auth');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    async function fetchTimetable() {
      if (!user) return;
      setLoadingData(true);

      const { data: parentData } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (parentData) {
        const { data: links } = await supabase
          .from('student_parents')
          .select('student_id, students(class_id, classes(name, section))')
          .eq('parent_id', parentData.id);

        if (links && links.length > 0) {
          const student = (links[0] as any).students;
          if (student?.class_id) {
            setChildClass(`${student.classes?.name} - ${student.classes?.section}`);
            
            // Fetch timetable with teacher info
            const { data: timetableData } = await supabase
              .from('timetable')
              .select('*, subjects(name)')
              .eq('class_id', student.class_id)
              .eq('is_published', true)
              .order('period_number');

            if (timetableData) {
              // Get teacher names
              const teacherIds = timetableData.filter(t => t.teacher_id).map(t => t.teacher_id);
              let teacherNames: Record<string, string> = {};

              if (teacherIds.length > 0) {
                const { data: teachersData } = await supabase
                  .from('teachers')
                  .select('id, user_id')
                  .in('id', teacherIds);

                if (teachersData && teachersData.length > 0) {
                  const userIds = teachersData.map(t => t.user_id);
                  const { data: profiles } = await supabase
                    .from('profiles')
                    .select('user_id, full_name')
                    .in('user_id', userIds);

                  teachersData.forEach(t => {
                    const profile = profiles?.find(p => p.user_id === t.user_id);
                    if (profile) teacherNames[t.id] = profile.full_name;
                  });
                }
              }

              setTimetable(timetableData.map(entry => ({
                ...entry,
                teacherName: entry.teacher_id ? teacherNames[entry.teacher_id] || 'Unknown' : undefined,
              })) as TimetableEntry[]);
            }
          }
        }
      }
      setLoadingData(false);
    }
    fetchTimetable();
  }, [user]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const isLoadingContent = loadingData;

  const groupedByDay = DAYS.reduce((acc, day) => {
    acc[day] = timetable.filter(t => t.day_of_week === day).sort((a, b) => a.period_number - b.period_number);
    return acc;
  }, {} as Record<string, TimetableEntry[]>);

  const handleDownloadCSV = () => {
    downloadTimetableAsCSV(timetable, `Class_${childClass}`, true);
  };

  const handleDownloadPDF = () => {
    downloadTimetableAsPDF(timetable, `Class ${childClass}`, true);
  };

  return (
    <DashboardLayout sidebarItems={parentSidebarItems} roleColor="parent">
      {isLoadingContent ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Timetable</h1>
            <p className="text-muted-foreground">Class {childClass} weekly schedule</p>
          </div>
          
          {timetable.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadCSV}>
                <Table className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          )}
        </div>

        {timetable.length === 0 ? (
          <Card className="card-elevated">
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No timetable published yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DAYS.map((day) => (
              <Card key={day} className="card-elevated">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    {day}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {groupedByDay[day].length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No classes</p>
                  ) : (
                    <div className="space-y-2">
                      {groupedByDay[day].map((entry) => (
                        <div key={entry.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {entry.period_number}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium capitalize text-sm">{entry.subjects?.name || 'Free Period'}</p>
                            {entry.teacherName && (
                              <p className="text-xs text-muted-foreground">{entry.teacherName}</p>
                            )}
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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