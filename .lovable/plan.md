

# Multi-Student Fee Selection + Student History Viewer

## Overview
Three changes: (1) allow selecting multiple students in fee creation's individual mode, (2) add a "Student History" page accessible from admin and teacher panels to view a student's complete historical data (attendance, marks, fees), and (3) add a "View Old Data" button on the promotion page.

## Changes

### 1. CreateFeeDialog: Multi-Student Selection
**File: `src/components/fees/CreateFeeDialog.tsx`**
- Replace `selectedStudentId` (string) with `selectedStudentIds` (Set\<string\>)
- Replace the single `<Select>` dropdown with a scrollable checkbox list (same pattern as StudentPromotion page)
- Add Select All / Deselect All button
- Update `handleSubmit` to iterate over all selected student IDs
- Show selected count in summary

### 2. New Student History Page
**New file: `src/pages/admin/StudentHistory.tsx`**
- A dedicated page at `/admin/student-history` where admin can:
  - Search/select any student (including promoted ones) by name or admission number
  - View tabs: Attendance, Exam Marks, Fees — all queried by `student_id` (no class filter)
  - Each tab shows ALL historical records regardless of current class
- Reuse existing components where possible (tables, badges)

**New file: `src/pages/teacher/TeacherStudentHistory.tsx`**
- Same concept at `/teacher/student-history`, but scoped to teacher's assigned classes' students
- Shows attendance, marks history for selected student

### 3. Navigation & Routing
**Files: `src/config/adminSidebar.tsx`, `src/config/teacherSidebar.tsx`, `src/App.tsx`**
- Add "Student History" sidebar item with `History` icon in both admin and teacher sidebars
- Add routes `/admin/student-history` and `/teacher/student-history`

### 4. Promotion Page: View Old Data Button
**File: `src/pages/admin/StudentPromotion.tsx`**
- Add a "View Student History" button that links to `/admin/student-history`
- Shown in the header area near the title

## Technical Details

### Student History Page Query Pattern
```typescript
// Fetch ALL attendance for a student (no class filter)
const { data } = await supabase
  .from('attendance')
  .select('*, students(full_name, admission_number)')
  .eq('student_id', selectedStudentId)
  .order('date', { ascending: false });

// Fetch ALL fees
const { data } = await supabase
  .from('fees')
  .select('*')
  .eq('student_id', selectedStudentId);

// Fetch ALL exam marks
const { data } = await supabase
  .from('exam_marks')
  .select('*, exams(name, exam_date, max_marks, subjects(name), classes(name, section))')
  .eq('student_id', selectedStudentId);
```

### Multi-Student Selection in CreateFeeDialog
```typescript
// Replace single select with checkbox list
const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

// In handleSubmit, use all selected IDs
studentIds = [...selectedStudentIds];
```

## Files to Create
- `src/pages/admin/StudentHistory.tsx`
- `src/pages/teacher/TeacherStudentHistory.tsx`

## Files to Modify
- `src/components/fees/CreateFeeDialog.tsx` — Multi-student checkbox selection
- `src/config/adminSidebar.tsx` — Add Student History link
- `src/config/teacherSidebar.tsx` — Add Student History link
- `src/App.tsx` — Add routes
- `src/pages/admin/StudentPromotion.tsx` — Add "View History" button

