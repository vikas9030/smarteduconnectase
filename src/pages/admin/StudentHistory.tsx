import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useAdminSidebar } from '@/hooks/useAdminSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BackButton } from '@/components/ui/back-button';
import { Loader2, History, Search, Calendar, FileText, CreditCard } from 'lucide-react';
import { format } from 'date-fns';

interface StudentItem {
  id: string;
  full_name: string;
  admission_number: string;
  status: string | null;
  class_id: string | null;
  classes?: { name: string; section: string } | null;
}

export default function StudentHistory() {
  const adminSidebarItems = useAdminSidebar();
  const { user, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [attendance, setAttendance] = useState<any[]>([]);
  const [examMarks, setExamMarks] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || (userRole !== 'admin' && userRole !== 'super_admin'))) {
      navigate('/auth');
    }
  }, [user, userRole, authLoading, navigate]);

  useEffect(() => {
    if (search.length < 2) { setStudents([]); return; }
    const timer = setTimeout(async () => {
      setLoadingStudents(true);
      const { data } = await supabase
        .from('students')
        .select('id, full_name, admission_number, status, class_id, classes(name, section)')
        .or(`full_name.ilike.%${search}%,admission_number.ilike.%${search}%`)
        .order('full_name')
        .limit(20);
      setStudents((data as any) || []);
      setLoadingStudents(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const selectStudent = async (student: StudentItem) => {
    setSelectedStudent(student);
    setSearch('');
    setStudents([]);
    setLoadingData(true);

    const [attRes, marksRes, feesRes] = await Promise.all([
      supabase
        .from('attendance')
        .select('*')
        .eq('student_id', student.id)
        .order('date', { ascending: false })
        .limit(500),
      supabase
        .from('exam_marks')
        .select('*, exams(name, exam_date, max_marks, class_id, classes(name, section), subject_id, subjects(name))')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('fees')
        .select('*')
        .eq('student_id', student.id)
        .order('due_date', { ascending: false }),
    ]);

    setAttendance(attRes.data || []);
    setExamMarks((marksRes.data as any) || []);
    setFees(feesRes.data || []);
    setLoadingData(false);
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} roleColor="admin">
      <div className="space-y-6 animate-fade-in">
        <BackButton to="/admin" />
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            Student History
          </h1>
          <p className="text-muted-foreground mt-1">View complete historical data for any student — attendance, exam marks, and fees across all classes.</p>
        </div>

        {/* Student Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search student by name or admission number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {loadingStudents && <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3"><Loader2 className="h-4 w-4 animate-spin" /> Searching...</div>}
            {students.length > 0 && (
              <div className="mt-2 border rounded-md max-h-60 overflow-y-auto">
                {students.map(s => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                    onClick={() => selectStudent(s)}
                  >
                    <div>
                      <p className="font-medium text-sm">{s.full_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{s.admission_number}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.classes && <Badge variant="outline" className="text-xs">{s.classes.name}-{s.classes.section}</Badge>}
                      <Badge variant={s.status === 'active' ? 'default' : 'secondary'} className="text-xs">{s.status || 'active'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Student Data */}
        {selectedStudent && (
          <>
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-lg">{selectedStudent.full_name}</p>
                    <p className="text-sm text-muted-foreground font-mono">{selectedStudent.admission_number}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedStudent.classes && <Badge variant="outline">{selectedStudent.classes.name}-{selectedStudent.classes.section}</Badge>}
                    <Badge variant={selectedStudent.status === 'active' ? 'default' : 'secondary'}>{selectedStudent.status || 'active'}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {loadingData ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
              <Tabs defaultValue="attendance">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="attendance" className="flex items-center gap-1"><Calendar className="h-4 w-4" /> Attendance ({attendance.length})</TabsTrigger>
                  <TabsTrigger value="marks" className="flex items-center gap-1"><FileText className="h-4 w-4" /> Marks ({examMarks.length})</TabsTrigger>
                  <TabsTrigger value="fees" className="flex items-center gap-1"><CreditCard className="h-4 w-4" /> Fees ({fees.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="attendance">
                  <Card>
                    <CardContent className="pt-6">
                      {attendance.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No attendance records found</p>
                      ) : (
                        <div className="overflow-auto max-h-[500px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Session</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Reason</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {attendance.map(a => (
                                <TableRow key={a.id}>
                                  <TableCell className="font-mono text-sm">{format(new Date(a.date), 'dd MMM yyyy')}</TableCell>
                                  <TableCell>{a.session || 'Full Day'}</TableCell>
                                  <TableCell>
                                    <Badge variant={a.status === 'present' ? 'default' : a.status === 'absent' ? 'destructive' : 'secondary'}>
                                      {a.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">{a.reason || '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="marks">
                  <Card>
                    <CardContent className="pt-6">
                      {examMarks.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No exam marks found</p>
                      ) : (
                        <div className="overflow-auto max-h-[500px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Exam</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Class</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Marks</TableHead>
                                <TableHead>Grade</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {examMarks.map(m => (
                                <TableRow key={m.id}>
                                  <TableCell className="font-medium text-sm">{m.exams?.name || '-'}</TableCell>
                                  <TableCell>{m.exams?.subjects?.name || '-'}</TableCell>
                                  <TableCell>
                                    {m.exams?.classes ? (
                                      <Badge variant="outline" className="text-xs">{m.exams.classes.name}-{m.exams.classes.section}</Badge>
                                    ) : '-'}
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">{m.exams?.exam_date ? format(new Date(m.exams.exam_date), 'dd MMM yyyy') : '-'}</TableCell>
                                  <TableCell>
                                    <span className="font-semibold">{m.marks_obtained ?? '-'}</span>
                                    <span className="text-muted-foreground">/{m.exams?.max_marks || '-'}</span>
                                  </TableCell>
                                  <TableCell>{m.grade || '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="fees">
                  <Card>
                    <CardContent className="pt-6">
                      {fees.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No fee records found</p>
                      ) : (
                        <div className="overflow-auto max-h-[500px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Fee Type</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Discount</TableHead>
                                <TableHead>Paid</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {fees.map(f => (
                                <TableRow key={f.id}>
                                  <TableCell className="font-medium text-sm">{f.fee_type}</TableCell>
                                  <TableCell>₹{Number(f.amount).toLocaleString()}</TableCell>
                                  <TableCell>{f.discount ? `₹${Number(f.discount).toLocaleString()}` : '-'}</TableCell>
                                  <TableCell>₹{Number(f.paid_amount || 0).toLocaleString()}</TableCell>
                                  <TableCell className="font-mono text-sm">{format(new Date(f.due_date), 'dd MMM yyyy')}</TableCell>
                                  <TableCell>
                                    <Badge variant={f.payment_status === 'paid' ? 'default' : f.payment_status === 'partial' ? 'secondary' : 'destructive'}>
                                      {f.payment_status || 'unpaid'}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
