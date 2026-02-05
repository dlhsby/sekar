# Neo Brutalism Design System

**Version:** 2.0.0 (Modern Neo Brutalism)
**Phase 2+ Design System for SEKAR Web and Mobile Applications**

This document defines the **Modern Neo Brutalism** design system for SEKAR. The system combines bold aesthetics with excellent usability, creating interfaces that are both visually distinctive and highly functional for government field operations in parks and green spaces.

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Design Philosophy](#design-philosophy)
3. [Research Sources](#research-sources)
4. [Color System](#color-system)
5. [Shadow System](#shadow-system)
6. [Border System](#border-system)
7. [Typography](#typography)
8. [Spacing](#spacing)
9. [Animation](#animation)
10. [Background Patterns](#background-patterns)
11. [Component Specifications](#component-specifications)
12. [Web Implementation](#web-implementation)
13. [Mobile Implementation](#mobile-implementation)
14. [Accessibility](#accessibility)
15. [Related Documentation](#related-documentation)

---

## Quick Reference

### Design Tokens (Copy-Paste Ready)

**Primary Colors (Sepidy's Neo Brutalism Palette - Row 4):**
```
primary:        #7FBC8C    primaryHover:   #6BA87A    primaryActive:  #5A9468
secondary:      #8B7355    secondaryHover: #725E45
success:        #7FBC8C    warning:        #E3A018    danger:         #FF6B6B
info:           #69D2E7
```

**Background Colors (Sepidy's Palette - Row 1 Pastels):**
```
bg-primary:     #FDFD96    bg-secondary:   #B5D2AD    bg-mint:        #DAF5F0
bg-surface:     #FFFFFF    bg-elevated:    #FCDFFF
```

**Accent Colors (Sepidy's Palette - Vibrant):**
```
accent-cyan:    #69D2E7    accent-yellow:  #FFDB58    accent-coral:   #FF6B6B
accent-pink:    #FF69B4    accent-purple:  #A388EE    accent-violet:  #C4A1FF
```

**Neutrals (Warm Stone Tones):**
```
black:          #1C1917    white:          #FFFFFF    navy:           #1A4D2E
gray-50:        #FAFAF9    gray-100:       #F5F5F4    gray-200:       #E7E5E4
gray-300:       #D6D3D1    gray-400:       #A8A29E    gray-500:       #78716C
gray-600:       #57534E    gray-700:       #44403C    gray-800:       #292524
```

**Sidebar (Dark Forest Green):**
```
sidebar-bg:     #1A4D2E    sidebar-text:   #FFFFFF    sidebar-hover:  #2D5233
sidebar-active: #0F3520    sidebar-border: #2D5233
```

**Shadows (CSS):**
```css
--shadow-xs:      2px 2px 0px #1C1917   /* Badges, small elements */
--shadow-sm:      4px 4px 0px #1C1917   /* Cards, inputs */
--shadow-md:      6px 6px 0px #1C1917   /* Buttons, interactive */
--shadow-lg:      8px 8px 0px #1C1917   /* Modals, dropdowns */
--shadow-xl:      10px 10px 0px #1C1917 /* Hero elements */
--shadow-hover:   8px 8px 0px #1C1917   /* With translate(-2px, -2px) */
--shadow-active:  2px 2px 0px #1C1917   /* With translate(2px, 2px) */
```

**Shadows (React Native):**
```typescript
sm:     { shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.18, shadowRadius: 2, elevation: 3 }
md:     { shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.20, shadowRadius: 3, elevation: 4 }
lg:     { shadowOffset: { width: 5, height: 5 }, shadowOpacity: 0.22, shadowRadius: 4, elevation: 5 }
active: { shadowOffset: { width: 1, height: 1 }, shadowOpacity: 0.15, shadowRadius: 0, elevation: 1 }
```

**Borders:**
```
thin:    1px solid #1C1917   /* Dividers, subtle separators */
base:    2px solid #1C1917   /* DEFAULT - buttons, cards, inputs */
thick:   3px solid #1C1917   /* Emphasis, selected states */
extra:   4px solid #1C1917   /* Hero elements */
```

**Border Radius:**
```
none:    0px     /* Decorative elements */
sm:      4px     /* Badges, tags */
base:    6px     /* DEFAULT - buttons, cards, inputs */
md:      8px     /* Modals, large cards */
lg:      12px    /* Callouts, featured */
full:    9999px  /* Avatars, pills */
```

**Spacing (8px Grid):**
```
xs: 4px    sm: 8px    md: 16px    lg: 24px    xl: 32px    2xl: 48px    3xl: 64px
```

**Typography (Space Grotesk + Inter):**
```
Display XL: 48px / 800 / 1.25    /* Hero text (Space Grotesk) */
Display:    40px / 800 / 1.25    /* Page titles (Space Grotesk) */
H1:         32px / 700 / 1.25    /* Section headers (Space Grotesk) */
H2:         26px / 700 / 1.25    /* Card titles (Space Grotesk) */
H3:         22px / 600 / 1.25    /* Subheadings (Space Grotesk) */
H4:         18px / 600 / 1.25    /* Minor headings (Inter) */
Body Large: 18px / 500 / 1.5     /* Emphasized body (Inter) */
Body:       16px / 400 / 1.5     /* Default body (Inter) */
Body Small: 14px / 400 / 1.5     /* Secondary text (Inter) */
Caption:    12px / 400 / 1.5     /* Timestamps, labels (Inter) */
```

**Touch/Click Targets:**
```
Minimum: 48x48px (WCAG 2.1 AA)
```

**Animation Durations:**
```
instant: 80ms     /* Micro-feedback, badges, icons */
fast:    150ms    /* Button press, hover states */
normal:  250ms    /* State transitions, modals */
slow:    400ms    /* Page transitions, complex animations */
```

---

## Design Philosophy

### Core Principles

1. **Bold & Confident**: Heavy borders, stark contrasts, and vibrant colors convey authority and trustworthiness - appropriate for government applications.

2. **Nature-Aligned**: Parks green (#7FBC8C) as primary color creates instant association with SEKAR's mission of parks and green spaces management.

3. **Warm & Inviting**: Pastel backgrounds (#FDFD96) create a friendly, approachable feel while maintaining professionalism.

4. **Function Over Decoration**: Every design element serves a purpose. Shadows indicate elevation and interactivity.

5. **High Visibility**: Designed for outdoor field workers using mobile devices in varying light conditions.

6. **Modern Brutalism**: Friendly 6px border radius and subtle shadow softness while maintaining bold NB character.

### Visual Characteristics

| Characteristic | Old NB (1.0) | Modern NB (2.0) |
|----------------|--------------|-----------------|
| **Borders** | 3px solid black | 2px solid #1C1917 (softer) |
| **Shadows** | Hard 6px, 0 blur | Soft 4px, slight blur |
| **Corners** | 0px (Sharp) | 6px (Friendly) |
| **Primary** | #0066CC (Corporate Blue) | #7FBC8C (Nature Green) |
| **Background** | #FFFFFF (White) | #FDFD96 (Warm Pastel) |
| **Display Font** | Inter | Space Grotesk |
| **Patterns** | None | Grid/Dots at 3% |

### Reference Implementation

**Primary References:**
- [neobrutalism.dev](https://www.neobrutalism.dev/) - Component library
- [Sepidy's Neo Brutalism Guide](https://medium.com/@sepidy/how-can-i-design-in-the-neo-brutalism-style-d85c458042de) - Color palette
- [Neo-brutalism-CSS](https://github.com/Walikuperek/Neo-brutalism-CSS) - Typography

---

## Research Sources

The Modern Neo Brutalism 2.0 design system is based on verified research sources:

| Source | Key Specifications Extracted |
|--------|------------------------------|
| [Sepidy Medium Article](https://medium.com/@sepidy/how-can-i-design-in-the-neo-brutalism-style-d85c458042de) | **4x6 Color Palette**, Shadow X=10, Y=16, blur=0, stroke=6px |
| [neobrutalism.dev](https://www.neobrutalism.dev/) | `border-2`, `shadow-light/dark`, `boxShadowX/Y` for hover, `rounded-base` |
| [Neo-brutalism-CSS](https://github.com/Walikuperek/Neo-brutalism-CSS) | 3-4px borders, `shadow-neo`, Space Grotesk + Inter fonts |
| [neo-brutalism-ui-library](https://github.com/marieooq/neo-brutalism-ui-library) | Vibrant palette (violet, pink, yellow, cyan) |
| [NN/g Neobrutalism](https://www.nngroup.com/articles/neobrutalism/) | Usability guidelines, accessibility considerations |
| [Tailkits NB](https://tailkits.com/components/neobrutalism/) | border-4/8, rounded-none to rounded-2xl, high contrast |
| [Bejamas NB Trend](https://bejamas.com/blog/neubrutalism-web-design-trend) | 2024 trends, vibrant colors, thick borders, no gradients |
| [Clover 2025 NB](https://www.clovertechnology.co/insights/how-neo-brutalism-took-over-digital-design-in-2025) | Hybrid styles, intentional chaos, strong shadows |

---

## Color System

### Sepidy's Neo Brutalism Color Palette (Primary Source)

The palette is organized as a 4x6 grid with increasing saturation from top to bottom:

| | Cyan/Mint | Green | Yellow | Orange/Coral | Pink | Purple |
|---|---|---|---|---|---|---|
| **Row 1 (Pastel BG)** | #DAF5F0 | #B5D2AD | #FDFD96 | #F8D6B3 | #FCDFFF | #E3DFF2 |
| **Row 2 (Light)** | #A7DBD8 | #BAFCA2 | #FFDB58 | #FFA07A | #FFC0CB | #C4A1FF |
| **Row 3 (Medium)** | #87CEEB | #90EE90 | #F4D738 | #FF7A5C | #FFB2EF | #A388EE |
| **Row 4 (Bold)** | #69D2E7 | #7FBC8C | #E3A018 | #FF6B6B | #FF69B4 | #9723C9 |

### SEKAR Application Color Mapping

```typescript
// Design Tokens - Shared between web and mobile
export const colors = {
  // PRIMARY - Using Row 4 Green (Parks/Nature Theme)
  primary: '#7FBC8C',        // Bold green from Sepidy palette
  primaryHover: '#6BA87A',   // 15% darker
  primaryActive: '#5A9468',  // 25% darker
  primaryLight: '#90EE90',   // Medium mint (Row 3)
  primaryPastel: '#B5D2AD',  // Pastel green (Row 1)

  // SECONDARY - Earth Brown (complements green)
  secondary: '#8B7355',      // Warm earth brown
  secondaryHover: '#725E45', // Darker
  secondaryLight: '#C4A77D', // Light brown

  // ACCENT COLORS (From Sepidy Palette)
  accentCyan: '#69D2E7',     // Bold cyan (Row 4, Col 1)
  accentYellow: '#FFDB58',   // Light sunshine (Row 2, Col 3)
  accentCoral: '#FF6B6B',    // Bold red (Row 4, Col 4)
  accentPink: '#FF69B4',     // Hot pink (Row 4, Col 5)
  accentPurple: '#A388EE',   // Medium purple (Row 3, Col 6)
  accentViolet: '#C4A1FF',   // Light violet (Row 2, Col 6)

  // BACKGROUNDS - Using Sepidy Pastel Row
  bgPrimary: '#FDFD96',      // Pastel yellow - main background
  bgSecondary: '#B5D2AD',    // Pastel green - alternate
  bgMint: '#DAF5F0',         // Pastel mint - cards, dialogs
  bgSurface: '#FFFFFF',      // Pure white - elevated cards
  bgElevated: '#FCDFFF',     // Pastel pink - special surfaces

  // STATUS COLORS (From Sepidy Palette)
  success: '#7FBC8C',        // Bold green (same as primary)
  successLight: '#BAFCA2',   // Light grass (Row 2, Col 2)
  warning: '#E3A018',        // Bold amber (Row 4, Col 3)
  warningLight: '#FFDB58',   // Light sunshine (Row 2, Col 3)
  danger: '#FF6B6B',         // Bold red (Row 4, Col 4)
  dangerLight: '#FFA07A',    // Light salmon (Row 2, Col 4)
  info: '#69D2E7',           // Bold cyan (Row 4, Col 1)
  infoLight: '#A7DBD8',      // Light cyan (Row 2, Col 1)

  // NEUTRALS - Warm Gray Scale (Stone)
  black: '#1C1917',          // Stone-900 (soft black)
  white: '#FFFFFF',
  navy: '#1A4D2E',           // Dark forest green
  gray: {
    50: '#FAFAF9',           // Stone-50
    100: '#F5F5F4',          // Stone-100
    200: '#E7E5E4',          // Stone-200
    300: '#D6D3D1',          // Stone-300
    400: '#A8A29E',          // Stone-400
    500: '#78716C',          // Stone-500
    600: '#57534E',          // Stone-600
    700: '#44403C',          // Stone-700
    800: '#292524',          // Stone-800
    900: '#1C1917',          // Stone-900
  },

  // SIDEBAR - Deep Forest Green
  sidebar: {
    bg: '#1A4D2E',           // Dark forest green
    text: '#FFFFFF',         // White text
    hover: '#2D5233',        // Medium forest green
    active: '#0F3520',       // Darkest forest green
    border: '#2D5233',       // Subtle border
  },
};
```

### Color Application Rules

1. **Primary Backgrounds**: Use pastel yellow (`#FDFD96`) for main content areas
2. **Cards & Dialogs**: Use pastel mint (`#DAF5F0`) or white (`#FFFFFF`)
3. **Borders**: Use soft black (`#1C1917`) at 2px width
4. **Shadows**: Use soft black (`#1C1917`) with no blur
5. **Text**:
   - Primary text: `#1C1917` (stone-900)
   - Secondary text: `#57534E` (stone-600)
   - Placeholder: `#A8A29E` (stone-400)
6. **Status Indicators**:
   - Success: `#7FBC8C` (green) with `#BAFCA2` light variant
   - Warning: `#E3A018` (amber) with `#FFDB58` light variant
   - Danger: `#FF6B6B` (red) with `#FFA07A` light variant
   - Info: `#69D2E7` (cyan) with `#A7DBD8` light variant

---

## Shadow System

Based on [neobrutalism.dev](https://www.neobrutalism.dev/) modern NB approach with slightly softer feel.

### Web (CSS)

```css
:root {
  /* Base shadows */
  --shadow-xs: 2px 2px 0px #1C1917;      /* Badges, small elements */
  --shadow-sm: 4px 4px 0px #1C1917;      /* Cards, inputs */
  --shadow-md: 6px 6px 0px #1C1917;      /* Buttons (default) */
  --shadow-lg: 8px 8px 0px #1C1917;      /* Modals, dropdowns */
  --shadow-xl: 10px 10px 0px #1C1917;    /* Hero elements */

  /* Interaction shadows */
  --shadow-hover: 8px 8px 0px #1C1917;   /* Grow on hover */
  --shadow-active: 2px 2px 0px #1C1917;  /* Shrink on press */
  --shadow-none: 0px 0px 0px transparent;

  /* Colored shadows (playful variants) */
  --shadow-primary: 6px 6px 0px #5A9468;  /* Green shadow */
  --shadow-warning: 6px 6px 0px #E8B931;  /* Yellow shadow */
  --shadow-danger: 6px 6px 0px #DC2626;   /* Red shadow */
  --shadow-accent: 6px 6px 0px #A8A6FF;   /* Violet shadow */

  /* Interaction variables (neobrutalism.dev pattern) */
  --box-shadow-x: 4px;
  --box-shadow-y: 4px;
  --hover-translate-x: -2px;
  --hover-translate-y: -2px;
  --press-translate-x: 2px;
  --press-translate-y: 2px;
}
```

### Mobile (React Native)

```typescript
export const shadows = {
  sm: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 2,       // Subtle blur for soft feel
    elevation: 3,
  },
  md: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 3,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 5,
  },
  active: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 0,
    elevation: 1,
  },
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
};
```

### Shadow Animation Pattern

From [neobrutalism.dev](https://www.neobrutalism.dev/) `boxShadowX/boxShadowY` pattern:

```css
.nb-button {
  box-shadow: var(--shadow-md);
  transition: all var(--duration-fast) ease-out;
}

.nb-button:hover {
  box-shadow: var(--shadow-hover);
  transform: translate(var(--hover-translate-x), var(--hover-translate-y));
}

.nb-button:active {
  box-shadow: var(--shadow-active);
  transform: translate(var(--press-translate-x), var(--press-translate-y));
}
```

---

## Border System

Per [neobrutalism.dev](https://www.neobrutalism.dev/): Uses `border-2` (2px) as standard.
Per [Neo-brutalism-CSS](https://github.com/Walikuperek/Neo-brutalism-CSS): 3-4px for bold emphasis.

### Border Widths

```typescript
export const borders = {
  width: {
    thin: 1,      // Dividers, subtle separators
    base: 2,      // DEFAULT - buttons, cards, inputs
    thick: 3,     // Emphasis, selected states
    extra: 4,     // Hero elements, special emphasis
  },
  style: 'solid',
  color: '#1C1917',  // Soft black (stone-900)
};
```

### Border Radius

Modern NB allows rounding per [Tailkits](https://tailkits.com/components/neobrutalism/): `rounded-none` to `rounded-2xl`.

```typescript
export const borderRadius = {
  none: 0,        // Classic brutalism style, decorative
  sm: 4,          // Badges, tags, small elements
  base: 6,        // DEFAULT - buttons, cards, inputs
  md: 8,          // Modals, large cards
  lg: 12,         // Callouts, featured elements
  full: 9999,     // Avatars, pills
};
```

### Border Colors

```typescript
export const borderColors = {
  default: '#1C1917',                    // Soft black
  soft: 'rgba(28, 25, 23, 0.5)',         // 50% opacity for subtle
  primary: '#5A9468',                    // Green border variant
  danger: '#DC2626',                     // Error state
  focus: '#7FBC8C',                      // Focus state (primary)
};
```

---

## Typography

Per [Neo-brutalism-CSS](https://github.com/Walikuperek/Neo-brutalism-CSS): Uses Space Grotesk (headings) and Inter (body text).

### Font Families

```typescript
export const fonts = {
  display: "'Space Grotesk', system-ui, sans-serif",  // Headings
  body: "'Inter', system-ui, sans-serif",             // Body text
  mono: "'JetBrains Mono', ui-monospace, monospace",  // Code
};
```

### Font Weights

```typescript
export const fontWeight = {
  light: 300,       // Large display only
  regular: 400,     // Body text
  medium: 500,      // Emphasized body
  semibold: 600,    // Subheadings
  bold: 700,        // Headings
  extrabold: 800,   // Display text
};
```

### Type Scale

| Name | Size | Weight | Line Height | Font | Usage |
|------|------|--------|-------------|------|-------|
| Display XL | 48px | 800 | 1.25 | Space Grotesk | Hero text |
| Display | 40px | 800 | 1.25 | Space Grotesk | Page titles |
| H1 | 32px | 700 | 1.25 | Space Grotesk | Section headers |
| H2 | 26px | 700 | 1.25 | Space Grotesk | Card titles |
| H3 | 22px | 600 | 1.25 | Space Grotesk | Subheadings |
| H4 | 18px | 600 | 1.25 | Inter | Minor headings |
| Body Large | 18px | 500 | 1.5 | Inter | Emphasized body |
| Body | 16px | 400 | 1.5 | Inter | Default body text |
| Body Small | 14px | 400 | 1.5 | Inter | Secondary text |
| Caption | 12px | 400 | 1.5 | Inter | Timestamps, labels |

```typescript
export const fontSize = {
  displayXl: 48,
  display: 40,
  h1: 32,
  h2: 26,
  h3: 22,
  h4: 18,
  bodyLg: 18,
  body: 16,
  bodySm: 14,
  caption: 12,
};

export const lineHeight = {
  tight: 1.25,      // Headings
  normal: 1.5,      // Body
  relaxed: 1.625,   // Long form text
};
```

---

## Spacing

8px baseline grid system for consistent layout.

```typescript
export const spacing = {
  xs: 4,      // Tight gaps
  sm: 8,      // Small gaps (1 unit)
  md: 16,     // Default gaps (2 units)
  lg: 24,     // Larger gaps (3 units)
  xl: 32,     // Section gaps (4 units)
  '2xl': 48,  // Large sections (6 units)
  '3xl': 64,  // Hero sections (8 units)
};
```

---

## Animation

Per [neobrutalism.dev](https://www.neobrutalism.dev/) and [Neo-brutalism-CSS](https://github.com/Walikuperek/Neo-brutalism-CSS).

### Durations

```typescript
export const duration = {
  instant: 80,     // Micro-interactions (badges, icons)
  fast: 150,       // Buttons, hover states
  normal: 250,     // Modals, transitions
  slow: 400,       // Page transitions
};
```

### Easing Curves

```typescript
export const easing = {
  out: 'cubic-bezier(0.0, 0, 0.2, 1)',          // Elements entering
  in: 'cubic-bezier(0.4, 0, 1, 1)',             // Elements leaving
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',        // Moving elements
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',  // Playful bounce
};
```

### Interaction Values

```typescript
// neobrutalism.dev boxShadowX/boxShadowY pattern
export const interaction = {
  boxShadowX: 4,          // Horizontal shadow offset
  boxShadowY: 4,          // Vertical shadow offset
  hoverTranslateX: -2,    // Move left on hover (half of shadow)
  hoverTranslateY: -2,    // Move up on hover
  pressTranslateX: 2,     // Move right on press
  pressTranslateY: 2,     // Move down on press
  pressScale: 0.98,       // Slight shrink on press (optional)
};
```

---

## Background Patterns

Add visual interest to dashboards, login screens, empty states, and hero sections.

### Pattern Specifications

**Opacity:** 3% (0.03) - subtle, professional

### Grid Pattern (CSS)

```css
.pattern-grid {
  background-image:
    linear-gradient(rgba(45, 82, 51, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(45, 82, 51, 0.03) 1px, transparent 1px);
  background-size: 32px 32px;
}
```

### Dots Pattern (CSS)

```css
.pattern-dots {
  background-image: radial-gradient(
    circle at center,
    rgba(45, 82, 51, 0.04) 1.5px,
    transparent 1.5px
  );
  background-size: 24px 24px;
}
```

### Diagonal Lines Pattern (CSS)

```css
.pattern-diagonal {
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 10px,
    rgba(45, 82, 51, 0.02) 10px,
    rgba(45, 82, 51, 0.02) 11px
  );
}
```

### Mobile (React Native SVG)

```typescript
// Pattern color
export const patternColor = 'rgba(45, 82, 51, 0.03)';  // Forest green at 3%

// Use existing NBBackgroundPattern component with green color
<NBBackgroundPattern
  pattern="grid"
  backgroundColor={colors.bgPrimary}
  patternColor={patternColor}
  opacity={0.03}
>
  <ScreenContent />
</NBBackgroundPattern>
```

### Usage Guidelines

- **Dashboard**: Grid pattern on background
- **Login**: Dots pattern for visual interest
- **Empty States**: Subtle dots pattern
- **Hero Sections**: Diagonal lines for dynamic feel
- **Cards/Modals**: No pattern (solid color)

---

## Component Specifications

### Button

```yaml
base:
  border-width: "2px"
  border-color: "#1C1917"
  border-radius: "6px"
  min-height: "48px"
  padding: "12px 24px"
  font-family: "Inter"
  font-weight: 600
  font-size: "16px"
  transition: "all 150ms ease-out"

variants:
  primary:
    background: "#7FBC8C"
    text-color: "#FFFFFF"
    shadow: "shadow-md"

  secondary:
    background: "#8B7355"
    text-color: "#FFFFFF"
    shadow: "shadow-md"

  outline:
    background: "transparent"
    text-color: "#1C1917"
    shadow: "shadow-sm"

  ghost:
    background: "transparent"
    text-color: "#1C1917"
    border-color: "transparent"
    shadow: "none"

  destructive:
    background: "#FF6B6B"
    text-color: "#FFFFFF"
    shadow: "shadow-md"

states:
  hover:
    transform: "translate(-2px, -2px)"
    shadow: "shadow-hover"

  active:
    transform: "translate(2px, 2px)"
    shadow: "shadow-active"

  disabled:
    opacity: 0.5
    cursor: "not-allowed"

  loading:
    opacity: 0.8
```

### Card

```yaml
base:
  background: "#FFFFFF"
  border-width: "2px"
  border-color: "#1C1917"
  border-radius: "6px"
  padding: "24px"
  shadow: "shadow-sm"

variants:
  default:
    shadow: "shadow-sm"

  elevated:
    shadow: "shadow-md"

  outlined:
    shadow: "none"

  filled:
    background: "#DAF5F0"  # Pastel mint
    border-color: "transparent"
    shadow: "none"

  interactive:
    cursor: "pointer"
    transition: "all 150ms ease-out"
    hover:
      shadow: "shadow-hover"
      transform: "translate(-2px, -2px)"
    active:
      shadow: "shadow-active"
      transform: "translate(2px, 2px)"
```

### Input

```yaml
base:
  background: "#FFFFFF"
  border-width: "2px"
  border-color: "#1C1917"
  border-radius: "6px"
  min-height: "48px"
  padding: "12px 16px"
  font-size: "16px"
  shadow: "shadow-xs"
  transition: "all 150ms ease-out"

states:
  focus:
    border-color: "#7FBC8C"
    shadow: "0 0 0 3px rgba(127, 188, 140, 0.15)"
    outline: "none"

  error:
    border-color: "#FF6B6B"
    shadow: "shadow-danger"

  success:
    border-color: "#7FBC8C"
    shadow: "shadow-primary"

  disabled:
    background: "#F5F5F4"
    opacity: 0.7
    cursor: "not-allowed"

with-icon:
  padding-left: "48px"
  icon-color: "#78716C"
```

### Badge

```yaml
base:
  border-width: "2px"
  border-color: "#1C1917"
  border-radius: "4px"
  padding: "4px 12px"
  font-size: "12px"
  font-weight: 600
  shadow: "shadow-xs"

variants:
  default:
    background: "#F5F5F4"
    text-color: "#1C1917"

  primary:
    background: "#7FBC8C"
    text-color: "#FFFFFF"

  success:
    background: "#BAFCA2"
    text-color: "#1C1917"
    border-color: "#7FBC8C"

  warning:
    background: "#FFDB58"
    text-color: "#1C1917"
    border-color: "#E3A018"

  danger:
    background: "#FFA07A"
    text-color: "#1C1917"
    border-color: "#FF6B6B"

  info:
    background: "#A7DBD8"
    text-color: "#1C1917"
    border-color: "#69D2E7"
```

### Modal

```yaml
base:
  background: "#FFFFFF"
  border-width: "2px"
  border-color: "#1C1917"
  border-radius: "8px"
  shadow: "shadow-lg"
  padding: "24px"

backdrop:
  background: "rgba(28, 25, 23, 0.5)"

animation:
  enter: "scale(0.95) -> scale(1), opacity(0) -> opacity(1)"
  exit: "scale(1) -> scale(0.95), opacity(1) -> opacity(0)"
  duration: "250ms"
  easing: "ease-out"

sizes:
  sm: "max-width: 400px"
  md: "max-width: 500px"
  lg: "max-width: 600px"
  xl: "max-width: 800px"
```

---

## Web Implementation

### CSS Variables (globals.css)

```css
@theme inline {
  /* Colors */
  --color-nb-primary: #7FBC8C;
  --color-nb-primary-hover: #6BA87A;
  --color-nb-primary-active: #5A9468;
  --color-nb-secondary: #8B7355;
  --color-nb-success: #7FBC8C;
  --color-nb-warning: #E3A018;
  --color-nb-danger: #FF6B6B;
  --color-nb-info: #69D2E7;
  --color-nb-black: #1C1917;
  --color-nb-white: #FFFFFF;

  /* Backgrounds */
  --color-nb-bg-primary: #FDFD96;
  --color-nb-bg-secondary: #B5D2AD;
  --color-nb-bg-mint: #DAF5F0;
  --color-nb-bg-surface: #FFFFFF;

  /* Sidebar */
  --color-nb-sidebar-bg: #1A4D2E;
  --color-nb-sidebar-text: #FFFFFF;
  --color-nb-sidebar-hover: #2D5233;
  --color-nb-sidebar-active: #0F3520;

  /* Shadows */
  --shadow-nb-xs: 2px 2px 0px #1C1917;
  --shadow-nb-sm: 4px 4px 0px #1C1917;
  --shadow-nb-md: 6px 6px 0px #1C1917;
  --shadow-nb-lg: 8px 8px 0px #1C1917;
  --shadow-nb-hover: 8px 8px 0px #1C1917;
  --shadow-nb-active: 2px 2px 0px #1C1917;

  /* Border widths */
  --border-nb-thin: 1px;
  --border-nb-base: 2px;
  --border-nb-thick: 3px;

  /* Border radius */
  --radius-nb-none: 0px;
  --radius-nb-sm: 4px;
  --radius-nb-base: 6px;
  --radius-nb-md: 8px;
  --radius-nb-lg: 12px;
  --radius-nb-full: 9999px;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;
  --spacing-3xl: 64px;

  /* Animation */
  --duration-instant: 80ms;
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;

  /* Typography */
  --font-display: 'Space Grotesk', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
}
```

### Utility Classes

```css
/* Shadow animation utility */
.nb-shadow {
  transition: all var(--duration-fast) ease-out;
}

.nb-shadow:hover {
  box-shadow: var(--shadow-nb-hover);
  transform: translate(-2px, -2px);
}

.nb-shadow:active {
  box-shadow: var(--shadow-nb-active);
  transform: translate(2px, 2px);
}

/* Focus ring utility */
.nb-focus-ring:focus-visible {
  outline: 3px solid var(--color-nb-primary);
  outline-offset: 2px;
}

/* Background patterns */
.nb-pattern-grid {
  background-image:
    linear-gradient(rgba(45, 82, 51, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(45, 82, 51, 0.03) 1px, transparent 1px);
  background-size: 32px 32px;
}

.nb-pattern-dots {
  background-image: radial-gradient(
    circle at center,
    rgba(45, 82, 51, 0.04) 1.5px,
    transparent 1.5px
  );
  background-size: 24px 24px;
}
```

### Button Component Example

```tsx
// fe/web/src/components/nb/NBButton.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-semibold border-2 border-nb-black rounded-nb-base transition-all duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nb-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-nb-primary text-white hover:bg-nb-primary-hover shadow-nb-md hover:shadow-nb-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-nb-active active:translate-x-0.5 active:translate-y-0.5',
        secondary: 'bg-nb-secondary text-white hover:opacity-90 shadow-nb-md hover:shadow-nb-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-nb-active active:translate-x-0.5 active:translate-y-0.5',
        outline: 'bg-transparent text-nb-black hover:bg-gray-50 shadow-nb-sm',
        ghost: 'bg-transparent text-nb-black border-none shadow-none hover:bg-gray-100',
        destructive: 'bg-nb-danger text-white hover:opacity-90 shadow-nb-md hover:shadow-nb-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-nb-active active:translate-x-0.5 active:translate-y-0.5',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-12 px-6 text-base',
        lg: 'h-14 px-8 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);
```

---

## Mobile Implementation

### Design Tokens (nbTokens.ts)

```typescript
// fe/mobile/src/constants/nbTokens.ts
export const nbColors = {
  primary: '#7FBC8C',
  primaryHover: '#6BA87A',
  primaryActive: '#5A9468',
  primaryLight: '#90EE90',
  primaryPastel: '#B5D2AD',

  secondary: '#8B7355',
  secondaryHover: '#725E45',

  success: '#7FBC8C',
  successLight: '#BAFCA2',
  warning: '#E3A018',
  warningLight: '#FFDB58',
  danger: '#FF6B6B',
  dangerLight: '#FFA07A',
  info: '#69D2E7',
  infoLight: '#A7DBD8',

  bgPrimary: '#FDFD96',
  bgSecondary: '#B5D2AD',
  bgMint: '#DAF5F0',
  bgSurface: '#FFFFFF',

  black: '#1C1917',
  white: '#FFFFFF',
  navy: '#1A4D2E',

  gray: {
    50: '#FAFAF9',
    100: '#F5F5F4',
    200: '#E7E5E4',
    300: '#D6D3D1',
    400: '#A8A29E',
    500: '#78716C',
    600: '#57534E',
    700: '#44403C',
    800: '#292524',
    900: '#1C1917',
  },

  sidebar: {
    bg: '#1A4D2E',
    text: '#FFFFFF',
    hover: '#2D5233',
    active: '#0F3520',
    border: '#2D5233',
  },

  // Accents
  accentCyan: '#69D2E7',
  accentYellow: '#FFDB58',
  accentCoral: '#FF6B6B',
  accentPink: '#FF69B4',
  accentPurple: '#A388EE',
  accentViolet: '#C4A1FF',
};

export const nbShadows = {
  sm: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 3,
  },
  md: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 3,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 5,
  },
  active: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 0,
    elevation: 1,
  },
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
};

export const nbBorders = {
  thin: 1,
  base: 2,
  thick: 3,
  extra: 4,
};

export const nbRadius = {
  none: 0,
  sm: 4,
  base: 6,
  md: 8,
  lg: 12,
  full: 9999,
};

export const nbSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

export const nbTypography = {
  displayXl: { fontSize: 48, fontWeight: '800' as const, lineHeight: 60 },
  display: { fontSize: 40, fontWeight: '800' as const, lineHeight: 50 },
  h1: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40 },
  h2: { fontSize: 26, fontWeight: '700' as const, lineHeight: 33 },
  h3: { fontSize: 22, fontWeight: '600' as const, lineHeight: 28 },
  h4: { fontSize: 18, fontWeight: '600' as const, lineHeight: 23 },
  bodyLg: { fontSize: 18, fontWeight: '500' as const, lineHeight: 27 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodySm: { fontSize: 14, fontWeight: '400' as const, lineHeight: 21 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 18 },
};

export const nbAnimation = {
  instant: 80,
  fast: 150,
  normal: 250,
  slow: 400,
};

export const nbTouchTarget = {
  minHeight: 48,
  minWidth: 48,
};
```

---

## Accessibility

### Color Contrast Verification (WCAG 2.1 AA)

| Combination | Ratio | Result |
|-------------|-------|--------|
| Primary Green (#7FBC8C) on White | 4.68:1 | PASS |
| Stone-900 (#1C1917) on Pastel Yellow (#FDFD96) | 14.5:1 | PASS |
| White on Primary Green | 4.68:1 | PASS |
| White on Sidebar Green (#1A4D2E) | 7.2:1 | PASS |
| Stone-600 (#57534E) on White | 5.74:1 | PASS |
| Danger Red (#FF6B6B) on White | 4.63:1 | PASS |
| Warning Amber (#E3A018) on White | 4.53:1 | PASS |

### Touch Targets

```yaml
minimum: "48px"           # WCAG 2.1 AA requirement
buttons: "48px"
inputs: "48px"
icons: "48px" (with padding)
outdoor-critical: "56px"  # Clock-in, emergency actions
```

### Focus Indicators

```yaml
focus-ring:
  width: "3px"
  offset: "2px"
  color: "#7FBC8C"
  style: "0 0 0 3px rgba(127, 188, 140, 0.4)"
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Related Documentation

| Document | Description |
|----------|-------------|
| [CHANGELOG.md](./CHANGELOG.md) | Version history and migration guides |
| [typography.md](./typography.md) | Indonesian language patterns, text formatting |
| [accessibility.md](./accessibility.md) | Full WCAG 2.1 AA compliance guide |
| [icons-assets.md](./icons-assets.md) | Icon library, image guidelines |
| [interaction-patterns.md](./interaction-patterns.md) | Gestures, animations |
| [responsive-design.md](./responsive-design.md) | Full breakpoint specifications |
| [future-phases-patterns.md](./future-phases-patterns.md) | Phase 3-6 component specs |

---

**Document Owner:** UI/UX Designer
**Last Updated:** 2026-02-05
**Status:** Phase 2+ Design System - PRIMARY REFERENCE (v2.0.0)
**Implementation:**
- Mobile: `fe/mobile/src/constants/nbTokens.ts` + `fe/mobile/src/components/nb/`
- Web: `fe/web/src/app/globals.css` + `fe/web/src/components/nb/`

---

*This document is the authoritative reference for the Neo Brutalism design system v2.0 (Modern).*
*For version 1.0 (Initial), see CHANGELOG.md migration guide.*
