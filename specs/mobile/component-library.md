# Mobile Component Library

**Last Updated:** February 5, 2026
**Version:** Neo Brutalism 2.0
**Location:** `fe/mobile/src/components/nb/`

This document provides the complete component library reference for the SEKAR mobile application.

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

1. **Neo Brutalism 2.0** - Soft-edge shadows, 2px borders, 6px radius
2. **Accessibility First** - WCAG 2.1 AA compliant, 48px touch targets
3. **Indonesian Localization** - Default labels in Indonesian
4. **Haptic Feedback** - Tactile response on interactions
5. **Reduce Motion** - Respects system accessibility settings

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
```
