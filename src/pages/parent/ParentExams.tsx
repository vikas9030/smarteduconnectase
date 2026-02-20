import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Calendar, FileText, RotateCcw, FlaskConical, Award, BookOpen } from 'lucide-react';
import { parentSidebarItems } from '@/config/parentSidebar';
import StudentProgressView from '@/components/exams/StudentProgressView';
import ExamScheduleView from '@/components/exams/ExamScheduleView';
import WeeklyExamCalendarView from '@/components/exams/WeeklyExamCalendarView';
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

interface WeeklyResult {
  id: string;
  obtained_marks: number;
  total_marks: number;
  percentage: number | null;
  rank: number | null;
  exam_id: string;
  weekly_exams: {
    exam_title: string;
    exam_date: string;
    total_marks: number;
    syllabus_type: string;
    exam_type_label: string | null;
    subjects: { name: string } | null;
    classes: { name: string; section: string } | null;
  } | null;
}

export default function ParentExams() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [marks, setMarks] = useState<ExamMark[]>([]);
  const [weeklyResults, setWeeklyResults] = useState<WeeklyResult[]>([]);
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
          
          const classIds = links
            .map((l: any) => l.students?.class_id)
            .filter(Boolean) as string[];
          setChildClassIds(classIds);

          // Fetch regular exam marks
          const { data: marksData } = await supabase
            .from('exam_marks')
            .select('*, exams(name, exam_date, max_marks, subjects(name))')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });

          if (marksData) setMarks(marksData as ExamMark[]);

          // Fetch weekly/competitive exam results
          const { data: weeklyData } = await supabase
            .from('student_exam_results')
            .select('*, weekly_exams(exam_title, exam_date, total_marks, syllabus_type, exam_type_label, subjects(name), classes(name, section))')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });

          if (weeklyData) setWeeklyResults(weeklyData as unknown as WeeklyResult[]);
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

  // Group weekly results by type
  const competitiveResults = useMemo(() => weeklyResults.filter(r => r.weekly_exams?.syllabus_type === 'competitive'), [weeklyResults]);
  const generalWeeklyResults = useMemo(() => weeklyResults.filter(r => r.weekly_exams?.syllabus_type === 'general'), [weeklyResults]);

  const getPctColor = (pct: number) => {
    if (pct >= 80) return 'text-emerald-600';
    if (pct >= 60) return 'text-blue-600';
    if (pct >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const WeeklyResultsSection = ({ results, title, icon }: { results: WeeklyResult[]; title: string; icon: React.ReactNode }) => {
    if (results.length === 0) {
      return (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>No {title.toLowerCase()} results yet.</p>
          </CardContent>
        </Card>
      );
    }

    const totalObtained = results.reduce((s, r) => s + r.obtained_marks, 0);
    const totalMax = results.reduce((s, r) => s + r.total_marks, 0);
    const overallPct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

    return (
      <div className="space-y-4">
        <Card className="border-primary/20">
          <CardHeader className="pb-3 bg-primary/5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                {icon}
                {title}
              </CardTitle>
              <div className="text-right">
                <p className={`text-2xl font-bold ${getPctColor(overallPct)}`}>{overallPct.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Overall</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            <Progress value={overallPct} className="h-2.5" />
            <p className="text-xs text-muted-foreground mt-2">{results.length} exams • {totalObtained}/{totalMax} marks</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Exam</TableHead>
                  <TableHead className="text-xs">Subject</TableHead>
                  <TableHead className="text-xs text-center">Marks</TableHead>
                  <TableHead className="text-xs text-center">%</TableHead>
                  {results.some(r => r.rank) && <TableHead className="text-xs text-center">Rank</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map(r => {
                  const pct = r.percentage ?? (r.total_marks > 0 ? (r.obtained_marks / r.total_marks) * 100 : 0);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="py-2">
                        <div>
                          <p className="font-medium text-xs">{r.weekly_exams?.exam_title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(r.weekly_exams?.exam_date || '').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            {r.weekly_exams?.exam_type_label && ` • ${r.weekly_exams.exam_type_label}`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize text-xs">{r.weekly_exams?.subjects?.name || '-'}</TableCell>
                      <TableCell className="text-center text-xs">
                        <span className="font-semibold">{r.obtained_marks}</span>
                        <span className="text-muted-foreground">/{r.total_marks}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-semibold text-xs ${getPctColor(pct)}`}>{pct.toFixed(0)}%</span>
                      </TableCell>
                      {results.some(r2 => r2.rank) && (
                        <TableCell className="text-center text-xs font-medium">{r.rank || '-'}</TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
          <h1 className="font-display text-2xl font-bold">Exams</h1>
          <p className="text-muted-foreground">{childName}'s exam schedule & results</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="schedule" className="flex items-center gap-1 text-xs sm:text-sm">
              <Calendar className="h-4 w-4" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="weekly" className="flex items-center gap-1 text-xs sm:text-sm">
              <RotateCcw className="h-4 w-4" />
              Weekly
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-1 text-xs sm:text-sm">
              <FileText className="h-4 w-4" />
              Results
            </TabsTrigger>
            <TabsTrigger value="competitive" className="flex items-center gap-1 text-xs sm:text-sm">
              <FlaskConical className="h-4 w-4" />
              Competitive
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="mt-4">
            <ExamScheduleView filterClassIds={childClassIds} />
          </TabsContent>

          <TabsContent value="weekly" className="mt-4">
            <WeeklyExamCalendarView filterClassIds={childClassIds} />
          </TabsContent>

          <TabsContent value="results" className="mt-4 space-y-4">
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
            <StudentProgressView marks={filteredMarks} studentName={childName} showAnalytics={true} />

            {/* General Weekly Results */}
            {generalWeeklyResults.length > 0 && (
              <WeeklyResultsSection 
                results={generalWeeklyResults} 
                title="Weekly Exam Results" 
                icon={<BookOpen className="h-4 w-4 text-primary" />} 
              />
            )}
          </TabsContent>

          <TabsContent value="competitive" className="mt-4 space-y-4">
            <WeeklyResultsSection 
              results={competitiveResults} 
              title="Competitive Exam Results" 
              icon={<FlaskConical className="h-4 w-4 text-primary" />} 
            />
          </TabsContent>
        </Tabs>
      </div>
      )}
    </DashboardLayout>
  );
}