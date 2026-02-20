import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTeacherSidebar } from '@/hooks/useTeacherSidebar';
import { BackButton } from '@/components/ui/back-button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, BookOpen, FlaskConical, Calendar, Clock, User } from 'lucide-react';

interface SyllabusEntry {
  id: string;
  chapter_name: string;
  topic_name: string;
  syllabus_type: string;
  exam_type: string | null;
  week_number: number | null;
  schedule_date: string | null;
  schedule_time: string | null;
  class_id: string;
  subject_id: string;
  classes?: { name: string; section: string } | null;
  subjects?: { name: string } | null;
}

interface TeacherMapping {
  id: string;
  syllabus_id: string;
  teacher_id: string;
  role_type: string;
}

interface ScheduleEntry {
  id: string;
  syllabus_id: string;
  date: string;
  start_time: string;
  end_time: string;
  class_id: string;
  classes?: { name: string; section: string } | null;
}

export default function TeacherSyllabus() {
  const teacherSidebarItems = useTeacherSidebar();
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

  const [syllabus, setSyllabus] = useState<SyllabusEntry[]>([]);
  const [mappings, setMappings] = useState<TeacherMapping[]>([]);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState('assigned');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('all');

  useEffect(() => {
    if (!loading && (!user || userRole !== 'teacher')) navigate('/auth');
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  async function fetchData() {
    setLoadingData(true);
    // Get teacher record
    const { data: teacherData } = await supabase.from('teachers').select('id').eq('user_id', user!.id).single();
    if (!teacherData) { setLoadingData(false); return; }
    setTeacherId(teacherData.id);

    const [mappingsRes, syllabusRes, schedulesRes] = await Promise.all([
      supabase.from('teacher_syllabus_map').select('*').eq('teacher_id', teacherData.id),
      supabase.from('syllabus').select('*, classes(name, section), subjects(name)'),
      supabase.from('syllabus_schedule').select('*, classes(name, section)').eq('teacher_id', teacherData.id).order('date'),
    ]);

    if (mappingsRes.data) setMappings(mappingsRes.data as TeacherMapping[]);
    if (syllabusRes.data) setSyllabus(syllabusRes.data as SyllabusEntry[]);
    if (schedulesRes.data) setSchedules(schedulesRes.data as ScheduleEntry[]);
    setLoadingData(false);
  }

  const assignedSyllabusIds = useMemo(() => new Set(mappings.map(m => m.syllabus_id)), [mappings]);
  const assignedSyllabus = useMemo(() => syllabus.filter(s => assignedSyllabusIds.has(s.id)), [syllabus, assignedSyllabusIds]);

  const roleForSyllabus = (syllabusId: string) => {
    const m = mappings.find(m => m.syllabus_id === syllabusId);
    return m?.role_type || '';
  };

  const classOptions = useMemo(() => {
    const map = new Map<string, string>();
    assignedSyllabus.forEach(s => {
      if (s.classes) map.set(s.class_id, `${s.classes.name}-${s.classes.section}`);
    });
    return Array.from(map.entries());
  }, [assignedSyllabus]);

  const filteredSyllabus = useMemo(() => {
    let items = assignedSyllabus;
    if (filterClass !== 'all') items = items.filter(s => s.class_id === filterClass);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(s => s.chapter_name.toLowerCase().includes(q) || s.topic_name.toLowerCase().includes(q) || s.subjects?.name?.toLowerCase().includes(q));
    }
    return items;
  }, [assignedSyllabus, filterClass, searchQuery]);

  const generalItems = filteredSyllabus.filter(s => s.syllabus_type === 'general');
  const competitiveItems = filteredSyllabus.filter(s => s.syllabus_type === 'competitive');

  const roleColors: Record<string, string> = {
    lead: 'bg-primary/10 text-primary',
    practice: 'bg-secondary text-secondary-foreground',
    doubt: 'bg-accent text-accent-foreground',
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const SyllabusList = ({ items }: { items: SyllabusEntry[] }) => (
    items.length === 0 ? (
      <Card><CardContent className="py-12 text-center text-muted-foreground">No assigned syllabus topics found.</CardContent></Card>
    ) : (
      <div className="space-y-3">
        {items.map(s => (
          <Card key={s.id}>
            <CardContent className="py-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 flex-1 min-w-0">
                  <h3 className="font-medium text-sm">{s.chapter_name}</h3>
                  <p className="text-xs text-muted-foreground">{s.topic_name}</p>
                </div>
                <Badge className={`text-xs shrink-0 ${roleColors[roleForSyllabus(s.id)] || ''}`}>
                  {roleForSyllabus(s.id)} faculty
                </Badge>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">{s.classes ? `${s.classes.name}-${s.classes.section}` : '—'}</Badge>
                <Badge variant="secondary" className="text-xs">{s.subjects?.name}</Badge>
                {s.exam_type && <Badge variant="outline" className="text-xs">{s.exam_type}</Badge>}
                {s.week_number && <Badge variant="outline" className="text-xs">Week {s.week_number}</Badge>}
              </div>
              {s.schedule_date && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />{new Date(s.schedule_date).toLocaleDateString()}
                  {s.schedule_time && <><Clock className="h-3 w-3 ml-1" />{s.schedule_time}</>}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    )
  );

  return (
    <DashboardLayout sidebarItems={teacherSidebarItems} roleColor="teacher">
      {loadingData ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          <BackButton to="/teacher" />
          <div>
            <h1 className="font-display text-2xl font-bold">My Syllabus</h1>
            <p className="text-muted-foreground">View your assigned syllabus topics and schedule</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search topics..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All Classes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classOptions.map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="assigned" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <BookOpen className="h-4 w-4" />General
              </TabsTrigger>
              <TabsTrigger value="competitive" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <FlaskConical className="h-4 w-4" />Competitive
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Calendar className="h-4 w-4" />Schedule
              </TabsTrigger>
            </TabsList>

            <TabsContent value="assigned" className="mt-4">
              <SyllabusList items={generalItems} />
            </TabsContent>
            <TabsContent value="competitive" className="mt-4">
              <SyllabusList items={competitiveItems} />
            </TabsContent>
            <TabsContent value="schedule" className="mt-4">
              {schedules.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">No scheduled sessions found.</CardContent></Card>
              ) : (
                <div className="space-y-3">
                  {schedules.map(sch => {
                    const syl = syllabus.find(s => s.id === sch.syllabus_id);
                    return (
                      <Card key={sch.id}>
                        <CardContent className="py-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <h3 className="font-medium text-sm">{syl?.chapter_name || 'Unknown'}</h3>
                              <p className="text-xs text-muted-foreground">{syl?.topic_name}</p>
                            </div>
                            <Badge variant="outline" className="text-xs">{sch.classes ? `${sch.classes.name}-${sch.classes.section}` : '—'}</Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(sch.date).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{sch.start_time} - {sch.end_time}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </DashboardLayout>
  );
}
