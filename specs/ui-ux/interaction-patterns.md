# Interaction Patterns

**Version:** 2.0.0 (Modern Neo Brutalism)

Animation, gesture, and feedback specifications for SEKAR applications, updated for Neo Brutalism 2.0.

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

### Duration Scale (Neo Brutalism 2.0)

Updated for snappier, more responsive feel.

| Name | Duration | Usage |
|------|----------|-------|
| `instant` | 80ms | Micro-feedback, badges, icons |
| `fast` | 150ms | Button press, hover states |
| `normal` | 250ms | State transitions, modals |
| `slow` | 400ms | Page transitions, complex animations |

```typescript
const animationDurations = {
  instant: 80,   // Snappier micro-feedback
  fast: 150,     // Button states
  normal: 250,   // Modals, transitions
  slow: 400,     // Page transitions
};
```

### Easing Functions

Updated with bounce easing from [Neo-brutalism-CSS](https://github.com/Walikuperek/Neo-brutalism-CSS).

| Name | Function | Usage |
|------|----------|-------|
| `easeOut` | cubic-bezier(0.0, 0, 0.2, 1) | Elements entering |
| `easeIn` | cubic-bezier(0.4, 0, 1, 1) | Elements exiting |
| `easeInOut` | cubic-bezier(0.4, 0, 0.2, 1) | Moving elements |
| `bounce` | cubic-bezier(0.68, -0.55, 0.265, 1.55) | Playful bounce effects |
| `spring` | damping: 15, stiffness: 150 | Spring physics |

```typescript
import { Easing } from 'react-native-reanimated';

const easings = {
  easeOut: Easing.out(Easing.cubic),
  easeIn: Easing.in(Easing.cubic),
  easeInOut: Easing.inOut(Easing.cubic),
  bounce: Easing.bezier(0.68, -0.55, 0.265, 1.55),  // Playful overshoot
};
```

### Shadow Interaction Pattern (neobrutalism.dev)

The `boxShadowX/boxShadowY` pattern from [neobrutalism.dev](https://www.neobrutalism.dev/):

```typescript
const interactionValues = {
  boxShadowX: 4,          // Horizontal shadow offset
  boxShadowY: 4,          // Vertical shadow offset
  hoverTranslateX: -2,    // Move left on hover (half of shadow)
  hoverTranslateY: -2,    // Move up on hover
  pressTranslateX: 2,     // Move right on press
  pressTranslateY: 2,     // Move down on press
  pressScale: 0.98,       // Optional slight shrink
};
```

**CSS Implementation:**
```css
.nb-interactive {
  box-shadow: var(--shadow-md);
  transition: all 150ms ease-out;
}

.nb-interactive:hover {
  box-shadow: var(--shadow-hover);
  transform: translate(-2px, -2px);
}

.nb-interactive:active {
  box-shadow: var(--shadow-active);
  transform: translate(2px, 2px);
}
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

---

## Background Pattern Guidelines

When using background patterns (grid, dots, diagonal), follow these guidelines:

### Usage Locations

| Location | Pattern | Opacity |
|----------|---------|---------|
| Dashboard background | Grid | 3% |
| Login screen | Dots | 3-4% |
| Empty states | Dots | 3% |
| Hero sections | Diagonal | 2-3% |
| Cards/Modals | None | - |

### Pattern Animation

Patterns should remain static. Do not animate pattern backgrounds as it:
- Increases cognitive load
- Reduces battery life on mobile
- Can cause motion discomfort

### Reduced Motion

When `prefers-reduced-motion` is enabled, patterns should remain visible (they are static and not problematic).

---

**Document Owner:** UI/UX Designer
**Last Updated:** 2026-02-05
**Status:** Active - Updated for Neo Brutalism 2.0
**Animation Library:** `react-native-reanimated`, `expo-haptics`
**Related:** [neo-brutalism.md](./neo-brutalism.md) - Primary design system reference

---

## Phase 2D: Map & Timeline Interaction Patterns

### Map Marker Interactions

| Interaction | Mobile | Web | Result |
|-------------|--------|-----|--------|
| Tap/Click marker | onPress | onClick | Select user, show popup/tooltip |
| Long press marker | onLongPress | — | Quick actions menu (WhatsApp, Call) |
| Tap selected marker | onPress | onClick | Open UserDetailSheet / UserDetailPanel |
| Tap map background | onPress | onClick | Deselect user, close popups |
| Pinch zoom | Native gesture | Mouse wheel / buttons | Zoom map, toggle name labels at zoom >= 14 |
| Pan map | Native gesture | Mouse drag | Move map view |
| Tap cluster | onPress | onClick | Zoom to cluster bounds |

### Bottom Sheet Navigation (Mobile)

```
Collapsed (0%) → Half (50%) → Expanded (85%)
  ↕ drag handle    ↕ scroll content    ↕ pull down
```

| State | Height | Content Visible | Map Interaction |
|-------|--------|----------------|-----------------|
| Collapsed | 0% | Nothing (closed) | Full |
| Half | 50% | Header, shift info, actions | Partial (top half) |
| Expanded | 85% | Full detail + activities/tasks | Minimal (map visible but not interactive) |

### Location Timeline Interactions

| Interaction | Action |
|-------------|--------|
| Click timeline point | Animate map to that coordinate, show accuracy circle |
| Scroll timeline | Auto-scroll synchronized with map viewport (optional) |
| Click "clock-in" event | Highlight start location on map |
| Click "area-exit" event | Show boundary crossing point with direction arrow |
| Click "area-enter" event | Show re-entry point |

### Filter Modal (Mobile)

| Interaction | Behavior |
|-------------|----------|
| Tap status chip | Toggle filter (multi-select), update map markers immediately |
| Select rayon | Cascade: populate area dropdown with rayon's areas |
| Select area | Cascade: update map bounds to area, update user list |
| Type in search | Debounced 300ms, filter user list by name |
| Tap "Reset" | Clear all filters, restore default view |
| Tap "Apply" | Close modal, apply filters to map + list |

### Side Panel Push Navigation (Web)

```
UserList → [click user] → UserDetailPanel (slide left 200ms)
UserDetailPanel → [click "History"] → LocationTimeline (slide left 200ms)
LocationTimeline → [click "Back"] → UserDetailPanel (slide right 200ms)
UserDetailPanel → [click "Back"] → UserList (slide right 200ms)
```

**Transition:** `transform: translateX()` with `ease-out` 200ms

---

## Monitoring Interaction Patterns

### Map Gesture Patterns

| Gesture | Action | Platform |
|---------|--------|----------|
| Single tap on marker | Open user popup/detail | Both |
| Single tap on empty map | Close popup, deselect user | Both |
| Pinch zoom | Map zoom in/out | Mobile |
| Double tap | Zoom in one level | Both |
| Two-finger tap | Zoom out one level | Mobile |
| Long press on marker | Open quick action menu (call/WhatsApp) | Mobile |
| Scroll wheel | Map zoom | Web |
| Click + drag | Map pan | Web |
| Hover on marker | Show name tooltip (200ms delay) | Web |
| Right-click on marker | Context menu (view detail, reassign, contact) | Web |

### WebSocket-Driven Animations

| Event | Animation | Duration | Notes |
|-------|-----------|----------|-------|
| Position update | Marker slides to new position | 500ms ease | Smooth interpolation between coordinates |
| Status change | Color cross-fade + brief scale pulse | 300ms + 200ms | Old color → new color with 1.2x scale bump |
| Boundary exit | Area polygon flashes orange border | 800ms | 3 quick flashes, then settles |
| Boundary enter | Area polygon briefly glows green | 500ms | Single fade-in/fade-out |
| New user online | Marker appears with scale-up | 200ms ease-out | From 0 to 1 scale |
| User goes offline | Marker fades out + shrinks | 300ms ease-in | From 1 to 0 opacity + scale |

### Status Transition Animations

| Element | Animation | Duration | Trigger |
|---------|-----------|----------|---------|
| Status chip count | Number rolls up/down | 250ms | Status count changes |
| Staffing progress bar | Width fills/shrinks | 400ms ease | Active count changes |
| Missing pulse ring | Expanding ring from marker | 2000ms loop | Status = MISSING |
| Side panel badge | Brief bounce | 200ms | New user appears in filtered list |

### Bottom Sheet Gestures (Mobile)

| Gesture | Action | Threshold |
|---------|--------|-----------|
| Swipe up | Expand to full height | Velocity > 0.5 or distance > 30% |
| Swipe down | Collapse to peek height | Velocity > 0.5 or distance > 30% |
| Swipe down from peek | Dismiss sheet | Distance > 50% |
| Tap on handle | Toggle between peek/expanded | — |
| Scroll content at top + swipe down | Collapse sheet | Content scrollTop === 0 |

**Snap points:** peek (30% height), half (50%), full (90%)
**Background dim:** 0.3 opacity black overlay, tap to dismiss
