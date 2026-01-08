# Phase 1 - Mobile App Requirements (React Native)

## 🎯 Overview
Build a cross-platform mobile app (Android MVP) using React Native for workers and supervisors.

## 🏗️ Technical Stack
- **Framework:** React Native (latest)
- **Language:** TypeScript
- **State Management:** Redux Toolkit or Zustand
- **Navigation:** React Navigation v6
- **API Client:** Axios
- **Offline Storage:** SQLite or WatermelonDB
- **Maps:** react-native-maps (Google Maps)
- **Location:** react-native-geolocation-service
- **Background Location:** react-native-background-geolocation
- **Camera:** react-native-vision-camera or react-native-image-picker
- **Testing:** Jest + React Native Testing Library
- **Platform:** Android (iOS in Phase 5)

## 📁 Project Structure

```
sekar-mobile/
├── src/
│   ├── screens/
│   │   ├── auth/
│   │   │   └── LoginScreen.tsx
│   │   ├── worker/
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── ClockInOutScreen.tsx
│   │   │   └── ReportScreen.tsx
│   │   └── supervisor/
│   │       ├── MapDashboardScreen.tsx
│   │       ├── ReportsListScreen.tsx
│   │       ├── ReportDetailScreen.tsx
│   │       └── AttendanceScreen.tsx
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── worker/
│   │   │   ├── ClockInButton.tsx
│   │   │   ├── ShiftTimer.tsx
│   │   │   └── ReportCard.tsx
│   │   └── supervisor/
│   │       ├── WorkerMarker.tsx
│   │       ├── FilterBar.tsx
│   │       └── ReportListItem.tsx
│   ├── services/
│   │   ├── api/
│   │   │   ├── authApi.ts
│   │   │   ├── shiftsApi.ts
│   │   │   ├── reportsApi.ts
│   │   │   ├── locationApi.ts
│   │   │   └── supervisorApi.ts
│   │   ├── storage/
│   │   │   ├── secureStorage.ts
│   │   │   └── offlineStorage.ts
│   │   ├── location/
│   │   │   ├── locationService.ts
│   │   │   └── backgroundLocation.ts
│   │   └── offline/
│   │       ├── syncService.ts
│   │       └── queueManager.ts
│   ├── store/
│   │   ├── slices/
│   │   │   ├── authSlice.ts
│   │   │   ├── shiftSlice.ts
│   │   │   ├── reportSlice.ts
│   │   │   └── offlineSlice.ts
│   │   └── store.ts
│   ├── navigation/
│   │   ├── RootNavigator.tsx
│   │   ├── WorkerNavigator.tsx
│   │   └── SupervisorNavigator.tsx
│   ├── utils/
│   │   ├── gpsUtils.ts
│   │   ├── validators.ts
│   │   ├── dateUtils.ts
│   │   └── imageUtils.ts
│   ├── types/
│   │   ├── api.types.ts
│   │   ├── navigation.types.ts
│   │   └── models.types.ts
│   └── constants/
│       ├── config.ts
│       └── theme.ts
├── android/
├── ios/ (Phase 5)
├── __tests__/
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## 📱 Screen Requirements

### 1. Authentication

#### Login Screen
**Components:**
- Username input field
- Password input field (masked)
- "Login" button
- Loading indicator
- Error message display

**Functionality:**
- Validate inputs (required fields)
- Call `/api/auth/login` endpoint
- Store JWT token securely
- Navigate to appropriate screen based on role
- Auto-login if valid token exists

**Offline Behavior:**
- Show "No connection" message
- Allow retry when online

---

### 2. Worker Screens

#### Worker Home Screen
**Components:**
- User greeting (name)
- Current shift status card
  - Clock-in time
  - Hours worked today
  - Shift timer (live)
- Assigned area name and type
- Today's summary card
  - Reports submitted count
  - Areas covered
- Quick action buttons
  - Clock In / Clock Out (primary)
  - New Report
- Sync status indicator
  - "X items pending sync" badge
- Online/offline indicator

**Functionality:**
- Fetch current shift status on mount
- Update timer every minute
- Navigate to clock-in/out screen
- Navigate to report screen
- Display sync queue count

#### Clock In/Out Screen
**Components:**
- Large "Clock In" or "Clock Out" button
- Current location display
  - GPS coordinates
  - Accuracy indicator
- Assigned area information
  - Area name
  - Area type
  - Distance from area center
- GPS status indicator
  - "GPS acquiring..."
  - "GPS ready"
  - "Outside area boundary" warning
- Camera preview (for clock-in)
- Selfie capture button (for clock-in)
- Loading state during submission

**Clock-In Functionality:**
1. Request location permission
2. Get current GPS location
3. Validate GPS is within area boundary (±100m)
4. Show camera for selfie
5. Capture selfie photo
6. Compress image (max 800px width)
7. Submit to API with GPS + photo
8. Start background location tracking
9. Navigate to home screen

**Clock-Out Functionality:**
1. Get current GPS location
2. Submit to API with GPS
3. Stop background location tracking
4. Navigate to home screen

**Offline Behavior:**
- Queue clock-in/out data locally
- Show "Queued for sync" message
- Upload when connection restored

**Validations:**
- GPS must be within area boundary
- Selfie required for clock-in
- Cannot clock-in if already clocked in
- Cannot clock-out if not clocked in

#### Report Submission Screen
**Components:**
- Camera button (opens camera)
- Photo/video thumbnail preview
- Notes text area (max 500 chars)
- Condition selector buttons
  - Baik (Good)
  - Cukup (Fair)
  - Buruk (Poor)
  - None selected (optional)
- Asset selector dropdown (optional, can skip)
- GPS location display
- "Submit" button
- Upload progress indicator

**Functionality:**
1. Open native camera
2. Capture photo or video (max 30 sec / 50MB)
3. Compress media
4. Extract EXIF GPS data
5. Allow notes entry
6. Select condition rating
7. Submit report to API
8. Background upload media when online
9. Show in "My Reports" list

**Offline Behavior:**
- Save draft locally
- Queue for upload
- Show "Pending upload" badge
- Upload when online

**My Reports List:**
- Show today's submitted reports
- Filter by date
- Thumbnail + notes preview
- Upload status indicator

---

### 3. Supervisor Screens

#### Map Dashboard Screen
**Components:**
- Google Maps view
- Worker markers (pins)
  - Green pin for active workers
  - Show name on marker
  - Show last update time
  - Color-coded by area type
- Filter controls
  - Area dropdown
  - Area type dropdown
  - "Clear filters" button
- Refresh button (manual)
- Auto-refresh timer (2 minutes)
- Worker count badge
- "No active workers" message

**Functionality:**
- Fetch active workers from API
- Display markers on map
- Auto-refresh every 2 minutes
- Manual refresh button
- Filter by area and area type
- Tap marker to show worker info
- Center map on marker tap

**Marker Popup:**
- Worker name
- Area name
- Area type
- Clock-in time
- Last location update time

#### Reports List Screen
**Components:**
- Date picker (default: today)
- Filter bar
  - Worker dropdown
  - Area dropdown
  - Area type dropdown
- Sort options (newest first)
- Report cards (scrollable list)
  - Thumbnail image
  - Worker name
  - Area name + type
  - Time
  - Notes preview (truncated)
  - "Reviewed" badge if applicable
- "No reports found" message
- Pull to refresh

**Functionality:**
- Fetch reports with filters
- Infinite scroll / pagination
- Tap card to view details
- Filter and sort
- Pull to refresh

#### Report Detail Screen
**Components:**
- Full-size image/video viewer
- Worker information
  - Name
  - Area name + type
- Report details
  - Timestamp
  - GPS location (map view)
  - Notes (full text)
  - Condition rating
- Media gallery (if multiple)
- "Mark as Reviewed" button
- "Back" button

**Functionality:**
- Display full report details
- Show location on map
- Mark as reviewed (API call)
- Image zoom/pinch
- Video playback

#### Attendance Screen
**Components:**
- Date picker (default: today)
- Filter bar
  - Area dropdown
  - Area type dropdown
- Attendance list (scrollable)
  - Worker name
  - Area name + type
  - Clock-in time
  - Clock-out time
  - Hours worked
  - Reports count
- Summary card
  - Total workers
  - Total hours
  - Avg hours per worker
- Export CSV button (Phase 2)

**Functionality:**
- Fetch attendance data
- Filter by area and area type
- Calculate hours worked
- Show active shifts (no clock-out)
- Pull to refresh

---

## 🔧 Core Services

### 1. API Service
**Responsibilities:**
- HTTP client configuration (Axios)
- Base URL configuration
- JWT token injection
- Request/response interceptors
- Error handling
- Retry logic

**Methods:**
- `login(username, password)`
- `getMe()`
- `clockIn(areaId, gpsLat, gpsLng, selfie)`
- `clockOut(shiftId, gpsLat, gpsLng)`
- `getCurrentShift()`
- `createReport(data)`
- `uploadMedia(reportId, file)`
- `getMyReports(date)`
- `getActiveWorkers()`
- `getReports(filters)`
- `reviewReport(reportId)`
- `getAttendance(date, filters)`
- `uploadLocationBatch(pings)`

### 2. Offline Storage Service
**Responsibilities:**
- SQLite/WatermelonDB setup
- Local data caching
- Queue management
- CRUD operations

**Tables:**
- `shifts_queue` - Pending clock-in/out
- `reports_queue` - Pending reports
- `media_queue` - Pending uploads
- `location_pings` - Pending GPS data
- `cached_areas` - Areas and area types
- `cached_workers` - Worker info

### 3. Location Service
**Responsibilities:**
- Request location permissions
- Get current GPS location
- GPS accuracy checking
- Distance calculation
- Background location tracking

**Methods:**
- `requestPermissions()`
- `getCurrentLocation(): Promise<Location>`
- `isWithinBoundary(lat, lng, areaLat, areaLng, radius): boolean`
- `calculateDistance(lat1, lng1, lat2, lng2): number`
- `startBackgroundTracking()`
- `stopBackgroundTracking()`

**Background Tracking:**
- Start on clock-in
- Stop on clock-out
- 10-minute interval pings
- Batch upload every 30 min or 50 pings
- Store locally if offline
- Low battery optimization

### 4. Sync Service
**Responsibilities:**
- Manage offline queue
- Sync data when online
- Retry failed uploads
- Conflict resolution

**Methods:**
- `syncAll()`
- `syncShifts()`
- `syncReports()`
- `syncMedia()`
- `syncLocationPings()`
- `getPendingCount()`

**Sync Strategy:**
- On app open: sync cached data
- Every 5 minutes: attempt sync
- On network restored: immediate sync
- Remove from queue on success
- Update UI sync status

### 5. Secure Storage Service
**Responsibilities:**
- Store JWT token
- Store user info
- Encrypted storage

**Methods:**
- `setToken(token)`
- `getToken()`
- `removeToken()`
- `setUser(user)`
- `getUser()`

---

## 🎨 UI/UX Requirements

### Design Principles
- **Simple:** Large buttons, clear text
- **Government-friendly:** Professional, not flashy
- **Accessibility:** High contrast, readable fonts
- **Mobile-first:** Touch-friendly, thumb-reachable

### Theme
- **Primary Color:** Green (nature/parks theme)
- **Secondary Color:** Blue (trust/government)
- **Success:** Green
- **Warning:** Orange
- **Error:** Red
- **Text:** Dark gray on white

### Typography
- **Headers:** Bold, 20-24px
- **Body:** Regular, 16px
- **Labels:** 14px
- **Buttons:** Bold, 16-18px

### Components
- Large touch targets (min 48px)
- Loading states for all async actions
- Error messages with retry options
- Success confirmations
- Offline indicators

---

## 🧪 Testing Requirements

### Unit Tests
- Component tests for critical UI
- Service method tests
- Utility function tests
- Target: >80% coverage for critical features

### Key Tests
- [ ] Login flow
- [ ] Clock-in with GPS validation
- [ ] Clock-out
- [ ] Report submission
- [ ] Offline queue management
- [ ] Sync service
- [ ] GPS boundary calculation
- [ ] Background location tracking

### Integration Tests
- [ ] Full clock-in to clock-out workflow
- [ ] Report submission with media upload
- [ ] Offline to online sync
- [ ] Supervisor map with workers

### Manual Tests
- [ ] Battery usage during 8-hour shift
- [ ] Background location tracking accuracy
- [ ] Offline functionality
- [ ] Camera and media handling
- [ ] Map performance with 30+ markers

---

## 📦 Build & Deployment

### Android Build
```bash
# Debug build
npx react-native run-android

# Release build
cd android && ./gradlew assembleRelease
```

### APK Output
- Location: `android/app/build/outputs/apk/release/app-release.apk`
- Signing: Use keystore for production

### Environment Configuration
```bash
# .env
API_BASE_URL=https://api.sekar.example.com
GOOGLE_MAPS_API_KEY=your-google-maps-key
```

### Permissions (Android)
- `ACCESS_FINE_LOCATION`
- `ACCESS_COARSE_LOCATION`
- `ACCESS_BACKGROUND_LOCATION`
- `CAMERA`
- `READ_EXTERNAL_STORAGE`
- `WRITE_EXTERNAL_STORAGE`
- `INTERNET`

---

## ✅ Acceptance Criteria

- [ ] Worker can login and see assigned area
- [ ] Worker can clock-in with GPS + selfie
- [ ] GPS validation prevents clock-in outside area
- [ ] Worker can submit report with photo/video
- [ ] Reports save offline and sync when online
- [ ] Worker can clock-out
- [ ] Background location tracking works
- [ ] Supervisor can see active workers on map
- [ ] Supervisor can view and filter reports
- [ ] Supervisor can mark reports as reviewed
- [ ] Supervisor can view attendance
- [ ] App works offline for full shift
- [ ] Battery usage <15% per 8-hour shift
- [ ] Critical features have unit tests (>80% coverage)
- [ ] APK builds successfully

---

## 🚨 Known Limitations (MVP)

- Android only (no iOS)
- No push notifications
- No task assignment
- No advanced anti-cheating
- No password reset
- Basic error handling
- Limited analytics
- No export functionality

