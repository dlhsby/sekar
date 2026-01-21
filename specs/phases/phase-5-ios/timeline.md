# Phase 5 - iOS & Advanced Features: Timeline

**Total Duration:** 3 weeks (15 working days)
**Start Date:** After Phase 4 deployment

---

## Overview

| Week | Focus | Deliverables |
|------|-------|--------------|
| Week 1 | iOS Setup & Auth | Build config, Apple Sign-In, Siri |
| Week 2 | Security & i18n | Biometrics, fraud detection, translations |
| Week 3 | Testing & Store | TestFlight, App Store submission |

---

## Week 1: iOS Platform & Authentication

### Day 1: iOS Build Configuration

**Mobile:**
- [ ] Apple Developer Program setup (if not done)
- [ ] Create App ID in Developer portal
- [ ] Enable capabilities (Sign in with Apple, Push, Siri)
- [ ] Create development certificate
- [ ] Create distribution certificate
- [ ] Create provisioning profiles
- [ ] Configure Xcode project
- [ ] Verify CocoaPods installation
- [ ] Build on iOS simulator

**Deliverables:**
- iOS project builds successfully
- Provisioning profiles configured

---

### Day 2: iOS Native Configuration

**Mobile:**
- [ ] Update Info.plist permissions
- [ ] Configure background modes
- [ ] Setup App Groups (if needed)
- [ ] Configure APNs for push notifications
- [ ] Build and test on physical device
- [ ] Fix any platform-specific issues

**Deliverables:**
- App runs on physical iOS device
- All permissions working

---

### Day 3: Apple Sign-In

**Mobile:**
- [ ] Install react-native-apple-authentication
- [ ] Pod install
- [ ] AppleSignInButton component
- [ ] AppleAuthService implementation
- [ ] Handle first-time sign-in (get email/name)
- [ ] Handle returning sign-in

**Backend:**
- [ ] Install apple-signin-auth
- [ ] AppleAuthService backend
- [ ] POST /auth/apple endpoint
- [ ] Link Apple ID to existing account
- [ ] Unit tests

**Deliverables:**
- Apple Sign-In button on login screen
- Backend verifies Apple tokens

---

### Day 4: Siri Shortcuts

**Mobile:**
- [ ] Install react-native-siri-shortcut
- [ ] Pod install
- [ ] Configure Siri capability
- [ ] SiriShortcuts service
- [ ] Donate clock-in shortcut
- [ ] Donate clock-out shortcut
- [ ] Donate report shortcut
- [ ] Handle shortcut activation
- [ ] Deep link navigation

**Deliverables:**
- "Hey Siri, mulai shift" triggers clock-in
- Shortcuts appear in Shortcuts app

---

### Day 5: Backend Security & Review

**Backend:**
- [ ] POST /auth/apple/link endpoint
- [ ] DELETE /auth/apple/unlink endpoint
- [ ] Update user entity (appleId field)
- [ ] Database migration
- [ ] Integration tests
- [ ] API documentation update

**Mobile:**
- [ ] Test Apple Sign-In flow end-to-end
- [ ] Test Siri Shortcuts end-to-end
- [ ] Fix any issues

**Deliverables:**
- Apple Sign-In fully functional
- Siri Shortcuts working

---

## Week 2: Security Features & Internationalization

### Day 6: Biometric Authentication

**Mobile:**
- [ ] Install react-native-biometrics
- [ ] Pod install
- [ ] BiometricAuth service
- [ ] Check biometric availability
- [ ] Face ID / Touch ID prompt
- [ ] Biometric login flow
- [ ] Settings toggle for biometric
- [ ] Secure token storage

**Deliverables:**
- Face ID / Touch ID login works
- Settings to enable/disable

---

### Day 7: Fraud Detection Mobile

**Mobile:**
- [ ] FraudDetection service
- [ ] Device info collection
- [ ] Emulator detection
- [ ] Root/jailbreak detection (basic)
- [ ] Mock location detection (Android)
- [ ] Integrate with clock-in flow
- [ ] Show warning for suspicious activity

**Deliverables:**
- Device info sent with location requests
- Warning shown for suspicious activity

---

### Day 8: Fraud Detection Backend

**Backend:**
- [ ] Create fraud-detection module
- [ ] FraudLog entity
- [ ] DeviceFingerprint entity
- [ ] Database migration
- [ ] FraudDetectionService
- [ ] Mock location detection
- [ ] Velocity anomaly detection
- [ ] POST /fraud/check-location endpoint
- [ ] Unit tests

**Deliverables:**
- Backend validates location integrity
- Fraud attempts logged

---

### Day 9: Fraud Admin & Attestation

**Backend:**
- [ ] GET /fraud/logs endpoint (Admin)
- [ ] PATCH /fraud/logs/:id endpoint
- [ ] GET /fraud/stats endpoint
- [ ] App attestation challenge generation
- [ ] iOS App Attest verification (basic)
- [ ] GET /auth/devices endpoint
- [ ] DELETE /auth/devices/:id endpoint

**Web:**
- [ ] Fraud dashboard page
- [ ] Fraud logs table
- [ ] Fraud detail modal
- [ ] Review/dismiss actions

**Deliverables:**
- Admin can view fraud logs
- Admin can review/dismiss alerts

---

### Day 10: Internationalization

**Mobile:**
- [ ] Install i18next and react-i18next
- [ ] Create i18n configuration
- [ ] Extract strings from all screens
- [ ] Create id.json (Indonesian)
- [ ] Create en.json (English)
- [ ] LanguageSelector component
- [ ] Persist language preference
- [ ] Sync with backend
- [ ] Date/number formatting

**Backend:**
- [ ] PUT /users/me/language endpoint
- [ ] Store language preference

**Deliverables:**
- App supports Indonesian and English
- Language persists across sessions

---

## Week 3: Testing & App Store

### Day 11: Web Admin Features

**Web:**
- [ ] Device management page
- [ ] Device list table
- [ ] Toggle device trust
- [ ] Remove device
- [ ] User fraud history section
- [ ] Navigation updates

**Deliverables:**
- Device management functional
- All admin features complete

---

### Day 12: iOS Testing

**Mobile:**
- [ ] Test Apple Sign-In on multiple devices
- [ ] Test Siri Shortcuts on multiple devices
- [ ] Test Face ID on iPhone X+
- [ ] Test Touch ID on older devices
- [ ] Test biometric fallback
- [ ] Test fraud detection scenarios
- [ ] Test language switching
- [ ] Test all screens in both languages
- [ ] Performance testing
- [ ] Memory leak testing

**Deliverables:**
- All iOS features tested
- Bug list documented

---

### Day 13: Bug Fixes & App Store Prep

**Mobile:**
- [ ] Fix all critical bugs
- [ ] Fix all major bugs
- [ ] App Store screenshots (6.7")
- [ ] App Store screenshots (6.5")
- [ ] App Store screenshots (5.5")
- [ ] App icon (all sizes)
- [ ] App description (Indonesian)
- [ ] App description (English)
- [ ] Privacy policy URL
- [ ] Keywords

**Deliverables:**
- All bugs fixed
- App Store assets ready

---

### Day 14: TestFlight

**Mobile:**
- [ ] Create archive build
- [ ] Upload to App Store Connect
- [ ] Submit for TestFlight review
- [ ] Internal testing group
- [ ] Beta testing group (external)
- [ ] Collect feedback
- [ ] Fix beta issues

**Deliverables:**
- TestFlight build available
- Beta testers can access

---

### Day 15: App Store Submission

**Mobile:**
- [ ] Address beta feedback
- [ ] Final bug fixes
- [ ] Create release build
- [ ] Complete App Store listing
- [ ] Submit for App Store review
- [ ] Prepare review notes
- [ ] Test account for reviewers

**Documentation:**
- [ ] Update README with iOS setup
- [ ] Update CLAUDE.md
- [ ] Phase 5 sign-off

**Deliverables:**
- App submitted to App Store
- Awaiting Apple review

---

## Parallel Work Streams

```
Week 1:
Mobile:  iOS Build → Apple Sign-In → Siri Shortcuts
         ──────────────────────────────────────────→
Backend:              Apple Auth → Unit Tests
                      ────────────────────────→

Week 2:
Mobile:  Biometrics → Fraud Detection → i18n
         ────────────────────────────────────→
Backend: Fraud Module → Admin Endpoints
         ────────────────────────────────→
Web:                   Fraud Dashboard → Devices
                       ─────────────────────────→

Week 3:
Mobile:  iOS Testing → Bug Fixes → TestFlight → Submit
         ────────────────────────────────────────────→
Web:     Admin Polish → Testing
         ────────────────────────→
```

---

## Dependencies

| Task | Depends On |
|------|------------|
| Apple Sign-In Mobile | iOS build configured |
| Apple Sign-In Backend | Apple Developer account |
| Siri Shortcuts | iOS build configured |
| Biometric Login | Token storage setup |
| Fraud Dashboard Web | Fraud Detection Backend |
| TestFlight | Apple Developer account |
| App Store Submission | TestFlight approved |

---

## Risk Mitigation

| Risk | Mitigation | Day |
|------|------------|-----|
| Apple Developer issues | Start enrollment early | Day 1 |
| Certificate problems | Document all steps | Day 1-2 |
| Apple Sign-In complexity | Follow Apple docs closely | Day 3 |
| Siri integration issues | Have fallback (manual) | Day 4 |
| App Store rejection | Prepare thorough review notes | Day 15 |
| Translation quality | Have native speakers review | Day 10 |

---

## Milestones

| Milestone | Target Day | Success Criteria |
|-----------|------------|------------------|
| iOS Build Working | Day 2 | Runs on physical device |
| Apple Sign-In Working | Day 3 | Can sign in with Apple ID |
| Siri Shortcuts Working | Day 4 | Voice command triggers action |
| Biometric Auth Working | Day 6 | Face ID/Touch ID login |
| Fraud Detection Working | Day 8 | Mock location blocked |
| i18n Complete | Day 10 | ID/EN translations |
| TestFlight Build | Day 14 | Beta testers can access |
| App Store Submitted | Day 15 | Pending Apple review |

---

## Resource Allocation

| Role | Week 1 | Week 2 | Week 3 |
|------|--------|--------|--------|
| Mobile Developer | Full time | Full time | Full time |
| Backend Developer | 2 days | 2 days | Support |
| Web Developer | - | 2 days | 1 day |
| QA Engineer | - | - | 3 days |

---

## App Store Checklist

### Pre-Submission
- [ ] App ID registered
- [ ] Certificates valid
- [ ] Provisioning profiles valid
- [ ] Screenshots captured (3 sizes)
- [ ] App icon uploaded
- [ ] Description written
- [ ] Keywords optimized
- [ ] Privacy policy live
- [ ] Support URL live
- [ ] Age rating set
- [ ] Test account ready

### Submission
- [ ] Archive created
- [ ] Build uploaded
- [ ] App Store listing complete
- [ ] Review notes added
- [ ] Submitted for review

---

**Last Updated:** 2026-01-16
