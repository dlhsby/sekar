# Interaction Patterns

Animation, gesture, and feedback specifications for SEKAR applications.

## Touch Gestures (Mobile)

### Supported Gestures

| Gesture | Action | Usage |
|---------|--------|-------|
| **Tap** | Primary interaction | Buttons, list items, links |
| **Long Press** | Context menu | Future feature (not in MVP) |
| **Pull Down** | Refresh data | Lists, main screens |
| **Scroll** | Navigate content | All scrollable areas |
| **Swipe** | Not used in MVP | Avoid confusion |

### Gesture Specifications

```typescript
// Tap - minimum press duration
const TAP_MIN_DURATION = 0;  // Immediate response
const TAP_MAX_DURATION = 500; // Before becoming long press

// Long Press (future)
const LONG_PRESS_DURATION = 500; // ms

// Pull to Refresh
const PULL_THRESHOLD = 80; // px before triggering refresh
const PULL_RESISTANCE = 2.5; // dampening factor
```

---

## Animation System

### Duration Scale

| Name | Duration | Usage |
|------|----------|-------|
| `instant` | 100ms | Micro-feedback, icon changes |
| `fast` | 200ms | Button states, small transitions |
| `normal` | 300ms | Screen transitions, modals |
| `slow` | 500ms | Complex animations, celebrations |

```typescript
const animationDurations = {
  instant: 100,
  fast: 200,
  normal: 300,
  slow: 500,
};
```

### Easing Functions

| Name | Function | Usage |
|------|----------|-------|
| `easeOut` | cubic-bezier(0.0, 0, 0.2, 1) | Entering elements |
| `easeIn` | cubic-bezier(0.4, 0, 1, 1) | Exiting elements |
| `easeInOut` | cubic-bezier(0.4, 0, 0.2, 1) | Moving elements |
| `spring` | damping: 15, stiffness: 150 | Bouncy effects |

```typescript
import { Easing } from 'react-native-reanimated';

const easings = {
  easeOut: Easing.out(Easing.cubic),
  easeIn: Easing.in(Easing.cubic),
  easeInOut: Easing.inOut(Easing.cubic),
};
```

---

## Screen Transitions

### Navigation Transitions

| Transition | Type | Duration | Usage |
|------------|------|----------|-------|
| Push | Slide from right | 300ms | Navigate forward |
| Pop | Slide to right | 300ms | Navigate back |
| Modal | Slide from bottom | 300ms | Full-screen modals |
| Fade | Opacity | 200ms | Tab changes |

```typescript
// React Navigation config
const screenOptions = {
  animation: 'slide_from_right',
  animationDuration: 300,
};

// Modal presentation
const modalOptions = {
  presentation: 'modal',
  animation: 'slide_from_bottom',
};
```

### Tab Transitions

```typescript
// Bottom tab animation
const tabBarOptions = {
  tabBarHideOnKeyboard: true,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textSecondary,
  // No animation between tabs (instant switch)
};
```

---

## Component Animations

### Button Press

```typescript
// Scale down on press
const buttonPressAnimation = {
  pressed: {
    scale: 0.96,
    opacity: 0.9,
  },
  duration: 100, // instant
  easing: 'easeOut',
};

// Implementation with Reanimated
const animatedScale = useSharedValue(1);

const pressInHandler = () => {
  animatedScale.value = withTiming(0.96, {
    duration: 100,
    easing: Easing.out(Easing.ease),
  });
};

const pressOutHandler = () => {
  animatedScale.value = withTiming(1, {
    duration: 100,
    easing: Easing.out(Easing.ease),
  });
};
```

### Card Press

```typescript
// Subtle press feedback for interactive cards
const cardPressAnimation = {
  pressed: {
    opacity: 0.7,
    // or backgroundColor with overlay
  },
  duration: 100,
};
```

### Loading Spinner

```typescript
// Continuous rotation
const spinnerAnimation = {
  rotate: '360deg',
  duration: 1000,
  iterations: Infinity,
  easing: 'linear',
};
```

### Pull to Refresh

```typescript
// Pull feedback with resistance
const pullToRefreshConfig = {
  progressViewOffset: 50,
  refreshing: isRefreshing,
  onRefresh: handleRefresh,
  colors: [colors.primary], // Android
  tintColor: colors.primary, // iOS
};
```

---

## Feedback Patterns

### Success Feedback

| Channel | Response | Duration |
|---------|----------|----------|
| Visual | Green checkmark animation | 500ms |
| Haptic | Light vibration | instant |
| Text | "Berhasil disimpan" toast | 3s |

```typescript
// Success animation sequence
const successFeedback = async () => {
  // 1. Haptic feedback
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

  // 2. Show success animation
  setShowSuccess(true);

  // 3. Show toast
  Toast.show({
    type: 'success',
    text1: 'Berhasil',
    text2: 'Laporan berhasil dikirim',
    visibilityTime: 3000,
  });
};
```

### Error Feedback

| Channel | Response | Duration |
|---------|----------|----------|
| Visual | Red shake animation | 300ms |
| Visual | Input border turns red | persistent |
| Haptic | Error vibration pattern | instant |
| Text | Specific error message | until fixed |

```typescript
// Error shake animation
const shakeAnimation = {
  keyframes: [
    { translateX: 0 },
    { translateX: -10 },
    { translateX: 10 },
    { translateX: -10 },
    { translateX: 10 },
    { translateX: 0 },
  ],
  duration: 300,
  easing: 'easeInOut',
};

// Implementation
const shake = useSharedValue(0);

const triggerShake = () => {
  shake.value = withSequence(
    withTiming(-10, { duration: 50 }),
    withTiming(10, { duration: 50 }),
    withTiming(-10, { duration: 50 }),
    withTiming(10, { duration: 50 }),
    withTiming(0, { duration: 50 }),
  );
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
};
```

### Loading Feedback

| State | Visual | Text |
|-------|--------|------|
| Loading | Spinner replaces button text | "Memuat..." |
| Submitting | Spinner + disabled button | "Mengirim..." |
| Syncing | Small indicator in header | "Menyinkronkan..." |

```typescript
// Button loading state
<Button loading={isSubmitting}>
  {isSubmitting ? 'Mengirim...' : 'Kirim Laporan'}
</Button>
```

---

## Sync Status Feedback

### Status Indicators

| State | Icon | Color | Animation | Text |
|-------|------|-------|-----------|------|
| Synced | `check-circle` | `success` | None | Tersinkronisasi |
| Pending | `clock-outline` | `warning` | None | Menunggu sinkronisasi |
| Syncing | `sync` | `warning` | Rotate | Menyinkronkan... |
| Failed | `alert-circle` | `error` | None | Gagal - Coba lagi |
| Offline | `cloud-off-outline` | `gray500` | None | Offline |

### Sync Animation

```typescript
// Rotating sync icon
const SyncingIcon = () => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1000, easing: Easing.linear }),
      -1, // infinite
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <MaterialCommunityIcons name="sync" size={20} color={colors.warning} />
    </Animated.View>
  );
};
```

---

## Haptic Feedback

### Haptic Types

| Type | Usage | Implementation |
|------|-------|----------------|
| Light | Button tap | `Haptics.impactAsync(Light)` |
| Medium | Important action | `Haptics.impactAsync(Medium)` |
| Success | Action completed | `Haptics.notificationAsync(Success)` |
| Warning | Attention needed | `Haptics.notificationAsync(Warning)` |
| Error | Action failed | `Haptics.notificationAsync(Error)` |
| Selection | Tab/option change | `Haptics.selectionAsync()` |

```typescript
import * as Haptics from 'expo-haptics';

// Button press
const handlePress = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  // ... action
};

// Success
const handleSuccess = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

// Tab selection
const handleTabChange = () => {
  Haptics.selectionAsync();
};
```

---

## Microinteractions

### Checkbox Toggle

```typescript
const checkboxAnimation = {
  unchecked: {
    scale: 1,
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  checked: {
    scale: [1, 1.2, 1], // bounce
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    // checkmark draws in
  },
  duration: 200,
};
```

### Switch Toggle

```typescript
const switchAnimation = {
  thumb: {
    translateX: [0, 20], // slide
  },
  track: {
    backgroundColor: [colors.gray300, colors.primary],
  },
  duration: 200,
  easing: 'easeInOut',
};
```

### Input Focus

```typescript
const inputFocusAnimation = {
  focused: {
    borderColor: colors.primary,
    borderWidth: 2,
    // label floats up if using floating label
  },
  duration: 150,
};
```

---

## Accessibility Motion

### Reduced Motion Support

```typescript
import { AccessibilityInfo } from 'react-native';

const [reduceMotion, setReduceMotion] = useState(false);

useEffect(() => {
  AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);

  const subscription = AccessibilityInfo.addEventListener(
    'reduceMotionChanged',
    setReduceMotion,
  );

  return () => subscription.remove();
}, []);

// Conditionally apply animations
const duration = reduceMotion ? 0 : 300;
```

### Guidelines

- Respect system "Reduce Motion" preference
- Provide instant alternatives for all animations
- Never use animation for critical information
- Avoid flashing or strobing effects

---

## Performance Guidelines

### Animation Performance

- Use `react-native-reanimated` for smooth 60fps animations
- Run animations on UI thread with `useAnimatedStyle`
- Avoid animating layout properties (use transform instead)
- Use `useNativeDriver: true` when possible

```typescript
// ✅ Good - uses transform
animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
  opacity: opacity.value,
}));

// ❌ Bad - animates layout
animatedStyle = useAnimatedStyle(() => ({
  width: width.value,
  height: height.value,
}));
```

---

**Document Owner:** UI/UX Designer
**Last Updated:** 2026-01-16
**Status:** Active
**Animation Library:** `react-native-reanimated`, `expo-haptics`
