import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useAdminSidebar } from '@/hooks/useAdminSidebar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Loader2, Eye, User, Calendar, MapPin, Phone, Heart, AlertCircle, GraduationCap, Plus, Trash2, Upload, Copy, Check } from 'lucide-react';
import AttendanceSummary from '@/components/AttendanceSummary';
import { BackButton } from '@/components/ui/back-button';
import { toast } from 'sonner';

interface Student {
  id: string;
  admission_number: string;
  full_name: string;
  date_of_birth: string | null;
  address: string | null;
  photo_url: string | null;
  status: string;
  class_id: string | null;
  blood_group: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  emergency_contact: string | null;
  emergency_contact_name: string | null;
  classes: { name: string; section: string } | null;
}

interface ClassItem {
  id: string;
  name: string;
  section: string;
}

export default function StudentsManagement() {
  const adminSidebarItems = useAdminSidebar();
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Add student state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [previewId, setPreviewId] = useState('');
  const [createdStudentId, setCreatedStudentId] = useState<string | null>(null);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    password: '',
    date_of_birth: '',
    class_id: '',
    address: '',
    blood_group: '',
    parent_name: '',
    parent_phone: '',
    emergency_contact: '',
    emergency_contact_name: '',
  });

  // Delete student state
  const [deleteStudent, setDeleteStudent] = useState<Student | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!loading && (!user || (userRole !== 'admin' && userRole !== 'super_admin'))) {
      navigate('/auth');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoadingData(true);
    const [studentsRes, classesRes] = await Promise.all([
      supabase.from('students').select('*, classes(name, section)').order('created_at', { ascending: false }),
      supabase.from('classes').select('*').order('name'),
    ]);
    if (studentsRes.data) setStudents(studentsRes.data as Student[]);
    if (classesRes.data) setClasses(classesRes.data);
    setLoadingData(false);
  };

  const openStudentDetails = (student: Student) => {
    setSelectedStudent(student);
    setDetailsOpen(true);
  };

  const generateStudentId = (name: string, className: string, section: string): string => {
    const namePart = name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '');
    const classPart = className.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const sectionPart = section.toUpperCase().replace(/[^A-Z]/g, '');
    return `${namePart}-${classPart}-${sectionPart}`;
  };

  const updatePreviewId = (name: string, classId: string) => {
    if (name && classId) {
      const classData = classes.find(c => c.id === classId);
      if (classData) setPreviewId(generateStudentId(name, classData.name, classData.section));
    } else {
      setPreviewId('');
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) password += chars.charAt(Math.floor(Math.random() * chars.length));
    setFormData({ ...formData, password });
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.class_id) {
      toast.error('Please fill in the required fields (Name and Class)');
      return;
    }
    if (!formData.password || formData.password.length < 4) {
      toast.error('Please set a password (minimum 4 characters) for parent login');
      return;
    }
    setIsSubmitting(true);
    try {
      const selectedClassData = classes.find(c => c.id === formData.class_id);
      if (!selectedClassData) throw new Error('Invalid class');

      const studentId = generateStudentId(formData.full_name, selectedClassData.name, selectedClassData.section);
      let photoUrl = '';
      if (photoFile) {
        const fileName = `students/${Date.now()}_${photoFile.name}`;
        const { error: uploadError } = await supabase.storage.from('photos').upload(fileName, photoFile);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName);
          photoUrl = urlData.publicUrl;
        }
      }

      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-student`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({
            studentId,
            fullName: formData.full_name,
            dateOfBirth: formData.date_of_birth || null,
            classId: formData.class_id,
            address: formData.address || null,
            bloodGroup: formData.blood_group || null,
            parentName: formData.parent_name || null,
            parentPhone: formData.parent_phone || null,
            emergencyContact: formData.emergency_contact || null,
            emergencyContactName: formData.emergency_contact_name || null,
            password: formData.password,
            photoUrl: photoUrl || null,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to create student');

      setCreatedStudentId(studentId);
      setCreatedPassword(formData.password);
      setAddDialogOpen(false);
      setSuccessDialogOpen(true);
      setFormData({ full_name: '', password: '', date_of_birth: '', class_id: '', address: '', blood_group: '', parent_name: '', parent_phone: '', emergency_contact: '', emergency_contact_name: '' });
      setPhotoFile(null);
      setPhotoPreview('');
      setPreviewId('');
      fetchData();
      toast.success('Student and parent account created successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create student');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!deleteStudent) return;
    setIsDeleting(true);
    try {
      await supabase.from('student_parents').delete().eq('student_id', deleteStudent.id);
      const { error } = await supabase.from('students').delete().eq('id', deleteStudent.id);
      if (error) throw error;
      toast.success(`${deleteStudent.full_name} deleted successfully`);
      setDeleteConfirmOpen(false);
      setDeleteStudent(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete student');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const matchesSearch = s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.admission_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = selectedClass === 'all' || s.class_id === selectedClass;
    return matchesSearch && matchesClass;
  });

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} roleColor="admin">
      <div className="space-y-6 animate-fade-in">
        <BackButton to="/admin" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Students Directory</h1>
            <p className="text-muted-foreground">Manage all student records</p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        </div>

        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search students..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} - {c.section}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader><CardTitle className="font-display">All Students ({filteredStudents.length})</CardTitle></CardHeader>
          <CardContent>
            {loadingData ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">{searchQuery ? 'No students found' : 'No students added yet'}</div>
            ) : (
              <>
                {/* Mobile Cards */}
                <div className="space-y-3 sm:hidden">
                  {filteredStudents.map((student) => (
                    <div key={student.id} className="p-3 rounded-xl border bg-muted/10 space-y-2.5" onClick={() => openStudentDetails(student)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarImage src={student.photo_url || ''} />
                            <AvatarFallback className="gradient-primary text-white text-sm">{student.full_name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{student.full_name}</p>
                            <Badge variant="secondary" className="font-mono text-[10px] font-semibold bg-primary/10 text-primary border-primary/20 mt-0.5">
                              {student.admission_number}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge className={`text-[10px] ${student.status === 'active' ? 'status-active' : 'status-inactive'}`}>{student.status}</Badge>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openStudentDetails(student); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteStudent(student); setDeleteConfirmOpen(true); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <GraduationCap className="h-3 w-3 shrink-0" />
                          <span>{student.classes ? `${student.classes.name} - ${student.classes.section}` : 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <User className="h-3 w-3 shrink-0" />
                          <span>{student.parent_name || 'No parent'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="overflow-x-auto hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Admission No</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Parent</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={student.photo_url || ''} />
                                <AvatarFallback className="gradient-primary text-white">{student.full_name[0]}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{student.full_name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{student.admission_number}</TableCell>
                          <TableCell>{student.classes ? `${student.classes.name} - ${student.classes.section}` : 'N/A'}</TableCell>
                          <TableCell>{student.parent_name || 'N/A'}</TableCell>
                          <TableCell><Badge className={student.status === 'active' ? 'status-active' : 'status-inactive'}>{student.status}</Badge></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openStudentDetails(student)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => { setDeleteStudent(student); setDeleteConfirmOpen(true); }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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

        {/* Student Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Student Profile
              </DialogTitle>
            </DialogHeader>
            {selectedStudent && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={selectedStudent.photo_url || ''} />
                    <AvatarFallback className="gradient-primary text-white text-xl">
                      {selectedStudent.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-bold">{selectedStudent.full_name}</h2>
                    <p className="text-muted-foreground font-mono">{selectedStudent.admission_number}</p>
                    {selectedStudent.classes && (
                      <Badge className="mt-1">
                        <GraduationCap className="h-3 w-3 mr-1" />
                        {selectedStudent.classes.name} - {selectedStudent.classes.section}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Personal Information</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Date of Birth</p>
                          <p className="font-medium">{selectedStudent.date_of_birth ? new Date(selectedStudent.date_of_birth).toLocaleDateString() : 'Not specified'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Heart className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Blood Group</p>
                          <p className="font-medium">{selectedStudent.blood_group || 'Not specified'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Address</p>
                          <p className="font-medium">{selectedStudent.address || 'Not specified'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Parent / Guardian</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Parent Name</p>
                          <p className="font-medium">{selectedStudent.parent_name || 'Not specified'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Parent Phone</p>
                          <p className="font-medium">{selectedStudent.parent_phone || 'Not specified'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="md:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        Emergency Contact
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex items-center gap-3 flex-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Contact Name</p>
                            <p className="font-medium">{selectedStudent.emergency_contact_name || 'Not specified'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-1">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Contact Number</p>
                            <p className="font-medium">{selectedStudent.emergency_contact || 'Not specified'}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="md:col-span-2">
                    <CardContent className="p-0">
                      <AttendanceSummary studentId={selectedStudent.id} />
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Add Student Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Student</DialogTitle>
              <DialogDescription>Enter student details. Student ID will be generated automatically.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddStudent} className="space-y-4">
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
                </label>
              </div>

              {previewId && (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-center">
                  <Label className="text-xs text-muted-foreground">Generated Student ID</Label>
                  <p className="font-mono text-lg font-bold text-primary">{previewId}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Full Name *</Label>
                  <Input value={formData.full_name} onChange={(e) => { setFormData({ ...formData, full_name: e.target.value }); updatePreviewId(e.target.value, formData.class_id); }} placeholder="Enter full name" required />
                </div>
                <div>
                  <Label>Class *</Label>
                  <Select value={formData.class_id} onValueChange={(v) => { setFormData({ ...formData, class_id: v }); updatePreviewId(formData.full_name, v); }}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      {classes.map(c => (<SelectItem key={c.id} value={c.id}>{c.name} - {c.section}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date of Birth</Label>
                  <Input type="date" value={formData.date_of_birth} onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label>Parent Login Password *</Label>
                  <div className="flex gap-2">
                    <Input value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Set password for parent login" />
                    <Button type="button" variant="outline" onClick={generatePassword}>Generate</Button>
                  </div>
                </div>
                <div>
                  <Label>Parent Name</Label>
                  <Input value={formData.parent_name} onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })} placeholder="Parent/Guardian name" />
                </div>
                <div>
                  <Label>Parent Phone</Label>
                  <Input value={formData.parent_phone} onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })} placeholder="Parent phone number" />
                </div>
                <div>
                  <Label>Blood Group</Label>
                  <Input value={formData.blood_group} onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })} placeholder="e.g. O+" />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Student address" />
                </div>
                <div>
                  <Label>Emergency Contact Name</Label>
                  <Input value={formData.emergency_contact_name} onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })} />
                </div>
                <div>
                  <Label>Emergency Contact Phone</Label>
                  <Input value={formData.emergency_contact} onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Student
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Success Dialog */}
        <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                Student Created Successfully
              </DialogTitle>
              <DialogDescription>Save these credentials for parent login</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Student ID (Login Username)</p>
                  <p className="font-mono font-bold text-lg">{createdStudentId}</p>
                </div>
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(createdStudentId || '', 'id')}>
                  {copiedField === 'id' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Password</p>
                  <p className="font-mono font-bold text-lg">{createdPassword}</p>
                </div>
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(createdPassword || '', 'pwd')}>
                  {copiedField === 'pwd' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Student</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{deleteStudent?.full_name}</strong>? This will remove the student record and parent link. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteStudent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isDeleting}>
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
