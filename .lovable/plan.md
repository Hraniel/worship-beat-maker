
# Plano Completo: 5 Melhorias Admin + 5 Melhorias do Aplicativo

This is a large implementation covering 10 distinct features across the admin panel and the main app. Here is the full breakdown organized by priority and dependencies.

---

## Admin Panel Features (5)

### 1. Analytics Dashboard
A dedicated analytics view within the admin panel showing purchase data from the `user_purchases` and `store_packs` tables already in the database.

- New component: `src/components/AdminAnalytics.tsx`
- Tab added to `AdminPackManager.tsx` to switch between "Packs" and "Analytics" views
- Cards showing: total revenue, total purchases, most purchased packs (ranked), and packs with zero purchases
- Uses Recharts (already installed) for a bar chart of purchases per pack
- Pure read-only queries from existing `user_purchases` table joined with `store_packs`

### 2. Scheduled Publishing (Timed Release)
Allows the admin to set a future date for a pack to automatically become available, instead of manually toggling `is_available`.

- Database migration: add `publish_at TIMESTAMPTZ` column to `store_packs`
- Update `AdminPackManager.tsx` pack edit form: add a datetime-local input for "Publicar em"
- Update `admin-upload-sound` edge function: handle `publishAt` field in `update-pack` action
- Update `useStorePacks.ts`: filter logic updated — packs with `publish_at <= now()` are treated as available on the frontend
- Update types in `src/integrations/supabase/types.ts` (auto-managed, just migrate)

### 3. Pack Duplication
A "Clone" button next to each pack in the admin list that creates a copy of the pack metadata (name, description, category, color, icon, price) without duplicating the actual sound files.

- Button added to pack header in `AdminPackManager.tsx`
- New action `duplicate-pack` in the `admin-upload-sound` edge function
- The cloned pack gets name suffix " (Cópia)" and `is_available = false`
- After cloning, the list refreshes so the admin can immediately edit the copy

### 4. User Management Panel
A new tab in the admin panel that lists users and their subscription tiers.

- New component: `src/components/AdminUserManager.tsx`
- New Edge Function: `supabase/functions/admin-get-users/index.ts`
  - Uses `SUPABASE_SERVICE_ROLE_KEY` to query `auth.users` + `user_purchases` + `user_roles`
  - Returns list of users: email, created_at, purchase count, role (admin/user)
- Admin can promote/demote a user to admin by inserting/deleting from `user_roles` table via the edge function
- Tab switcher in admin panel: "Packs" | "Analytics" | "Usuários"

### 5. Push Notification for New Packs (PWA)
When the admin publishes a new pack (sets `is_available = true` or scheduled time arrives), a browser push notification is sent to all installed PWA users.

- New Edge Function: `supabase/functions/send-push-notification/index.ts` using VAPID keys via the Web Push protocol
- New migration: `push_subscriptions` table to store endpoint + keys per user
- Frontend `src/lib/push-notifications.ts`: handles `Notification.requestPermission()`, `serviceWorker.pushManager.subscribe()`, and POSTs the subscription to a new endpoint
- Subscribe prompt added to `Index.tsx` menu (after metronome is playing, offer "Ativar notificações")
- Admin button "Notificar usuários" in `AdminPackManager.tsx` pack header when `is_available = true`

---

## App Improvement Features (5)

### 1. Analytics Dashboard for Admin (already above — counted once)

### 2. Live Performance Mode
A full-screen stage view accessible from the app header that shows large font song name, BPM, key, and navigation arrows for the setlist.

- New component: `src/components/PerformanceMode.tsx`
  - Full-screen dark overlay using `document.documentElement.requestFullscreen()`
  - Large centered BPM display (font-size ~8xl), key badge, song name
  - Previous / Next song navigation arrows (keyboard arrow keys also supported)
  - Metronome play/pause accessible via large button
  - Exit with Escape key or dedicated button
- Button "Modo Performance" added to the mobile menu in `Index.tsx`
- Only accessible when a song is loaded (`currentSongId` is set)

### 3. Shareable Setlist Link
Generate a public URL for a setlist so another musician can view the songs, BPMs and keys without an account.

- Database migration: add `share_token UUID DEFAULT gen_random_uuid()` and `is_public BOOLEAN DEFAULT false` to `setlists`
- New Edge Function: `supabase/functions/get-shared-setlist/index.ts` (no auth required): fetches setlist by `share_token`
- New page: `src/pages/SharedSetlist.tsx` at route `/s/:token` (public, no auth wall)
  - Shows list of songs with BPM and key, read-only
  - "Download App" CTA at the bottom
- Share button in `SetlistManager.tsx`: copies the share URL to clipboard, and has a toggle to enable/disable sharing via backend
- Route added to `App.tsx` without `ProtectedRoute`

### 4. PWA Push Notifications (shared with Admin item 5 above)
Already described above — the same infrastructure serves both admin broadcast and user opt-in.

### 5. Pack Duplication (shared with Admin item 3)
Already described above.

---

## Clarified Feature Mapping (Avoiding Duplication)

Since some suggestions overlap between the two lists, here is the exact implementation scope:

**Admin Panel (5 unique features):**
1. Analytics Dashboard (revenue, purchases, ranking chart)
2. Scheduled Publishing (auto-publish with datetime)
3. Pack Duplication (clone button)
4. User Management (list users, manage admin role)
5. PWA Push Notifications broadcast from admin

**App Improvements (5 unique features):**
1. Live Performance Mode (full-screen stage view)
2. Shareable Setlist Link (public URL)
3. PWA Push Notifications user opt-in (infrastructure shared with Admin #5)
4. Pack Duplication already improves admin workflow indirectly
5. Analytics improves content strategy decisions

---

## Technical Implementation Order

```text
Step 1: Database migrations
  - store_packs: ADD COLUMN publish_at TIMESTAMPTZ
  - setlists: ADD COLUMN share_token UUID DEFAULT gen_random_uuid()
             ADD COLUMN is_public BOOLEAN DEFAULT false
  - push_subscriptions: NEW TABLE (user_id, endpoint, p256dh, auth_key)

Step 2: Edge Functions (create/update)
  - admin-upload-sound: add "duplicate-pack", "schedule-pack" actions
  - admin-get-users: NEW — lists users with role + purchase data
  - get-shared-setlist: NEW — public shared setlist lookup
  - send-push-notification: NEW — VAPID push broadcast

Step 3: Frontend components
  - AdminAnalytics.tsx: recharts bar chart + KPI cards
  - AdminUserManager.tsx: user list with role toggle
  - PerformanceMode.tsx: full-screen overlay
  - SharedSetlist.tsx: public read-only page
  - push-notifications.ts: browser API helpers

Step 4: Wire into existing files
  - AdminPackManager.tsx: add tabs, clone button, schedule field, notify button
  - Index.tsx: Performance Mode button, push notification prompt
  - SetlistManager.tsx: share button + toggle
  - App.tsx: new /s/:token public route
  - useStorePacks.ts: client-side publish_at filter
```

---

## Files to Create / Modify

**New files:**
- `src/components/AdminAnalytics.tsx`
- `src/components/AdminUserManager.tsx`
- `src/components/PerformanceMode.tsx`
- `src/pages/SharedSetlist.tsx`
- `src/lib/push-notifications.ts`
- `supabase/functions/admin-get-users/index.ts`
- `supabase/functions/get-shared-setlist/index.ts`
- `supabase/functions/send-push-notification/index.ts`
- `supabase/migrations/..._admin_and_app_features.sql`

**Modified files:**
- `src/components/AdminPackManager.tsx` (tabs, clone, schedule, notify)
- `src/components/SetlistManager.tsx` (share button)
- `src/pages/Index.tsx` (Performance Mode, push notification prompt)
- `src/hooks/useStorePacks.ts` (publish_at awareness)
- `src/App.tsx` (new route)
- `supabase/functions/admin-upload-sound/index.ts` (new actions)
- `supabase/config.toml` (new functions config)
