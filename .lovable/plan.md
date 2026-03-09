

## Plan: Custom Partial Payment with Auto Balance Display

### Problem
Currently, "Mark Paid" always records the full fee amount. There's no way to enter a custom/partial payment amount, and the remaining balance isn't prominently shown.

### Changes

**1. Add a Payment Dialog (`src/components/fees/RecordPaymentDialog.tsx` — new file)**
- A dialog with an input field for custom payment amount
- Shows: fee type, total amount, discount, already paid, and auto-calculated remaining balance
- Pre-fills with the remaining balance but allows any custom amount
- Validates that amount > 0 and doesn't exceed remaining balance
- On submit, updates the fee record with accumulated `paid_amount`, sets status to `paid` if fully paid or `partial` if not, generates receipt

**2. Update `FeesManagement.tsx`**
- Replace the inline `handleMarkPaid(fee.id, fee.amount)` button with opening the new `RecordPaymentDialog`
- Pass the selected fee to the dialog
- Add a "Balance" column in the table showing `Net - Paid` for each row
- Update `handleMarkPaid` to accept custom amount and accumulate: `paid_amount = (existing_paid + new_payment)`, auto-set `payment_status` to `'paid'` or `'partial'`

**3. Update `StudentFeeDetailDialog.tsx`**
- Add a "Balance" column per fee row showing `Net - Paid`
- Already has summary cards for total balance — these auto-calculate correctly

### Key Logic
```typescript
// In RecordPaymentDialog / handleMarkPaid:
const netAmount = fee.amount - (fee.discount || 0);
const alreadyPaid = fee.paid_amount || 0;
const remaining = netAmount - alreadyPaid;
const newTotalPaid = alreadyPaid + customAmount;
const newStatus = newTotalPaid >= netAmount ? 'paid' : 'partial';

await supabase.from('fees').update({
  paid_amount: newTotalPaid,
  payment_status: newStatus,
  paid_at: new Date().toISOString(),
  receipt_number: receiptNumber
}).eq('id', fee.id);
```

### Files
- **New**: `src/components/fees/RecordPaymentDialog.tsx`
- **Edit**: `src/pages/admin/FeesManagement.tsx` — add Balance column, open payment dialog instead of instant mark-paid
- **Edit**: `src/components/fees/StudentFeeDetailDialog.tsx` — add Balance column per row

No database changes needed — `paid_amount` already supports partial values.

