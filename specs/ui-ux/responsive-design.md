# Responsive Design

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
// From theme.ts
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
/* TailwindCSS breakpoints */
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

### Buttons

| Screen Size | Button Width | Height |
|-------------|--------------|--------|
| Small (< 375px) | Full width | 44px |
| Standard | Full width or auto | 48px |
| Large | Max 400px centered | 52px |

```tsx
// Full-width button (mobile)
<Button
  style={{
    width: '100%',
    marginHorizontal: spacing.md,
  }}
>
  Masuk Kerja
</Button>

// Action buttons row
<View style={{
  flexDirection: 'row',
  gap: spacing.sm,
  paddingHorizontal: spacing.md,
}}>
  <Button style={{ flex: 1 }} variant="outline">Batal</Button>
  <Button style={{ flex: 1 }}>Kirim</Button>
</View>
```

### Cards

```tsx
// Full-width cards (standard)
<Card style={{
  marginHorizontal: spacing.md,
  marginBottom: spacing.sm,
}}>
  {/* content */}
</Card>

// Grid cards (tablets, optional)
<View style={{
  flexDirection: 'row',
  flexWrap: 'wrap',
  padding: spacing.sm,
}}>
  <Card style={{
    width: isTablet ? '48%' : '100%',
    margin: spacing.xs,
  }}>
    {/* content */}
  </Card>
</View>
```

### Forms

```tsx
// Single column form (all mobile sizes)
<View style={{ paddingHorizontal: spacing.md }}>
  <TextInput label="Username" />
  <TextInput label="Password" secureTextEntry />
  <Button>Login</Button>
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
      backgroundColor: colors.divider,
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
}}>
  {/* Full-width content */}
</View>
```

### Web Grid (TailwindCSS)

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
│ Nama           │ Area          │ Status    │ Jam Masuk │ ⋮  │
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
| `xs` | 11px | 12px | 12px |
| `sm` | 13px | 14px | 14px |
| `base` | 15px | 16px | 16px |
| `lg` | 17px | 18px | 18px |
| `xl` | 19px | 20px | 20px |
| `2xl` | 22px | 24px | 24px |
| `3xl` | 27px | 30px | 32px |
| `4xl` | 32px | 36px | 40px |

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

<SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
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

---

**Document Owner:** UI/UX Designer
**Last Updated:** 2026-01-16
**Status:** Active
**Implementation:** `fe/mobile/src/constants/theme.ts` (breakpoints)
