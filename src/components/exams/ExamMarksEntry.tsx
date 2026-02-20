import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Save, CheckCircle2, BookOpen, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Exam {
  id: string;
  name: string;
  max_marks: number;
  class_id: string;
  subject_id: string | null;
  exam_date: string | null;
  classes?: { name: string; section: string };
  subjects?: { name: string };
}

interface Student {
  id: string;
  full_name: string;
  admission_number: string;
  photo_url: string | null;
}

interface Props {
  exams: Exam[];
  onMarksUpdated?: () => void;
}

export default function ExamMarksEntry({ exams, onMarksUpdated }: Props) {
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [selectedExamName, setSelectedExamName] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Record<string, { marks: string; grade: string; remarks: string }>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Get unique exam names
  const examNames = [...new Set(exams.map(e => e.name))];

  // Filter exams by selected name
  const filteredExams = selectedExamName 
    ? exams.filter(e => e.name === selectedExamName)
    : exams;

  const loadStudentsAndMarks = async (exam: Exam) => {
    setLoading(true);
    setSelectedExam(exam);
    
    try {
      // Fetch students in this class
      const { data: studentData } = await supabase
        .from('students')
        .select('id, full_name, admission_number, photo_url')
        .eq('class_id', exam.class_id)
        .order('full_name');

      if (studentData) {
        setStudents(studentData);
        
        // Fetch existing marks
        const { data: marksData } = await supabase
          .from('exam_marks')
          .select('student_id, marks_obtained, grade, remarks')
          .eq('exam_id', exam.id);

        const marksMap: Record<string, { marks: string; grade: string; remarks: string }> = {};
        if (marksData) {
          marksData.forEach(m => {
            marksMap[m.student_id] = {
              marks: m.marks_obtained?.toString() || '',
              grade: m.grade || '',
              remarks: m.remarks || ''
            };
          });
        }
        studentData.forEach(s => {
          if (!marksMap[s.id]) {
            marksMap[s.id] = { marks: '', grade: '', remarks: '' };
          }
        });
        setMarks(marksMap);
      }
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const updateMark = (studentId: string, field: 'marks' | 'grade' | 'remarks', value: string) => {
    setMarks(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value }
    }));
  };

  const autoCalculateGrade = (studentId: string, marksValue: string) => {
    if (!selectedExam || !marksValue) return;
    
    const numMarks = parseFloat(marksValue);
    const maxMarks = selectedExam.max_marks || 100;
    const percentage = (numMarks / maxMarks) * 100;
    
    let grade = '';
    if (percentage >= 90) grade = 'A+';
    else if (percentage >= 80) grade = 'A';
    else if (percentage >= 70) grade = 'B+';
    else if (percentage >= 60) grade = 'B';
    else if (percentage >= 50) grade = 'C+';
    else if (percentage >= 40) grade = 'C';
    else if (percentage >= 33) grade = 'D';
    else grade = 'F';
    
    setMarks(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], marks: marksValue, grade }
    }));
  };

  const saveMarks = async () => {
    if (!selectedExam) return;
    
    setSaving(true);
    try {
      // Delete existing marks for this exam
      await supabase.from('exam_marks').delete().eq('exam_id', selectedExam.id);

      // Insert new marks
      const records = students
        .filter(s => marks[s.id]?.marks)
        .map(student => ({
          exam_id: selectedExam.id,
          student_id: student.id,
          marks_obtained: parseFloat(marks[student.id].marks) || null,
          grade: marks[student.id].grade || null,
          remarks: marks[student.id].remarks || null,
        }));

      if (records.length > 0) {
        const { error } = await supabase.from('exam_marks').insert(records);
        if (error) throw error;
      }

      toast.success(`Saved marks for ${records.length} students`);
      onMarksUpdated?.();
    } catch (error: any) {
      console.error('Error saving marks:', error);
      toast.error(error.message || 'Failed to save marks');
    } finally {
      setSaving(false);
    }
  };

  const getFilledCount = () => {
    return Object.values(marks).filter(m => m.marks).length;
  };

  return (
    <div className="space-y-4">
      {/* Exam Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Select Exam to Enter Marks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Exam Name Filter */}
          {examNames.length > 1 && (
            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Exam</label>
              <Select value={selectedExamName || 'all'} onValueChange={(v) => setSelectedExamName(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-full md:w-[250px]">
                  <SelectValue placeholder="All Exams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Exams</SelectItem>
                  {examNames.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {filteredExams.length === 0 ? (
            <p className="text-muted-foreground text-sm">No exams found. Please ask admin to create exams for your classes.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {filteredExams.map((exam) => (
                <Button
                  key={exam.id}
                  variant={selectedExam?.id === exam.id ? 'default' : 'outline'}
                  className="h-auto py-3 flex flex-col items-start text-left"
                  onClick={() => loadStudentsAndMarks(exam)}
                >
                  <span className="font-medium text-xs truncate w-full">
                    {exam.classes?.name}-{exam.classes?.section.toUpperCase()}
                  </span>
                  <span className="text-xs opacity-80 truncate w-full capitalize">
                    {exam.subjects?.name || 'All Subjects'}
                  </span>
                  {!selectedExamName && (
                    <span className="text-[10px] opacity-60 truncate w-full">{exam.name}</span>
                  )}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Marks Entry Table */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {selectedExam && !loading && (
        <Card>
          <CardHeader className="pb-3 px-3 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-sm sm:text-base flex flex-wrap items-center gap-1.5">
                <Users className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="truncate">{selectedExam.name} - {selectedExam.classes?.name}-{selectedExam.classes?.section.toUpperCase()}</span>
                {selectedExam.subjects && (
                  <Badge variant="secondary" className="capitalize text-xs">
                    {selectedExam.subjects.name}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Badge variant="outline" className="text-xs">
                  {getFilledCount()}/{students.length} filled
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Max: {selectedExam.max_marks}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px] text-xs sm:text-sm">Student</TableHead>
                    <TableHead className="w-[80px] text-xs sm:text-sm">Marks</TableHead>
                    <TableHead className="w-[65px] text-xs sm:text-sm">Grade</TableHead>
                    <TableHead className="hidden sm:table-cell text-xs sm:text-sm">Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7 flex-shrink-0">
                            <AvatarImage src={student.photo_url || ''} />
                            <AvatarFallback className="text-[10px]">
                              {student.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-xs sm:text-sm truncate">{student.full_name}</p>
                            <p className="text-[10px] text-muted-foreground">{student.admission_number}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <Input
                          type="number"
                          value={marks[student.id]?.marks || ''}
                          onChange={(e) => autoCalculateGrade(student.id, e.target.value)}
                          placeholder="0"
                          max={selectedExam.max_marks}
                          min={0}
                          className="h-8 w-16 sm:w-20 text-sm"
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <Select
                          value={marks[student.id]?.grade || 'none'}
                          onValueChange={(v) => updateMark(student.id, 'grade', v === 'none' ? '' : v)}
                        >
                          <SelectTrigger className="h-8 w-14 sm:w-16 text-xs">
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-</SelectItem>
                            <SelectItem value="A+">A+</SelectItem>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B+">B+</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="C+">C+</SelectItem>
                            <SelectItem value="C">C</SelectItem>
                            <SelectItem value="D">D</SelectItem>
                            <SelectItem value="F">F</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell py-2">
                        <Input
                          value={marks[student.id]?.remarks || ''}
                          onChange={(e) => updateMark(student.id, 'remarks', e.target.value)}
                          placeholder="Optional remarks"
                          className="h-8"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Grades auto-calculate based on marks
              </div>
              <Button onClick={saveMarks} disabled={saving} className="w-full sm:w-auto">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save All Marks
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
