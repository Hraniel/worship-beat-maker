
## Root Cause

The error `invalid input syntax for type uuid: "worship-drums-dry"` comes from the **`upload` action in the Edge Function** — it has no UUID format validation on `packId`. It only checks length `> 50`, so slugs like `worship-drums-dry` (17 chars) pass straight through and crash PostgreSQL when attempting to insert into `pack_sounds.pack_id` (a UUID column).

Additionally, the `update-pack` action uses a different, inconsistent regex that may also fail for certain inputs.

## The Problem in Detail

```
upload action (line 63-66):
  ✗ Only checks: packId.length > 50
  ✗ "worship-drums-dry" is 17 chars → PASSES
  ✗ Reaches: pack_sounds.insert({ pack_id: "worship-drums-dry" })
  ✗ PostgreSQL: ERROR invalid input syntax for type uuid

update-pack action (line 266):
  Uses: /^[0-9a-f-]{8,}-[0-9a-f-]+$/  ← inconsistent with other actions
```

All other actions (`delete-pack`, `remove-banner`, `remove-icon`, `duplicate-pack`) use `/^[0-9a-f-]{32,}$/i` which correctly accepts the legacy IDs like `a1000001-0000-0000-0000-000000000001`.

## Solution

### 1. Add a shared UUID validation helper at the top of the Edge Function

```typescript
// Accepts standard UUIDs and legacy PostgreSQL-compatible UUID formats
const isValidPackId = (id: string) => /^[0-9a-f-]{32,}$/i.test(id);
```

### 2. Apply it consistently to ALL actions that receive a `packId`

- `upload` action: replace the `packId.length > 50` check with `isValidPackId(packId)` validation
- `update-pack` action: replace the inconsistent regex with `isValidPackId`
- All other actions already use a compatible regex — standardize them too

## Files to Modify

| File | Change |
|---|---|
| `supabase/functions/admin-upload-sound/index.ts` | Add `isValidPackId` helper and apply it in `upload` and `update-pack` actions (the primary gap causing the 500 error) |

## What Changes After the Fix

- `upload` action will reject non-UUID `packId` values with a clear 400 error instead of a 500 database crash
- `update-pack` uses the same permissive regex as all other actions, accepting both standard UUIDs and legacy IDs
- All actions consistently use the same validation, preventing future inconsistencies
- The Edge Function is redeployed automatically after the code change
