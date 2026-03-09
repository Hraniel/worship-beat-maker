

## Plan: Simplify Public Page & Optimize Performance Mode Layout

### Changes to `src/pages/SharedSetlist.tsx`

1. **Remove song highlight feature**: Remove `highlightedSongId` state, `highlightTimerRef`, and all highlight-related logic in `showCue`. Remove highlight styling from song list items.

2. **Remove pin/fix cue feature**: Remove `pinned` state, `pinnedRef`, the pin button from the floating cue badge, and the "Fixado" label. The cue should always auto-hide after timeout.

3. **Signal history shows only last 1 entry**: Change `.slice(0, 3)` to `.slice(0, 1)` so only the most recent signal appears in history.

4. **Remove floating cue badge entirely**: Remove the fixed-position cue badge at bottom-right. The history section already shows the last signal.

### Changes to `src/components/PerformanceMode.tsx`

5. **Add dedicated cue flash area**: Add a visible area in the main content section (below the BPM/key info) where the sent cue animation appears. Currently the flash only shows in `LiveCuePanel` overlaying the top of the screen — move/duplicate the flash display into the main performance view area so it appears in a dedicated empty space.

6. **Optimize mobile layout**:
   - Reduce song name from `text-2xl sm:text-4xl` to `text-lg sm:text-3xl`
   - Reduce BPM from `text-6xl sm:text-7xl` to `text-4xl sm:text-6xl`
   - Reduce spacing/gaps throughout
   - Ensure cue button labels in `LiveCuePanel` are visible on small screens

### Changes to `src/components/performance/LiveCuePanel.tsx`

7. **Expose cue flash state**: Allow the parent `PerformanceMode` to receive cue flash events so it can display them in the dedicated area, or move the flash rendering to the performance mode layout where there's room.

