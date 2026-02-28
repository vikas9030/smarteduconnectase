

## Fix: Lead Module Toggle System Not Working

### Root Cause
The `app_settings` table is **empty** -- it has no rows for `leads_module_enabled` or `leads_permission_mode`. The settings page tries to `UPDATE` these rows, but since they don't exist, nothing happens and the toggle silently fails.

### Plan

**Step 1: Seed the required settings rows (database migration)**

Insert the two required rows into `app_settings`:
- `leads_module_enabled` with default value `false`
- `leads_permission_mode` with default value `"all"`

This uses an `INSERT ... ON CONFLICT` to be safe if rows somehow already exist.

**Step 2: Make toggle code use UPSERT instead of UPDATE**

Update `LeadsSettings.tsx` so that `handleToggleModule` and `handleModeChange` use `.upsert()` instead of `.update()`. This ensures even if a row is accidentally deleted, toggling will re-create it rather than silently failing.

### Files to Change
- **Database migration**: Insert seed data into `app_settings`
- **`src/components/leads/LeadsSettings.tsx`**: Change `.update()` to `.upsert()` for both settings handlers

