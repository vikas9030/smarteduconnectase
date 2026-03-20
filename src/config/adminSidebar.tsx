import {
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Bell,
  FileText,
  CreditCard,
  MessageSquare,
  Settings,
  Shield,
  Clock,
  LayoutDashboard,
  Library,
  Award,
  UserPlus,
  Image,
  ArrowUpCircle,
  History,
} from 'lucide-react';

interface SidebarItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  moduleKey?: string;
}

const allAdminSidebarItems: SidebarItem[] = [
  { icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard', path: '/admin' },
  { icon: <Users className="h-5 w-5" />, label: 'Teachers', path: '/admin/teachers', moduleKey: 'teachers' },
  { icon: <GraduationCap className="h-5 w-5" />, label: 'Students', path: '/admin/students', moduleKey: 'students' },
  { icon: <BookOpen className="h-5 w-5" />, label: 'Classes', path: '/admin/classes', moduleKey: 'classes' },
  { icon: <Library className="h-5 w-5" />, label: 'Subjects', path: '/admin/subjects', moduleKey: 'subjects' },
  { icon: <Calendar className="h-5 w-5" />, label: 'Timetable', path: '/admin/timetable', moduleKey: 'timetable' },
  { icon: <Clock className="h-5 w-5" />, label: 'Attendance', path: '/admin/attendance', moduleKey: 'attendance' },
  { icon: <FileText className="h-5 w-5" />, label: 'Exams', path: '/admin/exams', moduleKey: 'exams' },
  { icon: <BookOpen className="h-5 w-5" />, label: 'Syllabus', path: '/admin/syllabus', moduleKey: 'syllabus' },
  { icon: <UserPlus className="h-5 w-5" />, label: 'Leads', path: '/admin/leads', moduleKey: 'leads' },
  { icon: <Bell className="h-5 w-5" />, label: 'Announcements', path: '/admin/announcements', moduleKey: 'announcements' },
  { icon: <Shield className="h-5 w-5" />, label: 'Leave Requests', path: '/admin/leave', moduleKey: 'leave' },
  { icon: <Award className="h-5 w-5" />, label: 'Certificates', path: '/admin/certificates', moduleKey: 'certificates' },
  { icon: <MessageSquare className="h-5 w-5" />, label: 'Complaints', path: '/admin/complaints', moduleKey: 'complaints' },
  { icon: <CreditCard className="h-5 w-5" />, label: 'Fees', path: '/admin/fees', moduleKey: 'fees' },
  { icon: <ArrowUpCircle className="h-5 w-5" />, label: 'Promotion', path: '/admin/promotion', moduleKey: 'promotion' },
  { icon: <History className="h-5 w-5" />, label: 'Student History', path: '/admin/student-history', moduleKey: 'promotion' },
  { icon: <Image className="h-5 w-5" />, label: 'Gallery', path: '/admin/gallery', moduleKey: 'gallery' },
  { icon: <Bell className="h-5 w-5" />, label: 'Notifications', path: '/admin/notifications', moduleKey: 'notifications' },
  { icon: <MessageSquare className="h-5 w-5" />, label: 'Messages', path: '/admin/messages', moduleKey: 'messages' },
  { icon: <Settings className="h-5 w-5" />, label: 'Settings', path: '/admin/settings' },
];

export function getFilteredAdminSidebarItems(isModuleEnabled: (key: string) => boolean): SidebarItem[] {
  return allAdminSidebarItems.filter(item => !item.moduleKey || isModuleEnabled(item.moduleKey));
}

// Default export for backward compatibility
export const adminSidebarItems = allAdminSidebarItems;
