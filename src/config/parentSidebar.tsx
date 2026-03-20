import {
  LayoutDashboard,
  User,
  Clock,
  Calendar,
  BookOpen,
  FileText,
  TrendingUp,
  Bell,
  MessageSquare,
  Award,
  CreditCard,
  Image,
  LibraryBig,
  Settings,
  AlertTriangle,
  History,
} from 'lucide-react';

interface SidebarItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  moduleKey?: string;
}

const allParentSidebarItems: SidebarItem[] = [
  { icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard', path: '/parent' },
  { icon: <User className="h-5 w-5" />, label: 'My Child', path: '/parent/child' },
  { icon: <Clock className="h-5 w-5" />, label: 'Attendance', path: '/parent/attendance', moduleKey: 'attendance' },
  { icon: <Calendar className="h-5 w-5" />, label: 'Timetable', path: '/parent/timetable', moduleKey: 'timetable' },
  { icon: <BookOpen className="h-5 w-5" />, label: 'Homework', path: '/parent/homework', moduleKey: 'homework' },
  { icon: <LibraryBig className="h-5 w-5" />, label: 'Syllabus', path: '/parent/syllabus', moduleKey: 'syllabus' },
  { icon: <FileText className="h-5 w-5" />, label: 'Exam Results', path: '/parent/exams', moduleKey: 'exams' },
  { icon: <TrendingUp className="h-5 w-5" />, label: 'Progress', path: '/parent/progress', moduleKey: 'exams' },
  { icon: <Bell className="h-5 w-5" />, label: 'Announcements', path: '/parent/announcements', moduleKey: 'announcements' },
  { icon: <Calendar className="h-5 w-5" />, label: 'Leave Request', path: '/parent/leave', moduleKey: 'leave' },
  { icon: <AlertTriangle className="h-5 w-5" />, label: 'Complaints', path: '/parent/complaints', moduleKey: 'complaints' },
  { icon: <Bell className="h-5 w-5" />, label: 'Notifications', path: '/parent/notifications', moduleKey: 'notifications' },
  { icon: <MessageSquare className="h-5 w-5" />, label: 'Messages', path: '/parent/messages', moduleKey: 'messages' },
  { icon: <Award className="h-5 w-5" />, label: 'Certificates', path: '/parent/certificates', moduleKey: 'certificates' },
  { icon: <Image className="h-5 w-5" />, label: 'Gallery', path: '/parent/gallery', moduleKey: 'gallery' },
  { icon: <CreditCard className="h-5 w-5" />, label: 'Pay Fees', path: '/parent/fees', moduleKey: 'fees' },
  { icon: <History className="h-5 w-5" />, label: 'Student History', path: '/parent/student-history', moduleKey: 'promotion' },
  { icon: <Settings className="h-5 w-5" />, label: 'Settings', path: '/parent/settings' },
];

export function getFilteredParentSidebarItems(isModuleEnabled: (key: string) => boolean): SidebarItem[] {
  return allParentSidebarItems.filter(item => !item.moduleKey || isModuleEnabled(item.moduleKey));
}

// Default export for backward compatibility
export const parentSidebarItems = allParentSidebarItems;
