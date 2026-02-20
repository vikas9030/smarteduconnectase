-- Create app roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'parent');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Create classes table
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  section TEXT NOT NULL,
  academic_year TEXT NOT NULL DEFAULT '2024-2025',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(name, section, academic_year)
);

-- Create teachers table
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  teacher_id TEXT NOT NULL UNIQUE,
  qualification TEXT,
  subjects TEXT[],
  joining_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create teacher_classes junction table
CREATE TABLE public.teacher_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(teacher_id, class_id)
);

-- Create students table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_number TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  photo_url TEXT,
  date_of_birth DATE,
  class_id UUID REFERENCES public.classes(id),
  address TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create parents table
CREATE TABLE public.parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create student_parents junction table
CREATE TABLE public.student_parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES public.parents(id) ON DELETE CASCADE NOT NULL,
  relationship TEXT DEFAULT 'parent',
  UNIQUE(student_id, parent_id)
);

-- Create subjects table
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create timetable table
CREATE TABLE public.timetable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
  period_number INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  subject_id UUID REFERENCES public.subjects(id),
  teacher_id UUID REFERENCES public.teachers(id),
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create attendance table
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  session TEXT CHECK (session IN ('morning', 'afternoon')),
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'half_day')),
  reason TEXT,
  marked_by UUID REFERENCES public.teachers(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(student_id, date, session)
);

-- Create homework table
CREATE TABLE public.homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  attachment_url TEXT,
  created_by UUID REFERENCES public.teachers(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create exams table
CREATE TABLE public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  class_id UUID REFERENCES public.classes(id),
  subject_id UUID REFERENCES public.subjects(id),
  exam_date DATE,
  max_marks INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create exam_marks table
CREATE TABLE public.exam_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  marks_obtained DECIMAL(5,2),
  grade TEXT,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(exam_id, student_id)
);

-- Create announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_audience TEXT[] DEFAULT ARRAY['all'],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create leave_requests table
CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('student', 'teacher')),
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create fees table
CREATE TABLE public.fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  fee_type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid', 'partial')),
  receipt_number TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create complaints table
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by UUID REFERENCES auth.users(id) NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create certificate_requests table
CREATE TABLE public.certificate_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  certificate_type TEXT NOT NULL CHECK (certificate_type IN ('bonafide', 'transfer', 'character')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create student_reports table (discipline/academic/health)
CREATE TABLE public.student_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('discipline', 'academic', 'health')),
  description TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
  parent_visible BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.teachers(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_reports ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for classes
CREATE POLICY "Authenticated users can view classes" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage classes" ON public.classes FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for teachers
CREATE POLICY "Authenticated users can view teachers" ON public.teachers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can view own record" ON public.teachers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage teachers" ON public.teachers FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for teacher_classes
CREATE POLICY "Authenticated users can view teacher_classes" ON public.teacher_classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage teacher_classes" ON public.teacher_classes FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for students
CREATE POLICY "Teachers can view students in their classes" ON public.students FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'teacher') OR
  EXISTS (
    SELECT 1 FROM public.student_parents sp
    JOIN public.parents p ON sp.parent_id = p.id
    WHERE sp.student_id = students.id AND p.user_id = auth.uid()
  )
);
CREATE POLICY "Admins and teachers can manage students" ON public.students FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')
);

-- RLS Policies for parents
CREATE POLICY "Parents can view own record" ON public.parents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage parents" ON public.parents FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can view parents" ON public.parents FOR SELECT USING (public.has_role(auth.uid(), 'teacher'));

-- RLS Policies for student_parents
CREATE POLICY "Parents can view own links" ON public.student_parents FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.parents WHERE id = student_parents.parent_id AND user_id = auth.uid())
);
CREATE POLICY "Admins and teachers can manage student_parents" ON public.student_parents FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')
);

-- RLS Policies for subjects
CREATE POLICY "Authenticated users can view subjects" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage subjects" ON public.subjects FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for timetable
CREATE POLICY "Authenticated users can view published timetable" ON public.timetable FOR SELECT TO authenticated USING (
  is_published = true OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')
);
CREATE POLICY "Admins can manage timetable" ON public.timetable FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for attendance
CREATE POLICY "Teachers can manage attendance" ON public.attendance FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')
);
CREATE POLICY "Parents can view their children's attendance" ON public.attendance FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.student_parents sp
    JOIN public.parents p ON sp.parent_id = p.id
    WHERE sp.student_id = attendance.student_id AND p.user_id = auth.uid()
  )
);

-- RLS Policies for homework
CREATE POLICY "Teachers can manage homework" ON public.homework FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')
);
CREATE POLICY "Students/Parents can view homework" ON public.homework FOR SELECT TO authenticated USING (true);

-- RLS Policies for exams
CREATE POLICY "Staff can manage exams" ON public.exams FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')
);
CREATE POLICY "All can view exams" ON public.exams FOR SELECT TO authenticated USING (true);

-- RLS Policies for exam_marks
CREATE POLICY "Teachers can manage marks" ON public.exam_marks FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')
);
CREATE POLICY "Parents can view their children's marks" ON public.exam_marks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.student_parents sp
    JOIN public.parents p ON sp.parent_id = p.id
    WHERE sp.student_id = exam_marks.student_id AND p.user_id = auth.uid()
  )
);

-- RLS Policies for announcements
CREATE POLICY "All can view announcements" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and teachers can create announcements" ON public.announcements FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')
);
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for leave_requests
CREATE POLICY "Users can view own leave requests" ON public.leave_requests FOR SELECT USING (
  (request_type = 'teacher' AND EXISTS (SELECT 1 FROM public.teachers WHERE id = leave_requests.teacher_id AND user_id = auth.uid())) OR
  (request_type = 'student' AND EXISTS (
    SELECT 1 FROM public.student_parents sp
    JOIN public.parents p ON sp.parent_id = p.id
    WHERE sp.student_id = leave_requests.student_id AND p.user_id = auth.uid()
  )) OR
  public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Users can create leave requests" ON public.leave_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can manage leave requests" ON public.leave_requests FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for fees
CREATE POLICY "Parents can view their children's fees" ON public.fees FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.student_parents sp
    JOIN public.parents p ON sp.parent_id = p.id
    WHERE sp.student_id = fees.student_id AND p.user_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Admins can manage fees" ON public.fees FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for complaints
CREATE POLICY "Users can view own complaints" ON public.complaints FOR SELECT USING (submitted_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can submit complaints" ON public.complaints FOR INSERT TO authenticated WITH CHECK (submitted_by = auth.uid());
CREATE POLICY "Admins can manage complaints" ON public.complaints FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for certificate_requests
CREATE POLICY "Parents can view own requests" ON public.certificate_requests FOR SELECT USING (
  requested_by = auth.uid() OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Parents can create requests" ON public.certificate_requests FOR INSERT TO authenticated WITH CHECK (requested_by = auth.uid());
CREATE POLICY "Admins can manage certificates" ON public.certificate_requests FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for student_reports
CREATE POLICY "Teachers can manage reports" ON public.student_reports FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')
);
CREATE POLICY "Parents can view their children's visible reports" ON public.student_reports FOR SELECT USING (
  parent_visible = true AND EXISTS (
    SELECT 1 FROM public.student_parents sp
    JOIN public.parents p ON sp.parent_id = p.id
    WHERE sp.student_id = student_reports.student_id AND p.user_id = auth.uid()
  )
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();