

## Plan: Enhanced Fee Management for Admin and Parent Panels

### Current State
- **Admin (`FeesManagement.tsx`)**: Shows all fees in a flat table with search, class filter (broken — always returns true), and status filter. Has "Mark Paid" action and basic stats. No payment receipt view, no per-student summary, no class-wise breakdown.
- **Parent (`ParentFees.tsx`)**: Shows fees for first linked child only. Has summary cards and table with receipt number column. No receipt download, no payment date display, no multi-child support.

### Changes Required

#### 1. Fix Admin Class Filter (broken logic)
Line 121 currently: `const matchesClass = classFilter === 'all';` — never actually filters by class. Fix to compare student's `class_id` from joined data.

#### 2. Admin: Add Class-wise Summary View
- Add a **Tabs** component: "All Records" (existing table) and "Class Summary" (new view)
- Class Summary tab shows a card per class with: total students, total fees, total collected, total due, overdue count
- Clicking a class card filters the main table to that class

#### 3. Admin: Add Student-wise Fee Detail Dialog
- Clicking a student name in the table opens a **Dialog** showing:
  - Student name, admission number, class
  - All fee records for that student with amounts, paid amounts, dates, receipts
  - Total summary: total fees, total paid, balance due
  - Payment history timeline (paid_at dates with receipt numbers)

#### 4. Admin: Add Payment Receipt View
- For paid fees, add a "View Receipt" button that opens a dialog showing:
  - Receipt number, student name, fee type, amount, payment date
  - Option to print/download (using existing jsPDF dependency)

#### 5. Parent: Support Multiple Children
- Instead of only loading first child, load fees for all linked children
- Add a child selector tab/dropdown when parent has multiple children
- Show per-child summary cards

#### 6. Parent: Add Payment History Section
- Add a "Payment History" card below the table showing only paid fees with:
  - Payment date (`paid_at`), receipt number, amount, fee type
- Add "Download Receipt" button per payment using jsPDF

#### 7. Parent: Show Payment Date in Table
- Add `Paid On` column to the fees table showing `paid_at` formatted date

### Technical Details

**Files to modify:**
- `src/pages/admin/FeesManagement.tsx` — fix class filter, add tabs, student detail dialog, receipt dialog, class summary view
- `src/pages/parent/ParentFees.tsx` — multi-child support, payment history section, receipt download, paid_at column

**Dependencies used:** Existing `jspdf` + `jspdf-autotable` for receipt PDF generation. Existing UI components (Tabs, Dialog, Select).

**No database changes needed** — all required data (`paid_at`, `receipt_number`, `amount`, `paid_amount`, student/class joins) already exists in the `fees` table.

