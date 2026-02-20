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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, Clock, Eye, EyeOff, Trash2, Plus, Settings, Coffee, User, FileText, Table } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { downloadTimetableAsCSV, downloadTimetableAsPDF } from '@/utils/timetableDownload';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface PeriodConfig {
  number: number;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  breakName: string;
}

const DEFAULT_SCHEDULE: PeriodConfig[] = [
  { number: 1, startTime: '08:00', endTime: '08:45', isBreak: false, breakName: '' },
  { number: 2, startTime: '08:45', endTime: '09:30', isBreak: false, breakName: '' },
  { number: 0, startTime: '09:30', endTime: '09:45', isBreak: true, breakName: 'Short Break' },
  { number: 3, startTime: '09:45', endTime: '10:30', isBreak: false, breakName: '' },
  { number: 4, startTime: '10:30', endTime: '11:15', isBreak: false, breakName: '' },
  { number: 0, startTime: '11:15', endTime: '11:30', isBreak: true, breakName: 'Short Break' },
  { number: 5, startTime: '11:30', endTime: '12:15', isBreak: false, breakName: '' },
  { number: 6, startTime: '12:15', endTime: '13:00', isBreak: false, breakName: '' },
  { number: 0, startTime: '13:00', endTime: '14:00', isBreak: true, breakName: 'Lunch Break' },
  { number: 7, startTime: '14:00', endTime: '14:45', isBreak: false, breakName: '' },
  { number: 8, startTime: '14:45', endTime: '15:30', isBreak: false, breakName: '' },
];

interface TimetableEntry {
  id: string;
  class_id: string;
  subject_id: string | null;
  teacher_id: string | null;
  day_of_week: string;
  period_number: number;
  start_time: string;
  end_time: string;
  is_published: boolean;
  subjects?: { name: string } | null;
  teacherName?: string;
}

interface Subject {
  id: string;
  name: string;
  code: string | null;
}

interface Teacher {
  id: string;
  user_id: string;
  full_name: string;
}

export default function TimetableManagement() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string; section: string }[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [loadingData, setLoadingData] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Period & Break Configuration
  const [schedule, setSchedule] = useState<PeriodConfig[]>(DEFAULT_SCHEDULE);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<PeriodConfig | null>(null);
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);

  // For click-to-fill
  const [selectedCell, setSelectedCell] = useState<{ day: string; period: number } | null>(null);
  const [existingEntry, setExistingEntry] = useState<TimetableEntry | null>(null);

  // Teacher Schedules tab state
  const [activeTab, setActiveTab] = useState('class-timetable');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [teacherSchedule, setTeacherSchedule] = useState<TimetableEntry[]>([]);
  const [loadingTeacherSchedule, setLoadingTeacherSchedule] = useState(false);

  const [formData, setFormData] = useState({
    subjectId: '',
    teacherId: '',
    startTime: '08:00',
    endTime: '08:45',
  });

  // Load schedule from localStorage
  useEffect(() => {
    const savedSchedule = localStorage.getItem('timetable_schedule');
    if (savedSchedule) {
      try {
        setSchedule(JSON.parse(savedSchedule));
      } catch (e) {
        console.error('Failed to parse saved schedule');
      }
    }
  }, []);

  // Save schedule to localStorage
  const saveSchedule = (newSchedule: PeriodConfig[]) => {
    setSchedule(newSchedule);
    localStorage.setItem('timetable_schedule', JSON.stringify(newSchedule));
  };

  useEffect(() => {
    if (!loading && (!user || userRole !== 'admin')) {
      navigate('/auth');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedClass && activeTab === 'class-timetable') fetchTimetable();
  }, [selectedClass, activeTab]);

  useEffect(() => {
    if (selectedTeacher && activeTab === 'teacher-schedules') fetchTeacherSchedule();
  }, [selectedTeacher, activeTab]);

  const fetchInitialData = async () => {
    setLoadingData(true);
    const [classesRes, subjectsRes, teachersRes] = await Promise.all([
      supabase.from('classes').select('*').order('name'),
      supabase.from('subjects').select('*').order('name'),
      supabase.from('teachers').select('*'),
    ]);

    if (classesRes.data) {
      setClasses(classesRes.data);
      if (classesRes.data.length > 0) setSelectedClass(classesRes.data[0].id);
    }
    if (subjectsRes.data) setSubjects(subjectsRes.data);
    
    if (teachersRes.data && teachersRes.data.length > 0) {
      const userIds = teachersRes.data.map(t => t.user_id);
      const { data: profilesData } = await supabase.from('profiles').select('*').in('user_id', userIds);
      const teachersWithProfiles = teachersRes.data.map(t => ({
        id: t.id,
        user_id: t.user_id,
        full_name: profilesData?.find(p => p.user_id === t.user_id)?.full_name || 'Unknown',
      }));
      setTeachers(teachersWithProfiles);
    }

    setLoadingData(false);
  };

  const fetchTimetable = async () => {
    const { data } = await supabase
      .from('timetable')
      .select('*, subjects(name)')
      .eq('class_id', selectedClass)
      .order('period_number');

    if (data) {
      const teacherIds = data.filter(t => t.teacher_id).map(t => t.teacher_id);
      let teacherProfiles: Record<string, string> = {};
      
      if (teacherIds.length > 0) {
        const { data: teachersData } = await supabase.from('teachers').select('id, user_id').in('id', teacherIds);
        if (teachersData && teachersData.length > 0) {
          const userIds = teachersData.map(t => t.user_id);
          const { data: profilesData } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);
          teachersData.forEach(t => {
            const profile = profilesData?.find(p => p.user_id === t.user_id);
            if (profile) teacherProfiles[t.id] = profile.full_name;
          });
        }
      }

      setTimetable(data.map(entry => ({
        ...entry,
        teacherName: entry.teacher_id ? teacherProfiles[entry.teacher_id] || 'Unknown' : undefined,
      })));
    }
  };

  const fetchTeacherSchedule = async () => {
    if (!selectedTeacher) return;
    setLoadingTeacherSchedule(true);

    const { data } = await supabase
      .from('timetable')
      .select('*, subjects(name), classes(name, section)')
      .eq('teacher_id', selectedTeacher)
      .eq('is_published', true)
      .order('day_of_week')
      .order('period_number');

    if (data) {
      setTeacherSchedule(data.map(entry => ({
        ...entry,
        className: `${(entry.classes as any)?.name}-${(entry.classes as any)?.section}`,
      })) as TimetableEntry[]);
    }

    setLoadingTeacherSchedule(false);
  };

  const periods = schedule.filter(s => !s.isBreak);

  const groupedByDay = (entries: TimetableEntry[]) => {
    return DAYS.reduce((acc, day) => {
      acc[day] = entries.filter(t => t.day_of_week === day).sort((a, b) => a.period_number - b.period_number);
      return acc;
    }, {} as Record<string, TimetableEntry[]>);
  };

  const selectedTeacherName = teachers.find(t => t.id === selectedTeacher)?.full_name || '';

  const handleDownloadTeacherCSV = () => {
    downloadTimetableAsCSV(teacherSchedule, `${selectedTeacherName}_Schedule`, false, true);
  };

  const handleDownloadTeacherPDF = () => {
    downloadTimetableAsPDF(teacherSchedule, `${selectedTeacherName}'s Schedule`, false, true);
  };

  const handleCellClick = (day: string, periodNumber: number) => {
    const entry = getEntryForSlot(day, periodNumber);
    setSelectedCell({ day, period: periodNumber });
    setExistingEntry(entry || null);
    
    const periodConfig = schedule.find(s => s.number === periodNumber && !s.isBreak);
    const times = periodConfig ? { start: periodConfig.startTime, end: periodConfig.endTime } : { start: '08:00', end: '08:45' };
    
    if (entry) {
      setFormData({
        subjectId: entry.subject_id || '',
        teacherId: entry.teacher_id || '',
        startTime: entry.start_time?.slice(0, 5) || times.start,
        endTime: entry.end_time?.slice(0, 5) || times.end,
      });
    } else {
      setFormData({
        subjectId: '',
        teacherId: '',
        startTime: times.start,
        endTime: times.end,
      });
    }
    
    setDialogOpen(true);
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCell) return;

    setIsSubmitting(true);

    if (existingEntry) {
      const { error } = await supabase.from('timetable').update({
        subject_id: formData.subjectId || null,
        teacher_id: formData.teacherId || null,
        start_time: formData.startTime,
        end_time: formData.endTime,
      }).eq('id', existingEntry.id);

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } else {
        toast({ title: 'Updated', description: 'Period updated successfully' });
      }
    } else {
      const { error } = await supabase.from('timetable').insert({
        class_id: selectedClass,
        day_of_week: selectedCell.day,
        period_number: selectedCell.period,
        subject_id: formData.subjectId || null,
        teacher_id: formData.teacherId || null,
        start_time: formData.startTime,
        end_time: formData.endTime,
        is_published: false,
      });

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } else {
        toast({ title: 'Added', description: 'Period added successfully' });
      }
    }

    setDialogOpen(false);
    setSelectedCell(null);
    setExistingEntry(null);
    fetchTimetable();
    setIsSubmitting(false);
  };

  const handleDeleteEntry = async () => {
    if (!existingEntry) return;
    
    setIsSubmitting(true);
    const { error } = await supabase.from('timetable').delete().eq('id', existingEntry.id);
    
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Deleted', description: 'Period removed' });
    }
    
    setDialogOpen(false);
    setSelectedCell(null);
    setExistingEntry(null);
    fetchTimetable();
    setIsSubmitting(false);
  };

  const togglePublish = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('timetable').update({ is_published: !currentStatus }).eq('id', id);
    if (!error) {
      toast({ title: currentStatus ? 'Unpublished' : 'Published', description: 'Timetable visibility updated' });
      fetchTimetable();
    }
  };

  const publishAll = async () => {
    const { error } = await supabase
      .from('timetable')
      .update({ is_published: true })
      .eq('class_id', selectedClass);
    
    if (!error) {
      toast({ title: 'Published', description: 'All periods published for this class' });
      fetchTimetable();
    }
  };

  const getEntryForSlot = (day: string, period: number) => {
    return timetable.find(t => t.day_of_week === day && t.period_number === period);
  };

  // Schedule Configuration Functions
  const addPeriod = () => {
    const lastPeriod = periods[periods.length - 1];
    const newPeriodNumber = lastPeriod ? lastPeriod.number + 1 : 1;
    const newSchedule = [...schedule, {
      number: newPeriodNumber,
      startTime: lastPeriod?.endTime || '08:00',
      endTime: addMinutes(lastPeriod?.endTime || '08:00', 45),
      isBreak: false,
      breakName: '',
    }];
    saveSchedule(newSchedule);
    toast({ title: 'Period Added', description: `Period ${newPeriodNumber} added` });
  };

  const addBreak = () => {
    const newSchedule = [...schedule, {
      number: 0,
      startTime: '10:30',
      endTime: '10:45',
      isBreak: true,
      breakName: 'Break',
    }];
    saveSchedule(newSchedule);
    toast({ title: 'Break Added', description: 'New break added to schedule' });
  };

  const removeSlot = (index: number) => {
    const newSchedule = schedule.filter((_, i) => i !== index);
    // Renumber periods
    let periodNum = 1;
    const renumbered = newSchedule.map(slot => {
      if (!slot.isBreak) {
        return { ...slot, number: periodNum++ };
      }
      return slot;
    });
    saveSchedule(renumbered);
    toast({ title: 'Removed', description: 'Slot removed from schedule' });
  };

  const openSlotEditor = (slot: PeriodConfig, index: number) => {
    setEditingSlot({ ...slot, number: index }); // Using number to store index temporarily
    setSlotDialogOpen(true);
  };

  const saveSlotEdit = () => {
    if (!editingSlot) return;
    const index = editingSlot.number; // Get index from temporary storage
    const newSchedule = [...schedule];
    
    // Find actual period number for non-breaks
    if (!editingSlot.isBreak) {
      const periodsBefore = newSchedule.slice(0, index).filter(s => !s.isBreak).length;
      editingSlot.number = periodsBefore + 1;
    } else {
      editingSlot.number = 0;
    }
    
    newSchedule[index] = editingSlot;
    
    // Renumber all periods
    let periodNum = 1;
    const renumbered = newSchedule.map(slot => {
      if (!slot.isBreak) {
        return { ...slot, number: periodNum++ };
      }
      return slot;
    });
    
    saveSchedule(renumbered);
    setSlotDialogOpen(false);
    setEditingSlot(null);
    toast({ title: 'Updated', description: 'Schedule slot updated' });
  };

  const resetToDefault = () => {
    saveSchedule(DEFAULT_SCHEDULE);
    toast({ title: 'Reset', description: 'Schedule reset to default' });
  };

  const addMinutes = (time: string, minutes: number): string => {
    const [h, m] = time.split(':').map(Number);
    const totalMinutes = h * 60 + m + minutes;
    const newH = Math.floor(totalMinutes / 60) % 24;
    const newM = totalMinutes % 60;
    return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const noSubjects = subjects.length === 0;

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} roleColor="admin">
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-display text-2xl font-bold">Timetable Management</h1>
          <p className="text-muted-foreground">Manage class timetables and view teacher schedules</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="class-timetable">Class Timetables</TabsTrigger>
            <TabsTrigger value="teacher-schedules">Teacher Schedules</TabsTrigger>
          </TabsList>

          <TabsContent value="class-timetable" className="mt-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex gap-2 flex-wrap">
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name} - {c.section}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={() => setConfigDialogOpen(true)}>
                  <Settings className="h-4 w-4 mr-2" />Configure
                </Button>

                <Button variant="outline" onClick={publishAll}>
                  <Eye className="h-4 w-4 mr-2" />Publish All
                </Button>
              </div>
            </div>

            {noSubjects && (
              <Card className="border-amber-500/50 bg-amber-500/10">
                <CardContent className="pt-6">
                  <p className="text-amber-600 dark:text-amber-400">
                    ⚠️ No subjects found. Please <a href="/admin/subjects" className="underline font-medium">add subjects</a> first before creating the timetable.
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Timetable Grid - Click to Fill
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : classes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No classes found. Please <a href="/admin/classes" className="underline text-primary">add classes</a> first.
                  </div>
                ) : (
                  <>
                    {/* Mobile: Day-by-day cards */}
                    <div className="space-y-4 sm:hidden">
                      {DAYS.map((day) => (
                        <div key={day} className="rounded-xl border bg-muted/10 overflow-hidden">
                          <div className="px-3 py-2 bg-muted/50 font-semibold text-sm">{day}</div>
                          <div className="divide-y">
                            {schedule.map((slot, index) =>
                              slot.isBreak ? (
                                <div key={`break-${index}`} className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 text-xs">
                                  <Coffee className="h-3 w-3 shrink-0" />
                                  <span className="font-medium">{slot.breakName}</span>
                                  <span className="text-[10px]">({slot.startTime}-{slot.endTime})</span>
                                </div>
                              ) : (
                                <div
                                  key={`p-${slot.number}`}
                                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
                                  onClick={() => handleCellClick(day, slot.number)}
                                >
                                  <div className="shrink-0 text-center w-12">
                                    <div className="text-[10px] text-muted-foreground font-medium">P{slot.number}</div>
                                    <div className="text-[10px] text-muted-foreground">{slot.startTime}</div>
                                  </div>
                                  {(() => {
                                    const entry = getEntryForSlot(day, slot.number);
                                    return entry ? (
                                      <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                                        <div className="min-w-0">
                                          <p className="text-sm font-semibold text-primary truncate">{entry.subjects?.name || 'N/A'}</p>
                                          <p className="text-xs text-muted-foreground truncate">{entry.teacherName || '-'}</p>
                                        </div>
                                        <Badge
                                          variant={entry.is_published ? "default" : "secondary"}
                                          className="text-[10px] h-5 shrink-0"
                                          onClick={(e) => { e.stopPropagation(); togglePublish(entry.id, entry.is_published); }}
                                        >
                                          {entry.is_published ? 'Live' : 'Draft'}
                                        </Badge>
                                      </div>
                                    ) : (
                                      <div className="flex-1 flex items-center text-muted-foreground/50 text-xs gap-1">
                                        <Plus className="h-3 w-3" /> Add
                                      </div>
                                    );
                                  })()}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop: Full grid table */}
                    <div className="overflow-x-auto hidden sm:block">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr>
                            <th className="border p-2 bg-muted text-sm min-w-[100px]">Time</th>
                            {DAYS.map((day) => (
                              <th key={day} className="border p-2 bg-muted text-sm font-medium">{day}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {schedule.map((slot, index) => (
                            slot.isBreak ? (
                              <tr key={`break-${index}`} className="bg-amber-50 dark:bg-amber-950/30">
                                <td className="border p-2 text-center" colSpan={DAYS.length + 1}>
                                  <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
                                    <Coffee className="h-4 w-4" />
                                    <span className="font-medium">{slot.breakName}</span>
                                    <span className="text-sm">({slot.startTime} - {slot.endTime})</span>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              <tr key={`period-${slot.number}`}>
                                <td className="border p-2 text-center font-medium bg-muted/50 text-sm">
                                  <div className="font-semibold">Period {slot.number}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {slot.startTime} - {slot.endTime}
                                  </div>
                                </td>
                                {DAYS.map((day) => {
                                  const entry = getEntryForSlot(day, slot.number);
                                  return (
                                    <td 
                                      key={day} 
                                      className={cn(
                                        "border p-2 min-w-[130px] h-[80px] cursor-pointer transition-colors hover:bg-muted/50",
                                        !entry && "bg-muted/20"
                                      )}
                                      onClick={() => handleCellClick(day, slot.number)}
                                    >
                                      {entry ? (
                                        <div className="text-xs space-y-1">
                                          <div className="font-semibold text-primary truncate">{entry.subjects?.name || 'N/A'}</div>
                                          <div className="text-muted-foreground truncate">{entry.teacherName || '-'}</div>
                                          <Badge 
                                            variant={entry.is_published ? "default" : "secondary"} 
                                            className="text-[10px] h-4"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              togglePublish(entry.id, entry.is_published);
                                            }}
                                          >
                                            {entry.is_published ? <Eye className="h-2 w-2 mr-1" /> : <EyeOff className="h-2 w-2 mr-1" />}
                                            {entry.is_published ? 'Live' : 'Draft'}
                                          </Badge>
                                        </div>
                                      ) : (
                                        <div className="h-full flex items-center justify-center text-muted-foreground/50">
                                          <Plus className="h-4 w-4" />
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            )
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teacher-schedules" className="mt-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div className="flex items-center gap-4">
                <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select a teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {t.full_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTeacherName && (
                  <span className="text-sm text-muted-foreground hidden sm:inline">
                    Viewing schedule for: <strong>{selectedTeacherName}</strong>
                  </span>
                )}
              </div>

              {teacherSchedule.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleDownloadTeacherCSV}>
                    <Table className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadTeacherPDF}>
                    <FileText className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                </div>
              )}
            </div>

            {!selectedTeacher ? (
              <Card className="card-elevated">
                <CardContent className="py-12 text-center">
                  <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Select a teacher to view their schedule</p>
                </CardContent>
              </Card>
            ) : loadingTeacherSchedule ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : teacherSchedule.length === 0 ? (
              <Card className="card-elevated">
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No published periods assigned to this teacher.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Assign periods to this teacher in the Class Timetables tab.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {DAYS.map((day) => {
                  const dayEntries = groupedByDay(teacherSchedule)[day];
                  return (
                    <Card key={day} className="card-elevated">
                      <CardHeader className="pb-3">
                        <CardTitle className="font-display text-lg flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          {day}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {dayEntries.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No classes</p>
                        ) : (
                          <div className="space-y-2">
                            {dayEntries.map((entry: any) => (
                              <div key={entry.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                  {entry.period_number}
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{entry.subjects?.name || 'Free Period'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {entry.className} • {entry.start_time?.slice(0, 5)} - {entry.end_time?.slice(0, 5)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Entry Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">
                {existingEntry ? 'Edit Period' : 'Add Period'}
              </DialogTitle>
              <DialogDescription>
                {selectedCell ? `${selectedCell.day} - Period ${selectedCell.period}` : ''}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveEntry} className="space-y-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={formData.subjectId} onValueChange={(v) => setFormData({ ...formData, subjectId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Teacher</Label>
                <Select value={formData.teacherId} onValueChange={(v) => setFormData({ ...formData, teacherId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-2">
                {existingEntry && (
                  <Button type="button" variant="destructive" onClick={handleDeleteEntry} disabled={isSubmitting}>
                    <Trash2 className="h-4 w-4 mr-2" />Delete
                  </Button>
                )}
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:ml-auto">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting} className="gradient-admin">
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {existingEntry ? 'Update' : 'Add'}
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Schedule Configuration Dialog */}
        <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Schedule Configuration
              </DialogTitle>
              <DialogDescription>Configure periods, breaks, and timings</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={addPeriod}><Plus className="h-4 w-4 mr-1" />Add Period</Button>
                <Button variant="outline" size="sm" onClick={addBreak}><Coffee className="h-4 w-4 mr-1" />Add Break</Button>
                <Button variant="outline" size="sm" onClick={resetToDefault}>Reset Default</Button>
              </div>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {schedule.map((slot, index) => (
                  <div key={index} className={cn("flex items-center justify-between p-3 rounded-lg border", slot.isBreak ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" : "bg-muted/30")}>
                    <div className="flex items-center gap-3">
                      {slot.isBreak ? (
                        <Coffee className="h-4 w-4 text-amber-600" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{slot.number}</div>
                      )}
                      <div>
                        <p className="font-medium text-sm">{slot.isBreak ? slot.breakName : `Period ${slot.number}`}</p>
                        <p className="text-xs text-muted-foreground">{slot.startTime} - {slot.endTime}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openSlotEditor(slot, index)}>
                        <Settings className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeSlot(index)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Slot Editor Dialog */}
        <Dialog open={slotDialogOpen} onOpenChange={setSlotDialogOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Edit Slot</DialogTitle>
            </DialogHeader>
            {editingSlot && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Switch checked={editingSlot.isBreak} onCheckedChange={(checked) => setEditingSlot({ ...editingSlot, isBreak: checked })} />
                  <Label>Is Break</Label>
                </div>
                {editingSlot.isBreak && (
                  <div className="space-y-2">
                    <Label>Break Name</Label>
                    <Input value={editingSlot.breakName} onChange={(e) => setEditingSlot({ ...editingSlot, breakName: e.target.value })} />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input type="time" value={editingSlot.startTime} onChange={(e) => setEditingSlot({ ...editingSlot, startTime: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input type="time" value={editingSlot.endTime} onChange={(e) => setEditingSlot({ ...editingSlot, endTime: e.target.value })} />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSlotDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveSlotEdit}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
