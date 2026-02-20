
-- =============================================
-- PHASE 1: Extend existing tables
-- =============================================

-- Add academic_type to classes
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS academic_type text DEFAULT 'general';

-- Add category and exam_type to subjects
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS category text DEFAULT 'general';
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS exam_type text DEFAULT NULL;

-- =============================================
-- PHASE 2: Syllabus System
-- =============================================

CREATE TABLE public.syllabus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  syllabus_type text NOT NULL DEFAULT 'general',
  exam_type text DEFAULT NULL,
  chapter_name text NOT NULL,
  topic_name text NOT NULL,
  week_number integer DEFAULT NULL,
  cycle_id uuid DEFAULT NULL,
  schedule_date date DEFAULT NULL,
  schedule_time time DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid DEFAULT NULL
);

ALTER TABLE public.syllabus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view syllabus" ON public.syllabus
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage syllabus" ON public.syllabus
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can manage syllabus" ON public.syllabus
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Teachers can update syllabus" ON public.syllabus
  FOR UPDATE USING (has_role(auth.uid(), 'teacher'::app_role));

-- =============================================
-- PHASE 3: Syllabus Schedule
-- =============================================

CREATE TABLE public.syllabus_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syllabus_id uuid NOT NULL REFERENCES public.syllabus(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.syllabus_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view syllabus_schedule" ON public.syllabus_schedule
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage syllabus_schedule" ON public.syllabus_schedule
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can manage own schedule" ON public.syllabus_schedule
  FOR ALL USING (has_role(auth.uid(), 'teacher'::app_role));

-- =============================================
-- PHASE 4: Multi-Teacher Mapping
-- =============================================

CREATE TABLE public.teacher_syllabus_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  syllabus_id uuid NOT NULL REFERENCES public.syllabus(id) ON DELETE CASCADE,
  role_type text NOT NULL DEFAULT 'lead',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.teacher_syllabus_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view teacher_syllabus_map" ON public.teacher_syllabus_map
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage teacher_syllabus_map" ON public.teacher_syllabus_map
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- PHASE 5: Exam Cycles (Competitive)
-- =============================================

CREATE TABLE public.exam_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_type text NOT NULL,
  cycle_number integer NOT NULL DEFAULT 1,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  created_by uuid DEFAULT NULL
);

ALTER TABLE public.exam_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view exam_cycles" ON public.exam_cycles
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage exam_cycles" ON public.exam_cycles
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add cycle_id FK to syllabus
ALTER TABLE public.syllabus ADD CONSTRAINT syllabus_cycle_id_fkey
  FOREIGN KEY (cycle_id) REFERENCES public.exam_cycles(id) ON DELETE SET NULL;

-- =============================================
-- PHASE 6: Weekly Exams
-- =============================================

CREATE TABLE public.weekly_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  syllabus_type text NOT NULL DEFAULT 'general',
  cycle_id uuid REFERENCES public.exam_cycles(id) ON DELETE SET NULL,
  week_number integer DEFAULT NULL,
  exam_title text NOT NULL,
  exam_date date NOT NULL,
  exam_time time NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  total_marks integer NOT NULL DEFAULT 100,
  negative_marking boolean DEFAULT false,
  negative_marks_value numeric DEFAULT 0,
  reminder_enabled boolean DEFAULT true,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz DEFAULT now(),
  created_by uuid DEFAULT NULL
);

ALTER TABLE public.weekly_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view weekly_exams" ON public.weekly_exams
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage weekly_exams" ON public.weekly_exams
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view weekly_exams" ON public.weekly_exams
  FOR SELECT USING (has_role(auth.uid(), 'teacher'::app_role));

-- Link exams to syllabus topics
CREATE TABLE public.weekly_exam_syllabus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.weekly_exams(id) ON DELETE CASCADE,
  syllabus_id uuid NOT NULL REFERENCES public.syllabus(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.weekly_exam_syllabus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view weekly_exam_syllabus" ON public.weekly_exam_syllabus
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage weekly_exam_syllabus" ON public.weekly_exam_syllabus
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- PHASE 7: Question Papers & Questions
-- =============================================

CREATE TABLE public.question_papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.weekly_exams(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  uploaded_by uuid DEFAULT NULL,
  total_questions integer NOT NULL DEFAULT 0,
  total_marks integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.question_papers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view question_papers" ON public.question_papers
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage question_papers" ON public.question_papers
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can manage question_papers" ON public.question_papers
  FOR ALL USING (has_role(auth.uid(), 'teacher'::app_role));

CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_paper_id uuid NOT NULL REFERENCES public.question_papers(id) ON DELETE CASCADE,
  question_number integer NOT NULL DEFAULT 1,
  question_type text NOT NULL DEFAULT 'mcq',
  question_text text NOT NULL,
  option_a text DEFAULT NULL,
  option_b text DEFAULT NULL,
  option_c text DEFAULT NULL,
  option_d text DEFAULT NULL,
  correct_answer text DEFAULT NULL,
  marks integer NOT NULL DEFAULT 1,
  explanation text DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Students should NOT see correct answers before exam
CREATE POLICY "Admins can manage questions" ON public.questions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can manage questions" ON public.questions
  FOR ALL USING (has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Authenticated can view questions" ON public.questions
  FOR SELECT USING (true);

-- =============================================
-- PHASE 8: Student Answers
-- =============================================

CREATE TABLE public.student_exam_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.weekly_exams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_answer text DEFAULT NULL,
  is_correct boolean DEFAULT NULL,
  marks_awarded numeric DEFAULT 0,
  answered_at timestamptz DEFAULT now(),
  UNIQUE(exam_id, student_id, question_id)
);

ALTER TABLE public.student_exam_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own answers via parent" ON public.student_exam_answers
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'teacher'::app_role) OR
    EXISTS (
      SELECT 1 FROM student_parents sp
      JOIN parents p ON sp.parent_id = p.id
      WHERE sp.student_id = student_exam_answers.student_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage student_exam_answers" ON public.student_exam_answers
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can manage student_exam_answers" ON public.student_exam_answers
  FOR ALL USING (has_role(auth.uid(), 'teacher'::app_role));

-- Allow parents to insert answers on behalf of students
CREATE POLICY "Parents can submit answers for their children" ON public.student_exam_answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM student_parents sp
      JOIN parents p ON sp.parent_id = p.id
      WHERE sp.student_id = student_exam_answers.student_id
      AND p.user_id = auth.uid()
    )
  );

-- =============================================
-- PHASE 9: Student Exam Results
-- =============================================

CREATE TABLE public.student_exam_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.weekly_exams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  obtained_marks numeric NOT NULL DEFAULT 0,
  total_marks numeric NOT NULL DEFAULT 0,
  percentage numeric DEFAULT 0,
  rank integer DEFAULT NULL,
  submitted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(exam_id, student_id)
);

ALTER TABLE public.student_exam_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage student_exam_results" ON public.student_exam_results
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can manage student_exam_results" ON public.student_exam_results
  FOR ALL USING (has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Parents can view their children results" ON public.student_exam_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_parents sp
      JOIN parents p ON sp.parent_id = p.id
      WHERE sp.student_id = student_exam_results.student_id
      AND p.user_id = auth.uid()
    )
  );

-- =============================================
-- INDEXES for performance
-- =============================================

CREATE INDEX idx_syllabus_class ON public.syllabus(class_id);
CREATE INDEX idx_syllabus_subject ON public.syllabus(subject_id);
CREATE INDEX idx_syllabus_type ON public.syllabus(syllabus_type);
CREATE INDEX idx_syllabus_schedule_date ON public.syllabus_schedule(date);
CREATE INDEX idx_weekly_exams_class ON public.weekly_exams(class_id);
CREATE INDEX idx_weekly_exams_status ON public.weekly_exams(status);
CREATE INDEX idx_student_exam_answers_exam ON public.student_exam_answers(exam_id);
CREATE INDEX idx_student_exam_results_exam ON public.student_exam_results(exam_id);
CREATE INDEX idx_student_exam_results_student ON public.student_exam_results(student_id);
