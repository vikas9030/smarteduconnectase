

## Plan: Enable Custom Partial Payment for Parents via Razorpay

### Problem
Currently, when a parent clicks "Pay Now", it always charges the full remaining balance. Parents should be able to enter a custom amount (partial payment) before proceeding to Razorpay.

### Changes

**1. Edit `src/pages/parent/ParentFees.tsx`**
- Add a payment dialog (inline, using existing Dialog component) that opens when "Pay Now" is clicked
- Dialog shows: fee type, total amount, discount, already paid, remaining balance
- Input field for custom amount (pre-filled with remaining balance, editable)
- Validate: amount > 0 and <= remaining balance
- On confirm, pass the custom amount to `handlePayNow` instead of the full due amount
- After successful Razorpay payment, the `verify-razorpay-payment` edge function already handles partial updates (sets `paid_amount` and status)

**2. Edit `supabase/functions/verify-razorpay-payment/index.ts`**
- Update to accumulate `paid_amount` (existing + new) instead of overwriting
- Set status to `'paid'` if fully paid, `'partial'` otherwise

### Flow
1. Parent clicks "Pay Now" → dialog opens with amount input
2. Parent enters custom amount (e.g., ₹5,000 of ₹10,000 due)
3. Clicks "Proceed to Pay" → Razorpay opens with that amount
4. After payment, verification updates `paid_amount` cumulatively and sets correct status

### Files
- **Edit**: `src/pages/parent/ParentFees.tsx` — Add custom amount dialog before Razorpay
- **Edit**: `supabase/functions/verify-razorpay-payment/index.ts` — Accumulate paid_amount for partial payments

