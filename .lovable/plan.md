

# Mobile Bottom Navigation Bar Implementation Plan

## Overview
Transform the mobile experience from a slide-out sidebar to a native app-style bottom navigation bar with 4 primary action buttons + a "More" menu, while keeping the desktop sidebar completely unchanged.

## How It Will Work

- On mobile screens (below 768px), the current hamburger menu sidebar will be replaced with a **fixed bottom navigation bar** showing 4-5 key buttons
- A **"More" button** will open a slide-up sheet containing all remaining menu items
- The **desktop sidebar remains exactly as-is** -- no changes for laptop/desktop users
- Each role (Admin, Teacher, Parent) gets its own set of primary bottom tabs

## Bottom Navigation Tabs Per Role

### Admin (4 tabs + More)
1. Dashboard
2. Students
3. Attendance
4. Messages
5. More (opens sheet with: Teachers, Classes, Subjects, Timetable, Exams, Leads, Announcements, Leave, Certificates, Complaints, Fees, Gallery, Settings)

### Teacher (4 tabs + More)
1. Dashboard
2. Attendance
3. Homework
4. Messages
5. More (opens sheet with: My Classes, Students, Exam Marks, Reports, Announcements, Leave, Gallery, Leads)

### Parent (4 tabs + More)
1. Dashboard
2. Attendance
3. Exams
4. Messages
5. More (opens sheet with: My Child, Timetable, Homework, Progress, Announcements, Leave, Certificates, Gallery, Pay Fees)

## Visual Design
- Fixed to bottom of screen, white/card background with top border
- Active tab highlighted with role-specific color
- Icons on top, small labels below each icon
- "More" button uses a grid/dots icon
- The "More" sheet slides up from bottom with a grid of all remaining items
- Content area gets bottom padding (about 70px) on mobile to avoid overlap

## Technical Details

### Files to Create
1. **`src/components/layouts/MobileBottomNav.tsx`** -- New component containing:
   - Bottom navigation bar with role-based tabs
   - "More" sheet using the existing `Sheet` component (slides from bottom)
   - Uses `useIsMobile()` hook to only render on mobile
   - Accepts `sidebarItems` and `roleColor` props (same as DashboardLayout)
   - Configured primary items per role via a mapping object

### Files to Modify
1. **`src/components/layouts/DashboardLayout.tsx`**:
   - Import and render `MobileBottomNav` component
   - Remove the mobile hamburger menu button from the header on mobile
   - Remove the mobile sidebar overlay and slide-out sidebar
   - Add bottom padding to `<main>` on mobile (via `pb-20 lg:pb-0`)
   - Keep all desktop sidebar code untouched

### No Other Files Change
- Sidebar configs (`adminSidebar.tsx`, `teacherSidebar.tsx`, `parentSidebar.tsx`) stay the same
- All page components stay the same
- Routing stays the same

### Component Structure

```text
DashboardLayout
+-- Desktop Sidebar (hidden on mobile, unchanged)
+-- Main Content Area (added bottom padding on mobile)
+-- MobileBottomNav (visible only on mobile)
    +-- 4 primary tab buttons
    +-- "More" button -> opens Sheet (side="bottom")
        +-- Grid of remaining menu items
```

### Key Implementation Notes
- The `MobileBottomNav` component determines which 4 items to show based on `roleColor` prop
- Remaining items go into the "More" sheet automatically
- Active route highlighting uses `useLocation()` from react-router-dom
- The existing `useIsMobile()` hook handles responsive detection
- The "More" sheet closes automatically when a menu item is tapped
