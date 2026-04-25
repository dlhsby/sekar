# Phase 4: Mobile Specifications

**Date:** March 12, 2026
**Status:** Not Started
**Depends On:** Phase 2E Mobile (Complete)
**Related Sub-Phases:** 4-2, 4-3, 4-4, 4-7, 4-8

---

## Current Codebase Facts (Verified March 12, 2026)

| Fact | Value |
|------|-------|
| Screens | 21 (8 field worker + 9 monitoring + 4 shared) |
| Tests | 3,669+ passing (80.31%+ coverage) |
| Offline sync | syncManager.ts covers 4 of 7 action types (shift-clock-in, shift-clock-out, location-update, activity-submit) |
| Missing queue types | overtime-start, overtime-end, task-completion, reassignment |
| FCM | Packages installed, token registration not wired to login/logout |
| Deep linking | Not configured (no App Links / Universal Links) |
| Crash reporting | Not integrated (no Sentry / Crashlytics) |
| ProGuard | Default RN config, no custom rules |
| Bundle size | Not measured |
| ConnectivityBanner | Does not exist — no differentiation between no-internet and server-unreachable |

---

## A. Offline Sync Completion (Sub-Phase 4-2)

### A1. ConnectivityStatus Enum

**File:** `fe/mobile/src/services/sync/connectivityStatus.ts`

```typescript
export enum ConnectivityStatus {
  ONLINE = 'online',
  NO_INTERNET = 'no_internet',
  SERVER_UNREACHABLE = 'server_unreachable',
}
```

Detection logic:
1. `NetInfo.fetch()` → if no internet → `NO_INTERNET`
2. If internet available, `GET /health` with 5s timeout → if fails → `SERVER_UNREACHABLE`
3. If health responds → `ONLINE`

### A2. SyncManager Expansion

**File:** `fe/mobile/src/services/sync/syncManager.ts`

New queue item types to add:

| Queue Type | Payload | Sync Endpoint |
|------------|---------|--------------|
| `overtime-start` | `{ latitude, longitude, selfie_photo? }` | `POST /overtime/start` |
| `overtime-end` | `{ activity_type_id, description, photos? }` | `POST /overtime/end` |
| `task-completion` | `{ taskId, notes?, photos? }` | `PATCH /tasks/:id/complete` |
| `reassignment` | `{ userId, targetAreaId }` | `POST /monitoring/reassign` |

### A3. Heartbeat Polling

**File:** `fe/mobile/src/services/sync/syncManager.ts`

```
When status = NO_INTERNET:
  - Listen to NetInfo change events (immediate detection)
  - On internet restored → check GET /health → transition to ONLINE or SERVER_UNREACHABLE

When status = SERVER_UNREACHABLE:
  - Poll GET /health every 30s (consistent with ADR-019)
  - On success → transition to ONLINE, trigger queue flush
  - After 10 consecutive failures → show "Extended outage" message
  - Rationale: 30s balances detection speed vs server load from degraded clients
```

### A4. Connectivity Banner

**File:** `fe/mobile/src/components/common/ConnectivityBanner.tsx`

| Status | Color | Icon | Text |
|--------|-------|------|------|
| `NO_INTERNET` | Yellow (#F59E0B) | wifi-off | "Tidak ada koneksi internet" |
| `SERVER_UNREACHABLE` | Orange (#F97316) | server-off | "Server tidak dapat dihubungi" |
| `ONLINE` (after recovery) | Green (#22C55E) | check | "Terhubung kembali" (auto-dismiss 3s) |

- Rendered at top of screen, below status bar
- Animated slide-down entrance, slide-up dismiss
- Shows pending queue count: "3 perubahan menunggu sinkronisasi"

### A5. Timezone Verification

All offline-queued items must store timestamps as ISO 8601 with Asia/Jakarta offset (`+07:00`):

```typescript
const timestamp = new Date().toISOString(); // UTC — converted on display
```

- Backend stores UTC (no change)
- Frontend displays using `Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta' })`
- Verify: format all dates as DD/MM/YYYY HH:mm WIB

---

## State Management

### Redux Slices

**`notificationsSlice`** — `fe/mobile/src/store/slices/notificationsSlice.ts`

| State Field | Type | Description |
|-------------|------|-------------|
| `unreadCount` | `number` | Badge count shown on bottom tab icon |
| `notifications` | `Notification[]` | Full list fetched from `GET /notifications` |
| `activeFilter` | `'all' \| 'unread' \| 'tasks' \| 'shifts'` | Currently selected filter tab |
| `status` | `'idle' \| 'loading' \| 'succeeded' \| 'failed'` | Fetch state |

**`connectivitySlice`** — `fe/mobile/src/store/slices/connectivitySlice.ts`

| State Field | Type | Description |
|-------------|------|-------------|
| `status` | `ConnectivityStatus` | Enum: `ONLINE \| NO_INTERNET \| SERVER_UNREACHABLE` |
| `lastChecked` | `string \| null` | ISO 8601 timestamp of last health check |

### New Services

**`NotificationService`** — `fe/mobile/src/services/notifications/notificationService.ts`

- FCM token registration on login, deregistration on logout
- Token refresh subscription via `messaging().onTokenRefresh()`
- Preference sync: `GET /users/:id/notification-preferences` and `PATCH /users/:id/notification-preferences`

**`ConnectivityService`** — `fe/mobile/src/services/sync/connectivityService.ts`

- Heartbeat polling (`GET /health` every 30s when `SERVER_UNREACHABLE`)
- NetInfo change subscription for `NO_INTERNET` detection
- State transitions dispatched to `connectivitySlice`
- On recovery to `ONLINE`: triggers offline queue flush via `syncManager`

### NotificationsScreen Component Tree

```
NotificationsScreen
└── FilterTabs (tabs: All / Unread / Tasks / Shifts)
└── NotificationList (FlatList, pull-to-refresh)
    └── NotificationItem (mark-read on tap, swipe-to-dismiss)
```

### Navigation Changes

- **Worker tab navigator** — add `NotificationsScreen` tab with unread count badge
- **Supervisor tab navigator** — add `NotificationsScreen` tab with unread count badge
- Tab icon: bell icon; badge shows `unreadCount` from `notificationsSlice` (hidden when 0)

---

## Auth Token Management

- Tokens stored in **encrypted storage** via `react-native-encrypted-storage` (AES-256, hardware-backed on Android)
- **Axios request interceptor:** attaches `Authorization: Bearer <accessToken>` header to all outgoing requests
- **Axios response interceptor:** on 401 response → calls `POST /auth/refresh` with the stored refresh token → retries the original request with the new access token
- **Refresh mutex:** only one refresh request may be in-flight at a time; concurrent 401s are queued and resolved once the single refresh completes
- **On refresh failure:** clears both tokens from encrypted storage, dispatches `authSlice.logout()`, and navigates to `LoginScreen` via the root navigation ref
- **App foreground event** (`AppState` change to `active`): proactively checks access token expiry; if it expires within 60 seconds, a background refresh is triggered before the next API call

> **Note on NetInfo reliability:** NetInfo can report stale connectivity state on some Android devices (particularly after wake from deep sleep). Treat actual API call network errors as the authoritative signal for connectivity status — NetInfo is used as a secondary/initial signal only. `ConnectivityService` reconciles both signals before dispatching state transitions.

---

## B. Push Notification Integration (Sub-Phase 4-3)

### B1. Token Registration

**File:** `fe/mobile/src/services/fcm/fcmService.ts`

```
On login success:
  1. Request notification permission
  2. Get FCM token via messaging().getToken()
  3. POST /users/:id/fcm-token { token, platform: 'android'|'ios' }
  4. Subscribe to messaging().onTokenRefresh() → re-POST

On logout:
  1. DELETE /users/:id/fcm-token
  2. Unsubscribe from onTokenRefresh
```

### B2. Foreground Handling

**File:** `fe/mobile/src/services/fcm/fcmService.ts`

```
messaging().onMessage(remoteMessage => {
  // Show in-app toast (not system notification)
  // Toast includes: title, body, tap action
  // Tap → navigate to deep link from data.deepLink
});
```

### B3. Background Handling

**File:** `fe/mobile/src/services/fcm/fcmService.ts`

```
messaging().setBackgroundMessageHandler(async remoteMessage => {
  // Display system notification via notifee
  // On tap → open app to deep link
});
```

### B4. NotificationsScreen (22nd Screen)

**File:** `fe/mobile/src/screens/notifications/NotificationsScreen.tsx`

| Section | Description |
|---------|-------------|
| Header | "Notifikasi" with unread count badge |
| Filter tabs | Semua / Tugas / Aktivitas / Lembur / Sistem |
| Notification list | FlatList with mark-read on tap, swipe-to-dismiss |
| Empty state | NBEmptyState "Belum ada notifikasi" |
| Pull-to-refresh | Fetch latest from GET /notifications |

Navigation: Bottom tab icon with unread badge count

### B5. Notification Preferences

**File:** `fe/mobile/src/screens/settings/NotificationSettingsScreen.tsx`

- List of toggles per notification type
- Fetch: `GET /users/:id/notification-preferences`
- Update: `PATCH /users/:id/notification-preferences`

---

## C. Reassignment Enhancements (Sub-Phase 4-4)

### C1. ReassignWorkerModal Verification

**File:** `fe/mobile/src/components/modals/ReassignWorkerModal.tsx` (exists as untracked)

Verify and complete:
- [ ] Worker selection (from UserDetailSheet)
- [ ] Target area picker (areas in same rayon)
- [ ] Confirmation step with current/target area names
- [ ] Loading state during API call
- [ ] Success/error feedback

### C2. Offline Queue Support

Add `reassignment` queue type (see A2 above).

### C2.1 Offline Queue Conflict Note

> **Important:** Offline sync (4-2) and reassignment (4-4) both modify `offlineQueue.ts`. Start 4-2 first and merge its offlineQueue changes before beginning 4-4 to avoid merge conflicts. See README.md Sub-Phase Dependency Notes.

### C3. Reassignment History

**File:** `fe/mobile/src/components/monitoring/UserDetailSheet.tsx`

Add "Riwayat Penugasan" section at bottom:
- Fetch from `GET /audit-logs?entity_type=user_tracking_status&entity_id={userId}`
- Show: date, from area → to area, reassigned by

### C4. Missing Worker Alert Recipients

When a worker is flagged as 'missing' (no location update within threshold):
- **Multi-area korlap:** Notify ALL korlaps assigned to the worker's area (query via `user_areas` table)
- **Kepala rayon:** Also notify the `kepala_rayon` of the containing rayon
- Notification type: FCM push + in-app notification

---

## D. Performance Optimization (Sub-Phase 4-7)

### D1. React.memo Targets

| Component | File | Reason |
|-----------|------|--------|
| `UserMarker` | `fe/mobile/src/components/monitoring/UserMarker.tsx` | Re-renders on every map gesture |
| `LocationTrail` | `fe/mobile/src/components/monitoring/LocationTrail.tsx` | Polyline with many points |
| `StaffingSummarySection` | `fe/mobile/src/components/monitoring/StaffingSummarySection.tsx` | Expensive staffing calculations |
| `LocationStatusCard` | `fe/mobile/src/components/home/LocationStatusCard.tsx` | GPS updates every second |

### D2. FlatList Optimization

All list screens must implement:

```typescript
<FlatList
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={5}
  initialNumToRender={10}
/>
```

Screens to audit: TasksScreen, ActivitiesScreen, OvertimeScreen, NotificationsScreen, UsersListScreen

### D3. Bundle Analysis

- Target: <2MB JS bundle (Hermes bytecode)
- Tool: `npx react-native-bundle-visualizer`
- Expected large chunks: react-native-maps, @react-navigation, react-native-reanimated
- Action items: lazy-load map screens, tree-shake unused icon sets

---

## E. Production Readiness (Sub-Phase 4-8)

### E1. ProGuard/R8 Configuration

**File:** `fe/mobile/android/app/proguard-rules.pro`

```
# React Native
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# React Native Maps
-keep class com.google.android.gms.maps.** { *; }

# Sentry
-keep class io.sentry.** { *; }
-dontwarn io.sentry.**

# Keep source file names for crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
```

**File:** `fe/mobile/android/app/build.gradle`

```groovy
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

### E2. Crash Reporting (Sentry)

**File:** `fe/mobile/src/services/crashReporting.ts`

```typescript
import * as Sentry from '@sentry/react-native';

export function initCrashReporting() {
  Sentry.init({
    dsn: Config.SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: 0.2,
    enableAutoSessionTracking: true,
  });
}

export function setUserContext(user: User) {
  Sentry.setUser({ id: user.id, username: user.username, role: user.role });
}
```

- Initialize in App.tsx before any other setup
- Set user context on login, clear on logout
- Wrap navigation container with `Sentry.wrap()`

### E3. Deep Linking

**File:** `fe/mobile/android/app/src/main/AndroidManifest.xml`

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="sekar.wahyutrip.com" />
    <data android:scheme="sekar" />
</intent-filter>
```

**Supported deep links:**

| URL | Screen |
|-----|--------|
| `sekar://tasks/{id}` | TaskDetailScreen |
| `sekar://activities/{id}` | ActivityDetailScreen |
| `sekar://overtime/{id}` | OvertimeDetailScreen |
| `sekar://notifications` | NotificationsScreen |
| `sekar://monitoring` | MapDashboardScreen |

**File:** `fe/mobile/src/navigation/linking.ts`

```typescript
export const linking = {
  prefixes: ['sekar://', 'https://sekar.wahyutrip.com'],
  config: {
    screens: {
      TaskDetail: 'tasks/:id',
      ActivityDetail: 'activities/:id',
      OvertimeDetail: 'overtime/:id',
      Notifications: 'notifications',
      MapDashboard: 'monitoring',
    },
  },
};
```

### E4. Splash Screen Optimization

- Target: <2s cold start on mid-range Android device
- Use `react-native-bootsplash` for native splash
- Measure with `adb shell am start -W com.sekar`
- Defer non-critical initializations (Sentry, FCM) to after first render

---

## F. UI/UX Polish (Sub-Phase 4-8)

### F1. Screen Transitions

**File:** `fe/mobile/src/navigation/`

```typescript
const screenOptions = {
  animation: 'slide_from_right',
  gestureEnabled: true,
  gestureDirection: 'horizontal',
};
```

### F2. Button Press Animation

All NB buttons should scale to 0.97 on press:

```typescript
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: withSpring(pressed.value ? 0.97 : 1) }],
}));
```

### F3. List Item Staggered Fade-In

For list screens (tasks, activities, notifications):

```typescript
// Each item fades in with 50ms delay per index
const enteringAnimation = FadeInDown.delay(index * 50).duration(300);
```

### F4. Error Boundaries

Wrap each screen root with ErrorBoundary:

```typescript
<ErrorBoundary fallback={<NBErrorFallback onRetry={refetch} />}>
  <ScreenContent />
</ErrorBoundary>
```

---

## G. Screen Inventory (Phase 4 Target: 22 Screens)

| # | Screen | Role(s) | Changes in Phase 4 |
|---|--------|---------|-------------------|
| 1 | LoginScreen | All | No change |
| 2 | HomeScreen | Field workers | Connectivity banner |
| 3 | ClockInOutScreen | Clockable roles | Offline queue improvements |
| 4 | ActivitiesScreen | All clockable | FlatList optimization |
| 5 | ActivityDetailScreen | All clockable | Deep linking target |
| 6 | TasksScreen | All | FlatList optimization, deep linking |
| 7 | TaskDetailScreen | All | Deep linking target |
| 8 | OvertimeScreen | Clockable roles | Offline queue for start/end |
| 9 | ProfileScreen | All | Notification preferences link |
| 10 | MapDashboardScreen | Monitoring roles | React.memo, performance |
| 11 | MonitoringFilterScreen | Monitoring roles | No change |
| 12 | UserDetailScreen | Monitoring roles | Reassignment history |
| 13 | UsersListScreen | Admin roles | FlatList optimization |
| 14 | SettingsScreen | All | Notification preferences |
| 15 | SchedulesScreen | All | No change |
| 16 | ReportsScreen | Monitoring roles | No change |
| 17 | AreaDetailScreen | Monitoring roles | No change |
| 18 | RayonDetailScreen | Admin roles | No change |
| 19 | AuditLogScreen | Admin roles | No change |
| 20 | ImportScreen | Admin roles | No change |
| 21 | OvertimeApprovalScreen | Approver roles | No change |
| **22** | **NotificationsScreen** | **All** | **NEW — Sub-Phase 4-3** |

---

**Last Updated:** 2026-03-12
