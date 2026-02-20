# 🎓 Smart EduConnect — School Management System

A comprehensive, role-based school management platform built with modern web technologies. Smart EduConnect streamlines academic operations by connecting **administrators**, **teachers**, and **parents** through a unified, real-time interface.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [User Roles](#user-roles)
- [Module Breakdown](#module-breakdown)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Authentication & Security](#authentication--security)
- [Design System](#design-system)

---

## Overview

Smart EduConnect is a full-stack school ERP that digitizes day-to-day school operations — from attendance tracking and exam management to fee collection and parent communication. It features three distinct dashboards tailored to each user role, with real-time data synchronization and a responsive, mobile-friendly design.

---

## ✨ Features

### 🔑 Core Capabilities
- **Role-based access control** — Admin, Teacher, and Parent portals with distinct permissions
- **Real-time data sync** — Live updates across all connected users
- **Responsive design** — Works seamlessly on desktop, tablet, and mobile
- **Dark mode support** — Full light/dark theme with semantic design tokens
- **Export & reporting** — CSV and PDF export for attendance, marks, and more

### 📊 Admin Panel
| Module | Description |
|--------|-------------|
| **Dashboard** | Overview stats, quick actions, and system health |
| **Teachers** | Add, edit, and manage teacher profiles and assignments |
| **Students** | Student registry with admission numbers, class assignments, and profiles |
| **Classes** | Create classes with sections and assign class teachers |
| **Subjects** | Manage subject catalog with codes |
| **Timetable** | Build and publish weekly timetables per class |
| **Attendance Reports** | View, filter, search, and export attendance data across all classes |
| **Exams** | Create exams, manage schedules, and view results |
| **Leads (CRM)** | Track admission inquiries with status pipeline, follow-ups, and inline status updates |
| **Announcements** | Broadcast announcements to specific audiences |
| **Leave Requests** | Approve or reject leave applications from teachers and students; view/download attachments |
| **Certificates** | Process certificate requests with document attachment download |
| **Complaints** | Handle and respond to complaints |
| **Fees** | Manage fee structures, track payments, and generate receipts |
| **Messages** | Direct messaging system with file/image sharing |
| **Settings** | App configuration, module toggles, and lead permissions |
| **Gallery** | Manage photo gallery with folders |
| **Settings** | App configuration, module toggles, and lead permissions |

### 👩‍🏫 Teacher Panel
| Module | Description |
|--------|-------------|
| **Dashboard** | Class overview, upcoming tasks, and quick stats |
| **My Classes** | View assigned classes and sections |
| **Students** | Browse students in assigned classes |
| **Attendance** | Mark daily attendance with Present/Absent/Late buttons, quick "Mark All" actions, search, and sticky action bar |
| **Homework** | Assign and manage homework with due dates and file attachments (PDF, Word, images) |
| **Exam Marks** | Enter and manage exam scores with grading |
| **Reports** | Create behavioral and academic reports for students |
| **Announcements** | View school-wide announcements |
| **Leave Request** | Submit personal leave applications with optional document attachments |
| **Leads** | Manage admission leads with inline status dropdown (when enabled by admin) |
| **Messages** | Communicate with parents and admin with file/image sharing |
| **Timetable** | View personal teaching schedule |
| **Gallery** | View school photo gallery |

### 👨‍👩‍👧 Parent Panel
| Module | Description |
|--------|-------------|
| **Dashboard** | Child's overview with attendance, upcoming exams, and alerts |
| **My Child** | Detailed child profile and academic info |
| **Attendance** | View 30-day attendance history with stats, progress bar, and day-of-week details |
| **Timetable** | View child's weekly class schedule |
| **Homework** | Track assigned homework, due dates, and download teacher-uploaded attachments |
| **Exam Results** | View marks, grades, and performance analysis with exam name filtering |
| **Progress** | Track academic progress and trends |
| **Announcements** | Read school announcements |
| **Leave Request** | Apply for child's leave with optional document attachments |
| **Messages** | Communicate with all teachers and admin, with file/image sharing |
| **Certificates** | Request certificates for child with optional document attachments |
| **Pay Fees** | View fee details and payment status |
| **Gallery** | View school photo gallery |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS, shadcn/ui, Radix UI primitives |
| **State Management** | TanStack React Query, React Context |
| **Routing** | React Router v6 |
| **Backend** | Lovable Cloud (Supabase) — PostgreSQL, Auth, Edge Functions, Storage |
| **Charts** | Recharts |
| **Forms** | React Hook Form + Zod validation |
| **Date Handling** | date-fns |
| **Icons** | Lucide React |
| **Spreadsheets** | SheetJS (xlsx) for Excel import/export |
| **Animations** | CSS animations, Tailwind transitions |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend (SPA)                 │
│  React + TypeScript + Tailwind + shadcn/ui       │
├─────────────────────────────────────────────────┤
│              React Router (Client)               │
│  /admin/*  │  /teacher/*  │  /parent/*  │ /auth  │
├─────────────────────────────────────────────────┤
│         Supabase JS Client + React Query         │
├─────────────────────────────────────────────────┤
│              Lovable Cloud Backend               │
│  ┌───────────┬──────────┬───────────────────┐   │
│  │  Auth     │  DB      │  Edge Functions    │   │
│  │  (JWT)    │  (PgSQL) │  (Deno Runtime)    │   │
│  └───────────┴──────────┴───────────────────┘   │
│              Row Level Security (RLS)            │
└─────────────────────────────────────────────────┘
```

---

## 👥 User Roles

| Role | Access Level | Description |
|------|-------------|-------------|
| **Admin** | Full | Complete system control — manage users, settings, all modules |
| **Teacher** | Scoped | Access to assigned classes, mark attendance, enter marks, manage leads (if permitted) |
| **Parent** | Read-heavy | View child's data, submit leave requests, pay fees, communicate with teachers |

Role assignment is stored in the `user_roles` table and checked on every authenticated request via RLS policies.

---

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/                    # shadcn/ui primitives (Button, Card, Dialog, etc.)
│   ├── layouts/               # DashboardLayout with sidebar
│   ├── exams/                 # Exam wizard, marks entry, schedule builder
│   ├── leads/                 # Lead forms, call logs, Excel import, settings
│   ├── messaging/             # Messaging interface
│   ├── AttendanceSummary.tsx   # Reusable attendance widget
│   ├── NavLink.tsx            # Navigation link component
│   └── StatCard.tsx           # Dashboard stat card
├── config/
│   ├── adminSidebar.tsx       # Admin navigation config
│   ├── teacherSidebar.tsx     # Teacher navigation config (dynamic leads toggle)
│   └── parentSidebar.tsx      # Parent navigation config
├── hooks/
│   ├── useAuth.tsx            # Authentication context & provider
│   ├── useLeadPermissions.ts  # Teacher lead access check
│   ├── useTeacherSidebar.ts   # Dynamic teacher sidebar builder
│   └── use-toast.ts           # Toast notification hook
├── pages/
│   ├── admin/                 # 16 admin pages
│   ├── teacher/               # 12 teacher pages
│   ├── parent/                # 12 parent pages
│   ├── Auth.tsx               # Login / signup page
│   ├── Index.tsx              # Landing page
│   └── NotFound.tsx           # 404 page
├── integrations/
│   └── supabase/
│       ├── client.ts          # Auto-generated Supabase client
│       └── types.ts           # Auto-generated TypeScript types
├── utils/
│   ├── attendanceDownload.ts  # CSV & PDF export for attendance
│   └── timetableDownload.ts   # Timetable export utilities
├── lib/
│   └── utils.ts               # Tailwind merge utility
├── index.css                  # Design tokens, theme, component classes
└── App.tsx                    # Root component with all routes

supabase/
├── config.toml                # Project configuration
└── functions/
    ├── create-student/        # Edge function: create student with auth
    ├── create-user/           # Edge function: create user accounts
    ├── full-reset/            # Edge function: reset demo data
    └── seed-demo-users/       # Edge function: seed demo accounts
```

---

## 🗄 Database Schema

### Enum Types

| Enum | Values |
|------|--------|
| `app_role` | `admin`, `teacher`, `parent` |

---

### Core Tables

#### `profiles`
User profile data linked to auth users.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `user_id` | uuid | No | — |
| `full_name` | text | No | — |
| `email` | text | Yes | — |
| `phone` | text | Yes | — |
| `photo_url` | text | Yes | — |
| `created_at` | timestamptz | Yes | `now()` |
| `updated_at` | timestamptz | Yes | `now()` |

**RLS Policies:**
- Public profiles viewable by everyone (SELECT)
- Users can view & update own profile
- Admins can manage all profiles

---

#### `user_roles`
Role assignments for access control.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `user_id` | uuid | No | — |
| `role` | `app_role` | No | — |

**RLS Policies:**
- Users can view own role (SELECT)
- Admins can manage all roles (ALL)

---

#### `teachers`
Teacher-specific data and employment info.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `user_id` | uuid | No | — |
| `teacher_id` | text | No | — |
| `subjects` | text[] | Yes | — |
| `qualification` | text | Yes | — |
| `status` | text | Yes | `'active'` |
| `joining_date` | date | Yes | `CURRENT_DATE` |
| `created_at` | timestamptz | Yes | `now()` |
| `updated_at` | timestamptz | Yes | `now()` |

**RLS Policies:**
- All authenticated users can view teachers (SELECT)
- Teachers can view own record (SELECT)
- Admins can manage teachers (ALL)

---

#### `students`
Student registry with class assignments and parent info.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `admission_number` | text | No | — |
| `full_name` | text | No | — |
| `class_id` | uuid (→ `classes.id`) | Yes | — |
| `user_id` | uuid | Yes | — |
| `date_of_birth` | date | Yes | — |
| `blood_group` | text | Yes | — |
| `photo_url` | text | Yes | — |
| `parent_name` | text | Yes | — |
| `parent_phone` | text | Yes | — |
| `address` | text | Yes | — |
| `emergency_contact` | text | Yes | — |
| `emergency_contact_name` | text | Yes | — |
| `login_id` | text | Yes | — |
| `password_hash` | text | Yes | — |
| `status` | text | Yes | `'active'` |
| `created_at` | timestamptz | Yes | `now()` |
| `updated_at` | timestamptz | Yes | `now()` |

**RLS Policies:**
- Admins & teachers can manage students (ALL)
- Teachers can view students in their classes (SELECT)
- Parents can view their linked children (SELECT)

---

#### `parents`
Parent accounts linked to auth users.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `user_id` | uuid | No | — |
| `phone` | text | Yes | — |
| `created_at` | timestamptz | Yes | `now()` |

**RLS Policies:**
- Parents can view own record (SELECT)
- Teachers can view parents (SELECT)
- Admins can manage parents (ALL)

---

#### `student_parents`
Many-to-many: student ↔ parent relationships.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `student_id` | uuid (→ `students.id`) | No | — |
| `parent_id` | uuid (→ `parents.id`) | No | — |
| `relationship` | text | Yes | `'parent'` |

**RLS Policies:**
- Admins & teachers can manage (ALL)
- Parents can view own links (SELECT)

---

#### `classes`
Class definitions with sections.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `name` | text | No | — |
| `section` | text | No | — |
| `class_teacher_id` | uuid (→ `teachers.id`) | Yes | — |
| `academic_year` | text | No | `'2024-2025'` |
| `created_at` | timestamptz | Yes | `now()` |

**RLS Policies:**
- Authenticated users can view classes (SELECT)
- Admins can manage classes (ALL)

---

#### `subjects`
Subject catalog.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `name` | text | No | — |
| `code` | text | Yes | — |
| `created_at` | timestamptz | Yes | `now()` |

**RLS Policies:**
- Authenticated users can view subjects (SELECT)
- Teachers can create subjects (INSERT)
- Admins can manage subjects (ALL)

---

#### `teacher_classes`
Teacher ↔ class assignments.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `teacher_id` | uuid (→ `teachers.id`) | No | — |
| `class_id` | uuid (→ `classes.id`) | No | — |

**RLS Policies:**
- Authenticated users can view (SELECT)
- Admins can manage (ALL)

---

### Academic Tables

#### `attendance`
Daily attendance records per student.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `student_id` | uuid (→ `students.id`) | No | — |
| `date` | date | No | `CURRENT_DATE` |
| `status` | text | No | — |
| `session` | text | Yes | — |
| `reason` | text | Yes | — |
| `marked_by` | uuid (→ `teachers.id`) | Yes | — |
| `created_at` | timestamptz | Yes | `now()` |

**RLS Policies:**
- Teachers & admins can manage attendance (ALL)
- Parents can view their children's attendance (SELECT)

---

#### `exams`
Exam definitions.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `name` | text | No | — |
| `exam_date` | date | Yes | — |
| `max_marks` | integer | Yes | `100` |
| `class_id` | uuid (→ `classes.id`) | Yes | — |
| `subject_id` | uuid (→ `subjects.id`) | Yes | — |
| `created_at` | timestamptz | Yes | `now()` |

**RLS Policies:**
- All can view exams (SELECT)
- Staff (admin/teacher) can manage exams (ALL)

---

#### `exam_marks`
Student marks per exam.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `exam_id` | uuid (→ `exams.id`) | No | — |
| `student_id` | uuid (→ `students.id`) | No | — |
| `marks_obtained` | numeric | Yes | — |
| `grade` | text | Yes | — |
| `remarks` | text | Yes | — |
| `created_at` | timestamptz | Yes | `now()` |

**RLS Policies:**
- Teachers & admins can manage marks (ALL)
- Parents can view their children's marks (SELECT)

---

#### `homework`
Homework assignments per class/subject.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `title` | text | No | — |
| `description` | text | Yes | — |
| `class_id` | uuid (→ `classes.id`) | No | — |
| `subject_id` | uuid (→ `subjects.id`) | Yes | — |
| `due_date` | date | No | — |
| `attachment_url` | text | Yes | — |
| `created_by` | uuid (→ `teachers.id`) | Yes | — |
| `created_at` | timestamptz | Yes | `now()` |

**RLS Policies:**
- All can view homework (SELECT)
- Teachers & admins can manage homework (ALL)

---

#### `timetable`
Weekly timetable entries.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `class_id` | uuid (→ `classes.id`) | No | — |
| `day_of_week` | text | No | — |
| `period_number` | integer | No | — |
| `start_time` | time | No | — |
| `end_time` | time | No | — |
| `subject_id` | uuid (→ `subjects.id`) | Yes | — |
| `teacher_id` | uuid (→ `teachers.id`) | Yes | — |
| `is_published` | boolean | Yes | `false` |
| `created_at` | timestamptz | Yes | `now()` |

**RLS Policies:**
- Authenticated users can view published timetable (SELECT)
- Admins & teachers can view all (SELECT)
- Admins can manage timetable (ALL)

---

#### `student_reports`
Behavioral/academic reports.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `student_id` | uuid (→ `students.id`) | No | — |
| `category` | text | No | — |
| `description` | text | No | — |
| `severity` | text | Yes | — |
| `parent_visible` | boolean | Yes | `true` |
| `created_by` | uuid (→ `teachers.id`) | Yes | — |
| `created_at` | timestamptz | Yes | `now()` |

**RLS Policies:**
- Teachers & admins can manage reports (ALL)
- Parents can view their children's visible reports (SELECT, where `parent_visible = true`)

---

### Administrative Tables

#### `fees`
Fee records with payment tracking.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `student_id` | uuid (→ `students.id`) | No | — |
| `fee_type` | text | No | — |
| `amount` | numeric | No | — |
| `due_date` | date | No | — |
| `paid_amount` | numeric | Yes | `0` |
| `payment_status` | text | Yes | `'unpaid'` |
| `receipt_number` | text | Yes | — |
| `paid_at` | timestamptz | Yes | — |
| `created_at` | timestamptz | Yes | `now()` |

**RLS Policies:**
- Admins can manage fees (ALL)
- Parents can view their children's fees (SELECT)

---

#### `leave_requests`
Leave applications for teachers and students with optional document attachments.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `request_type` | text | No | — |
| `student_id` | uuid (→ `students.id`) | Yes | — |
| `teacher_id` | uuid (→ `teachers.id`) | Yes | — |
| `from_date` | date | No | — |
| `to_date` | date | No | — |
| `reason` | text | No | — |
| `attachment_url` | text | Yes | — |
| `status` | text | Yes | `'pending'` |
| `approved_by` | uuid | Yes | — |
| `created_at` | timestamptz | Yes | `now()` |

**RLS Policies:**
- Admins can manage all leave requests (ALL)
- Teachers can create their own leave requests (INSERT)
- Parents can create student leave requests (INSERT)
- Users can view own leave requests (SELECT)

---

#### `announcements`
School-wide announcements with audience targeting.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `title` | text | No | — |
| `content` | text | No | — |
| `target_audience` | text[] | Yes | `ARRAY['all']` |
| `created_by` | uuid | Yes | — |
| `created_at` | timestamptz | Yes | `now()` |

**RLS Policies:**
- All can view announcements (SELECT)
- Admins & teachers can create announcements (INSERT)
- Admins can manage announcements (ALL)

---

#### `complaints`
Complaint tickets with response tracking.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `subject` | text | No | — |
| `description` | text | No | — |
| `submitted_by` | uuid | No | — |
| `response` | text | Yes | — |
| `status` | text | Yes | `'open'` |
| `created_at` | timestamptz | Yes | `now()` |

**RLS Policies:**
- Admins can manage complaints (ALL)
- Users can submit complaints (INSERT, own `submitted_by`)
- Users can view own complaints (SELECT)

---

#### `certificate_requests`
Certificate request processing with optional document attachments.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `student_id` | uuid (→ `students.id`) | No | — |
| `certificate_type` | text | No | — |
| `requested_by` | uuid | Yes | — |
| `approved_by` | uuid | Yes | — |
| `attachment_url` | text | Yes | — |
| `status` | text | Yes | `'pending'` |
| `created_at` | timestamptz | Yes | `now()` |

**RLS Policies:**
- Admins can manage certificates (ALL)
- Parents can create certificate requests for their children (INSERT)
- Parents can view own requests (SELECT)

---

#### `messages`
Direct messaging between users with file and image sharing.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `sender_id` | uuid | No | — |
| `recipient_id` | uuid | No | — |
| `content` | text | No | — |
| `is_read` | boolean | No | `false` |
| `student_id` | uuid (→ `students.id`) | Yes | — |
| `attachment_url` | text | Yes | — |
| `attachment_type` | text | Yes | — |
| `created_at` | timestamptz | No | `now()` |

**RLS Policies:**
- Users can send messages (INSERT, own `sender_id`)
- Users can view their own messages (SELECT, sender or recipient)
- Recipients can update read status (UPDATE)
- Admins can view all messages (SELECT)
- **No DELETE allowed**

---

#### `app_settings`
Application configuration key-value store.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `setting_key` | text | No | — |
| `setting_value` | jsonb | No | `'false'` |
| `updated_by` | uuid | Yes | — |
| `created_at` | timestamptz | Yes | `now()` |
| `updated_at` | timestamptz | Yes | `now()` |

**RLS Policies:**
- Anyone can read settings (SELECT)
- Admins can manage settings (ALL)

---

#### `settings_audit_log`
Audit trail for settings changes.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `setting_key` | text | No | — |
| `old_value` | text | Yes | — |
| `new_value` | text | Yes | — |
| `changed_by` | uuid | No | — |
| `created_at` | timestamptz | Yes | `now()` |

**RLS Policies:**
- Admins can manage audit log (ALL)

---

### CRM Tables (Leads Module)

#### `leads`
Admission inquiry tracking.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `student_name` | text | No | — |
| `status` | text | No | `'new_lead'` |
| `primary_mobile` | text | No | — |
| `alternate_mobile` | text | Yes | — |
| `email` | text | Yes | — |
| `father_name` | text | Yes | — |
| `mother_name` | text | Yes | — |
| `primary_contact_person` | text | Yes | `'father'` |
| `date_of_birth` | date | Yes | — |
| `gender` | text | Yes | — |
| `current_class` | text | Yes | — |
| `class_applying_for` | text | Yes | — |
| `academic_year` | text | Yes | — |
| `previous_school` | text | Yes | — |
| `education_board` | text | Yes | — |
| `medium_of_instruction` | text | Yes | — |
| `last_class_passed` | text | Yes | — |
| `academic_performance` | text | Yes | — |
| `father_occupation` | text | Yes | — |
| `father_education` | text | Yes | — |
| `mother_occupation` | text | Yes | — |
| `mother_education` | text | Yes | — |
| `annual_income_range` | text | Yes | — |
| `address` | text | Yes | — |
| `area_city` | text | Yes | — |
| `remarks` | text | Yes | — |
| `next_followup_date` | date | Yes | — |
| `assigned_teacher_id` | uuid (→ `teachers.id`) | Yes | — |
| `created_by` | uuid | No | — |
| `created_at` | timestamptz | Yes | `now()` |
| `updated_at` | timestamptz | Yes | `now()` |

**RLS Policies:**
- Admins can manage all leads (ALL)
- Teachers can create leads (INSERT, own `created_by`)
- Teachers can update own/assigned leads (UPDATE)
- Teachers can view own/assigned leads (SELECT)

---

#### `lead_call_logs`
Call history per lead.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `lead_id` | uuid (→ `leads.id`) | No | — |
| `called_by` | uuid | No | — |
| `call_outcome` | text | Yes | — |
| `notes` | text | Yes | — |
| `created_at` | timestamptz | Yes | `now()` |

**RLS Policies:**
- Admins can manage all call logs (ALL)
- Teachers can insert call logs (INSERT, own `called_by`)
- Teachers can view call logs of own leads (SELECT)

---

#### `lead_status_history`
Status change audit trail.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `lead_id` | uuid (→ `leads.id`) | No | — |
| `old_status` | text | Yes | — |
| `new_status` | text | No | — |
| `changed_by` | uuid | No | — |
| `remarks` | text | Yes | — |
| `created_at` | timestamptz | Yes | `now()` |

**RLS Policies:**
- Admins can manage all status history (ALL)
- Teachers can insert status history (INSERT, own `changed_by`)
- Teachers can view status history of own leads (SELECT)

---

#### `teacher_lead_permissions`
Per-teacher lead module access control.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `teacher_id` | uuid (→ `teachers.id`) | No | — |
| `enabled` | boolean | No | `false` |
| `updated_by` | uuid | Yes | — |
| `created_at` | timestamptz | Yes | `now()` |
| `updated_at` | timestamptz | Yes | `now()` |

**RLS Policies:**
- Admins can manage permissions (ALL)
- Teachers can view own permission (SELECT)

---

### Gallery Tables

#### `gallery_folders`
Photo gallery folder organization.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `title` | text | No | — |
| `created_by` | uuid | Yes | — |
| `created_at` | timestamptz | No | `now()` |

**RLS Policies:**
- All authenticated can view folders (SELECT)
- Admins can insert, update, delete folders

---

#### `gallery_images`
Images within gallery folders.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `folder_id` | uuid (→ `gallery_folders.id`) | No | — |
| `image_url` | text | No | — |
| `caption` | text | Yes | — |
| `created_by` | uuid | Yes | — |
| `created_at` | timestamptz | No | `now()` |

**RLS Policies:**
- All authenticated can view images (SELECT)
- Admins can insert, update, delete images

---

## ⚡ Edge Functions

| Function | Purpose |
|----------|---------|
| `create-user` | Creates auth user accounts with role assignment (admin-only) |
| `create-student` | Creates student records with optional parent account linking |
| `seed-demo-users` | Seeds demo admin, teacher, and parent accounts for testing |
| `full-reset` | Resets all demo data (teachers, students, parents, etc.) |

All edge functions run on Deno runtime and use the Supabase service role key for privileged operations.

---

## 📦 Storage Buckets

| Bucket | Public | Purpose |
|--------|--------|---------|
| `photos` | Yes | Student/teacher profile photos, homework attachments, leave/certificate documents, message file sharing |
| `gallery` | Yes | School gallery images organized by folders |

---

## 🔧 Database Functions

| Function | Returns | Purpose |
|----------|---------|---------|
| `admin_exists()` | boolean | Checks if any admin role exists in the system |
| `get_user_role(uuid)` | `app_role` | Returns the role for a given user ID |
| `has_role(uuid, app_role)` | boolean | Checks if a user has a specific role (used in RLS policies) |
| `handle_new_user()` | trigger | Auto-creates profile on signup; assigns admin role if first user |
| `get_parent_login_email(text)` | text | Retrieves parent login email by student admission number or login ID |
| `update_updated_at_column()` | trigger | Auto-updates `updated_at` timestamp on row modification |

---

## 🔐 Authentication & Security

- **Email/password authentication** via Lovable Cloud Auth
- **Row Level Security (RLS)** on all tables — users can only access data they're authorized to see
- **Role-based route protection** — each page checks user role before rendering
- **Edge Functions** for privileged operations (creating users, seeding data)
- **Audit logging** for sensitive operations (settings changes, lead status updates)

---

## 🎨 Design System

Smart EduConnect uses a semantic design token system with role-based color differentiation:

- **Primary**: ASE Blue (`hsl(210 85% 40%)`)
- **Secondary**: Warm Sand (`hsl(32 45% 68%)`)
- **Role Colors**: Admin (Blue), Teacher (Deep Forest Green `#1a3628`), Parent (Grey-blue `#6c7580`)
- **Hidden scrollbars** — Clean UI with invisible scrollbars across the app
- **Fixed sidebar** — Desktop sidebar stays fixed while content scrolls independently

**Typography**: Plus Jakarta Sans (headings) + Inter (body text)

**Component Library**: shadcn/ui with custom variants and design tokens defined in `index.css` and `tailwind.config.ts`.

**Utility Classes**:
- `card-elevated` — Elevated card with hover shadow
- `card-stat` — Dashboard stat card with hover animation
- `gradient-primary`, `gradient-admin`, `gradient-teacher`, `gradient-parent` — Role-specific gradient backgrounds
- `status-active`, `status-pending`, `status-approved`, `status-rejected` — Status badge styles

---

## 🚀 Getting Started

1. **Clone the repository** and install dependencies:
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open** `http://localhost:5173` in your browser

4. **Sign up** as an admin to get started, then create teacher and parent accounts from the admin panel

---

## 📄 License

This project is proprietary. All rights reserved.

---

<p align="center">
  Built with ❤️ using <strong>Lovable</strong>
</p>
