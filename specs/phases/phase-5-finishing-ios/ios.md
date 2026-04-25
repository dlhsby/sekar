# Phase 5: iOS Platform Specifications

**Date:** March 13, 2026
**Status:** Not Started
**Depends On:** Phase 4 Mobile (Complete)
**Related Sub-Phase:** 5-4
**Related ADRs:** [ADR-027](../../architecture/decisions/ADR-027-ios-build-distribution.md)

---

## Current Codebase Facts (Post-Phase 4 Expected Values)

| Fact | Value |
|------|-------|
| React Native | 0.83.x with New Architecture |
| iOS target | iOS 15.0+ (covers iPhone 7 and later) |
| Current iOS state | Xcode project exists (RN template), NOT configured for production |
| Android | Production-ready, deployed to Play Store |
| Auth | JWT with refresh tokens, identifier-based login |
| FCM | Active on Android; iOS needs APNs certificate |
| Deep linking | Android App Links configured (Phase 4) |

---

## A. Xcode Project Setup

### A1. Project Configuration

**File:** `fe/mobile/ios/SekarMobile.xcodeproj`

| Setting | Value |
|---------|-------|
| Bundle Identifier | `com.dlhsurabaya.sekar` |
| Display Name | SEKAR |
| Deployment Target | iOS 15.0 |
| Swift Version | 5.9 |
| Architectures | arm64 (drop x86_64 simulator for CI) |

### A2. Capabilities

Enable in Xcode → Target → Signing & Capabilities:

- **Sign in with Apple** — Required for App Store if offering third-party login
- **Push Notifications** — APNs for FCM relay
- **Background Modes** — Location updates, Remote notifications
- **Associated Domains** — `applinks:sekar.wahyutrip.com` (Universal Links)

### A3. Info.plist Permissions

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>SEKAR memerlukan lokasi Anda untuk pencatatan kehadiran dan pemantauan area kerja.</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>SEKAR memerlukan akses lokasi terus-menerus untuk pemantauan area kerja selama shift aktif.</string>

<key>NSCameraUsageDescription</key>
<string>SEKAR memerlukan kamera untuk foto selfie kehadiran dan pemindaian QR code aset.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>SEKAR memerlukan akses galeri foto untuk mengunggah foto aktivitas dan laporan.</string>

<key>NSFaceIDUsageDescription</key>
<string>SEKAR menggunakan Face ID untuk login cepat dan aman.</string>
```

### A4. CocoaPods

**File:** `fe/mobile/ios/Podfile`

```ruby
platform :ios, '15.0'

target 'SekarMobile' do
  config = use_native_modules!
  use_react_native!(path: config[:reactNativePath])

  # Apple Sign-In (via react-native-apple-authentication)
  # Biometrics (via react-native-biometrics)
  # Vision Camera (via react-native-vision-camera)
  # Firebase/Messaging (via @react-native-firebase/messaging)

  post_install do |installer|
    react_native_post_install(installer)
  end
end
```

---

## B. Apple Sign-In

### B1. Implementation

**Package:** `@invertase/react-native-apple-authentication`

```typescript
// fe/mobile/src/services/auth/appleAuth.ts
import appleAuth from '@invertase/react-native-apple-authentication';

export async function signInWithApple(): Promise<AppleAuthResponse> {
  const appleAuthResponse = await appleAuth.performRequest({
    requestedOperation: appleAuth.Operation.LOGIN,
    requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
  });

  const { identityToken, authorizationCode, fullName } = appleAuthResponse;

  // Send to backend for verification
  const response = await authApi.appleLogin({
    identityToken,
    authorizationCode,
    fullName: fullName ? `${fullName.givenName} ${fullName.familyName}` : undefined,
  });

  return response;
}
```

### B2. Login Screen Integration

**File:** `fe/mobile/src/screens/auth/LoginScreen.tsx`

```typescript
// Conditional render: Apple Sign-In button only on iOS
{Platform.OS === 'ios' && (
  <AppleButton
    buttonStyle={AppleButton.Style.BLACK}
    buttonType={AppleButton.Type.SIGN_IN}
    style={{ width: '100%', height: 50, marginTop: 16 }}
    onPress={handleAppleSignIn}
  />
)}
```

> **App Store requirement:** If app offers any third-party login (username/password counts), Apple Sign-In MUST be available as an option on iOS.

---

## C. Biometric Authentication

### C1. Implementation

**Package:** `react-native-biometrics`

```typescript
// fe/mobile/src/services/auth/biometricAuth.ts
import ReactNativeBiometrics from 'react-native-biometrics';

const rnBiometrics = new ReactNativeBiometrics();

export async function isBiometricAvailable(): Promise<boolean> {
  const { available } = await rnBiometrics.isSensorAvailable();
  return available;
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  const { success } = await rnBiometrics.simplePrompt({
    promptMessage: 'Konfirmasi identitas Anda',
    cancelButtonText: 'Batal',
  });
  return success;
}
```

### C2. Usage Points

| Feature | When | Purpose |
|---------|------|---------|
| App unlock | After background (>5 min) | Prevent unauthorized access |
| Clock-in confirmation | Before GPS + selfie | Verify identity |
| Asset checkout | Before confirming | Prevent unauthorized checkout |

### C3. Biometric Settings

Users can enable/disable biometric auth in Settings screen:

```typescript
// Stored in AsyncStorage
{
  biometricEnabled: boolean;       // User preference
  biometricType: 'FaceID' | 'TouchID' | null;  // Device capability
}
```

---

## D. APNs Configuration

### D1. Certificate Setup

1. Generate APNs key in Apple Developer portal
2. Upload APNs key to Firebase Console → Cloud Messaging → iOS
3. Firebase handles APNs → FCM relay automatically

### D2. Token Registration

**File:** `fe/mobile/src/services/fcm/fcmService.ts`

```typescript
// iOS-specific: request notification permission
if (Platform.OS === 'ios') {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (!enabled) {
    console.warn('iOS notification permission not granted');
    return;
  }
}

// Get APNs token (iOS) or FCM token (Android)
const token = await messaging().getToken();
await authApi.registerDeviceToken(token);
```

---

## E. Platform Parity Checklist

Verify all Android features work on iOS:

| Feature | Android | iOS | Notes |
|---------|---------|-----|-------|
| Login (identifier) | ✅ | ⬜ Verify | |
| Clock-in (GPS + selfie) | ✅ | ⬜ Verify | Camera permissions |
| Clock-out | ✅ | ⬜ Verify | |
| Activity submission | ✅ | ⬜ Verify | Photo upload |
| Task management | ✅ | ⬜ Verify | |
| Overtime clock-in/out | ✅ | ⬜ Verify | |
| Monitoring dashboard | ✅ | ⬜ Verify | MapView |
| Notifications | ✅ | ⬜ Verify | APNs via FCM |
| Offline sync | ✅ | ⬜ Verify | AsyncStorage |
| Location tracking | ✅ | ⬜ Verify | Background modes |
| Deep linking | ✅ | ⬜ Configure | Universal Links |
| Apple Sign-In | N/A | ⬜ NEW | iOS only |
| Biometrics | ⬜ Optional | ⬜ NEW | Face ID / Touch ID |
| QR Scanner | ✅ | ⬜ Verify | vision-camera |
| Reports | ⬜ NEW | ⬜ NEW | Same implementation |
| Analytics | ⬜ NEW | ⬜ NEW | Same implementation |
| Assets | ⬜ NEW | ⬜ NEW | Same implementation |

---

## F. App Store Submission

### F1. App Information

| Field | Value |
|-------|-------|
| App Name | SEKAR - Sistem Evaluasi Kerja |
| Subtitle | Manajemen Pekerja RTH Surabaya |
| Category | Business / Productivity |
| Age Rating | 4+ |
| Price | Free |
| Bundle ID | `com.dlhsurabaya.sekar` |

### F2. Screenshots Required

| Device | Size | Count |
|--------|------|-------|
| iPhone 16 Pro Max (6.9") | 1320 x 2868 | 5 |
| iPhone 16 Pro (6.3") | 1206 x 2622 | 5 |
| iPhone SE (4.7") | 750 x 1334 | 5 |

**Screens to capture:** Login, Home/Dashboard, Clock-In, Task List, Monitoring Map

### F3. App Review Notes

```
This app is used by DLH Surabaya (Dinas Lingkungan Hidup Kota Surabaya)
employees for managing green space workers.

Test Account:
Username: korlap1
Password: password123

The app requires GPS location access for worker attendance verification.
Location is only collected during active work shifts.

Apple Sign-In creates a new account linked to the Apple ID.
Existing users can link their Apple ID in the Profile screen.
```

### F4. Privacy Policy Requirements

Must include:
- Types of data collected (location, camera photos, personal info)
- Purpose of data collection (attendance verification, work reporting)
- Data retention periods (location: 90 days, reports: indefinite)
- Third-party services (Firebase, AWS S3)
- Contact information for DLH Surabaya

URL: `https://sekar.wahyutrip.com/privacy` (web page to create)

---

## G. TestFlight Distribution

### G1. Internal Testing

1. Build archive in Xcode (Product → Archive)
2. Upload to App Store Connect
3. Add internal testers (development team)
4. Distribute via TestFlight

### G2. External Testing

1. Create beta group in TestFlight
2. Add DLH Surabaya test users (up to 10,000)
3. Submit for beta review (usually <24h)
4. Distribute beta build

### G3. CI/CD Pipeline

**File:** `.github/workflows/ios.yml`

```yaml
name: iOS Build
on:
  push:
    branches: [main]
    paths: ['fe/mobile/**']
  workflow_dispatch:

jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '24' }
      - name: Install dependencies
        run: cd fe/mobile && npm ci
      - name: Install CocoaPods
        run: cd fe/mobile/ios && pod install
      - name: Build iOS
        run: |
          cd fe/mobile/ios
          xcodebuild -workspace SekarMobile.xcworkspace \
            -scheme SekarMobile \
            -configuration Release \
            -sdk iphoneos \
            -archivePath build/SekarMobile.xcarchive \
            archive
      - name: Export IPA
        run: |
          xcodebuild -exportArchive \
            -archivePath build/SekarMobile.xcarchive \
            -exportPath build/ipa \
            -exportOptionsPlist ExportOptions.plist
      - name: Upload to TestFlight
        uses: apple-actions/upload-testflight-build@v1
        with:
          app-path: build/ipa/SekarMobile.ipa
          issuer-id: ${{ secrets.APPLE_ISSUER_ID }}
          api-key-id: ${{ secrets.APPLE_API_KEY_ID }}
          api-private-key: ${{ secrets.APPLE_API_PRIVATE_KEY }}
```

---

**Last Updated:** 2026-03-13
