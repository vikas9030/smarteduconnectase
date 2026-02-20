import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { parentSidebarItems } from '@/config/parentSidebar';
import { BackButton } from '@/components/ui/back-button';
import { Loader2, BookOpen, Filter, PlayCircle, History, Calendar, Clock, FlaskConical, User, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SyllabusItem {
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
  completed_at: string | null;
  completed_by: string | null;
  subjects: { name: string } | null;
  classes: { name: string; section: string } | null;
}

export default function ParentSyllabus() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [syllabus, setSyllabus] = useState<SyllabusItem[]>([]);
  const [childName, setChildName] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedExam, setSelectedExam] = useState('all');
  const [activeTab, setActiveTab] = useState('present');
  const [teacherMap, setTeacherMap] = useState<Record<string, { name: string; role: string }[]>>({});
  const [completedByNames, setCompletedByNames] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!loading && (!user || userRole !== 'parent')) {
      navigate('/auth');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    async function fetchData() {
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
          .select('student_id, students(full_name, class_id)')
          .eq('parent_id', parentData.id);

        if (links && links.length > 0) {
          const student = (links[0] as any).students;
          setChildName(student?.full_name || '');

          const classIds = links
            .map((l: any) => l.students?.class_id)
            .filter(Boolean) as string[];

          if (classIds.length > 0) {
            const { data: syllabusData } = await supabase
              .from('syllabus')
              .select('*, subjects(name), classes:class_id(name, section)')
              .in('class_id', classIds)
              .order('chapter_name', { ascending: true });

            if (syllabusData) {
              setSyllabus(syllabusData as unknown as SyllabusItem[]);
              // Fetch teacher assignments for these syllabus entries
              const syllabusIds = syllabusData.map((s: any) => s.id);
              if (syllabusIds.length > 0) {
                const { data: tMap } = await supabase
                  .from('teacher_syllabus_map')
                  .select('syllabus_id, role_type, teacher_id')
                  .in('syllabus_id', syllabusIds);
                if (tMap && tMap.length > 0) {
                  const teacherIds = [...new Set(tMap.map((t: any) => t.teacher_id))];
                  const { data: profiles } = await supabase
                    .from('profiles')
                    .select('user_id, full_name');
                  const { data: teachers } = await supabase
                    .from('teachers')
                    .select('id, user_id')
                    .in('id', teacherIds);
                  const teacherNameMap: Record<string, string> = {};
                  teachers?.forEach((t: any) => {
                    const profile = profiles?.find((p: any) => p.user_id === t.user_id);
                    if (profile) teacherNameMap[t.id] = profile.full_name;
                  });
                  const grouped: Record<string, { name: string; role: string }[]> = {};
                  tMap.forEach((t: any) => {
                    if (!grouped[t.syllabus_id]) grouped[t.syllabus_id] = [];
                    grouped[t.syllabus_id].push({
                      name: teacherNameMap[t.teacher_id] || 'Teacher',
                      role: t.role_type,
                    });
                  });
                  setTeacherMap(grouped);
                }
              }
              // Fetch completed_by names
              const completedByIds = [...new Set(syllabusData.map((s: any) => s.completed_by).filter(Boolean))] as string[];
              if (completedByIds.length > 0) {
                const { data: cProfiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', completedByIds);
                const cMap: Record<string, string> = {};
                cProfiles?.forEach((p: any) => { cMap[p.user_id] = p.full_name; });
                setCompletedByNames(cMap);
              }
            }
          }
        }
      }
      setLoadingData(false);
    }
    fetchData();
  }, [user]);

  const subjects = useMemo(() =>
    [...new Set(syllabus.map(s => s.subjects?.name).filter(Boolean))] as string[],
    [syllabus]
  );

  const examOptions = useMemo(() =>
    [...new Set(syllabus.map(s => s.exam_type).filter(Boolean))] as string[],
    [syllabus]
  );

  const today = new Date().toISOString().split('T')[0];

  const { presentItems, previousItems } = useMemo(() => {
    let result = syllabus;
    if (selectedSubject !== 'all') result = result.filter(s => s.subjects?.name === selectedSubject);
    if (selectedExam !== 'all') result = result.filter(s => s.exam_type === selectedExam);

    const present: SyllabusItem[] = [];
    const previous: SyllabusItem[] = [];

    result.forEach(item => {
      if (item.completed_at) {
        previous.push(item);
      } else {
        present.push(item);
      }
    });

    return { presentItems: present, previousItems: previous };
  }, [syllabus, selectedSubject, selectedExam, today]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const SyllabusGrouped = ({ items, emptyMsg }: { items: SyllabusItem[]; emptyMsg: string }) => {
    const grouped = items.reduce<Record<string, SyllabusItem[]>>((acc, item) => {
      const subject = item.subjects?.name || 'Other';
      if (!acc[subject]) acc[subject] = [];
      acc[subject].push(item);
      return acc;
    }, {});

    if (Object.keys(grouped).length === 0) {
      return <Card><CardContent className="py-10 text-center text-muted-foreground">{emptyMsg}</CardContent></Card>;
    }

    return (
      <div className="space-y-3 sm:space-y-4">
        {Object.entries(grouped).map(([subject, items]) => (
          <Collapsible key={subject} asChild>
            <Card className="overflow-hidden">
              <CollapsibleTrigger className="w-full text-left">
                <CardHeader className="py-3 px-3 sm:px-6 sm:pb-3">
                  <CardTitle className="text-sm sm:text-lg flex items-center gap-1.5 sm:gap-2">
                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                    <span className="truncate">{subject}</span>
                    <Badge variant="secondary" className="ml-auto mr-1 sm:mr-2 text-[10px] sm:text-xs shrink-0">{items.length}</Badge>
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="px-2 sm:px-6 pb-3 sm:pb-6 pt-0">
                  <div className="space-y-1.5 sm:space-y-2">
                    {items.map((item, idx) => (
                      <div key={item.id} className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-muted/50">
                        <span className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary/10 text-primary text-[10px] sm:text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs sm:text-sm leading-tight">{item.chapter_name}</p>
                          <p className="text-[11px] sm:text-xs text-muted-foreground leading-tight mt-0.5">{item.topic_name}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.syllabus_type === 'competitive' && (
                              <Badge className="text-[9px] sm:text-[10px] px-1 py-0 bg-accent/20 text-accent-foreground">
                                <FlaskConical className="h-2.5 w-2.5 mr-0.5" />Competitive
                              </Badge>
                            )}
                            {item.exam_type && <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1 py-0">{item.exam_type}</Badge>}
                            {item.week_number && <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1 py-0">W{item.week_number}</Badge>}
                          </div>
                          {teacherMap[item.id] && teacherMap[item.id].length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {teacherMap[item.id].map((t, i) => (
                                <Badge key={i} variant="outline" className="text-[9px] sm:text-[10px] px-1 py-0 gap-0.5">
                                  <User className="h-2 w-2 sm:h-2.5 sm:w-2.5" />{t.name} ({t.role})
                                </Badge>
                              ))}
                            </div>
                          )}
                          {(item.start_date || item.schedule_date) && (
                            <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground mt-1">
                              <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              {item.start_date && item.end_date
                                ? `${new Date(item.start_date).toLocaleDateString()} – ${new Date(item.end_date).toLocaleDateString()}`
                                : item.schedule_date
                                  ? new Date(item.schedule_date).toLocaleDateString()
                                  : ''
                              }
                              {item.schedule_time && <><Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />{item.schedule_time}</>}
                            </div>
                          )}
                          {/* Completed info */}
                          {item.completed_at && (
                            <div className="flex items-center gap-1.5 mt-1.5 text-[10px] sm:text-xs text-green-700 bg-green-50 rounded-md px-2 py-1 w-fit">
                              <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                              Completed {new Date(item.completed_at).toLocaleDateString()} by {item.completed_by ? (completedByNames[item.completed_by] || 'Teacher') : '—'}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout sidebarItems={parentSidebarItems} roleColor="parent">
      {loadingData ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-4 sm:space-y-6 animate-fade-in px-1 sm:px-0">
          <BackButton to="/parent" />
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /> Syllabus
            </h1>
            <p className="text-sm text-muted-foreground">{childName ? `${childName}'s` : "Your child's"} curriculum & topics</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-full text-xs h-8 sm:h-9">
                <Filter className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedExam} onValueChange={setSelectedExam}>
              <SelectTrigger className="w-full text-xs h-8 sm:h-9">
                <SelectValue placeholder="All Exams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exams</SelectItem>
                {examOptions.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 h-9 sm:h-10">
              <TabsTrigger value="present" className="flex items-center gap-1 text-[11px] sm:text-sm px-1 sm:px-3">
                <PlayCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="truncate">Current ({presentItems.length})</span>
              </TabsTrigger>
              <TabsTrigger value="previous" className="flex items-center gap-1 text-[11px] sm:text-sm px-1 sm:px-3">
                <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="truncate">Completed ({previousItems.length})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="present" className="mt-3 sm:mt-4">
              <SyllabusGrouped items={presentItems} emptyMsg="No current or upcoming syllabus topics." />
            </TabsContent>
            <TabsContent value="previous" className="mt-3 sm:mt-4">
              <SyllabusGrouped items={previousItems} emptyMsg="No completed syllabus topics yet." />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </DashboardLayout>
  );
}
