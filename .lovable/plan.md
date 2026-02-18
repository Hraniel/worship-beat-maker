
# Two Improvements: User Search Filter + Fader Button 3

## Summary

1. **Admin: User search and role filter** — Add a text input (search by email) and role filter chips (All / Admin / Moderador / Usuário) in `AdminUserManager.tsx`. Filtering happens client-side on the already-fetched `users` array — no backend changes needed.

2. **App: Button 3 in fader container** — Add button "3" alongside buttons "1" and "2" to navigate to the third fader page (which shows pads 8 of 9, currently unreachable). The MixerStrip already supports 3 pages (`totalPages = Math.ceil(9/4) = 3`) but the buttons array was hardcoded to `[0, 1]`. Change to `[0, 1, 2]` in all four rendering locations in `Index.tsx`.

---

## Feature 1: User Search + Role Filter (AdminUserManager.tsx)

### What changes

State additions:
- `searchQuery: string` — controlled text input, filters `user.email.toLowerCase().includes(...)`
- `roleFilter: 'all' | 'admin' | 'moderator' | 'user'` — chip selection

Filtered list computed from `users`:
```typescript
const filtered = users.filter(u => {
  const matchesEmail = u.email.toLowerCase().includes(searchQuery.toLowerCase());
  const matchesRole =
    roleFilter === 'all' ||
    (roleFilter === 'admin' && u.is_admin) ||
    (roleFilter === 'moderator' && u.is_moderator) ||
    (roleFilter === 'user' && !u.is_admin && !u.is_moderator);
  return matchesEmail && matchesRole;
});
```

UI additions (above the user list):
1. **Search input** — `<input>` with `Search` icon, `placeholder="Buscar por email..."`, full width
2. **Role filter chips** — row of 4 chips: Todos / Admin / Moderador / Usuário, each highlighted when active
3. **Counter** shows `filtered.length` of `users.length` total

The list renders `filtered` instead of `users`.

No backend changes — filtering is pure client-side.

---

## Feature 2: Fader Button 3 (Index.tsx)

### Root cause

The channels array has 12 entries (metronome + ambient + 9 pads + master). `MixerStrip` slices:
- `fixedStart = channels.slice(0, 2)` → metronome + ambient
- `padChannels = channels.slice(2, -1)` → 9 pads
- `fixedEnd = channels.slice(-1)` → master

With `MOBILE_PAGE_SIZE = 4`:
- `totalPages = Math.ceil(9 / 4) = 3`
- Page 0: pads[0–3]
- Page 1: pads[4–7]
- Page 2: pads[8] ← **currently unreachable**

### Fix

There are **4 places** in `Index.tsx` where the fader page buttons are rendered with `([0, 1] as const)`:

1. **Lines 1023** — landscape panel mixer
2. **Lines 1153** — footer desktop sidebar
3. **Lines 1241** — tablet mid section
4. **Lines 1369** — mobile footer tab bar

In every one of these, change:
```tsx
{([0, 1] as const).map((p) => (
```
to:
```tsx
{([0, 1, 2] as const).map((p) => (
```

This is a purely additive, 4-line change that exposes the already-working third page of faders. No changes to `MixerStrip.tsx` are needed — it already handles `totalPages` and pagination correctly.

---

## Files to Modify

| File | Change |
|---|---|
| `src/components/AdminUserManager.tsx` | Add `searchQuery` + `roleFilter` state; add search input + chip filters UI; render `filtered` list instead of `users` |
| `src/pages/Index.tsx` | Change `([0, 1])` → `([0, 1, 2])` in 4 fader button render locations |

No database migrations, no edge function changes, no new files required.
