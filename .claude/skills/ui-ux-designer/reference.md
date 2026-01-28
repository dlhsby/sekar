# Neo Brutalism Design Reference

## Design Token Specifications

### Shadow System

```typescript
// React Native / Mobile
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
  xl: {
    shadowColor: '#000000',
    shadowOffset: { width: 12, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 12,
  },
  pressed: {
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
};

// CSS Variables
:root {
  --shadow-sm: 4px 4px 0 #000000;
  --shadow-md: 6px 6px 0 #000000;
  --shadow-lg: 8px 8px 0 #000000;
  --shadow-xl: 12px 12px 0 #000000;
  --shadow-pressed: 2px 2px 0 #000000;

  /* Colored shadows for playful variant */
  --shadow-primary: 4px 4px 0 #0066CC;
  --shadow-accent: 4px 4px 0 #FFDD00;
}
```

### Color Palettes

```typescript
// Corporate/Government palette
export const nbColorsClassic = {
  primary: '#0066CC',     // Trust blue
  secondary: '#001F3F',   // Navy
  success: '#1B5E20',     // Deep green
  warning: '#F57C00',     // Alert orange
  danger: '#DC2626',      // Error red
  black: '#000000',
  white: '#FFFFFF',
  gray: {
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    500: '#9E9E9E',
    700: '#424242',
    900: '#212121',
  },
};

// Playful palette
export const nbColorsPlayful = {
  primary: '#0066CC',
  black: '#000000',
  white: '#FFFFFF',
  accents: {
    yellow: '#FFDD00',
    pink: '#FF6B6B',
    cyan: '#00D4FF',
    lime: '#BFFF00',
    purple: '#9B59B6',
    coral: '#FF7F50',
  },
  backgrounds: {
    cream: '#FFF8E7',
    lavender: '#E8E0F0',
    mint: '#E0F5E9',
    peach: '#FFE5D9',
  },
};

// High contrast for accessibility
export const nbColorsHighContrast = {
  primary: '#0052CC',     // Darker blue for better contrast
  text: '#000000',
  background: '#FFFFFF',
  border: '#000000',
  focus: '#FFDD00',       // High-visibility focus ring
};
```

### Border System

```typescript
export const nbBorders = {
  thin: 2,      // Secondary elements
  default: 3,   // Primary elements
  thick: 4,     // Emphasis
  heavy: 5,     // Maximum impact
  color: '#000000',
  style: 'solid',
};

// CSS
:root {
  --border-thin: 2px solid #000000;
  --border-default: 3px solid #000000;
  --border-thick: 4px solid #000000;
  --border-heavy: 5px solid #000000;
}
```

### Typography

```typescript
export const nbTypography = {
  fontFamily: {
    heading: '"Space Grotesk", "Inter", system-ui, sans-serif',
    body: '"Inter", system-ui, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", monospace',
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
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
    '5xl': 48,
    '6xl': 60,
  },
};
```

## Component Specifications

### Button Variants

```tsx
// Primary: Bold action
<NBButton variant="primary">
  bg: #0066CC, text: white, border: black
  shadow: 6px 6px 0 black
</NBButton>

// Secondary: Alternative action
<NBButton variant="secondary">
  bg: white, text: black, border: black
  shadow: 6px 6px 0 black
</NBButton>

// Success: Positive action
<NBButton variant="success">
  bg: #1B5E20, text: white, border: black
  shadow: 6px 6px 0 black
</NBButton>

// Danger: Destructive action
<NBButton variant="danger">
  bg: #DC2626, text: white, border: black
  shadow: 6px 6px 0 black
</NBButton>

// Ghost: Subtle action (no shadow/border)
<NBButton variant="ghost">
  bg: transparent, text: #0066CC, border: none
  shadow: none
</NBButton>

// Outline: Secondary emphasis
<NBButton variant="outline">
  bg: transparent, text: black, border: black
  shadow: 4px 4px 0 black
</NBButton>
```

### Card Variations

```tsx
// Standard Card
<NBCard>
  border: 3px solid black
  shadow: 6px 6px 0 black
  background: white
  radius: 0
</NBCard>

// Elevated Card (more prominence)
<NBCard elevated>
  border: 3px solid black
  shadow: 8px 8px 0 black
  background: white
</NBCard>

// Interactive Card
<NBCard interactive onPress={...}>
  default: shadow 6px 6px
  hover: shadow 8px 8px
  pressed: shadow 2px 2px, translate(2,2)
</NBCard>

// Colored Card (playful variant)
<NBCard color="yellow">
  border: 3px solid black
  shadow: 6px 6px 0 black
  background: #FFDD00
</NBCard>
```

### Input Fields

```tsx
// Standard Input
<NBInput>
  border: 2px solid black
  background: white
  radius: 0
  focus: border 3px solid #0066CC
  error: border 3px solid #DC2626
</NBInput>

// Textarea
<NBTextarea>
  border: 2px solid black
  background: white
  radius: 0
  resize: vertical
</NBTextarea>

// Select
<NBSelect>
  border: 2px solid black
  background: white
  radius: 0
  arrow: custom chevron icon
</NBSelect>
```

### Badge/Tag

```tsx
// Status badges
<NBBadge variant="success">Online</NBBadge>
  bg: #1B5E20, text: white, border: 2px black

<NBBadge variant="warning">Pending</NBBadge>
  bg: #F57C00, text: black, border: 2px black

<NBBadge variant="danger">Offline</NBBadge>
  bg: #DC2626, text: white, border: 2px black

// Outlined badges
<NBBadge variant="outline">Tag</NBBadge>
  bg: transparent, text: black, border: 2px black
```

## Layout Patterns

### Header/Navigation

```tsx
<header style={{
  backgroundColor: 'white',
  borderBottom: '3px solid black',
  padding: '16px 24px',
}}>
  <nav style={{
    display: 'flex',
    gap: '24px',
  }}>
    <a style={{
      fontWeight: 700,
      borderBottom: '3px solid black', // Active state
    }}>Dashboard</a>
  </nav>
</header>
```

### Sidebar

```tsx
<aside style={{
  backgroundColor: 'white',
  borderRight: '3px solid black',
  width: '280px',
}}>
  <nav>
    <a style={{
      padding: '12px 16px',
      borderBottom: '2px solid black',
      display: 'block',
    }}>Menu Item</a>
  </nav>
</aside>
```

### Grid/List

```tsx
// Card grid
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: '24px',
}}>
  <NBCard>...</NBCard>
</div>

// Table
<table style={{
  borderCollapse: 'collapse',
  width: '100%',
  border: '3px solid black',
}}>
  <thead style={{
    backgroundColor: '#F5F5F5',
    borderBottom: '3px solid black',
  }}>
    <tr>
      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>
        Column
      </th>
    </tr>
  </thead>
</table>
```

## Animation Guidelines

### Press/Click Animation

```css
.nb-interactive {
  transition: transform 100ms ease-out, box-shadow 100ms ease-out;
}

.nb-interactive:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 black;
}
```

### Hover Animation (optional)

```css
.nb-interactive:hover {
  box-shadow: 8px 8px 0 black;
}
```

### Focus Animation

```css
.nb-interactive:focus-visible {
  outline: 3px solid #FFDD00;
  outline-offset: 2px;
}
```

## Responsive Considerations

### Mobile Adjustments

```css
@media (max-width: 768px) {
  /* Slightly reduce shadows on mobile */
  --shadow-md: 4px 4px 0 black;
  --shadow-lg: 6px 6px 0 black;

  /* Maintain touch targets */
  .nb-button {
    min-height: 48px;
    min-width: 48px;
  }
}
```

### Dark Mode

```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #121212;
    --text-primary: #FFFFFF;
    --border-color: #FFFFFF;
    --shadow-color: rgba(255, 255, 255, 0.2);
  }

  /* In dark mode, consider using colored shadows */
  .nb-card {
    box-shadow: 4px 4px 0 rgba(255, 255, 255, 0.3);
    border-color: white;
  }
}
```

## Tailwind CSS Configuration

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      boxShadow: {
        'nb-sm': '4px 4px 0 #000000',
        'nb-md': '6px 6px 0 #000000',
        'nb-lg': '8px 8px 0 #000000',
        'nb-xl': '12px 12px 0 #000000',
        'nb-pressed': '2px 2px 0 #000000',
        'nb-none': 'none',
      },
      borderRadius: {
        'nb': '0px',
      },
      borderWidth: {
        'nb': '3px',
        'nb-thin': '2px',
        'nb-thick': '4px',
      },
      colors: {
        nb: {
          primary: '#0066CC',
          success: '#1B5E20',
          warning: '#F57C00',
          danger: '#DC2626',
          black: '#000000',
          white: '#FFFFFF',
          navy: '#001F3F',
          yellow: '#FFDD00',
          pink: '#FF6B6B',
          cyan: '#00D4FF',
          lime: '#BFFF00',
        },
      },
    },
  },
};
```

## CSS Custom Properties (Full Set)

```css
:root {
  /* Colors */
  --nb-primary: #0066CC;
  --nb-primary-hover: #0052A3;
  --nb-primary-active: #003D7A;
  --nb-success: #1B5E20;
  --nb-warning: #F57C00;
  --nb-danger: #DC2626;
  --nb-black: #000000;
  --nb-white: #FFFFFF;
  --nb-navy: #001F3F;

  /* Accents */
  --nb-accent-yellow: #FFDD00;
  --nb-accent-pink: #FF6B6B;
  --nb-accent-cyan: #00D4FF;
  --nb-accent-lime: #BFFF00;

  /* Grays */
  --nb-gray-50: #FAFAFA;
  --nb-gray-100: #F5F5F5;
  --nb-gray-200: #EEEEEE;
  --nb-gray-300: #E0E0E0;
  --nb-gray-400: #BDBDBD;
  --nb-gray-500: #9E9E9E;
  --nb-gray-600: #666666;
  --nb-gray-700: #424242;
  --nb-gray-800: #303030;
  --nb-gray-900: #212121;

  /* Shadows */
  --nb-shadow-sm: 4px 4px 0 var(--nb-black);
  --nb-shadow-md: 6px 6px 0 var(--nb-black);
  --nb-shadow-lg: 8px 8px 0 var(--nb-black);
  --nb-shadow-xl: 12px 12px 0 var(--nb-black);
  --nb-shadow-pressed: 2px 2px 0 var(--nb-black);

  /* Borders */
  --nb-border-thin: 2px;
  --nb-border-default: 3px;
  --nb-border-thick: 4px;
  --nb-border-color: var(--nb-black);

  /* Spacing */
  --nb-space-xs: 4px;
  --nb-space-sm: 8px;
  --nb-space-md: 16px;
  --nb-space-lg: 24px;
  --nb-space-xl: 32px;
  --nb-space-2xl: 48px;

  /* Typography */
  --nb-font-family: system-ui, -apple-system, sans-serif;
  --nb-font-size-xs: 12px;
  --nb-font-size-sm: 14px;
  --nb-font-size-base: 16px;
  --nb-font-size-lg: 18px;
  --nb-font-size-xl: 20px;
  --nb-font-size-2xl: 24px;
  --nb-font-size-3xl: 30px;
  --nb-font-size-4xl: 36px;

  /* Touch targets */
  --nb-touch-min: 48px;

  /* Animation */
  --nb-transition-fast: 100ms ease-out;
  --nb-transition-normal: 200ms ease-out;
}
```

## Inspiration Sources

### Websites with excellent Neo Brutalism:

- gumroad.com (classic NB)
- linear.app (corporate NB)
- figma.com marketing pages (playful NB)
- stripe.com/sessions (selective NB accents)
- notion.so templates (colorful NB)
- vercel.com/ship (modern NB)

### Design tools:

- Figma Neo Brutalism UI kits
- Untitled UI Neo Brutal components
- Raycast design system elements

## Quick Reference Card

| Element        | Border   | Shadow    | Radius | Colors         |
| -------------- | -------- | --------- | ------ | -------------- |
| Button Primary | 3px      | 6px 6px 0 | 0      | Blue bg, white |
| Button Danger  | 3px      | 6px 6px 0 | 0      | Red bg, white  |
| Card           | 3px      | 6px 6px 0 | 0      | White bg       |
| Input          | 2px      | none      | 0      | White bg       |
| Input (focus)  | 3px blue | none      | 0      | White bg       |
| Badge          | 2px      | none      | 0      | Status color   |
| Modal          | 4px      | 12px 12px | 0      | White bg       |
| Header         | 3px bot  | none      | 0      | White bg       |
