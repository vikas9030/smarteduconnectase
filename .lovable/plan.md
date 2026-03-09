

## Plan: Add Class-Section Selector, Per-Student Discounts, and Show Discount to Parents

### Overview
Add a discount system where admins can assign per-student discounts when creating fees. The discount is stored in the `fees` table and automatically shown to parents with net amount calculations. The Razorpay payment amount will be `amount - discount`.

### 1. Database Migration
Add `discount` column to `fees` table:
```sql
ALTER TABLE public.fees ADD COLUMN discount numeric DEFAULT 0;
```

### 2. Update `CreateFeeDialog.tsx`
- **Class selector**: Already shows `name - section` — no change needed.
- **Fetch students when class is selected** (both modes) so we can show discount UI.
- **Discount section** (after fee entries):
  - Toggle: "Enable Discount"
  - Two sub-modes: "Same for all" (single input) vs "Per student" (list of students with individual discount inputs and checkboxes)
  - In "Per student" mode, show all students in the selected class with name + checkbox + discount amount input
- **Submission**: Include `discount` field per fee record based on student-specific or flat discount value.

### 3. Update `ParentFees.tsx`
- Show discount and net payable amount in the fee table (new columns: "Discount", "Net Amount")
- Summary cards: adjust "Total Due" to use `amount - discount - paid_amount`
- Razorpay `handlePayNow`: calculate `dueAmount = fee.amount - (fee.discount || 0) - (fee.paid_amount || 0)`
- Fee interface: add `discount` field

### 4. Update `FeesManagement.tsx`
- Show discount column in admin fees table when applicable

### 5. Update `FeeReceiptGenerator.tsx` and `StudentFeeDetailDialog.tsx`
- Show discount and net amount on receipts and detail dialogs

### Files to modify
- **Migration**: Add `discount` column
- `src/components/fees/CreateFeeDialog.tsx` — discount UI with per-student selection
- `src/pages/parent/ParentFees.tsx` — display discount, adjust payment amounts
- `src/pages/admin/FeesManagement.tsx` — show discount column
- `src/components/fees/FeeReceiptGenerator.tsx` — include discount on receipt
- `src/components/fees/StudentFeeDetailDialog.tsx` — show discount in detail view

