import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Calendar, Clock, User, FileText, Table } from 'lucide-react';
import {
  Users,
  GraduationCap,
  BookOpen,
  Bell,
  MessageSquare,
  LayoutDashboard,
  ClipboardList,
} from 'lucide-react';
import { downloadTimetableAsCSV, downloadTimetableAsPDF } from '@/utils/timetableDownload';

// Sidebar items from shared config with permission check
import { useTeacherSidebar } from '@/hooks/useTeacherSidebar';

interface TimetableEntry {
  id: string;
  day_of_week: string;
  period_number: number;
  start_time: string;
  end_time: string;
  teacher_id: string | null;
  subjects: { name: string } | null;
  teacherName?: string;
  className?: string;
}

interface ClassOption {
  id: string;
  name: string;
  section: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TeacherTimetable() {
  const teacherSidebarItems = useTeacherSidebar();
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [mySchedule, setMySchedule] = useState<TimetableEntry[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState<string>('');
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState('my-schedule');

  useEffect(() => {
    if (!loading && (!user || userRole !== 'teacher')) {
      navigate('/auth');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    fetchInitialData();
  }, [user]);

  useEffect(() => {
    if (selectedClass) {
      fetchClassTimetable(selectedClass);
    }
  }, [selectedClass]);

  async function fetchInitialData() {
    if (!user) return;
    setLoadingData(true);

    // Get teacher ID and name
    const { data: teacherData } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    // Get teacher's profile name
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileData) {
      setTeacherName(profileData.full_name || 'Teacher');
    }

    if (teacherData) {
      setTeacherId(teacherData.id);
      
      // Fetch teacher's own schedule
      const { data: myTimetable } = await supabase
        .from('timetable')
        .select('*, subjects(name), classes(name, section)')
        .eq('teacher_id', teacherData.id)
        .eq('is_published', true)
        .order('day_of_week')
        .order('period_number');

      if (myTimetable) {
        setMySchedule(myTimetable.map(t => ({
          ...t,
          className: `${(t.classes as any)?.name}-${(t.classes as any)?.section}`
        })) as any);
      }
    }

    // Fetch all classes
    const { data: classesData } = await supabase
      .from('classes')
      .select('id, name, section')
      .order('name');

    if (classesData) {
      setClasses(classesData);
      if (classesData.length > 0) {
        setSelectedClass(classesData[0].id);
      }
    }

    setLoadingData(false);
  }

  async function fetchClassTimetable(classId: string) {
    const { data } = await supabase
      .from('timetable')
      .select('*, subjects(name)')
      .eq('class_id', classId)
      .eq('is_published', true)
      .order('period_number');

    if (data) {
      // Get teacher names
      const teacherIds = data.filter(t => t.teacher_id).map(t => t.teacher_id);
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

      setTimetable(data.map(entry => ({
        ...entry,
        teacherName: entry.teacher_id ? teacherNames[entry.teacher_id] || 'Unknown' : undefined,
      })));
    }
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const groupedByDay = (entries: TimetableEntry[]) => {
    return DAYS.reduce((acc, day) => {
      acc[day] = entries.filter(t => t.day_of_week === day).sort((a, b) => a.period_number - b.period_number);
      return acc;
    }, {} as Record<string, TimetableEntry[]>);
  };

  const selectedClassName = classes.find(c => c.id === selectedClass);

  const handleDownloadMyScheduleCSV = () => {
    downloadTimetableAsCSV(mySchedule, `${teacherName}_Schedule`, false, true);
  };

  const handleDownloadMySchedulePDF = () => {
    downloadTimetableAsPDF(mySchedule, `${teacherName}'s Schedule`, false, true);
  };

  const handleDownloadClassCSV = () => {
    if (selectedClassName) {
      downloadTimetableAsCSV(timetable, `Class_${selectedClassName.name}-${selectedClassName.section}`, true);
    }
  };

  const handleDownloadClassPDF = () => {
    if (selectedClassName) {
      downloadTimetableAsPDF(timetable, `Class ${selectedClassName.name}-${selectedClassName.section}`, true);
    }
  };

  return (
    <DashboardLayout sidebarItems={teacherSidebarItems} roleColor="teacher">
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-display text-2xl font-bold">Timetable</h1>
          <p className="text-muted-foreground">View your schedule and class timetables</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="my-schedule">My Schedule</TabsTrigger>
            <TabsTrigger value="class-timetable">Class Timetables</TabsTrigger>
          </TabsList>

          <TabsContent value="my-schedule" className="mt-6">
            <div className="flex justify-end mb-4">
              {mySchedule.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleDownloadMyScheduleCSV}>
                    <Table className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadMySchedulePDF}>
                    <FileText className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                </div>
              )}
            </div>

            {mySchedule.length === 0 ? (
              <Card className="card-elevated">
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No classes assigned to you yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">Contact admin to assign your schedule.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {DAYS.map((day) => {
                  const dayEntries = groupedByDay(mySchedule)[day];
                  return (
                    <Card key={day} className="card-elevated">
                      <CardHeader className="pb-3">
                        <CardTitle className="font-display text-lg flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          {day}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {dayEntries.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No classes</p>
                        ) : (
                          <div className="space-y-2">
                            {dayEntries.map((entry: any) => (
                              <div key={entry.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                  {entry.period_number}
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{entry.subjects?.name || 'Free Period'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {entry.className}
                                  </p>
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {entry.start_time?.slice(0, 5)} - {entry.end_time?.slice(0, 5)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="class-timetable" className="mt-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div className="flex items-center gap-4">
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} - {c.section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedClassName && (
                  <span className="text-sm text-muted-foreground">
                    Viewing: {selectedClassName.name} - {selectedClassName.section}
                  </span>
                )}
              </div>

              {timetable.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleDownloadClassCSV}>
                    <Table className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadClassPDF}>
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
                  <p className="text-muted-foreground">No timetable published for this class.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {DAYS.map((day) => {
                  const dayEntries = groupedByDay(timetable)[day];
                  return (
                    <Card key={day} className="card-elevated">
                      <CardHeader className="pb-3">
                        <CardTitle className="font-display text-lg flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          {day}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {dayEntries.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No classes</p>
                        ) : (
                          <div className="space-y-2">
                            {dayEntries.map((entry) => (
                              <div key={entry.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                  {entry.period_number}
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{entry.subjects?.name || 'Free Period'}</p>
                                  {entry.teacherName && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {entry.teacherName}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {entry.start_time?.slice(0, 5)} - {entry.end_time?.slice(0, 5)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}