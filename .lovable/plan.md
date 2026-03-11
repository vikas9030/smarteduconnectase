

# Fix: Single Student Record Promotion (No Cloning)

## Problem
The current promotion creates a **new student record** (clone), resulting in duplicate students as shown in the screenshot (e.g., "kalyan" appears twice — once in 2-A and once in 3-A). The user wants a single student record that gets **updated in place** with a new class, admission number, and login ID.

## Approach
Replace the INSERT-based cloning logic with a simple UPDATE on the existing student record. No new rows, no parent re-linking needed.

For each promoted student:
1. Generate new admission number reflecting the target class (e.g., `KALYAN-2-A` → `KALYAN-3-A`)
2. **UPDATE** the same student row: set `class_id`, `admission_number`, `login_id`
3. All historical data (attendance, marks, fees) stays intact since it references the same `student_id`

Admission number logic: replace the old class+section portion in the admission number with the new class+section. E.g., `KALYAN-2-A` → `KALYAN-3-A`, or `3A/KALYAN-2-A/2025` → strip to base name `KALYAN`, build `{NAME}-{newClass}-{newSection}`.

## Changes

### `src/pages/admin/StudentPromotion.tsx`
Rewrite `handlePromote`:
- Remove all INSERT logic, parent re-linking, and old record status updates
- Replace with a single `UPDATE` per student setting `class_id`, `admission_number`, and `login_id`
- Retained students just get `status: 'retained'` (unchanged)
- Remove the `login_id: null` cleanup since we're not creating duplicates

### `src/components/parent/ChildSelector.tsx`
- Remove or simplify — no longer needed for historical vs active toggling since there's only one record per student

### Parent pages (`ParentChild.tsx`, `ParentAttendance.tsx`, `ParentExams.tsx`, `ParentDashboard.tsx`)
- Revert any multi-record/historical switching logic added in the previous iteration, since each student is now a single record

## Admission Number Format
Given the screenshot shows format like `KALYAN-2-A`, the new format will be:
- `{StudentName}-{ClassName}-{Section}` → e.g., `KALYAN-3-A`
- This becomes both `admission_number` and `login_id`

## Files to Modify
- `src/pages/admin/StudentPromotion.tsx` — rewrite to UPDATE instead of INSERT
- `src/pages/parent/ParentChild.tsx` — revert historical section
- `src/pages/parent/ParentAttendance.tsx` — revert child selector
- `src/pages/parent/ParentExams.tsx` — revert child selector
- `src/pages/parent/ParentDashboard.tsx` — revert multi-child logic
- `src/components/parent/ChildSelector.tsx` — can be removed or kept minimal

