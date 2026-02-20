

## Problem

The main app container is set to exactly `height: 100dvh` with `overflow: hidden`, but it has no `paddingBottom` for the safe area. The shortcut bar (Metronome, Afinador, Loja buttons) sits at the very bottom of the footer, which gets clipped/hidden because the container ends at the viewport boundary -- the safe area space below is never reached.

## Solution

Two changes are needed:

### 1. Main container (`src/pages/Index.tsx`, line ~820)
Add `paddingBottom: 'env(safe-area-inset-bottom, 0px)'` to the root container's style. This expands the usable area into the safe zone so the footer (including shortcut buttons) is not clipped.

### 2. Remove duplicate safe-area padding from shortcut bar
Since the root container now handles the safe-area bottom, remove the `paddingBottom: 'env(safe-area-inset-bottom, 0px)'` from the shortcut bar wrapper (line ~1615). This prevents double-padding that would create an excessive gap.

### 3. Footer conditional paddingBottom cleanup
The footer tag (line ~1260) conditionally applies `paddingBottom` for tablet/desktop. This stays as-is since it only applies to non-mobile layouts.

### Technical Details

```
Root div (line 820):
  BEFORE: paddingTop + paddingLeft + paddingRight only
  AFTER:  add paddingBottom: 'env(safe-area-inset-bottom, 0px)'

Shortcut bar (line 1613-1615):
  BEFORE: style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
  AFTER:  no paddingBottom style (remove it)
```

This ensures the background extends to the bottom edge of the screen, and the buttons render visibly inside the safe area without being clipped by `overflow: hidden`.

