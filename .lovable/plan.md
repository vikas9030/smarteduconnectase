

## Make SmartEduConnect an Installable PWA with Push Notifications

This plan adds two major capabilities: (1) making the app installable on any device's home screen, and (2) enabling browser push notifications so admin, teacher, and parent users receive alerts even when the app is closed.

---

### What Users Will Experience

- **Install Prompt**: A banner/button appears on all three panels (admin, teacher, parent) inviting users to install the app to their home screen
- **Push Notifications**: When new notifications are created (attendance, exam results, homework, announcements, etc.), users receive a native push notification on their device
- **Works Offline**: Basic pages load even without internet; the app shell is cached
- **All 3 Roles Supported**: Admin, teacher, and parent panels all get the install prompt and push notification support

---

### Technical Plan

**Step 1: Install `vite-plugin-pwa` and configure PWA**

- Add `vite-plugin-pwa` dependency
- Update `vite.config.ts` to include the PWA plugin with:
  - App manifest (name, icons, theme color, display: standalone)
  - Service worker with Workbox (precaching app shell)
  - `navigateFallbackDenylist: [/^\/~oauth/]` to avoid caching OAuth routes
- Add PWA meta tags to `index.html` (theme-color, apple-touch-icon, etc.)
- Create PWA icons in `public/` (192x192 and 512x512 versions using the existing logo)

**Step 2: Create a `push_subscriptions` database table**

Store each user's push subscription so the backend can send them push notifications:
- Columns: `id`, `user_id`, `endpoint`, `p256dh`, `auth`, `created_at`
- Unique constraint on `(user_id, endpoint)` to avoid duplicates
- RLS: users can insert/view/delete their own subscriptions

**Step 3: Generate VAPID keys and store as secrets**

- Web Push requires a VAPID key pair (public + private)
- The public key will be stored as a constant in the frontend code
- The private key will be stored as a backend secret (`VAPID_PRIVATE_KEY`)
- A `VAPID_PUBLIC_KEY` secret will also be stored for the edge function

**Step 4: Create push notification hook (`usePushNotifications`)**

A React hook that:
- Checks if the browser supports push notifications
- Requests notification permission from the user
- Subscribes to push via the service worker
- Saves the subscription to the `push_subscriptions` table
- Provides a UI-friendly status (supported, permission state, subscribed)

**Step 5: Create `send-push-notification` edge function**

A backend function that:
- Receives `user_id`, `title`, `message`, `url` parameters
- Looks up all push subscriptions for that user
- Sends Web Push notifications using the VAPID keys
- Cleans up expired/invalid subscriptions automatically

**Step 6: Update notification database triggers to call push**

Modify the existing notification triggers (attendance, exam results, homework, announcements, leave, certificates) to also invoke the `send-push-notification` edge function via `pg_net` or add a new trigger on the `notifications` table itself that fires the push for every new notification insert.

**Step 7: Add Install App banner + Push toggle to all 3 panels**

- Create an `InstallAppBanner` component that shows an "Install App" prompt using the `beforeinstallprompt` event
- Create a `PushNotificationToggle` component (bell icon + switch) 
- Add both to the `DashboardLayout` header area so they appear on admin, teacher, and parent panels
- The push toggle will use the `usePushNotifications` hook to enable/disable

**Step 8: Create service worker file**

- `public/sw.js` for handling push events (showing notifications with title, body, icon, and click-to-open URL)
- Handle `notificationclick` to focus/open the app at the correct route

### Files to Create
- `public/sw-push.js` -- Push event handler for service worker
- `public/pwa-192x192.png` and `public/pwa-512x512.png` -- PWA icons
- `src/hooks/usePushNotifications.ts` -- Push subscription hook
- `src/components/InstallAppBanner.tsx` -- Install prompt component
- `src/components/PushNotificationToggle.tsx` -- Enable/disable push toggle
- `supabase/functions/send-push-notification/index.ts` -- Edge function

### Files to Modify
- `vite.config.ts` -- Add PWA plugin configuration
- `index.html` -- Add PWA meta tags
- `src/components/layouts/DashboardLayout.tsx` -- Add install banner + push toggle to header
- Database migration -- Create `push_subscriptions` table

### Important Notes
- **iOS Limitation**: Push notifications on iOS only work when the app is installed as a PWA (added to home screen) on iOS 16.4+. The UI will inform users of this.
- **Android + Desktop**: Full support for both install and push notifications
- **No API key needed from you**: VAPID keys will be generated and stored automatically

