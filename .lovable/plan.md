

# Complete Module Control System and Admin Functions

## Issues Identified

1. **Module Control page shows empty** -- The `useModuleVisibility` hook uses module-level caching (`cachedModules`). If the hook ran before the user was authenticated (or during a failed fetch), the cache stays empty and never retries. Need to make caching auth-aware.

2. **Sidebars not filtered by module visibility** -- `adminSidebar.tsx`, `teacherSidebar.tsx`, and `parentSidebar.tsx` export static arrays. They don't filter based on `module_visibility` toggles. This is the core missing piece.

3. **Admin cannot change their own password from super admin panel** -- Super admin can reset admin passwords via the `ManageAdmins` page (using the edge function). Admin can change their own password from `SettingsPage`. Both work, but need to verify the edge function handles super_admin's own password too.

4. **RLS issue for super_admin on many tables** -- Most RLS policies only check `has_role(..., 'admin')` but not `super_admin`. The `is_admin_or_super` function exists but isn't used in policies yet. Super admin hitting admin pages will get permission denied.

## Plan

### 1. Fix `useModuleVisibility` caching
- Reset cache when auth state changes (no user = clear cache)
- Ensure refetch works reliably after login

### 2. Create module-key-to-sidebar-path mapping and filter sidebars
Convert static sidebar exports to functions that accept module visibility data:

**Module key -> path keyword mapping:**
```text
teachers    -> /teachers
students    -> /students
classes     -> /classes
subjects    -> /subjects
attendance  -> /attendance
fees        -> /fees
exams       -> /exams
homework    -> /homework
syllabus    -> /syllabus
timetable   -> /timetable
announcements -> /announcements
leave       -> /leave
complaints  -> /complaints
certificates -> /certificates
messages    -> /messages
gallery     -> /gallery
leads       -> /leads
weekly-exams -> /weekly-exams
reports     -> /reports
notifications -> /notifications
```

**Files to modify:**
- `src/config/adminSidebar.tsx` -- Export a function `getAdminSidebarItems(isModuleEnabled)` that filters items. Keep Dashboard and Settings always visible.
- `src/config/teacherSidebar.tsx` -- Update `getTeacherSidebarItems` to also accept module visibility filter.
- `src/config/parentSidebar.tsx` -- Export a function with filtering. Keep Dashboard, My Child, and Settings always visible.

**Pages using sidebars need to call the hook:**
- All admin pages use `adminSidebarItems` directly. Create a `useAdminSidebar` hook (like `useTeacherSidebar`) that calls `useModuleVisibility` and returns filtered items.
- Similarly for parent pages, create `useParentSidebar`.
- Update `useTeacherSidebar` to incorporate module visibility.

### 3. Update RLS policies for super_admin access
Run a migration to update key table policies to use `is_admin_or_super()` instead of `has_role(..., 'admin')`:
- `announcements`, `app_settings`, `attendance`, `classes`, `complaints`, `fees`, `fee_payments`, `homework`, `exams`, `exam_marks`, `gallery_folders`, `gallery_images`, `leave_requests`, `leads`, `lead_call_logs`, `lead_status_history`, `messages`, `students`, `student_parents`, `subjects`, `teachers`, `certificate_requests`, `question_papers`, `questions`, `student_exam_results`, `student_reports`, `settings_audit_log`, `notifications`

### 4. Ensure ManageAdmins handles super_admin's own password reset
The `reset-user-password` edge function already allows super_admin to reset any password. The `ManageAdmins` page lists admins and super_admins with reset buttons. This should work.

### 5. Admin Settings password change
Already works via `supabase.auth.updateUser()`. No changes needed.

## Files to Create
- `src/hooks/useAdminSidebar.ts`
- `src/hooks/useParentSidebar.ts`

## Files to Modify
- `src/hooks/useModuleVisibility.ts` -- Fix caching, clear on auth change
- `src/config/adminSidebar.tsx` -- Add filtering function
- `src/config/parentSidebar.tsx` -- Add filtering function  
- `src/config/teacherSidebar.tsx` -- Add module visibility filtering
- `src/hooks/useTeacherSidebar.ts` -- Add module visibility
- All admin page files (~20) -- Use `useAdminSidebar()` instead of static `adminSidebarItems`
- All parent page files (~16) -- Use `useParentSidebar()` instead of static `parentSidebarItems`
- All teacher page files (~15) -- Already use `useTeacherSidebar()` or static import; update
- Database migration -- Update RLS policies to use `is_admin_or_super()`

## Implementation Order
1. Database migration for RLS policy updates
2. Fix `useModuleVisibility` hook
3. Update sidebar configs with filtering functions
4. Create `useAdminSidebar` and `useParentSidebar` hooks
5. Update all page imports to use the new hooks
6. Verify ManageAdmins password reset flow

