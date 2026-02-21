

## Competitive Exam Bell Notifications + Auto-Rotate Reminders

### What This Does
1. **Automated bell notifications**: When a competitive exam is 3 days or less away, a notification is automatically inserted into the `notifications` table for admins, teachers, and parents -- so they see it in the bell icon dropdown.
2. **Auto-rotate reminders on dashboards**: The "Competitive Exam Reminders" card on all 3 dashboards (Admin, Teacher, Parent) will only show the **next upcoming exam** (not past ones). Once an exam date passes, it automatically shows the next one.

### Approach

**Backend: Scheduled Edge Function**

Create a new edge function `notify-competitive-exams` that:
- Queries `weekly_exams` where `syllabus_type = 'competitive'` and `exam_date` is within 3 days from now (and not past).
- For each such exam, checks if a notification already exists (to avoid duplicates) by matching on a convention like `type = 'competitive_exam'` and checking message content or using a dedup query.
- Inserts notifications into the `notifications` table for:
  - **All admin user IDs** (from `get_admin_user_ids()`)
  - **All teacher user IDs** (from `teachers` table)
  - **All parent user IDs** whose children are in the exam's `class_id` (from `student_parents` + `parents` + `students`)
- Set up a **daily cron job** using `pg_cron` + `pg_net` to call this function once per day.

**Frontend: Dashboard Reminder Cards**

Update the competitive exam reminder sections on all 3 dashboards:
- **Filter**: Only show exams where `exam_date >= today` (already done in queries).
- **Limit to 1**: Show only the single next upcoming competitive exam instead of a list of 5, so it auto-rotates as dates pass.
- Alternatively, keep showing up to 3-5 but the query already filters out past exams, so it naturally rotates.

### Technical Details

#### 1. New Edge Function: `supabase/functions/notify-competitive-exams/index.ts`

```text
- Fetch competitive exams within 3 days: 
    SELECT * FROM weekly_exams 
    WHERE syllabus_type='competitive' AND exam_date BETWEEN today AND today+3
- For each exam:
  - Get admin user IDs via get_admin_user_ids()
  - Get teacher user IDs from teachers table
  - Get parent user IDs by joining students (class_id match) -> student_parents -> parents
  - Check notifications table for existing notification with same exam info to avoid duplicates
  - Insert notification rows with type='competitive_exam', title, message with days-left info, link to relevant page
```

#### 2. Daily Cron Job (pg_cron + pg_net)

Run SQL to schedule daily invocation at 7:00 AM:
```text
cron.schedule('notify-comp-exams-daily', '0 7 * * *', ...)
  -> net.http_post to the edge function URL
```

#### 3. Dashboard Updates (3 files)

- **`src/pages/admin/AdminDashboard.tsx`**: The competitive exams query already filters `>= today`. Will ensure it shows only future exams and limit display.
- **`src/pages/teacher/TeacherDashboard.tsx`**: Same adjustment -- query already filters future only.
- **`src/pages/parent/ParentDashboard.tsx`**: Same -- already filters by class and future date.

All three already auto-rotate because the query uses `gte('exam_date', today)`. No change needed for auto-rotation -- past exams are already excluded.

#### 4. NotificationBell Enhancement

Add `'competitive_exam'` type to the icon mapping in `NotificationBell.tsx` so competitive exam notifications get a distinct icon (flask/beaker icon in orange/red).

### Files to Create/Edit

| File | Action |
|------|--------|
| `supabase/functions/notify-competitive-exams/index.ts` | Create -- edge function for daily notification generation |
| `src/components/NotificationBell.tsx` | Edit -- add competitive_exam icon type |
| `src/pages/admin/AdminDashboard.tsx` | Minor edit -- ensure reminder card only shows next upcoming exam |
| `src/pages/teacher/TeacherDashboard.tsx` | Minor edit -- same |
| `src/pages/parent/ParentDashboard.tsx` | Minor edit -- same |
| Database (pg_cron) | Insert SQL for daily cron schedule |

