# Mobile Component Library

**Last Updated:** 2026-06-20
**Version:** Neo Brutalism 2.1.1 (Phase 4 rebrand re-baseline v2.1.1 applied May 25, 2026; generated tokens from `specs/ui-ux/tokens.json` via Phase 3 M1-R sub-phase 3-R2; NBModal/NBToast/NBText via 3-R3)
**Location:** `apps/mobile/src/components/nb/` + `apps/mobile/src/constants/generated/tokens.ts`
**Phase 5 status:** Reporting (5-1) + Analytics (5-2) + Assets (5-3) screens complete; feature modules shipped Jun 17

This document provides the complete component library reference for the SEKAR mobile application.

> **Phase 3 update:** Token values (colors, shadows, radii, type scale, motion) now come from **generated** `apps/mobile/src/constants/generated/tokens.ts`, emitted from [`specs/ui-ux/tokens.json`](../ui-ux/tokens.json) by `scripts/build-tokens.ts`. Do **not** edit `nbTokens.ts` by hand — it re-exports from the generated file. New NB primitives introduced in Phase 3: `NBModal`, `NBToast`. See [design-tokens.md](../ui-ux/design-tokens.md) and [ADR-036](../architecture/decisions/ADR-036-design-tokens-single-source.md).

---

## Table of Contents

1. [Overview](#overview)
2. [Core Components](#core-components)
3. [Form Components](#form-components)
4. [Feedback Components](#feedback-components)
5. [Layout Components](#layout-components)
6. [Usage Guidelines](#usage-guidelines)

---

## Overview

### Component Inventory

| Component | File | Status | Tests |
|-----------|------|--------|-------|
| NBButton | NBButton.tsx | ✅ Complete | ✅ |
| NBCard | NBCard.tsx | ✅ Complete | ✅ |
| NBTextInput | NBTextInput.tsx | ✅ Complete | ✅ |
| NBPasswordInput | NBPasswordInput.tsx | ✅ Complete | ✅ |
| NBAlert | NBAlert.tsx | ✅ Complete | ✅ |
| NBBadge | NBBadge.tsx | ✅ Complete | ⚠️ A11y pending |
| NBTab | NBTab.tsx | ✅ Complete | ⚠️ A11y pending |
| NBSkeleton | NBSkeleton.tsx | ✅ Complete | ⚠️ A11y pending |
| NBEmptyState | NBEmptyState.tsx | ✅ Complete | ✅ |
| NBBackgroundPattern | NBBackgroundPattern.tsx | ✅ Complete | ✅ |

### Design Principles

1. **Neo Brutalism 2.1** - Hard-edge shadows (zero blur), 2px borders, 6–10px radius (v2.1.1 reconciled to design/)
2. **Accessibility First** - WCAG 2.1 AA compliant, 48px touch targets, status color pairs for color-blind users
3. **Indonesian Localization** - Default labels in Indonesian
4. **Haptic Feedback** - Tactile response on interactions
5. **Reduce Motion** - Respects system accessibility settings
6. **Generated tokens** - All colors/shadows/spacing from `apps/mobile/src/constants/generated/tokens.ts` (never hand-edit)

---

## Core Components

### NBButton

Primary action button with Neo Brutalism styling.

```tsx
import { NBButton } from '@/components/nb';

<NBButton
  variant="primary"
  size="md"
  onPress={handlePress}
  loading={isLoading}
  disabled={isDisabled}
>
  Simpan
</NBButton>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | 'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'destructive' | 'primary' | Visual style |
| `size` | 'sm' \| 'md' \| 'lg' | 'md' | Button size |
| `onPress` | () => void | required | Press handler |
| `loading` | boolean | false | Shows loading spinner |
| `disabled` | boolean | false | Disables button |
| `fullWidth` | boolean | false | Expands to container |
| `icon` | IconName | - | Left icon |
| `iconRight` | IconName | - | Right icon |

#### Variants

| Variant | Background | Text | Use Case |
|---------|------------|------|----------|
| `primary` | #7FBC8C | white | Primary actions |
| `secondary` | #8B7355 | white | Secondary actions |
| `outline` | transparent | #1C1917 | Tertiary actions |
| `ghost` | transparent | #1C1917 | Minimal actions |
| `destructive` | #FF6B6B | white | Dangerous actions |

#### Sizes

| Size | Height | Padding | Font Size |
|------|--------|---------|-----------|
| `sm` | 40px | 16px h | 14px |
| `md` | 48px | 24px h | 16px |
| `lg` | 56px | 32px h | 18px |

#### Accessibility

- `accessibilityRole="button"`
- `accessibilityState={{ disabled, busy }}`
- `accessibilityLabel` required for icon-only buttons
- Haptic feedback: `impactLight` on press, `impactMedium` on release
- Respects `AccessibilityInfo.isReduceMotionEnabled`

---

### NBCard

Container component for grouped content.

```tsx
import { NBCard } from '@/components/nb';

<NBCard variant="elevated" interactive onPress={handlePress}>
  <NBCard.Header>
    <Text>Card Title</Text>
  </NBCard.Header>
  <NBCard.Content>
    <Text>Card content goes here</Text>
  </NBCard.Content>
  <NBCard.Footer>
    <NBButton>Action</NBButton>
  </NBCard.Footer>
</NBCard>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | 'default' \| 'elevated' \| 'outlined' \| 'filled' | 'default' | Visual style |
| `interactive` | boolean | false | Enables press animations |
| `onPress` | () => void | - | Press handler (when interactive) |
| `padding` | 'none' \| 'sm' \| 'md' \| 'lg' | 'md' | Content padding |

#### Subcomponents

| Component | Description |
|-----------|-------------|
| `NBCard.Header` | Top section with border-bottom |
| `NBCard.Content` | Main content area |
| `NBCard.Footer` | Bottom section with border-top |

#### Variants

| Variant | Shadow | Border | Background |
|---------|--------|--------|------------|
| `default` | sm | 2px | white |
| `elevated` | md | 2px | white |
| `outlined` | none | 2px | white |
| `filled` | none | none | primary/10 |

#### Accessibility

- `accessibilityRole="button"` when interactive
- `accessibilityLabel` required when interactive
- Haptic feedback on press when interactive

---

### NBBadge

Status indicator for labels and counts.

```tsx
import { NBBadge } from '@/components/nb';

<NBBadge variant="success" size="md">
  Aktif
</NBBadge>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | 'primary' \| 'secondary' \| 'success' \| 'warning' \| 'danger' \| 'info' \| 'outline' | 'primary' | Color variant |
| `size` | 'sm' \| 'md' \| 'lg' | 'sm' | Badge size |
| `accessibilityLabel` | string | - | **Required** for accessibility |

#### Variants

| Variant | Background | Border | Text |
|---------|------------|--------|------|
| `primary` | #7FBC8C | - | white |
| `secondary` | #F5F5F4 | - | #1C1917 |
| `success` | #BAFCA2 | #7FBC8C | #1C1917 |
| `warning` | #FFDB58 | #E3A018 | #1C1917 |
| `danger` | #FFA07A | #FF6B6B | #1C1917 |
| `info` | #A7DBD8 | #69D2E7 | #1C1917 |
| `outline` | transparent | #1C1917 | #1C1917 |

#### Accessibility (Required Updates)

```tsx
// Add these accessibility props
<NBBadge
  variant="success"
  accessibilityRole="text"
  accessibilityLabel="Status: Aktif"
>
  Aktif
</NBBadge>
```

---

## Form Components

### NBTextInput

Text input field with validation states.

```tsx
import { NBTextInput } from '@/components/nb';

<NBTextInput
  label="Email"
  placeholder="contoh@email.com"
  value={email}
  onChangeText={setEmail}
  error={errors.email}
  keyboardType="email-address"
  autoCapitalize="none"
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | string | - | Input label |
| `placeholder` | string | - | Placeholder text |
| `value` | string | required | Input value |
| `onChangeText` | (text: string) => void | required | Change handler |
| `error` | string | - | Error message |
| `helper` | string | - | Helper text |
| `iconLeft` | IconName | - | Left icon |
| `iconRight` | IconName | - | Right icon |
| `disabled` | boolean | false | Disables input |
| `multiline` | boolean | false | Enables textarea mode |
| `numberOfLines` | number | 1 | Lines for multiline |

#### States

| State | Border Color | Border Width | Additional |
|-------|--------------|--------------|------------|
| Default | #1C1917 | 2px | Standard shadow |
| Focused | #7FBC8C | 3px | Focus shadow |
| Error | #FF6B6B | 2px | Red border |
| Success | #7FBC8C | 2px | Green border |
| Disabled | #D6D3D1 | 2px | Reduced opacity |

#### Accessibility

- `accessibilityLabel` linked to label
- `accessibilityHint` from helper text
- `accessibilityState={{ invalid: hasError }}`

---

### NBPasswordInput

Password input with visibility toggle.

```tsx
import { NBPasswordInput } from '@/components/nb';

<NBPasswordInput
  label="Password"
  placeholder="Masukkan password"
  value={password}
  onChangeText={setPassword}
  error={errors.password}
/>
```

#### Props

Inherits all NBTextInput props except:
- `secureTextEntry` - Always true (managed internally)
- `keyboardType` - Always 'default'

#### Visibility Toggle

- Button size: 48×48 (touch target)
- Icons: `eye` / `eye-off`
- Accessibility:
  - `accessibilityRole="button"`
  - `accessibilityLabel="Tampilkan password"` / `"Sembunyikan password"`
  - `accessibilityState={{ checked: visible }}`

---

## Feedback Components

### NBAlert

Alert/notification banner component.

```tsx
import { NBAlert } from '@/components/nb';

<NBAlert
  variant="error"
  title="Gagal Login"
  message="Username atau password salah"
  dismissible
  onDismiss={handleDismiss}
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | 'success' \| 'warning' \| 'error' \| 'info' | 'info' | Alert type |
| `title` | string | - | Alert title |
| `message` | string | required | Alert message |
| `dismissible` | boolean | false | Shows close button |
| `onDismiss` | () => void | - | Dismiss handler |
| `icon` | IconName | auto | Override icon |

#### Variants

| Variant | Background | Border | Icon | Haptic |
|---------|------------|--------|------|--------|
| `success` | #BAFCA2 | #7FBC8C | check-circle | notificationSuccess |
| `warning` | #FFDB58 | #E3A018 | alert-triangle | notificationWarning |
| `error` | #FFA07A | #FF6B6B | alert-circle | notificationError |
| `info` | #A7DBD8 | #69D2E7 | info | - |

#### Accessibility

- `accessibilityRole="alert"`
- `accessibilityLiveRegion="assertive"` for error, `"polite"` for others
- Haptic feedback based on variant

---

### NBSkeleton

Loading placeholder component.

```tsx
import { NBSkeleton } from '@/components/nb';

<NBSkeleton variant="card" />
<NBSkeleton variant="text" width={200} />
<NBSkeleton variant="avatar" />
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | 'text' \| 'title' \| 'avatar' \| 'button' \| 'card' | 'text' | Skeleton type |
| `width` | number \| string | auto | Custom width |
| `height` | number | auto | Custom height |
| `borderRadius` | number | auto | Custom radius |

#### Variants

| Variant | Dimensions | Radius |
|---------|------------|--------|
| `text` | h:16, w:100% | 4px |
| `title` | h:24, w:75% | 4px |
| `avatar` | 40×40 | full |
| `button` | h:40, w:80 | 6px |
| `card` | h:120, w:100% | 6px |

#### Animation

- Shimmer animation: opacity 0.3 → 0.7
- Duration: 1000ms
- Respects reduce motion setting

#### Accessibility (Required Updates)

```tsx
// Add these accessibility props
<View
  accessibilityRole="progressbar"
  accessibilityState={{ busy: true }}
  accessibilityLabel="Memuat..."
>
  <NBSkeleton variant="card" />
</View>
```

---

### NBEmptyState

Empty state placeholder component.

```tsx
import { NBEmptyState } from '@/components/nb';

<NBEmptyState
  icon="clipboard"
  title="Tidak ada tugas"
  description="Anda belum memiliki tugas hari ini"
  actionLabel="Lihat Semua"
  onAction={handleViewAll}
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | IconName | required | Center icon |
| `title` | string | required | Title text |
| `description` | string | - | Description text |
| `actionLabel` | string | - | Action button text |
| `onAction` | () => void | - | Action handler |

#### Default Labels (Indonesian)

When no props provided:
- Title: "Tidak ada data"
- Description: "Data yang Anda cari tidak ditemukan"
- Action: "Muat Ulang"

---

## Layout Components

### NBTab

Tab button component for tab bars.

```tsx
import { NBTab, NBTabContainer } from '@/components/nb';

<NBTabContainer>
  <NBTab active={activeTab === 'all'} onPress={() => setActiveTab('all')}>
    Semua
  </NBTab>
  <NBTab active={activeTab === 'pending'} onPress={() => setActiveTab('pending')}>
    Pending
  </NBTab>
</NBTabContainer>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `active` | boolean | false | Active state |
| `onPress` | () => void | required | Press handler |
| `icon` | IconName | - | Tab icon |
| `badge` | number | - | Badge count |

#### States

| State | Background | Text | Border |
|-------|------------|------|--------|
| Inactive | transparent | #57534E | #1C1917 |
| Active | #7FBC8C | white | #1C1917 |

#### Accessibility

**Tab Item:**
- `accessibilityRole="tab"`
- `accessibilityState={{ selected: active }}`

**Tab Container (Required Update):**
```tsx
<View accessibilityRole="tablist">
  {/* tabs */}
</View>
```

---

### NBBackgroundPattern

Decorative background pattern component.

```tsx
import { NBBackgroundPattern } from '@/components/nb';

<View style={{ flex: 1 }}>
  <NBBackgroundPattern type="grid" />
  {/* content */}
</View>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | 'grid' \| 'dots' \| 'stripes' \| 'checkerboard' | 'grid' | Pattern type |
| `color` | string | #1C1917 | Pattern color |
| `opacity` | number | 0.03 | Pattern opacity |
| `spacing` | number | 20 | Pattern spacing |

#### Pattern Types

| Type | Description |
|------|-------------|
| `grid` | Intersecting horizontal and vertical lines |
| `dots` | Dot matrix pattern |
| `stripes` | Diagonal lines |
| `checkerboard` | Alternating squares |

#### Performance

- Uses SVG for crisp rendering
- Optimized for scrolling
- No impact on touch interactions

---

## Usage Guidelines

### Import Pattern

```tsx
// Import from index
import {
  NBButton,
  NBCard,
  NBTextInput,
  NBAlert,
  NBBadge,
} from '@/components/nb';
```

### Token Usage

Always use design tokens instead of hardcoded values:

```tsx
// ❌ Bad
const styles = StyleSheet.create({
  button: {
    borderWidth: 2, // hardcoded
    borderRadius: 6, // hardcoded
  },
});

// ✅ Good
import { nbBorders, nbBorderRadius } from '@/constants/nbTokens';

const styles = StyleSheet.create({
  button: {
    borderWidth: nbBorders.base,
    borderRadius: nbBorderRadius.base,
  },
});
```

### Accessibility Requirements

1. **Touch Targets:** Minimum 48×48px for all interactive elements
2. **Labels:** All form inputs must have accessible labels
3. **Roles:** Use appropriate accessibility roles
4. **State:** Communicate disabled, loading, selected states
5. **Haptics:** Provide tactile feedback on interactions
6. **Reduce Motion:** Respect system accessibility settings

### Haptic Feedback

```tsx
import * as Haptics from 'expo-haptics';

// Button press
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// Button release
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

// Success
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// Error
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
```

### Testing Components

Each component should have:
1. **Unit tests** for all variants and states
2. **Accessibility tests** for ARIA compliance
3. **Snapshot tests** for visual regression

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { NBButton } from '@/components/nb';

describe('NBButton', () => {
  it('renders correctly', () => {
    const { getByText } = render(<NBButton>Test</NBButton>);
    expect(getByText('Test')).toBeTruthy();
  });

  it('handles press', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <NBButton onPress={onPress}>Test</NBButton>
    );
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalled();
  });

  it('is accessible when disabled', () => {
    const { getByRole } = render(
      <NBButton disabled>Test</NBButton>
    );
    expect(getByRole('button').props.accessibilityState.disabled).toBe(true);
  });
});

---

## Phase 2D: Monitoring Components

**Location:** `apps/mobile/src/components/monitoring/`

### New Components (6)

| Component | File | Props | Description |
|-----------|------|-------|-------------|
| UserDetailSheet | `UserDetailSheet.tsx` | `userId: string`, `onClose`, `onTrailPress` | Bottom sheet with shift info, location, activities, tasks, WhatsApp/Call/Trail actions |
| LocationTrail | `LocationTrail.tsx` | `points: LocationHistoryPointDto[]`, `areaPolygon?` | Polyline overlay with green (inside) / purple (outside) segments, start/end pins |
| StatusSummaryBar | `StatusSummaryBar.tsx` | `counts: StatusCounts`, `activeFilter?`, `onFilterPress` | 48px bar with four status chips showing counts |
| UserListStrip | `UserListStrip.tsx` | `users: LiveUserDto[]`, `selectedId?`, `onUserPress` | 80px horizontal scroll of UserListCards |
| UserListCard | `UserListCard.tsx` | `user: LiveUserDto`, `isSelected`, `onPress` | 160x80px card with status dot, name, role badge, area, last update |
| MonitoringFilterModal | `MonitoringFilterModal.tsx` | `visible`, `filters`, `onApply`, `onClose`, `userRole` | Full-screen modal with cascading filters, role-gated presets |

### Modified Components

| Component | File | Changes |
|-----------|------|---------|
| UserMarker | `UserMarker.tsx` | Role icons (MaterialCommunityIcons: account-circle/shield-account/star-circle), five-status color ring, name label (10px, zoom >= 14), 44x44px touch target |

### Design Tokens

Located in `apps/mobile/src/constants/nbTokens.ts` as `monitoringTokens`:

```typescript
monitoringTokens = {
  status: {
    active: { color: '#15803D', bg: '#DCFCE7', label: 'Aktif' },
    inactive: { color: '#D97706', bg: '#FEF3C7', label: 'Idle' },
    outside_area: { color: '#9333EA', bg: '#F3E8FF', label: 'Di Luar Area' },
    missing: { color: '#DC2626', bg: '#FEE2E2', label: 'Tidak Terdeteksi' },
    offline: { color: '#6B7280', bg: '#F3F4F6', label: 'Offline' },
  },
  marker: { outerSize: 36, iconSize: 20, labelFontSize: 10, touchTarget: 44 },
  summaryBar: { height: 48, chipHeight: 32, chipGap: 8 },
  userListStrip: { height: 80, cardWidth: 160, cardGap: 8 },
  fab: { size: 44, gap: 8, borderWidth: 2 },
  detailSheet: { initialSnapPoint: '50%', maxSnapPoint: '85%' },
}
```

---

## Phase 3 M1-R: NB Modal / Toast / Text (sub-phase 3-R3)

Three new mobile NB components ship in Phase 3 M1-R sub-phase 3-R3 to complete the Component Parity Matrix in [`specs/ui-ux/design-tokens.md`](../ui-ux/design-tokens.md). All three consume only generated tokens — no hand-set hex values, font sizes, or shadows.

### NBModal

**Location:** `apps/mobile/src/components/nb/NBModal.tsx`
**Library backbone:** `@gorhom/bottom-sheet` (sheet variant) + React Native `<Modal>` (fullscreen variant).
**Cross-link:** [Neo Brutalism Modal Guidelines](./neo-brutalism-modal-guidelines.md) — drives sheet vs. fullscreen decision matrix.

```tsx
<NBModal
  type="sheet" | "fullscreen"   // default "sheet"
  visible={boolean}
  onClose={() => void}
  title?: string                 // optional NB title bar (rendered as-is, with close/back icon)
  footer?: React.ReactNode       // sticky footer (action buttons); body scrolls beneath it
  noPadding?: boolean            // edge-to-edge body (maps, option lists)
  avoidKeyboard?: boolean        // keep footer/inputs above the keyboard
  headerRight?: React.ReactNode  // fullscreen only — slot right of the title
  scrollable?: boolean           // fullscreen only — wrap body in a ScrollView (sheets always scroll)
>
  {children}
</NBModal>
```

**Sizing (sheet):** a single auto behavior — the sheet **hugs its content** (small content → small sheet) via gorhom `enableDynamicSizing`, and **grows up to `screenHeight − top safe-area inset`** (above the app header, status bar still visible). Once content exceeds that cap the **body scrolls** while the **title and footer stay fixed**. There is no `size`/`snapPoints`/`autoSize` knob — sizing is automatic and consistent across every sheet. (Removed in the Phase 4 modal-consistency pass.)

**Variants:**
- **`type="sheet"`** — bottom sheet (filter sheets, Ringkasan Hari Ini summaries, sort/option pickers, partial-complete + convert-to-task forms, detail drawers, change-password). Built on gorhom **`BottomSheetModal`** (portaled), so it floats **above everything including the navigation header** — requires `<BottomSheetModalProvider>` near the app root (mounted in `App.tsx` inside `GestureHandlerRootView`). Title is a fixed top overlay; footer uses gorhom `BottomSheetFooter` (sticky, keyboard-aware). Hard-edge top border (2 px), shadow `lg`, gray grabber. A standard `md` (16 px) gap separates the content from both the fixed title bar (top) and the sticky footer (bottom). The footer's reserved space includes the safe-area bottom inset from first open (estimated up-front, then corrected via `onLayout`) so the last content row is never clipped behind the footer on the initial open.
- **`type="fullscreen"`** — RN `<Modal>` with NB chrome for full-viewport content: map pin-pickers, availability calendar, monitoring filter. Use `scrollable` for long forms; leave it off when the body must fill the viewport (maps/calendars).

**Dismissal:** all paths dismiss to `onClose` — close (X) / back icon, swipe-down (`enablePanDownToClose`), backdrop tap, action buttons (consumer calls `onClose`), **Android hardware back**, and **navigating away** (sheet closes on unmount).

**States:** open / closed; gorhom spring animation on the sheet; fullscreen uses `animationType="fade"`.
**Accessibility:** close button `accessibilityLabel="Tutup"`; fullscreen back button `accessibilityLabel="Kembali"`; backdrop tap closes.

### NBToast

**Location:** `apps/mobile/src/components/nb/NBToast.tsx`
**Library backbone:** `react-native-toast-message` configured with NB chrome.

```tsx
NBToast.show({
  level: 'info' | 'success' | 'warning' | 'danger',
  icon?: LucideIcon,        // default: per-level icon (info/check-circle/alert-triangle/x-circle)
  title: string,            // UPPERCASE auto-applied
  body?: string,
  durationMs?: number,      // default 4000
  action?: { label: string, onPress: () => void },  // optional CTA
});
```

**Variants by level:**
- `info` — `bg.accent.mint`, `info` icon
- `success` — `bg.accent.green`, `check-circle` icon
- `warning` — `bg.accent.yellow`, `alert-triangle` icon
- `danger` — `danger.light` background, `x-circle` icon

**Chrome:** 2 px `border.color`, hard-edge `shadow.md`, uppercase title (Space Grotesk 700, `caption` size), body `body-sm`, Lucide icon paired (WCAG color-blind rule). **Position:** bottom (mobile convention).
**Accessibility:** `accessibilityLiveRegion="polite"` (Android) + `AccessibilityInfo.announceForAccessibility` (iOS) on show. `action` button is keyboard-focusable.

### NBText

**Location:** `apps/mobile/src/components/nb/NBText.tsx`
**Purpose:** Replaces every hand-set `fontSize`/`fontWeight`/`lineHeight`/`fontFamily` literal in the mobile codebase with a semantic variant prop. Reads font + size + weight + line-height from generated `type.*` tokens.

```tsx
<NBText
  variant="display-xl" | "display" | "h1" | "h2" | "h3" | "body-lg" | "body" | "body-sm" | "caption" | "mono-sm"
  color?: keyof typeof nbColors  // default 'neutral.black'
  align?: 'left' | 'center' | 'right'   // default 'left'
  numberOfLines?: number
  uppercase?: boolean             // forces uppercase (e.g. badge-style usage of 'caption')
  style?: TextStyle               // escape hatch for one-off overrides — use sparingly
>
  {children}
</NBText>
```

**Variant → token mapping** (all values from generated `type.*`, never hand-edited):

| Variant | Family | Weight | Size / line-height |
|---------|--------|--------|--------------------|
| `display-xl` | display (Space Grotesk) | 800 | 56 / 1.0 |
| `display` | display | 700 | 40 / 1.05 |
| `h1` | display | 700 | 28 / 1.2 |
| `h2` | display | 600 | 22 / 1.3 |
| `h3` | display | 600 | 18 / 1.35 |
| `body-lg` | body (Inter) | 500 | 18 / 1.55 |
| `body` | body | 400 | 16 / 1.5 |
| `body-sm` | body | 400 | 14 / 1.45 |
| `caption` | body | 500 | 12 / 1.4 |
| `mono-sm` | mono (JetBrains Mono) | 500 | 12 / 1.4 |

**Adoption:** every screen swept in 3-R5 replaces inline typography styles with `<NBText variant="...">`. Lint rule `prefer-nb-text` (added in 3-R1) flags raw `<Text style={{ fontSize: ... }}>` usage outside `NBText.tsx` itself.
**Accessibility:** inherits RN `<Text>` accessibility props; `numberOfLines` honors RN truncation; high-contrast mode handled by tokens (no hard-coded colors).

### Adoption tracker

| Component | Sub-phase | Status |
|-----------|-----------|--------|
| `NBModal` | 3-R3 | ✅ Shipped — 46 files import it (verified 2026-06-11) |
| `NBToast` | 3-R3 | ✅ Shipped — 26 files import it (verified 2026-06-11) |
| `NBText` | 3-R3 (then propagated by 3-R5 sweep) | ✅ Shipped — 164 files import it (verified 2026-06-11) |
```

---

## Reuse audit — June 11, 2026 (UAT-readiness refactor, Phase 5b)

Full-codebase audit of primitive usage and cross-screen duplication. No orphaned
NB primitives found (every primitive has ≥2 importers).

### Consolidated in Phase 5b

| Item | New home | Migrated call sites |
|------|----------|---------------------|
| Photo grid/gallery sections (3 near-identical copies) | `src/components/common/PhotoGridSection.tsx` | pruningRequests `PhotosSection`, overtime `OvertimePhotosSection` + `OvertimeSelfiePhotosSection` (kept as thin wrappers) |
| Label-above-value detail rows (~78 hand-rolled instances) | `src/components/common/DetailRow.tsx` | pruningRequests + overtime detail cards |
| Draft persistence (24h TTL + 30s auto-save, 2 copies) | `src/hooks/useDraftPersistence.ts` (generic, 17 unit tests) | taskActivity draft hook (thin adapter, API unchanged). pruningRequests variant kept its own impl (external formRef injection pattern) — candidate for a follow-up adapter |
| GPS display formatting (2 divergent copies) | `src/utils/gpsFormat.ts` | pruningRequests `useGpsFormatting`, overtime `OvertimeGpsCard` |
| Task status/priority label+variant maps (drift between `utils/statusHelpers.ts` and field `taskHelpers.ts`) | `src/utils/statusHelpers.ts` stays canonical | field hooks/components re-import (fixes pending→warning drift) |

### Deferred to post-UAT (behavior- or visual-affecting; do not ship blind pre-UAT)

| Item | Size | Why deferred |
|------|------|--------------|
| Raw `TouchableOpacity`-as-button → `NBButton` | ~188 instances | Many are intentional custom taps (photo thumbnails, map markers); needs per-site judgement + visual QA |
| `Alert.alert` → `NBToast`/`NBAlert` | 15 files | Several are *confirmation dialogs* — replacing with toast removes the confirm step (behavior change) |
| Inline `textTransform`/`letterSpacing` → `NBText` variants | ~78 instances | Font-family/metric changes are visible; belongs in a dedicated typography sweep with visual regression |
| `WeekPickerModal` raw `<Modal>` → `NBModal` fullscreen | 1 file | Verify fullscreen presentation semantics with design first |
