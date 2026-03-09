

## Plan: Custom Receipt Builder for Admins

### What
Allow admins to customize the fee receipt PDF layout — configure school name, logo, header text, footer text, and toggle which fields appear on the receipt. Settings are saved to the database and applied whenever any receipt is generated.

### Changes

**1. Database: Store receipt settings in `app_settings`**
No schema change needed. We'll use the existing `app_settings` table with a new key `receipt_template` storing a JSON object:
```json
{
  "schoolName": "ASE School",
  "schoolAddress": "123 Street",
  "schoolPhone": "+91...",
  "headerTitle": "FEE RECEIPT",
  "footerText": "This is a computer-generated receipt.",
  "showAdmissionNumber": true,
  "showClass": true,
  "showDiscount": true,
  "showLogo": true,
  "logoUrl": "https://..."
}
```

**2. New component: `src/components/fees/ReceiptTemplateSettings.tsx`**
- A form/dialog accessible from the Fees Management page (new "Receipt Settings" button)
- Fields: School Name, Address, Phone, Header Title, Footer Text
- Toggles: Show Admission Number, Show Class, Show Discount, Show Logo
- Optional logo upload (to existing `photos` storage bucket)
- Loads/saves from `app_settings` with key `receipt_template`
- Live preview section showing a mini receipt mockup

**3. Update `FeeReceiptGenerator.tsx`**
- Accept an optional `templateSettings` parameter
- Use template values for school name, address, header, footer, logo
- Conditionally show/hide fields based on toggle settings
- If logo URL provided and enabled, embed it in the PDF header

**4. Update receipt generation call sites**
- `FeesManagement.tsx`, `StudentFeeDetailDialog.tsx`, `ParentFees.tsx`, `RecordPaymentDialog.tsx`
- Load receipt template from `app_settings` once and pass to `generateFeeReceipt()`

### Files
- **New**: `src/components/fees/ReceiptTemplateSettings.tsx` — Settings form + preview
- **Edit**: `src/components/fees/FeeReceiptGenerator.tsx` — Accept template, render custom layout
- **Edit**: `src/pages/admin/FeesManagement.tsx` — Add "Receipt Settings" button, load template, pass to generator
- **Edit**: `src/components/fees/StudentFeeDetailDialog.tsx` — Pass template to generator
- **Edit**: `src/pages/parent/ParentFees.tsx` — Load template, pass to generator

