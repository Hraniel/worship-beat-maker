

# Liquid Glass Design System

## Overview
Transform the entire app UI to a "liquid glass" aesthetic: frosted glass surfaces, subtle gradients, transparency layers, and a clean, modern feel. This affects CSS variables, component backgrounds, borders, and shadows across the app.

## Approach
The most efficient way is to modify the **CSS variables and base styles** in `src/index.css`, then update key component patterns. This avoids touching hundreds of inline classes in every component file.

## Changes

### 1. `src/index.css` -- Glass foundation
- Update dark theme CSS variables: make `--card`, `--popover`, `--secondary`, `--muted` semi-transparent with lower opacity backgrounds
- Add new CSS utility classes for glass surfaces (`.glass-surface`, `.glass-card`, `.glass-border`)
- Update `--background` to use a deeper gradient base
- Add a subtle animated gradient mesh background on the root element
- Make borders use softer white/alpha values instead of solid HSL
- Add base `backdrop-blur` and transparency to `bg-card` via a global override

### 2. `src/index.css` -- Light theme
- Same glass treatment adapted for light: white/alpha surfaces, soft shadows, subtle color tints

### 3. `src/components/ui/card.tsx`
- Add `backdrop-blur-xl bg-white/5 dark:bg-white/5 border-white/10` as default card styling (replacing solid `bg-card`)

### 4. `src/components/ui/dialog.tsx`
- Glass overlay: increase blur, add gradient tint to overlay
- Dialog content: frosted glass background with `backdrop-blur-2xl bg-card/80 border-white/10`

### 5. `src/components/ui/sheet.tsx`
- Same glass treatment as dialog for sheet panels

### 6. `src/pages/Index.tsx` -- Main app layout
- Header: `bg-white/5 backdrop-blur-xl border-b border-white/10` instead of `bg-primary/10`
- Footer/bottom bar: same glass treatment
- Dropdown menus: frosted glass with blur
- Safe-area top bar: transparent gradient instead of solid

### 7. `src/components/DrumPad.tsx`
- Pad idle state: subtle glass gradient instead of solid dark gradient
- Pad border: `border-white/[0.08]` with soft inner glow
- Keep existing color bar and hit animations unchanged

### 8. `src/components/MixerStrip.tsx`
- Fader track backgrounds: glass surface with subtle transparency

### 9. `src/components/Metronome.tsx`
- Container: glass surface styling

### 10. `src/components/AmbientPads.tsx`
- Note buttons: glass surface with colored tint when active

### 11. `src/components/UpgradeGateModal.tsx`
- Glass card styling for the modal

### 12. `src/components/SettingsDialog.tsx`
- Glass treatment on the dialog and tab panels

### 13. `src/components/SetlistManager.tsx`
- Dropdown panel: frosted glass

### 14. `src/pages/Dashboard.tsx` (Store)
- Cards and sidebar: glass treatment

### 15. `src/pages/Auth.tsx`
- Login/signup card: frosted glass over gradient background

## Key CSS additions in `index.css`

```css
/* Glass utility layers */
.glass-surface {
  background: hsl(var(--card) / 0.6);
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
  border: 1px solid hsl(0 0% 100% / 0.08);
}

/* Gradient mesh background */
#root::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  background: 
    radial-gradient(ellipse at 20% 50%, hsl(262 80% 55% / 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, hsl(200 75% 50% / 0.06) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 100%, hsl(340 70% 55% / 0.04) 0%, transparent 50%),
    hsl(var(--background));
}
```

## Implementation order
1. CSS variables and utility classes (index.css)
2. UI primitives (card, dialog, sheet, button adjustments)
3. Main layout (Index.tsx header/footer/menus)
4. Individual components (DrumPad, MixerStrip, Metronome, AmbientPads)
5. Secondary pages (Dashboard, Auth, Settings)

## Files to modify
| File | Change |
|------|--------|
| `src/index.css` | Glass variables, gradient mesh, utility classes |
| `src/components/ui/card.tsx` | Glass default styling |
| `src/components/ui/dialog.tsx` | Frosted glass overlay and content |
| `src/components/ui/sheet.tsx` | Frosted glass panels |
| `src/pages/Index.tsx` | Header, footer, menus glass treatment |
| `src/components/DrumPad.tsx` | Glass pad surfaces |
| `src/components/MixerStrip.tsx` | Glass fader backgrounds |
| `src/components/Metronome.tsx` | Glass container |
| `src/components/AmbientPads.tsx` | Glass note buttons |
| `src/components/UpgradeGateModal.tsx` | Glass modal |
| `src/components/SettingsDialog.tsx` | Glass dialog panels |
| `src/pages/Auth.tsx` | Glass auth card |
| `src/pages/Dashboard.tsx` | Glass store cards/sidebar |

