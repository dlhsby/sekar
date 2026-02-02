# Phase 4: iOS Platform Guide

**Component:** iOS Platform Support
**Developer Role:** Mobile Developer (iOS)
**Duration:** 2-4 weeks

---

## Overview

iOS platform support includes Apple Sign-In, Siri Shortcuts, APNs push notifications, App Attest security, and App Store submission.

---

## iOS-Specific Features

### 1. Apple Sign-In (Required by App Store)

**Package:** `@invertase/react-native-apple-authentication`

**Features:**
- Apple ID authentication
- User privacy protection
- Email relay option
- Fast authentication

**Backend Integration:**
- Apple ID token verification
- User account linking
- Email fallback handling

### 2. Siri Shortcuts

**Package:** `react-native-siri-shortcut`

**Shortcuts to Implement:**
- "Mulai Shift Kerja" (Start work shift)
- "Buat Laporan" (Create report)
- "Lihat Tugas" (View tasks)

### 3. APNs Push Notifications

**Requirements:**
- APNs certificate from Apple Developer
- Firebase Cloud Messaging configured
- Device token registration

**Notification Types:**
- Task assignments
- Shift reminders
- Report approvals
- System alerts

### 4. App Attest (Fraud Prevention)

**Purpose:**
- Verify app authenticity
- Prevent modified/jailbroken apps
- Protect API from unauthorized access

**Implementation:**
- Attestation on first launch
- Periodic assertions
- Backend verification

---

## App Store Requirements

### App Information

- **Name:** SEKAR - Sistem Evaluasi Kerja
- **Category:** Productivity
- **Age Rating:** 4+
- **Price:** Free

### Screenshots Required

- 6.7" (iPhone 14 Pro Max): 5 screenshots
- 6.5" (iPhone 11 Pro Max): 5 screenshots  
- 5.5" (iPhone 8 Plus): 5 screenshots

### Privacy Information

**Data Collection:**
- Location data (for attendance)
- Camera (for reports/photos)
- Photos (optional, for reports)
- User account data

**Data Usage:**
- Location used only during work shifts
- Photos attached to work reports
- No data sharing with third parties

### App Review Notes

```
Test Account:
Username: supervisor_test
Password: test123

Special Instructions:
- App requires GPS location for worker attendance
- Workers must be within 100m of assigned area to clock in
- Location tracking only active during work shifts
- QR scanner requires camera permission for asset management
```

---

## TestFlight Beta Testing

### Setup

1. Create App Store Connect app
2. Upload build via Xcode
3. Configure beta test groups
4. Invite internal/external testers

### Test Groups

- **Internal:** Development team (up to 100)
- **External:** DLH Surabaya staff (up to 10,000)

### Beta Testing Checklist

- [ ] All features work identically to Android
- [ ] Apple Sign-In functional
- [ ] Push notifications delivered
- [ ] Siri Shortcuts work
- [ ] No crashes reported
- [ ] GPS accuracy verified
- [ ] QR scanner works
- [ ] App Store screenshots prepared

---

## App Store Submission

### Pre-Submission Checklist

- [ ] All Apple Review Guidelines followed
- [ ] Privacy policy URL added
- [ ] Support URL added
- [ ] App screenshots uploaded
- [ ] App description written (Indonesian + English)
- [ ] Keywords optimized
- [ ] App icon finalized (1024x1024)
- [ ] Test account provided

### Submission Process

1. Archive app in Xcode
2. Upload to App Store Connect
3. Fill app information
4. Submit for review
5. Respond to Apple feedback (if any)
6. Release app (manual or automatic)

**Typical Review Time:** 1-3 days

---

## Platform Differences

| Feature | Android | iOS | Notes |
|---------|---------|-----|-------|
| **Location** | ACCESS_FINE_LOCATION | NSLocationAlwaysUsageDescription | Permissions differ |
| **Camera** | CAMERA permission | NSCameraUsageDescription | Must explain usage |
| **Notifications** | FCM | APNs + FCM | Dual setup needed |
| **Sign-In** | Google Sign-In (optional) | Apple Sign-In (required) | Apple mandates if Google exists |
| **Background Location** | Foreground service | Background modes | iOS more restrictive |
| **Biometric** | Fingerprint API | Touch ID / Face ID | Use same library |

---

## Related Documentation

- [Backend Implementation](./backend.md)
- [Mobile Implementation](./mobile.md)
- [Web Implementation](./web.md)
- [Testing Guide](./testing.md)
- [Timeline](./timeline.md)
