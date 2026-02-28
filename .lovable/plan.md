

## Fix Push Notifications - Replace Broken Encryption

### Root Cause

The `send-push-notification` edge function implements RFC 8291 (Web Push encryption) manually, but the HKDF key derivation is incorrect:
- It skips the critical step of deriving the PRK (Pseudo-Random Key) using HMAC-SHA256 with the auth secret as key and shared secret as input
- The info strings for content encryption key and nonce derivation are wrong (missing the key label length prefix and salt/key ID components)
- The padding byte should be `\x02` delimiter followed by zero-padding, but the structure is malformed

This means every push attempt encrypts the payload incorrectly, and FCM/push services silently reject it.

### Solution

Replace the custom crypto implementation with the `web-push` npm package via Deno's `npm:` specifier. This is a battle-tested library that handles all the encryption correctly.

### Changes

**1. Rewrite `supabase/functions/send-push-notification/index.ts`**

Replace the entire ~350-line file with a much simpler version using `npm:web-push`:
- Import `web-push` via `import webpush from "npm:web-push@3.6.7"`
- Use `webpush.setVapidDetails()` with the stored VAPID keys
- Use `webpush.sendNotification()` for each subscription
- Keep the same API surface (GET for public key, POST for sending)
- Keep VAPID key generation/storage in `push_config` table
- Keep expired subscription cleanup logic

The edge function will go from ~350 lines of fragile crypto to ~100 lines of reliable code.

**2. No database changes needed**

The `push_subscriptions`, `push_config` tables, trigger, and RLS policies are all correct. The frontend `usePushNotifications` hook and `PushNotificationToggle` component are also working correctly (subscriptions are being saved to the database).

**3. No frontend changes needed**

The subscription flow works - there are already 2 subscriptions in the database. The issue is purely server-side push delivery.

### Technical Details

The rewritten edge function will:

```text
GET  /send-push-notification  --> Returns VAPID public key
POST /send-push-notification  --> Sends push to all user subscriptions
  Body: { user_id, title, message, url }
  Response: { sent, total, expired }
```

Key implementation:
- `web-push` handles RFC 8291 encryption, VAPID JWT signing, and HTTP/2 delivery
- VAPID keys stored in `push_config` are converted to the format `web-push` expects
- The existing database trigger (`trigger_push_notification`) continues to fire on notification inserts, calling this function automatically

