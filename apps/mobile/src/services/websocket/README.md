# WebSocket Real-time Service

Socket.IO WebSocket client for real-time events in the SEKAR mobile app.

## Installation

Before using this service, install the required dependencies:

```bash
npm install socket.io-client
```

## Usage

### 1. Connect on App Start

Connect to WebSocket server when user is authenticated:

```typescript
import { websocketService } from './services/websocket';

// In your App.tsx or authentication flow
useEffect(() => {
  if (isAuthenticated) {
    websocketService.connect().then((connected) => {
      if (connected) {
        console.log('WebSocket connected');
      }
    });
  }

  return () => {
    websocketService.disconnect();
  };
}, [isAuthenticated]);
```

### 2. Subscribe to Area Updates (Supervisor)

Subscribe to real-time updates for a specific area:

```typescript
import { websocketService } from './services/websocket';

// In supervisor dashboard or map screen
useEffect(() => {
  if (!websocketService.isConnected()) {
    return;
  }

  const areaId = 'area-uuid-123';

  // Subscribe to area
  websocketService.subscribeToArea(areaId);

  // Cleanup on unmount
  return () => {
    websocketService.unsubscribeFromArea(areaId);
  };
}, [areaId]);
```

### 3. Listen for Worker Location Updates

Track worker movements in real-time:

```typescript
import { websocketService, type WorkerLocationEvent } from './services/websocket';

useEffect(() => {
  const unsubscribe = websocketService.onWorkerLocation((event: WorkerLocationEvent) => {
    console.log('Worker location update:', event);

    // Update map marker
    updateWorkerPosition({
      id: event.worker_id,
      name: event.worker_name,
      latitude: event.latitude,
      longitude: event.longitude,
      accuracy: event.accuracy,
      batteryLevel: event.battery_level,
    });
  });

  return unsubscribe;
}, []);
```

### 4. Listen for Clock-In/Out Events

Monitor worker attendance in real-time:

```typescript
import { websocketService } from './services/websocket';

useEffect(() => {
  const unsubscribeClockIn = websocketService.onWorkerClockIn((event) => {
    console.log('Worker clocked in:', event.worker_name);

    // Show notification
    showToast(`${event.worker_name} telah clock-in di ${event.area_name}`);

    // Update attendance list
    refreshAttendance();
  });

  const unsubscribeClockOut = websocketService.onWorkerClockOut((event) => {
    console.log('Worker clocked out:', event.worker_name);
    console.log('Duration:', event.duration_minutes, 'minutes');

    // Update attendance list
    refreshAttendance();
  });

  return () => {
    unsubscribeClockIn();
    unsubscribeClockOut();
  };
}, []);
```

### 5. Listen for Task Events (Worker)

Receive real-time task assignments:

```typescript
import { websocketService, type TaskAssignedEvent } from './services/websocket';

useEffect(() => {
  const unsubscribe = websocketService.onTaskAssigned((event: TaskAssignedEvent) => {
    console.log('New task assigned:', event.title);

    // Show notification
    Alert.alert(
      'Tugas Baru',
      `Anda mendapat tugas: ${event.title}`,
      [
        { text: 'Lihat', onPress: () => navigation.navigate('TaskDetail', { taskId: event.task_id }) },
        { text: 'Nanti', style: 'cancel' },
      ]
    );

    // Refresh task list
    dispatch(fetchTasks());
  });

  return unsubscribe;
}, []);
```

### 6. Monitor Area Staffing (Supervisor)

Track staffing levels in real-time:

```typescript
import { websocketService, type AreaStaffingEvent } from './services/websocket';

useEffect(() => {
  const unsubscribe = websocketService.onAreaStaffing((event: AreaStaffingEvent) => {
    console.log('Area staffing update:', event);

    // Update dashboard stats
    setAreaStats({
      areaName: event.area_name,
      required: event.workers_required,
      online: event.workers_online,
      offline: event.workers_offline,
      isFullyStaffed: event.is_fully_staffed,
    });

    // Show alert if understaffed
    if (!event.is_fully_staffed && event.staffing_delta < -2) {
      showAlert('Peringatan', `${event.area_name} kekurangan ${Math.abs(event.staffing_delta)} pekerja`);
    }
  });

  return unsubscribe;
}, []);
```

### 7. Subscribe to Multiple Areas

Subscribe to multiple areas at once (for rayon or city-level view):

```typescript
import { websocketService } from './services/websocket';

useEffect(() => {
  const areaIds = ['area-1', 'area-2', 'area-3'];

  // Subscribe to all areas
  areaIds.forEach((areaId) => {
    websocketService.subscribeToArea(areaId);
  });

  // Cleanup
  return () => {
    areaIds.forEach((areaId) => {
      websocketService.unsubscribeFromArea(areaId);
    });
  };
}, []);
```

### 8. Subscribe to Rayon

For rayon-level supervisors:

```typescript
import { websocketService } from './services/websocket';

useEffect(() => {
  const rayonId = user.rayon_id;

  if (rayonId) {
    websocketService.subscribeToRayon(rayonId);

    return () => {
      websocketService.unsubscribeFromRayon(rayonId);
    };
  }
}, [user.rayon_id]);
```

### 9. Monitor Connection State

Track WebSocket connection status:

```typescript
import { websocketService, ConnectionState } from './services/websocket';

useEffect(() => {
  const checkConnection = setInterval(() => {
    const state = websocketService.getConnectionState();
    const isConnected = websocketService.isConnected();

    if (state === ConnectionState.ERROR) {
      console.warn('WebSocket error, attempting reconnect');
      websocketService.reconnect();
    }

    setConnectionStatus(isConnected ? 'online' : 'offline');
  }, 5000);

  return () => clearInterval(checkConnection);
}, []);
```

### 10. Cleanup on Logout

Disconnect when user logs out:

```typescript
const handleLogout = () => {
  // Disconnect WebSocket
  websocketService.disconnect();

  // Continue with logout
  dispatch(logout());
  navigation.navigate('Login');
};
```

## API Reference

### Connection Methods

#### `connect(token?: string): Promise<boolean>`
Connect to WebSocket server. Uses token from secure storage if not provided.

#### `disconnect(): void`
Disconnect from WebSocket server.

#### `isConnected(): boolean`
Check if currently connected to server.

#### `getConnectionState(): ConnectionState`
Get current connection state.

#### `reconnect(): Promise<boolean>`
Manually trigger reconnection.

### Subscription Methods

#### `subscribeToArea(areaId: string): void`
Subscribe to real-time events for a specific area.

#### `unsubscribeFromArea(areaId: string): void`
Unsubscribe from area events.

#### `subscribeToRayon(rayonId: string): void`
Subscribe to real-time events for a specific rayon (sector).

#### `unsubscribeFromRayon(rayonId: string): void`
Unsubscribe from rayon events.

#### `getSubscribedRooms(): string[]`
Get list of currently subscribed rooms.

### Event Listeners

#### `onWorkerLocation(handler: EventHandler<WorkerLocationEvent>): () => void`
Listen for worker location updates. Returns unsubscribe function.

#### `onWorkerClockIn(handler: EventHandler<WorkerClockInEvent>): () => void`
Listen for worker clock-in events. Returns unsubscribe function.

#### `onWorkerClockOut(handler: EventHandler<WorkerClockOutEvent>): () => void`
Listen for worker clock-out events. Returns unsubscribe function.

#### `onTaskAssigned(handler: EventHandler<TaskAssignedEvent>): () => void`
Listen for task assignment events. Returns unsubscribe function.

#### `onTaskCompleted(handler: EventHandler<TaskCompletedEvent>): () => void`
Listen for task completion events. Returns unsubscribe function.

#### `onAreaStaffing(handler: EventHandler<AreaStaffingEvent>): () => void`
Listen for area staffing changes. Returns unsubscribe function.

### Utility Methods

#### `removeAllListeners(eventType?: EventType): void`
Remove all listeners for specific event type, or all events if not specified.

#### `setReconnectConfig(config: Partial<ReconnectConfig>): void`
Update reconnection configuration (max attempts, delays, etc.).

#### `cleanup(): void`
Remove all listeners and disconnect.

## Event Types

### WorkerLocationEvent
```typescript
{
  worker_id: string;
  worker_name: string;
  role: string;
  shift_id: string;
  area_id: string;
  area_name: string;
  rayon_id?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  battery_level?: number;
  timestamp: Date | string;
}
```

### TaskAssignedEvent
```typescript
{
  task_id: string;
  title: string;
  area_id: string;
  area_name: string;
  rayon_id?: string;
  assigned_to: string;
  assignee_name: string;
  priority: string;
  deadline?: Date | string;
  timestamp: Date | string;
}
```

### AreaStaffingEvent
```typescript
{
  area_id: string;
  area_name: string;
  rayon_id?: string;
  workers_required: number;
  workers_online: number;
  workers_offline: number;
  is_fully_staffed: boolean;
  staffing_delta: number;
  timestamp: Date | string;
}
```

## Connection State

```typescript
enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}
```

## Reconnection

The service automatically attempts to reconnect with exponential backoff:

- Initial delay: 1 second
- Max delay: 30 seconds
- Backoff multiplier: 1.5
- Max attempts: 10

Configure reconnection:

```typescript
websocketService.setReconnectConfig({
  maxAttempts: 5,
  initialDelay: 2000,
  maxDelay: 60000,
});
```

## Room Subscription Strategy

The backend uses rooms for efficient event broadcasting:

- **Area rooms** (`area:{areaId}`): Events for specific area
- **Rayon rooms** (`rayon:{rayonId}`): Events for all areas in rayon
- **City room** (`city`): City-wide events (Admin/TopManagement only)

Events are broadcast to all relevant rooms:
- Worker location → area room + rayon room + city room
- Task assigned → area room + rayon room + city room + specific user
- Area staffing → area room + rayon room + city room

## Performance Considerations

- WebSocket maintains persistent connection (low overhead)
- Events are pushed (no polling needed)
- Automatic reconnection on network restore
- Subscriptions are preserved across reconnections
- Efficient room-based broadcasting on server

## Security

- JWT authentication required for connection
- Token verified on server side
- Unauthorized clients are immediately disconnected
- Room subscriptions are validated based on user role

## Testing

Run tests with:

```bash
npm test -- websocketService.test.ts
```

## See Also

- [Backend Events Gateway](../../../../../be/src/gateways/events.gateway.ts)
- [Event DTOs](../../../../../be/src/gateways/dto/events.dto.ts)
- [Socket.IO Client Documentation](https://socket.io/docs/v4/client-api/)
