import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Loader2, Calendar, FileText } from 'lucide-react';
import { parentSidebarItems } from '@/config/parentSidebar';
import StudentProgressView from '@/components/exams/StudentProgressView';
import ExamScheduleView from '@/components/exams/ExamScheduleView';
import { BackButton } from '@/components/ui/back-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ExamMark {
  id: string;
  marks_obtained: number | null;
  grade: string | null;
  remarks: string | null;
  exams: {
    name: string;
    exam_date: string | null;
    max_marks: number | null;
    subjects: { name: string } | null;
  } | null;
}

export default function ParentExams() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [marks, setMarks] = useState<ExamMark[]>([]);
  const [childName, setChildName] = useState('');
  const [childClassIds, setChildClassIds] = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedExam, setSelectedExam] = useState('all');
  const [activeTab, setActiveTab] = useState('schedule');

  useEffect(() => {
    if (!loading && (!user || userRole !== 'parent')) {
      navigate('/auth');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    async function fetchMarks() {
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
          const studentId = links[0].student_id;
          const student = (links[0] as any).students;
          setChildName(student?.full_name || '');
          
          // Collect class IDs for schedule filtering
          const classIds = links
            .map((l: any) => l.students?.class_id)
            .filter(Boolean) as string[];
          setChildClassIds(classIds);

          const { data: marksData } = await supabase
            .from('exam_marks')
            .select('*, exams(name, exam_date, max_marks, subjects(name))')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });

          if (marksData) setMarks(marksData as ExamMark[]);
        }
      }
      setLoadingData(false);
    }
    fetchMarks();
  }, [user]);

  const examNames = useMemo(() => 
    [...new Set(marks.map(m => m.exams?.name).filter(Boolean))] as string[],
    [marks]
  );

  const filteredMarks = useMemo(() => {
    if (selectedExam === 'all') return marks;
    return marks.filter(m => m.exams?.name === selectedExam);
  }, [marks, selectedExam]);

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
        <BackButton to="/parent" />
        <div>
          <h1 className="font-display text-2xl font-bold">Exams</h1>
          <p className="text-muted-foreground">{childName}'s exam schedule & results</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="schedule" className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="mt-4">
            <ExamScheduleView filterClassIds={childClassIds} />
          </TabsContent>

          <TabsContent value="results" className="mt-4 space-y-4">
            {examNames.length > 1 && (
              <div className="flex justify-end">
                <Select value={selectedExam} onValueChange={setSelectedExam}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by Exam" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Exams</SelectItem>
                    {examNames.map(name => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <StudentProgressView marks={filteredMarks} studentName={childName} showAnalytics={true} />
          </TabsContent>
        </Tabs>
      </div>
      )}
    </DashboardLayout>
  );
}
