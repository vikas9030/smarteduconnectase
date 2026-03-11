

# Fix Module-Aware Quick Actions, Student Creation & Login Issues

## Problems Identified

1. **Quick actions on dashboards ignore module toggles** -- Admin, Teacher, and Parent dashboards have hardcoded quick action buttons (e.g., "Add Teacher", "Mark Attendance", "Enter Marks") that navigate to module pages even when those modules are disabled by Super Admin.

2. **`create-student` edge function blocks super_admin** -- Line 44 only allows `["admin", "teacher"]`, so super_admin can't create students. Also missing extended CORS headers.

3. **`create-user` edge function duplicate profile error** -- The `handle_new_user` trigger already creates a profile, then the edge function tries `INSERT` again causing a `23505` duplicate key error. Should use `upsert` instead.

4. **Teacher/Student login "Invalid credentials"** -- Auth logs confirm the teacher user (dileep@gmail.com) was created successfully. The "Invalid login credentials" errors are due to incorrect passwords being entered. No code bug here -- but the `create-student` function's CORS headers are incomplete which could cause student creation to fail silently, meaning no students exist yet to test parent login.

## Changes

### 1. Dashboard Quick Actions -- Filter by Module Visibility

**`src/pages/admin/AdminDashboard.tsx`**
- Import `useModuleVisibility`
- Add `moduleKey` to each quick action item:
  - "Add Teacher" → `teachers`
  - "View Students" → `students`
  - "Announcement" → `announcements`
  - "View Reports" → `attendance`
- Filter the array: `.filter(a => !a.moduleKey || isModuleEnabled(a.moduleKey))`

**`src/pages/teacher/TeacherDashboard.tsx`**
- Import `useModuleVisibility`
- Add `moduleKey` to each quick action:
  - "Mark Attendance" → `attendance`
  - "Add Homework" → `homework`
  - "Enter Marks" → `exams`
  - "Student Report" → `reports`
  - "Add Student" → `students`
  - "Messages" → `messages`
- Filter same way

**`src/pages/parent/ParentDashboard.tsx`**
- Parent dashboard has no quick action buttons (it shows child profile, stats, exams, announcements), so no change needed. However, the stat cards for "Pending Homework", "Upcoming Exams", "Unpaid Fees" should still show even when modules are off (they're informational, not navigational).

### 2. Fix `create-student` Edge Function
**`supabase/functions/create-student/index.ts`**
- Update CORS headers to include all required Supabase client headers
- Update role check (line 44) to include `super_admin`: `["admin", "teacher", "super_admin"]`

### 3. Fix `create-user` Edge Function -- Profile Upsert
**`supabase/functions/create-user/index.ts`**
- Change profile `insert` to `upsert` on `user_id` to avoid duplicate key errors when the trigger has already created the profile

### 4. Fix `syllabus` RLS for Super Admin
The `syllabus` table still uses `has_role(auth.uid(), 'admin')` instead of `is_admin_or_super()`. Add a migration to fix this.

## Implementation Order
1. Fix edge functions (`create-student` CORS + role, `create-user` upsert)
2. Database migration for `syllabus` RLS
3. Update Admin and Teacher dashboard quick actions with module filtering

