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
  Trash2,
} from 'lucide-react';
import { BackButton } from '@/components/ui/back-button';

// Sidebar items from shared config with permission check
import { useTeacherSidebar } from '@/hooks/useTeacherSidebar';

interface Homework {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  class_id: string;
  subject_id: string | null;
  created_at: string;
  classes?: { name: string; section: string };
  subjects?: { name: string };
}

interface ClassOption {
  id: string;
  name: string;
  section: string;
}

interface Subject {
  id: string;
  name: string;
}

export default function TeacherHomework() {
  const teacherSidebarItems = useTeacherSidebar();
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [homework, setHomework] = useState<Homework[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: format(new Date(), 'yyyy-MM-dd'),
    class_id: '',
    subject_id: '',
  });
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

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

            if (classData) {
              setClasses(classData);
            }

            // Fetch homework for these classes
            const { data: homeworkData } = await supabase
              .from('homework')
              .select('*, classes(name, section), subjects(name)')
              .in('class_id', allClassIds)
              .order('due_date', { ascending: false });

            if (homeworkData) {
              setHomework(homeworkData);
            }
          }
        }

        // Fetch subjects
        const { data: subjectData } = await supabase.from('subjects').select('id, name');
        if (subjectData) setSubjects(subjectData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoadingData(false);
      }
    }

    fetchData();
  }, [user]);

  const handleSubmit = async () => {
    if (!formData.title || !formData.class_id || !formData.due_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setUploading(true);
      let attachment_url: string | null = null;

      if (attachmentFile) {
        const fileExt = attachmentFile.name.split('.').pop();
        const filePath = `homework/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(filePath, attachmentFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(filePath);
        attachment_url = urlData.publicUrl;
      }

      const { error } = await supabase.from('homework').insert({
        title: formData.title,
        description: formData.description || null,
        due_date: formData.due_date,
        class_id: formData.class_id,
        subject_id: formData.subject_id || null,
        created_by: teacherId,
        attachment_url,
      });

      if (error) throw error;

      toast.success('Homework assigned successfully');
      setDialogOpen(false);
      setFormData({ title: '', description: '', due_date: format(new Date(), 'yyyy-MM-dd'), class_id: '', subject_id: '' });
      setAttachmentFile(null);
      
      // Refresh homework list
      const classIds = classes.map(c => c.id);
      const { data: homeworkData } = await supabase
        .from('homework')
        .select('*, classes(name, section), subjects(name)')
        .in('class_id', classIds)
        .order('due_date', { ascending: false });
      if (homeworkData) setHomework(homeworkData);
    } catch (error) {
      console.error('Error creating homework:', error);
      toast.error('Failed to assign homework');
    } finally {
      setUploading(false);
    }
  };

  const deleteHomework = async (id: string) => {
    try {
      const { error } = await supabase.from('homework').delete().eq('id', id);
      if (error) throw error;
      setHomework(homework.filter(h => h.id !== id));
      toast.success('Homework deleted');
    } catch (error) {
      toast.error('Failed to delete homework');
    }
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
        <BackButton to="/teacher" />
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">Homework</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Assign Homework
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Homework</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Homework title"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Homework description..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Class *</Label>
                    <Select value={formData.class_id} onValueChange={(v) => setFormData({ ...formData, class_id: v })}>
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
                    <Label>Subject</Label>
                    <Select value={formData.subject_id} onValueChange={(v) => setFormData({ ...formData, subject_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id}>
                            {sub.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Due Date *</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Attachment (optional)</Label>
                  <Input
                    type="file"
                    onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full" disabled={uploading}>
                  {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</> : 'Assign Homework'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loadingData ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : homework.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No homework assigned yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {homework.map((hw) => (
              <Card key={hw.id} className="card-elevated">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{hw.title}</h3>
                        {hw.subjects && <Badge variant="secondary">{hw.subjects.name}</Badge>}
                      </div>
                      {hw.description && (
                        <p className="text-sm text-muted-foreground mb-2">{hw.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <GraduationCap className="h-4 w-4" />
                          {hw.classes?.name} - {hw.classes?.section}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Due: {format(new Date(hw.due_date), 'PPP')}
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteHomework(hw.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
