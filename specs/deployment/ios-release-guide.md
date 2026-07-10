# SEKAR iOS — Release Guide & Mac-execution Runbook

Companion to [`android-release-guide.md`](android-release-guide.md). Covers everything needed to build, sign, and ship the iOS app — and clearly separates **what is already prepared in the repo** from **what must be done on a Mac** (no Mac/iPhone was available during Phase 5 prep).

Bundle id: `com.dlhsurabaya.sekar` · Display name: **SEKAR** · Phase 5-4 (ADR-027).

---

## A. Already prepared in the repo (no Mac needed)

These are committed and ready — a Mac operator does not need to redo them:

- **`Info.plist` permissions** (`apps/mobile/ios/SekarApp/Info.plist`):
  - Location: `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`, `UIBackgroundModes: location`.
  - Media (added Phase 5 — the app uses `react-native-image-picker`): `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSPhotoLibraryAddUsageDescription`. **Without these the app hard-crashes on first camera/photo use and is App-Store-rejected** — they were missing before Phase 5.
  - Biometrics: `NSFaceIDUsageDescription` (for the planned Face ID login).
  - Deep linking: `sekar://` URL scheme.
- **`GoogleService-Info.plist.example`** (`apps/mobile/ios/`) — template for the Firebase iOS config; the real file is gitignored.
- **`.gitignore`** correctly excludes the real `GoogleService-Info.plist` (was previously a malformed pattern that left it un-ignored — fixed Phase 5).
- **FCM bridge deps** present: `@react-native-firebase/app` + `@react-native-firebase/messaging` + `@notifee/react-native`.

## B. Must be done on a Mac (deferred)

Everything below requires macOS + Xcode + a physical device + an Apple Developer Program membership. None can be executed or verified in the current (Linux, no-device) environment.

---

## 1. Prerequisites (Mac)

- macOS with the current Xcode (matching React Native 0.86's required Xcode/iOS SDK).
- CocoaPods: `sudo gem install cocoapods` (or `brew install cocoapods`).
- Apple Developer Program membership (paid) for the team that owns `com.dlhsurabaya.sekar`.
- Node ≥ 24.13 + the repo dependencies installed (`cd apps/mobile && npm install`).

## 2. First-time native setup

```bash
cd apps/mobile
npm install
cd ios && pod install && cd ..          # generates SekarApp.xcworkspace
```
Open **`ios/SekarApp.xcworkspace`** (not the `.xcodeproj`) in Xcode.

Add the real `GoogleService-Info.plist`:
1. Firebase Console → Project settings → iOS app → download `GoogleService-Info.plist`.
2. Drag it into the `SekarApp` target in Xcode ("Copy items if needed").
3. Confirm `BUNDLE_ID` matches `com.dlhsurabaya.sekar`.

## 3. Signing & Capabilities checklist (Xcode → target SekarApp → Signing & Capabilities)

- [ ] **Team** set; **Automatically manage signing** on (or a provisioning profile for the bundle id).
- [ ] **Push Notifications** capability (APNs).
- [ ] **Background Modes** → **Location updates** (matches `UIBackgroundModes: location`) and **Remote notifications**.
- [ ] **Sign in with Apple** capability (for §5 Apple login).
- [ ] **Associated Domains** if universal links are used (the app currently uses the `sekar://` custom scheme; add `applinks:` only if switching to universal links).
- [ ] Face ID usage string present (already in Info.plist).

## 4. APNs (push notifications)

FCM relays to APNs, so the app receives push via Firebase but Apple requires an APNs key:
1. Apple Developer → Certificates, Identifiers & Profiles → **Keys** → create an **APNs Auth Key** (`.p8`). Note the **Key ID** and **Team ID**.
2. Firebase Console → Project settings → **Cloud Messaging** → iOS app → upload the `.p8` with Key ID + Team ID.
3. Ensure the App ID has the **Push Notifications** service enabled.
4. On device, verify `@react-native-firebase/messaging` `getToken()` returns an APNs-backed token and a test push (Firebase console → Cloud Messaging) arrives. (Push does **not** work on the simulator — use a real device.)

Backend already sends via FCM (`FCM_ENABLED=true` + service account) — no backend change needed for iOS delivery beyond a working APNs key in Firebase.

## 5. Apple Sign-In (Phase 5-4 — integration plan)

> Not yet wired in code (it needs a native dependency + on-device testing, both Mac-only). Steps to implement on a Mac:

1. Add the dependency: `npm i @invertase/react-native-apple-authentication`, then `pod install`.
2. Enable the **Sign in with Apple** capability (§3).
3. Frontend: add an "Sign in with Apple" button on the login screen (gate behind `Platform.OS === 'ios'`); on success POST the identity token to the backend.
4. Backend: add `POST /api/v1/auth/apple` — verify the Apple identity token (audience = the app's bundle id / services id, issuer `https://appleid.apple.com`, validate against Apple's public keys), then find-or-link the user and issue the normal SEKAR JWT pair. Mirror the existing `AuthService` token-issuing path. (Spec: history/CHANGELOG.md §D`.)
5. App Store note: Sign in with Apple is **required** by Apple if any other third-party social login is offered.

## 6. Biometric login (Face ID / Touch ID — integration plan)

> Not yet wired. `NSFaceIDUsageDescription` is already in Info.plist.

1. Add `react-native-biometrics` (or `expo-local-authentication` equivalent), then `pod install`.
2. After a successful password login, offer "Enable Face ID"; store the refresh token in `react-native-encrypted-storage` (already a dependency) gated behind a biometric prompt.
3. On next launch, a successful biometric unlock retrieves the stored refresh token and calls the existing refresh endpoint.

## 7. Build → TestFlight → App Store

1. **Version/build:** bump `MARKETING_VERSION` + `CURRENT_PROJECT_VERSION` (Xcode target → General, or the build settings the Info.plist `$()` vars reference).
2. **Archive:** Xcode → Product → Destination "Any iOS Device" → **Product → Archive**.
3. **Validate & upload:** Organizer → Distribute App → App Store Connect → Upload.
4. **TestFlight:** App Store Connect → TestFlight → add internal/external testers; complete the test-information + export-compliance prompts. Field-test the 17-feature parity list (§8) on a real device.
5. **App Store submission:** create the app listing (screenshots for required device sizes, description, keywords, support URL, **privacy policy URL**), fill the **App Privacy** questionnaire (location, camera, photos, identifiers), attach a working **demo account** (e.g. `admin/Password123!` on a reachable backend), then submit for review. Budget ~1–3 days review; location-always usage often draws extra scrutiny — justify it with the shift-tracking description.

## 8. Android → iOS parity checklist (verify on device before submission)

Login (incl. phone login) · clock-in/out with selfie · GPS shift tracking **incl. background/screen-off** (the hardest iOS parity item — verify `allowsBackgroundLocationUpdates` keeps tracking when minimized) · work-report photo/video capture + upload · task workflow · pruning requests · monitoring map · push notifications (foreground + background + tap-to-deep-link via `sekar://`) · notification preferences · offline queue/sync · overtime · schedules · profile/photo · dark mode · biometric login (if shipped) · Apple Sign-In (if shipped) · force-quit/relaunch session restore.

## 9. Known gaps / risks

- **Background location parity** is the top risk: Android uses a Notifee foreground service (shipped Phase 4); iOS relies on `allowsBackgroundLocationUpdates` + the `location` background mode — must be validated on a real device, as the current JS-interval tracker pauses when suspended.
- Apple Sign-In + biometrics are **planned, not implemented** (§5–§6).
- All of §B is unverified until run on a Mac — treat this guide as the execution checklist, not a record of completed work.

See also: ADR-027 (iOS build & distribution), history/CHANGELOG.md, history/CHANGELOG.md §D`.
