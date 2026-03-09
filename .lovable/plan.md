

## Plan: Admin-Configurable Razorpay Keys via Settings

### Overview
Allow admins to set/update Razorpay Key ID and Key Secret from the Settings page. The keys will be stored in the `app_settings` table (encrypted-like, as JSON values). The edge functions (`create-razorpay-order`, `verify-razorpay-payment`) will read keys from `app_settings` first, falling back to environment secrets.

### Approach
Since edge functions cannot directly query the database mid-request efficiently, and the `app_settings` table is already used for config, the edge functions will accept the Razorpay keys passed from the frontend. However, that exposes secrets client-side. 

**Better approach**: Store keys in `app_settings` and have edge functions read them from the DB using the service role client.

### 1. Settings Page (`SettingsPage.tsx`)
- Add a new "Payment Gateway" card with:
  - Razorpay Key ID input
  - Razorpay Key Secret input (password-masked)
  - Save button
- On load, fetch existing values from `app_settings` (keys: `razorpay_key_id`, `razorpay_key_secret`)
- On save, upsert both keys into `app_settings`

### 2. Update Edge Functions
**`create-razorpay-order/index.ts`**:
- Use service role client to query `app_settings` for `razorpay_key_id` and `razorpay_key_secret`
- Fall back to `Deno.env.get()` if not found in DB
- Use whichever source has values

**`verify-razorpay-payment/index.ts`**:
- Same pattern — read secret from `app_settings` first, fall back to env

### 3. Files to Modify
- `src/pages/admin/SettingsPage.tsx` — Add Payment Gateway card with key inputs
- `supabase/functions/create-razorpay-order/index.ts` — Read keys from DB
- `supabase/functions/verify-razorpay-payment/index.ts` — Read secret from DB

No database migration needed — `app_settings` table already exists with `setting_key` / `setting_value` columns.

