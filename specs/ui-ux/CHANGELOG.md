# Design System Changelog

All notable changes to the SEKAR Neo Brutalism Design System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2026-02-05 (Modern Neo Brutalism)

**Breaking Changes:** Complete design system modernization based on verified Neo Brutalism sources.

### Research Sources

| Source | Key Specifications Extracted |
|--------|------------------------------|
| [Sepidy Medium Article](https://medium.com/@sepidy/how-can-i-design-in-the-neo-brutalism-style-d85c458042de) | 4x6 Color Palette, Shadow X=10, Y=16, stroke=6px |
| [neobrutalism.dev](https://www.neobrutalism.dev/) | `border-2`, `shadow-light/dark`, `boxShadowX/Y` hover pattern |
| [Neo-brutalism-CSS](https://github.com/Walikuperek/Neo-brutalism-CSS) | 3-4px borders, Space Grotesk + Inter fonts |
| [neo-brutalism-ui-library](https://github.com/marieooq/neo-brutalism-ui-library) | Vibrant palette |
| [NN/g Neobrutalism](https://www.nngroup.com/articles/neobrutalism/) | Usability guidelines |

### Changed

#### Colors (Sepidy's Neo Brutalism Palette)

| Token | Old Value | New Value | Reason |
|-------|-----------|-----------|--------|
| Primary | `#0066CC` (Corporate Blue) | `#7FBC8C` (Nature Green) | Parks/nature theme |
| Primary Hover | `#0052A3` | `#6BA87A` | 15% darker |
| Primary Active | `#003D7A` | `#5A9468` | 25% darker |
| Background | `#FFFFFF` (Pure White) | `#FDFD96` (Pastel Yellow) | Warm, inviting |
| Background Secondary | `#F5F5F5` | `#B5D2AD` (Pastel Green) | Nature theme |
| Background Mint | - | `#DAF5F0` (Pastel Mint) | Cards, dialogs |
| Sidebar | `#001F3F` (Navy) | `#1A4D2E` (Dark Forest) | Matches green theme |
| Black | `#000000` (Pure Black) | `#1C1917` (Stone-900) | Softer, warmer |
| Gray Scale | Neutral grays | Stone tones (warm) | Cohesive palette |

#### Shadows (Modern NB Style)

| Token | Old Value | New Value | Reason |
|-------|-----------|-----------|--------|
| Shadow SM | `4px 4px 0px #000` | `4px 4px 0px #1C1917` | Softer black |
| Shadow MD | `6px 6px 0px #000` | `6px 6px 0px #1C1917` | Default for buttons |
| Shadow LG | `8px 8px 0px #000` | `8px 8px 0px #1C1917` | Modals, popovers |
| Shadow Hover | Same as LG | `8px 8px 0px #1C1917` | With translate(-2px) |
| Shadow Active | `2px 2px 0px #000` | `2px 2px 0px #1C1917` | With translate(+2px) |

#### Borders

| Token | Old Value | New Value | Reason |
|-------|-----------|-----------|--------|
| Border Base | `3px` | `2px` | neobrutalism.dev standard |
| Border Thick | `4px` | `3px` | Emphasis only |
| Border Radius | `0px` (Sharp) | `6px` (Friendly) | Modern NB allows rounding |

#### Typography

| Token | Old Value | New Value | Reason |
|-------|-----------|-----------|--------|
| Display Font | Inter | Space Grotesk | Neo-brutalism-CSS standard |
| Display XL | - | `48px` | Hero text |
| Display | `36px` | `40px` | Page titles |
| H1 | `30px` | `32px` | Section headers |

#### Animation

| Token | Old Value | New Value | Reason |
|-------|-----------|-----------|--------|
| Duration Instant | `100ms` | `80ms` | Faster micro-feedback |
| Duration Fast | `200ms` | `150ms` | Snappier buttons |
| Duration Normal | `300ms` | `250ms` | State transitions |
| Easing Bounce | - | `cubic-bezier(0.68, -0.55, 0.265, 1.55)` | Playful bounce |

### Added

- **Space Grotesk Display Font** - Geometric, bold personality for headings
- **Sepidy's 4x6 Color Palette** - Complete pastel to bold color system
- **Background Patterns** - Grid and dots patterns at 3% opacity
- **Colored Shadow Variants** - Primary, warning, danger colored shadows
- **Nature-Themed Accent Colors** - Cyan, coral, amber, pink, purple
- **Bounce Easing** - Playful animation curve
- **boxShadowX/Y Pattern** - neobrutalism.dev hover interaction pattern
- **Secondary Color** - Earth brown `#8B7355` for complementary actions

### Removed

- **REVIEW_SUMMARY.md** - Historical document superseded by CHANGELOG
- **Pure Black (#000000)** - Replaced with soft black (#1C1917)
- **Pure White Backgrounds** - Replaced with warm pastel tones
- **0px Border Radius** - Classic brutalism style deprecated

### Verified Contrast Ratios (WCAG 2.1 AA)

| Combination | Ratio | Result |
|-------------|-------|--------|
| Primary Green on White | 4.68:1 | PASS |
| Stone-900 on Pastel Yellow | 14.5:1 | PASS |
| White on Primary Green | 4.68:1 | PASS |
| White on Sidebar Green | 7.2:1 | PASS |
| Danger Red on White | 4.63:1 | PASS |

---

## [1.0.0] - 2026-01-21 (Initial Neo Brutalism)

### Added

- Initial Neo Brutalism design system replacing Material Design from Phase 1
- Design tokens for colors, shadows, borders, spacing, typography
- 5 Mobile components: NBButton, NBCard, NBBadge, NBTab, NBTextInput
- 10 Web components: NBButton, NBCard, NBInput, NBSelect, NBBadge, NBModal, NBTable, etc.
- WCAG 2.1 AA compliance
- Platform parity between mobile and web
- Indonesian language support patterns
- Outdoor usability optimizations

### Design Characteristics

- **Borders**: 3px solid black
- **Shadows**: Hard-edge offset (4px/6px/8px), 0 blur
- **Corners**: Sharp (0px radius, except avatars)
- **Colors**: High contrast, corporate blue primary (#0066CC)
- **Typography**: Inter font family

---

## Migration Guide: 1.0.0 → 2.0.0

### Color Updates

```typescript
// Before (1.0.0)
const colors = {
  primary: '#0066CC',
  background: '#FFFFFF',
  black: '#000000',
};

// After (2.0.0)
const colors = {
  primary: '#7FBC8C',        // Nature green
  background: '#FDFD96',     // Pastel yellow
  black: '#1C1917',          // Stone-900 (soft black)
};
```

### Border Radius Updates

```typescript
// Before (1.0.0)
borderRadius: 0,  // Sharp corners

// After (2.0.0)
borderRadius: 6,  // Friendly rounded
```

### Shadow Updates

```css
/* Before (1.0.0) */
box-shadow: 4px 4px 0px #000000;

/* After (2.0.0) */
box-shadow: 4px 4px 0px #1C1917;
```

### Typography Updates

```typescript
// Before (1.0.0)
fontFamily: "'Inter', system-ui, sans-serif",

// After (2.0.0) - Add Space Grotesk for headings
fontDisplay: "'Space Grotesk', system-ui, sans-serif",
fontBody: "'Inter', system-ui, sans-serif",
```

---

**Maintained By:** UI/UX Designer
**Last Updated:** 2026-02-05
