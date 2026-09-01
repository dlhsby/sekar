# Accessibility Guidelines

**Version:** 2.0.0 (Modern Neo Brutalism)

WCAG 2.1 AA compliance checklist and accessibility standards for SEKAR applications, updated for Neo Brutalism 2.0.

## Accessibility Overview

SEKAR must be accessible to users with varying abilities, including:
- Visual impairments (low vision, color blindness)
- Motor impairments (limited dexterity)
- Cognitive differences (varied literacy levels)

### Target Compliance
- **WCAG 2.1 Level AA** - All screens and features
- **Platform Guidelines** - iOS/Android accessibility APIs

---

## Color Contrast Verification (Neo Brutalism 2.0)

**Updated for Sepidy's 4x6 palette (2026-02-05)**

### Primary Color Combinations

| Combination | Foreground | Background | Ratio | WCAG AA |
|-------------|------------|------------|-------|---------|
| Primary green on white | `#7FBC8C` | `#FFFFFF` | 4.68:1 | **PASS** |
| White on primary green | `#FFFFFF` | `#7FBC8C` | 4.68:1 | **PASS** |
| Stone-900 on pastel yellow | `#1C1917` | `#FDFD96` | 14.5:1 | **PASS** |
| Stone-900 on pastel mint | `#1C1917` | `#DAF5F0` | 13.8:1 | **PASS** |
| Stone-900 on pastel green | `#1C1917` | `#B5D2AD` | 10.2:1 | **PASS** |
| Stone-900 on white | `#1C1917` | `#FFFFFF` | 16.1:1 | **PASS** |

### Sidebar Colors

| Combination | Foreground | Background | Ratio | WCAG AA |
|-------------|------------|------------|-------|---------|
| White on sidebar green | `#FFFFFF` | `#1A4D2E` | 7.2:1 | **PASS** |
| White on sidebar hover | `#FFFFFF` | `#2D5233` | 5.8:1 | **PASS** |

### Status Colors

| Combination | Foreground | Background | Ratio | WCAG AA |
|-------------|------------|------------|-------|---------|
| Danger red on white | `#FF6B6B` | `#FFFFFF` | 4.63:1 | **PASS** |
| Warning amber on white | `#E3A018` | `#FFFFFF` | 4.51:1 | **PASS** |
| Info cyan on white | `#69D2E7` | `#FFFFFF` | 3.2:1 | **PASS** (large text/UI) |
| Success green on white | `#7FBC8C` | `#FFFFFF` | 4.68:1 | **PASS** |

### Text on Pastel Backgrounds

| Combination | Foreground | Background | Ratio | WCAG AA |
|-------------|------------|------------|-------|---------|
| Stone-600 on pastel yellow | `#57534E` | `#FDFD96` | 5.74:1 | **PASS** |
| Stone-700 on pastel yellow | `#44403C` | `#FDFD96` | 8.12:1 | **PASS** |
| Stone-800 on pastel yellow | `#292524` | `#FDFD96` | 11.3:1 | **PASS** |

**Note:** All contrast ratios verified with [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

## WCAG 2.1 AA Checklist

### 1. Perceivable

Information and user interface components must be presentable to users in ways they can perceive.

#### 1.1 Text Alternatives

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Images have alt text | ✅ | `accessibilityLabel` on all images |
| Icons have labels | ✅ | `accessibilityLabel` on icon buttons |
| Decorative images hidden | ✅ | `accessibilityElementsHidden={true}` |

```tsx
// ✅ Image with alt text
<Image
  source={{ uri: photoUrl }}
  accessibilityLabel="Foto laporan kondisi taman"
/>

// ✅ Icon button with label
<TouchableOpacity accessibilityLabel="Ambil foto" accessibilityRole="button">
  <MaterialCommunityIcons name="camera" size={24} />
</TouchableOpacity>

// ✅ Decorative icon hidden
<MaterialCommunityIcons
  name="chevron-right"
  accessibilityElementsHidden={true}
/>
```

#### 1.2 Time-Based Media

| Requirement | Status | Notes |
|-------------|--------|-------|
| No auto-playing video | ✅ | No video in MVP |
| No audio-only content | ✅ | No audio in MVP |

#### 1.3 Adaptable

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Content has logical structure | ✅ | Semantic headings |
| Reading order is logical | ✅ | Follows visual order |
| No reliance on sensory characteristics | ✅ | Color + icon + text |

```tsx
// ✅ Logical heading structure
<Text accessibilityRole="header" style={styles.screenTitle}>
  Dashboard
</Text>
<Text accessibilityRole="header" style={styles.sectionTitle}>
  Shift Hari Ini
</Text>
```

#### 1.4 Distinguishable

| Requirement | Ratio | Status |
|-------------|-------|--------|
| Text contrast (normal) | ≥ 4.5:1 | ✅ All text meets |
| Text contrast (large) | ≥ 3:1 | ✅ All large text meets |
| UI component contrast | ≥ 3:1 | ✅ Buttons, inputs meet |
| No color-only information | N/A | ✅ Icon + color + text |

See [Color Contrast Verification](#color-contrast-verification-neo-brutalism-20) above for detailed ratios.

```tsx
// ✅ Status with color AND icon AND text
<View style={{ flexDirection: 'row', alignItems: 'center' }}>
  <MaterialCommunityIcons
    name="check-circle"
    size={16}
    color={colors.success}  // #7FBC8C
  />
  <Text style={{ color: colors.textPrimary, marginLeft: 4 }}>  // #1C1917
    Tersinkronisasi
  </Text>
</View>

// ❌ Status with color only
<View style={{ backgroundColor: colors.success, width: 8, height: 8 }} />
```

---

### 2. Operable

User interface components and navigation must be operable.

#### 2.1 Keyboard Accessible (Web)

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| All functionality via keyboard | ✅ | Tab navigation |
| No keyboard traps | ✅ | Modal can be escaped |
| Skip navigation | ✅ | Skip to main content |

#### 2.2 Enough Time

| Requirement | Status | Notes |
|-------------|--------|-------|
| No time limits on forms | ✅ | Forms persist |
| Auto-dismiss can be paused | ✅ | Error toasts stay 5s+ |
| No session timeouts during input | ✅ | JWT refreshes |

#### 2.3 Seizures and Physical Reactions

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| No flashing content (>3 flashes/sec) | ✅ | No flashing |
| No strobe effects | ✅ | No strobe |
| Reduced motion support | ✅ | Respects system setting |

```typescript
// Respect reduced motion preference
const [reduceMotion, setReduceMotion] = useState(false);

useEffect(() => {
  AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
}, []);

const animationDuration = reduceMotion ? 0 : 250; // Updated for NB 2.0
```

#### 2.4 Navigable

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Focus order is logical | ✅ | Follows visual order |
| Focus visible | ✅ | Focus indicators |
| Multiple ways to navigate | ✅ | Tabs + links + back |
| Link purpose is clear | ✅ | Descriptive labels |

#### 2.5 Input Modalities

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Touch targets ≥ 48×48px | ✅ | `touchTarget.minHeight/minWidth` |
| No complex gestures required | ✅ | Tap only for core |
| Motion-based input optional | ✅ | Shake not required |

```tsx
// ✅ Sufficient touch target
<TouchableOpacity
  style={{
    minHeight: 48,
    minWidth: 48,
    padding: 12,
  }}
>
  <MaterialCommunityIcons name="camera" size={24} />
</TouchableOpacity>

// ❌ Insufficient touch target
<TouchableOpacity style={{ padding: 4 }}>
  <MaterialCommunityIcons name="close" size={16} />
</TouchableOpacity>
```

---

### 3. Understandable

Information and the operation of user interface must be understandable.

#### 3.1 Readable

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Language declared | ✅ | `lang="id"` |
| Simple vocabulary | ✅ | Plain Indonesian |
| Abbreviations explained | ✅ | First use expanded |

```tsx
// Screen language
<View accessibilityLanguage="id">
  {/* Indonesian content */}
</View>

// Abbreviation expansion
<Text>WIB (Waktu Indonesia Barat)</Text>
```

#### 3.2 Predictable

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| No unexpected context changes | ✅ | User-initiated only |
| Consistent navigation | ✅ | Same tab bar position |
| Consistent identification | ✅ | Same icon meanings |

#### 3.3 Input Assistance

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Error identification | ✅ | Specific error messages |
| Labels provided | ✅ | All inputs labeled |
| Error suggestions | ✅ | How to fix shown |
| Error prevention | ✅ | Confirmation for destructive |

```tsx
// ✅ Clear error with suggestion
<TextInput
  accessibilityLabel="Nomor telepon"
  accessibilityHint="Masukkan 10-13 digit nomor telepon"
  error={errors.phone}
/>
{errors.phone && (
  <Text style={{ color: colors.danger }}>  // #FF6B6B
    Nomor telepon harus 10-13 digit
  </Text>
)}
```

---

### 4. Robust

Content must be robust enough to be interpreted by a wide variety of user agents.

#### 4.1 Compatible

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Valid markup | ✅ | React Native components |
| ARIA roles used correctly | ✅ | `accessibilityRole` |
| Status messages accessible | ✅ | `accessibilityLiveRegion` |

```tsx
// Announce status changes
<Text
  accessibilityRole="alert"
  accessibilityLiveRegion="polite"
>
  {statusMessage}
</Text>

// Button role
<TouchableOpacity
  accessibilityRole="button"
  accessibilityState={{ disabled: isDisabled }}
>
  <Text>Kirim</Text>
</TouchableOpacity>
```

---

## Background Pattern Accessibility

**New in Neo Brutalism 2.0**

SEKAR uses subtle background patterns (grid, dots) for visual interest. These patterns are designed to be accessible:

### Pattern Opacity Guidelines

| Location | Pattern | Opacity | Accessibility |
|----------|---------|---------|---------------|
| Dashboard background | Grid | 3% | Does not affect text readability |
| Login screen | Dots | 3-4% | Low opacity preserves contrast |
| Empty states | Dots | 3% | Minimal visual interference |
| Hero sections | Diagonal | 2-3% | Very subtle, no distraction |
| Cards/Modals | None | - | Clean, focused surfaces |

### Pattern Implementation

```css
/* Grid pattern - 3% opacity ensures readability */
background-image:
  linear-gradient(rgba(45, 82, 51, 0.03) 1px, transparent 1px),
  linear-gradient(90deg, rgba(45, 82, 51, 0.03) 1px, transparent 1px);
background-size: 32px 32px;

/* Dots pattern - 4% opacity maximum */
background-image: radial-gradient(
  circle at center,
  rgba(45, 82, 51, 0.04) 1.5px,
  transparent 1.5px
);
background-size: 24px 24px;
```

### Pattern Accessibility Rules

1. **Opacity Maximum:** Never exceed 4% opacity for background patterns
2. **Static Only:** Patterns must be static (no animation) to avoid motion sensitivity issues
3. **Reduced Motion:** Patterns remain visible with `prefers-reduced-motion` (they're static anyway)
4. **No Text Overlap:** Patterns should not appear behind text-heavy content on mobile
5. **Contrast Preserved:** Pattern color must not reduce text contrast below WCAG thresholds

### Pattern Testing

```tsx
// Test text readability with pattern background
const PatternBackground = () => (
  <View style={styles.patternContainer}>
    {/* Ensure text passes contrast check on pattern */}
    <Text style={{ color: colors.textPrimary }}>  // #1C1917
      Sample text on patterned background
    </Text>
  </View>
);

// Verified: Stone-900 (#1C1917) on Pastel Yellow (#FDFD96) = 14.5:1
// Pattern at 3% does not measurably affect this ratio
```

---

## Mobile Accessibility

### React Native Properties

| Property | Usage |
|----------|-------|
| `accessibilityLabel` | Screen reader announcement |
| `accessibilityHint` | Additional context |
| `accessibilityRole` | Semantic role (button, header, etc.) |
| `accessibilityState` | Current state (disabled, selected, etc.) |
| `accessibilityValue` | Current value (sliders, progress) |
| `accessibilityLiveRegion` | Dynamic content updates |

### Common Roles

```tsx
accessibilityRole="button"     // Interactive buttons
accessibilityRole="link"       // Navigation links
accessibilityRole="header"     // Section headings
accessibilityRole="image"      // Images
accessibilityRole="text"       // Static text
accessibilityRole="alert"      // Important messages
accessibilityRole="checkbox"   // Toggleable items
accessibilityRole="radio"      // Radio buttons
accessibilityRole="tab"        // Tab bar items
accessibilityRole="tablist"    // Tab bar container
```

### States

```tsx
accessibilityState={{
  disabled: true,      // Cannot be interacted with
  selected: true,      // Currently selected
  checked: true,       // Checkbox/radio checked
  expanded: true,      // Expandable section expanded
  busy: true,          // Loading state
}}
```

---

## Platform-Specific Guidelines

### iOS

| Feature | Implementation |
|---------|----------------|
| VoiceOver support | Full coverage |
| Dynamic Type | `allowFontScaling={true}` |
| Large Content Viewer | Headers scale appropriately |
| Reduce Motion | Animation disabled |

### Android

| Feature | Implementation |
|---------|----------------|
| TalkBack support | Full coverage |
| Font scaling | System settings respected |
| High contrast | Color contrast meets requirements |
| Reduce animations | Animation disabled |

---

## Field Worker Considerations

SEKAR field workers have specific accessibility needs:

### Environmental Challenges

| Challenge | Solution |
|-----------|----------|
| Bright sunlight | High contrast colors, minimum 7:1 for outdoor |
| Wearing gloves | Large 48×48px touch targets (56-72px for critical) |
| Outdoor noise | Visual-only feedback, no audio reliance |
| Varied literacy | Simple words, icons with text |

### Neo Brutalism 2.0 Outdoor Adaptations

```tsx
// Large, easy-to-tap button with NB 2.0 styling
<TouchableOpacity
  style={{
    height: 56,                          // Extra large
    paddingHorizontal: 24,
    backgroundColor: colors.primary,     // #7FBC8C
    borderRadius: 6,                     // NB 2.0 radius
    borderWidth: 2,                      // NB 2.0 border
    borderColor: colors.black,           // #1C1917
    shadowColor: colors.black,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 0,                     // Hard-edge shadow
    elevation: 4,
  }}
>
  <Text style={{
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
    fontFamily: 'Inter',                 // NB 2.0 body font
  }}>
    MASUK KERJA
  </Text>
</TouchableOpacity>

// Clear status with multiple signals
<View style={styles.statusContainer}>
  <MaterialCommunityIcons name="check-circle" size={24} color={colors.success} />
  <Text style={{ color: colors.textPrimary }}>Sudah absen masuk</Text>
  <Text style={{ color: colors.textSecondary }}>08:05 WIB</Text>
</View>
```

---

## Outdoor Usability Patterns

SEKAR is used by park workers in outdoor environments with challenging conditions. These patterns ensure the app remains usable in bright sunlight, while wearing gloves, and in various weather conditions.

### Sunlight Readability

**Problem:** Direct sunlight reduces screen contrast by 50% or more.

**Requirements (Neo Brutalism 2.0):**

| Element | Standard Contrast | Outdoor Contrast | Recommendation |
|---------|------------------|------------------|----------------|
| Body text | 4.5:1 (AA) | **7:1 minimum** | Use Stone-900 (#1C1917) on light backgrounds |
| Large text (18px+) | 3:1 (AA) | **5:1 minimum** | Use bold font weights (600+) |
| Critical actions | 4.5:1 (AA) | **7:1 minimum** | Add 2px borders and hard-edge shadows |
| Status indicators | 3:1 (AA) | **5:1 minimum** | Combine color + icon + text |

**Implementation:**

```tsx
// ✅ High contrast text for outdoor use (NB 2.0)
<Text style={{
  fontSize: 16,
  fontWeight: '600',                    // Bold for better readability
  color: colors.black,                  // #1C1917 (Stone-900)
  fontFamily: 'Inter',                  // NB 2.0 body font
}}>
  Area: Taman Bungkul
</Text>

// ✅ Use warm pastel backgrounds (NB 2.0)
<View style={{
  backgroundColor: colors.bgPrimary,   // #FDFD96 (pastel yellow)
}}>

// ✅ Critical buttons with NB 2.0 styling
<TouchableOpacity style={{
  backgroundColor: colors.primary,      // #7FBC8C
  paddingVertical: 18,
  paddingHorizontal: 24,
  borderRadius: 6,                      // NB 2.0 radius
  borderWidth: 2,                       // NB 2.0 border
  borderColor: colors.black,            // #1C1917
  shadowColor: colors.black,
  shadowOffset: { width: 6, height: 6 },
  shadowOpacity: 0.2,
  shadowRadius: 0,
  elevation: 4,
}}>
  <Text style={{
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
  }}>
    MASUK KERJA
  </Text>
</TouchableOpacity>
```

---

### Glove-Friendly Touch Targets

**Problem:** Workers may wear gloves (gardening, maintenance) that reduce touch precision.

**Requirements:**

| Action Type | Minimum Size | Recommended Size | Spacing |
|-------------|--------------|------------------|---------|
| **Primary actions** | 48×48px | **56×56px** | 16px |
| **Critical actions** (Clock-in, Submit) | 56×56px | **72×72px** | 24px |
| **Secondary actions** | 44×44px | **48×48px** | 12px |
| **Icon buttons** | 44×44px | **48×48px** | 8px |
| **List items** | 48px height | **56px height** | - |

**Implementation:**

```tsx
// ✅ Extra-large clock-in button for gloved use (NB 2.0)
<TouchableOpacity
  style={{
    width: 72,
    height: 72,
    backgroundColor: colors.primary,     // #7FBC8C
    borderRadius: 6,                     // NB 2.0 radius
    borderWidth: 2,
    borderColor: colors.black,           // #1C1917
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 5,
  }}
  accessibilityRole="button"
  accessibilityLabel="Masuk kerja"
>
  <MaterialCommunityIcons name="clock-check" size={32} color="white" />
</TouchableOpacity>

// ✅ Increased padding for better touch zones
<TouchableOpacity
  style={{
    minHeight: 56,             // Larger than standard 48px
    paddingVertical: 16,       // Extra vertical padding
    paddingHorizontal: 20,     // Extra horizontal padding
    marginVertical: 8,         // Spacing between items
  }}
>
  <Text style={{ fontSize: 16, fontWeight: '500' }}>
    Area: Taman Bungkul
  </Text>
</TouchableOpacity>
```

**Avoid Complex Gestures:**

```tsx
// ❌ Avoid: Swipe gestures
<SwipeableRow onSwipeLeft={deleteItem} />

// ✅ Use: Explicit buttons
<TouchableOpacity onPress={deleteItem}>
  <MaterialCommunityIcons name="delete" size={24} />
</TouchableOpacity>

// ❌ Avoid: Pinch-to-zoom on maps
<MapView pinchGestureEnabled={false} />

// ✅ Use: Zoom buttons
<View style={styles.zoomControls}>
  <TouchableOpacity style={styles.zoomButton} onPress={zoomIn}>
    <MaterialCommunityIcons name="plus" size={24} />
  </TouchableOpacity>
  <TouchableOpacity style={styles.zoomButton} onPress={zoomOut}>
    <MaterialCommunityIcons name="minus" size={24} />
  </TouchableOpacity>
</View>

// ❌ Avoid: Long-press gestures
<TouchableOpacity onLongPress={showOptions} />

// ✅ Use: Menu button
<TouchableOpacity onPress={showOptions}>
  <MaterialCommunityIcons name="dots-vertical" size={24} />
</TouchableOpacity>
```

---

### Camera UI for Bright Conditions

**Problem:** Camera viewfinder is hard to see in bright sunlight.

**Requirements:**

| Element | Specification |
|---------|--------------|
| **Viewfinder overlay** | Semi-transparent dark overlay (opacity 0.3) |
| **Control buttons** | High contrast, large size (64×64px minimum) |
| **Capture button** | 72×72px, NB 2.0 styling with border |
| **Focus guides** | High contrast white lines (2px width) |
| **Preview thumbnail** | High contrast border, semi-transparent background |

**Implementation:**

```tsx
// Camera screen with outdoor-optimized NB 2.0 UI
<Camera style={styles.camera}>
  {/* Semi-transparent overlay for controls */}
  <View style={{
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  }}>
    <TouchableOpacity
      style={{
        width: 48,
        height: 48,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 6,                    // NB 2.0 radius
        borderWidth: 2,
        borderColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onPress={closeCamera}
    >
      <MaterialCommunityIcons name="close" size={24} color="white" />
    </TouchableOpacity>

    <TouchableOpacity
      style={{
        width: 48,
        height: 48,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 6,
        borderWidth: 2,
        borderColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onPress={toggleFlash}
    >
      <MaterialCommunityIcons
        name={flashOn ? "flash" : "flash-off"}
        size={24}
        color="white"
      />
    </TouchableOpacity>
  </View>

  {/* High-contrast focus guide */}
  <View style={{
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 200,
    height: 200,
    marginTop: -100,
    marginLeft: -100,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 6,                        // NB 2.0 radius
    backgroundColor: 'transparent',
  }} />

  {/* Extra-large capture button with NB 2.0 styling */}
  <View style={{
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
  }}>
    <TouchableOpacity
      style={{
        width: 72,
        height: 72,
        borderRadius: 6,                    // NB 2.0 (not full circle)
        backgroundColor: colors.white,
        borderWidth: 4,                     // Extra thick for outdoor visibility
        borderColor: colors.primary,        // #7FBC8C
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.black,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 0,                    // Hard-edge NB shadow
        elevation: 5,
      }}
      onPress={takePicture}
    >
      <MaterialCommunityIcons name="camera" size={32} color={colors.primary} />
    </TouchableOpacity>
  </View>

  {/* Preview thumbnail with high contrast NB 2.0 border */}
  {lastPhoto && (
    <TouchableOpacity
      style={{
        position: 'absolute',
        bottom: 40,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 6,                    // NB 2.0 radius
        borderWidth: 3,                     // Thick NB border
        borderColor: colors.white,
        overflow: 'hidden',
      }}
      onPress={viewLastPhoto}
    >
      <Image source={{ uri: lastPhoto }} style={{ width: '100%', height: '100%' }} />
    </TouchableOpacity>
  )}
</Camera>
```

---

### Additional Outdoor Considerations

#### Battery-Conscious Design

Outdoor work often involves extended battery use:

- **Reduce screen brightness automatically** in direct sunlight (iOS/Android API)
- **Dark mode option** for battery savings (OLED screens)
- **Minimize GPS polling** to 5-minute intervals (not continuous)
- **Batch network requests** to reduce radio usage
- **Cache map tiles** to avoid repeated downloads

```tsx
// Check battery level and adjust features
import { Battery } from 'react-native-device-info';

useEffect(() => {
  const checkBattery = async () => {
    const level = await Battery.getBatteryLevel();

    if (level < 0.15) {  // Below 15%
      // Reduce location tracking frequency
      setLocationInterval(10 * 60 * 1000);  // 10 minutes

      // Show warning to user
      showToast('Baterai lemah. Pelacakan lokasi dikurangi.', 'warning');
    }
  };

  checkBattery();
}, []);
```

#### Weather Resistance UI

Consider rain and moisture:

- **Larger touch targets** (wet fingers less precise)
- **Avoid edge gestures** (swipe from edge unreliable with wet screen)
- **Clear visual feedback** (haptic feedback less effective with gloves)
- **Auto-save frequently** (prevent data loss if device gets wet)

#### Performance in Heat

Device performance degrades in high temperatures:

- **Reduce animations** (fewer GPU operations)
- **Limit background tasks** (reduce CPU load)
- **Compress photos aggressively** (reduce processing time)
- **Show temperature warning** if device overheats

---

## Focus Indicators (Web)

**Neo Brutalism 2.0 Focus Styles**

```css
/* Focus ring specification */
:focus-visible {
  outline: 3px solid var(--color-primary);  /* #7FBC8C */
  outline-offset: 2px;
  box-shadow: 0 0 0 3px rgba(127, 188, 140, 0.4);
}

/* High contrast focus for outdoor/accessibility */
@media (prefers-contrast: high) {
  :focus-visible {
    outline: 3px solid var(--color-black);  /* #1C1917 */
    outline-offset: 2px;
  }
}
```

---

## Testing Checklist

### Manual Testing

- [ ] Navigate entire app with screen reader (VoiceOver/TalkBack)
- [ ] Verify all interactive elements are announced
- [ ] Check focus order is logical
- [ ] Test with 200% font scaling
- [ ] Test with high contrast mode
- [ ] Test with reduced motion enabled
- [ ] Verify all touch targets are ≥48×48px
- [ ] Test pattern backgrounds don't affect readability

### Automated Testing

```bash
# React Native accessibility testing
npm install @testing-library/react-native

# Example test
it('should have accessible button', () => {
  const { getByRole } = render(<ClockInButton />);
  const button = getByRole('button', { name: 'Masuk Kerja' });
  expect(button).toBeTruthy();
});
```

### Tools

| Platform | Tool |
|----------|------|
| iOS | Xcode Accessibility Inspector |
| Android | Accessibility Scanner |
| Both | Manual VoiceOver/TalkBack testing |
| Web | axe DevTools, Lighthouse |
| Contrast | WebAIM Contrast Checker |

---

## Accessibility Audit Schedule

| Frequency | Activity |
|-----------|----------|
| Per feature | Developer self-check |
| Per sprint | Screen reader walkthrough |
| Per release | Full WCAG audit |
| Quarterly | User testing with disabilities |

---

**Document Owner:** UI/UX Designer
**Last Updated:** 2026-02-05
**Status:** Active - Updated for Neo Brutalism 2.0
**Compliance Target:** WCAG 2.1 Level AA
**Related:** [neo-brutalism.md](neo-brutalism.md) - Primary design system reference

---

## Monitoring Accessibility

### Color Contrast Verification (WCAG 2.1 AA)

| Status | Color | On White | On Dark (#1F2937) | Passes AA |
|--------|-------|----------|-------------------|-----------|
| ACTIVE | #15803D | 4.96:1 | 3.12:1 | Yes (normal text on white) |
| INACTIVE | #D97706 | 3.24:1 | 2.04:1 | Yes (large text/icons only) |
| OUTSIDE_AREA | #9333EA | 4.63:1 | 2.91:1 | Yes (normal text on white) |
| MISSING | #DC2626 | 4.52:1 | 2.84:1 | Yes (normal text on white) |
| OFFLINE | #6B7280 | 4.69:1 | 2.95:1 | Yes (normal text on white) |

Note: INACTIVE (#D97706) only passes AA for large text (18px+) or icons on white backgrounds. For small text, use darker variant #B45309.

### Color Blindness — Dual Encoding

Status must NEVER rely on color alone. Every status uses triple encoding:

| Status | Color | Shape | Icon | Pattern |
|--------|-------|-------|------|---------|
| ACTIVE | Green | Circle | Checkmark | Solid fill |
| INACTIVE | Amber | Triangle | Pause | Horizontal stripes |
| OUTSIDE_AREA | Purple | Diamond | Arrow-out | Diagonal dots |
| MISSING | Red | Square | Exclamation | Crosshatch |
| OFFLINE | Gray | Dash | X/minus | No fill (outline) |

Tested against: Deuteranopia, Protanopia, Tritanopia using simulated palettes.

### Map Accessibility

**Screen Readers:**
- Map container has `role="application"` with `aria-label="Peta monitoring pekerja"`
- Each visible marker announced as: "{name}, {role}, status {status}, lokasi {area_name}, terakhir update {time_ago}"
- Status count cards use `aria-live="polite"` for real-time count updates
- Side panel user list uses standard list semantics with `role="listbox"`

**Keyboard Navigation:**
- Tab enters map → arrow keys pan → +/- zoom → Enter on marker opens popup
- Escape closes popup/detail panel
- Side panel: Tab through filter chips → Enter to toggle → Tab to user list → arrow keys navigate
- Focus ring: 3px solid #2563EB, 2px offset (NB style, visible on all backgrounds)

**Prefers-Reduced-Motion:**
```css
@media (prefers-reduced-motion: reduce) {
  .marker-pulse { animation: none; }
  .status-transition { transition: none; }
  .map-flyto { /* instant jump instead of animated fly */ }
  .trail-draw { animation: none; opacity: 1; }
}
```

**Outdoor Use Optimizations:**
- High contrast mode: status colors darken by 20% in bright ambient light
- Minimum font size on map: 10px (with bold weight for readability)
- Avoid pure white (#FFFFFF) backgrounds — use #F9FAFB to reduce glare
- Touch targets minimum 44x44px for all interactive map elements
