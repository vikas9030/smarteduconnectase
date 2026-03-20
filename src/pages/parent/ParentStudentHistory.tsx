import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useParentSidebar } from '@/hooks/useParentSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BackButton } from '@/components/ui/back-button';
import { Loader2, History, Calendar, FileText, CreditCard } from 'lucide-react';
import { format } from 'date-fns';

interface ChildItem {
  id: string;
  full_name: string;
  admission_number: string;
  status: string | null;
  class_id: string | null;
  classes?: { name: string; section: string } | null;
}

export default function ParentStudentHistory() {
  const parentSidebarItems = useParentSidebar();
  const { user, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [children, setChildren] = useState<ChildItem[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [loadingChildren, setLoadingChildren] = useState(true);

  const [attendance, setAttendance] = useState<any[]>([]);
  const [examMarks, setExamMarks] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || userRole !== 'parent')) {
      navigate('/auth');
    }
  }, [user, userRole, authLoading, navigate]);

  useEffect(() => {
    async function fetchChildren() {
      if (!user) return;
      const { data: parentData } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (parentData) {
        const { data: links } = await supabase
          .from('student_parents')
          .select('student_id')
          .eq('parent_id', parentData.id);

        if (links && links.length > 0) {
          const { data: studentsData } = await supabase
            .from('students')
            .select('id, full_name, admission_number, status, class_id, classes(name, section)')
            .in('id', links.map(l => l.student_id));

          if (studentsData) {
            setChildren(studentsData as any);
            if (studentsData.length === 1) {
              setSelectedChildId(studentsData[0].id);
            }
          }
        }
      }
      setLoadingChildren(false);
    }
    fetchChildren();
  }, [user]);

  useEffect(() => {
    if (!selectedChildId) return;
    setLoadingData(true);

    Promise.all([
      supabase
        .from('attendance')
        .select('*')
        .eq('student_id', selectedChildId)
        .order('date', { ascending: false })
        .limit(500),
      supabase
        .from('exam_marks')
        .select('*, exams(name, exam_date, max_marks, class_id, classes(name, section), subject_id, subjects(name))')
        .eq('student_id', selectedChildId)
        .order('created_at', { ascending: false }),
      supabase
        .from('fees')
        .select('*')
        .eq('student_id', selectedChildId)
        .order('due_date', { ascending: false }),
    ]).then(([attRes, marksRes, feesRes]) => {
      setAttendance(attRes.data || []);
      setExamMarks((marksRes.data as any) || []);
      setFees(feesRes.data || []);
      setLoadingData(false);
    });
  }, [selectedChildId]);

  if (authLoading || loadingChildren) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const selectedChild = children.find(c => c.id === selectedChildId);

  return (
    <DashboardLayout sidebarItems={parentSidebarItems} roleColor="parent">
      <div className="space-y-6 animate-fade-in">
        <BackButton to="/parent" />
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            Student History
          </h1>
          <p className="text-muted-foreground mt-1">View your child's complete historical data — attendance, exam marks, and fees from all classes including previous years.</p>
        </div>

        {/* Child Selector */}
        {children.length > 1 && (
          <Card>
            <CardContent className="pt-6">
              <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your child" />
                </SelectTrigger>
                <SelectContent>
                  {children.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name} ({c.admission_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {selectedChild && (
          <>
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-semibold text-lg">{selectedChild.full_name}</p>
                    <p className="text-sm text-muted-foreground font-mono">{selectedChild.admission_number}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedChild.classes && <Badge variant="outline">{selectedChild.classes.name}-{selectedChild.classes.section}</Badge>}
                    <Badge variant={selectedChild.status === 'active' ? 'default' : 'secondary'}>{selectedChild.status || 'active'}</Badge>
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

        {!selectedChildId && children.length > 1 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Select a child above to view their historical data</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
