import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTeacherSidebar } from '@/hooks/useTeacherSidebar';
import { BackButton } from '@/components/ui/back-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, BookOpen, FlaskConical, Calendar, Clock, History, PlayCircle, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SyllabusEntry {
  id: string;
  chapter_name: string;
  topic_name: string;
  syllabus_type: string;
  exam_type: string | null;
  week_number: number | null;
  schedule_date: string | null;
  schedule_time: string | null;
  start_date: string | null;
  end_date: string | null;
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

export default function TeacherSyllabus() {
  const teacherSidebarItems = useTeacherSidebar();
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

  const [syllabus, setSyllabus] = useState<SyllabusEntry[]>([]);
  const [mappings, setMappings] = useState<TeacherMapping[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState('present');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterExam, setFilterExam] = useState('all');

  useEffect(() => {
    if (!loading && (!user || userRole !== 'teacher')) navigate('/auth');
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  async function fetchData() {
    setLoadingData(true);
    const { data: teacherData } = await supabase.from('teachers').select('id').eq('user_id', user!.id).single();
    if (!teacherData) { setLoadingData(false); return; }

    const [mappingsRes, syllabusRes] = await Promise.all([
      supabase.from('teacher_syllabus_map').select('*').eq('teacher_id', teacherData.id),
      supabase.from('syllabus').select('*, classes(name, section), subjects(name)'),
    ]);

    if (mappingsRes.data) setMappings(mappingsRes.data as TeacherMapping[]);
    if (syllabusRes.data) setSyllabus(syllabusRes.data as SyllabusEntry[]);
    setLoadingData(false);
  }

  const assignedSyllabusIds = useMemo(() => new Set(mappings.map(m => m.syllabus_id)), [mappings]);
  const assignedSyllabus = useMemo(() => syllabus.filter(s => assignedSyllabusIds.has(s.id)), [syllabus, assignedSyllabusIds]);

  const roleForSyllabus = (syllabusId: string) => {
    const m = mappings.find(m => m.syllabus_id === syllabusId);
    return m?.role_type || '';
  };

  const today = new Date().toISOString().split('T')[0];

  const subjectOptions = useMemo(() =>
    [...new Set(assignedSyllabus.map(s => s.subjects?.name).filter(Boolean))] as string[],
    [assignedSyllabus]
  );

  const examOptions = useMemo(() =>
    [...new Set(assignedSyllabus.map(s => s.exam_type).filter(Boolean))] as string[],
    [assignedSyllabus]
  );

  const { presentItems, previousItems } = useMemo(() => {
    let items = assignedSyllabus;
    if (filterClass !== 'all') items = items.filter(s => s.class_id === filterClass);
    if (filterSubject !== 'all') items = items.filter(s => s.subjects?.name === filterSubject);
    if (filterExam !== 'all') items = items.filter(s => s.exam_type === filterExam);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(s =>
        s.chapter_name.toLowerCase().includes(q) ||
        s.topic_name.toLowerCase().includes(q) ||
        s.subjects?.name?.toLowerCase().includes(q)
      );
    }

    const present: SyllabusEntry[] = [];
    const previous: SyllabusEntry[] = [];

    items.forEach(item => {
      if (item.end_date && item.end_date < today) {
        previous.push(item);
      } else {
        present.push(item);
      }
    });

    return { presentItems: present, previousItems: previous };
  }, [assignedSyllabus, filterClass, filterSubject, filterExam, searchQuery, today]);

  const classOptions = useMemo(() => {
    const map = new Map<string, string>();
    assignedSyllabus.forEach(s => {
      if (s.classes) map.set(s.class_id, `${s.classes.name}-${s.classes.section}`);
    });
    return Array.from(map.entries());
  }, [assignedSyllabus]);

  const roleColors: Record<string, string> = {
    lead: 'bg-primary/10 text-primary',
    practice: 'bg-secondary text-secondary-foreground',
    doubt: 'bg-accent text-accent-foreground',
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const SyllabusList = ({ items, emptyMsg }: { items: SyllabusEntry[]; emptyMsg: string }) => (
    items.length === 0 ? (
      <Card><CardContent className="py-12 text-center text-muted-foreground">{emptyMsg}</CardContent></Card>
    ) : (
      <div className="space-y-3">
        {Object.entries(
          items.reduce<Record<string, SyllabusEntry[]>>((acc, s) => {
            const key = s.subjects?.name || 'Other';
            if (!acc[key]) acc[key] = [];
            acc[key].push(s);
            return acc;
          }, {})
        ).map(([subject, subItems]) => (
          <Collapsible key={subject} asChild>
            <Card>
              <CollapsibleTrigger className="w-full text-left">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    {subject}
                    <Badge variant="secondary" className="ml-auto mr-2 text-xs">{subItems.length} topics</Badge>
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 [&[data-state=open]]:rotate-180" />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-2">
                  {subItems.map((s, idx) => (
                <div key={s.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{s.chapter_name}</p>
                    <p className="text-xs text-muted-foreground">{s.topic_name}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {s.classes ? `${s.classes.name}-${s.classes.section}` : '—'}
                      </Badge>
                      {s.syllabus_type === 'competitive' && (
                        <Badge className="text-[10px] bg-accent/20 text-accent-foreground">
                          <FlaskConical className="h-3 w-3 mr-0.5" />Competitive
                        </Badge>
                      )}
                      {s.exam_type && <Badge variant="outline" className="text-[10px]">{s.exam_type}</Badge>}
                      {s.week_number && <Badge variant="outline" className="text-[10px]">Week {s.week_number}</Badge>}
                      {roleForSyllabus(s.id) && (
                        <Badge className={`text-[10px] ${roleColors[roleForSyllabus(s.id)] || ''}`}>
                          {roleForSyllabus(s.id)} faculty
                        </Badge>
                      )}
                    </div>
                    {(s.start_date || s.schedule_date) && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        {s.start_date && s.end_date
                          ? `${new Date(s.start_date).toLocaleDateString()} – ${new Date(s.end_date).toLocaleDateString()}`
                          : s.schedule_date
                            ? new Date(s.schedule_date).toLocaleDateString()
                            : ''
                        }
                        {s.schedule_time && <><Clock className="h-3 w-3 ml-1" />{s.schedule_time}</>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
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
            <p className="text-muted-foreground">View your assigned topics — current & completed</p>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search topics..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="w-full text-xs h-9"><SelectValue placeholder="All Classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classOptions.map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger className="w-full text-xs h-9"><SelectValue placeholder="All Subjects" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjectOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterExam} onValueChange={setFilterExam}>
                <SelectTrigger className="w-full text-xs h-9 col-span-2 sm:col-span-1"><SelectValue placeholder="All Exams" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Exams</SelectItem>
                  {examOptions.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="present" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <PlayCircle className="h-4 w-4" />
                Present / Upcoming ({presentItems.length})
              </TabsTrigger>
              <TabsTrigger value="previous" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <History className="h-4 w-4" />
                Completed ({previousItems.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="present" className="mt-4">
              <SyllabusList items={presentItems} emptyMsg="No current or upcoming syllabus topics assigned." />
            </TabsContent>
            <TabsContent value="previous" className="mt-4">
              <SyllabusList items={previousItems} emptyMsg="No completed syllabus topics yet." />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </DashboardLayout>
  );
}
