# Mobile Design Tokens Reference

**Last Updated:** February 7, 2026
**Version:** Neo Brutalism 2.0
**Source File:** `fe/mobile/src/constants/nbTokens.ts`

This document provides the complete design token reference for the SEKAR mobile application.

---

## Table of Contents

1. [Colors](#colors)
2. [Typography](#typography)
3. [Spacing](#spacing)
4. [Borders](#borders)
5. [Border Radius](#border-radius)
6. [Shadows](#shadows)
7. [Animation](#animation)
8. [Breakpoints](#breakpoints)
9. [Z-Index](#z-index)
10. [Touch Targets](#touch-targets)

---

## Colors

### Primary Palette

| Token | Value | Usage |
|-------|-------|-------|
| `nbColors.primary` | #7FBC8C | Primary actions, active states, success |
| `nbColors.primaryDark` | #5A9468 | Primary hover/pressed |
| `nbColors.primaryLight` | #A8D5B1 | Primary backgrounds |
| `nbColors.secondary` | #8B7355 | Secondary actions |
| `nbColors.secondaryDark` | #6B5943 | Secondary hover/pressed |

### Background Colors

| Token | Value | Usage |
|-------|-------|-------|
| `nbColors.background` | #F5F0EB | Main app background (warm stone grey - reduces eye fatigue) |
| `nbColors.surface` | #FFFFFF | Card backgrounds |
| `nbColors.surfaceAlt` | #F5F5F4 | Alternate surfaces |

### Neutral Colors

| Token | Value | Usage |
|-------|-------|-------|
| `nbColors.black` | #1C1917 | Text, borders |
| `nbColors.white` | #FFFFFF | Light text, backgrounds |
| `nbColors.gray50` | #FAFAF9 | Light backgrounds |
| `nbColors.gray100` | #F5F5F4 | Alternate backgrounds |
| `nbColors.gray200` | #E7E5E4 | Borders, dividers |
| `nbColors.gray300` | #D6D3D1 | Disabled backgrounds |
| `nbColors.gray400` | #A8A29E | Placeholder text |
| `nbColors.gray500` | #78716C | Muted icons |
| `nbColors.gray600` | #57534E | Secondary text |
| `nbColors.gray700` | #44403C | Body text |
| `nbColors.gray800` | #292524 | Headings |
| `nbColors.gray900` | #1C1917 | Primary text |

### Semantic Colors

| Token | Value | Usage |
|-------|-------|-------|
| `nbColors.success` | #7FBC8C | Success states |
| `nbColors.successLight` | #BAFCA2 | Success backgrounds |
| `nbColors.successBorder` | #7FBC8C | Success borders |
| `nbColors.warning` | #E3A018 | Warning states |
| `nbColors.warningLight` | #FFDB58 | Warning backgrounds |
| `nbColors.warningBorder` | #E3A018 | Warning borders |
| `nbColors.danger` | #FF6B6B | Error/danger states |
| `nbColors.dangerLight` | #FFA07A | Danger backgrounds |
| `nbColors.dangerBorder` | #FF6B6B | Danger borders |
| `nbColors.info` | #69D2E7 | Info states |
| `nbColors.infoLight` | #A7DBD8 | Info backgrounds |
| `nbColors.infoBorder` | #69D2E7 | Info borders |

### Monitoring Status Colors (Phase 2D)

| Token | Color | Hex | Usage |
|-------|-------|-----|-------|
| statusActive | Green | #15803D | Active worker markers, badges |
| statusInactive | Amber | #D97706 | Inactive worker markers, warnings |
| statusOutsideArea | Purple | #9333EA | Outside area markers, alerts |
| statusMissing | Red | #DC2626 | Missing worker markers, critical |
| statusOffline | Gray | #6B7280 | Offline indicators (list only, not map) |

These colors are defined in `fe/mobile/src/styles/monitoringColors.ts` and used by:
- Map markers (MapDashboardScreen)
- Status chips and badges (UserDetailSheet)
- Summary bar counts (MonitoringSummaryBar)
- Home screen LocationStatusCard border accent

### Sidebar Colors (Reference - Web Only)

| Token | Value | Usage |
|-------|-------|-------|
| `nbColors.sidebar` | #1A4D2E | Sidebar background |
| `nbColors.sidebarHover` | #2D5233 | Sidebar hover |
| `nbColors.sidebarActive` | #0F3520 | Sidebar active |

---

## Typography

### Font Families

| Token | Value | Usage |
|-------|-------|-------|
| `nbFonts.heading` | 'SpaceGrotesk-Bold' | Headings |
| `nbFonts.headingSemiBold` | 'SpaceGrotesk-SemiBold' | Subheadings |
| `nbFonts.body` | 'Inter-Regular' | Body text |
| `nbFonts.bodyMedium` | 'Inter-Medium' | Emphasized text |
| `nbFonts.bodySemiBold` | 'Inter-SemiBold' | Strong emphasis |
| `nbFonts.bodyBold` | 'Inter-Bold' | Bold text |
| `nbFonts.mono` | 'JetBrainsMono-Regular' | Code, numbers |

### Font Sizes

| Token | Value | Line Height | Usage |
|-------|-------|-------------|-------|
| `nbFontSizes.xs` | 10 | 14 | Captions, labels |
| `nbFontSizes.sm` | 12 | 16 | Small text |
| `nbFontSizes.base` | 14 | 20 | Body text |
| `nbFontSizes.md` | 16 | 24 | Large body |
| `nbFontSizes.lg` | 18 | 26 | Subheadings |
| `nbFontSizes.xl` | 20 | 28 | Small headings |
| `nbFontSizes.xxl` | 24 | 32 | Section headings |
| `nbFontSizes.xxxl` | 28 | 36 | Page headings |
| `nbFontSizes.display` | 32 | 40 | Display text |

### Font Weights

| Token | Value | Usage |
|-------|-------|-------|
| `nbFontWeights.regular` | '400' | Body text |
| `nbFontWeights.medium` | '500' | Emphasized |
| `nbFontWeights.semibold` | '600' | Subheadings |
| `nbFontWeights.bold` | '700' | Headings |

### Letter Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `nbLetterSpacing.tight` | -0.5 | Headings |
| `nbLetterSpacing.normal` | 0 | Body |
| `nbLetterSpacing.wide` | 0.5 | Labels, badges |
| `nbLetterSpacing.wider` | 1 | All caps |

---

## Spacing

### Base Scale (4px grid)

| Token | Value | Usage |
|-------|-------|-------|
| `nbSpacing.xxs` | 2 | Micro spacing |
| `nbSpacing.xs` | 4 | Tight spacing |
| `nbSpacing.sm` | 8 | Small gaps |
| `nbSpacing.md` | 12 | Medium gaps |
| `nbSpacing.base` | 16 | Default spacing |
| `nbSpacing.lg` | 20 | Large gaps |
| `nbSpacing.xl` | 24 | Extra large |
| `nbSpacing.xxl` | 32 | Section spacing |
| `nbSpacing.xxxl` | 40 | Large sections |
| `nbSpacing.xxxxl` | 48 | Page margins |

### Component Padding

| Token | Value | Usage |
|-------|-------|-------|
| `nbPadding.button.sm` | { h: 16, v: 8 } | Small buttons |
| `nbPadding.button.md` | { h: 24, v: 12 } | Medium buttons |
| `nbPadding.button.lg` | { h: 32, v: 16 } | Large buttons |
| `nbPadding.card` | 16 | Card content |
| `nbPadding.cardLg` | 24 | Large cards |
| `nbPadding.input` | { h: 16, v: 12 } | Input fields |
| `nbPadding.screen` | 16 | Screen edges |

---

## Borders

### Border Widths

| Token | Value | Usage |
|-------|-------|-------|
| `nbBorders.none` | 0 | No border |
| `nbBorders.thin` | 1 | Subtle borders |
| `nbBorders.base` | 2 | Default borders |
| `nbBorders.thick` | 3 | Emphasized borders |
| `nbBorders.extra` | 4 | Heavy emphasis |

### Border Colors

| Token | Value | Usage |
|-------|-------|-------|
| `nbBorderColors.default` | #1C1917 | Standard borders |
| `nbBorderColors.light` | #E7E5E4 | Subtle borders |
| `nbBorderColors.focus` | #7FBC8C | Focus states |
| `nbBorderColors.error` | #FF6B6B | Error states |
| `nbBorderColors.success` | #7FBC8C | Success states |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `nbBorderRadius.none` | 0 | Sharp corners |
| `nbBorderRadius.sm` | 4 | Badges, small elements |
| `nbBorderRadius.base` | 6 | Buttons, cards, inputs |
| `nbBorderRadius.md` | 8 | Dialogs |
| `nbBorderRadius.lg` | 12 | Large cards |
| `nbBorderRadius.xl` | 16 | Modals |
| `nbBorderRadius.full` | 9999 | Circles, pills |

---

## Shadows

### Neo Brutalism Soft-Edge Shadows

```typescript
nbShadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 2,
  },
  sm: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 4,
  },
  md: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.20,
    shadowRadius: 3,
    elevation: 6,
  },
  lg: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 8,
  },
}
```

### Focus Shadow

```typescript
nbFocusShadow = {
  shadowColor: '#7FBC8C',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.15,
  shadowRadius: 6,
  elevation: 0,
}
```

---

## Animation

### Durations

| Token | Value | Usage |
|-------|-------|-------|
| `nbAnimation.durationFast` | 100 | Micro interactions |
| `nbAnimation.durationNormal` | 150 | Standard transitions |
| `nbAnimation.durationSlow` | 250 | Complex animations |
| `nbAnimation.durationSlowest` | 350 | Page transitions |

### Easing Functions

| Token | Value | Usage |
|-------|-------|-------|
| `nbAnimation.easeIn` | Easing.in(Easing.ease) | Exits |
| `nbAnimation.easeOut` | Easing.out(Easing.ease) | Entrances |
| `nbAnimation.easeInOut` | Easing.inOut(Easing.ease) | Emphasis |
| `nbAnimation.spring` | { damping: 15, stiffness: 150 } | Bouncy |

### Press Animations

```typescript
nbPressAnimation = {
  scale: 0.98,
  translateY: 2,
  shadowReduction: 0.5, // Reduce shadow by 50%
}
```

---

## Breakpoints

| Token | Value | Usage |
|-------|-------|-------|
| `nbBreakpoints.sm` | 360 | Small phones |
| `nbBreakpoints.md` | 400 | Standard phones |
| `nbBreakpoints.lg` | 480 | Large phones |
| `nbBreakpoints.xl` | 600 | Small tablets |
| `nbBreakpoints.xxl` | 768 | Tablets |

---

## Z-Index

| Token | Value | Usage |
|-------|-------|-------|
| `nbZIndex.base` | 0 | Default layer |
| `nbZIndex.dropdown` | 10 | Dropdowns |
| `nbZIndex.sticky` | 20 | Sticky headers |
| `nbZIndex.overlay` | 30 | Overlays |
| `nbZIndex.modal` | 40 | Modals |
| `nbZIndex.toast` | 50 | Toast notifications |
| `nbZIndex.tooltip` | 60 | Tooltips |

---

## Touch Targets

### Minimum Sizes (WCAG 2.1 AA)

| Token | Value | Usage |
|-------|-------|-------|
| `nbTouchTargets.minimum` | 48 | Minimum touch target |
| `nbTouchTargets.comfortable` | 56 | Comfortable touch |
| `nbTouchTargets.large` | 64 | Large buttons |

### Hit Slop

```typescript
nbHitSlop = {
  top: 8,
  right: 8,
  bottom: 8,
  left: 8,
}
```

---

## Usage Examples

### Button with Tokens

```tsx
const styles = StyleSheet.create({
  button: {
    height: nbTouchTargets.minimum, // 48
    paddingHorizontal: nbPadding.button.md.h, // 24
    borderWidth: nbBorders.base, // 2
    borderColor: nbColors.black,
    borderRadius: nbBorderRadius.base, // 6
    backgroundColor: nbColors.primary,
    ...nbShadows.md,
  },
});
```

### Card with Tokens

```tsx
const styles = StyleSheet.create({
  card: {
    padding: nbPadding.card, // 16
    borderWidth: nbBorders.base, // 2
    borderColor: nbColors.black,
    borderRadius: nbBorderRadius.base, // 6
    backgroundColor: nbColors.surface,
    ...nbShadows.sm,
  },
});
```

### Input with Tokens

```tsx
const styles = StyleSheet.create({
  input: {
    height: nbTouchTargets.minimum, // 48
    paddingHorizontal: nbPadding.input.h, // 16
    paddingVertical: nbPadding.input.v, // 12
    borderWidth: nbBorders.base, // 2
    borderColor: nbColors.black,
    borderRadius: nbBorderRadius.base, // 6
    backgroundColor: nbColors.surface,
    fontFamily: nbFonts.body,
    fontSize: nbFontSizes.base, // 14
    color: nbColors.black,
    ...nbShadows.sm,
  },
  inputFocused: {
    borderWidth: nbBorders.thick, // 3
    borderColor: nbColors.primary,
    ...nbFocusShadow,
  },
});
```

---

## Migration from v1.0 to v2.0

### Border Changes

```typescript
// Before (v1.0)
borderWidth: nbBorders.default, // was 3

// After (v2.0)
borderWidth: nbBorders.base, // now 2
```

### Border Radius Changes

```typescript
// Before (v1.0)
borderRadius: nbBorderRadius.minimal, // was 2

// After (v2.0)
borderRadius: nbBorderRadius.base, // now 6
```

### Shadow Changes

```typescript
// Before (v1.0) - Hard edge
{
  shadowOffset: { width: 4, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 0,
}

// After (v2.0) - Soft edge
{
  shadowOffset: { width: 4, height: 4 },
  shadowOpacity: 0.18,
  shadowRadius: 2,
}
```

### Renamed Tokens

| Old (v1.0) | New (v2.0) |
|------------|------------|
| `nbBorders.default` | `nbBorders.base` |
| `nbBorderRadius.minimal` | `nbBorderRadius.base` |
| `nbBorderRadius.small` | `nbBorderRadius.sm` |
