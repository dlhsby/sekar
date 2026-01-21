# Design System Overview

Complete design system foundation for SEKAR mobile and web applications.

## Design Philosophy

Based on Material Design 3 principles, adapted for Indonesian municipal field workers working in outdoor environments with varying conditions.

---

## Design Tokens

Design tokens are the atomic values that form the foundation of the design system. All tokens are implemented in `fe/mobile/src/constants/theme.ts`.

### Color Tokens

```typescript
// Primary palette
primary: '#2E7D32'      // Main brand color (Green - parks theme)
primaryLight: '#4CAF50' // Lighter variant
primaryDark: '#1B5E20'  // Darker variant

// Secondary palette
secondary: '#1976D2'    // Secondary actions (Blue - trust/government)
secondaryLight: '#42A5F5'
secondaryDark: '#0D47A1'

// Status colors
success: '#4CAF50'      // Completed, synced, online
warning: '#FF9800'      // Pending, attention needed
error: '#F44336'        // Failed, offline, validation errors
info: '#2196F3'         // Informational messages
```

See [Color Palette](./color-palette.md) for complete color documentation.

### Spacing Tokens

Based on an 8px baseline grid:

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Icon padding, tight spacing |
| `sm` | 8px | Component internal padding |
| `md` | 16px | Section spacing, standard padding |
| `lg` | 24px | Card padding, section gaps |
| `xl` | 32px | Screen margins (mobile) |
| `2xl` | 48px | Section dividers |
| `3xl` | 64px | Page sections |

```typescript
// Implementation
spacing: {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
}
```

### Typography Tokens

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `xs` | 12px | Regular | Timestamps, captions |
| `sm` | 14px | Regular | Helper text, labels |
| `base` | 16px | Regular | Body text (default) |
| `lg` | 18px | Medium | Emphasized body |
| `xl` | 20px | Semi-Bold | Subheadings |
| `2xl` | 24px | Bold | Card titles |
| `3xl` | 30px | Bold | Section headers |
| `4xl` | 36px | Bold | Page titles |

See [Typography](./typography.md) for complete typography documentation.

### Border Radius Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `none` | 0px | Sharp corners |
| `sm` | 4px | Small buttons, badges |
| `md` | 8px | Cards, inputs (default) |
| `lg` | 12px | Large cards, modals |
| `xl` | 16px | Bottom sheets |
| `full` | 9999px | Pills, avatars |

```typescript
borderRadius: {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
}
```

---

## Elevation System

Elevation creates visual hierarchy through shadows. Higher elevation = more prominent.

### Mobile (React Native)

| Level | Usage | Implementation |
|-------|-------|----------------|
| 0 | Flat surfaces | No shadow |
| 1 | Cards, list items | `shadows.sm` (elevation: 1) |
| 2 | Floating buttons, active cards | `shadows.md` (elevation: 4) |
| 3 | Modals, dialogs, bottom sheets | `shadows.lg` (elevation: 8) |

```typescript
shadows: {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
}
```

### Web (TailwindCSS)

| Level | Class | Usage |
|-------|-------|-------|
| 0 | `shadow-none` | Flat surfaces |
| 1 | `shadow-sm` | Cards |
| 2 | `shadow` | Interactive cards |
| 3 | `shadow-md` | Dropdowns |
| 4 | `shadow-lg` | Modals |
| 5 | `shadow-xl` | Popovers |

---

## Layout Grid

### Mobile Grid

- **Margins:** 16px (md) on small screens, 24px (lg) on larger
- **Gutters:** 16px between columns
- **Columns:** Single column (most screens), 2-column for grids

```
┌────────────────────────────┐
│    16px │ Content │ 16px   │
│  margin │         │ margin │
└────────────────────────────┘
```

### Web Grid

- **Max Width:** 1440px (centered)
- **Margins:** 24px (small), 48px (medium), 64px (large)
- **Columns:** 12-column grid
- **Gutters:** 24px

---

## Touch Targets

All interactive elements must meet minimum touch target requirements for accessibility.

```typescript
touchTarget: {
  minHeight: 48,
  minWidth: 48,
}
```

| Element | Minimum Size | Recommended |
|---------|--------------|-------------|
| Buttons | 48×48px | 48×44px (wide) |
| Icons (tappable) | 48×48px | 48×48px |
| List items | 48px height | 56-72px height |
| Text inputs | 48px height | 56px height |

---

## Iconography Guidelines

- **Style:** Outlined (primary), Filled (active/selected)
- **Size:** 24px default, 20px small, 32px large
- **Color:** Inherit from text or specified
- **Library:** MaterialCommunityIcons (React Native Vector Icons)

See [Icons & Assets](./icons-assets.md) for complete icon documentation.

---

## Animation Principles

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | 100ms | ease-out | Button press feedback |
| Fast | 200ms | ease-in-out | State changes |
| Normal | 300ms | ease-out | Screen transitions |
| Slow | 500ms | ease-in-out | Complex animations |

See [Interaction Patterns](./interaction-patterns.md) for animation details.

---

## Responsive Breakpoints

```typescript
breakpoints: {
  sm: 375,   // Small phones
  md: 768,   // Tablets
  lg: 1024,  // Desktop
}
```

| Breakpoint | Range | Layout |
|------------|-------|--------|
| Mobile | < 768px | Single column, bottom tabs |
| Tablet | 768-1024px | Two columns, side drawer |
| Desktop | > 1024px | Multi-column, fixed sidebar |

See [Responsive Design](./responsive-design.md) for layout patterns.

---

## Theme Structure

The complete theme object exported from `theme.ts`:

```typescript
export const theme = {
  colors,        // Color palette
  typography,    // Font sizes, weights, families
  spacing,       // Spacing scale
  borderRadius,  // Corner radius scale
  shadows,       // Elevation shadows
  touchTarget,   // Accessibility minimums
  breakpoints,   // Responsive breakpoints
};

export type Theme = typeof theme;
```

---

**Document Owner:** UI/UX Designer
**Last Updated:** 2026-01-16
**Status:** Active
**Implementation:** `fe/mobile/src/constants/theme.ts`
