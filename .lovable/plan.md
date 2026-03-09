

## Plan: Redesign Pinned Cue Layout to Avoid Blocking Content

### Problem
When a cue is pinned on the shared setlist page, the sticky bottom bar covers the song list and history below it, blocking important information.

### Solution
Replace the full-width sticky bottom bar with a **compact floating badge** positioned in the bottom-right corner. This keeps the cue visible without obscuring the song list or history.

### Changes — `src/pages/SharedSetlist.tsx`

1. **Replace the sticky full-width bar** (lines 307-337) with a compact floating card:
   - Position: `fixed bottom-4 right-4` with `z-20`
   - Layout: small rounded card (~200px wide) with icon, label, pin toggle, and optional song target
   - Keeps pulse animation on icon
   - Keeps fade-in/fade-out transitions
   - Pin/unpin button stays in the card header

2. **Visual design**:
   - Rounded-2xl card with the cue color as background
   - Compact padding (`px-4 py-3`), horizontal layout (icon left, text right)
   - Pin button as a small icon in the top-right corner
   - "Fixado" label shown as a tiny badge when pinned
   - Shadow for elevation (`shadow-2xl`)

3. **No changes** to cue timing logic, history panel, song list layout, or broadcast logic — only the visual container changes.

### Technical Details
- The cue bar currently uses `sticky bottom-0` which pushes content up and covers the history section
- Switching to `fixed bottom-4 right-4 w-fit max-w-[240px]` ensures it floats over the corner without displacing or covering the main content
- The history section remains in its current position above the song list

