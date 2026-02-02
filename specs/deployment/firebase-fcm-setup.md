# Firebase Cloud Messaging (FCM) Setup Guide

**Purpose:** Enable push notifications for the SEKAR mobile app (Android & iOS)

**Estimated Time:** 20 minutes (after Firebase project is created)

**Status:** ✅ IMPLEMENTED (January 31, 2026) - Backend uses HTTP v1 API with Firebase Admin SDK

**Implementation Summary:**
- ✅ Backend: Firebase Admin SDK integrated with real FCM implementation
- ✅ Mobile: Firebase packages installed, background handler configured
- ✅ Service Account: Downloaded and configured in `be/config/firebase-service-account.json`
- ✅ Environment: FCM_ENABLED=true in backend .env

---

## Prerequisites

- Firebase Console access (https://console.firebase.google.com)
- Google account with Firebase project creation permissions
- Android Studio (for Android)
- Xcode (for iOS, macOS only)
- Physical Android/iOS devices for testing (FCM doesn't work on emulators)

---

## Step 1: Create Firebase Project

### 1.1 Create Project in Firebase Console

1. Go to https://console.firebase.google.com
2. Click "Add project" or "Create a project"
3. Project name: **SEKAR-Production**
4. (Optional) Enable Google Analytics
5. Click "Create project"
6. Wait for project creation (~30 seconds)

### 1.2 Upgrade to Blaze Plan (Optional but Recommended)

- Free tier sufficient for development/staging
- Blaze plan required for production scale (>100K messages/month)
- Upgrade in Project Settings → Usage and billing

---

## Step 2: Register Android App

### 2.1 Add Android App to Firebase Project

1. In Firebase Console, go to Project Overview
2. Click "Add app" → Select Android icon
3. Fill in registration form:
   - **Android package name:** `com.sekar` (must match `android/app/build.gradle`)
   - **App nickname:** SEKAR Mobile Android
   - **Debug signing certificate SHA-1:** (optional for development)
4. Click "Register app"

### 2.2 Download google-services.json

1. Download `google-services.json` file
2. Place it in: `fe/mobile/android/app/google-services.json`

```bash
cd fe/mobile
# Ensure file is in correct location
ls -la android/app/google-services.json
```

### 2.3 Verify android/build.gradle

Ensure Firebase plugin is added (should already be there):

```gradle
// android/build.gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.3.15'
    }
}
```

### 2.4 Verify android/app/build.gradle

Ensure plugin is applied (should already be there):

```gradle
// android/app/build.gradle
apply plugin: 'com.android.application'
apply plugin: 'com.google.gms.google-services'  // ← Add this line if missing
```

---

## Step 3: Register iOS App

### 3.1 Add iOS App to Firebase Project

1. In Firebase Console, click "Add app" → Select iOS icon
2. Fill in registration form:
   - **iOS bundle ID:** `org.sekar.mobile` (must match Xcode project)
   - **App nickname:** SEKAR Mobile iOS
   - **App Store ID:** (optional, leave blank for now)
3. Click "Register app"

### 3.2 Download GoogleService-Info.plist

1. Download `GoogleService-Info.plist` file
2. Open Xcode: `fe/mobile/ios/sekar.xcworkspace`
3. Drag `GoogleService-Info.plist` into Xcode project navigator
4. Ensure "Copy items if needed" is checked
5. Select target: sekar

```bash
cd fe/mobile/ios
# Verify file is in project
ls -la GoogleService-Info.plist
```

### 3.3 Enable Push Notifications in Xcode

1. Open `fe/mobile/ios/sekar.xcworkspace` in Xcode
2. Select project in navigator → Target "sekar"
3. Go to "Signing & Capabilities" tab
4. Click "+ Capability"
5. Add "Push Notifications"
6. Add "Background Modes"
7. Enable "Remote notifications" checkbox

### 3.4 Upload APNs Certificate (Production Only)

For production, you need an Apple Push Notification service (APNs) certificate:

1. Go to Apple Developer Portal
2. Create APNs Auth Key or Certificate
3. Upload to Firebase Console:
   - Project Settings → Cloud Messaging → iOS app configuration
   - Upload APNs Auth Key (.p8 file) or APNs Certificate

---

## Step 4: Install Firebase Packages

### 4.1 Install NPM Packages

```bash
cd fe/mobile

# Install Firebase packages
npm install @react-native-firebase/app@^18.0.0
npm install @react-native-firebase/messaging@^18.0.0

# Install Notifee for local notifications (optional but recommended)
npm install @notifee/react-native@^7.8.0
```

### 4.2 Install iOS Pods

```bash
cd ios
pod install
cd ..
```

### 4.3 Verify Installation

```bash
# Check package.json
grep "firebase" package.json

# Expected output:
# "@react-native-firebase/app": "^18.0.0",
# "@react-native-firebase/messaging": "^18.0.0",
```

---

## Step 5: Update Mobile App Code

### 5.1 Remove Mock from fcmService.ts

**File:** `fe/mobile/src/services/notifications/fcmService.ts`

**Before (Mocked):**
```typescript
// Current implementation uses mock
export const fcmService = {
  initialize: jest.fn(),
  requestPermission: jest.fn(),
  getToken: jest.fn(),
  // ... other mocked methods
};
```

**After (Real Implementation):**
```typescript
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { apiClient } from '../api/apiClient';

class FCMService {
  async initialize(): Promise<void> {
    // Request permission
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log('FCM permission not granted');
      return;
    }

    // Get FCM token
    const token = await messaging().getToken();
    console.log('FCM Token:', token);

    // Register token with backend
    await this.registerToken(token);

    // Listen for token refresh
    messaging().onTokenRefresh(async (newToken) => {
      await this.registerToken(newToken);
    });

    // Handle foreground messages
    messaging().onMessage(async (remoteMessage) => {
      console.log('Foreground message:', remoteMessage);
      await this.displayNotification(remoteMessage);
    });

    // Handle background messages
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Background message:', remoteMessage);
    });
  }

  async requestPermission(): Promise<boolean> {
    const authStatus = await messaging().requestPermission();
    return (
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL
    );
  }

  async getToken(): Promise<string | null> {
    try {
      return await messaging().getToken();
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  async registerToken(token: string): Promise<void> {
    try {
      await apiClient.post('/notifications/register', {
        token,
        platform: Platform.OS,
      });
      console.log('Token registered with backend');
    } catch (error) {
      console.error('Error registering token:', error);
    }
  }

  async unregisterToken(): Promise<void> {
    try {
      const token = await this.getToken();
      if (token) {
        await apiClient.delete('/notifications/unregister', { data: { token } });
      }
    } catch (error) {
      console.error('Error unregistering token:', error);
    }
  }

  async displayNotification(remoteMessage: any): Promise<void> {
    // Use Notifee for better notification display
    // Implementation depends on notification type
    console.log('Display notification:', remoteMessage);
  }

  setupNotificationHandlers(): void {
    // Handle notification opened app (from quit state)
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('Notification opened app from quit state:', remoteMessage);
          // Handle deep linking
        }
      });

    // Handle notification opened app (from background state)
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification opened app from background:', remoteMessage);
      // Handle deep linking
    });
  }
}

export const fcmService = new FCMService();
```

### 5.2 Initialize FCM in App.tsx

**File:** `fe/mobile/App.tsx`

Add FCM initialization:

```typescript
import { fcmService } from './src/services/notifications/fcmService';

function App() {
  useEffect(() => {
    // Initialize FCM
    fcmService.initialize().catch(console.error);
    fcmService.setupNotificationHandlers();
  }, []);

  // ... rest of app
}
```

### 5.3 Update Tests

**File:** `fe/mobile/src/services/notifications/__tests__/fcmService.test.ts`

Update tests to use real implementation:

```typescript
// Mock @react-native-firebase/messaging
jest.mock('@react-native-firebase/messaging', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    requestPermission: jest.fn(() => Promise.resolve(1)),
    getToken: jest.fn(() => Promise.resolve('mock-token')),
    onTokenRefresh: jest.fn(),
    onMessage: jest.fn(),
    setBackgroundMessageHandler: jest.fn(),
    getInitialNotification: jest.fn(() => Promise.resolve(null)),
    onNotificationOpenedApp: jest.fn(),
  })),
}));

// ... rest of tests
```

---

## Step 6: Backend Configuration

### 6.1 Get FCM Server Key

1. In Firebase Console, go to Project Settings
2. Go to "Cloud Messaging" tab
3. Copy "Server key" (legacy) or create new "Cloud Messaging API key"

### 6.2 Store in AWS Secrets Manager

```bash
# Store FCM server key in Secrets Manager
aws secretsmanager create-secret \
  --name sekar/fcm-server-key \
  --description "Firebase Cloud Messaging server key for SEKAR" \
  --secret-string "YOUR_FCM_SERVER_KEY" \
  --region ap-southeast-3
```

### 6.3 Update Backend Environment Variables

**File:** `be/.env.production`

```bash
# FCM Configuration
FCM_ENABLED=true
FCM_SERVER_KEY=<from-aws-secrets-manager>
```

### 6.4 Update Backend Code (if needed)

Backend notification service should already be set up. Verify:

**File:** `be/src/modules/notifications/notifications.service.ts`

Should have FCM integration using Firebase Admin SDK.

---

## Step 7: Testing

### 7.1 Test on Physical Android Device

```bash
# Build and install
cd fe/mobile
npm run android

# Or build release APK
cd android
./gradlew assembleRelease
adb install app/build/outputs/apk/release/app-release.apk
```

**Test Steps:**
1. Open app on device
2. Login as worker
3. Check logs for FCM token: `adb logcat | grep FCM`
4. Verify token registered with backend
5. From backend/Postman, send test notification:
   ```bash
   POST /api/v1/notifications/send
   {
     "userId": "worker-uuid",
     "title": "Test Notification",
     "body": "This is a test",
     "data": { "type": "test" }
   }
   ```
6. Verify notification appears on device

### 7.2 Test on Physical iOS Device (macOS only)

```bash
# Build and install via Xcode
cd fe/mobile/ios
open sekar.xcworkspace

# In Xcode:
# 1. Select device (not simulator)
# 2. Click Run (⌘R)
```

**Test Steps:**
1. Allow notifications when prompted
2. Check Xcode console for FCM token
3. Send test notification from backend
4. Verify notification appears on device

### 7.3 Test Scenarios

**Foreground Notifications:**
- [ ] App open, notification received
- [ ] Notification displayed in-app
- [ ] Tapping notification navigates correctly

**Background Notifications:**
- [ ] App in background, notification received
- [ ] Notification appears in system tray
- [ ] Tapping notification opens app to correct screen

**Killed State Notifications:**
- [ ] App closed, notification received
- [ ] Notification appears in system tray
- [ ] Tapping notification launches app

**Deep Linking:**
- [ ] Task notification → opens TaskDetailScreen
- [ ] Report notification → opens ReportDetailScreen
- [ ] Generic notification → opens home screen

---

## Step 8: Production Deployment

### 8.1 Update CI/CD Pipeline

**File:** `.github/workflows/mobile-ci-cd.yml`

Ensure Firebase config files are included in builds:

```yaml
- name: Build Android APK
  run: |
    cd fe/mobile/android
    # Ensure google-services.json exists
    if [ ! -f app/google-services.json ]; then
      echo "Error: google-services.json not found"
      exit 1
    fi
    ./gradlew assembleRelease
```

### 8.2 Security Considerations

**DO NOT commit to git:**
- ❌ `google-services.json`
- ❌ `GoogleService-Info.plist`
- ❌ FCM server keys

**Instead:**
- Store in GitHub Secrets for CI/CD
- Download from secure location during deployment
- Add to `.gitignore`:

```gitignore
# Firebase
google-services.json
GoogleService-Info.plist
```

### 8.3 Monitoring

**Set up CloudWatch alarms for:**
- FCM token registration failures
- Notification delivery failures
- FCM service errors

**Log important events:**
```typescript
console.log('[FCM] Token registered:', token);
console.log('[FCM] Notification received:', notification);
console.log('[FCM] Error:', error);
```

---

## Troubleshooting

### Issue: FCM token not generated

**Solution:**
- Verify `google-services.json` / `GoogleService-Info.plist` are in correct locations
- Check Firebase project configuration
- Ensure app package name matches Firebase configuration
- Try uninstalling and reinstalling the app

### Issue: Notifications not received

**Solution:**
- Verify FCM token is registered with backend
- Check backend logs for notification sending errors
- Verify FCM server key is correct
- Test with Firebase Console "Cloud Messaging" → "Send test message"

### Issue: iOS notifications not working

**Solution:**
- Verify APNs certificate is uploaded to Firebase
- Check Xcode capabilities (Push Notifications enabled)
- Ensure device has internet connection
- Check iOS notification permissions in Settings

### Issue: Android notifications not appearing

**Solution:**
- Check Android notification channel settings
- Verify app has notification permissions
- Test with Notifee for better notification display
- Check device Do Not Disturb settings

---

## Next Steps After FCM Setup

1. **Update Documentation:**
   - Mark Phase 2E FCM setup as complete
   - Update `specs/phases/phase-2-enhanced/status_progress.md`

2. **Test Thoroughly:**
   - Test all notification types (task, report, shift)
   - Test on multiple devices (Android, iOS)
   - Test different notification scenarios (foreground, background, killed)

3. **Monitor in Production:**
   - Watch CloudWatch logs for FCM errors
   - Track notification delivery rates
   - Monitor token registration success rates

---

## Reference Links

- Firebase Console: https://console.firebase.google.com
- React Native Firebase Docs: https://rnfirebase.io
- FCM Documentation: https://firebase.google.com/docs/cloud-messaging
- Notifee Documentation: https://notifee.app/react-native/docs/overview
- Apple Developer Portal: https://developer.apple.com
- FCM API Reference: https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages

---

**Estimated Completion Time:** 20 minutes (after Firebase project created)

**Status:** Ready for implementation - Awaiting Firebase project creation in Firebase Console

---

## ✅ Fixed: Foreground Notifications (January 31, 2026)

**Issue:** Notifications received but not showing in device tray when app is in foreground.

**Root Cause:** Firebase doesn't auto-display foreground notifications. Must use `@notifee/react-native`.

**Fix Applied:**
1. Added `notifee` import to `fcmService.ts`
2. Created Android notification channel on initialization
3. Added `notifee.displayNotification()` in foreground message handler

**After rebuilding, foreground notifications now appear in system tray.**

