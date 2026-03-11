

# Auto-Update Admission Number & Login ID on Promotion

## Problem
When a student is promoted, the new admission number is generated with a year suffix (e.g., `STU001-2526`), but the `login_id` is still copied from the old record unchanged. The user wants the new admission number to also become the new `login_id`, so the student/parent can log in with the updated class-specific ID.

## Change

**`src/pages/admin/StudentPromotion.tsx`** — Line 145

Currently:
```typescript
login_id: student.login_id,
```

Change to:
```typescript
login_id: newAdmissionNumber,
```

This single change ensures:
1. The new student record's `login_id` matches the new admission number (which includes the target class/year info)
2. The parent login flow (`get_parent_login_email` RPC) already checks both `admission_number` and `login_id`, so the parent can log in with either the new admission number or the new login ID — they are the same value
3. The old record retains its original `login_id` and `admission_number`, so historical lookups still work

### Admission Number Format
The current format is `{baseNumber}-{yearSuffix}` (e.g., `STU001-2526`). To also include the class and section info, the format will change to: `{className}{section}/{serialNumber}/{yearSuffix}` — e.g., `6A/001/2526`. This makes the admission number self-descriptive of the student's current class.

Updated logic:
- Extract the serial/base number from the old admission number
- Build new format: `{targetClassName}{targetSection}/{serial}/{yearSuffix}`
- Set both `admission_number` and `login_id` to this new value

## Files to Modify
- `src/pages/admin/StudentPromotion.tsx` — Update admission number generation to include class+section, and set `login_id = newAdmissionNumber`

