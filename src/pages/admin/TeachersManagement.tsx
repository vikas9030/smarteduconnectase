import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { adminSidebarItems } from '@/config/adminSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Search,
  Mail,
  Phone,
  Loader2,
  MoreHorizontal,
  Edit,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { z } from 'zod';
import { BackButton } from '@/components/ui/back-button';
import { cn } from '@/lib/utils';

const teacherSchema = z.object({
  fullName: z.string().min(2, 'Name is required').max(100),
  email: z.string().email('Valid email required').optional().or(z.literal('')),
  phone: z.string().min(10, 'Valid phone required'),
  qualification: z.string().min(2, 'Qualification is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

interface Teacher {
  id: string;
  teacher_id: string;
  qualification: string;
  subjects: string[];
  joining_date: string;
  status: string;
  user_id: string;
  profiles: {
    full_name: string;
    email: string;
    phone: string;
    photo_url: string;
  } | null;
  assigned_classes?: { id: string; name: string; section: string }[];
}

interface ClassItem {
  id: string;
  name: string;
  section: string;
  class_teacher_id?: string | null;
}

export default function TeachersManagement() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    qualification: '',
    password: '',
    subjects: '',
    classTeacherOf: '',
  });

  const [editFormData, setEditFormData] = useState({
    fullName: '',
    phone: '',
    qualification: '',
    subjects: '',
    status: '',
    newPassword: '',
    classTeacherOf: '',
  });

  useEffect(() => {
    if (!loading && (!user || userRole !== 'admin')) {
      navigate('/auth');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoadingTeachers(true);

    // Fetch teachers
    const { data: teachersData, error: teachersError } = await supabase
      .from('teachers')
      .select('*')
      .order('created_at', { ascending: false });

    if (teachersError) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch teachers' });
      setLoadingTeachers(false);
      return;
    }

    // Fetch classes
    const { data: classesData } = await supabase.from('classes').select('*').order('name');
    if (classesData) setClasses(classesData);

    // Fetch profiles and class assignments
    if (teachersData && teachersData.length > 0) {
      const userIds = teachersData.map(t => t.user_id);
      const teacherIds = teachersData.map(t => t.id);

      const [profilesRes, classTeacherRes, teacherClassesRes] = await Promise.all([
        supabase.from('profiles').select('*').in('user_id', userIds),
        supabase.from('classes').select('id, name, section, class_teacher_id').in('class_teacher_id', teacherIds),
        supabase.from('teacher_classes').select('*, classes(id, name, section)').in('teacher_id', teacherIds),
      ]);

      const teachersWithProfiles = teachersData.map(teacher => {
        const profile = profilesRes.data?.find(p => p.user_id === teacher.user_id);
        const classTeacher = classTeacherRes.data?.filter(c => c.class_teacher_id === teacher.id) || [];
        const assignedClasses = teacherClassesRes.data
          ?.filter(tc => tc.teacher_id === teacher.id)
          .map(tc => tc.classes)
          .filter(Boolean) || [];

        return {
          ...teacher,
          profiles: profile || null,
          assigned_classes: [...classTeacher, ...assignedClasses],
        };
      });

      setTeachers(teachersWithProfiles as Teacher[]);
    } else {
      setTeachers([]);
    }

    setLoadingTeachers(false);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      teacherSchema.parse(formData);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          if (error.path[0]) {
            fieldErrors[error.path[0] as string] = error.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
    }

    setIsSubmitting(true);

    // Upload photo if provided
    let photoUrl = '';
    if (photoFile) {
      const fileName = `teachers/${Date.now()}_${photoFile.name}`;
      const { error: uploadError } = await supabase.storage.from('photos').upload(fileName, photoFile);
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName);
        photoUrl = urlData.publicUrl;
      }
    }

    // Generate email if not provided
    const teacherEmail = formData.email || `${formData.fullName.toLowerCase().replace(/\s+/g, '.')}.${Date.now()}@school.internal`;

    // Create user account via edge function (preserves admin session)
    const { data: sessionData } = await supabase.auth.getSession();
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.session?.access_token}`,
      },
      body: JSON.stringify({
        email: teacherEmail,
        password: formData.password,
        fullName: formData.fullName,
        role: 'teacher',
        phone: formData.phone,
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to create teacher' });
      setIsSubmitting(false);
      return;
    }

    const authData = { user: result.user };

    if (authData.user) {
      // Update profile with photo if provided
      if (photoUrl) {
        await supabase.from('profiles').update({ photo_url: photoUrl }).eq('user_id', authData.user.id);
      }

      // Create teacher record - ID format: NAME-SUBJECT
      const namePart = formData.fullName.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '');
      const subjectPart = formData.subjects ? formData.subjects.split(',')[0].trim().toUpperCase().replace(/[^A-Z]/g, '') : 'GEN';
      const teacherId = `${namePart}-${subjectPart}`;
      const subjects = formData.subjects ? formData.subjects.split(',').map(s => s.trim()) : [];

      const { data: newTeacher, error: teacherError } = await supabase.from('teachers').insert({
        user_id: authData.user.id,
        teacher_id: teacherId,
        qualification: formData.qualification,
        subjects,
        status: 'active',
      }).select().single();

      if (teacherError) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to create teacher record' });
      } else {
        // Assign as class teacher if selected
        if (formData.classTeacherOf && newTeacher) {
          await supabase.from('classes').update({ class_teacher_id: newTeacher.id }).eq('id', formData.classTeacherOf);
        }

        toast({ title: 'Success', description: 'Teacher account created successfully' });
        setDialogOpen(false);
        setFormData({ fullName: '', email: '', phone: '', qualification: '', password: '', subjects: '', classTeacherOf: '' });
        setPhotoFile(null);
        setPhotoPreview('');
        fetchData();
      }
    }

    setIsSubmitting(false);
  };

  const handleDeleteTeacher = async (teacherId: string, userId: string) => {
    // Remove teacher record (profile and role will remain for audit)
    const { error } = await supabase.from('teachers').delete().eq('id', teacherId);
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Deleted', description: 'Teacher removed successfully' });
      fetchData();
    }
  };

  const openEditDialog = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    // Find the class this teacher is class teacher of
    const classTeacherClass = classes.find(c => c.class_teacher_id === teacher.id);
    setEditFormData({
      fullName: teacher.profiles?.full_name || '',
      phone: teacher.profiles?.phone || '',
      qualification: teacher.qualification || '',
      subjects: teacher.subjects?.join(', ') || '',
      status: teacher.status || 'active',
      newPassword: '',
      classTeacherOf: classTeacherClass?.id || '',
    });
    setEditDialogOpen(true);
  };

  const handleEditTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    setIsSubmitting(true);

    try {
      // Update profile
      if (editingTeacher.profiles) {
        await supabase.from('profiles').update({
          full_name: editFormData.fullName,
          phone: editFormData.phone,
        }).eq('user_id', editingTeacher.user_id);
      }

      // Update teacher record
      const subjects = editFormData.subjects ? editFormData.subjects.split(',').map(s => s.trim()) : [];
      await supabase.from('teachers').update({
        qualification: editFormData.qualification,
        subjects,
        status: editFormData.status,
      }).eq('id', editingTeacher.id);

      // Update class teacher assignment
      // First, remove this teacher as class teacher from any class
      await supabase.from('classes').update({ class_teacher_id: null }).eq('class_teacher_id', editingTeacher.id);
      // Then assign to selected class if any
      if (editFormData.classTeacherOf) {
        await supabase.from('classes').update({ class_teacher_id: editingTeacher.id }).eq('id', editFormData.classTeacherOf);
      }

      // Update password if provided (via edge function would be ideal, but for now we notify)
      if (editFormData.newPassword && editFormData.newPassword.length >= 6) {
        toast({ 
          title: 'Note', 
          description: 'Password change requires admin auth. Please use the auth system to reset password.' 
        });
      }

      toast({ title: 'Updated', description: 'Teacher details updated successfully' });
      setEditDialogOpen(false);
      setEditingTeacher(null);
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTeachers = teachers.filter((teacher) =>
    teacher.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.teacher_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} roleColor="admin">
      <div className="space-y-6 animate-fade-in">
        <BackButton to="/admin" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Teachers Management</h1>
            <p className="text-muted-foreground">Manage all teacher accounts and profiles</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-admin"><Plus className="h-4 w-4 mr-2" />Add Teacher</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display">Add New Teacher</DialogTitle>
                <DialogDescription>Create a new teacher account with login credentials</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateTeacher} className="space-y-4">
                {/* Photo Upload */}
                <div className="flex justify-center">
                  <label className="cursor-pointer">
                    <div className="w-24 h-24 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center overflow-hidden hover:border-primary transition-colors">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Upload className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                    <p className="text-xs text-center text-muted-foreground mt-1">Upload Photo</p>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label>Full Name *</Label>
                    <Input placeholder="Enter full name" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} />
                    {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" placeholder="Email address (optional)" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Phone *</Label>
                    <Input placeholder="Phone number" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                    {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Qualification *</Label>
                    <Input placeholder="e.g., M.Ed, B.Sc" value={formData.qualification} onChange={(e) => setFormData({ ...formData, qualification: e.target.value })} />
                    {errors.qualification && <p className="text-sm text-destructive">{errors.qualification}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Password *</Label>
                    <Input type="password" placeholder="Create password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label>Subjects (comma separated)</Label>
                    <Input placeholder="e.g., Math, Science, English" value={formData.subjects} onChange={(e) => setFormData({ ...formData, subjects: e.target.value })} />
                  </div>

                  {/* Live ID Preview */}
                  {(formData.fullName || formData.subjects) && (
                    <div className="col-span-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <Label className="text-xs text-muted-foreground">Generated Teacher ID</Label>
                      <p className="font-mono text-lg font-bold text-primary mt-1">
                        {(() => {
                          const namePart = formData.fullName.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '') || 'NAME';
                          const subjectPart = formData.subjects ? formData.subjects.split(',')[0].trim().toUpperCase().replace(/[^A-Z]/g, '') : 'SUB';
                          return `${namePart}-${subjectPart || 'SUB'}`;
                        })()}
                      </p>
                    </div>
                  )}

                </div>

                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting} className="w-full gradient-admin">
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Teacher
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search teachers by name, ID, or email..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Teachers Table */}
        <Card className="card-elevated">
          <CardHeader><CardTitle className="font-display">All Teachers ({filteredTeachers.length})</CardTitle></CardHeader>
          <CardContent>
            {loadingTeachers ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : filteredTeachers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">{searchQuery ? 'No teachers found matching your search' : 'No teachers added yet'}</div>
            ) : (
              <>
                {/* Mobile Cards */}
                <div className="space-y-3 sm:hidden">
                  {filteredTeachers.map((teacher) => (
                    <div key={teacher.id} className="p-3 rounded-xl border bg-muted/10 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarImage src={teacher.profiles?.photo_url || ''} />
                            <AvatarFallback className="gradient-teacher text-white text-sm">{teacher.profiles?.full_name?.[0] || 'T'}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{teacher.profiles?.full_name || 'N/A'}</p>
                            <Badge variant="secondary" className="font-mono text-[10px] font-semibold bg-primary/10 text-primary border-primary/20 mt-0.5">
                              {teacher.teacher_id}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge className={cn("text-[10px]", teacher.status === 'active' ? 'status-active' : 'status-inactive')}>{teacher.status}</Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(teacher)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteTeacher(teacher.id, teacher.user_id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-1 text-muted-foreground"><Mail className="h-3 w-3 shrink-0" /><span className="break-all">{teacher.profiles?.email || 'N/A'}</span></div>
                        <div className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3 shrink-0" />{teacher.profiles?.phone || 'N/A'}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {teacher.qualification && <Badge variant="outline" className="text-[10px]">{teacher.qualification}</Badge>}
                        {teacher.subjects?.map((sub, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">{sub}</Badge>
                        ))}
                        {teacher.assigned_classes && teacher.assigned_classes.length > 0 && teacher.assigned_classes.map((c, i) => (
                          <Badge key={`class-${i}`} className="text-[10px] bg-primary/10 text-primary">{c.name}-{c.section}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="overflow-x-auto hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Teacher</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Qualification</TableHead>
                        <TableHead>Subjects</TableHead>
                        <TableHead>Class Teacher Of</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTeachers.map((teacher) => (
                        <TableRow key={teacher.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={teacher.profiles?.photo_url || ''} />
                                <AvatarFallback className="gradient-teacher text-white">{teacher.profiles?.full_name?.[0] || 'T'}</AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="font-medium">{teacher.profiles?.full_name || 'N/A'}</span>
                                <Badge variant="secondary" className="w-fit mt-1 font-mono text-xs font-semibold bg-primary/10 text-primary border-primary/20">
                                  {teacher.teacher_id}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-sm"><Mail className="h-3 w-3 text-muted-foreground" />{teacher.profiles?.email || 'N/A'}</div>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground"><Phone className="h-3 w-3" />{teacher.profiles?.phone || 'N/A'}</div>
                            </div>
                          </TableCell>
                          <TableCell>{teacher.qualification || 'N/A'}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {teacher.subjects?.slice(0, 2).map((sub, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{sub}</Badge>
                              ))}
                              {teacher.subjects?.length > 2 && <Badge variant="outline" className="text-xs">+{teacher.subjects.length - 2}</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            {teacher.assigned_classes && teacher.assigned_classes.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {teacher.assigned_classes.slice(0, 2).map((c, i) => (
                                  <Badge key={i} className="text-xs bg-primary/10 text-primary">{c.name}-{c.section}</Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={teacher.status === 'active' ? 'status-active' : 'status-inactive'}>{teacher.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditDialog(teacher)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteTeacher(teacher.id, teacher.user_id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Edit Teacher Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">Edit Teacher</DialogTitle>
              <DialogDescription>Update teacher details and credentials</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditTeacher} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-2">
                  <Label>Full Name</Label>
                  <Input 
                    value={editFormData.fullName} 
                    onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })} 
                    placeholder="Enter full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input 
                    value={editFormData.phone} 
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })} 
                    placeholder="Phone number"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Qualification</Label>
                  <Input 
                    value={editFormData.qualification} 
                    onChange={(e) => setEditFormData({ ...editFormData, qualification: e.target.value })} 
                    placeholder="e.g., M.Ed, B.Sc"
                  />
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <Label>Subjects (comma separated)</Label>
                  <Input 
                    value={editFormData.subjects} 
                    onChange={(e) => setEditFormData({ ...editFormData, subjects: e.target.value })} 
                    placeholder="e.g., Math, Science, English"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editFormData.status} onValueChange={(v) => setEditFormData({ ...editFormData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>New Password (optional)</Label>
                  <Input 
                    type="password"
                    value={editFormData.newPassword} 
                    onChange={(e) => setEditFormData({ ...editFormData, newPassword: e.target.value })} 
                    placeholder="Leave blank to keep current"
                  />
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <Label>Class Teacher Of</Label>
                  <Select value={editFormData.classTeacherOf || "none"} onValueChange={(v) => setEditFormData({ ...editFormData, classTeacherOf: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Select class (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name} - {c.section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="gradient-admin">
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
