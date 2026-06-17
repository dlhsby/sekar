# Device Permissions

**Status:** ✅ Implemented (Phase 2E - January 31, 2026)
**Test Coverage:** 100% (39/39 tests passing)

Complete specification for device permission management in SEKAR mobile app.

---

## Overview

SEKAR implements a comprehensive, user-friendly permission request flow that guides users through granting necessary permissions after login. The system uses:
- **Sequential onboarding:** Step-by-step with clear explanations
- **Platform-specific handling:** Android 10+ background location guidance
- **Neo Brutalism design:** Bold, accessible UI (WCAG 2.1 AA)
- **AsyncStorage persistence:** Remember onboarding completion

---

## Architecture

### Components

1. **PermissionManager Service** (`src/services/permissions/PermissionManager.ts`)
   - Singleton service managing all permission logic
   - Platform-specific permission handling (Android/iOS)
   - AsyncStorage persistence for onboarding status
   - 26 unit tests (100% pass rate)

2. **PermissionRequestModal** (`src/components/common/PermissionRequestModal.tsx`)
   - Neo Brutalism design with step-by-step flow
   - Android 10+ guidance for background location
   - Progress indicators and accessibility
   - 13 unit tests (100% pass rate)

3. **App.tsx Integration**
   - Checks `permission_onboarding_completed` in AsyncStorage after login
   - Shows modal automatically for new users
   - Initializes FCM service after permissions granted

### Flow Diagram

```
Login Success
     ↓
Check Onboarding Status (AsyncStorage)
     ↓
[Not Completed] → Show PermissionRequestModal
     ↓
Step 1: Notifications (Android 13+)
     ↓
Step 2: Location (Foreground)
     ↓
Step 3: Background Location (Android 10+)
   [Shows guidance modal first]
     ↓
Mark Onboarding Complete
     ↓
Initialize FCM Service
     ↓
Navigate to Home
```

---

## Permission Types

| Permission | Platform | Purpose | Onboarding | Request Timing |
|------------|----------|---------|------------|----------------|
| **POST_NOTIFICATIONS** | Android 13+ | Push notifications | Step 1 | After login |
| **Location (Foreground)** | Both | Clock-in/out validation | Step 2 | After login |
| **Background Location** | Android 10+ | Route tracking during shift | Step 3 | After login |
| **Camera** | Both | Report photo capture | No | Just-in-time |

---

## Sequential Permission Flow

**Trigger:** After successful login (if onboarding not completed)

### Step 1: Notifications (Android 13+)
- **Permission:** `POST_NOTIFICATIONS`
- **Icon:** 🔔 bell-outline (sunshine yellow)
- **Title:** "Notifikasi"
- **Explanation:** "Terima pemberitahuan penting tentang tugas baru, pengingat shift, dan informasi dari supervisor."
- **Required:** Yes
- **Skip:** Not allowed

### Step 2: Location (Foreground)
- **Permission:** `ACCESS_FINE_LOCATION`
- **Icon:** 📍 map-marker-outline (sky blue)
- **Title:** "Lokasi"
- **Explanation:** "Diperlukan untuk absensi digital dan memverifikasi Anda berada di lokasi kerja yang benar saat clock-in."
- **Required:** Yes
- **Skip:** Not allowed

### Step 3: Background Location (Android 10+)
- **Permission:** `ACCESS_BACKGROUND_LOCATION`
- **Icon:** 🗺️ map-marker-path (primary green)
- **Title:** "Lokasi Latar Belakang"
- **Explanation:** "Izinkan 'Sepanjang waktu' untuk melacak rute Anda selama shift kerja. Data ini membantu supervisor memantau area yang sudah dikerjakan."
- **Required:** Yes
- **Special:** Shows Android 10+ guidance modal before request
- **Skip:** Not allowed

### Camera (Just-in-Time)
- **Permission:** `CAMERA`
- **When:** Requested when user taps camera button in report form
- **Explanation:** Shown in system permission dialog
- **Required:** Only for photo capture feature
- **Skip:** Blocks camera, allows other features

---

## Android 10+ Background Location Handling

### The Challenge

Starting with Android 10 (API level 29), Google changed background location permissions:
- **Separate permission required:** `ACCESS_BACKGROUND_LOCATION` is separate from foreground
- **Hidden "Allow all the time" option:** Not prominently shown in permission dialog
- **Manufacturer variations:** UI varies by device brand (Samsung, Xiaomi, Oppo, etc.)
- **User confusion:** Most users select "Allow only while using app" by default

### The Solution

**Before requesting `ACCESS_BACKGROUND_LOCATION`:**

1. **Show guidance modal** with clear instructions:
   ```
   PENTING:
   1. Pilih "Izinkan sepanjang waktu" atau "Allow all the time"
   2. Jika opsi tidak muncul, buka Pengaturan → Aplikasi → SEKAR → Izin → Lokasi
   3. Pilih "Sepanjang waktu" atau "Allow all the time"
   ```

2. **User acknowledges** by tapping "Mengerti, Lanjutkan"

3. **System permission dialog appears** with user now knowing what to select

4. **Fallback:** Settings deep link available if user needs to manually enable

### Detection Logic

```typescript
const isAndroid10Plus = useCallback(() => {
  // Android 10 (API level 29) and above
  return Platform.OS === 'android' && Platform.Version >= 29;
}, []);
```

**Works for all brands:**
- ✅ Samsung (One UI)
- ✅ Xiaomi/Redmi (MIUI)
- ✅ Oppo (ColorOS)
- ✅ Vivo (FuntouchOS)
- ✅ Stock Android
- ✅ Other manufacturers

---

## Configuration Files

### Android Manifest

**File:** `android/app/src/main/AndroidManifest.xml`

```xml
<manifest>
  <!-- Location permissions -->
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
  <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
  <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />

  <!-- Camera permission -->
  <uses-permission android:name="android.permission.CAMERA" />

  <!-- Push notifications (Android 13+) -->
  <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
</manifest>
```

### iOS Info.plist

**File:** `ios/SEKAR/Info.plist`

```xml
<!-- Location permissions -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>SEKAR memerlukan akses lokasi untuk memvalidasi absensi Anda di area kerja yang ditugaskan.</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>SEKAR memerlukan akses lokasi untuk melacak keberadaan Anda selama shift kerja berlangsung.</string>

<!-- Camera permission -->
<key>NSCameraUsageDescription</key>
<string>SEKAR memerlukan akses kamera untuk mengambil foto laporan kerja.</string>
```

---

## Testing

### Unit Tests

**PermissionManager.test.ts** (26 tests)
- ✅ Notification permission (check, request, denied, blocked)
- ✅ Location permission (check, request, denied, blocked)
- ✅ Background location (check, request, Android 10+ handling)
- ✅ Camera permission (check, request)
- ✅ Onboarding status (get, set, persist)
- ✅ Settings navigation

**PermissionRequestModal.test.tsx** (13 tests)
- ✅ Modal rendering with current step
- ✅ Sequential permission flow (3 steps)
- ✅ Android 10+ guidance display
- ✅ Permission denial handling
- ✅ Progress indicator (3 dots)
- ✅ Settings link functionality
- ✅ Complete flow with onComplete callback

### Manual Testing Checklist

#### Android 10+ Devices
- [ ] Fresh install shows onboarding modal after login
- [ ] Step 1: Notification permission dialog appears
- [ ] Step 2: Location permission dialog appears
- [ ] Step 3: Background location guidance shows before permission
- [ ] Guidance modal explains "Allow all the time"
- [ ] System permission shows "Allow all the time" option
- [ ] Settings deep link opens correct screen
- [ ] Second login skips onboarding (cached in AsyncStorage)
- [ ] Denied permissions handled gracefully (can continue)
- [ ] Camera requested just-in-time when tapping camera button

#### iOS Devices
- [ ] Fresh install shows onboarding modal after login
- [ ] Notification permission requested
- [ ] "While Using App" location permission requested
- [ ] "Always" location permission requested with explanation
- [ ] Settings deep link works
- [ ] Second login skips onboarding
- [ ] Camera permission requested when needed

---

## API Reference

### PermissionManager

```typescript
class PermissionManager {
  // Notification permission
  async requestNotificationPermission(): Promise<PermissionResult>
  async checkNotificationPermission(): Promise<boolean>

  // Location permissions
  async requestLocationPermission(): Promise<PermissionResult>
  async requestBackgroundLocationPermission(): Promise<PermissionResult>
  async checkLocationPermission(): Promise<boolean>

  // Camera permission
  async requestCameraPermission(): Promise<PermissionResult>

  // Onboarding state
  async hasCompletedOnboarding(): Promise<boolean>
  async setOnboardingCompleted(): Promise<void>
  async resetOnboarding(): Promise<void>

  // Settings
  async openSettings(): Promise<void>
}
```

### PermissionResult

```typescript
interface PermissionResult {
  granted: boolean;           // Whether permission is granted
  status: PermissionStatus;   // GRANTED, DENIED, BLOCKED, etc.
  canRequest: boolean;        // Whether we can request (not blocked)
  message?: string;           // User-friendly message
}
```

### PermissionType Enum

```typescript
enum PermissionType {
  NOTIFICATIONS = 'notifications',
  LOCATION = 'location',
  BACKGROUND_LOCATION = 'background_location',
  CAMERA = 'camera',
}
```

---

## Phase 2D Monitoring Permissions

### Phase 2D Monitoring Permissions
- `ACCESS_FINE_LOCATION` — Required for GPS tracking during shifts
- `ACCESS_BACKGROUND_LOCATION` — Required for continuous tracking when app backgrounded
- `FOREGROUND_SERVICE_LOCATION` — Android 14+ requirement for location foreground service
- Permission request flow: Check on app launch → request on first clock-in → explain via rationale dialog if denied
- Location accuracy: Request high accuracy (GPS), fall back to balanced if GPS unavailable
- Battery optimization: Monitoring uses existing locationTracker service intervals (not separate)

---

## Known Limitations

1. **Cannot force "Allow all the time":** Android doesn't allow apps to programmatically grant this
2. **Manufacturer UI variations:** Background location dialog varies by brand
3. **No "Deny and don't ask again" detection:** Cannot detect if user permanently blocked permission
4. **iOS background refresh required:** Must be enabled in iOS Settings separately

---

## Future Enhancements

1. **Permission health check:** Periodic check if critical permissions are still granted
2. **In-app rationale:** Show explanatory screen before system permission prompt
3. **Permission recovery:** Detect when permission is revoked and prompt re-enable
4. **Analytics:** Track permission grant/deny rates by device type
5. **Admin dashboard:** Show permission status across all worker devices

---

## Related Documentation

- **Permission Flow Guide:** `fe/mobile/PERMISSION_FLOW.md` (detailed implementation)
- **FCM Integration:** `specs/deployment/credentials-setup.md`
- **Mobile Screens:** `specs/mobile/screens.md`
- **State Management:** `specs/mobile/state-management.md`
