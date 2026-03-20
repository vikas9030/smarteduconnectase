import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useAdminSidebar } from '@/hooks/useAdminSidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { BackButton } from '@/components/ui/back-button';
import { ArrowUpCircle, ArrowRight, Loader2, Users, CheckCircle2, AlertTriangle, History } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Student {
  id: string;
  full_name: string;
  admission_number: string;
  photo_url: string | null;
  status: string | null;
  date_of_birth: string | null;
  blood_group: string | null;
  address: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  emergency_contact: string | null;
  emergency_contact_name: string | null;
  login_id: string | null;
  user_id: string | null;
}

interface ClassItem {
  id: string;
  name: string;
  section: string;
  academic_year: string;
}

export default function StudentPromotion() {
  const adminSidebarItems = useAdminSidebar();
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [fromClass, setFromClass] = useState('');
  const [toClass, setToClass] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<{ promoted: number; retained: number } | null>(null);

  useEffect(() => {
    if (!loading && (!user || (userRole !== 'admin' && userRole !== 'super_admin'))) {
      navigate('/auth');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    supabase.from('classes').select('id, name, section, academic_year').order('name').then(({ data }) => {
      if (data) setClasses(data);
    });
  }, []);

  useEffect(() => {
    if (!fromClass) {
      setStudents([]);
      setSelectedIds(new Set());
      return;
    }
    setLoadingStudents(true);
    supabase
      .from('students')
      .select('id, full_name, admission_number, photo_url, status, date_of_birth, blood_group, address, parent_name, parent_phone, emergency_contact, emergency_contact_name, login_id, user_id')
      .eq('class_id', fromClass)
      .eq('status', 'active')
      .order('full_name')
      .then(({ data }) => {
        const list = data || [];
        setStudents(list);
        setSelectedIds(new Set(list.map(s => s.id)));
        setLoadingStudents(false);
      });
  }, [fromClass]);

  const toggleStudent = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === students.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map(s => s.id)));
    }
  };

  const fromClassData = classes.find(c => c.id === fromClass);
  const toClassData = classes.find(c => c.id === toClass);

  const handlePromote = async () => {
    if (!toClass || selectedIds.size === 0) return;
    setPromoting(true);
    setConfirmOpen(false);

    try {
      const selectedStudents = students.filter(s => selectedIds.has(s.id));
      const retainedStudents = students.filter(s => !selectedIds.has(s.id));
      const targetClass = classes.find(c => c.id === toClass);

      let promotedCount = 0;

      for (const student of selectedStudents) {
        // Extract base name from admission number (e.g., "KALYAN-2-A" → "KALYAN")
        // Supports formats: NAME-CLASS-SECTION, or CLASS/NAME/YEAR, or plain text
        let baseName = student.admission_number;
        // Strip class-section suffix like "-2-A"
        baseName = baseName.replace(/-[^-]+-[^-]+$/, '');
        // Strip class prefix like "5A/"
        baseName = baseName.replace(/^[A-Za-z0-9]+[A-Za-z]\//, '');
        // Strip year suffix like "/2526"
        baseName = baseName.replace(/\/\d{4}$/, '');
        // If nothing useful remains, use full_name
        if (!baseName.trim()) baseName = student.full_name.toUpperCase().replace(/\s+/g, '');

        const newAdmissionNumber = `${baseName}-${targetClass?.name || ''}-${targetClass?.section || ''}`;

        // UPDATE existing student record in-place
        const { error: updateError } = await supabase
          .from('students')
          .update({
            class_id: toClass,
            admission_number: newAdmissionNumber,
            login_id: newAdmissionNumber,
          })
          .eq('id', student.id);

        if (updateError) throw updateError;
        promotedCount++;
      }

      // Mark unselected students as retained
      if (retainedStudents.length > 0) {
        await supabase
          .from('students')
          .update({ status: 'retained' })
          .in('id', retainedStudents.map(s => s.id));
      }

      setResult({ promoted: promotedCount, retained: retainedStudents.length });
      toast.success(`${promotedCount} students promoted successfully`);
      
      setStudents([]);
      setSelectedIds(new Set());
      setFromClass('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to promote students');
    } finally {
      setPromoting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} roleColor="admin">
      <div className="space-y-6 animate-fade-in">
        <BackButton to="/admin" />
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <ArrowUpCircle className="h-6 w-6 text-primary" />
              Student Promotion
            </h1>
            <p className="text-muted-foreground mt-1">Promote students to the next class. The student record is updated in-place — all data (attendance, marks, fees) stays linked.</p>
          </div>
          <Link to="/admin/student-history">
            <Button variant="outline" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              View Student History
            </Button>
          </Link>
        </div>

        {result && (
          <Card className="border-green-500/30 bg-green-50 dark:bg-green-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <div>
                  <p className="font-semibold text-green-800 dark:text-green-300">Promotion Complete!</p>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    {result.promoted} student{result.promoted !== 1 ? 's' : ''} promoted with new records
                    {result.retained > 0 && `, ${result.retained} retained`}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-1">Student records updated with new class, admission number & login ID.</p>
                </div>
              </div>
              <Button variant="outline" className="mt-4" onClick={() => setResult(null)}>
                Promote More Students
              </Button>
            </CardContent>
          </Card>
        )}

        {!result && (
          <>
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="text-lg">Select Classes</CardTitle>
                <CardDescription>Choose the source class and the destination class for promotion</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-full sm:flex-1">
                    <p className="text-sm font-medium mb-2">From Class</p>
                    <Select value={fromClass} onValueChange={(v) => { setFromClass(v); setToClass(''); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name} - {c.section}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0 mt-6 sm:mt-0" />
                  <div className="w-full sm:flex-1">
                    <p className="text-sm font-medium mb-2">To Class</p>
                    <Select value={toClass} onValueChange={setToClass} disabled={!fromClass}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select target class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.filter(c => c.id !== fromClass).map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name} - {c.section}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {fromClass && (
              <Card className="card-elevated">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        Students in {fromClassData?.name} - {fromClassData?.section}
                      </CardTitle>
                      <CardDescription>
                        {selectedIds.size} of {students.length} selected for promotion
                      </CardDescription>
                    </div>
                    {students.length > 0 && (
                      <Button variant="outline" size="sm" onClick={toggleAll}>
                        {selectedIds.size === students.length ? 'Deselect All' : 'Select All'}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingStudents ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : students.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No active students in this class</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {students.map(student => (
                        <div
                          key={student.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedIds.has(student.id) 
                              ? 'bg-primary/5 border-primary/30' 
                              : 'bg-background hover:bg-muted/50'
                          }`}
                          onClick={() => toggleStudent(student.id)}
                        >
                          <Checkbox
                            checked={selectedIds.has(student.id)}
                            onCheckedChange={() => toggleStudent(student.id)}
                          />
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={student.photo_url || ''} />
                            <AvatarFallback className="gradient-primary text-white text-xs">
                              {student.full_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{student.full_name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{student.admission_number}</p>
                          </div>
                          {!selectedIds.has(student.id) && (
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                              Will be retained
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {fromClass && toClass && selectedIds.size > 0 && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold">
                        Ready to promote {selectedIds.size} student{selectedIds.size !== 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        From <strong>{fromClassData?.name} - {fromClassData?.section}</strong> → <strong>{toClassData?.name} - {toClassData?.section}</strong>
                      </p>
                       <p className="text-xs text-muted-foreground mt-1">
                        Student records will be updated in-place with new class, admission number & login ID.
                       </p>
                      {students.length - selectedIds.size > 0 && (
                        <p className="text-sm text-amber-600 mt-1">
                          <AlertTriangle className="h-3 w-3 inline mr-1" />
                          {students.length - selectedIds.size} student{students.length - selectedIds.size !== 1 ? 's' : ''} will be marked as retained
                        </p>
                      )}
                    </div>
                    <Button 
                      size="lg" 
                      onClick={() => setConfirmOpen(true)} 
                      disabled={promoting}
                      className="shrink-0"
                    >
                      {promoting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowUpCircle className="h-4 w-4 mr-2" />}
                      Promote Students
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Student Promotion</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to promote <strong>{selectedIds.size}</strong> student{selectedIds.size !== 1 ? 's' : ''} from{' '}
                <strong>{fromClassData?.name} - {fromClassData?.section}</strong> to{' '}
                <strong>{toClassData?.name} - {toClassData?.section}</strong>.
                <br /><br />
                Student records will be updated in-place. Admission numbers and login IDs will reflect the new class.
                {students.length - selectedIds.size > 0 && (
                  <> {students.length - selectedIds.size} student{students.length - selectedIds.size !== 1 ? 's' : ''} will be marked as retained.</>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handlePromote}>
                Yes, Promote Students
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
