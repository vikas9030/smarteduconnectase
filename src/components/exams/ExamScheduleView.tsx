import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, FileText, Loader2 } from 'lucide-react';

interface Exam {
  id: string;
  name: string;
  max_marks: number | null;
  exam_date: string | null;
  exam_time: string | null;
  class_id: string | null;
  subject_id: string | null;
  classes?: { name: string; section: string } | null;
  subjects?: { name: string } | null;
}

interface ExamScheduleViewProps {
  /** Optional: filter exams to specific class IDs (e.g. parent's child class) */
  filterClassIds?: string[];
}

export default function ExamScheduleView({ filterClassIds }: ExamScheduleViewProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExamName, setSelectedExamName] = useState('all');

  useEffect(() => {
    async function fetchExams() {
      setLoading(true);
      const { data } = await supabase
        .from('exams')
        .select('*, classes(name, section), subjects(name)')
        .order('exam_date', { ascending: true });

      if (data) {
        let filtered = data as Exam[];
        if (filterClassIds && filterClassIds.length > 0) {
          filtered = filtered.filter(e => e.class_id && filterClassIds.includes(e.class_id));
        }
        setExams(filtered);
      }
      setLoading(false);
    }
    fetchExams();
  }, [filterClassIds]);

  const examNames = useMemo(
    () => [...new Set(exams.map(e => e.name))],
    [exams]
  );

  const filteredExams = useMemo(() => {
    if (selectedExamName === 'all') return exams;
    return exams.filter(e => e.name === selectedExamName);
  }, [exams, selectedExamName]);

  const groupedExams = useMemo(() => {
    return filteredExams.reduce((acc, exam) => {
      if (!acc[exam.name]) acc[exam.name] = [];
      acc[exam.name].push(exam);
      return acc;
    }, {} as Record<string, Exam[]>);
  }, [filteredExams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (exams.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No exam schedule available</p>
          <p className="text-sm">Exam schedules will appear here once created by admin.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {examNames.length > 1 && (
        <div className="flex justify-end">
          <Select value={selectedExamName} onValueChange={setSelectedExamName}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by exam" />
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

      {Object.entries(groupedExams).map(([examName, examList]) => (
        <Card key={examName} className="card-elevated overflow-hidden">
          <CardHeader className="pb-3 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display text-lg">{examName}</CardTitle>
                <CardDescription>
                  {examList.length} subject(s) • {new Set(examList.map(e => e.class_id)).size} class(es)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {examList.map(exam => (
                <div key={exam.id} className="px-4 py-3 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {exam.classes ? `${exam.classes.name}-${exam.classes.section.toUpperCase()}` : 'All'}
                    </Badge>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {exam.subjects?.name || 'All Subjects'}
                    </Badge>
                    <Badge variant="outline" className="text-xs ml-auto">
                      Max: {exam.max_marks}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                    {exam.exam_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(exam.exam_date).toLocaleDateString()}
                      </span>
                    )}
                    {exam.exam_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {exam.exam_time}
                      </span>
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
}
