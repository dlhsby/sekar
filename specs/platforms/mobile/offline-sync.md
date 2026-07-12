# Offline Sync Architecture

Offline-first architecture and synchronization strategy for SEKAR mobile application using AsyncStorage.

## Overview

The SEKAR mobile app is designed to work fully offline in areas with poor or no connectivity. All critical operations (clock-in/out, report submission, location tracking) are persisted locally and synchronized with the backend when connectivity is restored.

**Phase 1 MVP:** Uses AsyncStorage for simplicity and sufficient performance for 30 workers.

**Phase 2+:** May migrate to WatermelonDB if scale requires (>100 workers, complex queries).

---

## Design Philosophy

### Offline-First Principles

1. **Always Functional**: App never shows "No internet" blocking screens
2. **Optimistic Updates**: UI updates immediately, sync happens in background
3. **Transparent Sync**: Users see clear sync status for all pending actions
4. **Conflict-Free**: UUID-based IDs prevent server conflicts
5. **Auto-Retry**: Failed syncs automatically retry with exponential backoff

---

## AsyncStorage Data Structure

### Storage Keys

All data stored as JSON strings under namespaced keys:

```typescript
// Storage keys
const STORAGE_KEYS = {
  PENDING_CLOCK_INS: '@sekar/pending_clock_ins',
  PENDING_CLOCK_OUTS: '@sekar/pending_clock_outs',
  PENDING_REPORTS: '@sekar/pending_reports',
  PENDING_LOCATIONS: '@sekar/pending_locations',
  CACHED_SHIFTS: '@sekar/cached_shifts',
  CACHED_AREAS: '@sekar/cached_areas',
  SYNC_STATUS: '@sekar/sync_status',
  LAST_SYNC_TIME: '@sekar/last_sync_time',
};
```

### Data Schemas

#### Pending Clock-In

```typescript
interface PendingClockIn {
  local_id: string; // UUID v4
  location_id: string;
  user_id: string;
  gps_lat: number;
  gps_lng: number;
  selfie_path: string; // Local file path (react-native-fs)
  timestamp: number; // Unix timestamp (ms)
  sync_status: 'pending' | 'syncing' | 'failed' | 'synced';
  retry_count: number;
  error_message?: string;
  server_shift_id?: string; // After successful sync
  created_at: number;
  updated_at: number;
}

// Storage format
// Key: @sekar/pending_clock_ins
// Value: JSON.stringify(PendingClockIn[])
```

#### Pending Clock-Out

```typescript
interface PendingClockOut {
  local_id: string;
  shift_id: string; // May be local ID or server ID
  gps_lat: number;
  gps_lng: number;
  timestamp: number;
  sync_status: 'pending' | 'syncing' | 'failed' | 'synced';
  retry_count: number;
  error_message?: string;
  created_at: number;
  updated_at: number;
}

// Key: @sekar/pending_clock_outs
// Value: JSON.stringify(PendingClockOut[])
```

#### Pending Report

```typescript
interface PendingReport {
  local_id: string;
  shift_id: string; // May be local ID or server ID
  report_type: 'task_completion' | 'incident' | 'maintenance';
  notes: string;
  condition?: 'Baik' | 'Cukup' | 'Buruk';
  gps_lat: number;
  gps_lng: number;
  photo_paths: string[]; // Local file paths (up to 3 photos)
  timestamp: number;
  sync_status: 'pending' | 'syncing' | 'failed' | 'synced';
  retry_count: number;
  error_message?: string;
  server_report_id?: string;
  created_at: number;
  updated_at: number;
}

// Key: @sekar/pending_reports
// Value: JSON.stringify(PendingReport[])
```

#### Pending Location

```typescript
interface PendingLocation {
  local_id: string;
  shift_id: string; // May be local ID or server ID
  user_id: string;
  timestamp: number;
  gps_lat: number;
  gps_lng: number;
  accuracy: number; // meters
  battery_level: number; // 0-100
  sync_status: 'pending' | 'syncing' | 'failed' | 'synced';
  created_at: number;
}

// Key: @sekar/pending_locations
// Value: JSON.stringify(PendingLocation[])
// Note: Batch synced every 5 minutes or 10 locations
```

---

## Offline Queue Manager

### Implementation

```typescript
// services/sync/offlineQueue.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

export class OfflineQueue {
  // Add clock-in to queue
  async addPendingClockIn(data: {
    location_id: string;
    gps_lat: number;
    gps_lng: number;
    selfie_path: string;
  }): Promise<PendingClockIn> {
    const clockIn: PendingClockIn = {
      local_id: uuid.v4() as string,
      location_id: data.location_id,
      user_id: await this.getUserId(),
      gps_lat: data.gps_lat,
      gps_lng: data.gps_lng,
      selfie_path: data.selfie_path,
      timestamp: Date.now(),
      sync_status: 'pending',
      retry_count: 0,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    // Load existing queue
    const queue = await this.getPendingClockIns();
    queue.push(clockIn);

    // Save back to storage
    await AsyncStorage.setItem(
      STORAGE_KEYS.PENDING_CLOCK_INS,
      JSON.stringify(queue)
    );

    return clockIn;
  }

  // Get all pending clock-ins
  async getPendingClockIns(): Promise<PendingClockIn[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_CLOCK_INS);
    return data ? JSON.parse(data) : [];
  }

  // Update clock-in status
  async updateClockIn(
    local_id: string,
    updates: Partial<PendingClockIn>
  ): Promise<void> {
    const queue = await this.getPendingClockIns();
    const index = queue.findIndex((item) => item.local_id === local_id);

    if (index !== -1) {
      queue[index] = {
        ...queue[index],
        ...updates,
        updated_at: Date.now(),
      };

      await AsyncStorage.setItem(
        STORAGE_KEYS.PENDING_CLOCK_INS,
        JSON.stringify(queue)
      );
    }
  }

  // Remove synced clock-ins (cleanup after 7 days)
  async cleanupSyncedClockIns(): Promise<void> {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days
    const queue = await this.getPendingClockIns();

    const filtered = queue.filter(
      (item) => item.sync_status !== 'synced' || item.updated_at > cutoff
    );

    await AsyncStorage.setItem(
      STORAGE_KEYS.PENDING_CLOCK_INS,
      JSON.stringify(filtered)
    );
  }

  // Similar methods for clock-outs, reports, locations...
  // (Implementation follows same pattern)
}
```

---

## Sync Strategy

### Sync Triggers

| Event | Description | Priority |
|-------|-------------|----------|
| **App Foreground** | When app becomes active | High |
| **Network Change** | When WiFi/cellular restored | Immediate |
| **Periodic** | Every 5 minutes if app active | Background |
| **Manual** | Pull-to-refresh on lists | User-initiated |
| **After Action** | After clock-in/report submission | Immediate |

```typescript
// services/sync/syncManager.ts
import NetInfo from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';

export class SyncManager {
  private syncInterval?: NodeJS.Timeout;
  private offlineQueue: OfflineQueue;

  constructor() {
    this.offlineQueue = new OfflineQueue();
  }

  // Setup all sync triggers
  initialize(): void {
    this.setupForegroundSync();
    this.setupNetworkSync();
    this.setupPeriodicSync();
  }

  // Start sync on app foreground
  setupForegroundSync(): void {
    AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        this.syncAll();
      }
    });
  }

  // Start sync on network change
  setupNetworkSync(): void {
    NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        this.syncAll();
      }
    });
  }

  // Periodic sync every 5 minutes
  setupPeriodicSync(): void {
    this.syncInterval = setInterval(() => {
      if (AppState.currentState === 'active') {
        this.syncAll();
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  // Cleanup on app close
  cleanup(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}
```

### Sync Order (Critical)

Operations must sync in this order to maintain data integrity:

```
1. Clock-in          ← Must sync first (creates shift_id)
   ↓
2. Reports          ← Depends on shift_id from (1)
   ↓
3. Clock-out        ← Depends on shift_id from (1)
   ↓
4. Location pings   ← Can batch upload, uses shift_id from (1)
```

**Implementation:**

```typescript
async syncAll(): Promise<SyncResult> {
  const results: SyncResult = {
    success: [],
    failed: [],
  };

  // Check if online
  const networkState = await NetInfo.fetch();
  if (!networkState.isConnected || !networkState.isInternetReachable) {
    console.log('Offline - skipping sync');
    return results;
  }

  try {
    // 1. Sync clock-ins first (creates shift IDs)
    const clockIns = await this.syncClockIns();
    results.success.push(...clockIns.success);
    results.failed.push(...clockIns.failed);

    // 2. Sync reports (depends on shift IDs)
    const reports = await this.syncReports();
    results.success.push(...reports.success);
    results.failed.push(...reports.failed);

    // 3. Sync clock-outs
    const clockOuts = await this.syncClockOuts();
    results.success.push(...clockOuts.success);
    results.failed.push(...clockOuts.failed);

    // 4. Batch sync location pings (low priority)
    const locations = await this.syncLocations();
    results.success.push(...locations.success);
    results.failed.push(...locations.failed);

    // Update last sync time
    await AsyncStorage.setItem(
      STORAGE_KEYS.LAST_SYNC_TIME,
      Date.now().toString()
    );
  } catch (error) {
    console.error('Sync error:', error);
  }

  return results;
}

// Sync pending clock-ins
async syncClockIns(): Promise<SyncResult> {
  const result: SyncResult = { success: [], failed: [] };
  const pending = await this.offlineQueue.getPendingClockIns();

  for (const item of pending) {
    // Skip already synced or currently syncing
    if (item.sync_status === 'synced' || item.sync_status === 'syncing') {
      continue;
    }

    // Mark as syncing
    await this.offlineQueue.updateClockIn(item.local_id, {
      sync_status: 'syncing',
    });

    try {
      // Read selfie photo
      const selfieBase64 = await RNFS.readFile(item.selfie_path, 'base64');

      // Call API
      const response = await shiftsApi.clockIn({
        location_id: item.location_id,
        gps_lat: item.gps_lat,
        gps_lng: item.gps_lng,
        selfie_photo: `data:image/jpeg;base64,${selfieBase64}`,
      });

      // Success - mark as synced
      await this.offlineQueue.updateClockIn(item.local_id, {
        sync_status: 'synced',
        server_shift_id: response.shift_id,
      });

      result.success.push({
        type: 'clock_in',
        local_id: item.local_id,
        server_id: response.shift_id,
      });
    } catch (error: any) {
      // Handle conflicts
      if (error.response?.status === 409) {
        // Already clocked in - fetch current shift
        const currentShift = await shiftsApi.getCurrentShift();
        await this.offlineQueue.updateClockIn(item.local_id, {
          sync_status: 'synced',
          server_shift_id: currentShift.id,
        });
      } else {
        // Other error - retry later
        await this.offlineQueue.updateClockIn(item.local_id, {
          sync_status: 'failed',
          retry_count: item.retry_count + 1,
          error_message: error.message,
        });

        result.failed.push({
          type: 'clock_in',
          local_id: item.local_id,
          error: error.message,
        });
      }
    }
  }

  return result;
}
```

---

## Retry Policy

### Exponential Backoff

```typescript
const RETRY_DELAYS = {
  0: 0,      // Immediate first attempt
  1: 1000,   // 1 second
  2: 5000,   // 5 seconds
  3: 30000,  // 30 seconds
  4: 60000,  // 1 minute
};

const MAX_RETRIES = 4;

async shouldRetry(item: PendingItem): Promise<boolean> {
  if (item.retry_count >= MAX_RETRIES) {
    return false; // Max retries exceeded
  }

  const delay = RETRY_DELAYS[item.retry_count] || 60000;
  const timeSinceLastTry = Date.now() - item.updated_at;

  return timeSinceLastTry >= delay;
}
```

### User-Initiated Retry

```typescript
// Manual retry button (in UI)
async retryFailedItems(): Promise<void> {
  // Reset all failed items to pending
  const clockIns = await this.offlineQueue.getPendingClockIns();

  for (const item of clockIns) {
    if (item.sync_status === 'failed') {
      await this.offlineQueue.updateClockIn(item.local_id, {
        sync_status: 'pending',
        retry_count: 0,
        error_message: undefined,
      });
    }
  }

  // Trigger immediate sync
  await this.syncAll();
}
```

---

## Conflict Resolution

### UUID Strategy (Conflict-Free)

All entities use UUIDs generated client-side. This prevents ID conflicts when multiple clients create records offline.

```typescript
import uuid from 'react-native-uuid';

const localShiftId = uuid.v4(); // e.g., "550e8400-e29b-41d4-a716-446655440000"
```

### Conflict Scenarios

| Scenario | Resolution |
|----------|------------|
| **Clock-in twice offline** | Server rejects duplicate, mark local as synced with server shift ID |
| **Report for non-existent shift** | Retry after shift syncs (dependency check) |
| **Server already has shift** | Update local record with server data |
| **Photo upload fails** | Retry with same local file path |
| **Stale data** | Server timestamp wins, update local cache |

---

## Photo Storage Strategy

### Local File Storage

```typescript
// services/storage/photoStorage.ts
import RNFS from 'react-native-fs';
import { launchCamera } from 'react-native-image-picker';
import ImageResizer from 'react-native-image-resizer';

const PHOTOS_DIR = `${RNFS.DocumentDirectoryPath}/photos`;

export class PhotoStorage {
  // Take and save photo with compression
  async captureAndSavePhoto(type: 'selfie' | 'report'): Promise<string> {
    // Launch camera
    const result = await launchCamera({
      mediaType: 'photo',
      cameraType: type === 'selfie' ? 'front' : 'back',
      quality: 1, // High quality initially
      includeBase64: false,
    });

    if (result.didCancel || !result.assets?.[0]) {
      throw new Error('Camera cancelled');
    }

    const photo = result.assets[0];

    // Compress photo to target size
    const compressed = await this.compressPhoto(photo.uri!);

    // Save to app storage
    const filename = `${uuid.v4()}.jpg`;
    const localPath = `${PHOTOS_DIR}/${type}/${filename}`;

    await RNFS.mkdir(`${PHOTOS_DIR}/${type}`);
    await RNFS.copyFile(compressed.uri, localPath);

    // Delete temp compressed file
    await RNFS.unlink(compressed.uri);

    return localPath;
  }

  // Compress photo to target size
  async compressPhoto(uri: string): Promise<{ uri: string; size: number }> {
    const targetSize = 500 * 1024; // 500KB
    const maxWidth = 1200;
    const maxHeight = 1200;
    let quality = 70; // Start at 70%

    // First resize
    let compressed = await ImageResizer.createResizedImage(
      uri,
      maxWidth,
      maxHeight,
      'JPEG',
      quality,
      0 // No rotation
    );

    // Check size and adjust quality if needed
    let fileInfo = await RNFS.stat(compressed.uri);
    let iterations = 0;

    while (fileInfo.size > targetSize && quality > 20 && iterations < 5) {
      quality -= 10;
      iterations++;

      // Delete previous attempt
      await RNFS.unlink(compressed.uri);

      // Try again with lower quality
      compressed = await ImageResizer.createResizedImage(
        uri,
        maxWidth,
        maxHeight,
        'JPEG',
        quality,
        0
      );

      fileInfo = await RNFS.stat(compressed.uri);
    }

    return {
      uri: compressed.uri,
      size: fileInfo.size,
    };
  }

  // Read photo as base64 for upload
  async readPhotoAsBase64(localPath: string): Promise<string> {
    return await RNFS.readFile(localPath, 'base64');
  }

  // Delete photo
  async deletePhoto(localPath: string): Promise<void> {
    if (await RNFS.exists(localPath)) {
      await RNFS.unlink(localPath);
    }
  }

  // Cleanup synced photos (older than 7 days)
  async cleanupSyncedPhotos(): Promise<void> {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // Check all photo types
    for (const type of ['selfie', 'report']) {
      const dir = `${PHOTOS_DIR}/${type}`;
      const files = await RNFS.readDir(dir);

      for (const file of files) {
        const stats = await RNFS.stat(file.path);
        const mtime = new Date(stats.mtime).getTime();

        if (mtime < cutoff) {
          await RNFS.unlink(file.path);
        }
      }
    }
  }

  // Get total storage used
  async getStorageSize(): Promise<number> {
    let totalSize = 0;

    for (const type of ['selfie', 'report']) {
      const dir = `${PHOTOS_DIR}/${type}`;
      if (await RNFS.exists(dir)) {
        const files = await RNFS.readDir(dir);
        for (const file of files) {
          const stats = await RNFS.stat(file.path);
          totalSize += stats.size;
        }
      }
    }

    return totalSize;
  }
}
```

---

## User Feedback

### Sync Status Indicator

```tsx
// components/SyncStatusBadge.tsx (Already implemented)
const SyncStatusBadge = () => {
  const pendingCount = usePendingItemsCount();
  const isSyncing = useIsSyncing();
  const isOnline = useIsOnline();

  if (!isOnline) {
    return (
      <View style={styles.badge}>
        <MaterialCommunityIcons name="cloud-off-outline" color={colors.error} />
        <Text>Offline</Text>
      </View>
    );
  }

  if (isSyncing) {
    return (
      <View style={styles.badge}>
        <ActivityIndicator size="small" color={colors.warning} />
        <Text>Menyinkronkan...</Text>
      </View>
    );
  }

  if (pendingCount > 0) {
    return (
      <View style={styles.badge}>
        <MaterialCommunityIcons name="clock-outline" color={colors.warning} />
        <Text>{pendingCount} item menunggu</Text>
      </View>
    );
  }

  return (
    <View style={styles.badge}>
      <MaterialCommunityIcons name="check-circle" color={colors.success} />
      <Text>Tersinkronkan</Text>
    </View>
  );
};
```

### Pending Items Screen

```tsx
// screens/PendingSyncScreen.tsx
const PendingSyncScreen = () => {
  const pendingClockIns = usePendingClockIns();
  const pendingReports = usePendingReports();

  const allPending = [
    ...pendingClockIns.map((item) => ({ ...item, type: 'clock_in' })),
    ...pendingReports.map((item) => ({ ...item, type: 'report' })),
  ].sort((a, b) => b.created_at - a.created_at);

  return (
    <FlatList
      data={allPending}
      renderItem={({ item }) => (
        <Card>
          <View style={styles.itemRow}>
            <StatusIcon status={item.sync_status} />
            <View style={styles.itemContent}>
              <Text style={styles.itemType}>
                {item.type === 'clock_in' ? 'Clock-in' : 'Laporan'}
              </Text>
              <Text style={styles.itemTime}>
                {formatTimestamp(item.timestamp)}
              </Text>
              {item.error_message && (
                <Text style={styles.error}>{item.error_message}</Text>
              )}
            </View>
            {item.sync_status === 'failed' && (
              <Button
                title="Coba Lagi"
                onPress={() => retryItem(item)}
                variant="outline"
                size="small"
              />
            )}
          </View>
        </Card>
      )}
      ListEmptyComponent={
        <Text style={styles.empty}>Semua data sudah tersinkronisasi</Text>
      }
    />
  );
};
```

---

## Testing Offline Scenarios

### Test Cases

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **Offline Clock-in** | 1. Turn off WiFi/data<br>2. Clock in<br>3. Turn on WiFi | Clock-in syncs automatically |
| **Multiple Offline Reports** | 1. Offline<br>2. Submit 3 reports<br>3. Go online | All 3 reports sync in order |
| **Failed Sync Retry** | 1. Server down<br>2. Clock in<br>3. Server up | Auto-retry syncs successfully |
| **Conflicting Clock-in** | 1. Offline<br>2. Clock in twice<br>3. Go online | Only one clock-in synced |
| **Photo Compression** | 1. Take 5MB photo<br>2. Compress | Photo <500KB, quality good |
| **Storage Cleanup** | 1. Wait 8 days<br>2. Trigger cleanup | Synced photos deleted |

### Manual Testing

```typescript
// __DEV__ menu for testing
if (__DEV__) {
  const DevMenu = () => {
    const [forceOffline, setForceOffline] = useState(false);

    useEffect(() => {
      if (forceOffline) {
        // Intercept all API calls
        api.interceptors.request.use((config) => {
          throw new Error('Offline mode enabled (dev)');
        });
      }
    }, [forceOffline]);

    return (
      <View style={styles.devMenu}>
        <Switch
          value={forceOffline}
          onValueChange={setForceOffline}
          label="Force Offline Mode"
        />
        <Button
          title="Trigger Sync"
          onPress={() => syncManager.syncAll()}
        />
        <Button
          title="Clear Queue"
          onPress={async () => {
            await AsyncStorage.multiRemove([
              STORAGE_KEYS.PENDING_CLOCK_INS,
              STORAGE_KEYS.PENDING_CLOCK_OUTS,
              STORAGE_KEYS.PENDING_REPORTS,
            ]);
          }}
        />
      </View>
    );
  };
}
```

---

## Monitoring Data Cache Strategy (Phase 2D)

| Data | Cache Duration | Invalidation | Storage |
|------|---------------|--------------|---------|
| Live users list | 30 seconds | WebSocket update, manual refresh | TanStack Query cache |
| Area boundaries | 24 hours | App restart, manual refresh | AsyncStorage |
| Monitoring config | 5 minutes | Admin update WebSocket event | TanStack Query cache |
| User day summary | Until date change | New activity submission | TanStack Query cache |
| Location history | Until date change | New location ping | TanStack Query cache |

**Conflict Resolution:**
- WebSocket updates take priority over cached polling data
- Stale cache is served while revalidation happens in background (stale-while-revalidate)
- If offline: show last known data with "Data terakhir: {timestamp}" indicator
- Location tracking continues offline; data syncs when connection restored

---

## Performance Considerations

### AsyncStorage Limits

- **Max item size**: 2MB (sufficient for JSON metadata)
- **Photos**: Stored separately via RNFS (not in AsyncStorage)
- **Max queue size**: 100 items per type (sufficient for 30 workers)
- **Read/write speed**: ~10ms per operation

### Optimization Tips

1. **Batch Operations**: Read all pending items at once
2. **Debounce Writes**: Update queue after bulk changes
3. **Lazy Loading**: Only load what's needed for current screen
4. **Photo Compression**: Always compress before saving (target 500KB)
5. **Cleanup**: Run cleanup job weekly to remove old synced data

### When to Migrate to WatermelonDB

Consider migration if:
- More than 100 workers
- Queue size exceeds 500 items
- Need complex queries (filtering, sorting)
- Need reactive/observable queries
- AsyncStorage operations become slow (>100ms)

---

## Dependencies

```json
{
  "@react-native-async-storage/async-storage": "^2.2.0",
  "react-native-fs": "^2.20.0",
  "react-native-image-picker": "^8.2.1",
  "react-native-image-resizer": "^3.0.7",
  "react-native-uuid": "^2.0.2",
  "@react-native-community/netinfo": "^11.3.1"
}
```

---

**Document Owner:** Mobile Developer
**Last Updated:** 2026-01-16
**Status:** Active - Phase 1 MVP Implementation
**Implementation Approach:** AsyncStorage (sufficient for 30 workers, simple, reliable)
**Future Migration:** WatermelonDB if scale requires (Phase 2+)
