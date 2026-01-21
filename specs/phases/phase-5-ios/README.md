# Phase 5: iOS Platform Support

**Timeline:** Weeks 9-10
**Duration:** 2 weeks
**Status:** Planned

---

## Overview

Phase 5 focuses on launching the iOS version of the SEKAR mobile app with full feature parity to Android, plus iOS-specific enhancements like Apple Sign-In and Siri Shortcuts.

---

## Goals

1. **iOS App Release** - Full feature parity with Android
2. **App Store Submission** - Meet Apple guidelines
3. **iOS-Specific Features** - Apple Sign-In, Siri Shortcuts
4. **Enhanced Security** - App attest, secure enclave
5. **Performance Optimization** - iOS-specific optimizations

---

## Deliverables

### Mobile (iOS)

1. **iOS Build Configuration** - Xcode project setup, certificates
2. **iOS-Specific UI** - Platform-specific design adjustments
3. **Apple Sign-In** - Optional login method
4. **Siri Shortcuts** - "Start my shift", "Submit report"
5. **App Store Assets** - Screenshots, descriptions, icons

### Backend

1. **Apple Sign-In Integration** - Verify Apple tokens
2. **iOS Device Token Support** - APNs for push notifications
3. **Fraud Detection** - App attest verification

---

## Technical Specifications

### iOS Configuration

**Info.plist additions:**
```xml
<!-- Existing location permissions already configured -->

<!-- Apple Sign-In -->
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.sekar.DLH</string>
    </array>
  </dict>
</array>

<!-- Background Modes -->
<key>UIBackgroundModes</key>
<array>
  <string>location</string>
  <string>fetch</string>
  <string>remote-notification</string>
</array>
```

### Apple Sign-In

```typescript
// services/auth/appleAuth.ts
import appleAuth from '@invertase/react-native-apple-authentication';

export class AppleAuth {
  async signIn(): Promise<AppleAuthResult> {
    const appleAuthRequestResponse = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
    });

    const { identityToken, user } = appleAuthRequestResponse;

    // Send to backend for verification
    const response = await apiClient.post('/auth/apple', {
      identityToken,
      user,
    });

    return response.data;
  }

  async getCredentialState(user: string): Promise<string> {
    return await appleAuth.getCredentialStateForUser(user);
  }
}
```

### Siri Shortcuts

```typescript
// services/siri/shortcuts.ts
import { donateShortcut } from 'react-native-siri-shortcut';

export class SiriShortcuts {
  async donateClockInShortcut(areaName: string) {
    await donateShortcut({
      activityType: 'com.sekar.clockin',
      title: 'Mulai Shift Kerja',
      userInfo: { action: 'clock_in', area: areaName },
      isEligibleForSearch: true,
      isEligibleForPrediction: true,
      suggestedInvocationPhrase: 'Mulai shift di ' + areaName,
      persistentIdentifier: 'clockin-' + areaName,
    });
  }

  async donateReportShortcut() {
    await donateShortcut({
      activityType: 'com.sekar.report',
      title: 'Buat Laporan',
      userInfo: { action: 'create_report' },
      isEligibleForSearch: true,
      isEligibleForPrediction: true,
      suggestedInvocationPhrase: 'Buat laporan pekerjaan',
      persistentIdentifier: 'create-report',
    });
  }
}
```

### App Attest (Fraud Detection)

```typescript
// services/security/appAttest.ts
import DeviceInfo from 'react-native-device-info';

export class AppAttest {
  async generateAttestation(): Promise<string> {
    const keyId = await DeviceInfo.getUniqueId();
    const challenge = await apiClient.get('/auth/attestation/challenge');

    // Generate attestation using iOS App Attest API
    const attestation = await NativeModules.AppAttest.attest(keyId, challenge.data);

    return attestation;
  }

  async assertIdentity(keyId: string): Promise<boolean> {
    const assertion = await NativeModules.AppAttest.generateAssertion(keyId);
    const response = await apiClient.post('/auth/attestation/verify', { assertion });

    return response.data.valid;
  }
}
```

---

## Task Breakdown

### Week 9: iOS Development

#### Mobile Developer (5 days)
- [ ] Day 1: iOS build configuration, certificates
- [ ] Day 2: Platform-specific UI adjustments
- [ ] Day 3: Apple Sign-In integration
- [ ] Day 4: Siri Shortcuts implementation
- [ ] Day 5: iOS testing on physical devices

#### Backend Developer (2 days)
- [ ] Day 1: Apple Sign-In backend verification
- [ ] Day 2: App attest verification endpoints

### Week 10: App Store Submission

#### Mobile Developer (3 days)
- [ ] Day 1: App Store assets (screenshots, descriptions)
- [ ] Day 2: TestFlight beta testing
- [ ] Day 3: App Store submission

#### QA Engineer (2 days)
- [ ] Day 1: iOS-specific testing
- [ ] Day 2: TestFlight beta testing coordination

---

## Platform Differences

| Feature | Android | iOS |
|---------|---------|-----|
| **Location** | ACCESS_FINE_LOCATION | NSLocationAlwaysAndWhenInUseUsageDescription |
| **Camera** | CAMERA permission | NSCameraUsageDescription |
| **Notifications** | FCM | APNs |
| **Sign-In** | Google Sign-In | Apple Sign-In (required) |
| **Background Location** | Background service | Background modes |
| **Biometric** | Fingerprint | Touch ID / Face ID |

---

## App Store Requirements

### App Information
- **Name:** SEKAR - Sistem Evaluasi Kerja
- **Category:** Productivity
- **Age Rating:** 4+
- **Description:** (See app-store-description.md)
- **Keywords:** taman, kebersihan, absensi, laporan

### Screenshots (Required)
- 6.7" (iPhone 14 Pro Max): 5 screenshots
- 6.5" (iPhone 11 Pro Max): 5 screenshots
- 5.5" (iPhone 8 Plus): 5 screenshots

### Privacy Information
- Location data usage
- Camera usage
- Photo library access
- User account data

### App Review Notes
```
Test Account:
Username: supervisor_test
Password: test123

The app requires GPS location access for worker attendance validation.
Workers must be within 100 meters of their assigned work area to clock in.
```

---

## Acceptance Criteria

- [ ] iOS app builds successfully in Xcode
- [ ] All features work identically to Android
- [ ] Apple Sign-In works correctly
- [ ] Siri Shortcuts can trigger clock-in
- [ ] Push notifications via APNs
- [ ] App passes App Store review
- [ ] TestFlight beta testing complete
- [ ] App available on App Store

---

## Dependencies

- @invertase/react-native-apple-authentication
- react-native-siri-shortcut
- Apple Developer Program membership ($99/year)
- App Store Connect access

---

**Phase Owner:** Mobile Developer
**Last Updated:** 2026-01-16
**Prerequisites:** Phase 4 complete, Apple Developer account active
