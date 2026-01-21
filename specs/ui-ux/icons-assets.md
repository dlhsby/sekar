# Icons & Assets

Icon system, image guidelines, and visual asset specifications.

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

### Icon Colors

| Context | Color | Usage |
|---------|-------|-------|
| Primary action | `colors.primary` | Active tabs, CTAs |
| Default | `colors.textSecondary` | Inactive icons |
| Disabled | `colors.textDisabled` | Disabled states |
| On primary | `colors.white` | Icons on primary bg |
| Success | `colors.success` | Success indicators |
| Error | `colors.error` | Error indicators |
| Warning | `colors.warning` | Warning indicators |

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

| Function | Icon Name | Preview |
|----------|-----------|---------|
| Success | `check-circle` | ✓ |
| Error | `alert-circle` | ⚠ |
| Warning | `alert` | ⚠ |
| Info | `information` | ℹ |
| Online | `circle-medium` | ● |
| Offline | `circle-outline` | ○ |
| Sync | `sync` | ↻ |
| Sync Off | `sync-off` | ✕ |

### User & Profile

| Function | Icon Name | Preview |
|----------|-----------|---------|
| User | `account` | 👤 |
| User Circle | `account-circle` | ⊙ |
| User Group | `account-group` | 👥 |
| Worker | `account-hard-hat` | 👷 |
| Supervisor | `account-tie` | 👔 |

### Condition Indicators

| Condition | Icon Name | Color |
|-----------|-----------|-------|
| Baik (Good) | `emoticon-happy-outline` | `success` |
| Cukup (Fair) | `emoticon-neutral-outline` | `warning` |
| Buruk (Poor) | `emoticon-sad-outline` | `error` |

---

## Icon Usage Examples

### Basic Icon

```tsx
<MaterialCommunityIcons
  name="map-marker"
  size={24}
  color={colors.primary}
/>
```

### Icon Button

```tsx
<TouchableOpacity
  style={{
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center'
  }}
>
  <MaterialCommunityIcons
    name="camera"
    size={24}
    color={colors.textPrimary}
  />
</TouchableOpacity>
```

### Icon with Text

```tsx
<View style={{ flexDirection: 'row', alignItems: 'center' }}>
  <MaterialCommunityIcons
    name="clock-outline"
    size={20}
    color={colors.textSecondary}
  />
  <Text style={{ marginLeft: 8 }}>08:30 WIB</Text>
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
- **Colors:** Primary green + gray tones

| State | Description |
|-------|-------------|
| No reports | Clipboard with check mark |
| No shifts | Clock with plus sign |
| No connection | Cloud with X |
| Location error | Map marker with X |
| Empty search | Magnifying glass with ∅ |

### Placeholder Images

```typescript
// Default avatar
<View style={{
  width: 48,
  height: 48,
  borderRadius: 24,
  backgroundColor: colors.gray200,
  justifyContent: 'center',
  alignItems: 'center',
}}>
  <MaterialCommunityIcons
    name="account"
    size={24}
    color={colors.textSecondary}
  />
</View>

// Image placeholder
<View style={{
  width: '100%',
  aspectRatio: 4/3,
  backgroundColor: colors.gray100,
  justifyContent: 'center',
  alignItems: 'center',
}}>
  <MaterialCommunityIcons
    name="image-outline"
    size={48}
    color={colors.gray400}
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

### App Icon Design

- Primary color: `#2E7D32` (Green)
- Symbol: Stylized park/tree icon or location marker
- Background: White or gradient
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
│    Sistem Evaluasi Kerja          │
│       Satgas RTH                  │
│                                    │
│                                    │
└────────────────────────────────────┘
    Background: #FFFFFF or #2E7D32
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
  style={{ width: 100, height: 100 }}
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
>
  <MaterialCommunityIcons name="camera" size={24} />
</TouchableOpacity>

// Decorative icons can be hidden
<MaterialCommunityIcons
  name="map-marker"
  size={20}
  accessibilityElementsHidden={true}
  importantForAccessibility="no-hide-descendants"
/>
```

### Icon + Text Guidelines

- Always pair icons with text labels when possible
- Never rely on icons alone for critical actions
- Use consistent icon meanings throughout the app

---

**Document Owner:** UI/UX Designer
**Last Updated:** 2026-01-16
**Status:** Active
**Icon Library:** `react-native-vector-icons/MaterialCommunityIcons`
