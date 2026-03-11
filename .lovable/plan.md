

# Student Promotion System + Teacher Delete Student

## Overview

Build a year-end student promotion system that moves students to the next class while preserving all historical data (attendance, marks, fees, syllabus completion). Also add a delete student option for teachers.

## Key Design Decisions

**Data preservation approach**: Student historical data (attendance, exam_marks, fees, student_exam_results) is linked to `student_id`, NOT `class_id` on those tables. So changing a student's `class_id` does NOT lose any historical records. The promotion is simply an update of `students.class_id` to the new class. All old attendance, marks, fees, etc. remain intact and queryable.

No new tables or migrations are needed for the core promotion logic.

## Changes

### 1. New Promotion Page: `src/pages/admin/StudentPromotion.tsx`

A dedicated admin page with two modes:

**Bulk Promote (entire class)**:
- Select "From Class" and "To Class" dropdowns
- Shows all active students in the source class with checkboxes (all selected by default)
- "Promote All" button updates `class_id` for all selected students
- Option to set students who are NOT promoted to `status: 'retained'`

**Individual Promote**:
- Select a class, pick individual students
- Choose destination class for each
- Confirm and promote

**UI Flow**:
1. Admin selects source class → student list loads with checkboxes
2. Admin selects target class (next class in sequence)
3. Preview panel shows: "X students will move from Class 5-A to Class 6-A"
4. Confirm button executes the batch update
5. Success summary with count

**Academic year handling**: When promoting, also update the `academic_year` field on the destination class if needed (admin can set this).

### 2. Add Route and Sidebar Entry

- Add `/admin/promotion` route in `App.tsx`
- Add sidebar item in `adminSidebar.tsx` with label "Promotion" and icon `ArrowUpCircle`, moduleKey `students`

### 3. Teacher Delete Student

**`src/pages/teacher/TeacherStudents.tsx`**:
- Add a "Delete" option in the student action menu (alongside Edit/View)
- Show confirmation dialog warning that this will remove the student record
- On confirm: delete from `student_parents`, then `students` table
- Only allow deleting students the teacher has access to (already enforced by RLS)

### 4. Admin Students Page - Add Create & Delete

**`src/pages/admin/StudentsManagement.tsx`**:
- Currently read-only. Add "Add Student" button (reuse same edge function flow as TeacherStudents)
- Add delete option per student with confirmation dialog
- Delete cleans up: `student_parents`, `attendance`, `exam_marks`, `fees`, `fee_payments` references, then `students` record

### 5. Database Consideration

No schema migration needed. The promotion is a simple `UPDATE students SET class_id = :new_class_id WHERE id IN (...)`. All historical data on attendance, exam_marks, fees, student_exam_results, student_reports tables reference `student_id` directly, so they are unaffected by class changes.

## Files to Create
- `src/pages/admin/StudentPromotion.tsx`

## Files to Modify
- `src/App.tsx` -- add promotion route
- `src/config/adminSidebar.tsx` -- add Promotion menu item
- `src/pages/teacher/TeacherStudents.tsx` -- add delete student with confirmation
- `src/pages/admin/StudentsManagement.tsx` -- add create + delete student capabilities

