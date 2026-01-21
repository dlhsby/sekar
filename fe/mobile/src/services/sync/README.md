# Offline Sync Manager

A comprehensive offline-first synchronization service for SEKAR Mobile that manages offline queue processing with priority-based sync, exponential backoff retry logic, and automatic triggering.

## Architecture

### Components

1. **offlineQueue.ts** - AsyncStorage-based queue management with CRUD operations
2. **syncManager.ts** - Main sync orchestrator with priority-based processing
3. **index.ts** - Public API exports

### Queue Priority

The sync manager processes items in the following priority order:

1. **clock-in** (Priority 1) - Must succeed first
2. **report** (Priority 2) - Can only happen during active shift
3. **clock-out** (Priority 3) - Must happen after reports
4. **location** (Priority 4) - Background pings, lowest priority

Within the same priority, items are sorted by timestamp (FIFO).

### Retry Logic

- **Max Retries:** 5 attempts
- **Exponential Backoff:** 1s → 2s → 4s → 8s → 16s
- **Failed Items:** Marked as 'failed' after max retries

## Usage

### 1. Initialize Sync Manager

Initialize the sync manager once when your app starts (e.g., in `App.tsx` or a provider):

```typescript
import { syncManager } from './services/sync';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    // Initialize sync manager
    syncManager.initialize();

    // Cleanup on unmount
    return () => {
      syncManager.cleanup();
    };
  }, []);

  return <YourAppContent />;
}
```

### 2. Add Items to Queue

When offline or sync fails, add items to the queue:

```typescript
import { addToQueue } from './services/sync';
import NetInfo from '@react-native-community/netinfo';

// Example: Clock-in with offline fallback
async function handleClockIn(areaId: number, gpsLat: number, gpsLng: number, selfiePhoto: string) {
  const netInfo = await NetInfo.fetch();

  if (!netInfo.isConnected) {
    // Add to offline queue
    const queueId = await addToQueue('clock-in', {
      area_id: areaId,
      gps_lat: gpsLat,
      gps_lng: gpsLng,
      selfie_photo: selfiePhoto,
    });
    console.log('Clock-in queued for later:', queueId);
    return;
  }

  // Try online first
  try {
    const result = await clockIn(areaId, gpsLat, gpsLng, selfiePhoto);
    if (result.error) {
      // Online failed, queue it
      await addToQueue('clock-in', {
        area_id: areaId,
        gps_lat: gpsLat,
        gps_lng: gpsLng,
        selfie_photo: selfiePhoto,
      });
    }
  } catch (error) {
    // Network error, queue it
    await addToQueue('clock-in', {
      area_id: areaId,
      gps_lat: gpsLat,
      gps_lng: gpsLng,
      selfie_photo: selfiePhoto,
    });
  }
}

// Example: Report submission with offline fallback
async function handleReportSubmit(reportData: any) {
  const netInfo = await NetInfo.fetch();

  if (!netInfo.isConnected) {
    await addToQueue('report', reportData);
    return;
  }

  try {
    const result = await createReport(reportData);
    if (result.error) {
      await addToQueue('report', reportData);
    }
  } catch (error) {
    await addToQueue('report', reportData);
  }
}

// Example: Location batch with offline fallback
async function handleLocationBatch(pings: LocationPing[]) {
  await addToQueue('location', { pings });
}
```

### 3. Listen to Sync Events

Monitor sync progress and handle success/failure:

```typescript
import { syncManager } from './services/sync';

function SyncStatusComponent() {
  useEffect(() => {
    // Sync started
    const onSyncStart = () => {
      console.log('Sync started');
      setIsSyncing(true);
    };

    // Sync progress
    const onSyncProgress = (completed: number, total: number) => {
      console.log(`Syncing: ${completed}/${total}`);
      setProgress(completed / total);
    };

    // Sync completed
    const onSyncComplete = (successCount: number, failureCount: number) => {
      console.log(`Sync complete: ${successCount} success, ${failureCount} failed`);
      setIsSyncing(false);

      if (failureCount > 0) {
        Alert.alert('Sync Warning', `${failureCount} items failed to sync`);
      }
    };

    // Item synced successfully
    const onItemSynced = (itemId: string, type: string) => {
      console.log(`Item synced: ${type} - ${itemId}`);
    };

    // Item failed
    const onItemFailed = (itemId: string, type: string, error: string) => {
      console.error(`Item failed: ${type} - ${itemId}`, error);
    };

    // Sync error
    const onSyncError = (error: string) => {
      console.error('Sync error:', error);
      Alert.alert('Sync Error', error);
    };

    // Register listeners
    syncManager.on('syncStart', onSyncStart);
    syncManager.on('syncProgress', onSyncProgress);
    syncManager.on('syncComplete', onSyncComplete);
    syncManager.on('itemSynced', onItemSynced);
    syncManager.on('itemFailed', onItemFailed);
    syncManager.on('syncError', onSyncError);

    // Cleanup
    return () => {
      syncManager.off('syncStart', onSyncStart);
      syncManager.off('syncProgress', onSyncProgress);
      syncManager.off('syncComplete', onSyncComplete);
      syncManager.off('itemSynced', onItemSynced);
      syncManager.off('itemFailed', onItemFailed);
      syncManager.off('syncError', onSyncError);
    };
  }, []);

  return null;
}
```

### 4. Display Pending Sync Count

Show pending items count to user:

```typescript
import { getPendingCount, getPendingCountsByType } from './services/sync';

function PendingSyncIndicator() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const updateCount = async () => {
      const count = await getPendingCount();
      setPendingCount(count);
    };

    updateCount();
    const interval = setInterval(updateCount, 5000); // Update every 5s

    return () => clearInterval(interval);
  }, []);

  if (pendingCount === 0) return null;

  return (
    <View style={styles.indicator}>
      <Text>{pendingCount} items pending sync</Text>
    </View>
  );
}

// Show breakdown by type
function DetailedPendingSync() {
  const [counts, setCounts] = useState({
    'clock-in': 0,
    'clock-out': 0,
    report: 0,
    location: 0,
  });

  useEffect(() => {
    const updateCounts = async () => {
      const newCounts = await getPendingCountsByType();
      setCounts(newCounts);
    };

    updateCounts();
    const interval = setInterval(updateCounts, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View>
      {counts['clock-in'] > 0 && <Text>Clock-in pending: {counts['clock-in']}</Text>}
      {counts['clock-out'] > 0 && <Text>Clock-out pending: {counts['clock-out']}</Text>}
      {counts.report > 0 && <Text>Reports pending: {counts.report}</Text>}
      {counts.location > 0 && <Text>Location pings pending: {counts.location}</Text>}
    </View>
  );
}
```

### 5. Force Sync

Manually trigger sync (e.g., "Retry Sync" button):

```typescript
import { syncManager } from './services/sync';

function RetryButton() {
  const handleRetry = () => {
    if (!syncManager.isSyncInProgress()) {
      syncManager.forceSyncNow();
    }
  };

  return (
    <Button
      title="Retry Sync"
      onPress={handleRetry}
      disabled={syncManager.isSyncInProgress()}
    />
  );
}
```

## Auto-Sync Triggers

The sync manager automatically triggers sync in these scenarios:

1. **Network Reconnection** - When device goes from offline to online
2. **App Foreground** - When app returns to foreground from background
3. **Periodic Sync** - Every 5 minutes while app is running

No manual intervention needed - these triggers are set up during `initialize()`.

## Queue Item Structure

```typescript
interface QueueItem {
  id: string;              // UUID
  type: QueueItemType;     // 'clock-in' | 'clock-out' | 'report' | 'location'
  data: any;               // Item-specific data
  timestamp: number;       // Creation timestamp (for ordering)
  retryCount: number;      // Current retry count (0-5)
  status: QueueItemStatus; // 'pending' | 'syncing' | 'success' | 'failed'
  error?: string;          // Last error message (if failed)
  lastAttemptAt?: number;  // Last sync attempt timestamp
}
```

## Error Handling

### Conflict Resolution

If server returns a 409 conflict error, the sync manager assumes server data is correct and removes the stale queue item.

### Max Retries

After 5 failed attempts, items are marked as 'failed' and remain in queue. User can:
- Manually trigger retry via `forceSyncNow()`
- Clear failed items via `clearQueue()`

### Network Errors

Network errors automatically trigger retry with exponential backoff. No user action needed.

## Testing

```typescript
// Mock NetInfo for testing
import NetInfo from '@react-native-community/netinfo';

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(),
}));

// Test offline queue
describe('offlineQueue', () => {
  it('should add item to queue', async () => {
    const id = await addToQueue('clock-in', { area_id: 1 });
    expect(id).toBeTruthy();

    const items = await getQueuedItems();
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe('clock-in');
  });
});

// Test sync manager
describe('syncManager', () => {
  it('should process queue in priority order', async () => {
    // Add items in reverse priority order
    await addToQueue('location', { pings: [] });
    await addToQueue('clock-in', { area_id: 1 });
    await addToQueue('report', { notes: 'test' });

    // Mock network
    NetInfo.fetch.mockResolvedValue({ isConnected: true });

    await syncManager.processQueue();

    // Verify clock-in processed first, then report, then location
  });
});
```

## Best Practices

1. **Always check network** before API calls
2. **Fallback to queue** when offline or API fails
3. **Initialize once** in App.tsx or root provider
4. **Clean up listeners** to prevent memory leaks
5. **Show pending count** to keep users informed
6. **Handle sync events** for better UX
7. **Test offline scenarios** thoroughly

## Integration with Redux

```typescript
// In your Redux slice
import { getPendingCountsByType } from './services/sync';

// Thunk to update pending counts
export const updatePendingCounts = createAsyncThunk(
  'offline/updateCounts',
  async () => {
    return await getPendingCountsByType();
  }
);

// In your component
useEffect(() => {
  const onSyncComplete = () => {
    dispatch(updatePendingCounts());
  };

  syncManager.on('syncComplete', onSyncComplete);

  return () => {
    syncManager.off('syncComplete', onSyncComplete);
  };
}, [dispatch]);
```

## Troubleshooting

**Sync not triggering?**
- Check if `syncManager.initialize()` was called
- Verify network connectivity
- Check console logs for errors

**Items stuck in queue?**
- Check if max retries reached (5)
- Verify API credentials are valid
- Check server logs for errors
- Try `forceSyncNow()` manually

**Memory leaks?**
- Ensure `cleanup()` is called on unmount
- Remove event listeners properly
- Clear intervals/timers

## Performance

- **AsyncStorage Access:** Optimized with batch operations
- **Memory Usage:** Queue stored in AsyncStorage, not memory
- **Network Efficiency:** Sequential processing prevents API overload
- **Battery Efficient:** Uses native NetInfo and AppState listeners
