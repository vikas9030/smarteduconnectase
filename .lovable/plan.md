

## Plan: Add Complaints Tab to Teacher Reports + Complaint Notifications

### What We're Building

1. **Teacher Complaints View** -- Add a "Complaints" tab inside the existing Teacher Reports page (`TeacherReports.tsx`) so teachers can see complaints where `visible_to` includes `'teacher'`, and respond/update status on them.

2. **Notification Triggers** -- Create a database trigger on the `complaints` table that:
   - On **INSERT** (new complaint): sends notifications to admin users (if `'admin' = ANY(visible_to)`) and teacher users (if `'teacher' = ANY(visible_to)`)
   - On **UPDATE** (response/resolve): sends a notification back to the parent (`submitted_by`) when `response` changes or `status` changes to `'resolved'` or `'in_progress'`

### Technical Changes

#### 1. Edit `src/pages/teacher/TeacherReports.tsx`
- Add Tabs component with two tabs: "Student Reports" (existing content) and "Complaints" (new)
- Complaints tab fetches from `complaints` table with `.contains('visible_to', ['teacher'])`
- Shows complaint list with subject, description, status badge, visibility badges, date
- Add ability to respond and mark as resolved (requires updating RLS to allow teacher UPDATE)

#### 2. Database Migration -- RLS + Trigger
- **Add UPDATE policy** for teachers on `complaints` table (currently they can only SELECT)
- **Create trigger function** `notify_complaint()`:
  - On INSERT: notify admins and teachers based on `visible_to` array
  - On UPDATE (when `response` or `status` changes): notify the parent (`submitted_by`) with message like "Your complaint has been responded to"
- **Create trigger** `on_complaint_change` AFTER INSERT OR UPDATE on `complaints`

#### 3. Edit `src/pages/admin/ComplaintsManagement.tsx`
- Ensure the admin respond handler also triggers the notification (handled automatically by the DB trigger on UPDATE)

### Database Migration SQL

```sql
-- Allow teachers to update complaints visible to them
CREATE POLICY "Teachers can update complaints visible to them"
ON public.complaints FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'teacher'::app_role) AND 'teacher' = ANY(visible_to))
WITH CHECK (has_role(auth.uid(), 'teacher'::app_role) AND 'teacher' = ANY(visible_to));

-- Notification trigger for complaints
CREATE OR REPLACE FUNCTION public.notify_complaint()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  target_id uuid;
  submitter_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT full_name INTO submitter_name FROM profiles WHERE user_id = NEW.submitted_by;
    
    IF 'admin' = ANY(NEW.visible_to) THEN
      FOR target_id IN SELECT user_id FROM user_roles WHERE role = 'admin'
      LOOP
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (target_id, 'New Complaint', COALESCE(submitter_name,'A parent') || ': ' || NEW.subject, 'complaint', '/admin/complaints');
      END LOOP;
    END IF;
    
    IF 'teacher' = ANY(NEW.visible_to) THEN
      FOR target_id IN SELECT user_id FROM user_roles WHERE role = 'teacher'
      LOOP
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (target_id, 'New Complaint', COALESCE(submitter_name,'A parent') || ': ' || NEW.subject, 'complaint', '/teacher/reports');
      END LOOP;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF (OLD.response IS DISTINCT FROM NEW.response) OR (OLD.status IS DISTINCT FROM NEW.status) THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (NEW.submitted_by, 'Complaint Updated', 
        CASE WHEN NEW.status = 'resolved' THEN 'Your complaint "' || NEW.subject || '" has been resolved'
             ELSE 'Your complaint "' || NEW.subject || '" status updated to ' || NEW.status END,
        'complaint', '/parent/complaints');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_complaint_change
AFTER INSERT OR UPDATE ON public.complaints
FOR EACH ROW EXECUTE FUNCTION public.notify_complaint();
```

### Files to Modify
- **Edit**: `src/pages/teacher/TeacherReports.tsx` -- Add Tabs with Complaints section
- **Database**: New migration for RLS policy + trigger function + trigger

