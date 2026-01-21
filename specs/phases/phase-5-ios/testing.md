# Phase 5 - iOS & Advanced Features: Testing Plan

---

## Overview

This document outlines testing requirements for iOS-specific features, Apple Sign-In, Siri Shortcuts, biometric authentication, fraud detection, and internationalization.

---

## Test Coverage Requirements

| Module | Target Coverage | Priority |
|--------|-----------------|----------|
| AppleAuthService (Backend) | >80% | High |
| FraudDetectionService | >80% | High |
| AttestationService | >80% | Medium |
| Biometric Auth (Mobile) | >70% | High |
| i18n (Mobile) | >70% | Medium |
| Fraud Dashboard (Web) | >70% | Medium |

---

## Backend Unit Tests

### Apple Auth Service Tests

```typescript
describe('AppleAuthService', () => {
  describe('verifyAppleToken', () => {
    it('should verify valid Apple identity token');
    it('should throw UnauthorizedException for invalid token');
    it('should throw UnauthorizedException for expired token');
    it('should extract email from token');
    it('should handle private relay email');
  });

  describe('findOrCreateUser', () => {
    it('should return existing user with matching Apple ID');
    it('should link Apple ID to existing email user');
    it('should create new user if no match found');
    it('should store Apple user ID');
    it('should handle missing email (private relay)');
  });
});

describe('AuthController - Apple', () => {
  describe('POST /auth/apple', () => {
    it('should authenticate with valid Apple token');
    it('should return JWT tokens');
    it('should return 401 for invalid token');
  });

  describe('POST /auth/apple/link', () => {
    it('should link Apple ID to authenticated user');
    it('should fail if Apple ID already linked');
    it('should require authentication');
  });

  describe('DELETE /auth/apple/unlink', () => {
    it('should unlink Apple ID from user');
    it('should fail if no Apple ID linked');
    it('should require authentication');
  });
});
```

### Fraud Detection Service Tests

```typescript
describe('FraudDetectionService', () => {
  describe('checkLocation', () => {
    it('should pass for valid location');
    it('should fail for mock location enabled');
    it('should fail for rooted device');
    it('should fail for emulator');
    it('should detect velocity anomaly');
    it('should handle first location (no previous)');
    it('should pass for reasonable travel speed');
  });

  describe('logFraudAttempt', () => {
    it('should create fraud log entry');
    it('should store device info');
    it('should store location data');
    it('should set status as detected');
  });

  describe('velocity check', () => {
    it('should calculate distance correctly');
    it('should calculate speed correctly');
    it('should flag speed > 50 m/s');
    it('should pass for normal walking speed');
    it('should pass for driving speed');
  });

  describe('getFraudStats', () => {
    it('should return counts by type');
    it('should return counts by status');
    it('should return unique user count');
    it('should filter by date range');
  });
});

describe('FraudDetectionController', () => {
  describe('POST /fraud/check-location', () => {
    it('should validate location');
    it('should return check results');
    it('should require authentication');
  });

  describe('GET /fraud/logs (Admin)', () => {
    it('should return paginated logs');
    it('should filter by type');
    it('should filter by status');
    it('should filter by date range');
    it('should require Admin role');
  });

  describe('PATCH /fraud/logs/:id (Admin)', () => {
    it('should update status');
    it('should add admin notes');
    it('should record reviewer');
    it('should require Admin role');
  });

  describe('GET /fraud/stats (Admin)', () => {
    it('should return statistics');
    it('should require Admin role');
  });
});
```

### Attestation Service Tests

```typescript
describe('AttestationService', () => {
  describe('generateChallenge', () => {
    it('should generate random challenge');
    it('should store challenge for user');
    it('should expire old challenges');
  });

  describe('verifyiOSAttestation', () => {
    it('should verify valid attestation');
    it('should reject invalid attestation');
    it('should validate challenge matches');
    it('should store device fingerprint on success');
  });

  describe('verifyAndroidSafetyNet', () => {
    it('should verify valid SafetyNet token');
    it('should reject invalid token');
    it('should check CTS profile match');
    it('should check basic integrity');
  });
});

describe('Device Management', () => {
  describe('GET /auth/devices', () => {
    it('should return user devices');
    it('should include attestation status');
  });

  describe('DELETE /auth/devices/:id', () => {
    it('should remove device');
    it('should only allow own devices');
    it('should require Admin for other users');
  });
});
```

---

## Mobile Tests

### iOS Build Tests

```typescript
describe('iOS Build', () => {
  it('should build on iOS simulator');
  it('should build on physical device');
  it('should have valid bundle identifier');
  it('should have required Info.plist permissions');
  it('should have background modes configured');
});
```

### Apple Sign-In Tests

```typescript
describe('AppleAuthService (Mobile)', () => {
  describe('isAvailable', () => {
    it('should return true on iOS 13+');
    it('should return false on Android');
    it('should return false on iOS < 13');
  });

  describe('signIn', () => {
    it('should request login with email scope');
    it('should request login with name scope');
    it('should return identity token');
    it('should handle user cancellation');
    it('should handle authorization error');
  });

  describe('checkCredentialState', () => {
    it('should return authorized for valid user');
    it('should return revoked for revoked user');
    it('should return not found for invalid user');
  });
});

describe('AppleSignInButton', () => {
  it('should render on iOS');
  it('should not render on Android');
  it('should call onSuccess with response');
  it('should call onError on failure');
  it('should show loading state');
});
```

### Siri Shortcuts Tests

```typescript
describe('SiriShortcuts', () => {
  describe('donateClockIn', () => {
    it('should donate shortcut with area name');
    it('should set suggested phrase');
    it('should be eligible for prediction');
  });

  describe('donateClockOut', () => {
    it('should donate clock out shortcut');
    it('should set correct user info');
  });

  describe('donateCreateReport', () => {
    it('should donate report shortcut');
    it('should be searchable');
  });

  describe('handleShortcutActivation', () => {
    it('should receive user info on activation');
    it('should parse action type');
    it('should parse area parameter');
  });

  describe('clearAll', () => {
    it('should clear all donated shortcuts');
  });
});

describe('DeepLinkHandler', () => {
  it('should navigate to ClockIn on clock_in action');
  it('should navigate to ClockOut on clock_out action');
  it('should navigate to CreateReport on create_report action');
  it('should pass area parameter to ClockIn');
});
```

### Biometric Auth Tests

```typescript
describe('BiometricAuth', () => {
  describe('isAvailable', () => {
    it('should detect Face ID availability');
    it('should detect Touch ID availability');
    it('should detect Fingerprint availability');
    it('should return false if no biometric');
  });

  describe('getBiometryLabel', () => {
    it('should return "Face ID" for FaceID');
    it('should return "Touch ID" for TouchID');
    it('should return "Fingerprint" for Biometrics');
  });

  describe('promptBiometric', () => {
    it('should show biometric prompt');
    it('should return true on success');
    it('should return false on cancel');
    it('should return false on failure');
  });

  describe('enableBiometricLogin', () => {
    it('should store refresh token encrypted');
    it('should set enabled flag');
  });

  describe('disableBiometricLogin', () => {
    it('should remove stored token');
    it('should clear enabled flag');
    it('should delete biometric keys');
  });

  describe('biometricLogin', () => {
    it('should prompt for biometric');
    it('should return token on success');
    it('should return null on failure');
  });
});

describe('BiometricSettingsScreen', () => {
  it('should check biometric availability on mount');
  it('should show biometry type label');
  it('should show enable toggle');
  it('should prompt biometric when enabling');
  it('should disable without prompt');
  it('should show message if not available');
});
```

### Fraud Detection Mobile Tests

```typescript
describe('FraudDetection (Mobile)', () => {
  describe('getDeviceInfo', () => {
    it('should return device ID');
    it('should return platform');
    it('should return OS version');
    it('should return device model');
    it('should return app version');
    it('should detect emulator');
  });

  describe('checkRooted', () => {
    it('should detect rooted Android');
    it('should detect jailbroken iOS');
    it('should return false for normal device');
  });

  describe('checkMockLocation', () => {
    it('should detect mock location on Android');
    it('should return false on iOS');
  });

  describe('validateLocationIntegrity', () => {
    it('should send location and device info');
    it('should return check result');
    it('should handle API errors');
  });
});

describe('Clock-in with Fraud Detection', () => {
  it('should call fraud check before clock-in');
  it('should block clock-in if check fails');
  it('should show warning message');
  it('should proceed if check passes');
});
```

### i18n Tests

```typescript
describe('i18n Configuration', () => {
  it('should initialize with Indonesian as default');
  it('should load saved language preference');
  it('should have Indonesian translations');
  it('should have English translations');
});

describe('Translation Coverage', () => {
  it('should have all keys in Indonesian');
  it('should have all keys in English');
  it('should not have missing translations');
});

describe('LanguageSelector', () => {
  it('should display available languages');
  it('should highlight current language');
  it('should change language on selection');
  it('should persist selection');
  it('should sync with backend');
});

describe('useTranslation Hook', () => {
  it('should return translated string');
  it('should handle interpolation');
  it('should handle pluralization');
  it('should fallback to key if missing');
});

describe('Date/Number Formatting', () => {
  it('should format date in Indonesian locale');
  it('should format date in English locale');
  it('should format currency in Indonesian');
  it('should format numbers correctly');
});
```

---

## Web Tests

### Fraud Dashboard Tests

```typescript
describe('FraudDashboardPage', () => {
  it('should load fraud statistics');
  it('should display stats cards');
  it('should load fraud logs');
  it('should filter by date range');
  it('should filter by type');
  it('should filter by status');
  it('should search by user');
  it('should paginate results');
});

describe('FraudStatsCards', () => {
  it('should display total alerts');
  it('should display mock location count');
  it('should display velocity anomaly count');
  it('should display device tampering count');
});

describe('FraudLogTable', () => {
  it('should display fraud logs');
  it('should format timestamp');
  it('should show user name');
  it('should show fraud type badge');
  it('should show status badge');
  it('should open detail on row click');
});

describe('FraudDetailModal', () => {
  it('should display fraud details');
  it('should display user info');
  it('should display device info');
  it('should display location info');
  it('should allow status update');
  it('should allow admin notes');
  it('should save changes');
});

describe('FraudTypeBadge', () => {
  it('should render mock_location in red');
  it('should render velocity_anomaly in orange');
  it('should render device_tampering in purple');
});
```

### Device Management Tests

```typescript
describe('DeviceManagementPage', () => {
  it('should load devices');
  it('should filter by user');
  it('should filter by platform');
  it('should filter by trust status');
});

describe('DeviceCard', () => {
  it('should display device info');
  it('should show platform icon');
  it('should show trust status');
  it('should toggle trust on switch');
  it('should remove on button click');
});

describe('AttestationHistoryTable', () => {
  it('should display attestation results');
  it('should show passed/failed status');
  it('should format timestamp');
});
```

---

## Integration Tests

### Apple Sign-In Flow

```typescript
describe('Apple Sign-In Integration', () => {
  it('should sign in new user with Apple');
  it('should sign in existing user with Apple');
  it('should link Apple ID to existing account');
  it('should unlink Apple ID');
  it('should handle token refresh');
});
```

### Biometric Login Flow

```typescript
describe('Biometric Login Integration', () => {
  it('should enable biometric after password login');
  it('should login with biometric on subsequent launch');
  it('should fallback to password on biometric failure');
  it('should disable biometric from settings');
});
```

### Fraud Detection Flow

```typescript
describe('Fraud Detection Integration', () => {
  it('should block clock-in with mock location');
  it('should allow clock-in with valid location');
  it('should log fraud attempt to backend');
  it('should display fraud in admin dashboard');
  it('should update fraud status from admin');
});
```

---

## iOS-Specific Tests

### Device Testing Matrix

| Device | iOS Version | Tests |
|--------|-------------|-------|
| iPhone 14 Pro | iOS 16+ | Face ID, Apple Sign-In |
| iPhone SE (3rd) | iOS 15+ | Touch ID, Apple Sign-In |
| iPhone 8 | iOS 15 | Touch ID |
| iPad Pro | iPadOS 16+ | Face ID, multitasking |

### Feature Matrix

| Feature | Test Scenarios |
|---------|---------------|
| Apple Sign-In | New user, existing user, link, unlink |
| Siri Shortcuts | Donate, activate, clear |
| Face ID | Enable, login, cancel, fail |
| Touch ID | Enable, login, cancel, fail |
| Background Location | App backgrounded, terminated |
| Push Notifications | Foreground, background, tap |

---

## Performance Tests

```typescript
describe('Performance', () => {
  it('app launch should be < 3 seconds');
  it('Apple Sign-In should complete < 5 seconds');
  it('biometric prompt should appear < 500ms');
  it('language switch should be < 1 second');
  it('fraud check should complete < 2 seconds');
});
```

---

## Acceptance Criteria

### iOS Platform
- [ ] App builds on Xcode without errors
- [ ] App runs on iOS simulator
- [ ] App runs on physical iOS device
- [ ] All permissions work correctly
- [ ] Background location works

### Apple Sign-In
- [ ] New user can sign in with Apple
- [ ] Existing user can sign in with Apple
- [ ] Apple ID can be linked to account
- [ ] Apple ID can be unlinked
- [ ] Private email relay works

### Siri Shortcuts
- [ ] Clock-in shortcut activates
- [ ] Clock-out shortcut activates
- [ ] Report shortcut activates
- [ ] Shortcuts appear in Shortcuts app

### Biometric Auth
- [ ] Face ID login works
- [ ] Touch ID login works
- [ ] Can enable from settings
- [ ] Can disable from settings
- [ ] Fallback to password works

### Fraud Detection
- [ ] Mock location detected
- [ ] Velocity anomaly detected
- [ ] Fraud logged to backend
- [ ] Admin dashboard shows logs
- [ ] Admin can review/dismiss

### Internationalization
- [ ] Indonesian translations complete
- [ ] English translations complete
- [ ] Language switch works
- [ ] Preference persists
- [ ] Dates formatted correctly

---

## Sign-Off

| Test Type | Tester | Date | Status |
|-----------|--------|------|--------|
| iOS Build Tests | | | |
| Apple Sign-In Tests | | | |
| Siri Shortcuts Tests | | | |
| Biometric Tests | | | |
| Fraud Detection Tests | | | |
| i18n Tests | | | |
| Web Dashboard Tests | | | |
| Integration Tests | | | |
| Device Testing | | | |
| UAT | | | |

---

**Last Updated:** 2026-01-16
