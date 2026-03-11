import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Loader2 } from 'lucide-react';
import { useParentSidebar } from '@/hooks/useParentSidebar';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { BackButton } from '@/components/ui/back-button';
import AttendanceCalendar from '@/components/attendance/AttendanceCalendar';

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  session: string | null;
  reason: string | null;
}

export default function ParentAttendance() {
  const parentSidebarItems = useParentSidebar();
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [childName, setChildName] = useState('');
  const [childClass, setChildClass] = useState('');
  const [admissionNo, setAdmissionNo] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && (!user || userRole !== 'parent')) {
      navigate('/auth');
    }
  }, [user, userRole, loading, navigate]);

  // Fetch linked child
  useEffect(() => {
    async function fetchChild() {
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
            .select('id, full_name, admission_number, status, classes(name, section)')
            .in('id', links.map(l => l.student_id))
            .eq('status', 'active')
            .limit(1)
            .maybeSingle();

          if (studentsData) {
            const child = studentsData as any;
            setSelectedStudentId(child.id);
            setChildName(child.full_name);
            setAdmissionNo(child.admission_number);
            setChildClass(child.classes ? `${child.classes.name}-${child.classes.section}` : '');
          }
        }
      }
    }
    fetchChild();
  }, [user]);

  // Fetch attendance when student is set
  useEffect(() => {
    if (selectedStudentId) fetchAttendance(new Date());
  }, [selectedStudentId]);

  // Realtime subscription
  useEffect(() => {
    if (!selectedStudentId) return;
    const channel = supabase
      .channel('parent-attendance-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance', filter: `student_id=eq.${selectedStudentId}` },
        () => fetchAttendance(new Date(), true)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedStudentId]);

  const fetchAttendance = async (month: Date, isBackground = false) => {
    if (!selectedStudentId) return;
    if (!isBackground) setLoadingData(true);
    const sixMonthsAgo = format(subMonths(startOfMonth(month), 5), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(month), 'yyyy-MM-dd');

    const { data } = await supabase
      .from('attendance')
      .select('id, date, status, session, reason')
      .eq('student_id', selectedStudentId)
      .gte('date', sixMonthsAgo)
      .lte('date', monthEnd)
      .order('date', { ascending: false });

    if (data) setAttendance(data);
    if (!isBackground) setLoadingData(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const isLoadingContent = loadingData && attendance.length === 0;

  return (
    <DashboardLayout sidebarItems={parentSidebarItems} roleColor="parent">
      {isLoadingContent ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
      <div className="space-y-6 animate-fade-in">
        <BackButton to="/parent" />
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold">Attendance</h1>
          <p className="text-muted-foreground text-sm">{childName}'s attendance calendar — Click any day for details</p>
        </div>

        <AttendanceCalendar
          attendance={attendance}
          childName={childName}
          className={childClass}
          admissionNumber={admissionNo}
          onMonthChange={(month) => fetchAttendance(month)}
        />
      </div>
      )}
    </DashboardLayout>
  );
}
