# Accessibility Guidelines

WCAG 2.1 AA compliance checklist and accessibility standards for SEKAR applications.

## Accessibility Overview

SEKAR must be accessible to users with varying abilities, including:
- Visual impairments (low vision, color blindness)
- Motor impairments (limited dexterity)
- Cognitive differences (varied literacy levels)

### Target Compliance
- **WCAG 2.1 Level AA** - All screens and features
- **Platform Guidelines** - iOS/Android accessibility APIs

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

See [Color Palette](./color-palette.md) for contrast ratios.

```tsx
// ✅ Status with color AND icon AND text
<View style={{ flexDirection: 'row', alignItems: 'center' }}>
  <MaterialCommunityIcons
    name="check-circle"
    size={16}
    color={colors.success}
  />
  <Text style={{ color: colors.success, marginLeft: 4 }}>
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

const animationDuration = reduceMotion ? 0 : 300;
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
  <Text style={{ color: colors.error }}>
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
| Bright sunlight | High contrast colors, minimum 4.5:1 |
| Wearing gloves | Large 48×48px touch targets |
| Outdoor noise | Visual-only feedback, no audio reliance |
| Varied literacy | Simple words, icons with text |

### Design Adaptations

```tsx
// Large, easy-to-tap button
<TouchableOpacity
  style={{
    height: 56, // Extra large
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 8,
  }}
>
  <Text style={{ fontSize: 18, fontWeight: '600', color: 'white' }}>
    MASUK KERJA
  </Text>
</TouchableOpacity>

// Clear status with multiple signals
<View style={styles.statusContainer}>
  <MaterialCommunityIcons name="check-circle" size={24} color="green" />
  <Text style={styles.statusText}>Sudah absen masuk</Text>
  <Text style={styles.statusTime}>08:05 WIB</Text>
</View>
```

---

## Outdoor Usability Patterns

SEKAR is used by park workers in outdoor environments with challenging conditions. These patterns ensure the app remains usable in bright sunlight, while wearing gloves, and in various weather conditions.

### Sunlight Readability

**Problem:** Direct sunlight reduces screen contrast by 50% or more.

**Requirements:**

| Element | Standard Contrast | Outdoor Contrast | Recommendation |
|---------|------------------|------------------|----------------|
| Body text | 4.5:1 (AA) | **7:1 minimum** | Use `gray900` (#212121) on light backgrounds |
| Large text (18px+) | 3:1 (AA) | **5:1 minimum** | Use bold font weights (600+) |
| Critical actions | 4.5:1 (AA) | **7:1 minimum** | Add shadows or outlines |
| Status indicators | 3:1 (AA) | **5:1 minimum** | Combine color + icon + text |

**Implementation:**

```tsx
// ✅ High contrast text for outdoor use
<Text style={{
  fontSize: 16,
  fontWeight: '600',           // Bold for better readability
  color: colors.gray900,        // #212121 (dark gray, not pure black)
  textShadowColor: 'rgba(255, 255, 255, 0.8)',  // Subtle white shadow
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
}}>
  Area: Taman Bungkul
</Text>

// ✅ Avoid pure white backgrounds (causes glare)
<View style={{
  backgroundColor: colors.gray50,  // #FAFAFA instead of #FFFFFF
}}>

// ✅ Critical buttons with high contrast and large size
<TouchableOpacity style={{
  backgroundColor: colors.primary,  // #2E7D32
  paddingVertical: 18,             // Extra padding for outdoor use
  paddingHorizontal: 24,
  borderRadius: 8,
  borderWidth: 2,
  borderColor: colors.primaryDark, // #1B5E20 (adds definition)
}}>
  <Text style={{
    fontSize: 18,
    fontWeight: '700',              // Bold
    color: colors.white,
    textAlign: 'center',
  }}>
    MASUK KERJA
  </Text>
</TouchableOpacity>
```

**Text on Images:**

```tsx
// ✅ Text on photo with contrast overlay
<ImageBackground source={{ uri: photoUrl }}>
  <View style={{
    backgroundColor: 'rgba(0, 0, 0, 0.6)',  // Dark overlay
    padding: 8,
  }}>
    <Text style={{
      color: colors.white,
      fontSize: 14,
      fontWeight: '600',
      textShadowColor: 'rgba(0, 0, 0, 0.8)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    }}>
      Kondisi taman baik
    </Text>
  </View>
</ImageBackground>
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
// ✅ Extra-large clock-in button for gloved use
<TouchableOpacity
  style={{
    width: 72,
    height: 72,
    backgroundColor: colors.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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

// ✅ Large, outlined buttons (easier to see with gloves)
<TouchableOpacity
  style={{
    height: 56,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 12,
    borderWidth: 3,                    // Thick border
    borderColor: colors.primaryDark,
  }}
>
  <Text style={{
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  }}>
    AMBIL FOTO
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
| **Capture button** | 72×72px, bright color with thick border |
| **Focus guides** | High contrast white lines (2px width) |
| **Preview thumbnail** | High contrast border, semi-transparent background |

**Implementation:**

```tsx
// Camera screen with outdoor-optimized UI
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
        borderRadius: 24,
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
        borderRadius: 24,
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
    borderRadius: 8,
    backgroundColor: 'transparent',
  }} />

  {/* Extra-large capture button */}
  <View style={{
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
  }}>
    <TouchableOpacity
      style={{
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: colors.white,
        borderWidth: 4,
        borderColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 5,
      }}
      onPress={takePicture}
    >
      <MaterialCommunityIcons name="camera" size={32} color={colors.primary} />
    </TouchableOpacity>
  </View>

  {/* Preview thumbnail with high contrast */}
  {lastPhoto && (
    <TouchableOpacity
      style={{
        position: 'absolute',
        bottom: 40,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 8,
        borderWidth: 3,
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

## Testing Checklist

### Manual Testing

- [ ] Navigate entire app with screen reader (VoiceOver/TalkBack)
- [ ] Verify all interactive elements are announced
- [ ] Check focus order is logical
- [ ] Test with 200% font scaling
- [ ] Test with high contrast mode
- [ ] Test with reduced motion enabled
- [ ] Verify all touch targets are ≥48×48px

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
**Last Updated:** 2026-01-16
**Status:** Active
**Compliance Target:** WCAG 2.1 Level AA
