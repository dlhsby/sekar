# FCM Push Notification Service

Firebase Cloud Messaging service for handling push notifications in the SEKAR mobile app.

## Installation

Before using this service, install the required dependencies:

```bash
npm install @react-native-firebase/app @react-native-firebase/messaging
```

### iOS Configuration

Add to `ios/Podfile`:

```ruby
use_frameworks! :linkage => :static
```

Install pods:

```bash
cd ios && pod install && cd ..
```

Add GoogleService-Info.plist to your iOS project in Xcode.

### Android Configuration

Add to `android/build.gradle`:

```gradle
buildscript {
  dependencies {
    classpath 'com.google.gms:google-services:4.4.0'
  }
}
```

Add to `android/app/build.gradle`:

```gradle
apply plugin: 'com.google.gms.google-services'
```

Add `google-services.json` to `android/app/`.

## Usage

### 1. Initialize on App Start

Initialize the FCM service when the app starts (after user authentication):

```typescript
import { fcmService } from './services/notifications';
import { store } from './store';

// In your App.tsx or authentication flow
useEffect(() => {
  if (isAuthenticated) {
    fcmService.initialize(store);
  }
}, [isAuthenticated]);
```

### 2. Listen for Foreground Notifications

Handle notifications when app is in foreground:

```typescript
import { fcmService } from './services/notifications';

useEffect(() => {
  const unsubscribe = fcmService.onNotificationReceived((notification) => {
    console.log('Notification received:', notification);

    // Show in-app notification or alert
    Alert.alert(notification.title, notification.body);

    // Navigate to relevant screen based on notification type
    if (notification.type === 'task_assigned') {
      navigation.navigate('TaskDetail', { taskId: notification.data?.task_id });
    }
  });

  return unsubscribe;
}, []);
```

### 3. Listen for Notification Taps

Handle when user taps notification (from background or quit state):

```typescript
import { fcmService } from './services/notifications';

useEffect(() => {
  const unsubscribe = fcmService.onNotificationOpened((notification) => {
    console.log('Notification opened:', notification);

    // Navigate to relevant screen
    if (notification.type === 'task_assigned') {
      navigation.navigate('TaskDetail', { taskId: notification.data?.task_id });
    }
  });

  return unsubscribe;
}, []);
```

### 4. Check Initial Notification (App Opened from Notification)

Check if app was opened from a notification when in quit state:

```typescript
import { fcmService } from './services/notifications';

useEffect(() => {
  fcmService.getInitialNotification().then((notification) => {
    if (notification) {
      console.log('App opened from notification:', notification);
      // Handle navigation
    }
  });
}, []);
```

### 5. Manually Request Permission

You can also manually request permission (useful for onboarding):

```typescript
const requestNotificationPermission = async () => {
  const permission = await fcmService.requestPermission();

  if (permission === NotificationPermission.AUTHORIZED) {
    console.log('Permission granted');
    const token = await fcmService.getToken();
    // Token is automatically registered with backend
  } else {
    console.log('Permission denied');
  }
};
```

### 6. Handle Token Refresh

Listen for token refresh events:

```typescript
import { fcmService } from './services/notifications';

useEffect(() => {
  const unsubscribe = fcmService.onTokenRefresh((newToken) => {
    console.log('FCM token refreshed:', newToken);
    // Token is automatically re-registered with backend
  });

  return unsubscribe;
}, []);
```

### 7. Cleanup on Logout

Clean up FCM when user logs out:

```typescript
const handleLogout = async () => {
  // Unregister token from backend
  await fcmService.unregisterToken();

  // Cleanup listeners
  fcmService.cleanup();

  // Continue with logout
  dispatch(logout());
};
```

## API Reference

### Methods

#### `initialize(store: Store): Promise<void>`
Initialize FCM service with Redux store. Requests permission and registers token automatically.

#### `requestPermission(): Promise<NotificationPermission>`
Request notification permission from user. Returns permission status.

#### `getToken(): Promise<string | null>`
Get current FCM token. Returns null if unavailable.

#### `registerToken(token: string): Promise<boolean>`
Register FCM token with backend. Returns true on success.

#### `unregisterToken(token?: string): Promise<boolean>`
Unregister FCM token from backend. Returns true on success.

#### `onNotificationReceived(handler: NotificationHandler): () => void`
Add listener for foreground notifications. Returns unsubscribe function.

#### `onNotificationOpened(handler: NotificationHandler): () => void`
Add listener for notification taps. Returns unsubscribe function.

#### `getInitialNotification(): Promise<Notification | null>`
Get notification that opened app from quit state.

#### `onTokenRefresh(handler: TokenRefreshHandler): () => void`
Add listener for token refresh events. Returns unsubscribe function.

#### `checkPermission(): Promise<boolean>`
Check if notification permission is granted.

#### `getCurrentToken(): string | null`
Get current FCM token without requesting new one.

#### `getPermissionStatus(): NotificationPermission`
Get current permission status.

#### `deleteToken(): Promise<boolean>`
Delete FCM token from device.

#### `cleanup(): void`
Remove all listeners and cleanup service.

### Types

```typescript
enum NotificationPermission {
  AUTHORIZED = 1,
  DENIED = 0,
  NOT_DETERMINED = -1,
  PROVISIONAL = 2,
}

type NotificationHandler = (notification: Notification) => void;
type TokenRefreshHandler = (token: string) => void;
```

## Redux Integration

The service automatically dispatches Redux actions:

- `setFcmToken(token)` - When token is retrieved or refreshed
- `setPermissionGranted(granted)` - When permission status changes
- `addNotification(notification)` - When notification is received in foreground
- `setError(error)` - When initialization fails

## Background Notifications

Background notifications (when app is in background or quit) are handled by Firebase automatically. The notification will appear in the system tray. When user taps it, the `onNotificationOpened` handler will be called.

To handle background messages in code, you need to register a background handler in `index.js`:

```javascript
import messaging from '@react-native-firebase/messaging';

// Register background handler
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in background', remoteMessage);
});

AppRegistry.registerComponent(appName, () => App);
```

## Testing

Run tests with:

```bash
npm test -- fcmService.test.ts
```

## Troubleshooting

### Token not received
- Check Firebase configuration (google-services.json / GoogleService-Info.plist)
- Verify app is registered in Firebase Console
- Check notification permissions are granted

### Notifications not received
- Test with Firebase Console Cloud Messaging test feature
- Check device is online and app is properly registered
- Verify token is registered with backend API

### iOS notifications not showing
- Ensure APNs certificate is configured in Firebase Console
- Check notification permissions in Settings app
- Verify app is properly code-signed

## See Also

- [Firebase Cloud Messaging Documentation](https://rnfirebase.io/messaging/usage)
- [Backend Notifications API](../../../../../apps/be/src/modules/notifications/)
- [Notifications Redux Slice](../../../store/slices/notificationsSlice.ts)
