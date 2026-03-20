import {
  LayoutDashboard,
  GraduationCap,
  Users,
  Clock,
  BookOpen,
  FileText,
  ClipboardList,
  Bell,
  Calendar,
  MessageSquare,
  UserPlus,
  Image,
  LibraryBig,
  Settings,
  History,
} from 'lucide-react';

interface SidebarItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  moduleKey?: string;
}

const allTeacherSidebarItems: SidebarItem[] = [
  { icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard', path: '/teacher' },
  { icon: <GraduationCap className="h-5 w-5" />, label: 'My Classes', path: '/teacher/classes', moduleKey: 'classes' },
  { icon: <Users className="h-5 w-5" />, label: 'Students', path: '/teacher/students', moduleKey: 'students' },
  { icon: <Clock className="h-5 w-5" />, label: 'Attendance', path: '/teacher/attendance', moduleKey: 'attendance' },
  { icon: <BookOpen className="h-5 w-5" />, label: 'Homework', path: '/teacher/homework', moduleKey: 'homework' },
  { icon: <FileText className="h-5 w-5" />, label: 'Exam Marks', path: '/teacher/exams', moduleKey: 'exams' },
  { icon: <LibraryBig className="h-5 w-5" />, label: 'Syllabus', path: '/teacher/syllabus', moduleKey: 'syllabus' },
  { icon: <Calendar className="h-5 w-5" />, label: 'Weekly Exams', path: '/teacher/weekly-exams', moduleKey: 'weekly-exams' },
  { icon: <ClipboardList className="h-5 w-5" />, label: 'Reports', path: '/teacher/reports', moduleKey: 'reports' },
  { icon: <History className="h-5 w-5" />, label: 'Student History', path: '/teacher/student-history', moduleKey: 'students' },
  { icon: <Bell className="h-5 w-5" />, label: 'Announcements', path: '/teacher/announcements', moduleKey: 'announcements' },
  { icon: <Clock className="h-5 w-5" />, label: 'Timetable', path: '/teacher/timetable', moduleKey: 'timetable' },
  { icon: <Calendar className="h-5 w-5" />, label: 'Leave Request', path: '/teacher/leave', moduleKey: 'leave' },
  { icon: <Image className="h-5 w-5" />, label: 'Gallery', path: '/teacher/gallery', moduleKey: 'gallery' },
  { icon: <Bell className="h-5 w-5" />, label: 'Notifications', path: '/teacher/notifications', moduleKey: 'notifications' },
  { icon: <MessageSquare className="h-5 w-5" />, label: 'Messages', path: '/teacher/messages', moduleKey: 'messages' },
  { icon: <Settings className="h-5 w-5" />, label: 'Settings', path: '/teacher/settings' },
];

const leadsItem: SidebarItem = {
  icon: <UserPlus className="h-5 w-5" />,
  label: 'Leads',
  path: '/teacher/leads',
  moduleKey: 'leads',
};

export function getTeacherSidebarItems(showLeads: boolean, isModuleEnabled?: (key: string) => boolean): SidebarItem[] {
  let items = [...allTeacherSidebarItems];
  
  if (showLeads) {
    const messagesIndex = items.findIndex(i => i.path === '/teacher/messages');
    if (messagesIndex !== -1) {
      items.splice(messagesIndex, 0, leadsItem);
    } else {
      items.push(leadsItem);
    }
  }

  if (isModuleEnabled) {
    items = items.filter(item => !item.moduleKey || isModuleEnabled(item.moduleKey));
  }

  return items;
}

// Default export for backward compatibility (includes leads)
export const teacherSidebarItems = allTeacherSidebarItems;
