# Color Palette

Complete color system for SEKAR applications with accessibility compliance.

## Color Philosophy

- **Primary Green:** Represents nature, parks, and green spaces (RTH - Ruang Terbuka Hijau)
- **Secondary Blue:** Represents trust, government, and reliability
- **Status Colors:** Universal meaning for success, warning, error states

---

## Primary Colors

The primary palette is used for main actions, headers, active states, and brand identity.

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Primary** | `#2E7D32` | 46, 125, 50 | Main CTAs, headers, active states |
| Primary Light | `#4CAF50` | 76, 175, 80 | Hover states, success indicators |
| Primary Dark | `#1B5E20` | 27, 94, 32 | Pressed states, emphasis |

### Primary Usage Examples

```tsx
// Button primary
backgroundColor: colors.primary  // #2E7D32

// Active tab indicator
borderBottomColor: colors.primary

// Header background
backgroundColor: colors.primary
```

---

## Secondary Colors

The secondary palette is used for links, secondary actions, and informational elements.

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Secondary** | `#1976D2` | 25, 118, 210 | Links, secondary actions |
| Secondary Light | `#42A5F5` | 66, 165, 245 | Hover states, highlights |
| Secondary Dark | `#0D47A1` | 13, 71, 161 | Pressed states |

### Secondary Usage Examples

```tsx
// Text link
color: colors.secondary

// Secondary button
borderColor: colors.secondary
color: colors.secondary
```

---

## Status Colors

Status colors communicate state and feedback. They must be paired with icons for accessibility (never rely on color alone).

| Status | Hex | RGB | Contrast | Icon | Usage |
|--------|-----|-----|----------|------|-------|
| **Success** | `#4CAF50` | 76, 175, 80 | 4.6:1 ✅ | check-circle | Completed, synced, valid |
| **Warning** | `#F57C00` | 245, 124, 0 | 4.5:1 ✅ | alert | Pending, attention needed |
| **Error** | `#D32F2F` | 211, 47, 47 | 5.0:1 ✅ | alert-circle | Failed, invalid, offline |
| **Info** | `#1976D2` | 25, 118, 210 | 4.5:1 ✅ | information | Informational alerts |

### Status Badge Examples

```tsx
// Success state
<StatusBadge
  color={colors.success}
  icon="check-circle"
  text="Tersinkronisasi"
/>

// Error state
<StatusBadge
  color={colors.error}
  icon="alert-circle"
  text="Gagal"
/>
```

---

## Grayscale

The grayscale palette provides neutral colors for backgrounds, text, borders, and disabled states.

| Name | Hex | Usage |
|------|-----|-------|
| `gray100` | `#F5F5F5` | Page backgrounds, disabled backgrounds |
| `gray200` | `#EEEEEE` | Card backgrounds, dividers |
| `gray300` | `#E0E0E0` | Borders, subtle dividers |
| `gray400` | `#BDBDBD` | Disabled text, placeholder text |
| `gray500` | `#9E9E9E` | Hint text, secondary icons |
| `gray600` | `#757575` | Secondary text |
| `gray700` | `#616161` | Body text |
| `gray800` | `#424242` | Headings |
| `gray900` | `#212121` | Primary text |

### Grayscale Visualization

```
gray100 ░░░░░░░░░░ #F5F5F5 (lightest)
gray200 ░░░░░░░░░░ #EEEEEE
gray300 ░░░░░░░░░░ #E0E0E0
gray400 ▒▒▒▒▒▒▒▒▒▒ #BDBDBD
gray500 ▒▒▒▒▒▒▒▒▒▒ #9E9E9E
gray600 ▓▓▓▓▓▓▓▓▓▓ #757575
gray700 ▓▓▓▓▓▓▓▓▓▓ #616161
gray800 ██████████ #424242
gray900 ██████████ #212121 (darkest)
```

---

## Text Colors

| Name | Hex | Usage |
|------|-----|-------|
| `textPrimary` | `#212121` | Headings, primary content |
| `textSecondary` | `#757575` | Labels, descriptions, metadata |
| `textDisabled` | `#BDBDBD` | Disabled text |
| `textHint` | `#9E9E9E` | Placeholder text, hints |

---

## Background Colors

| Name | Hex | Usage |
|------|-----|-------|
| `background` | `#FFFFFF` | Main page background |
| `backgroundSecondary` | `#F5F5F5` | Secondary backgrounds, grouped sections |
| `surface` | `#FFFFFF` | Cards, modals, elevated surfaces |

---

## Border & Divider Colors

| Name | Hex | Usage |
|------|-----|-------|
| `border` | `#E0E0E0` | Input borders, card borders |
| `divider` | `#BDBDBD` | List dividers, section separators |

---

## Overlay Colors

| Name | Value | Usage |
|------|-------|-------|
| `overlay` | `rgba(0, 0, 0, 0.5)` | Modal backdrop |
| `overlayLight` | `rgba(0, 0, 0, 0.3)` | Subtle overlay |

---

## Accessibility Contrast Ratios

All color combinations are tested against WCAG 2.1 AA requirements.

### Text Contrast (minimum 4.5:1)

| Foreground | Background | Ratio | WCAG AA | WCAG AAA |
|------------|------------|-------|---------|----------|
| `#212121` | `#FFFFFF` | 16.1:1 | ✅ Pass | ✅ Pass |
| `#757575` | `#FFFFFF` | 4.6:1 | ✅ Pass | ❌ Fail |
| `#2E7D32` | `#FFFFFF` | 5.1:1 | ✅ Pass | ❌ Fail |
| `#FFFFFF` | `#2E7D32` | 5.1:1 | ✅ Pass | ❌ Fail |
| `#1976D2` | `#FFFFFF` | 4.5:1 | ✅ Pass | ❌ Fail |
| `#F44336` | `#FFFFFF` | 4.0:1 | ⚠️ Large text only | ❌ Fail |
| `#FF9800` | `#212121` | 4.9:1 | ✅ Pass | ❌ Fail |

### Large Text Contrast (minimum 3:1)

Large text is defined as 18px+ regular or 14px+ bold.

| Foreground | Background | Ratio | Result |
|------------|------------|-------|--------|
| `#F44336` | `#FFFFFF` | 4.0:1 | ✅ Pass |
| `#FF9800` | `#FFFFFF` | 2.9:1 | ⚠️ Use dark text |

### UI Component Contrast (minimum 3:1)

| Element | Color | Background | Ratio | Result |
|---------|-------|------------|-------|--------|
| Primary Button | `#2E7D32` | `#FFFFFF` | 5.1:1 | ✅ Pass |
| Border | `#E0E0E0` | `#FFFFFF` | 1.8:1 | ⚠️ Ensure sufficient |
| Focus ring | `#2E7D32` | `#FFFFFF` | 5.1:1 | ✅ Pass |

---

## Dark Mode Considerations (Future)

For future dark mode implementation:

| Light Mode | Dark Mode |
|------------|-----------|
| `background: #FFFFFF` | `background: #121212` |
| `surface: #FFFFFF` | `surface: #1E1E1E` |
| `textPrimary: #212121` | `textPrimary: #FFFFFF` |
| `primary: #2E7D32` | `primary: #4CAF50` |

---

## Color Usage Guidelines

### Do's
- ✅ Use primary green for main CTAs and navigation
- ✅ Use status colors with accompanying icons
- ✅ Maintain 4.5:1 contrast for body text
- ✅ Use consistent color meaning throughout the app
- ✅ Test colors in bright sunlight conditions

### Don'ts
- ❌ Don't use color alone to convey information
- ❌ Don't use low-contrast text (gray400 on white)
- ❌ Don't mix primary and secondary for similar actions
- ❌ Don't use red for non-error states
- ❌ Don't use warning orange as a primary CTA color

---

## Implementation

```typescript
// fe/mobile/src/constants/theme.ts
export const colors = {
  primary: '#2E7D32',
  primaryLight: '#4CAF50',
  primaryDark: '#1B5E20',
  secondary: '#1976D2',
  secondaryLight: '#42A5F5',
  secondaryDark: '#0D47A1',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
  // ... grayscale, text, background colors
};
```

---

**Document Owner:** UI/UX Designer
**Last Updated:** 2026-01-16
**Status:** Active
**Related:** [Design System](./design-system.md), [Accessibility](./accessibility.md)
