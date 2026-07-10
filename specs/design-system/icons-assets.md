# Icons & Assets

**Version:** 2.0.0 (Modern Neo Brutalism)

Icon system, image guidelines, and visual asset specifications for SEKAR applications.

## Icon System

### Library

SEKAR uses **MaterialCommunityIcons** from React Native Vector Icons for consistent, comprehensive iconography.

```bash
# Already installed via react-native-vector-icons
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
```

### Icon Sizes

| Size | Pixels | Usage |
|------|--------|-------|
| `xs` | 16px | Inline with small text, badges |
| `sm` | 20px | List item icons, button icons |
| `md` | 24px | Default, navigation icons |
| `lg` | 32px | Tab bar icons, feature icons |
| `xl` | 48px | Empty states, feature highlights |

```typescript
const iconSizes = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
};
```

### Icon Colors (Neo Brutalism 2.0)

| Context | Color | Hex | Usage |
|---------|-------|-----|-------|
| Primary action | `colors.primary` | `#7FBC8C` | Active tabs, CTAs |
| Default | `colors.textSecondary` | `#57534E` | Inactive icons |
| Disabled | `colors.textDisabled` | `#A8A29E` | Disabled states |
| On primary | `colors.white` | `#FFFFFF` | Icons on primary bg |
| Success | `colors.success` | `#7FBC8C` | Success indicators |
| Danger | `colors.danger` | `#FF6B6B` | Error indicators |
| Warning | `colors.warning` | `#E3A018` | Warning indicators |
| Info | `colors.info` | `#69D2E7` | Information indicators |

---

## Core Icons Reference

### Navigation & Actions

| Function | Icon Name | Preview |
|----------|-----------|---------|
| Home | `home` | 🏠 |
| Back | `arrow-left` | ← |
| Close | `close` | ✕ |
| Menu | `menu` | ☰ |
| Settings | `cog` | ⚙ |
| Search | `magnify` | 🔍 |
| Filter | `filter-variant` | ⚡ |
| Refresh | `refresh` | ↻ |

### Shift Management

| Function | Icon Name | Preview |
|----------|-----------|---------|
| Clock In | `login` | → |
| Clock Out | `logout` | ← |
| Timer | `timer-outline` | ⏱ |
| Time | `clock-outline` | 🕐 |
| Calendar | `calendar` | 📅 |
| Shift Active | `briefcase` | 💼 |

### Location & Maps

| Function | Icon Name | Preview |
|----------|-----------|---------|
| Location | `map-marker` | 📍 |
| Location Outline | `map-marker-outline` | ○ |
| GPS | `crosshairs-gps` | ⊕ |
| Map | `map` | 🗺 |
| Navigation | `navigation` | ▲ |
| Distance | `map-marker-distance` | ⟷ |

### Reports & Documents

| Function | Icon Name | Preview |
|----------|-----------|---------|
| Report | `file-document` | 📄 |
| Report Add | `file-document-plus` | 📄+ |
| Report List | `file-document-multiple` | 📄📄 |
| Task Complete | `check-circle` | ✓ |
| Incident | `alert-circle` | ⚠ |
| Maintenance | `wrench` | 🔧 |

### Media & Camera

| Function | Icon Name | Preview |
|----------|-----------|---------|
| Camera | `camera` | 📷 |
| Camera Flip | `camera-flip` | 🔄 |
| Image | `image` | 🖼 |
| Gallery | `image-multiple` | 🖼🖼 |
| Photo Add | `camera-plus` | 📷+ |

### Status & Indicators

| Function | Icon Name | Color | Preview |
|----------|-----------|-------|---------|
| Success | `check-circle` | `#7FBC8C` | ✓ |
| Error | `alert-circle` | `#FF6B6B` | ⚠ |
| Warning | `alert` | `#E3A018` | ⚠ |
| Info | `information` | `#69D2E7` | ℹ |
| Online | `circle-medium` | `#7FBC8C` | ● |
| Offline | `circle-outline` | `#A8A29E` | ○ |
| Sync | `sync` | `#E3A018` | ↻ |
| Sync Off | `sync-off` | `#FF6B6B` | ✕ |

### User & Profile

| Function | Icon Name | Preview |
|----------|-----------|---------|
| User | `account` | 👤 |
| User Circle | `account-circle` | ⊙ |
| User Group | `account-group` | 👥 |
| Worker | `account-hard-hat` | 👷 |
| Supervisor | `account-tie` | 👔 |

### Condition Indicators (Field Reports)

| Condition | Icon Name | Color |
|-----------|-----------|-------|
| Baik (Good) | `emoticon-happy-outline` | `#7FBC8C` (success) |
| Cukup (Fair) | `emoticon-neutral-outline` | `#E3A018` (warning) |
| Buruk (Poor) | `emoticon-sad-outline` | `#FF6B6B` (danger) |

---

## Icon Usage Examples

### Basic Icon

```tsx
<MaterialCommunityIcons
  name="map-marker"
  size={24}
  color={colors.primary}  // #7FBC8C
/>
```

### Icon Button (Neo Brutalism 2.0)

```tsx
<TouchableOpacity
  style={{
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bgSurface,    // #FFFFFF
    borderRadius: 6,                       // NB 2.0 radius
    borderWidth: 2,
    borderColor: colors.black,             // #1C1917
    shadowColor: colors.black,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 4,
  }}
>
  <MaterialCommunityIcons
    name="camera"
    size={24}
    color={colors.textPrimary}            // #1C1917
  />
</TouchableOpacity>
```

### Icon with Text

```tsx
<View style={{ flexDirection: 'row', alignItems: 'center' }}>
  <MaterialCommunityIcons
    name="clock-outline"
    size={20}
    color={colors.textSecondary}          // #57534E
  />
  <Text style={{ marginLeft: 8, color: colors.textPrimary }}>08:30 WIB</Text>
</View>
```

---

## Image Guidelines

### Photo Requirements

| Type | Max Dimension | Format | Quality | Max Size |
|------|---------------|--------|---------|----------|
| Selfie (Clock-in) | 800×800px | JPEG | 80% | 500KB |
| Report Photo | 1200×1200px | JPEG | 80% | 1MB |
| Thumbnail | 200×200px | JPEG | 70% | 50KB |

### Image Processing

```typescript
// Compression settings
const imageOptions = {
  maxWidth: 800,
  maxHeight: 800,
  quality: 0.8,
  compressFormat: 'JPEG',
};

// Thumbnail generation
const thumbnailOptions = {
  maxWidth: 200,
  maxHeight: 200,
  quality: 0.7,
};
```

### Aspect Ratios

| Use Case | Ratio | Example |
|----------|-------|---------|
| Profile photo | 1:1 | 100×100px |
| Report photo | 4:3 | 1200×900px |
| Thumbnail | 1:1 | 200×200px |
| Banner | 16:9 | 320×180px |

---

## Illustrations

### Empty State Illustrations

Style guidelines:
- **Style:** Flat, minimal, 2-3 colors max
- **Size:** 120×120px (mobile), 200×200px (web)
- **Format:** SVG (web), PNG @2x (mobile)
- **Colors:** Primary green (#7FBC8C) + stone tones (#57534E, #A8A29E)

| State | Description |
|-------|-------------|
| No reports | Clipboard with check mark |
| No shifts | Clock with plus sign |
| No connection | Cloud with X |
| Location error | Map marker with X |
| Empty search | Magnifying glass with ∅ |

### Placeholder Images

```typescript
// Default avatar (NB 2.0 styling)
<View style={{
  width: 48,
  height: 48,
  borderRadius: 9999,                      // Full circle
  backgroundColor: colors.gray200,         // #E7E5E4
  borderWidth: 2,
  borderColor: colors.black,               // #1C1917
  justifyContent: 'center',
  alignItems: 'center',
}}>
  <MaterialCommunityIcons
    name="account"
    size={24}
    color={colors.textSecondary}           // #57534E
  />
</View>

// Image placeholder (NB 2.0 styling)
<View style={{
  width: '100%',
  aspectRatio: 4/3,
  backgroundColor: colors.gray100,         // #F5F5F4
  borderRadius: 6,
  borderWidth: 2,
  borderColor: colors.black,               // #1C1917
  justifyContent: 'center',
  alignItems: 'center',
}}>
  <MaterialCommunityIcons
    name="image-outline"
    size={48}
    color={colors.gray400}                 // #A8A29E
  />
</View>
```

---

## App Icons & Branding

### App Icon Specifications

| Platform | Size | Format |
|----------|------|--------|
| Android (mdpi) | 48×48px | PNG |
| Android (hdpi) | 72×72px | PNG |
| Android (xhdpi) | 96×96px | PNG |
| Android (xxhdpi) | 144×144px | PNG |
| Android (xxxhdpi) | 192×192px | PNG |
| Android Adaptive | 108×108dp (with safe zone) | PNG |
| Play Store | 512×512px | PNG |

### App Icon Design (Neo Brutalism 2.0)

- Primary color: `#7FBC8C` (Nature Green)
- Secondary: `#1A4D2E` (Dark Forest Green)
- Symbol: Stylized park/tree icon or location marker
- Border: 2px black stroke (NB 2.0 style)
- Background: White or pastel yellow (#FDFD96)
- No text in icon

### Splash Screen

```
┌────────────────────────────────────┐
│                                    │
│                                    │
│            [App Icon]              │
│               60px                 │
│                                    │
│              SEKAR                 │
│                                    │
│    Sistem Evaluasi Kinerja        │
│       Satgas RTH                  │
│                                    │
│                                    │
└────────────────────────────────────┘
    Background: #FDFD96 (pastel yellow)
    Logo color: #7FBC8C (primary green)
    Text: #1C1917 (stone-900)
```

---

## Asset Optimization

### Mobile Asset Delivery

```
assets/
├── images/
│   ├── logo.png          # 1x
│   ├── logo@2x.png       # 2x (default)
│   ├── logo@3x.png       # 3x
│   └── illustrations/
│       ├── empty-reports.png
│       └── no-connection.png
└── icons/
    └── (use MaterialCommunityIcons)
```

### Image Loading Best Practices

```tsx
// Use FastImage for performance
import FastImage from 'react-native-fast-image';

<FastImage
  source={{ uri: photoUrl, priority: FastImage.priority.normal }}
  style={{ width: 100, height: 100, borderRadius: 6 }}
  resizeMode={FastImage.resizeMode.cover}
/>

// Lazy load images below the fold
// Cache images for offline access
// Show placeholder while loading
```

---

## Accessibility for Icons

### Icon Accessibility

```tsx
// Always provide accessible label for icon-only buttons
<TouchableOpacity
  accessibilityLabel="Ambil foto"
  accessibilityRole="button"
  style={{
    width: 48,
    height: 48,
    // ... NB 2.0 styling
  }}
>
  <MaterialCommunityIcons name="camera" size={24} color={colors.primary} />
</TouchableOpacity>

// Decorative icons can be hidden
<MaterialCommunityIcons
  name="map-marker"
  size={20}
  color={colors.primary}
  accessibilityElementsHidden={true}
  importantForAccessibility="no-hide-descendants"
/>
```

### Icon + Text Guidelines

- Always pair icons with text labels when possible
- Never rely on icons alone for critical actions
- Use consistent icon meanings throughout the app
- Ensure icon color meets WCAG 2.1 AA contrast ratios (minimum 3:1 for UI elements)

---

**Document Owner:** UI/UX Designer
**Last Updated:** 2026-02-05
**Status:** Active - Updated for Neo Brutalism 2.0
**Icon Library:** `react-native-vector-icons/MaterialCommunityIcons`
**Related:** [neo-brutalism.md](neo-brutalism.md) - Primary design system reference

---

## Phase 2D: Monitoring Icons & Markers

### Role Icons (Map Markers)

| Role | Icon Name | Icon Library | Shape | Description |
|------|-----------|-------------|-------|-------------|
| `satgas` | `account-circle` | MaterialCommunityIcons | Circle | Field worker — default circle shape |
| `linmas` | `shield-account` | MaterialCommunityIcons | Shield | Security officer — shield shape for protection role |
| `korlap` | `star-circle` | MaterialCommunityIcons | Star | Coordinator — star shape for leadership role |

### Status Shape Modifiers (Color Blindness Support)

Each status has both a color AND a shape/icon modifier to ensure accessibility:

| Status | Shape | Modifier Icon | Color | Purpose |
|--------|-------|--------------|-------|---------|
| Active | Circle | ✓ (check) | `#15803D` | Normal operation |
| Idle | Triangle | ⏸ (pause) | `#D97706` | No recent GPS update |
| Outside Area | Diamond | ↗ (arrow-out) | `#9333EA` | GPS outside boundary |
| Missing | Square | ! (exclamation) | `#DC2626` | Extended no-contact |

### Map Marker Anatomy

```
┌─────────────────────┐
│  44px touch target   │
│  ┌───────────────┐  │
│  │  36px outer    │  │
│  │  ┌─────────┐  │  │
│  │  │ 20px    │  │  │
│  │  │ role    │  │  │
│  │  │ icon    │  │  │
│  │  └─────────┘  │  │
│  │ (status color  │  │
│  │  ring border)  │  │
│  └───────────────┘  │
│     Name Label       │
│   (zoom >= 14 only)  │
└─────────────────────┘
```

### Area/Rayon Markers

| Type | Shape | Color | Usage |
|------|-------|-------|-------|
| Area center | Flag | Area status color | Area overview, distinct from user markers |
| Rayon center | Flag (larger) | Rayon aggregate color | Rayon overview |
| Understaffed area border | Dashed rectangle | `#DC2626` (red) | Warning indicator on area polygon |

### Action Button Icons

| Action | Icon | Color | Library |
|--------|------|-------|---------|
| WhatsApp | `whatsapp` | `#25D366` | MaterialCommunityIcons |
| Phone Call | `phone` | `#3B82F6` | MaterialCommunityIcons |
| Location Trail | `map-marker-path` | `#9333EA` | MaterialCommunityIcons |
| Filter | `filter-variant` | NB primary | MaterialCommunityIcons |
| My Location | `crosshairs-gps` | NB primary | MaterialCommunityIcons |
| Refresh | `refresh` | NB primary | MaterialCommunityIcons |
