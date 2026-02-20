import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Bell,
  FileText,
  MessageSquare,
  Clock,
  LayoutDashboard,
  Loader2,
  ClipboardList,
  Plus,
  Eye,
  EyeOff,
} from 'lucide-react';

// Sidebar items from shared config with permission check
import { useTeacherSidebar } from '@/hooks/useTeacherSidebar';

interface Report {
  id: string;
  category: string;
  description: string;
  severity: string | null;
  parent_visible: boolean;
  created_at: string;
  students?: { full_name: string; admission_number: string };
}

interface Student {
  id: string;
  full_name: string;
  admission_number: string;
}

interface ClassOption {
  id: string;
  name: string;
  section: string;
}

export default function TeacherReports() {
  const teacherSidebarItems = useTeacherSidebar();
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState('');
  const [formData, setFormData] = useState({
    student_id: '',
    category: '',
    description: '',
    severity: 'info',
    parent_visible: true,
  });

  useEffect(() => {
    if (!loading && (!user || userRole !== 'teacher')) {
      navigate('/auth');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      
      try {
        const { data: teacher } = await supabase
          .from('teachers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (teacher) {
          setTeacherId(teacher.id);
          
          // Get classes from teacher_classes table
          const { data: teacherClasses } = await supabase
            .from('teacher_classes')
            .select('class_id')
            .eq('teacher_id', teacher.id);

          const teacherClassIds = teacherClasses?.map(tc => tc.class_id) || [];

          // Also get classes where this teacher is the class_teacher
          const { data: classTeacherClasses } = await supabase
            .from('classes')
            .select('id')
            .eq('class_teacher_id', teacher.id);

          const classTeacherIds = classTeacherClasses?.map(c => c.id) || [];

          // Combine and deduplicate class IDs
          const allClassIds = [...new Set([...teacherClassIds, ...classTeacherIds])];

          if (allClassIds.length > 0) {
            const { data: classData } = await supabase
              .from('classes')
              .select('id, name, section')
              .in('id', allClassIds);
            if (classData) setClasses(classData);

            // Fetch students from these classes
            const { data: studentData } = await supabase
              .from('students')
              .select('id, full_name, admission_number')
              .in('class_id', allClassIds);
            
            if (studentData) {
              // Fetch reports for these students
              const { data: reportData } = await supabase
                .from('student_reports')
                .select('*, students(full_name, admission_number)')
                .in('student_id', studentData.map(s => s.id))
                .order('created_at', { ascending: false });
              if (reportData) setReports(reportData);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoadingData(false);
      }
    }

    fetchData();
  }, [user]);

  useEffect(() => {
    async function fetchStudents() {
      if (!selectedClass) {
        setStudents([]);
        return;
      }
      
      const { data } = await supabase
        .from('students')
        .select('id, full_name, admission_number')
        .eq('class_id', selectedClass)
        .order('full_name');
      
      if (data) setStudents(data);
    }

    fetchStudents();
  }, [selectedClass]);

  const handleSubmit = async () => {
    if (!formData.student_id || !formData.category || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase.from('student_reports').insert({
        student_id: formData.student_id,
        category: formData.category,
        description: formData.description,
        severity: formData.severity,
        parent_visible: formData.parent_visible,
        created_by: teacherId,
      });

      if (error) throw error;

      toast.success('Report created successfully');
      setDialogOpen(false);
      setFormData({ student_id: '', category: '', description: '', severity: 'info', parent_visible: true });
      setSelectedClass('');
      
      // Refresh reports
      window.location.reload();
    } catch (error) {
      console.error('Error creating report:', error);
      toast.error('Failed to create report');
    }
  };

  const severityColors = {
    info: 'bg-blue-100 text-blue-700',
    warning: 'bg-yellow-100 text-yellow-700',
    critical: 'bg-red-100 text-red-700',
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout sidebarItems={teacherSidebarItems} roleColor="teacher">
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">Student Reports</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Report
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Student Report</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Class *</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name} - {cls.section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Student *</Label>
                  <Select 
                    value={formData.student_id} 
                    onValueChange={(v) => setFormData({ ...formData, student_id: v })}
                    disabled={!selectedClass}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.full_name} ({student.admission_number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category *</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="academic">Academic</SelectItem>
                        <SelectItem value="behavior">Behavior</SelectItem>
                        <SelectItem value="attendance">Attendance</SelectItem>
                        <SelectItem value="health">Health</SelectItem>
                        <SelectItem value="achievement">Achievement</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Severity</Label>
                    <Select value={formData.severity} onValueChange={(v) => setFormData({ ...formData, severity: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Description *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the report..."
                    rows={4}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Visible to Parents</Label>
                  <Switch
                    checked={formData.parent_visible}
                    onCheckedChange={(checked) => setFormData({ ...formData, parent_visible: checked })}
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full">
                  Create Report
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loadingData ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : reports.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No reports created yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <Card key={report.id} className="card-elevated">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{report.students?.full_name}</h3>
                        <Badge variant="outline">{report.category}</Badge>
                        {report.severity && (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityColors[report.severity as keyof typeof severityColors]}`}>
                            {report.severity}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{report.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{format(new Date(report.created_at), 'PPP')}</span>
                        <span className="flex items-center gap-1">
                          {report.parent_visible ? (
                            <><Eye className="h-3 w-3" /> Visible to parents</>
                          ) : (
                            <><EyeOff className="h-3 w-3" /> Hidden from parents</>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
