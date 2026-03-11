

# Add Super Admin Role

## Summary
Add a `super_admin` role above `admin`. The first signup becomes super admin. Super admin can create admins, manage all passwords, and toggle system modules on/off globally.

## Database Changes (1 migration)

1. **Add `super_admin` to `app_role` enum**
2. **Create `module_visibility` table** with columns: `id`, `module_key` (unique text), `module_label`, `is_enabled` (default true), `updated_by`, `updated_at`. Seed all ~16 modules (fees, exams, attendance, homework, syllabus, timetable, announcements, leave, complaints, certificates, messages, gallery, leads, weekly-exams, reports, classes, subjects).
3. **RLS on `module_visibility`**: super_admin full CRUD, all authenticated can SELECT.
4. **Update `handle_new_user()` trigger**: first signup creates `super_admin` instead of `admin`.
5. **Update `admin_exists()` function**: also check for `super_admin` so first-signup flow works.
6. **Update all RLS policies** that reference `has_role(..., 'admin')` to also allow `super_admin` — done via a new helper function `is_admin_or_super(uuid)` that checks for either role, then update policies to use it.

## Auth Changes

- **`useAuth.tsx`**: Add `'super_admin'` to `UserRole` type.
- **`Auth.tsx`**: First signup form says "Create Super Admin Account". `navigate(\`/${userRole}\`)` will route to `/super-admin`.
- **`Index.tsx`**: Already uses `navigate(\`/${userRole}\`)` so super_admin routes automatically.

## New Files

| File | Purpose |
|------|---------|
| `src/config/superAdminSidebar.tsx` | Sidebar: Dashboard, Module Control, Manage Admins, Teachers, Students, Settings |
| `src/pages/super-admin/SuperAdminDashboard.tsx` | Overview with stats (admins, teachers, students, modules) |
| `src/pages/super-admin/ModuleControl.tsx` | List all modules with Switch toggles to enable/disable |
| `src/pages/super-admin/ManageAdmins.tsx` | Create admin accounts, list admins, reset admin/super-admin passwords |
| `src/pages/super-admin/SuperAdminSettings.tsx` | Password change, push notifications, school info |
| `src/hooks/useModuleVisibility.ts` | Hook that fetches `module_visibility` table, exports `isModuleEnabled(key)` |
| `supabase/functions/reset-user-password/index.ts` | Edge function: super_admin can reset any admin's password via `auth.admin.updateUserById()` |

## Modified Files

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/super-admin/*` routes |
| `src/components/layouts/DashboardLayout.tsx` | Add `'super_admin'` to roleColor, add gradient |
| `src/components/layouts/MobileBottomNav.tsx` | Add super_admin primary paths |
| `src/config/adminSidebar.tsx` | Filter items by module visibility |
| `src/config/teacherSidebar.tsx` | Filter items by module visibility |
| `src/config/parentSidebar.tsx` | Filter items by module visibility |
| `supabase/functions/create-user/index.ts` | Allow `super_admin` to call; allow creating `admin` role users |
| `README.md` | Document super admin role and module control |

## Module Visibility Integration

Each sidebar config will use the `useModuleVisibility` hook to filter out disabled modules. Each module page will also check visibility and show "This module has been disabled" if toggled off. The mapping between `module_key` and sidebar paths:

```text
module_key        -> sidebar paths affected
fees              -> /*/fees
exams             -> /*/exams
attendance        -> /*/attendance
homework          -> /*/homework
syllabus          -> /*/syllabus
timetable         -> /*/timetable
announcements     -> /*/announcements
leave             -> /*/leave
complaints        -> /*/complaints
certificates      -> /*/certificates
messages          -> /*/messages
gallery           -> /*/gallery
leads             -> /*/leads
weekly-exams      -> /*/weekly-exams
reports           -> /teacher/reports
```

Super admin's own sidebar is NOT affected by toggles — they always see everything.

## Edge Function: `reset-user-password`

- Validates caller is `super_admin` via service role client
- Accepts `{ targetUserId, newPassword }`
- Calls `adminClient.auth.admin.updateUserById(targetUserId, { password: newPassword })`

## Implementation Order

1. Database migration (enum + table + seed + function updates + RLS)
2. `useAuth.tsx` + `useModuleVisibility.ts` hooks
3. Super admin pages + sidebar config
4. `App.tsx` routes
5. `DashboardLayout` + `MobileBottomNav` updates
6. Update existing sidebar configs to filter by module visibility
7. `create-user` + `reset-user-password` edge functions
8. `Auth.tsx` first-signup update
9. README update

