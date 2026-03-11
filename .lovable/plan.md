

# View Historical Student Data Across All Sections

## Problem
Since promotion is now in-place (same student ID, class_id updated), all historical data (attendance, marks, fees) remains linked to the student. However:

1. **Admin Attendance page** filters records by `students.class_id` — after promotion, the student's old attendance won't appear under their old class filter
2. **Admin Fees page** filters by class via `students.classes` join — same issue
3. **Parent pages** already query by `student_id` directly, so they naturally see all historical data — but there's no way to distinguish "which class year" a record belongs to

The attendance/fees/marks tables don't store `class_id` directly — they rely on the student's current class via joins.

## Approach: Add "Student Search" Filter

Rather than storing class_id on every record (which would require a migration and backfill), add a **student name/ID search** across admin pages that bypasses class filters and shows all data for a specific student. Additionally, add date-range awareness so admins can view records from any time period.

### Changes

**`src/pages/admin/AttendanceManagement.tsx`**
- Add a "Search Student" input that filters attendance records by student name or admission number
- When a student search is active, show ALL their attendance regardless of class filter (ignore class filter)
- This lets admins type a promoted student's name and see their full history

**`src/pages/admin/FeesManagement.tsx`**
- Already has class-based filtering. Add a student name search that, when active, shows all fees for that student across all classes
- The fees table stores `student_id` directly, so all historical fees are already there — just need to not filter by class when searching by student

**`src/pages/admin/ExamsManagement.tsx` (ExamResultsView)**
- The results view already has student filtering. Ensure it works across class boundaries by not restricting to current class when a student is explicitly selected

**`src/pages/parent/ParentAttendance.tsx`**
- Already fetches by `student_id` — all historical attendance is visible. No change needed.

**`src/pages/parent/ParentExams.tsx`**
- Already fetches marks/results by `student_id` — all historical results are visible. No change needed.

**`src/pages/parent/ParentFees.tsx`**
- Already iterates all children and shows fees by `student_id`. No change needed.

### Admin Attendance Specific Changes
- Current behavior: fetches all attendance for the month, then filters by `students.class_id`
- New behavior: When `searchQuery` is not empty, skip the class filter and instead filter by student name/admission number match
- Add the search input to the UI (it already has `searchQuery` state for day records, extend it to work globally)

### Admin Fees Specific Changes
- Current behavior: has class filter tabs + search
- New behavior: Add a toggle or auto-behavior where searching by student name shows all their fees regardless of class filter

### Summary
- Modify 2 admin pages (Attendance, Fees) to allow student-based search that bypasses class filters
- Parent pages already work correctly — no changes needed
- This is a UI filter change only, no database migration required

## Files to Modify
- `src/pages/admin/AttendanceManagement.tsx` — Add student search that bypasses class filter
- `src/pages/admin/FeesManagement.tsx` — Student search bypasses class filter

