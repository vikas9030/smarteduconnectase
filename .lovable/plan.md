

## Add Notifications Page with Date Filter for All Roles

### Overview
Create a full Notifications page accessible from the sidebar in Admin, Teacher, and Parent panels. The page will display all notification history with a **date picker filter** to view notifications from any specific date -- past, present, or future reminders. Users can also mark as read and delete notifications.

### What will be built

**1. Database Migration -- DELETE RLS Policy**
- Add a DELETE policy on the `notifications` table so users can delete their own notifications (`auth.uid() = user_id`)
- Also add a homework notification trigger for parents (from the previously approved plan)

**2. Shared Notifications Component** (`src/components/notifications/NotificationsPage.tsx`)
- Full-page notification list with all history (limit 100, ordered by newest first)
- **Date filter** using a date picker (Popover + Calendar):
  - Pick any date to see only notifications from that day
  - "Clear" button to reset and show all notifications
  - Shows "Previous", "Today", or "Upcoming" label based on the selected date
- Each notification shows: type icon, title, message, timestamp, read/unread status
- Actions per notification: click to mark read + navigate, trash icon to delete
- Bulk actions: "Mark All Read" and "Delete All Read" buttons in header
- Uses the same icon mapping as the existing NotificationBell component
- Empty state when no notifications match

**3. Role-Specific Page Wrappers**
- `src/pages/admin/AdminNotifications.tsx` -- wraps in admin DashboardLayout
- `src/pages/teacher/TeacherNotifications.tsx` -- wraps in teacher DashboardLayout  
- `src/pages/parent/ParentNotifications.tsx` -- wraps in parent DashboardLayout

**4. Sidebar Updates**
- Add "Notifications" entry (Bell icon) to all three sidebar configs, placed before Messages

**5. Route Registration** (`src/App.tsx`)
- `/admin/notifications`
- `/teacher/notifications`
- `/parent/notifications`

**6. NotificationBell Update**
- Add `homework` type icon (BookOpen, yellow)

### Technical Details

**Date Filter Logic:**
```
- User picks a date from the calendar
- Notifications are filtered client-side: compare notification created_at date with selected date
- Quick filter chips: "All", "Today", with date picker for custom date
- The filter shows notifications created on that specific date
```

**Database Migration:**
```sql
-- DELETE policy for notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- Homework notification trigger
CREATE OR REPLACE FUNCTION public.notify_parent_homework() ...
CREATE TRIGGER trg_notify_parent_homework AFTER INSERT ON homework ...
```

**Files to create:**
- `src/components/notifications/NotificationsPage.tsx`
- `src/pages/admin/AdminNotifications.tsx`
- `src/pages/teacher/TeacherNotifications.tsx`
- `src/pages/parent/ParentNotifications.tsx`

**Files to edit:**
- `src/config/adminSidebar.tsx` -- add Notifications item before Messages
- `src/config/teacherSidebar.tsx` -- add Notifications item before Messages
- `src/config/parentSidebar.tsx` -- add Notifications item before Messages
- `src/App.tsx` -- add 3 new routes
- `src/components/NotificationBell.tsx` -- add homework icon type
- New database migration for DELETE RLS policy + homework trigger

