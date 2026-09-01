# Responsive Design

**Version:** 2.0.0 (Modern Neo Brutalism)

Breakpoints, layout patterns, and responsive guidelines for SEKAR applications.

## Breakpoint System

### Mobile Breakpoints

Based on common device sizes for the Indonesian market:

| Name | Min Width | Devices |
|------|-----------|---------|
| `xs` | 0 | Very small phones |
| `sm` | 375px | iPhone SE, standard Android |
| `md` | 414px | Large phones (iPhone Plus/Pro Max) |

```typescript
// From nbTokens.ts
breakpoints: {
  sm: 375,   // Standard phones
  md: 768,   // Tablets
  lg: 1024,  // Desktop
}
```

### Web Breakpoints

| Name | Range | Layout Description |
|------|-------|---------------------|
| Mobile | < 768px | Single column, mobile navigation |
| Tablet | 768-1024px | Two columns, side drawer |
| Desktop | 1024-1440px | Full sidebar, multi-column |
| Large Desktop | > 1440px | Max-width container, centered |

```css
/* TailwindCSS 4 breakpoints */
/* sm: 640px - Not commonly used */
/* md: 768px - Tablet */
/* lg: 1024px - Desktop */
/* xl: 1280px - Large desktop */
/* 2xl: 1536px - Extra large */
```

---

## Mobile Layout Patterns

### Standard Screen Layout

```
┌────────────────────────────────────┐
│ ┌────────────────────────────────┐ │
│ │         STATUS BAR             │ │  ← System status bar
│ ├────────────────────────────────┤ │
│ │ ←  Header Title          [⋮]  │ │  ← Navigation header (56px)
│ ├────────────────────────────────┤ │
│ │                                │ │
│ │                                │ │
│ │         CONTENT AREA           │ │  ← Scrollable content
│ │         (ScrollView)           │ │
│ │                                │ │
│ │                                │ │
│ │                                │ │
│ ├────────────────────────────────┤ │
│ │  [🏠]   [📋]   [👤]   [⚙]   │ │  ← Bottom tabs (56px)
│ └────────────────────────────────┘ │
│         SAFE AREA (bottom)         │
└────────────────────────────────────┘

Margins: 16px (md) horizontal
Background: #FDFD96 (pastel yellow) or #DAF5F0 (pastel mint)
```

### Screen Margin Rules

| Element | Small (< 375px) | Standard (≥ 375px) |
|---------|-----------------|---------------------|
| Screen horizontal padding | 12px | 16px |
| Card horizontal margin | 12px | 16px |
| List item padding | 12px 12px | 16px 16px |
| Section vertical spacing | 16px | 24px |

```typescript
// Responsive padding hook
const useResponsivePadding = () => {
  const { width } = useWindowDimensions();
  return width < 375 ? spacing.sm : spacing.md;
};
```

### Full-Width vs Contained Content

```
Full-width (images, cards):
┌────────────────────────────────────┐
│████████████████████████████████████│
│████████████████████████████████████│
└────────────────────────────────────┘

Contained (text, form fields):
┌────────────────────────────────────┐
│    ┌────────────────────────┐     │
│    │  Content with margins  │     │
│    └────────────────────────┘     │
└────────────────────────────────────┘
     ↑ 16px margins ↑
```

---

## Component Responsive Behavior

### Buttons (Neo Brutalism 2.0)

| Screen Size | Button Width | Height |
|-------------|--------------|--------|
| Small (< 375px) | Full width | 44px |
| Standard | Full width or auto | 48px |
| Large | Max 400px centered | 52px |

```tsx
// Full-width button (mobile) - NB 2.0 styling
<NBButton
  style={{
    width: '100%',
    marginHorizontal: spacing.md,
  }}
>
  Masuk Kerja
</NBButton>

// Action buttons row
<View style={{
  flexDirection: 'row',
  gap: spacing.sm,
  paddingHorizontal: spacing.md,
}}>
  <NBButton style={{ flex: 1 }} variant="outline">Batal</NBButton>
  <NBButton style={{ flex: 1 }}>Kirim</NBButton>
</View>
```

### Cards (Neo Brutalism 2.0)

```tsx
// Full-width cards (standard) - NB 2.0 styling
<NBCard style={{
  marginHorizontal: spacing.md,
  marginBottom: spacing.sm,
  backgroundColor: colors.bgSurface,  // #FFFFFF
  borderRadius: 6,                    // NB 2.0 radius
  borderWidth: 2,
  borderColor: colors.black,          // #1C1917
}}>
  {/* content */}
</NBCard>

// Grid cards (tablets, optional)
<View style={{
  flexDirection: 'row',
  flexWrap: 'wrap',
  padding: spacing.sm,
}}>
  <NBCard style={{
    width: isTablet ? '48%' : '100%',
    margin: spacing.xs,
  }}>
    {/* content */}
  </NBCard>
</View>
```

### Forms

```tsx
// Single column form (all mobile sizes)
<View style={{ paddingHorizontal: spacing.md }}>
  <NBTextInput label="Username" />
  <NBTextInput label="Password" secureTextEntry />
  <NBButton>Login</NBButton>
</View>

// Form field max-width (large screens)
const maxFormWidth = 400;

<View style={{
  width: '100%',
  maxWidth: maxFormWidth,
  alignSelf: 'center',
}}>
  {/* form fields */}
</View>
```

### Lists

```tsx
// Standard list (full width)
<FlatList
  data={items}
  renderItem={({ item }) => (
    <ListItem
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
      }}
    >
      {item.title}
    </ListItem>
  )}
  ItemSeparatorComponent={() => (
    <View style={{
      height: 1,
      backgroundColor: colors.gray200,  // Stone-200
      marginLeft: spacing.md,
    }} />
  )}
/>
```

---

## Web Dashboard Layout

### Desktop Layout (> 1024px)

```
┌──────────────────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────────────────┐ │
│ │  [Logo]  SEKAR          Search...      [Bell] [Avatar]  │ │  ← Top bar (64px)
│ └──────────────────────────────────────────────────────────┘ │
├─────────────┬────────────────────────────────────────────────┤
│             │                                                │
│  Dashboard  │                                                │
│  Pekerja    │         MAIN CONTENT AREA                      │
│  Laporan    │                                                │
│  Absensi    │         ┌─────────────┐  ┌─────────────┐       │
│  Peta       │         │   Card 1    │  │   Card 2    │       │
│  ─────────  │         └─────────────┘  └─────────────┘       │
│  Pengaturan │                                                │
│             │         ┌─────────────────────────────┐        │
│   240px     │         │      Data Table / List      │        │
│   sidebar   │         └─────────────────────────────┘        │
│             │                                                │
└─────────────┴────────────────────────────────────────────────┘
               └───────────── Fluid width ─────────────────────┘

Sidebar: #1A4D2E (dark forest green)
Main: #FDFD96 (pastel yellow) or #FFFFFF
```

### Tablet Layout (768-1024px)

```
┌────────────────────────────────────────┐
│  [☰]  SEKAR              [🔔] [👤]    │  ← Top bar with hamburger
├────────────────────────────────────────┤
│                                        │
│           MAIN CONTENT AREA            │
│                                        │
│  ┌────────────────┐ ┌────────────────┐ │
│  │    Card 1      │ │    Card 2      │ │
│  └────────────────┘ └────────────────┘ │
│                                        │
│  ┌────────────────────────────────────┐│
│  │         Data Table / List          ││
│  └────────────────────────────────────┘│
│                                        │
└────────────────────────────────────────┘
  ↑
  Drawer overlays on hamburger tap
```

### Mobile Web Layout (< 768px)

```
┌────────────────────────────┐
│  [☰]  SEKAR        [🔔]   │  ← Compact header
├────────────────────────────┤
│                            │
│    SINGLE COLUMN           │
│    CONTENT                 │
│                            │
│  ┌────────────────────┐    │
│  │      Card 1        │    │
│  └────────────────────┘    │
│  ┌────────────────────┐    │
│  │      Card 2        │    │
│  └────────────────────┘    │
│                            │
│  ┌────────────────────┐    │
│  │  List items...     │    │
│  └────────────────────┘    │
│                            │
├────────────────────────────┤
│ [🏠] [📋] [📊] [⚙]       │  ← Optional bottom nav
└────────────────────────────┘
```

---

## Grid System

### Mobile Grid

Single column layout for most content:

```tsx
// Standard mobile container
<View style={{
  flex: 1,
  paddingHorizontal: spacing.md, // 16px
  backgroundColor: colors.bgCanvas, // #F5F0EB (Phase 3-0 canvas, ADR-036)
}}>
  {/* Full-width content */}
</View>
```

### Web Grid (TailwindCSS 4)

```html
<!-- Container with max-width -->
<div class="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

  <!-- 12-column grid -->
  <div class="grid grid-cols-12 gap-6">

    <!-- Full width on mobile, 6 cols on desktop -->
    <div class="col-span-12 lg:col-span-6">
      Card 1
    </div>

    <div class="col-span-12 lg:col-span-6">
      Card 2
    </div>

    <!-- Full width table -->
    <div class="col-span-12">
      Data Table
    </div>

  </div>
</div>
```

---

## Data Tables (Web)

### Desktop Table

```
┌──────────────────────────────────────────────────────────────┐
│ Nama           │ Lokasi        │ Status    │ Jam Masuk │ ⋮  │
├──────────────────────────────────────────────────────────────┤
│ Ahmad Rizki    │ Taman Bungkul │ ● Online  │ 08:05     │ ⋮  │
│ Budi Santoso   │ Taman Surya   │ ○ Offline │ -         │ ⋮  │
│ Citra Dewi     │ Jl. Basuki    │ ● Online  │ 07:58     │ ⋮  │
└──────────────────────────────────────────────────────────────┘
```

### Mobile Table → Card List

On mobile, tables transform to card lists:

```
┌────────────────────────────────┐
│ Ahmad Rizki                    │
│ Taman Bungkul          ● Online│
│ Jam masuk: 08:05              │
└────────────────────────────────┘
┌────────────────────────────────┐
│ Budi Santoso                   │
│ Taman Surya           ○ Offline│
│ Belum absen                   │
└────────────────────────────────┘
```

---

## Responsive Typography

### Scale Adjustments

| Size Token | Small (< 375) | Standard | Large (> 414) |
|------------|---------------|----------|---------------|
| `caption` | 11px | 12px | 12px |
| `body-sm` | 13px | 14px | 14px |
| `body` | 15px | 16px | 16px |
| `body-lg` | 17px | 18px | 18px |
| `h4` | 17px | 18px | 18px |
| `h3` | 20px | 22px | 22px |
| `h2` | 24px | 26px | 26px |
| `h1` | 29px | 32px | 34px |
| `display` | 36px | 40px | 44px |
| `display-xl` | 43px | 48px | 52px |

```typescript
// Responsive font size hook
const useResponsiveFontSize = (size: keyof typeof typography.fontSize) => {
  const { width } = useWindowDimensions();
  const baseSize = typography.fontSize[size];

  if (width < 375) {
    return Math.floor(baseSize * 0.9);
  }
  return baseSize;
};
```

---

## Background Patterns (Neo Brutalism 2.0)

### Pattern Usage by Screen Size

| Screen Size | Pattern | Opacity | Usage |
|-------------|---------|---------|-------|
| Mobile | Dots | 3% | Subtle, battery-friendly |
| Tablet | Grid | 3% | Moderate visual interest |
| Desktop | Grid | 3% | Full pattern visibility |

```css
/* Responsive pattern application */
@media (max-width: 767px) {
  .pattern-background {
    /* Use dots pattern on mobile for less visual noise */
    background-image: radial-gradient(
      circle at center,
      rgba(45, 82, 51, 0.03) 1.5px,
      transparent 1.5px
    );
    background-size: 24px 24px;
  }
}

@media (min-width: 768px) {
  .pattern-background {
    /* Use grid pattern on larger screens */
    background-image:
      linear-gradient(rgba(45, 82, 51, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(45, 82, 51, 0.03) 1px, transparent 1px);
    background-size: 32px 32px;
  }
}
```

---

## Orientation Handling

### Portrait (Primary)

All screens optimized for portrait orientation.

### Landscape (Optional Support)

```typescript
// Lock to portrait for most screens
// Allow landscape only for maps/dashboards

import { useWindowDimensions } from 'react-native';

const MapScreen = () => {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  return (
    <View style={{
      flex: 1,
      flexDirection: isLandscape ? 'row' : 'column',
      backgroundColor: colors.bgCanvas, // #F5F0EB (Phase 3-0 canvas, ADR-036)
    }}>
      <MapView style={{ flex: isLandscape ? 2 : 1 }} />
      {!isLandscape && <BottomPanel />}
      {isLandscape && <SidePanel />}
    </View>
  );
};
```

---

## Safe Areas

### iOS Safe Areas

```tsx
import { SafeAreaView } from 'react-native-safe-area-context';

<SafeAreaView style={{ flex: 1, backgroundColor: colors.bgPrimary }} edges={['top', 'bottom']}>
  <View style={{ flex: 1 }}>
    {/* Content */}
  </View>
</SafeAreaView>
```

### Android System UI

```tsx
// Handle status bar height
import { StatusBar } from 'react-native';

const statusBarHeight = StatusBar.currentHeight || 0;
```

### Notch/Cutout Handling

```tsx
// Avoid content in notch areas
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Screen = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={{
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      backgroundColor: colors.bgPrimary,
    }}>
      {/* Content */}
    </View>
  );
};
```

---

## Testing Responsive Designs

### Device Testing Matrix

| Device | Width | Priority |
|--------|-------|----------|
| iPhone SE | 375px | High |
| iPhone 12/13/14 | 390px | High |
| iPhone Plus/Pro Max | 428px | Medium |
| Samsung Galaxy S21 | 360px | High |
| Xiaomi Redmi Note | 393px | High |
| iPad Mini | 768px | Low (future) |

### Testing Checklist

- [ ] Test on smallest supported width (360px)
- [ ] Test on most common width (375-390px)
- [ ] Test on largest phone width (428px)
- [ ] Verify text doesn't overflow
- [ ] Verify touch targets remain ≥48px
- [ ] Test with large system fonts (200%)
- [ ] Test in both orientations (if supported)
- [ ] Verify background patterns at different sizes
- [ ] Test NB 2.0 shadow visibility on all sizes

---

## Monitoring Dashboard Responsive Layouts

### Breakpoint Layout Matrix

| Breakpoint | Map Width | Side Panel | Status Cards | Map Controls |
|------------|-----------|------------|--------------|--------------|
| xl (>=1280px) | 65% | 35% fixed right (320-480px) | 1x4 horizontal row | Top-right cluster |
| lg (>=1024px) | 60% | 40% fixed right (320px min) | 1x4 horizontal row | Top-right cluster |
| md (>=768px) | 100% | Bottom drawer (draggable) | 2x2 grid | Bottom-right stack |
| sm (<768px) | 100% | Bottom sheet (swipe-up) | 2x2 grid, compact | Bottom-right, minimal |

### Map Control Responsive Behavior

| Control | xl/lg | md | sm |
|---------|-------|----|----|
| Zoom +/- | Visible, top-right | Visible, bottom-right | Hidden (use pinch) |
| Compass | Visible | Visible | Hidden |
| Fullscreen toggle | Visible | Visible | N/A (always full) |
| Filter button | In side panel | FAB (bottom-left) | FAB (bottom-left) |
| Refresh | In side panel header | FAB | FAB |
| Current location | Visible, bottom-right | Visible | Visible |

### Side Panel Responsive Rules

| Rule | Value |
|------|-------|
| Min width | 320px |
| Max width | 480px |
| Collapse trigger | Screen width < 1024px |
| Collapsed state | Bottom drawer (md) or bottom sheet (sm) |
| Drawer peek height | 120px (shows status cards) |
| Sheet peek height | 80px (shows handle + status summary) |
| Full expansion | 70% of viewport height |
| Transition | Slide from right (lg+), slide from bottom (md-) |

### Role-Specific Layout Adaptation

| Role | Default View | Side Panel Default | Extra Controls |
|------|-------------|-------------------|----------------|
| management | City-wide map, all rayons | Rayon summary list | Rayon selector dropdown |
| kepala_rayon | Rayon-focused map | Location summary list | Location selector, staffing overview |
| korlap | Location-focused map | Worker list | Worker search, quick actions |
| admin_system | City-wide map | Full worker list | Config access, all filters |

### Status Card Responsive Sizing

| Breakpoint | Card Size | Font Size (count) | Font Size (label) | Gap |
|------------|-----------|-------------------|-------------------|-----|
| xl | 180x80px | 28px bold | 12px | 16px |
| lg | 160x72px | 24px bold | 11px | 12px |
| md | calc(50%-8px) x 64px | 22px bold | 11px | 8px |
| sm | calc(50%-6px) x 56px | 20px bold | 10px | 6px |

---

**Document Owner:** UI/UX Designer
**Last Updated:** 2026-04-25
**Status:** Active - Updated for Neo Brutalism 2.0 + Phase 2D Monitoring
**Implementation:** `apps/mobile/src/constants/nbTokens.ts` (breakpoints)
**Related:** [neo-brutalism.md](neo-brutalism.md) - Primary design system reference
