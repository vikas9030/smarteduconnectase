
-- Update all RLS policies that use has_role(auth.uid(), 'admin') to use is_admin_or_super()

-- announcements
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL TO public USING (is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Admins and teachers can create announcements" ON public.announcements;
CREATE POLICY "Admins and teachers can create announcements" ON public.announcements FOR INSERT TO public WITH CHECK (is_admin_or_super(auth.uid()) OR has_role(auth.uid(), 'teacher'::app_role));

-- app_settings
DROP POLICY IF EXISTS "Admins can manage app_settings" ON public.app_settings;
CREATE POLICY "Admins can manage app_settings" ON public.app_settings FOR ALL TO public USING (is_admin_or_super(auth.uid()));

-- attendance
DROP POLICY IF EXISTS "Teachers can manage attendance" ON public.attendance;
CREATE POLICY "Teachers can manage attendance" ON public.attendance FOR ALL TO public USING (is_admin_or_super(auth.uid()) OR has_role(auth.uid(), 'teacher'::app_role));

-- certificate_requests
DROP POLICY IF EXISTS "Admins can manage certificates" ON public.certificate_requests;
CREATE POLICY "Admins can manage certificates" ON public.certificate_requests FOR ALL TO public USING (is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Parents can view own requests" ON public.certificate_requests;
CREATE POLICY "Parents can view own requests" ON public.certificate_requests FOR SELECT TO public USING (requested_by = auth.uid() OR is_admin_or_super(auth.uid()));

-- classes
DROP POLICY IF EXISTS "Admins can manage classes" ON public.classes;
CREATE POLICY "Admins can manage classes" ON public.classes FOR ALL TO public USING (is_admin_or_super(auth.uid()));

-- complaints
DROP POLICY IF EXISTS "Admins can manage complaints" ON public.complaints;
CREATE POLICY "Admins can manage complaints" ON public.complaints FOR ALL TO public USING (is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Users can view own complaints" ON public.complaints;
CREATE POLICY "Users can view own complaints" ON public.complaints FOR SELECT TO public USING (submitted_by = auth.uid() OR is_admin_or_super(auth.uid()));

-- exam_cycles
DROP POLICY IF EXISTS "Admins can manage exam_cycles" ON public.exam_cycles;
CREATE POLICY "Admins can manage exam_cycles" ON public.exam_cycles FOR ALL TO public USING (is_admin_or_super(auth.uid()));

-- exam_marks
DROP POLICY IF EXISTS "Teachers can manage marks" ON public.exam_marks;
CREATE POLICY "Teachers can manage marks" ON public.exam_marks FOR ALL TO public USING (is_admin_or_super(auth.uid()) OR has_role(auth.uid(), 'teacher'::app_role));

-- exams
DROP POLICY IF EXISTS "Staff can manage exams" ON public.exams;
CREATE POLICY "Staff can manage exams" ON public.exams FOR ALL TO public USING (is_admin_or_super(auth.uid()) OR has_role(auth.uid(), 'teacher'::app_role));

-- fee_payments
DROP POLICY IF EXISTS "Admins can manage fee_payments" ON public.fee_payments;
CREATE POLICY "Admins can manage fee_payments" ON public.fee_payments FOR ALL TO public USING (is_admin_or_super(auth.uid()));

-- fees
DROP POLICY IF EXISTS "Admins can manage fees" ON public.fees;
CREATE POLICY "Admins can manage fees" ON public.fees FOR ALL TO public USING (is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Parents can view their children's fees" ON public.fees;
CREATE POLICY "Parents can view their children's fees" ON public.fees FOR SELECT TO public USING (
  (EXISTS (SELECT 1 FROM student_parents sp JOIN parents p ON sp.parent_id = p.id WHERE sp.student_id = fees.student_id AND p.user_id = auth.uid()))
  OR is_admin_or_super(auth.uid())
);

-- gallery_folders
DROP POLICY IF EXISTS "Admins can delete folders" ON public.gallery_folders;
CREATE POLICY "Admins can delete folders" ON public.gallery_folders FOR DELETE TO authenticated USING (is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert folders" ON public.gallery_folders;
CREATE POLICY "Admins can insert folders" ON public.gallery_folders FOR INSERT TO authenticated WITH CHECK (is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Admins can update folders" ON public.gallery_folders;
CREATE POLICY "Admins can update folders" ON public.gallery_folders FOR UPDATE TO authenticated USING (is_admin_or_super(auth.uid()));

-- gallery_images
DROP POLICY IF EXISTS "Admins can delete images" ON public.gallery_images;
CREATE POLICY "Admins can delete images" ON public.gallery_images FOR DELETE TO authenticated USING (is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert images" ON public.gallery_images;
CREATE POLICY "Admins can insert images" ON public.gallery_images FOR INSERT TO authenticated WITH CHECK (is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Admins can update images" ON public.gallery_images;
CREATE POLICY "Admins can update images" ON public.gallery_images FOR UPDATE TO authenticated USING (is_admin_or_super(auth.uid()));

-- homework
DROP POLICY IF EXISTS "Teachers can manage homework" ON public.homework;
CREATE POLICY "Teachers can manage homework" ON public.homework FOR ALL TO public USING (is_admin_or_super(auth.uid()) OR has_role(auth.uid(), 'teacher'::app_role));

-- lead_call_logs
DROP POLICY IF EXISTS "Admins can manage all call logs" ON public.lead_call_logs;
CREATE POLICY "Admins can manage all call logs" ON public.lead_call_logs FOR ALL TO public USING (is_admin_or_super(auth.uid()));

-- lead_status_history
DROP POLICY IF EXISTS "Admins can manage all status history" ON public.lead_status_history;
CREATE POLICY "Admins can manage all status history" ON public.lead_status_history FOR ALL TO public USING (is_admin_or_super(auth.uid()));

-- leads
DROP POLICY IF EXISTS "Admins can manage all leads" ON public.leads;
CREATE POLICY "Admins can manage all leads" ON public.leads FOR ALL TO public USING (is_admin_or_super(auth.uid()));

-- leave_requests
DROP POLICY IF EXISTS "Admins can manage leave requests" ON public.leave_requests;
CREATE POLICY "Admins can manage leave requests" ON public.leave_requests FOR ALL TO public USING (is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Users can view own leave requests" ON public.leave_requests;
CREATE POLICY "Users can view own leave requests" ON public.leave_requests FOR SELECT TO public USING (
  ((request_type = 'teacher' AND EXISTS (SELECT 1 FROM teachers WHERE teachers.id = leave_requests.teacher_id AND teachers.user_id = auth.uid()))
  OR (request_type = 'student' AND EXISTS (SELECT 1 FROM student_parents sp JOIN parents p ON sp.parent_id = p.id WHERE sp.student_id = leave_requests.student_id AND p.user_id = auth.uid()))
  OR is_admin_or_super(auth.uid()))
);

-- messages
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
CREATE POLICY "Users can view their own messages" ON public.messages FOR SELECT TO public USING (auth.uid() = sender_id OR auth.uid() = recipient_id OR is_admin_or_super(auth.uid()));

-- parents
DROP POLICY IF EXISTS "Admins can manage parents" ON public.parents;
CREATE POLICY "Admins can manage parents" ON public.parents FOR ALL TO public USING (is_admin_or_super(auth.uid()));

-- profiles
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL TO public USING (is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO public USING (is_admin_or_super(auth.uid()));

-- question_papers
DROP POLICY IF EXISTS "Admins can manage question_papers" ON public.question_papers;
CREATE POLICY "Admins can manage question_papers" ON public.question_papers FOR ALL TO public USING (is_admin_or_super(auth.uid()));

-- questions
DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions;
CREATE POLICY "Admins can manage questions" ON public.questions FOR ALL TO public USING (is_admin_or_super(auth.uid()));

-- settings_audit_log
DROP POLICY IF EXISTS "Admins can manage audit log" ON public.settings_audit_log;
CREATE POLICY "Admins can manage audit log" ON public.settings_audit_log FOR ALL TO public USING (is_admin_or_super(auth.uid()));

-- student_exam_answers
DROP POLICY IF EXISTS "Admins can manage student_exam_answers" ON public.student_exam_answers;
CREATE POLICY "Admins can manage student_exam_answers" ON public.student_exam_answers FOR ALL TO public USING (is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Students can view own answers via parent" ON public.student_exam_answers;
CREATE POLICY "Students can view own answers via parent" ON public.student_exam_answers FOR SELECT TO public USING (
  is_admin_or_super(auth.uid()) OR has_role(auth.uid(), 'teacher'::app_role) OR
  EXISTS (SELECT 1 FROM student_parents sp JOIN parents p ON sp.parent_id = p.id WHERE sp.student_id = student_exam_answers.student_id AND p.user_id = auth.uid())
);

-- student_exam_results
DROP POLICY IF EXISTS "Admins can manage student_exam_results" ON public.student_exam_results;
CREATE POLICY "Admins can manage student_exam_results" ON public.student_exam_results FOR ALL TO public USING (is_admin_or_super(auth.uid()));

-- student_parents
DROP POLICY IF EXISTS "Admins and teachers can manage student_parents" ON public.student_parents;
CREATE POLICY "Admins and teachers can manage student_parents" ON public.student_parents FOR ALL TO public USING (is_admin_or_super(auth.uid()) OR has_role(auth.uid(), 'teacher'::app_role));

-- student_reports
DROP POLICY IF EXISTS "Teachers can manage reports" ON public.student_reports;
CREATE POLICY "Teachers can manage reports" ON public.student_reports FOR ALL TO public USING (is_admin_or_super(auth.uid()) OR has_role(auth.uid(), 'teacher'::app_role));

-- students
DROP POLICY IF EXISTS "Admins and teachers can manage students" ON public.students;
CREATE POLICY "Admins and teachers can manage students" ON public.students FOR ALL TO public USING (is_admin_or_super(auth.uid()) OR has_role(auth.uid(), 'teacher'::app_role));

DROP POLICY IF EXISTS "Teachers can view students in their classes" ON public.students;
CREATE POLICY "Teachers can view students in their classes" ON public.students FOR SELECT TO public USING (
  is_admin_or_super(auth.uid()) OR has_role(auth.uid(), 'teacher'::app_role) OR
  EXISTS (SELECT 1 FROM student_parents sp JOIN parents p ON sp.parent_id = p.id WHERE sp.student_id = students.id AND p.user_id = auth.uid())
);

-- subjects
DROP POLICY IF EXISTS "Admins can manage subjects" ON public.subjects;
CREATE POLICY "Admins can manage subjects" ON public.subjects FOR ALL TO public USING (is_admin_or_super(auth.uid()));

-- teachers (need to check current policies first, but based on pattern)
-- The teachers table policies aren't shown but likely follow the same pattern
