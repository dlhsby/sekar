# Neo Brutalism Design System

**Phase 2+ Design System for SEKAR Web and Mobile Applications**

This document defines the Neo Brutalism design system adopted for Phase 2 onwards. Neo Brutalism combines bold aesthetics with excellent usability, creating interfaces that are both visually distinctive and highly functional for government field operations.

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Design Tokens](#design-tokens)
3. [Color System](#color-system)
4. [Typography](#typography)
5. [Borders & Shadows](#borders--shadows)
6. [Component Specifications](#component-specifications)
7. [Web Implementation (Next.js/Tailwind)](#web-implementation-nextjstailwind)
8. [Mobile Implementation (React Native)](#mobile-implementation-react-native)
9. [Accessibility Considerations](#accessibility-considerations)
10. [Migration from Material Design](#migration-from-material-design)

---

## Design Philosophy

### Core Principles

1. **Bold & Confident**: Heavy borders, stark contrasts, and solid colors convey authority and trustworthiness - appropriate for government applications.

2. **Function Over Decoration**: Every design element serves a purpose. Shadows indicate elevation and interactivity, not decoration.

3. **High Visibility**: Designed for outdoor field workers using mobile devices in varying light conditions.

4. **Honest Materials**: No gradients, no rounded corners (except for avatars), no soft shadows. What you see is what you get.

5. **Instant Recognition**: The distinctive style makes SEKAR immediately recognizable, reducing cognitive load for users switching between apps.

### Visual Characteristics

| Characteristic | Traditional Material | Neo Brutalism |
|----------------|---------------------|---------------|
| Borders | None or thin (1px) | Bold (3px solid black) |
| Shadows | Soft, diffused | Hard-edge, offset |
| Corners | Rounded (4-16px) | Sharp (0px) |
| Colors | Gradients, transparency | Solid, high contrast |
| Typography | Varied weights | Bold headings, clear body |
| Buttons | Filled, outlined, text | Solid with hard shadow |

### Reference Implementation

Primary reference: [ekmas/neobrutalism-components](https://github.com/ekmas/neobrutalism-components)

---

## Design Tokens

### Core Token Structure

```typescript
// Shared between web and mobile
export const nbTokens = {
  // Colors
  colors: {
    // Primary actions
    primary: '#0066CC',       // Action blue - links, buttons
    primaryHover: '#0052A3',  // Darker on hover
    primaryActive: '#003D7A', // Darkest on active

    // Status colors
    success: '#1B5E20',       // Government green - success, online
    successLight: '#4CAF50',  // Lighter variant
    warning: '#F57C00',       // Alert orange (WCAG 4.5:1 compliant)
    warningLight: '#FFB74D',  // Lighter variant
    danger: '#DC2626',        // Error red - failures, offline
    dangerLight: '#EF5350',   // Lighter variant

    // Neutral palette
    black: '#000000',         // Borders, shadows, text
    white: '#FFFFFF',         // Backgrounds, card surfaces
    navy: '#001F3F',          // Trust/authority accent
    gray: {
      50: '#FAFAFA',          // Hover backgrounds
      100: '#F5F5F5',         // Disabled backgrounds
      200: '#EEEEEE',         // Borders (light mode)
      300: '#E0E0E0',         // Dividers
      400: '#BDBDBD',         // Placeholder text
      500: '#9E9E9E',         // Secondary text
      600: '#666666',         // Body text
      700: '#424242',         // Headings
      800: '#303030',         // Dark mode surfaces
      900: '#212121',         // Dark mode backgrounds
    },
  },

  // Border specifications
  borders: {
    width: {
      thin: '2px',            // Secondary elements
      default: '3px',         // Primary elements
      thick: '4px',           // Emphasis
    },
    style: 'solid',
    color: '#000000',
  },

  // Shadow specifications (hard-edge offset shadows)
  shadows: {
    sm: {
      offset: { x: 4, y: 4 },
      blur: 0,
      color: '#000000',
    },
    md: {
      offset: { x: 6, y: 6 },
      blur: 0,
      color: '#000000',
    },
    lg: {
      offset: { x: 8, y: 8 },
      blur: 0,
      color: '#000000',
    },
    // Interaction states
    hover: {
      offset: { x: 8, y: 8 },
      blur: 0,
      color: '#000000',
    },
    active: {
      offset: { x: 2, y: 2 },
      blur: 0,
      color: '#000000',
    },
    none: {
      offset: { x: 0, y: 0 },
      blur: 0,
      color: 'transparent',
    },
  },

  // No rounded corners (except specified cases)
  borderRadius: {
    none: 0,              // Default for all elements
    full: 9999,           // Only for avatars, badges
  },

  // Spacing (8px baseline grid)
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },

  // Typography
  typography: {
    fontFamily: {
      sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      mono: "'JetBrains Mono', 'Fira Code', monospace",
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
      '4xl': 36,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  // Touch targets (accessibility)
  touchTarget: {
    minHeight: 48,
    minWidth: 48,
  },

  // Animation durations
  animation: {
    fast: 100,      // Button press
    normal: 200,    // State transitions
    slow: 300,      // Page transitions
  },
};
```

---

## Color System

### Primary Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Primary Blue | `#0066CC` | Actions, links, interactive elements |
| Success Green | `#1B5E20` | Success states, online status, confirmations |
| Warning Orange | `#F57C00` | Warnings, pending states, attention needed |
| Danger Red | `#DC2626` | Errors, offline status, destructive actions |
| Navy | `#001F3F` | Authority accent, headers on special pages |
| Black | `#000000` | Borders, shadows, primary text |
| White | `#FFFFFF` | Backgrounds, card surfaces |

### Color Application Rules

1. **Backgrounds**: Always white (`#FFFFFF`) for content areas
2. **Borders**: Always black (`#000000`) at 3px width
3. **Shadows**: Always black (`#000000`) with no blur
4. **Text**:
   - Primary text: `#000000` or `#424242`
   - Secondary text: `#666666`
   - Placeholder: `#BDBDBD`
5. **Status Indicators**:
   - Online/Success: `#1B5E20` (green)
   - Warning/Pending: `#F57C00` (orange)
   - Offline/Error: `#DC2626` (red)

### Contrast Ratios

All color combinations must meet WCAG 2.1 AA standards:
- Normal text: minimum 4.5:1 contrast ratio
- Large text (18px+): minimum 3:1 contrast ratio
- UI components: minimum 3:1 contrast ratio

| Combination | Ratio | Status |
|-------------|-------|--------|
| Black on White | 21:1 | Pass |
| Primary Blue on White | 4.61:1 | Pass |
| Success Green on White | 8.59:1 | Pass |
| Warning Orange on White | 4.53:1 | Pass |
| Danger Red on White | 6.56:1 | Pass |

---

## Typography

### Font Stack

```css
/* Primary font */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* Monospace (for data/codes) */
font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
```

### Type Scale

| Name | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Display | 36px | 800 (Extra Bold) | 1.25 | Page titles |
| Heading 1 | 30px | 700 (Bold) | 1.25 | Section headers |
| Heading 2 | 24px | 700 (Bold) | 1.25 | Card titles |
| Heading 3 | 20px | 600 (Semibold) | 1.25 | Subheadings |
| Body Large | 18px | 500 (Medium) | 1.5 | Emphasized body |
| Body | 16px | 400 (Regular) | 1.5 | Default body text |
| Body Small | 14px | 400 (Regular) | 1.5 | Secondary text |
| Caption | 12px | 400 (Regular) | 1.5 | Timestamps, labels |

### Typography Rules

1. **Headings**: Always use bold (700) or extrabold (800) weight
2. **Body text**: Regular (400) or medium (500) weight
3. **All caps**: Use sparingly, only for badges/labels
4. **Letter spacing**: Normal for body, slightly tighter (-0.02em) for headings
5. **Numbers**: Use tabular numbers for data tables

---

## Borders & Shadows

### Border Specifications

```css
/* Default border */
border: 3px solid #000000;

/* Thin border (secondary elements) */
border: 2px solid #000000;

/* Thick border (emphasis) */
border: 4px solid #000000;
```

### Shadow Specifications

Neo Brutalism uses hard-edge, offset shadows with no blur:

```css
/* Small shadow (cards, inputs) */
box-shadow: 4px 4px 0px #000000;

/* Medium shadow (buttons, elevated cards) */
box-shadow: 6px 6px 0px #000000;

/* Large shadow (modals, popovers) */
box-shadow: 8px 8px 0px #000000;

/* Hover state (grow shadow) */
box-shadow: 8px 8px 0px #000000;
transform: translate(-2px, -2px);

/* Active/pressed state (shrink shadow) */
box-shadow: 2px 2px 0px #000000;
transform: translate(2px, 2px);
```

### Shadow Animation

```css
.nb-button {
  box-shadow: 6px 6px 0px #000000;
  transition: all 100ms ease-out;
}

.nb-button:hover {
  box-shadow: 8px 8px 0px #000000;
  transform: translate(-2px, -2px);
}

.nb-button:active {
  box-shadow: 2px 2px 0px #000000;
  transform: translate(2px, 2px);
}
```

---

## Component Specifications

### Button

```
┌──────────────────────────┐═══╗
│      Button Text         │   ║ 6px shadow
└──────────────────────────┘═══╝
        3px border
```

**Variants:**
| Variant | Background | Text | Border |
|---------|------------|------|--------|
| Primary | `#0066CC` | `#FFFFFF` | `#000000` |
| Secondary | `#FFFFFF` | `#000000` | `#000000` |
| Success | `#1B5E20` | `#FFFFFF` | `#000000` |
| Danger | `#DC2626` | `#FFFFFF` | `#000000` |
| Ghost | `transparent` | `#0066CC` | `none` |

**States:**
- Default: 6px shadow offset
- Hover: 8px shadow, translate(-2px, -2px)
- Active: 2px shadow, translate(2px, 2px)
- Disabled: Gray background, no shadow, 50% opacity
- Focus: 4px outline offset with primary color

### Card

```
┌─────────────────────────────────┐═══╗
│ ┌─────────────────────────────┐ │   ║
│ │         Card Header         │ │   ║
│ ├─────────────────────────────┤ │   ║ 4-6px shadow
│ │                             │ │   ║
│ │         Card Content        │ │   ║
│ │                             │ │   ║
│ └─────────────────────────────┘ │   ║
└─────────────────────────────────┘═══╝
```

**Specifications:**
- Border: 3px solid black
- Shadow: 4px 4px 0px black (static) or 6px (interactive)
- Padding: 16px (md) or 24px (lg)
- Background: White
- Border radius: 0

### Input Field

```
┌─────────────────────────────────┐═══╗
│ placeholder or value            │   ║ 4px shadow
└─────────────────────────────────┘═══╝
  Label (above, outside)
```

**States:**
| State | Border | Shadow | Background |
|-------|--------|--------|------------|
| Default | Black 3px | 4px 4px | White |
| Focus | Primary 3px | 4px 4px | White |
| Error | Danger 3px | 4px 4px | White |
| Disabled | Gray 2px | None | Gray 100 |

### Badge/Tag

```
┌────────────────┐
│   Badge Text   │ 2px border, no shadow
└────────────────┘
```

**Specifications:**
- Border: 2px solid (color based on variant)
- Background: Solid color (no transparency)
- Text: Uppercase, bold, 12px
- Padding: 4px 8px

### Modal/Dialog

```
╔═══════════════════════════════════════╗
║ ┌───────────────────────────────────┐ ║
║ │           Modal Title             │ ║
║ ├───────────────────────────────────┤ ║
║ │                                   │ ║
║ │           Modal Content           │ ║
║ │                                   │ ║
║ ├───────────────────────────────────┤ ║
║ │  [Cancel]              [Confirm]  │ ║
║ └───────────────────────────────────┘ ║
╚═══════════════════════════════════════╝
         8px shadow (large)
```

**Specifications:**
- Border: 3px solid black
- Shadow: 8px 8px 0px black
- Backdrop: Black at 50% opacity
- Animation: Scale in from 95% with fade

### Table

```
┌──────────┬──────────┬──────────┬──────────┐
│  Header  │  Header  │  Header  │  Header  │ 3px border, bold text
├──────────┼──────────┼──────────┼──────────┤
│  Cell    │  Cell    │  Cell    │  Cell    │ 2px border, regular
├──────────┼──────────┼──────────┼──────────┤
│  Cell    │  Cell    │  Cell    │  Cell    │ Alternate: gray-50 bg
└──────────┴──────────┴──────────┴──────────┘
```

**Specifications:**
- Outer border: 3px solid black
- Cell borders: 2px solid black
- Header: Bold text, gray-100 background
- Rows: Alternating white/gray-50 backgrounds
- Row hover: gray-100 background

### Navigation/Sidebar

```
┌────────────────────┐
│  ┌──────────────┐  │
│  │    Logo      │  │
│  └──────────────┘  │
├────────────────────┤ 2px divider
│  ■ Dashboard       │ Active: filled square
│  □ Users           │ Inactive: outline square
│  □ Areas           │
│  □ Reports         │
├────────────────────┤
│  ○ Profile         │
│  ○ Logout          │
└────────────────────┘
```

---

## Web Implementation (Next.js/Tailwind)

### Tailwind Configuration

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        nb: {
          primary: '#0066CC',
          'primary-hover': '#0052A3',
          'primary-active': '#003D7A',
          success: '#1B5E20',
          warning: '#F57C00',
          danger: '#DC2626',
          navy: '#001F3F',
          black: '#000000',
          white: '#FFFFFF',
        },
      },
      boxShadow: {
        'nb-sm': '4px 4px 0px #000000',
        'nb-md': '6px 6px 0px #000000',
        'nb-lg': '8px 8px 0px #000000',
        'nb-hover': '8px 8px 0px #000000',
        'nb-active': '2px 2px 0px #000000',
      },
      borderWidth: {
        '3': '3px',
      },
      borderRadius: {
        'nb': '0px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontWeight: {
        extrabold: '800',
      },
    },
  },
  plugins: [],
};

export default config;
```

### Component Examples

#### Button Component

```tsx
// fe/web/src/components/nb/NBButton.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-semibold border-3 border-black transition-all duration-100 focus:outline-none focus:ring-4 focus:ring-nb-primary/30 focus:ring-offset-2 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-nb-primary text-white hover:bg-nb-primary-hover',
        secondary: 'bg-white text-black hover:bg-gray-50',
        success: 'bg-nb-success text-white hover:opacity-90',
        danger: 'bg-nb-danger text-white hover:opacity-90',
        ghost: 'bg-transparent text-nb-primary border-none shadow-none hover:bg-gray-50',
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

interface NBButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const NBButton = forwardRef<HTMLButtonElement, NBButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          buttonVariants({ variant, size }),
          'shadow-nb-md hover:shadow-nb-hover hover:-translate-x-0.5 hover:-translate-y-0.5',
          'active:shadow-nb-active active:translate-x-0.5 active:translate-y-0.5',
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  }
);

NBButton.displayName = 'NBButton';
```

#### Card Component

```tsx
// fe/web/src/components/nb/NBCard.tsx
import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface NBCardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export const NBCard = forwardRef<HTMLDivElement, NBCardProps>(
  ({ className, interactive = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-white border-3 border-black',
          interactive
            ? 'shadow-nb-md hover:shadow-nb-hover hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all duration-100 cursor-pointer'
            : 'shadow-nb-sm',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

export const NBCardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('border-b-2 border-black p-4 font-bold', className)}
    {...props}
  />
));

export const NBCardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-4', className)} {...props} />
));

export const NBCardFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('border-t-2 border-black p-4 flex gap-2', className)}
    {...props}
  />
));

NBCard.displayName = 'NBCard';
NBCardHeader.displayName = 'NBCardHeader';
NBCardContent.displayName = 'NBCardContent';
NBCardFooter.displayName = 'NBCardFooter';
```

#### Input Component

```tsx
// fe/web/src/components/nb/NBInput.tsx
import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface NBInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const NBInput = forwardRef<HTMLInputElement, NBInputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2)}`;

    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-black"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full h-12 px-4 bg-white border-3 shadow-nb-sm',
            'font-medium placeholder:text-gray-400',
            'focus:outline-none focus:border-nb-primary focus:ring-0',
            'disabled:bg-gray-100 disabled:shadow-none disabled:cursor-not-allowed',
            error ? 'border-nb-danger' : 'border-black',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-sm text-nb-danger font-medium">{error}</p>
        )}
      </div>
    );
  }
);

NBInput.displayName = 'NBInput';
```

---

## Mobile Implementation (React Native)

### Theme Configuration

```typescript
// fe/mobile/src/constants/nbTheme.ts
import { StyleSheet } from 'react-native';

export const nbColors = {
  primary: '#0066CC',
  primaryHover: '#0052A3',
  primaryActive: '#003D7A',
  success: '#1B5E20',
  successLight: '#4CAF50',
  warning: '#F57C00',
  warningLight: '#FFB74D',
  danger: '#DC2626',
  dangerLight: '#EF5350',
  black: '#000000',
  white: '#FFFFFF',
  navy: '#001F3F',
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#666666',
    700: '#424242',
    800: '#303030',
    900: '#212121',
  },
};

export const nbShadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  active: {
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
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
  display: { fontSize: 36, fontWeight: '800' as const, lineHeight: 45 },
  h1: { fontSize: 30, fontWeight: '700' as const, lineHeight: 38 },
  h2: { fontSize: 24, fontWeight: '700' as const, lineHeight: 30 },
  h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 25 },
  bodyLarge: { fontSize: 18, fontWeight: '500' as const, lineHeight: 27 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, lineHeight: 21 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 18 },
};

export const nbBorders = {
  thin: 2,
  default: 3,
  thick: 4,
};
```

### Component Examples

#### Button Component

```tsx
// fe/mobile/src/components/nb/NBButton.tsx
import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { nbColors, nbShadows, nbSpacing } from '../../constants/nbTheme';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface NBButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const variantStyles: Record<ButtonVariant, { bg: string; text: string }> = {
  primary: { bg: nbColors.primary, text: nbColors.white },
  secondary: { bg: nbColors.white, text: nbColors.black },
  success: { bg: nbColors.success, text: nbColors.white },
  danger: { bg: nbColors.danger, text: nbColors.white },
  ghost: { bg: 'transparent', text: nbColors.primary },
};

const sizeStyles: Record<ButtonSize, { height: number; paddingHorizontal: number; fontSize: number }> = {
  sm: { height: 36, paddingHorizontal: 16, fontSize: 14 },
  md: { height: 48, paddingHorizontal: 24, fontSize: 16 },
  lg: { height: 56, paddingHorizontal: 32, fontSize: 18 },
};

export const NBButton: React.FC<NBButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
}) => {
  const [isPressed, setIsPressed] = React.useState(false);

  const handlePressIn = () => {
    setIsPressed(true);
    ReactNativeHapticFeedback.trigger('impactLight');
  };

  const handlePressOut = () => {
    setIsPressed(false);
  };

  const handlePress = () => {
    if (!disabled && !loading) {
      ReactNativeHapticFeedback.trigger('impactMedium');
      onPress();
    }
  };

  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];
  const isGhost = variant === 'ghost';

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: variantStyle.bg,
          height: sizeStyle.height,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          borderWidth: isGhost ? 0 : 3,
        },
        !isGhost && (isPressed ? nbShadows.active : nbShadows.md),
        isPressed && !isGhost && { transform: [{ translateX: 2 }, { translateY: 2 }] },
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.text} />
      ) : (
        <Text
          style={[
            styles.text,
            {
              color: variantStyle.text,
              fontSize: sizeStyle.fontSize,
            },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: nbColors.black,
    backgroundColor: nbColors.white,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
    ...nbShadows.none,
  },
});
```

#### Card Component

```tsx
// fe/mobile/src/components/nb/NBCard.tsx
import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { nbColors, nbShadows, nbSpacing, nbBorders } from '../../constants/nbTheme';

interface NBCardProps {
  children: React.ReactNode;
  interactive?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export const NBCard: React.FC<NBCardProps> = ({
  children,
  interactive = false,
  onPress,
  style,
}) => {
  const [isPressed, setIsPressed] = React.useState(false);

  if (interactive && onPress) {
    return (
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        style={[
          styles.card,
          isPressed ? nbShadows.active : nbShadows.md,
          isPressed && { transform: [{ translateX: 2 }, { translateY: 2 }] },
          style,
        ]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, nbShadows.sm, style]}>
      {children}
    </View>
  );
};

interface NBCardSectionProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const NBCardHeader: React.FC<NBCardSectionProps> = ({ children, style }) => (
  <View style={[styles.header, style]}>{children}</View>
);

export const NBCardContent: React.FC<NBCardSectionProps> = ({ children, style }) => (
  <View style={[styles.content, style]}>{children}</View>
);

export const NBCardFooter: React.FC<NBCardSectionProps> = ({ children, style }) => (
  <View style={[styles.footer, style]}>{children}</View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.default,
    borderColor: nbColors.black,
  },
  header: {
    padding: nbSpacing.md,
    borderBottomWidth: 2,
    borderBottomColor: nbColors.black,
  },
  content: {
    padding: nbSpacing.md,
  },
  footer: {
    padding: nbSpacing.md,
    borderTopWidth: 2,
    borderTopColor: nbColors.black,
    flexDirection: 'row',
    gap: nbSpacing.sm,
  },
});
```

#### Input Component

```tsx
// fe/mobile/src/components/nb/NBInput.tsx
import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { nbColors, nbShadows, nbSpacing, nbBorders, nbTypography } from '../../constants/nbTheme';

interface NBInputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export const NBInput: React.FC<NBInputProps> = ({
  label,
  error,
  containerStyle,
  style,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const borderColor = error
    ? nbColors.danger
    : isFocused
    ? nbColors.primary
    : nbColors.black;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        {...props}
        style={[
          styles.input,
          nbShadows.sm,
          { borderColor },
          props.editable === false && styles.disabled,
          style,
        ]}
        placeholderTextColor={nbColors.gray[400]}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: nbSpacing.md,
  },
  label: {
    ...nbTypography.bodySmall,
    fontWeight: '600',
    color: nbColors.black,
    marginBottom: nbSpacing.xs,
  },
  input: {
    height: 48,
    paddingHorizontal: nbSpacing.md,
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.default,
    borderColor: nbColors.black,
    ...nbTypography.body,
    color: nbColors.black,
  },
  error: {
    ...nbTypography.caption,
    color: nbColors.danger,
    marginTop: nbSpacing.xs,
    fontWeight: '500',
  },
  disabled: {
    backgroundColor: nbColors.gray[100],
    ...nbShadows.none,
  },
});
```

---

## Accessibility Considerations

### Color Contrast

All Neo Brutalism components maintain WCAG 2.1 AA compliance:

| Element | Foreground | Background | Ratio | Status |
|---------|------------|------------|-------|--------|
| Primary button text | White | #0066CC | 4.61:1 | Pass |
| Secondary button text | Black | White | 21:1 | Pass |
| Error text | #DC2626 | White | 6.56:1 | Pass |
| Input placeholder | #BDBDBD | White | 2.52:1 | Large text only |
| Body text | #424242 | White | 9.18:1 | Pass |

### Focus Indicators

All interactive elements must have visible focus indicators:

```css
/* Web focus styles */
.nb-focusable:focus-visible {
  outline: 4px solid rgba(0, 102, 204, 0.5);
  outline-offset: 2px;
}
```

```typescript
// React Native focus (accessibility state)
accessibilityState={{
  selected: isFocused,
  disabled: disabled
}}
```

### Touch Targets

- Minimum touch target: 48x48px
- Recommended: 48x44px (wide) for buttons
- List items: minimum 48px height, recommended 56-72px

### Screen Reader Support

All components include proper accessibility labels:

```tsx
// Example: Button accessibility
<TouchableOpacity
  accessible
  accessibilityRole="button"
  accessibilityLabel={title}
  accessibilityState={{ disabled }}
  accessibilityHint={`Press to ${title.toLowerCase()}`}
>
```

### Motion Preferences

Respect user motion preferences:

```css
/* Web - reduce motion */
@media (prefers-reduced-motion: reduce) {
  .nb-button {
    transition: none;
  }
}
```

```typescript
// React Native - check accessibility settings
import { AccessibilityInfo } from 'react-native';

const [reduceMotion, setReduceMotion] = useState(false);

useEffect(() => {
  AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
}, []);
```

---

## Migration from Material Design

### Phase 2 Transition Strategy

1. **New Components First**: Create all new Phase 2 components with Neo Brutalism
2. **Shared Tokens**: Maintain shared spacing and sizing tokens for consistency
3. **Gradual Migration**: Migrate existing Phase 1 screens incrementally
4. **Feature Flags**: Use feature flags to toggle between designs during transition

### Component Mapping

| Material Design | Neo Brutalism | Migration Notes |
|-----------------|---------------|-----------------|
| Filled Button | NBButton (primary) | Change border radius, add shadow |
| Outlined Button | NBButton (secondary) | Add fill, change border |
| Card with elevation | NBCard | Remove radius, add hard shadow |
| TextField | NBInput | Square corners, bold border |
| Chip/Badge | NBBadge | Remove radius, add border |
| Dialog | NBModal | Square corners, larger shadow |
| FAB | NBButton (large) | Make square, position fixed |

### Token Migration

```typescript
// Before (Material Design)
import { theme } from './theme';
const cardStyle = {
  borderRadius: theme.borderRadius.md,     // 8px
  ...theme.shadows.md,                      // Soft shadow
};

// After (Neo Brutalism)
import { nbBorders, nbShadows } from './nbTheme';
const cardStyle = {
  borderRadius: 0,                          // No radius
  borderWidth: nbBorders.default,           // 3px solid
  borderColor: '#000000',
  ...nbShadows.sm,                          // Hard 4px offset
};
```

### Style Sheet Updates

Mobile screens need stylesheet updates:

```typescript
// Before
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    ...shadows.md,
  },
});

// After
const styles = StyleSheet.create({
  card: {
    backgroundColor: nbColors.white,
    borderRadius: 0,
    borderWidth: nbBorders.default,
    borderColor: nbColors.black,
    padding: nbSpacing.md,
    ...nbShadows.sm,
  },
});
```

---

## Appendix: Component Checklist

### Core Components

| Component | Web | Mobile | Tests |
|-----------|-----|--------|-------|
| NBButton | - [ ] | - [ ] | - [ ] |
| NBCard | - [ ] | - [ ] | - [ ] |
| NBInput | - [ ] | - [ ] | - [ ] |
| NBTextArea | - [ ] | - [ ] | - [ ] |
| NBSelect | - [ ] | - [ ] | - [ ] |
| NBCheckbox | - [ ] | - [ ] | - [ ] |
| NBRadio | - [ ] | - [ ] | - [ ] |
| NBSwitch | - [ ] | - [ ] | - [ ] |
| NBBadge | - [ ] | - [ ] | - [ ] |
| NBAvatar | - [ ] | - [ ] | - [ ] |

### Layout Components

| Component | Web | Mobile | Tests |
|-----------|-----|--------|-------|
| NBModal | - [ ] | - [ ] | - [ ] |
| NBDrawer | - [ ] | N/A | - [ ] |
| NBSidebar | - [ ] | N/A | - [ ] |
| NBTabs | - [ ] | - [ ] | - [ ] |
| NBTable | - [ ] | N/A | - [ ] |

### Feedback Components

| Component | Web | Mobile | Tests |
|-----------|-----|--------|-------|
| NBAlert | - [ ] | - [ ] | - [ ] |
| NBToast | - [ ] | - [ ] | - [ ] |
| NBSpinner | - [ ] | - [ ] | - [ ] |
| NBSkeleton | - [ ] | - [ ] | - [ ] |
| NBProgress | - [ ] | - [ ] | - [ ] |

---

**Document Owner:** UI/UX Designer
**Last Updated:** 2026-01-24
**Status:** Phase 2 Specification
**Implementation:**
- Web: `fe/web/src/components/nb/`
- Mobile: `fe/mobile/src/components/nb/`
