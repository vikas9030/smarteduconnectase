import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { parentSidebarItems } from '@/config/parentSidebar';
import { BackButton } from '@/components/ui/back-button';
import { Loader2, BookOpen, Filter, PlayCircle, History, Calendar, Clock, FlaskConical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [activeTab, setActiveTab] = useState('present');

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

            if (syllabusData) setSyllabus(syllabusData as unknown as SyllabusItem[]);
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

  const today = new Date().toISOString().split('T')[0];

  const { presentItems, previousItems } = useMemo(() => {
    let result = syllabus;
    if (selectedSubject !== 'all') result = result.filter(s => s.subjects?.name === selectedSubject);

    const present: SyllabusItem[] = [];
    const previous: SyllabusItem[] = [];

    result.forEach(item => {
      if (item.end_date && item.end_date < today) {
        previous.push(item);
      } else {
        present.push(item);
      }
    });

    return { presentItems: present, previousItems: previous };
  }, [syllabus, selectedSubject, today]);

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
      <div className="space-y-4">
        {Object.entries(grouped).map(([subject, items]) => (
          <Card key={subject}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                {subject}
                <Badge variant="secondary" className="ml-auto">{items.length} topics</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.chapter_name}</p>
                      <p className="text-xs text-muted-foreground">{item.topic_name}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {item.syllabus_type === 'competitive' && (
                          <Badge className="text-[10px] bg-accent/20 text-accent-foreground">
                            <FlaskConical className="h-3 w-3 mr-0.5" />Competitive
                          </Badge>
                        )}
                        {item.exam_type && <Badge variant="outline" className="text-[10px]">{item.exam_type}</Badge>}
                        {item.week_number && <Badge variant="outline" className="text-[10px]">Week {item.week_number}</Badge>}
                      </div>
                      {(item.start_date || item.schedule_date) && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3" />
                          {item.start_date && item.end_date
                            ? `${new Date(item.start_date).toLocaleDateString()} – ${new Date(item.end_date).toLocaleDateString()}`
                            : item.schedule_date
                              ? new Date(item.schedule_date).toLocaleDateString()
                              : ''
                          }
                          {item.schedule_time && <><Clock className="h-3 w-3 ml-1" />{item.schedule_time}</>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout sidebarItems={parentSidebarItems} roleColor="parent">
      {loadingData ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          <BackButton to="/parent" />
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" /> Syllabus
            </h1>
            <p className="text-muted-foreground">{childName ? `${childName}'s` : "Your child's"} curriculum & topics</p>
          </div>

          {subjects.length > 1 && (
            <div className="flex flex-wrap gap-3">
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-1" />
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="present" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <PlayCircle className="h-4 w-4" />
                Current / Upcoming ({presentItems.length})
              </TabsTrigger>
              <TabsTrigger value="previous" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <History className="h-4 w-4" />
                Completed ({previousItems.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="present" className="mt-4">
              <SyllabusGrouped items={presentItems} emptyMsg="No current or upcoming syllabus topics." />
            </TabsContent>
            <TabsContent value="previous" className="mt-4">
              <SyllabusGrouped items={previousItems} emptyMsg="No completed syllabus topics yet." />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </DashboardLayout>
  );
}
