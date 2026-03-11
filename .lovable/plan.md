

# Student Promotion: New ID Per Academic Year

## Current Problem
The current promotion system just updates `class_id` on the same student record. The user wants each promoted student to get a **new student record** (new ID, new class) so the old record with its attendance, marks, and fees stays intact as a historical snapshot. The parent should see both current and past records.

## Approach

### Promotion Logic Change (`StudentPromotion.tsx`)
Instead of `UPDATE students SET class_id = newClass`, the promotion will:
1. For each selected student, **INSERT a new student row** copying over personal details (name, DOB, address, blood group, parent info, photo, user_id) but with the new `class_id` and a new auto-generated admission number (e.g. append year suffix like `STU001-2526`)
2. Mark the old student record as `status: 'promoted'`
3. **Link the same parent** to the new student record by inserting a new `student_parents` row (lookup the parent from the old student's `student_parents` entry)
4. Admin can optionally set a new admission number format or keep the same base number with a year suffix

### Parent Panel Changes
The parent is linked to multiple student records (old + new) via `student_parents`. Currently, most parent pages only use `links[0]` (first child). Changes needed:

**`ParentChild.tsx`** -- Already fetches all linked students. Add visual distinction:
- Show current (active) student prominently
- Show past records (status = 'promoted') in a "Previous Academic Years" section with their old class, so parents can see historical profile

**`ParentAttendance.tsx`** -- Currently uses only `links[0]`. Change to:
- Show a student/year selector when multiple students are linked
- Let parent switch between current and past student records to view attendance history

**`ParentExams.tsx`** -- Same pattern: add student selector to view marks from previous years

**`ParentFees.tsx`** -- Already iterates all children. Will naturally show fees for both old and new student records.

**`ParentDashboard.tsx`** -- Show the active student's data by default, with a note about historical records available

### Admission Number Handling
When creating the new promoted student record, generate the new admission number as: `{oldAdmissionNumber}-{newAcademicYear}` (e.g., `STU001-2526`). The admin can customize this in the promotion UI via an optional "New ID Format" field.

### Files to Modify
- **`src/pages/admin/StudentPromotion.tsx`** -- Rewrite promotion logic to clone student + link parent
- **`src/pages/parent/ParentChild.tsx`** -- Show active vs promoted/historical children separately
- **`src/pages/parent/ParentAttendance.tsx`** -- Add child selector for multi-student parents
- **`src/pages/parent/ParentExams.tsx`** -- Add child selector
- **`src/pages/parent/ParentDashboard.tsx`** -- Default to active child, show historical data access
- **`src/components/AttendanceSummary.tsx`** -- No change needed (already takes `studentId` prop)

### No Database Migration Needed
The existing schema supports this. `student_parents` can have multiple rows linking one parent to multiple students. The `students.status` field already exists for marking records as 'promoted'.

