

## Plan: Add Edit and Delete for Fee Records

### Overview
Add edit and delete capabilities for fee records in the admin Fees Management page. Admin can edit or delete individual fee records, or bulk-delete all fees for an entire class.

### Changes

#### 1. New Component: `EditFeeDialog`
- Create `src/components/fees/EditFeeDialog.tsx`
- Dialog that receives a `FeeRecord` and allows editing: `fee_type`, `amount`, `discount`, `due_date`
- On save, updates the `fees` table via Supabase and calls `onSuccess`

#### 2. New Component: `DeleteFeeDialog`
- Create `src/components/fees/DeleteFeeDialog.tsx`
- Confirmation dialog (AlertDialog) for deleting a single fee or bulk fees
- Props: mode (`single` | `class`), fee ID or class ID, count of records
- Deletes from `fees` table; also deletes related `fee_payments` records if any exist

#### 3. Update `FeesManagement.tsx`
- Import `Edit2`, `Trash2` icons and the new dialogs
- Add Edit and Delete icon buttons in the Actions column of each fee row
- Add a "Delete Class Fees" button near the filters (visible when a class is selected) that deletes all fees for the selected class
- Wire up state for `editFee` and `deleteFee` dialogs
- Add a bulk delete confirmation that shows count of affected records

#### 4. Related `fee_payments` cleanup
- When deleting fees, also delete associated `fee_payments` records to avoid orphaned data
- Use a transaction-like approach: delete payments first, then fees

### Technical Details
- RLS already allows admins full access (`ALL`) on both `fees` and `fee_payments` tables -- no migration needed
- Delete by class: query all fee IDs where `student_id` is in students of the selected class, then batch delete
- Edit only allowed for unpaid/partial fees (paid fees are locked from amount changes but can edit due_date)

