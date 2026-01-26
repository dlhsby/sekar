# Phase 2C Services Integration Guide

This guide shows how to integrate FCM Push Notifications and WebSocket real-time services in the SEKAR mobile app.

## Overview

Phase 2C introduces two real-time communication services:

1. **FCM Service** (`services/notifications/fcmService.ts`) - Firebase Cloud Messaging for push notifications
2. **WebSocket Service** (`services/websocket/websocketService.ts`) - Socket.IO client for real-time events

## Installation

### Step 1: Install Dependencies

```bash
# Firebase Cloud Messaging
npm install @react-native-firebase/app @react-native-firebase/messaging

# Socket.IO Client
npm install socket.io-client

# Link native modules (React Native <0.60)
cd ios && pod install && cd ..
```

### Step 2: Configure Firebase

#### iOS
1. Download `GoogleService-Info.plist` from Firebase Console
2. Add to iOS project in Xcode
3. Add to `ios/Podfile`: `use_frameworks! :linkage => :static`
4. Run `cd ios && pod install`

#### Android
1. Download `google-services.json` from Firebase Console
2. Place in `android/app/`
3. Add to `android/build.gradle`:
   ```gradle
   dependencies {
     classpath 'com.google.gms:google-services:4.4.0'
   }
   ```
4. Add to `android/app/build.gradle`:
   ```gradle
   apply plugin: 'com.google.gms.google-services'
   ```

## Integration in App.tsx

### Complete Example

```typescript
import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { fcmService } from './services/notifications';
import { websocketService, ConnectionState } from './services/websocket';
import { store } from './store';
import type { RootState } from './store';

function App() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const user = useSelector((state: RootState) => state.auth.user);

  /**
   * Initialize FCM on authentication
   */
  useEffect(() => {
    if (!isAuthenticated) return;

    console.log('Initializing FCM service');
    fcmService.initialize(store);

    return () => {
      fcmService.cleanup();
    };
  }, [isAuthenticated]);

  /**
   * Connect WebSocket on authentication
   */
  useEffect(() => {
    if (!isAuthenticated) return;

    console.log('Connecting to WebSocket');
    websocketService.connect().then((connected) => {
      if (connected) {
        console.log('WebSocket connected');

        // Subscribe to relevant rooms based on user role
        if (user?.role === 'Supervisor' || user?.role === 'KepalaRayon') {
          // Supervisors can subscribe to areas or rayons they manage
          // This would come from user data
          if (user.managed_areas) {
            user.managed_areas.forEach((areaId: string) => {
              websocketService.subscribeToArea(areaId);
            });
          }
        }
      } else {
        console.warn('WebSocket connection failed');
      }
    });

    return () => {
      websocketService.disconnect();
    };
  }, [isAuthenticated, user]);

  /**
   * Handle foreground notifications
   */
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = fcmService.onNotificationReceived((notification) => {
      console.log('Foreground notification:', notification);

      // Show in-app alert
      Alert.alert(
        notification.title,
        notification.body,
        [
          {
            text: 'Lihat',
            onPress: () => handleNotificationNavigation(notification),
          },
          { text: 'Tutup', style: 'cancel' },
        ]
      );
    });

    return unsubscribe;
  }, [isAuthenticated]);

  /**
   * Handle notification taps (background/quit state)
   */
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = fcmService.onNotificationOpened((notification) => {
      console.log('Notification opened:', notification);
      handleNotificationNavigation(notification);
    });

    return unsubscribe;
  }, [isAuthenticated]);

  /**
   * Check for initial notification (app opened from quit state)
   */
  useEffect(() => {
    if (!isAuthenticated) return;

    fcmService.getInitialNotification().then((notification) => {
      if (notification) {
        console.log('App opened from notification:', notification);
        handleNotificationNavigation(notification);
      }
    });
  }, [isAuthenticated]);

  /**
   * Handle notification navigation
   */
  const handleNotificationNavigation = (notification: any) => {
    const { type, data } = notification;

    switch (type) {
      case 'task_assigned':
        navigation.navigate('TaskDetail', { taskId: data?.task_id });
        break;

      case 'shift_reminder':
        navigation.navigate('WorkerHome');
        break;

      case 'area_alert':
        navigation.navigate('MapDashboard', { areaId: data?.area_id });
        break;

      default:
        // Show notification list screen
        navigation.navigate('Notifications');
    }
  };

  /**
   * Monitor WebSocket connection health
   */
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      const state = websocketService.getConnectionState();

      if (state === ConnectionState.ERROR || state === ConnectionState.DISCONNECTED) {
        console.warn('WebSocket disconnected, attempting reconnect');
        websocketService.reconnect();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  return (
    <NavigationContainer>
      {/* Your app navigation */}
    </NavigationContainer>
  );
}

export default App;
```

## Worker Screen Integration

### WorkerHomeScreen - Real-time Task Assignments

```typescript
import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import { websocketService } from '../../services/websocket';
import { fetchTasks } from '../../store/slices/tasksSlice';

function WorkerHomeScreen() {
  const dispatch = useDispatch();

  /**
   * Listen for task assignments
   */
  useEffect(() => {
    const unsubscribe = websocketService.onTaskAssigned((event) => {
      console.log('New task assigned:', event);

      // Show alert
      Alert.alert(
        'Tugas Baru',
        `Anda mendapat tugas: ${event.title}\nPrioritas: ${event.priority}`,
        [
          {
            text: 'Lihat',
            onPress: () => navigation.navigate('TaskDetail', { taskId: event.task_id }),
          },
          { text: 'Nanti', style: 'cancel' },
        ]
      );

      // Refresh task list
      dispatch(fetchTasks());
    });

    return unsubscribe;
  }, [dispatch]);

  return (
    // Your component JSX
  );
}
```

## Supervisor Screen Integration

### MapDashboardScreen - Real-time Worker Tracking

```typescript
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import MapView, { Marker } from 'react-native-maps';
import { websocketService, type WorkerLocationEvent } from '../../services/websocket';

function MapDashboardScreen({ route }) {
  const { areaId } = route.params;
  const [workers, setWorkers] = useState<Map<string, WorkerLocationEvent>>(new Map());

  /**
   * Subscribe to area events
   */
  useEffect(() => {
    if (!websocketService.isConnected()) {
      console.warn('WebSocket not connected');
      return;
    }

    // Subscribe to area
    websocketService.subscribeToArea(areaId);

    return () => {
      websocketService.unsubscribeFromArea(areaId);
    };
  }, [areaId]);

  /**
   * Listen for worker location updates
   */
  useEffect(() => {
    const unsubscribe = websocketService.onWorkerLocation((event) => {
      console.log('Worker location update:', event.worker_name);

      setWorkers((prev) => {
        const updated = new Map(prev);
        updated.set(event.worker_id, event);
        return updated;
      });
    });

    return unsubscribe;
  }, []);

  /**
   * Listen for clock-in/out events
   */
  useEffect(() => {
    const unsubscribeClockIn = websocketService.onWorkerClockIn((event) => {
      console.log('Worker clocked in:', event.worker_name);

      // Add worker to map
      setWorkers((prev) => {
        const updated = new Map(prev);
        updated.set(event.worker_id, {
          ...event,
          latitude: event.latitude,
          longitude: event.longitude,
        } as WorkerLocationEvent);
        return updated;
      });

      showToast(`${event.worker_name} telah clock-in`);
    });

    const unsubscribeClockOut = websocketService.onWorkerClockOut((event) => {
      console.log('Worker clocked out:', event.worker_name);

      // Remove worker from map
      setWorkers((prev) => {
        const updated = new Map(prev);
        updated.delete(event.worker_id);
        return updated;
      });

      showToast(`${event.worker_name} telah clock-out (${event.duration_minutes} menit)`);
    });

    return () => {
      unsubscribeClockIn();
      unsubscribeClockOut();
    };
  }, []);

  /**
   * Listen for area staffing changes
   */
  useEffect(() => {
    const unsubscribe = websocketService.onAreaStaffing((event) => {
      console.log('Area staffing update:', event);

      // Update dashboard stats
      setAreaStats({
        required: event.workers_required,
        online: event.workers_online,
        offline: event.workers_offline,
        isFullyStaffed: event.is_fully_staffed,
      });

      // Show alert if understaffed
      if (!event.is_fully_staffed && event.staffing_delta < -2) {
        Alert.alert(
          'Peringatan Kekurangan Pekerja',
          `${event.area_name} kekurangan ${Math.abs(event.staffing_delta)} pekerja`
        );
      }
    });

    return unsubscribe;
  }, []);

  return (
    <MapView>
      {Array.from(workers.values()).map((worker) => (
        <Marker
          key={worker.worker_id}
          coordinate={{
            latitude: worker.latitude,
            longitude: worker.longitude,
          }}
          title={worker.worker_name}
        />
      ))}
    </MapView>
  );
}
```

## Logout Flow

### Handle Cleanup on Logout

```typescript
import { fcmService } from './services/notifications';
import { websocketService } from './services/websocket';

const handleLogout = async () => {
  try {
    // Unregister FCM token
    await fcmService.unregisterToken();

    // Cleanup FCM listeners
    fcmService.cleanup();

    // Disconnect WebSocket
    websocketService.disconnect();

    // Clear auth state
    dispatch(logout());

    // Navigate to login
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  } catch (error) {
    console.error('Logout error:', error);
  }
};
```

## Background Message Handler (index.js)

Add this to your `index.js` before `AppRegistry.registerComponent`:

```javascript
import messaging from '@react-native-firebase/messaging';

// Register background handler
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Background notification received:', remoteMessage);

  // Process notification data if needed
  // Note: Cannot update Redux state here (background context)
  // Notification will be available in notification history when app opens
});

AppRegistry.registerComponent(appName, () => App);
```

## Redux Integration

Both services automatically integrate with Redux:

### FCM Service Redux Actions
- `setFcmToken(token)` - When FCM token is retrieved/refreshed
- `setPermissionGranted(granted)` - When permission changes
- `addNotification(notification)` - When notification received in foreground
- `setError(error)` - When FCM initialization fails

### WebSocket Updates via Listeners
- Update live worker positions in map
- Refresh task lists on assignment
- Update staffing stats in real-time
- Show alerts for important events

## Network Resilience

### FCM
- Automatic token refresh handling
- Permission re-request on app restart
- Failed registration retry via offline queue

### WebSocket
- Auto-reconnect with exponential backoff (1s → 30s)
- Automatic room resubscription on reconnect
- Max 10 reconnection attempts
- Connection state monitoring

### Handling Network Changes

```typescript
import NetInfo from '@react-native-community/netinfo';
import { websocketService } from './services/websocket';

useEffect(() => {
  const unsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected && !websocketService.isConnected()) {
      console.log('Network restored, reconnecting WebSocket');
      websocketService.reconnect();
    }
  });

  return unsubscribe;
}, []);
```

## Testing

Both services are fully tested with Jest:

```bash
# Run all Phase 2C service tests
npm test -- "services/(notifications|websocket)/__tests__"

# Run individual service tests
npm test -- services/notifications/__tests__/fcmService.test.ts
npm test -- services/websocket/__tests__/websocketService.test.ts

# Run with coverage
npm test -- "services/(notifications|websocket)" --coverage
```

**Test Coverage:**
- FCM Service: 45 tests, 100% pass
- WebSocket Service: 19 tests, 100% pass
- **Total: 64 tests, 100% pass rate**

## Performance Considerations

### FCM
- Minimal battery impact (system-managed)
- Notifications delivered even when app is closed
- Token refresh handled automatically

### WebSocket
- Persistent connection (low overhead)
- Server-side room broadcasting (efficient)
- Client-side event filtering
- Automatic reconnection minimizes lost events

### Best Practices

1. **Subscribe only to needed rooms** - Don't subscribe to all areas if you only need one
2. **Unsubscribe on unmount** - Always clean up subscriptions
3. **Handle errors gracefully** - Show user-friendly messages
4. **Monitor connection state** - Inform users if real-time updates are unavailable
5. **Offline fallback** - Use polling or manual refresh when WebSocket unavailable

## Troubleshooting

### FCM Issues

**Token not received:**
- Check Firebase configuration files are present
- Verify app is registered in Firebase Console
- Check notification permissions in device settings

**Notifications not showing:**
- Test with Firebase Console Cloud Messaging
- Check device is online
- Verify token is registered with backend API
- Check notification channel settings (Android)

**iOS notifications not appearing:**
- Ensure APNs certificate configured in Firebase
- Check app is properly code-signed
- Verify notification permissions granted

### WebSocket Issues

**Connection fails:**
- Check backend is running and accessible
- Verify JWT token is valid
- Check firewall/network allows WebSocket connections
- Ensure backend CORS includes your origin

**Events not received:**
- Verify room subscriptions with `getSubscribedRooms()`
- Check backend is emitting events (check logs)
- Ensure you're subscribed to correct room
- Verify event type matches listener

**Constant reconnection:**
- Check backend WebSocket server is stable
- Verify JWT token hasn't expired
- Check network connectivity
- Review reconnection config (may need adjustment)

## Architecture

### Communication Flow

```
Mobile App                 Backend Server
    |                           |
    |-- FCM Token --------->    | (Register)
    |<-- Push Notification-|    |
    |                           |
    |-- WebSocket Connect-->    | (JWT Auth)
    |<-- Connection Ack---|     |
    |                           |
    |-- Subscribe Area ----->   | (Join Room)
    |<-- Subscription OK --|    |
    |                           |
    |                           | (Event Occurs)
    |<-- Worker Location --|    | (Broadcast to Room)
    |<-- Task Assigned -----|   |
    |<-- Area Staffing -----|   |
```

### Event Broadcasting Strategy

Backend broadcasts events to multiple rooms simultaneously:

- **Worker Location** → area room + rayon room + city room
- **Clock-In/Out** → area room + rayon room + city room
- **Task Assigned** → area room + rayon room + city room + specific user
- **Area Staffing** → area room + rayon room + city room

This ensures all relevant clients receive updates without multiple API calls.

## See Also

- [FCM Service Documentation](./notifications/README.md)
- [WebSocket Service Documentation](./websocket/README.md)
- [Backend Events Gateway](../../../../be/src/gateways/events.gateway.ts)
- [Notifications API](../../../../be/src/modules/notifications/)
- [Redux Notifications Slice](../../store/slices/notificationsSlice.ts)
