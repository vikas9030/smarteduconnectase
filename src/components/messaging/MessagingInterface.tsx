import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Send, Loader2, MessageCircle, Check, CheckCheck, Plus, Crown, UserCheck, Paperclip, Image, Download, FileText, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  student_id: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
}

interface Contact {
  id: string;
  name: string;
  role: 'teacher' | 'parent' | 'admin';
  roleLabel?: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  studentId?: string;
  studentName?: string;
}

interface ClassOption {
  id: string;
  name: string;
  section: string;
}

interface StudentOption {
  id: string;
  full_name: string;
  parentUserId?: string;
  parentName?: string;
}

interface TeacherOption {
  id: string;
  userId: string;
  name: string;
  teacherId: string;
}

interface Props {
  currentUserId: string;
  currentUserRole: 'teacher' | 'parent' | 'admin';
  studentId?: string;
}

export default function MessagingInterface({ currentUserId, currentUserRole, studentId }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  // Class/Student selection for teachers and admins
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [messageType, setMessageType] = useState<'parent' | 'teacher' | 'admin'>('parent');
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  
  // Teacher selection for admin
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  // Admin info for teacher messaging
  const [adminUser, setAdminUser] = useState<{ userId: string; name: string; avatar?: string } | null>(null);

  // Load contacts based on role
  useEffect(() => {
    loadContacts();
    if (currentUserRole === 'teacher' || currentUserRole === 'admin' || currentUserRole === 'parent') {
      loadClasses();
    }
    if (currentUserRole === 'admin' || currentUserRole === 'parent') {
      loadTeachers();
    }
    if (currentUserRole === 'teacher') {
      loadAdminUser();
    }
    if (currentUserRole === 'parent') {
      loadAdminUser();
    }
  }, [currentUserId, currentUserRole]);

  // Load students when class is selected
  useEffect(() => {
    if (selectedClassId) {
      loadStudentsForClass(selectedClassId);
    } else {
      setStudents([]);
      setSelectedStudentId('');
    }
  }, [selectedClassId]);

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${currentUserId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (selectedContact && newMsg.sender_id === selectedContact.id) {
            setMessages(prev => [...prev, newMsg]);
            markAsRead(newMsg.id);
          }
          loadContacts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, selectedContact]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadClasses = async () => {
    try {
      if (currentUserRole === 'admin') {
        // Admin can see all classes
        const { data } = await supabase
          .from('classes')
          .select('id, name, section')
          .order('name');
        if (data) setClasses(data);
      } else {
        // Teacher sees classes they're assigned to (via teacher_classes) OR are class teacher of
        const { data: teacher } = await supabase
          .from('teachers')
          .select('id')
          .eq('user_id', currentUserId)
          .maybeSingle();

        if (teacher) {
          // Get classes from teacher_classes junction table
          const { data: teacherClasses } = await supabase
            .from('teacher_classes')
            .select('class_id, classes(id, name, section)')
            .eq('teacher_id', teacher.id);

          // Get classes where teacher is the class teacher
          const { data: classTeacherClasses } = await supabase
            .from('classes')
            .select('id, name, section')
            .eq('class_teacher_id', teacher.id);

          // Combine and deduplicate
          const classMap = new Map<string, ClassOption>();
          
          if (teacherClasses) {
            teacherClasses.forEach(tc => {
              const cls = tc.classes as any;
              if (cls) classMap.set(cls.id, cls);
            });
          }
          
          if (classTeacherClasses) {
            classTeacherClasses.forEach(cls => {
              classMap.set(cls.id, cls);
            });
          }

          setClasses(Array.from(classMap.values()));
        }
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const loadTeachers = async () => {
    setLoadingTeachers(true);
    try {
      const { data: teachersData } = await supabase
        .from('teachers')
        .select('id, user_id, teacher_id')
        .eq('status', 'active')
        .order('teacher_id');

      if (teachersData) {
        const teachersList: TeacherOption[] = [];
        for (const teacher of teachersData) {
          // Skip if this is the current user
          if (teacher.user_id === currentUserId) continue;
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', teacher.user_id)
            .maybeSingle();

          teachersList.push({
            id: teacher.id,
            userId: teacher.user_id,
            name: profile?.full_name || 'Teacher',
            teacherId: teacher.teacher_id
          });
        }
        setTeachers(teachersList);
      }
    } catch (error) {
      console.error('Error loading teachers:', error);
    } finally {
      setLoadingTeachers(false);
    }
  };

  const loadAdminUser = async () => {
    try {
      // Use security definer function to get admin user IDs (bypasses RLS)
      const { data: adminIds } = await supabase.rpc('get_admin_user_ids');

      if (adminIds && adminIds.length > 0) {
        const adminUserId = adminIds[0];
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, photo_url')
          .eq('user_id', adminUserId)
          .maybeSingle();

        setAdminUser({
          userId: adminUserId,
          name: profile?.full_name || 'Admin',
          avatar: profile?.photo_url || undefined,
        });
      }
    } catch (error) {
      console.error('Error loading admin user:', error);
    }
  };

  const loadStudentsForClass = async (classId: string) => {
    setLoadingStudents(true);
    try {
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, full_name')
        .eq('class_id', classId)
        .order('full_name');

      if (studentsData) {
        // Get parent info for each student
        const studentsWithParents: StudentOption[] = [];
        
        for (const student of studentsData) {
          const { data: parentLink } = await supabase
            .from('student_parents')
            .select('parents(user_id)')
            .eq('student_id', student.id)
            .maybeSingle();

          const parentUserId = (parentLink?.parents as any)?.user_id;
          let parentName = '';

          if (parentUserId) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', parentUserId)
              .maybeSingle();
            parentName = profile?.full_name || '';
          }

          studentsWithParents.push({
            id: student.id,
            full_name: student.full_name,
            parentUserId,
            parentName
          });
        }

        setStudents(studentsWithParents);
      }
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoadingStudents(false);
    }
  };

  const startNewConversation = () => {
    if (messageType === 'teacher') {
      startTeacherConversation();
    } else if (messageType === 'admin') {
      startAdminConversation();
    } else {
      startParentConversation();
    }
  };

  const startAdminConversation = () => {
    if (!adminUser) {
      toast.error('No admin found');
      return;
    }

    const newContact: Contact = {
      id: adminUser.userId,
      name: adminUser.name,
      role: 'admin',
      roleLabel: 'Principal',
      avatar: adminUser.avatar,
    };

    setSelectedContact(newContact);
    setMessages([]);
    setShowNewMessage(false);
    setMessageType('parent');

    loadMessages(newContact);

    if (!contacts.find(c => c.id === newContact.id)) {
      setContacts(prev => [newContact, ...prev]);
    }
  };

  const startParentConversation = () => {
    const student = students.find(s => s.id === selectedStudentId);
    if (!student || !student.parentUserId) {
      toast.error('No parent linked to this student');
      return;
    }

    const newContact: Contact = {
      id: student.parentUserId,
      name: student.parentName || `Parent of ${student.full_name}`,
      role: 'parent',
      studentId: student.id,
      studentName: student.full_name
    };

    setSelectedContact(newContact);
    setMessages([]);
    setShowNewMessage(false);
    setSelectedClassId('');
    setSelectedStudentId('');

    // Add to contacts if not already there
    if (!contacts.find(c => c.id === newContact.id && c.studentId === newContact.studentId)) {
      setContacts(prev => [newContact, ...prev]);
    }
  };

  const startTeacherConversation = () => {
    const teacher = teachers.find(t => t.id === selectedTeacherId);
    if (!teacher) {
      toast.error('Please select a teacher');
      return;
    }

    const newContact: Contact = {
      id: teacher.userId,
      name: teacher.name,
      role: 'teacher',
      roleLabel: `ID: ${teacher.teacherId}`
    };

    setSelectedContact(newContact);
    setMessages([]);
    setShowNewMessage(false);
    setSelectedTeacherId('');
    setMessageType('parent');

    // Load existing messages with this teacher
    loadMessages(newContact);

    // Add to contacts if not already there
    if (!contacts.find(c => c.id === newContact.id)) {
      setContacts(prev => [newContact, ...prev]);
    }
  };

  const loadContacts = async () => {
    setLoading(true);
    try {
      if (currentUserRole === 'parent') {
        await loadParentContacts();
      } else if (currentUserRole === 'teacher') {
        await loadTeacherContacts();
      } else if (currentUserRole === 'admin') {
        await loadAdminContacts();
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadParentContacts = async () => {
    const { data: parentData } = await supabase
      .from('parents')
      .select('id')
      .eq('user_id', currentUserId)
      .maybeSingle();

    if (!parentData) return;

    const { data: links } = await supabase
      .from('student_parents')
      .select('student_id, students(id, full_name, class_id)')
      .eq('parent_id', parentData.id);

    if (!links || links.length === 0) return;

    const student = (links[0] as any).students;
    const contactList: Contact[] = [];

    // 1. Add Principal (Admin)
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (adminRoles && adminRoles.length > 0) {
      const adminUserId = adminRoles[0].user_id;
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('full_name, photo_url')
        .eq('user_id', adminUserId)
        .maybeSingle();

      contactList.push({
        id: adminUserId,
        name: adminProfile?.full_name || 'Principal',
        role: 'admin',
        roleLabel: 'Principal',
        avatar: adminProfile?.photo_url || undefined,
        studentId: student.id,
        studentName: student.full_name
      });
    }

    // 2. Add Class Teacher
    if (student.class_id) {
      const { data: classData } = await supabase
        .from('classes')
        .select('class_teacher_id, teachers!classes_class_teacher_id_fkey(user_id)')
        .eq('id', student.class_id)
        .maybeSingle();

      if (classData?.teachers) {
        const classTeacherUserId = (classData.teachers as any).user_id;
        const { data: ctProfile } = await supabase
          .from('profiles')
          .select('full_name, photo_url')
          .eq('user_id', classTeacherUserId)
          .maybeSingle();

        // Avoid duplicate if class teacher is also in teacher_classes
        if (!contactList.find(c => c.id === classTeacherUserId)) {
          contactList.push({
            id: classTeacherUserId,
            name: ctProfile?.full_name || 'Class Teacher',
            role: 'teacher',
            roleLabel: 'Class Teacher',
            avatar: ctProfile?.photo_url || undefined,
            studentId: student.id,
            studentName: student.full_name
          });
        }
      }

      // 3. Add other teachers for this class
      const { data: teacherClasses } = await supabase
        .from('teacher_classes')
        .select('teacher_id, teachers(id, user_id)')
        .eq('class_id', student.class_id);

      if (teacherClasses) {
        for (const tc of teacherClasses) {
          const teacher = tc.teachers as any;
          if (teacher?.user_id && !contactList.find(c => c.id === teacher.user_id)) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, photo_url')
              .eq('user_id', teacher.user_id)
              .maybeSingle();

            contactList.push({
              id: teacher.user_id,
              name: profile?.full_name || 'Teacher',
              role: 'teacher',
              roleLabel: 'Subject Teacher',
              avatar: profile?.photo_url || undefined,
              studentId: student.id,
              studentName: student.full_name
            });
          }
        }
      }
    }

    setContacts(contactList);
  };

  const loadTeacherContacts = async () => {
    // Load existing conversations from messages
    const { data: messagesData } = await supabase
      .from('messages')
      .select('sender_id, recipient_id, student_id')
      .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`);

    if (!messagesData) return;

    const uniqueContactIds = new Set<string>();
    const contactList: Contact[] = [];

    for (const msg of messagesData) {
      const otherId = msg.sender_id === currentUserId ? msg.recipient_id : msg.sender_id;
      const key = `${otherId}-${msg.student_id || ''}`;
      
      if (!uniqueContactIds.has(key)) {
        uniqueContactIds.add(key);

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, photo_url')
          .eq('user_id', otherId)
          .maybeSingle();

        let studentName = '';
        if (msg.student_id) {
          const { data: student } = await supabase
            .from('students')
            .select('full_name')
            .eq('id', msg.student_id)
            .maybeSingle();
          studentName = student?.full_name || '';
        }

        // Check if this contact is an admin
        const { data: adminCheck } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', otherId)
          .eq('role', 'admin')
          .maybeSingle();

        contactList.push({
          id: otherId,
          name: profile?.full_name || (adminCheck ? 'Admin' : 'Parent'),
          role: adminCheck ? 'admin' : 'parent',
          roleLabel: adminCheck ? 'Principal' : undefined,
          avatar: profile?.photo_url || undefined,
          studentId: msg.student_id || undefined,
          studentName: studentName
        });
      }
    }

    setContacts(contactList);
  };

  const loadAdminContacts = async () => {
    // Admin sees all incoming conversations
    const { data: messagesData } = await supabase
      .from('messages')
      .select('sender_id, recipient_id, student_id')
      .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`);

    if (!messagesData) return;

    const uniqueContactIds = new Set<string>();
    const contactList: Contact[] = [];

    for (const msg of messagesData) {
      const otherId = msg.sender_id === currentUserId ? msg.recipient_id : msg.sender_id;
      const key = `${otherId}-${msg.student_id || ''}`;
      
      if (!uniqueContactIds.has(key)) {
        uniqueContactIds.add(key);

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, photo_url')
          .eq('user_id', otherId)
          .maybeSingle();

        let studentName = '';
        if (msg.student_id) {
          const { data: student } = await supabase
            .from('students')
            .select('full_name')
            .eq('id', msg.student_id)
            .maybeSingle();
          studentName = student?.full_name || '';
        }

        // Check if this is a parent
        const { data: parentCheck } = await supabase
          .from('parents')
          .select('id')
          .eq('user_id', otherId)
          .maybeSingle();

        contactList.push({
          id: otherId,
          name: profile?.full_name || 'User',
          role: parentCheck ? 'parent' : 'teacher',
          avatar: profile?.photo_url || undefined,
          studentId: msg.student_id || undefined,
          studentName: studentName
        });
      }
    }

    setContacts(contactList);
  };

  const loadMessages = async (contact: Contact) => {
    setSelectedContact(contact);
    setShowNewMessage(false);
    
    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${contact.id}),and(sender_id.eq.${contact.id},recipient_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true });

      if (data) {
        setMessages(data);
        const unreadIds = data
          .filter(m => m.recipient_id === currentUserId && !m.is_read)
          .map(m => m.id);
        
        if (unreadIds.length > 0) {
          await supabase
            .from('messages')
            .update({ is_read: true })
            .in('id', unreadIds);
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const markAsRead = async (messageId: string) => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId);
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !attachmentFile) || !selectedContact) return;
    
    setSending(true);
    try {
      let attachmentUrl: string | null = null;
      let attachmentType: string | null = null;

      if (attachmentFile) {
        setUploading(true);
        const fileExt = attachmentFile.name.split('.').pop();
        const filePath = `message-attachments/${currentUserId}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('photos').upload(filePath, attachmentFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(filePath);
        attachmentUrl = urlData.publicUrl;
        attachmentType = attachmentFile.type.startsWith('image/') ? 'image' : 'document';
        setUploading(false);
      }

      const { error } = await supabase.from('messages').insert({
        sender_id: currentUserId,
        recipient_id: selectedContact.id,
        student_id: selectedContact.studentId || null,
        content: newMessage.trim() || (attachmentType === 'image' ? '📷 Image' : '📎 Document'),
        attachment_url: attachmentUrl,
        attachment_type: attachmentType,
      });

      if (error) throw error;

      const optimisticMessage: Message = {
        id: Date.now().toString(),
        sender_id: currentUserId,
        recipient_id: selectedContact.id,
        student_id: selectedContact.studentId || null,
        content: newMessage.trim() || (attachmentType === 'image' ? '📷 Image' : '📎 Document'),
        is_read: false,
        created_at: new Date().toISOString(),
        attachment_url: attachmentUrl,
        attachment_type: attachmentType,
      };
      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('');
      setAttachmentFile(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setUploading(false);
    } finally {
      setSending(false);
    }
  };

  const getRoleIcon = (contact: Contact) => {
    if (contact.roleLabel === 'Principal' || contact.role === 'admin') {
      return <Crown className="h-3 w-3 text-amber-500" />;
    }
    if (contact.roleLabel === 'Class Teacher') {
      return <UserCheck className="h-3 w-3 text-primary" />;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-220px)] md:h-[600px]">
      {/* Contacts List - hidden on mobile when a contact is selected */}
      <Card className={`md:col-span-1 ${isMobile && selectedContact ? 'hidden' : ''}`}>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              Conversations
            </CardTitle>
            {(currentUserRole === 'teacher' || currentUserRole === 'admin' || currentUserRole === 'parent') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewMessage(!showNewMessage)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* New Message Picker for Teachers/Admins */}
          {showNewMessage && (currentUserRole === 'teacher' || currentUserRole === 'admin') && (
            <div className="p-3 border-b space-y-3 bg-muted/30">
              {/* Role-based message type toggle */}
              {(currentUserRole === 'admin' || currentUserRole === 'teacher') && (
                <div className="flex gap-1 p-1 bg-muted rounded-lg">
                  <Button
                    size="sm"
                    variant={messageType === 'parent' ? 'default' : 'ghost'}
                    className="flex-1 h-7 text-xs"
                    onClick={() => {
                      setMessageType('parent');
                      setSelectedTeacherId('');
                    }}
                  >
                    Parent
                  </Button>
                  {currentUserRole === 'admin' && (
                    <Button
                      size="sm"
                      variant={messageType === 'teacher' ? 'default' : 'ghost'}
                      className="flex-1 h-7 text-xs"
                      onClick={() => {
                        setMessageType('teacher');
                        setSelectedClassId('');
                        setSelectedStudentId('');
                      }}
                    >
                      Teacher
                    </Button>
                  )}
                  {currentUserRole === 'teacher' && (
                    <Button
                      size="sm"
                      variant={messageType === 'admin' ? 'default' : 'ghost'}
                      className="flex-1 h-7 text-xs"
                      onClick={() => {
                        setMessageType('admin');
                        setSelectedClassId('');
                        setSelectedStudentId('');
                      }}
                    >
                      Admin
                    </Button>
                  )}
                </div>
              )}

              {/* Admin message for teacher */}
              {currentUserRole === 'teacher' && messageType === 'admin' && (
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={startNewConversation}
                  disabled={!adminUser}
                >
                  {adminUser ? `Message ${adminUser.name}` : 'No admin available'}
                </Button>
              )}

              {/* Teacher selection for admin */}
              {currentUserRole === 'admin' && messageType === 'teacher' && (
                <>
                  <Select 
                    value={selectedTeacherId} 
                    onValueChange={setSelectedTeacherId}
                    disabled={loadingTeachers}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={loadingTeachers ? "Loading..." : "Select Teacher"} />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({t.teacherId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedTeacherId && (
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={startNewConversation}
                    >
                      Message Teacher
                    </Button>
                  )}
                </>
              )}

              {/* Class/Student selection for parent messaging */}
              {((currentUserRole === 'teacher' && messageType === 'parent') || (currentUserRole === 'admin' && messageType === 'parent')) && (
                <>
                  <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select Class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} - {c.section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedClassId && (
                    <Select 
                      value={selectedStudentId} 
                      onValueChange={setSelectedStudentId}
                      disabled={loadingStudents}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={loadingStudents ? "Loading..." : "Select Student"} />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map(s => (
                          <SelectItem key={s.id} value={s.id} disabled={!s.parentUserId}>
                            {s.full_name} {!s.parentUserId && "(No parent linked)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {selectedStudentId && (
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={startNewConversation}
                    >
                      Message Parent
                    </Button>
                  )}
                </>
              )}
            </div>
          )}

          {/* New Message Picker for Parents */}
          {showNewMessage && currentUserRole === 'parent' && (
            <div className="p-3 border-b space-y-3 bg-muted/30">
              <div className="flex gap-1 p-1 bg-muted rounded-lg">
                <Button
                  size="sm"
                  variant={messageType === 'teacher' ? 'default' : 'ghost'}
                  className="flex-1 h-7 text-xs"
                  onClick={() => setMessageType('teacher')}
                >
                  Teacher
                </Button>
                <Button
                  size="sm"
                  variant={messageType === 'admin' ? 'default' : 'ghost'}
                  className="flex-1 h-7 text-xs"
                  onClick={() => setMessageType('admin')}
                >
                  Admin
                </Button>
              </div>

              {messageType === 'admin' && (
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    if (!adminUser) { toast.error('No admin available'); return; }
                    const newContact: Contact = {
                      id: adminUser.userId,
                      name: adminUser.name,
                      role: 'admin',
                      roleLabel: 'Principal',
                      avatar: adminUser.avatar,
                    };
                    setSelectedContact(newContact);
                    setMessages([]);
                    setShowNewMessage(false);
                    loadMessages(newContact);
                    if (!contacts.find(c => c.id === newContact.id)) {
                      setContacts(prev => [newContact, ...prev]);
                    }
                  }}
                  disabled={!adminUser}
                >
                  {adminUser ? `Message ${adminUser.name}` : 'No admin available'}
                </Button>
              )}

              {messageType === 'teacher' && (
                <>
                  <Select 
                    value={selectedTeacherId} 
                    onValueChange={setSelectedTeacherId}
                    disabled={loadingTeachers}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={loadingTeachers ? "Loading..." : "Select Teacher"} />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({t.teacherId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedTeacherId && (
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        const teacher = teachers.find(t => t.id === selectedTeacherId);
                        if (!teacher) return;
                        const newContact: Contact = {
                          id: teacher.userId,
                          name: teacher.name,
                          role: 'teacher',
                          roleLabel: `ID: ${teacher.teacherId}`,
                        };
                        setSelectedContact(newContact);
                        setMessages([]);
                        setShowNewMessage(false);
                        setSelectedTeacherId('');
                        loadMessages(newContact);
                        if (!contacts.find(c => c.id === newContact.id)) {
                          setContacts(prev => [newContact, ...prev]);
                        }
                      }}
                    >
                      Message Teacher
                    </Button>
                  )}
                </>
              )}
            </div>
          )}

          <ScrollArea className="h-[500px]">
            {contacts.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <p className="text-sm">No contacts available</p>
                <p className="text-xs mt-1">Use + to start a new conversation</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {contacts.map((contact, index) => (
                  <div
                    key={`${contact.id}-${contact.studentId || index}`}
                    onClick={() => loadMessages(contact)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedContact?.id === contact.id && selectedContact?.studentId === contact.studentId
                        ? 'bg-primary/10'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={contact.avatar} />
                      <AvatarFallback>
                        {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="font-medium text-sm truncate">{contact.name}</p>
                        {getRoleIcon(contact)}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {contact.roleLabel || (contact.studentName ? `Re: ${contact.studentName}` : contact.role)}
                      </p>
                    </div>
                    {contact.unreadCount && contact.unreadCount > 0 && (
                      <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                        {contact.unreadCount}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className={`md:col-span-2 flex flex-col ${isMobile && !selectedContact ? 'hidden' : ''}`}>
        {selectedContact ? (
          <>
            <CardHeader className="py-3 border-b">
              <div className="flex items-center gap-3">
                {isMobile && (
                  <Button variant="ghost" size="icon" className="shrink-0 -ml-2" onClick={() => setSelectedContact(null)}>
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                )}
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedContact.avatar} />
                  <AvatarFallback>
                    {selectedContact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base truncate">{selectedContact.name}</CardTitle>
                    {getRoleIcon(selectedContact)}
                    {selectedContact.roleLabel && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedContact.roleLabel}
                      </Badge>
                    )}
                  </div>
                  {selectedContact.studentName && (
                    <p className="text-xs text-muted-foreground">
                      Regarding: {selectedContact.studentName}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isSender = message.sender_id === currentUserId;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                            isSender
                              ? 'bg-primary text-primary-foreground rounded-br-sm'
                              : 'bg-muted rounded-bl-sm'
                          }`}
                        >
                          {message.attachment_url && message.attachment_type === 'image' && (
                            <div className="mb-2">
                              <img src={message.attachment_url} alt="Shared image" className="rounded-lg max-w-full max-h-48 object-cover cursor-pointer" onClick={() => window.open(message.attachment_url!, '_blank')} />
                            </div>
                          )}
                          {message.attachment_url && message.attachment_type === 'document' && (
                            <a href={message.attachment_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 mb-2 p-2 rounded-lg ${isSender ? 'bg-primary-foreground/10' : 'bg-background/50'}`}>
                              <FileText className="h-4 w-4 shrink-0" />
                              <span className="text-xs underline">Download Document</span>
                              <Download className="h-3 w-3 shrink-0" />
                            </a>
                          )}
                          {message.content && !(message.content === '📷 Image' || message.content === '📎 Document') && (
                            <p className="text-sm">{message.content}</p>
                          )}
                          <div className={`flex items-center gap-1 mt-1 ${isSender ? 'justify-end' : ''}`}>
                            <span className="text-[10px] opacity-70">
                              {format(new Date(message.created_at), 'HH:mm')}
                            </span>
                            {isSender && (
                              message.is_read 
                                ? <CheckCheck className="h-3 w-3 opacity-70" />
                                : <Check className="h-3 w-3 opacity-70" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              <div className="p-4 border-t">
                {attachmentFile && (
                  <div className="flex items-center gap-2 mb-2 p-2 bg-muted rounded-lg text-sm">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate flex-1">{attachmentFile.name}</span>
                    <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setAttachmentFile(null)}>✕</Button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={(e) => { setAttachmentFile(e.target.files?.[0] || null); e.target.value = ''; }} />
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={() => fileInputRef.current?.click()} disabled={sending}>
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    disabled={sending}
                  />
                  <Button onClick={sendMessage} disabled={sending || (!newMessage.trim() && !attachmentFile)}>
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Select a conversation</p>
              <p className="text-sm">Choose a contact to start messaging</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
