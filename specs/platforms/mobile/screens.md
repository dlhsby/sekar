# Mobile Screens Specification

Complete screen specifications for SEKAR React Native mobile application (Android Phase 1).

## Overview

### Screen Summary

**Total: Refer to `specs/COMPLETION_STATUS.md` for latest screen count**
**Phase 5 (Jun 17, 2026): Reporting + Analytics + Assets feature modules shipped (8 screens + 3 slices)**
**Design system:** Neo Brutalism 2.1.1 (Phase 4 rebrand re-baseline applied May 25, 2026)

| Stack | Screen | Status | Priority | Phase |
|-------|--------|--------|----------|-------|
| **Auth** | Login | ✅ Complete | P0 | 1 |
| **Auth** | Register | ✅ Complete | P1 | 2 |
| **Field** | Home | ✅ Complete (2C modified) | P0 | 1→2C |
| **Field** | Clock In/Out | ✅ Complete | P0 | 1 |
| **Field** | Activity Submission | ✅ Complete (2C renamed) | P0 | 1→2C |
| **Field** | Activity Detail | ✅ Complete (2C: approval UI) | P0 | 2C |
| **Field** | Tasks & Activity List | ✅ Complete (2C modified) | P0 | 2→2C |
| **Field** | Location Tracking | ✅ Complete | P0 | 1 |
| **Field** | Profile | ✅ Complete | P1 | 1 |
| **Supervisor** | Map Dashboard | ✅ Complete | P0 | 1 |
| **Supervisor** | Reports List | ✅ Complete | P0 | 1 |
| **Supervisor** | Attendance | ✅ Complete | P1 | 1 |
| **Tasks** | Task Detail | ✅ Complete (2C: accept/decline/verify) | P1 | 2→2C |
| **Tasks** | Task Complete | ✅ Complete | P1 | 2 |
| **Tasks** | Task Create | ✅ Complete | P1 | 2C |
| **Common** | Notifications | ✅ Complete | P2 | 2 |
| **Common** | Settings | ✅ Complete | P2 | 2 |
| **Overtime** | Overtime Submit | ✅ Complete | P1 | 2C |
| **Overtime** | Overtime Detail | ✅ Complete | P1 | 2C |

**Tests:** Refer to `specs/COMPLETION_STATUS.md` for current test counts (Phase 5: 4175+ tests passing)

### Component Summary (NB 2.0)

| Category | Components | Count |
|----------|------------|-------|
| **NB Core** | NBButton, NBCard, NBTextInput, NBPasswordInput, NBSelect, NBDatePicker | 6 |
| **NB Feedback** | NBAlert, NBBadge, NBSkeleton, NBEmptyState | 4 |
| **NB Navigation** | NBTab, NBBackgroundPattern | 2 |
| **NB Modals** | ShiftDetailModal, TaskFilterModal, ActivityFilterModal, TodayActivitiesModal, TodayWorkHoursModal | 5 |
| **Total** | | **17** |

> **Design System:** Neo Brutalism 2.1.1 (Phase 4 v2.1 rebrand, May 25 v2.1.1 reconciliation) - See `specs/design-system/neo-brutalism.md` and `specs/design-system/design-tokens.md`
> **Tokens:** All screens use generated tokens from `apps/mobile/src/constants/generated/tokens.ts` (never hand-edit)

### Navigation Header (Phase 2C)

**Component:** `apps/mobile/src/components/navigation/FieldHomeHeader.tsx`

All screens use a unified 3-column header. Main screens show a leaf icon + greeting; sub-screens show a back arrow + page title. The status badge (Online/Offline/Syncing) is always pinned right.

```
Main:  [🌿 40×40]──8px──[Halo, Ahmad! | Satgas]──4px──[● ONLINE ]
       ←16px                                                16px→

Sub:   [← 44×44]──4px──[Detail Tugas              ]──4px──[● ONLINE ]
       ←16px                                                16px→
```

> **Full spec:** history/CHANGELOG.md → Header System Standard

---

## Auth Stack

### AS-1: Login Screen

**Route:** `Login`
**Status:** ✅ Complete
**Auth Required:** No

#### Purpose
Authenticate workers and supervisors with phone number and password.

#### UI Layout

```
┌────────────────────────────────────┐
│        [SEKAR Logo/Icon]          │
│                                    │
│    Sistem Evaluasi Kinerja        │
│         Satgas RTH                │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ 📱 No. Telepon               │ │
│  │ 081234567890                 │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ 🔒 Kata Sandi                │ │
│  │ ••••••••••           [👁]    │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │         MASUK                │ │
│  └──────────────────────────────┘ │
│                                    │
│  [ ] Ingat Saya                   │
│                                    │
│  Lupa Kata Sandi?                 │
│                                    │
│  v1.0.0 | ●Offline               │
└────────────────────────────────────┘
```

#### Components

**State:**
```typescript
interface LoginScreenState {
  phone: string;
  password: string;
  showPassword: boolean;
  rememberMe: boolean;
  isLoading: boolean;
  error: string | null;
}
```

**Form Fields:**
- **Phone Input:**
  - Label: "No. Telepon"
  - Placeholder: "081234567890"
  - Type: numeric keyboard
  - Validation: 10-13 digits
  - Auto-format: +62 prefix removed

- **Password Input:**
  - Label: "Kata Sandi"
  - Type: secure text entry
  - Toggle visibility button
  - Validation: minimum 6 characters

- **Remember Me Checkbox:**
  - Stores encrypted credentials
  - Auto-login on app restart

**Actions:**
- **Login Button:**
  - Disabled when form invalid
  - Shows loading spinner during authentication
  - On success: Navigate to WorkerTabs or SupervisorTabs
  - On error: Display error banner below button

**Validation Rules:**
```typescript
const validateLoginForm = (phone: string, password: string): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!phone) {
    errors.push({ field: 'phone', message: 'No. telepon wajib diisi' });
  } else if (!/^[0-9]{10,13}$/.test(phone)) {
    errors.push({ field: 'phone', message: 'No. telepon tidak valid (10-13 digit)' });
  }

  if (!password) {
    errors.push({ field: 'password', message: 'Kata sandi wajib diisi' });
  } else if (password.length < 6) {
    errors.push({ field: 'password', message: 'Kata sandi minimal 6 karakter' });
  }

  return errors;
};
```

#### API Integration

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "phone": "081234567890",
  "password": "Password123!"
}
```

**Response (Success):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "phone": "081234567890",
    "full_name": "Ahmad Rizki",
    "role": "worker",
    "assigned_area": {
      "id": "uuid",
      "name": "Taman Bungkul",
      "area_type": "park"
    }
  }
}
```

**Error Cases:**
- `401 Unauthorized`: "No. telepon atau kata sandi salah"
- `403 Forbidden`: "Akun Anda tidak aktif"
- `Network Error`: "Tidak dapat terhubung. Periksa koneksi internet Anda"

#### User Flow

```
1. User enters phone and password
2. User taps "Masuk" button
3. App validates form locally
   ├─ Invalid → Show error messages
   └─ Valid → Continue
4. App calls POST /api/auth/login
5. API responds
   ├─ Success
   │  ├─ Store token in EncryptedStorage
   │  ├─ Store user data in Redux
   │  ├─ If rememberMe: Store credentials
   │  └─ Navigate based on role
   │     ├─ Worker → WorkerTabs
   │     └─ Supervisor → SupervisorTabs
   └─ Error → Display error banner
```

#### Accessibility
- Label all inputs for screen readers
- Ensure 44x44pt minimum touch targets
- High contrast error messages (red text on white)
- Support for system font scaling

---

### AS-2: Register Screen

**Route:** `Register`
**Status:** 📋 Planned (Phase 2)
**Auth Required:** No

#### Purpose
Allow new workers to register (with supervisor approval).

#### UI Layout

```
┌────────────────────────────────────┐
│  ← Daftar Akun Baru                │
├────────────────────────────────────┤
│                                    │
│  ┌──────────────────────────────┐ │
│  │ 👤 Nama Lengkap              │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ 📱 No. Telepon               │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ 🔒 Kata Sandi                │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ 🔒 Konfirmasi Kata Sandi     │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │         DAFTAR               │ │
│  └──────────────────────────────┘ │
│                                    │
│  Sudah punya akun? Masuk          │
└────────────────────────────────────┘
```

**Note:** Registration requires supervisor approval. Status shown in Profile.

---

## Worker Stack

### WS-1: Worker Home Screen

**Route:** `WorkerHome`
**Status:** ✅ Complete
**Auth Required:** Yes (Worker)
**Bottom Tab:** Home (🏠)

#### Purpose
Dashboard showing current shift status, daily summary, and quick actions.

#### UI Layout

```
┌────────────────────────────────────┐
│  Beranda        ●Online    [👤]   │
├────────────────────────────────────┤
│                                    │
│  Halo, Ahmad Rizki! 👋            │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ ⏱ Shift Aktif                │ │
│  │                               │ │
│  │  Taman Bungkul               │ │
│  │  Park · 100m radius          │ │
│  │                               │ │
│  │  Masuk: 08:00 WIB            │ │
│  │  Durasi: 02:15:30            │ │
│  │                               │ │
│  │  [     CLOCK OUT     ]       │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ 📊 Ringkasan Hari Ini        │ │
│  │                               │ │
│  │  Laporan: 3                  │ │
│  │  Jam Kerja: 2.25             │ │
│  └──────────────────────────────┘ │
│                                    │
│  Aksi Cepat                       │
│  ┌────────┐  ┌────────┐          │
│  │ Clock  │  │ Buat   │          │
│  │  In    │  │Laporan │          │
│  └────────┘  └────────┘          │
│                                    │
│  ● 2 item menunggu sinkronisasi  │
└────────────────────────────────────┘
```

#### Components

**State:**
```typescript
interface WorkerHomeState {
  currentShift: Shift | null;
  todaySummary: {
    reportCount: number;
    hoursWorked: number;
  };
  isRefreshing: boolean;
  pendingSyncCount: number;
}
```

**Sections:**

1. **Header Bar:**
   - User greeting with name
   - Network status indicator (●Online / ●Offline)
   - Profile icon (navigation to Profile screen)

2. **Current Shift Card** (if shift active):
   - Area name and type
   - GPS radius info
   - Clock-in time
   - Live shift timer (HH:MM:SS)
   - Clock Out button
   - If no shift: Shows "Clock In" prompt card

3. **Summary Card:**
   - Report count today
   - Hours worked today
   - Updates after each action

4. **Quick Actions:**
   - Clock In button (if no active shift)
   - New Report button (if shift active)
   - Icons with labels

5. **Sync Status Banner** (if offline items):
   - Shows pending sync count
   - Tappable to view sync queue

#### LocationStatusCard (Phase 2D-11)
- Position: Above "Shift Aktif" card, below greeting header
- Visibility: Only when user has an active shift
- Content:
  - GPS coordinates (lat/lng, 6 decimal places)
  - GPS accuracy badge (±Xm, amber warning if >50m)
  - Area status banner: green "Di dalam area kerja" or orange "Di luar area kerja"
  - Sync/refresh icon button (triggers captureNow + forceUpload)
- Hook: `useHomeLocation` — manages location state, refresh, boundary check
- Pattern: Reuses display pattern from ClockInOutScreen "Lokasi Anda" card
- Component: `apps/mobile/src/components/home/LocationStatusCard.tsx`

#### Real-Time Updates

**Shift Timer:**
```typescript
useEffect(() => {
  if (!currentShift) return;

  const interval = setInterval(() => {
    const elapsed = Date.now() - new Date(currentShift.clock_in_time).getTime();
    setElapsedTime(formatDuration(elapsed));
  }, 1000); // Update every second

  return () => clearInterval(interval);
}, [currentShift]);
```

#### Pull-to-Refresh

```typescript
const onRefresh = async () => {
  setRefreshing(true);
  try {
    await Promise.all([
      dispatch(fetchCurrentShift()),
      dispatch(fetchTodaySummary()),
      dispatch(processSyncQueue()),
    ]);
  } finally {
    setRefreshing(false);
  }
};
```

#### API Integration

**Endpoints:**
- `GET /api/shifts/current` - Current shift
- `GET /api/workers/dashboard` - Today's summary

#### User Flow

```
1. Screen loads
   ├─ Fetch current shift
   ├─ Fetch today's summary
   └─ Check offline sync queue
2. Display current state
   ├─ If shift active: Show shift card with timer
   └─ If no shift: Show clock-in prompt
3. User can:
   ├─ Clock out (if shift active)
   ├─ Clock in (if no shift)
   ├─ Create new report (if shift active)
   └─ Pull to refresh
```

#### Error Recovery

**Network Errors:**
- On fetch failure: Show cached data if available, display "Offline" indicator
- Pull-to-refresh: Show "Koneksi terputus" banner with retry button
- Auto-retry on network reconnection

**Data Sync Errors:**
- Show pending sync count in status banner
- Allow manual sync via pull-to-refresh
- Display sync queue details on tap

**API Errors:**
- Rate limit exceeded: "Terlalu banyak permintaan. Coba lagi dalam 1 menit."
- Server error: Show cached data, log error, allow retry

**State Recovery:**
- All displayed data cached in Redux store
- Offline-first approach: Show stale data with indicator
- Background sync resumes automatically on connectivity

**See Also:** [Error Recovery Flows](#error-recovery-flows) for comprehensive error handling strategies.

---

### WS-2: Clock In/Out Screen

**Route:** `ClockInOut`
**Status:** ✅ Complete
**Auth Required:** Yes (Worker)

#### Purpose
GPS-validated clock-in with selfie verification and clock-out flow.

#### UI Layout (Clock In Mode)

```
┌────────────────────────────────────┐
│  ← Clock In                        │
├────────────────────────────────────┤
│                                    │
│  ┌──────────────────────────────┐ │
│  │ 📍 Lokasi Kerja              │ │
│  │                               │ │
│  │  Taman Bungkul               │ │
│  │  -7.2905, 112.7398           │ │
│  │  Radius: 100m · Park         │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ 📱 GPS Anda                  │ │
│  │                               │ │
│  │  📍 -7.2903, 112.7400        │ │
│  │  Akurasi: 15m                │ │
│  │  Jarak: 22m dari area        │ │
│  │  ✅ Dalam jangkauan          │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ 📷 Foto Selfie               │ │
│  │                               │ │
│  │  [  Ambil Foto Selfie  ]    │ │
│  │                               │ │
│  │  [ Photo Preview 200x200 ]   │ │
│  └──────────────────────────────┘ │
│                                    │
│  ⚠ Pastikan wajah terlihat jelas │
│                                    │
│  ┌──────────────────────────────┐ │
│  │      CLOCK IN SEKARANG       │ │
│  └──────────────────────────────┘ │
└────────────────────────────────────┘
```

#### UI Layout (Clock Out Mode)

```
┌────────────────────────────────────┐
│  ← Clock Out                       │
├────────────────────────────────────┤
│                                    │
│  ┌──────────────────────────────┐ │
│  │ ⏱ Shift Anda                │ │
│  │                               │ │
│  │  Masuk: 08:00 WIB            │ │
│  │  Durasi: 08:15:30            │ │
│  │                               │ │
│  │  Taman Bungkul               │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ 📱 GPS Anda                  │ │
│  │                               │ │
│  │  📍 -7.2903, 112.7400        │ │
│  │  Akurasi: 12m                │ │
│  │  Jarak: 18m dari area        │ │
│  │  ✅ Dalam jangkauan          │ │
│  └──────────────────────────────┘ │
│                                    │
│  ⚠ Offline mode: Data akan       │
│    disinkronkan saat online       │
│                                    │
│  ┌──────────────────────────────┐ │
│  │      CLOCK OUT SEKARANG      │ │
│  └──────────────────────────────┘ │
│                                    │
│  Apakah Anda yakin?               │
└────────────────────────────────────┘
```

#### Components

**State:**
```typescript
interface ClockInOutState {
  mode: 'clock-in' | 'clock-out';
  area: Area | null;
  currentLocation: {
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null;
  distance: number | null; // meters from area center
  selfieUri: string | null;
  isWithinBoundary: boolean;
  isLoading: boolean;
  error: string | null;
}
```

**GPS Validation:**
```typescript
const validateLocation = (
  userLat: number,
  userLng: number,
  areaLat: number,
  areaLng: number,
  radius: number
): { isValid: boolean; distance: number } => {
  const distance = calculateHaversineDistance(
    userLat, userLng,
    areaLat, areaLng
  );

  return {
    isValid: distance <= radius,
    distance: Math.round(distance)
  };
};
```

**Camera Integration:**
```typescript
import { launchCamera } from 'react-native-image-picker';

const takeSelfie = async () => {
  const result = await launchCamera({
    mediaType: 'photo',
    cameraType: 'front',
    quality: 0.8,
    maxWidth: 800,
    maxHeight: 800,
    includeBase64: false,
  });

  if (result.assets && result.assets[0]) {
    setSelfieUri(result.assets[0].uri);
  }
};
```

#### API Integration

**Clock In:**
```
POST /api/shifts/clock-in
Content-Type: application/json

{
  "area_id": "uuid",
  "gps_lat": -7.2903,
  "gps_lng": 112.7400,
  "selfie_photo": "base64..."
}
```

**Clock Out:**
```
POST /api/shifts/{shiftId}/clock-out
Content-Type: application/json

{
  "gps_lat": -7.2903,
  "gps_lng": 112.7400
}
```

#### User Flow (Clock In)

```
1. Screen loads with mode="clock-in"
2. Request location permission
   ├─ Denied → Show permission error
   └─ Granted → Get current GPS
3. Validate GPS against area boundary
   ├─ Outside → Show "Terlalu jauh" error
   └─ Inside → Enable selfie capture
4. User taps "Ambil Foto Selfie"
   ├─ Request camera permission
   ├─ Open front camera
   ├─ User takes photo
   └─ Show preview
5. User taps "Clock In Sekarang"
   ├─ Validate all requirements
   │  - GPS within boundary
   │  - Selfie captured
   ├─ Convert photo to base64
   ├─ Call API
   │  ├─ Success → Navigate to Home
   │  └─ Error → Show error banner
   └─ If offline → Queue for sync
```

#### User Flow (Clock Out)

```
1. Screen loads with mode="clock-out"
2. Fetch current shift
3. Get current GPS location
4. Validate GPS against area boundary
   ├─ Outside → Show warning but allow
   └─ Inside → Normal flow
5. User taps "Clock Out Sekarang"
6. Show confirmation dialog
   "Yakin ingin clock out?"
   [Batal] [Ya, Clock Out]
7. If confirmed:
   ├─ Call API
   │  ├─ Success → Navigate to Home
   │  └─ Error → Show error banner
   └─ If offline → Queue for sync
```

#### Validation Rules

**Clock In:**
- GPS accuracy < 50 meters
- Distance to area center < 100 meters
- Selfie photo required
- Photo size < 5MB
- No active shift exists

**Clock Out:**
- Active shift exists
- GPS accuracy < 50 meters (warning if outside)
- Distance validation relaxed (allows up to 200m with warning)

#### Error States

**Location Errors:**
- "Izin lokasi ditolak. Buka Pengaturan untuk mengaktifkan."
- "GPS tidak akurat. Coba di tempat terbuka."
- "Anda terlalu jauh dari area kerja (125m)."

**Camera Errors:**
- "Izin kamera ditolak. Buka Pengaturan untuk mengaktifkan."
- "Gagal mengambil foto. Coba lagi."

**Network Errors:**
- "Mode offline. Data akan disimpan dan dikirim saat online."

---

### WS-3: Report Submission Screen

**Route:** `ReportSubmission`
**Status:** ✅ Complete
**Auth Required:** Yes (Worker)
**Bottom Tab:** Reports (📝)

#### Purpose
Submit work reports with photos/videos, description, and optional condition rating.

#### UI Layout

```
┌────────────────────────────────────┐
│  ← Buat Laporan Kerja              │
├────────────────────────────────────┤
│  📸 Foto/Video (1-5)               │
│                                    │
│  ┌──────┐ ┌──────┐ ┌──────┐      │
│  │ IMG  │ │ IMG  │ │ +    │      │
│  │ 200px│ │ 200px│ │ Foto │      │
│  └──────┘ └──────┘ └──────┘      │
│                                    │
│  📝 Deskripsi Pekerjaan            │
│  ┌──────────────────────────────┐ │
│  │ Membersihkan area taman,     │ │
│  │ membuang sampah, dan...      │ │
│  │                               │ │
│  │ (10-500 karakter)            │ │
│  └──────────────────────────────┘ │
│  120/500 karakter                 │
│                                    │
│  🏷 Jenis Pekerjaan                │
│  ┌──────────────────────────────┐ │
│  │ Pembersihan ▼               │ │
│  └──────────────────────────────┘ │
│                                    │
│  ⭐ Kondisi Area (Opsional)       │
│  [ Baik ]  [ Cukup ]  [ Buruk ]   │
│                                    │
│  📍 Lokasi                         │
│  -7.2903, 112.7400 · 15m akurasi  │
│                                    │
│  ┌──────────────────────────────┐ │
│  │      KIRIM LAPORAN           │ │
│  └──────────────────────────────┘ │
│                                    │
│  [   Simpan sebagai Draft   ]    │
└────────────────────────────────────┘
```

#### Components

**State:**
```typescript
interface ReportSubmissionState {
  photos: Photo[]; // Max 5
  videos: Video[]; // Max 1
  description: string; // 10-500 chars
  workType: 'cleaning' | 'planting' | 'maintenance' | 'inspection';
  condition: 'good' | 'fair' | 'poor' | null;
  location: { latitude: number; longitude: number } | null;
  isDraft: boolean;
  isUploading: boolean;
  uploadProgress: number; // 0-100
}

interface Photo {
  uri: string;
  fileName: string;
  fileSize: number;
  type: string;
}
```

**Form Fields:**

1. **Media Picker:**
   - Thumbnails in horizontal scroll
   - Add button to open picker
   - Remove button on each thumbnail
   - Support photos and videos
   - Max 5 photos + 1 video (30sec max)

2. **Description Input:**
   - Multiline text area (4 rows)
   - Character counter (10-500)
   - Auto-save draft every 30s

3. **Work Type Dropdown:**
   ```typescript
   const WORK_TYPES = [
     { value: 'cleaning', label: 'Pembersihan' },
     { value: 'planting', label: 'Penanaman' },
     { value: 'maintenance', label: 'Pemeliharaan' },
     { value: 'inspection', label: 'Inspeksi' },
   ];
   ```

4. **Condition Buttons:**
   - Three-way toggle (optional)
   - Visual feedback when selected
   - Default: null (not selected)

5. **Location Display:**
   - Auto-captured from GPS
   - Read-only display
   - Shows accuracy

#### Media Handling

**Image Picker with Compression:**
```typescript
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import ImageResizer from 'react-native-image-resizer';
import RNFS from 'react-native-fs';

// Photo compression configuration
const PHOTO_CONFIG = {
  maxOriginalSize: 5 * 1024 * 1024,   // 5MB max original
  targetSize: 500 * 1024,               // 500KB target after compression
  maxWidth: 1200,                       // Max dimensions
  maxHeight: 1200,
  quality: 0.7,                         // JPEG quality (0-1)
  thumbnailSize: 200,                   // Thumbnail for preview
  format: 'JPEG' as const,
};

const addPhoto = async () => {
  try {
    // Launch camera
    const result = await launchCamera({
      mediaType: 'photo',
      quality: 1, // Start with high quality, compress later
      includeBase64: false,
    });

    if (result.didCancel || !result.assets?.[0]) {
      return;
    }

    const photo = result.assets[0];

    // Check original size
    if (photo.fileSize && photo.fileSize > PHOTO_CONFIG.maxOriginalSize) {
      showError('Foto terlalu besar (maksimal 5MB)');
      return;
    }

    // Compress photo to target size
    const compressed = await compressPhoto(photo.uri!);

    // Add to photos array
    setPhotos([...photos, {
      uri: compressed.uri,
      fileName: compressed.name,
      fileSize: compressed.size,
      type: 'image/jpeg',
    }]);
  } catch (error) {
    handlePhotoError(error);
  }
};

// Compress photo with iterative quality adjustment
const compressPhoto = async (uri: string): Promise<CompressedPhoto> => {
  let quality = 70; // Start at 70%
  let compressed = await ImageResizer.createResizedImage(
    uri,
    PHOTO_CONFIG.maxWidth,
    PHOTO_CONFIG.maxHeight,
    PHOTO_CONFIG.format,
    quality,
    0 // No rotation
  );

  // Check size and reduce quality if needed
  let stats = await RNFS.stat(compressed.uri);
  let iterations = 0;

  while (stats.size > PHOTO_CONFIG.targetSize && quality > 20 && iterations < 5) {
    quality -= 10;
    iterations++;

    // Delete previous attempt
    await RNFS.unlink(compressed.uri);

    // Try again with lower quality
    compressed = await ImageResizer.createResizedImage(
      uri,
      PHOTO_CONFIG.maxWidth,
      PHOTO_CONFIG.maxHeight,
      PHOTO_CONFIG.format,
      quality,
      0
    );

    stats = await RNFS.stat(compressed.uri);
  }

  return {
    uri: compressed.uri,
    name: compressed.name,
    size: stats.size,
  };
};
```

**Upload Strategy:**
```typescript
const uploadMedia = async (photo: Photo): Promise<string> => {
  const formData = new FormData();
  formData.append('file', {
    uri: photo.uri,
    type: photo.type,
    name: photo.fileName,
  });

  const response = await api.post('/api/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      const progress = (event.loaded / event.total) * 100;
      setUploadProgress(progress);
    },
  });

  return response.data.url; // S3 URL
};
```

#### API Integration

**Endpoint:** `POST /api/reports`

**Request:**
```json
{
  "shift_id": "uuid",
  "description": "Membersihkan area taman dan membuang sampah",
  "work_type": "cleaning",
  "condition": "good",
  "gps_lat": -7.2903,
  "gps_lng": 112.7400,
  "photo_urls": [
    "https://s3.../photo1.jpg",
    "https://s3.../photo2.jpg"
  ],
  "video_url": "https://s3.../video1.mp4"
}
```

**Response:**
```json
{
  "id": "uuid",
  "report_time": "2024-01-15T10:30:00Z",
  "status": "submitted"
}
```

#### Offline Handling

**Draft System:**
```typescript
// Auto-save draft to AsyncStorage
useEffect(() => {
  const saveDraft = async () => {
    if (description.length >= 10) {
      await AsyncStorage.setItem('report_draft', JSON.stringify({
        photos,
        description,
        workType,
        condition,
        timestamp: Date.now(),
      }));
    }
  };

  const timer = setTimeout(saveDraft, 30000); // 30 seconds
  return () => clearTimeout(timer);
}, [photos, description, workType, condition]);
```

**Sync Queue:**
```typescript
const submitReport = async () => {
  const reportData = {
    photos,
    description,
    workType,
    condition,
    location,
  };

  if (!isOnline) {
    // Queue for later sync
    await dispatch(addToSyncQueue({
      type: 'report',
      data: reportData,
      timestamp: Date.now(),
    }));

    showSuccess('Laporan disimpan. Akan dikirim saat online.');
    navigation.goBack();
  } else {
    // Upload immediately
    await dispatch(createReport(reportData));
    navigation.goBack();
  }
};
```

#### User Flow

```
1. Screen loads
   ├─ Get current GPS location
   ├─ Check for saved draft
   └─ If draft exists: Restore data
2. User adds photos/videos
   ├─ Max 5 photos + 1 video
   ├─ Compress if needed
   └─ Show thumbnails
3. User writes description
   ├─ Min 10 characters
   ├─ Auto-save draft every 30s
   └─ Show character count
4. User selects work type (required)
5. User selects condition (optional)
6. User taps "Kirim Laporan"
   ├─ Validate form
   │  - At least 1 photo/video
   │  - Description 10-500 chars
   │  - Work type selected
   ├─ Upload media to S3
   │  - Show progress bar
   │  - Allow cancel
   ├─ Create report via API
   │  ├─ Success → Clear draft, navigate home
   │  └─ Error → Show error, keep data
   └─ If offline → Queue for sync
```

#### Validation Rules

- Minimum 1 photo or video
- Photos: JPEG/PNG, max 5MB each, max 5 photos
- Videos: MP4, max 50MB, max 30 seconds, max 1 video
- Description: 10-500 characters
- Work type: Required
- Condition: Optional
- Location: Auto-captured (required)

#### Error States

**Media Errors:**
- "Ukuran foto terlalu besar (max 5MB)"
- "Format tidak didukung. Gunakan JPEG/PNG"
- "Maksimal 5 foto"
- "Video terlalu panjang (max 30 detik)"

**Form Errors:**
- "Deskripsi terlalu pendek (min 10 karakter)"
- "Pilih jenis pekerjaan"
- "Tambahkan minimal 1 foto atau video"

**Upload Errors:**
- "Gagal mengunggah media. Coba lagi."
- "Koneksi terputus. Laporan disimpan untuk dikirim nanti."

---

## Error Recovery Flows

This section defines comprehensive error handling and recovery strategies for all critical operations in the worker app.

### Clock-In Error Recovery

| Error Code | Error Type | User Message (Indonesian) | Recovery Action | Data Preservation |
|------------|------------|---------------------------|-----------------|-------------------|
| `GPS_PERMISSION_DENIED` | Permission | "Izin lokasi ditolak. Buka Pengaturan untuk mengaktifkan GPS." | Show alert with "Buka Pengaturan" button → Deep link to app settings | None |
| `GPS_UNAVAILABLE` | Hardware | "GPS tidak tersedia. Pastikan GPS aktif di pengaturan." | Show retry button, guide to enable GPS | None |
| `GPS_TIMEOUT` | Network | "GPS timeout. Coba di tempat terbuka." | Auto-retry after 5s (max 3 attempts) | None |
| `GPS_LOW_ACCURACY` | Quality | "Akurasi GPS rendah (>50m). Tunggu sinyal lebih baik." | Show accuracy meter, allow retry | None |
| `OUT_OF_BOUNDS` | Validation | "Anda terlalu jauh dari area kerja (jarak: {distance}m). Pindah ke area yang benar." | Show distance, map view, allow retry | None |
| `CAMERA_PERMISSION_DENIED` | Permission | "Izin kamera ditolak. Buka Pengaturan untuk mengaktifkan kamera." | Show "Buka Pengaturan" button → Deep link | Save GPS data |
| `CAMERA_ERROR` | Hardware | "Gagal mengambil foto. Coba lagi." | Retry camera launch | Save GPS data |
| `PHOTO_TOO_LARGE` | Validation | "Foto terlalu besar. Akan dikompres otomatis." | Auto-compress, then retry | Save GPS + retry upload |
| `ALREADY_CLOCKED_IN` | Business Logic | "Anda sudah clock-in. Gunakan tombol Clock Out untuk menyelesaikan shift." | Navigate to home screen | Fetch current shift |
| `NO_ASSIGNED_AREA` | Business Logic | "Anda belum ditugaskan ke area kerja. Hubungi supervisor." | Show supervisor contact | None |
| `NETWORK_ERROR` | Network | "Koneksi terputus. Clock-in disimpan dan akan dikirim saat online." | Queue to offline storage | Save all data (GPS + photo) |
| `SERVER_ERROR` | Server | "Server sedang bermasalah. Clock-in disimpan dan akan dikirim ulang." | Queue with auto-retry | Save all data (GPS + photo) |
| `UPLOAD_FAILED` | Upload | "Gagal upload foto selfie. Akan dicoba ulang." | Auto-retry with exponential backoff | Save locally, retry later |

**Implementation Example:**

```typescript
// Clock-in error handler
const handleClockInError = async (error: ClockInError) => {
  switch (error.code) {
    case 'GPS_PERMISSION_DENIED':
      Alert.alert(
        'Izin Lokasi Diperlukan',
        'Aplikasi memerlukan akses lokasi untuk clock-in. Buka Pengaturan untuk mengaktifkan.',
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Buka Pengaturan',
            onPress: () => Linking.openSettings(),
          },
        ]
      );
      break;

    case 'OUT_OF_BOUNDS':
      Alert.alert(
        'Di Luar Area Kerja',
        `Anda terlalu jauh dari area kerja (jarak: ${error.distance}m). Pindah ke area yang benar.`,
        [
          { text: 'Tutup', style: 'cancel' },
          {
            text: 'Coba Lagi',
            onPress: () => retryClockIn(),
          },
        ]
      );
      break;

    case 'NETWORK_ERROR':
      // Save to offline queue
      await offlineQueue.addPendingClockIn({
        area_id: areaId,
        gps_lat: latitude,
        gps_lng: longitude,
        selfie_path: photoLocalPath,
      });

      showSuccess('Clock-in disimpan. Akan dikirim saat online.');
      navigation.goBack();
      break;

    case 'CAMERA_PERMISSION_DENIED':
      // Save GPS data, allow retry camera later
      setGpsData({ latitude, longitude, accuracy });
      Alert.alert(
        'Izin Kamera Diperlukan',
        'Aplikasi memerlukan akses kamera untuk foto selfie.',
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Buka Pengaturan',
            onPress: () => Linking.openSettings(),
          },
        ]
      );
      break;

    default:
      showError(error.message || 'Terjadi kesalahan. Coba lagi.');
  }
};
```

### Report Submission Error Recovery

| Error Code | Error Type | User Message (Indonesian) | Recovery Action | Data Preservation |
|------------|------------|---------------------------|-----------------|-------------------|
| `NO_ACTIVE_SHIFT` | Business Logic | "Anda belum clock-in. Clock-in terlebih dahulu untuk membuat laporan." | Navigate to clock-in screen | Save report as draft |
| `PHOTO_REQUIRED` | Validation | "Tambahkan minimal 1 foto atau video." | Highlight photo picker | Preserve all form data |
| `DESCRIPTION_TOO_SHORT` | Validation | "Deskripsi terlalu pendek (minimal 10 karakter)." | Focus description field | Preserve all data |
| `WORK_TYPE_REQUIRED` | Validation | "Pilih jenis pekerjaan." | Highlight work type dropdown | Preserve all data |
| `PHOTO_COMPRESSION_FAILED` | Processing | "Gagal kompres foto. Coba ambil foto lagi." | Allow retry or select different photo | Preserve other photos |
| `UPLOAD_FAILED` | Network | "Gagal upload foto. Coba lagi atau simpan sebagai draft." | Show retry button or save to offline queue | Save locally with retry |
| `NETWORK_ERROR` | Network | "Koneksi terputus. Laporan disimpan dan akan dikirim saat online." | Queue to offline storage | Save all data + photos locally |
| `SERVER_ERROR` | Server | "Server bermasalah. Laporan disimpan untuk dikirim ulang." | Queue with auto-retry | Save all data + photos locally |
| `GPS_ERROR` | Location | "Lokasi tidak tersedia. Laporan akan disimpan dengan lokasi terakhir." | Use last known location or allow manual retry | Preserve form + photos |

**Implementation Example:**

```typescript
// Report submission error handler
const handleReportSubmissionError = async (error: ReportError) => {
  switch (error.code) {
    case 'NO_ACTIVE_SHIFT':
      Alert.alert(
        'Shift Belum Aktif',
        'Anda belum clock-in. Clock-in terlebih dahulu untuk membuat laporan.',
        [
          {
            text: 'Clock In Sekarang',
            onPress: () => navigation.navigate('ClockInOut'),
          },
          {
            text: 'Simpan Draft',
            onPress: () => saveDraft(),
          },
        ]
      );
      break;

    case 'UPLOAD_FAILED':
      Alert.alert(
        'Gagal Upload',
        'Foto tidak dapat diupload. Apakah Anda ingin mencoba lagi atau menyimpan sebagai draft?',
        [
          { text: 'Coba Lagi', onPress: () => retryUpload() },
          {
            text: 'Simpan Offline',
            onPress: async () => {
              await offlineQueue.addPendingReport({
                shift_id: currentShift.id,
                description,
                work_type: workType,
                condition,
                gps_lat: latitude,
                gps_lng: longitude,
                photo_paths: photos.map(p => p.localPath),
              });
              showSuccess('Laporan disimpan. Akan dikirim saat online.');
              navigation.goBack();
            },
          },
        ]
      );
      break;

    case 'NETWORK_ERROR':
      // Auto-save to offline queue
      await offlineQueue.addPendingReport({
        shift_id: currentShift.id,
        description,
        work_type: workType,
        condition,
        gps_lat: latitude,
        gps_lng: longitude,
        photo_paths: photos.map(p => p.localPath),
      });

      showSuccess('Laporan disimpan. Akan dikirim saat online.');
      navigation.goBack();
      break;

    default:
      showError(error.message || 'Terjadi kesalahan. Data tersimpan sebagai draft.');
      await saveDraft();
  }
};

// Auto-save draft every 30 seconds
useEffect(() => {
  if (description.length >= 10) {
    const timer = setTimeout(async () => {
      await AsyncStorage.setItem('report_draft', JSON.stringify({
        photos,
        description,
        workType,
        condition,
        timestamp: Date.now(),
      }));
    }, 30000);

    return () => clearTimeout(timer);
  }
}, [photos, description, workType, condition]);
```

### Clock-Out Error Recovery

| Error Code | Error Type | User Message (Indonesian) | Recovery Action | Data Preservation |
|------------|------------|---------------------------|-----------------|-------------------|
| `NO_ACTIVE_SHIFT` | Business Logic | "Tidak ada shift aktif untuk di-clock-out." | Fetch current shift from server | None |
| `GPS_PERMISSION_DENIED` | Permission | "Izin lokasi diperlukan untuk clock-out. Buka Pengaturan." | Show settings link | None |
| `GPS_TIMEOUT` | Network | "GPS timeout. Clock-out dengan lokasi terakhir?" | Allow proceed or retry | Use last known location |
| `OUT_OF_BOUNDS_WARNING` | Validation | "Anda di luar area kerja (jarak: {distance}m). Lanjutkan clock-out?" | Allow proceed with warning | Proceed with confirmation |
| `NETWORK_ERROR` | Network | "Koneksi terputus. Clock-out disimpan dan akan dikirim saat online." | Queue to offline storage | Save GPS + shift_id |
| `SERVER_ERROR` | Server | "Server bermasalah. Clock-out disimpan untuk dikirim ulang." | Queue with auto-retry | Save GPS + shift_id |

**Note:** Clock-out is more lenient than clock-in. GPS validation allows up to 200m distance (vs 100m for clock-in) to accommodate workers who need to move to different areas during shift.

### Permission Error Recovery

**Location Permission Flow:**

```typescript
const requestLocationPermission = async (): Promise<PermissionResult> => {
  try {
    const result = await requestPermission(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);

    switch (result) {
      case 'granted':
        return { granted: true };

      case 'denied':
        // First denial - explain why needed
        Alert.alert(
          'Izin Lokasi Diperlukan',
          'Aplikasi ini memerlukan akses lokasi untuk memverifikasi Anda berada di area kerja yang benar saat clock-in/out.',
          [
            { text: 'Batal', style: 'cancel' },
            {
              text: 'Izinkan',
              onPress: async () => {
                const retry = await requestPermission(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
                return { granted: retry === 'granted' };
              },
            },
          ]
        );
        return { granted: false, denialType: 'first' };

      case 'blocked':
        // Permanently denied - guide to settings
        Alert.alert(
          'Izin Lokasi Diblokir',
          'Izin lokasi telah diblokir. Buka Pengaturan aplikasi untuk mengaktifkan.',
          [
            { text: 'Batal', style: 'cancel' },
            {
              text: 'Buka Pengaturan',
              onPress: () => Linking.openSettings(),
            },
          ]
        );
        return { granted: false, denialType: 'permanent' };

      default:
        return { granted: false };
    }
  } catch (error) {
    return { granted: false, error };
  }
};
```

**Camera Permission Flow:**

```typescript
const requestCameraPermission = async (): Promise<PermissionResult> => {
  try {
    const result = await requestPermission(PERMISSIONS.ANDROID.CAMERA);

    switch (result) {
      case 'granted':
        return { granted: true };

      case 'denied':
        Alert.alert(
          'Izin Kamera Diperlukan',
          'Aplikasi ini memerlukan akses kamera untuk mengambil foto selfie saat clock-in dan foto laporan kerja.',
          [
            { text: 'Batal', style: 'cancel' },
            {
              text: 'Izinkan',
              onPress: async () => {
                const retry = await requestPermission(PERMISSIONS.ANDROID.CAMERA);
                return { granted: retry === 'granted' };
              },
            },
          ]
        );
        return { granted: false, denialType: 'first' };

      case 'blocked':
        Alert.alert(
          'Izin Kamera Diblokir',
          'Izin kamera telah diblokir. Buka Pengaturan aplikasi untuk mengaktifkan.',
          [
            { text: 'Batal', style: 'cancel' },
            {
              text: 'Buka Pengaturan',
              onPress: () => Linking.openSettings(),
            },
          ]
        );
        return { granted: false, denialType: 'permanent' };

      default:
        return { granted: false };
    }
  } catch (error) {
    return { granted: false, error };
  }
};
```

### Network Error Recovery

**Auto-Retry Strategy:**

```typescript
const RETRY_CONFIG = {
  maxAttempts: 4,
  delays: [0, 1000, 5000, 30000, 60000], // Exponential backoff
  retryableErrors: [
    'NETWORK_ERROR',
    'SERVER_ERROR',
    'TIMEOUT_ERROR',
    'UPLOAD_FAILED',
  ],
};

const executeWithRetry = async <T>(
  operation: () => Promise<T>,
  errorCode: string
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      // Wait for delay (skip on first attempt)
      if (attempt > 0) {
        await new Promise(resolve =>
          setTimeout(resolve, RETRY_CONFIG.delays[attempt])
        );
      }

      // Try operation
      return await operation();

    } catch (error) {
      lastError = error;

      // Check if retryable
      if (!RETRY_CONFIG.retryableErrors.includes(errorCode)) {
        throw error;
      }

      // Log attempt
      console.log(`Retry attempt ${attempt + 1}/${RETRY_CONFIG.maxAttempts}`);
    }
  }

  // All retries failed - save to offline queue
  throw new Error('Max retries exceeded. Saved to offline queue.');
};
```

### User Feedback Patterns

**Toast Messages:**

```typescript
const TOAST_MESSAGES = {
  // Success
  clockInSuccess: 'Clock-in berhasil! Selamat bekerja.',
  clockOutSuccess: 'Clock-out berhasil! Terima kasih atas kerja kerasnya.',
  reportSuccess: 'Laporan berhasil dikirim.',
  offlineQueued: 'Data disimpan. Akan dikirim saat online.',
  syncSuccess: 'Semua data berhasil disinkronisasi.',

  // Warning
  offlineMode: 'Mode offline. Data akan disinkronisasi nanti.',
  lowAccuracy: 'Akurasi GPS rendah. Tunggu sinyal lebih baik.',
  outOfBoundsWarning: 'Anda di luar area. Clock-out tetap diperbolehkan.',

  // Error
  permissionDenied: 'Izin diperlukan. Buka Pengaturan.',
  gpsTimeout: 'GPS timeout. Coba di tempat terbuka.',
  uploadFailed: 'Upload gagal. Mencoba ulang...',
  serverError: 'Server bermasalah. Data tersimpan.',
};
```

**Loading States:**

```typescript
const LOADING_MESSAGES = {
  gettingLocation: 'Mendapatkan lokasi GPS...',
  validatingLocation: 'Memvalidasi lokasi...',
  compressingPhoto: 'Mengompres foto...',
  uploadingPhoto: 'Mengupload foto... {progress}%',
  submittingReport: 'Mengirim laporan...',
  clockingIn: 'Memproses clock-in...',
  clockingOut: 'Memproses clock-out...',
  syncing: 'Menyinkronkan data...',
};
```

---

### WS-4: Work Reports Screen

**Route:** `WorkReports`
**Status:** ✅ Complete
**Auth Required:** Yes (Worker)
**Bottom Tab:** Reports (📝)

#### Purpose
View submitted work reports with filters and detail view.

#### UI Layout

```
┌────────────────────────────────────┐
│  Laporan Kerja      [+ Buat]      │
├────────────────────────────────────┤
│  Filter: [Hari Ini ▼] [Semua ▼]  │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ [IMG]  Pembersihan           │ │
│  │        10:30 WIB · 2 foto    │ │
│  │        Membersihkan area...  │ │
│  │        ✅ Terkirim           │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ [IMG]  Pemeliharaan          │ │
│  │        14:15 WIB · 1 video   │ │
│  │        Memperbaiki...        │ │
│  │        🕒 Menunggu sync      │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ [IMG]  Inspeksi              │ │
│  │        16:00 WIB · 3 foto    │ │
│  │        Memeriksa kondisi...  │ │
│  │        ✅ Direview           │ │
│  └──────────────────────────────┘ │
│                                    │
│  Tidak ada laporan lagi           │
└────────────────────────────────────┘
```

#### Components

**State:**
```typescript
interface WorkReportsState {
  reports: Report[];
  filters: {
    dateRange: 'today' | 'week' | 'month' | 'all';
    workType: WorkType | 'all';
  };
  isLoading: boolean;
  isRefreshing: boolean;
}

interface Report {
  id: string;
  work_type: string;
  report_time: string;
  description: string;
  photo_count: number;
  video_count: number;
  status: 'queued' | 'submitted' | 'reviewed' | 'failed';
  thumbnail_url: string;
}
```

**List Item:**
- Thumbnail (80x80)
- Work type badge
- Time and media count
- Description preview (50 chars)
- Status indicator
- Tap to view detail

**Filter Bar:**
- Date range dropdown (Hari Ini, Minggu Ini, Bulan Ini, Semua)
- Work type dropdown (Semua, Pembersihan, Penanaman, dll)

**Empty State:**
- "Belum ada laporan"
- "Buat laporan pertama Anda" button

#### API Integration

**Endpoint:** `GET /api/reports/my-reports`

**Query Params:**
```
?date_from=2024-01-01
&date_to=2024-01-31
&work_type=cleaning
&limit=20
&offset=0
```

**Response:**
```json
{
  "reports": [...],
  "total": 45,
  "has_more": true
}
```

#### User Flow

```
1. Screen loads
   ├─ Apply default filter (Today)
   ├─ Fetch reports from API
   └─ Show loading state
2. Display report list
   ├─ Grouped by date
   ├─ Most recent first
   └─ Show sync status
3. User can:
   ├─ Tap report → Navigate to detail
   ├─ Change filters → Refetch
   ├─ Pull to refresh → Reload
   ├─ Scroll down → Load more (pagination)
   └─ Tap "+ Buat" → Navigate to submission
```

#### Error Recovery

**Network Errors:**
- Show cached reports from local storage if available
- Display offline indicator: "Mode offline. Menampilkan data tersimpan."
- Pull-to-refresh: Queue refresh request for when online

**Empty State Handling:**
- No reports found: Show "Belum ada laporan" empty state
- Filter returns no results: "Tidak ada laporan untuk filter ini"
- Provide quick action button to create first report

**Pagination Errors:**
- Load more failure: Show "Gagal memuat lebih banyak" with retry button
- Preserve already loaded items
- Allow user to retry without losing scroll position

**Filter Errors:**
- Invalid date range: Reset to default (Today)
- Corrupted filter state: Clear filters, show all reports

**Report Status Sync:**
- Pending sync status: Show 🕒 indicator
- Failed sync: Show ⚠️ indicator with tap to retry
- Synced reports: Show ✅ indicator

**See Also:** [Error Recovery Flows](#error-recovery-flows) for network retry strategies.

---

### WS-5: Location Tracking Screen

**Route:** `LocationTracking`
**Status:** ✅ Complete
**Auth Required:** Yes (Worker)

#### Purpose
Show real-time location tracking status and history for current shift.

#### UI Layout

```
┌────────────────────────────────────┐
│  ← Pelacakan Lokasi                │
├────────────────────────────────────┤
│                                    │
│  Status: 🟢 Aktif                 │
│  Interval: 10 menit                │
│  Terakhir: 10:25 WIB               │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ [         MAP VIEW         ] │ │
│  │                               │ │
│  │   🔵 User location           │ │
│  │   📍 Area boundary (circle)  │ │
│  │   ●●● Location history       │ │
│  │                               │ │
│  └──────────────────────────────┘ │
│                                    │
│  Riwayat Lokasi Hari Ini          │
│                                    │
│  10:25 WIB  -7.2903, 112.7400    │
│  ├─ Akurasi: 12m                  │
│  └─ ✅ Dalam area                 │
│                                    │
│  10:10 WIB  -7.2905, 112.7398    │
│  ├─ Akurasi: 15m                  │
│  └─ ✅ Dalam area                 │
│                                    │
│  08:00 WIB  -7.2903, 112.7400    │
│  └─ Clock In                      │
│                                    │
│  [ Hentikan Pelacakan ]           │
└────────────────────────────────────┘
```

#### Components

**State:**
```typescript
interface LocationTrackingState {
  isTracking: boolean;
  interval: number; // minutes
  lastPing: Date | null;
  locationHistory: LocationPoint[];
  area: Area | null;
}

interface LocationPoint {
  timestamp: Date;
  latitude: number;
  longitude: number;
  accuracy: number;
  isWithinBoundary: boolean;
}
```

**Map View:**
- User current location (blue dot)
- Area boundary (circle overlay)
- Location history (breadcrumb trail)
- Zoom/pan controls

**Location List:**
- Chronological order (newest first)
- Shows timestamp, coordinates, accuracy
- Indicates if within/outside boundary
- Special marker for clock-in/out

#### Background Tracking

```typescript
import BackgroundGeolocation from 'react-native-background-geolocation';

const startTracking = async () => {
  await BackgroundGeolocation.ready({
    desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
    distanceFilter: 50, // meters
    stopTimeout: 5, // minutes
    debug: false,
    logLevel: BackgroundGeolocation.LOG_LEVEL_VERBOSE,
    stopOnTerminate: false,
    startOnBoot: false,
  });

  await BackgroundGeolocation.start();

  BackgroundGeolocation.onLocation((location) => {
    sendLocationToServer(location);
  });
};
```

#### API Integration

**Endpoint:** `POST /api/location/track`

**Request:**
```json
{
  "shift_id": "uuid",
  "gps_lat": -7.2903,
  "gps_lng": 112.7400,
  "accuracy": 12.5,
  "timestamp": "2024-01-15T10:25:00Z"
}
```

**Batch Upload:**
```json
{
  "shift_id": "uuid",
  "locations": [
    {
      "gps_lat": -7.2903,
      "gps_lng": 112.7400,
      "accuracy": 12.5,
      "timestamp": "2024-01-15T10:25:00Z"
    },
    // ... up to 50 locations
  ]
}
```

#### Error Recovery

**GPS/Location Errors:**
- Permission denied: Show "Izin lokasi diperlukan" with settings link
- GPS disabled: Show "Aktifkan GPS" guide with settings button
- Low accuracy (>50m): Show warning indicator on map, continue tracking
- GPS timeout: Retry automatically, show "Mencari sinyal GPS..." indicator

**Background Tracking Errors:**
- Tracking service stopped: Show "Pelacakan berhenti" banner with restart button
- Battery optimization killed service: Guide user to disable battery optimization
- Insufficient battery (<10%): Show low battery warning, suggest stop tracking

**Upload Errors:**
- Network failure: Queue location points locally, batch upload when online
- Server error: Show "Gagal menyimpan lokasi" toast, retry automatically
- Offline mode: Store all locations locally, sync indicator shows pending count

**Map Rendering Errors:**
- Map load failure: Show fallback list view of location history
- No location data: Show "Belum ada data lokasi" empty state
- Invalid coordinates: Filter out, log error, continue with valid points

**State Recovery:**
- Location history persisted in AsyncStorage
- Tracking state preserved across app restarts
- Pending uploads resume automatically on reconnection

**Performance Issues:**
- Too many markers (>100): Cluster markers or show last 50 only
- Memory pressure: Clear old location points (keep last 24 hours)
- Battery drain: Allow user to adjust tracking interval (5min → 10min)

**See Also:** [Permission Error Recovery](#permission-error-recovery) for GPS permission flows.

---

### WS-6: Worker Profile Screen

**Route:** `WorkerProfile`
**Status:** ✅ Complete
**Auth Required:** Yes (Worker)
**Bottom Tab:** Profile (👤)

#### Purpose
View and edit profile, view statistics, logout.

#### UI Layout

```
┌────────────────────────────────────┐
│  Profil                            │
├────────────────────────────────────┤
│                                    │
│         [  Profile Photo  ]        │
│                                    │
│         Ahmad Rizki                │
│         Petugas Lapangan           │
│         081234567890               │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ 📍 Area Kerja                │ │
│  │    Taman Bungkul · Park      │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ 📊 Statistik Bulan Ini       │ │
│  │                               │ │
│  │    Hari Kerja: 18            │ │
│  │    Jam Kerja: 144            │ │
│  │    Laporan: 54               │ │
│  └──────────────────────────────┘ │
│                                    │
│  Pengaturan                       │
│  > Ubah Kata Sandi                │
│  > Notifikasi                     │
│  > Bahasa                         │
│  > Tentang Aplikasi               │
│                                    │
│  [ Keluar ]                       │
│                                    │
│  Versi 1.0.0 (Build 1)            │
└────────────────────────────────────┘
```

#### Components

**State:**
```typescript
interface ProfileState {
  user: User;
  statistics: {
    daysWorked: number;
    hoursWorked: number;
    reportsSubmitted: number;
  };
  isLoading: boolean;
}
```

**Sections:**

1. **Profile Header:**
   - Profile photo (editable - Phase 2)
   - Full name
   - Role label
   - Phone number

2. **Assigned Area Card:**
   - Area name and type
   - Change request button (Phase 2)

3. **Statistics Card:**
   - Days worked this month
   - Total hours this month
   - Reports submitted this month

4. **Settings Menu:**
   - Change password (Phase 2)
   - Notification settings (Phase 2)
   - Language (Phase 2)
   - About app (version, privacy policy)

5. **Logout Button:**
   - Shows confirmation dialog
   - Clears tokens and state
   - Returns to Login

#### API Integration

**Endpoints:**
- `GET /api/workers/profile` - User profile
- `GET /api/workers/statistics?month=2024-01` - Statistics
- `POST /api/auth/logout` - Logout

#### User Flow

```
1. Screen loads
   ├─ Fetch user profile
   └─ Fetch statistics
2. Display profile info
3. User can:
   ├─ View statistics
   ├─ Access settings (Phase 2)
   └─ Tap "Keluar"
       ├─ Show confirmation
       │  "Yakin ingin keluar?"
       │  [Batal] [Ya, Keluar]
       ├─ If confirmed:
       │  - Call logout API
       │  - Clear EncryptedStorage
       │  - Reset Redux state
       │  - Navigate to Login
       └─ If cancelled: Dismiss dialog
```

#### Error Recovery

**Profile Fetch Errors:**
- Network error: Show cached profile data with offline indicator
- Server error: Display last known profile, show "Gagal memuat profil" banner
- 401 Unauthorized: Token expired, force logout and redirect to login
- Missing data: Use default values, log error for investigation

**Statistics Fetch Errors:**
- Network error: Show placeholder "—" or last cached stats
- Server error: Show "Statistik tidak tersedia" message
- Empty data (new user): Show "0" with encouraging message

**Logout Errors:**
- Network error during logout: Clear local data anyway, proceed to login
- Server error during logout: Show warning "Logout mungkin gagal di server" but proceed
- Token already invalid: Silently clear local data, proceed to login
- Pending sync data: Show warning "Ada {count} data belum tersinkronisasi. Lanjutkan keluar?"

**Settings Navigation Errors (Phase 2):**
- Feature not available: Show "Fitur ini belum tersedia" toast
- Permission required: Request permission before navigating

**Photo Upload Errors (Phase 2):**
- Upload failure: Keep existing photo, show "Gagal mengupdate foto"
- File too large: Show "Foto terlalu besar (max 5MB)"
- Invalid format: Show "Format tidak didukung. Gunakan JPEG/PNG"

**State Recovery:**
- Profile data cached in Redux store
- Statistics cached for 24 hours
- Logout works even if offline (clears local data)
- Graceful degradation: Show available data even if some API calls fail

**Data Preservation:**
- Logout with pending sync: Option to defer logout until sync complete
- Logout with active shift: Warning "Shift masih aktif. Clock-out terlebih dahulu?"

---

## Supervisor Stack

### SS-1: Supervisor Map Dashboard

**Route:** `SupervisorMap`
**Status:** ✅ Complete
**Auth Required:** Yes (Supervisor)
**Bottom Tab:** Map (🗺)

#### Purpose
Real-time map view of all active workers with location tracking.

#### UI Layout

```
┌────────────────────────────────────┐
│  Peta Pekerja    [Filter] [Refresh]│
├────────────────────────────────────┤
│                                    │
│  ┌──────────────────────────────┐ │
│  │ [         MAP VIEW         ] │ │
│  │                               │ │
│  │   📍 Worker 1 (Taman A)      │ │
│  │   📍 Worker 2 (Taman B)      │ │
│  │   📍 Worker 3 (Jalan C)      │ │
│  │                               │ │
│  │   ⭕ Area boundaries          │ │
│  │                               │ │
│  └──────────────────────────────┘ │
│                                    │
│  Pekerja Aktif (3)                │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ 🟢 Ahmad Rizki               │ │
│  │    Taman Bungkul · Park      │ │
│  │    Masuk: 08:00 (2j 15m)     │ │
│  │    Update: 5 menit lalu      │ │
│  │    [  Lihat Detail  ]        │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ 🟢 Siti Nurhaliza            │ │
│  │    Jl. Raya Darmo · Street   │ │
│  │    Masuk: 08:15 (2j 0m)      │ │
│  │    Update: 3 menit lalu      │ │
│  │    [  Lihat Detail  ]        │ │
│  └──────────────────────────────┘ │
└────────────────────────────────────┘
```

#### Components

**State:**
```typescript
interface MapDashboardState {
  activeWorkers: WorkerLocation[];
  areas: Area[];
  filters: {
    areaIds: string[];
    areaTypes: string[];
  };
  selectedWorker: WorkerLocation | null;
  isRefreshing: boolean;
  lastUpdate: Date;
}

interface WorkerLocation {
  user_id: string;
  full_name: string;
  area_name: string;
  area_type: string;
  shift_id: string;
  clock_in_time: Date;
  current_location: {
    latitude: number;
    longitude: number;
  };
  last_update: Date;
}
```

**Map Features:**
- Custom markers for each worker
- Color-coded by area type
- Tap marker to show info window
- Show area boundaries (circles)
- Zoom to fit all workers
- Refresh button (manual + auto 60s)

**Worker List:**
- Below map (scrollable)
- Live status indicator
- Time since clock-in
- Last update timestamp
- Detail button

**Filter Dialog:**
- Filter by area
- Filter by area type
- Filter by time range

#### API Integration

**Endpoint:** `GET /api/supervisor/active-workers`

**Response:**
```json
{
  "workers": [
    {
      "user_id": "uuid",
      "full_name": "Ahmad Rizki",
      "area_name": "Taman Bungkul",
      "area_type": "park",
      "shift_id": "uuid",
      "clock_in_time": "2024-01-15T08:00:00Z",
      "current_location": {
        "latitude": -7.2903,
        "longitude": 112.7400
      },
      "last_update": "2024-01-15T10:20:00Z"
    }
  ]
}
```

#### Auto-Refresh

```typescript
useEffect(() => {
  const interval = setInterval(() => {
    fetchActiveWorkers();
  }, 60000); // 60 seconds

  return () => clearInterval(interval);
}, []);
```

---

### SS-2: Supervisor Reports List

**Route:** `SupervisorReports`
**Status:** ✅ Complete
**Auth Required:** Yes (Supervisor)
**Bottom Tab:** Reports (📋)

#### Purpose
View and review worker reports with filtering and approval.

#### UI Layout

```
┌────────────────────────────────────┐
│  Laporan Kerja                     │
├────────────────────────────────────┤
│  [Filter]  [Tanggal: Hari Ini ▼]  │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ [IMG] Ahmad Rizki            │ │
│  │       10:30 · Pembersihan    │ │
│  │       Taman Bungkul · Park   │ │
│  │       Membersihkan area...   │ │
│  │       🕒 Belum Direview      │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ [IMG] Siti Nurhaliza         │ │
│  │       14:15 · Pemeliharaan   │ │
│  │       Jl. Raya Darmo · Street│ │
│  │       Memperbaiki...         │ │
│  │       ✅ Sudah Direview      │ │
│  └──────────────────────────────┘ │
│                                    │
│  🕒 5 laporan menunggu review     │
└────────────────────────────────────┘
```

---

### SS-3: Supervisor Report Detail

**Route:** `SupervisorReportDetail`
**Status:** ✅ Complete
**Auth Required:** Yes (Supervisor)

#### Purpose
View full report details with photo gallery and approve/reject actions.

#### UI Layout

```
┌────────────────────────────────────┐
│  ← Detail Laporan                  │
├────────────────────────────────────┤
│                                    │
│  Ahmad Rizki                       │
│  15 Jan 2024, 10:30 WIB            │
│  Taman Bungkul · Park              │
│                                    │
│  📸 Foto (3)                       │
│  ┌───────┐ ┌───────┐ ┌───────┐   │
│  │ IMG 1 │ │ IMG 2 │ │ IMG 3 │   │
│  └───────┘ └───────┘ └───────┘   │
│  (Tap untuk perbesar)             │
│                                    │
│  📝 Deskripsi                      │
│  Membersihkan area taman,         │
│  membuang sampah, dan merapikan   │
│  tanaman.                          │
│                                    │
│  🏷 Jenis: Pembersihan             │
│  ⭐ Kondisi: Baik                  │
│                                    │
│  📍 Lokasi                         │
│  -7.2903, 112.7400                │
│  [  Lihat di Peta  ]              │
│                                    │
│  Status: 🕒 Belum Direview        │
│                                    │
│  ┌──────────────────────────────┐ │
│  │        SETUJUI               │ │
│  └──────────────────────────────┘ │
│                                    │
│  [     Tolak     ]                │
└────────────────────────────────────┘
```

#### Actions

**Approve:**
```typescript
const approveReport = async (reportId: string) => {
  await api.patch(`/api/supervisor/reports/${reportId}/approve`);
  showSuccess('Laporan disetujui');
  navigation.goBack();
};
```

**Reject (Phase 2):**
```typescript
const rejectReport = async (reportId: string, reason: string) => {
  await api.patch(`/api/supervisor/reports/${reportId}/reject`, { reason });
  showSuccess('Laporan ditolak');
  navigation.goBack();
};
```

---

### SS-4: Supervisor Attendance

**Route:** `SupervisorAttendance`
**Status:** ✅ Complete
**Auth Required:** Yes (Supervisor)
**Bottom Tab:** Attendance (📅)

#### Purpose
View attendance records with filters and export (Phase 2).

#### UI Layout

```
┌────────────────────────────────────┐
│  Kehadiran     [Tanggal: Hari Ini ▼]│
├────────────────────────────────────┤
│                                    │
│  ┌──────────────────────────────┐ │
│  │ Ahmad Rizki                  │ │
│  │ Taman Bungkul · Park         │ │
│  │                               │ │
│  │ Masuk:  08:00 WIB            │ │
│  │ Keluar: 16:15 WIB            │ │
│  │ Durasi: 8j 15m               │ │
│  │ Laporan: 4                   │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ Siti Nurhaliza               │ │
│  │ Jl. Raya Darmo · Street      │ │
│  │                               │ │
│  │ Masuk:  08:15 WIB            │ │
│  │ Keluar: -                    │ │
│  │ Durasi: 2j 0m (aktif)        │ │
│  │ Laporan: 1                   │ │
│  └──────────────────────────────┘ │
│                                    │
│  Total: 3 pekerja · 18.5 jam      │
│                                    │
│  [   Export ke CSV   ]  (Phase 2) │
└────────────────────────────────────┘
```

---

## Common UI Patterns

### Loading States

**Full Screen Loading:**
```
┌────────────────────────────────────┐
│                                    │
│                                    │
│          [  Spinner  ]             │
│          Memuat data...            │
│                                    │
│                                    │
└────────────────────────────────────┘
```

**Inline Loading (Button):**
```
┌──────────────────────────────┐
│ [●] Mengirim...              │
└──────────────────────────────┘
```

### Error States

**Error Banner (dismissible):**
```
┌──────────────────────────────────┐
│ ⚠ Gagal memuat data. [Coba Lagi] [×]│
└──────────────────────────────────┘
```

**Full Screen Error:**
```
┌────────────────────────────────────┐
│                                    │
│            [  ⚠ Icon  ]            │
│         Terjadi Kesalahan          │
│    Gagal memuat data. Periksa      │
│    koneksi internet Anda.          │
│                                    │
│    [  Coba Lagi  ]                │
└────────────────────────────────────┘
```

### Empty States

**Empty List:**
```
┌────────────────────────────────────┐
│                                    │
│            [  📄 Icon  ]           │
│         Belum Ada Data             │
│    Anda belum membuat laporan      │
│    hari ini.                       │
│                                    │
│    [  Buat Laporan  ]             │
└────────────────────────────────────┘
```

### Confirmation Dialogs

```
┌────────────────────────────────────┐
│  Konfirmasi                        │
├────────────────────────────────────┤
│                                    │
│  Yakin ingin clock out sekarang?   │
│                                    │
│  ┌──────────┐   ┌──────────┐     │
│  │  Batal   │   │  Ya, Clock Out │  │
│  └──────────┘   └──────────┘     │
└────────────────────────────────────┘
```

---

## Responsive Design

### Screen Sizes
- Minimum: 320px width (small phones)
- Maximum: 768px width (tablets)
- All layouts use flexbox for responsiveness

### Typography Scaling
```typescript
const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
};
```

### Touch Targets
- Minimum 44x44pt (iOS) / 48x48dp (Android)
- Spacing between tappable elements: 8dp minimum

---

## Accessibility

### Screen Readers
- All images have alt text
- All inputs have labels
- Semantic HTML/native components

### Color Contrast
- Text: Minimum 4.5:1 contrast ratio
- Large text (>18pt): Minimum 3:1
- Interactive elements: Clear focus indicators

### Keyboard Navigation
- Tab order follows visual flow
- All interactive elements focusable
- Enter/Space activates buttons

---

## UI/UX Improvement Recommendations

**Review Date:** 2026-01-16
**Status:** Pending Implementation
**Priority:** High Impact / Medium Effort

### Critical UX Improvements (Week 1 Priority)

#### 1. Password Visibility Toggle (LoginScreen)
**Issue:** No way to verify password entry
**Impact:** High - Reduces login failures
**Implementation:** ~2 hours

Add toggle button to show/hide password with:
- Icon button (44x44pt touch target)
- State management for visibility
- Accessibility label: "Tampilkan password" / "Sembunyikan password"

#### 2. Progress Stepper (ClockInOutScreen)
**Issue:** Users confused about multi-step flow
**Impact:** High - Reduces user confusion
**Implementation:** ~4 hours

Add horizontal stepper showing:
- Step 1: GPS Location
- Step 2: Selfie (clock-in) / Confirmation (clock-out)
- Step 3: Submit
- Visual indicators: pending (○), active (●), complete (✓), error (!)

#### 3. Photo Grid Layout (ReportSubmissionScreen)
**Issue:** Horizontal scroll hides photos
**Impact:** High - Better photo management
**Implementation:** ~6 hours

Replace horizontal FlatList with wrap grid:
- 3-column grid layout
- All photos visible at once
- Photo counter badge showing "3/5"
- Larger thumbnails (150x150 vs 120x120)

#### 4. Touch Target Fixes (All Screens)
**Issue:** Several interactive elements below 44x44pt minimum
**Impact:** Critical - Accessibility compliance
**Implementation:** ~3 hours

Fix:
- Photo remove button: 24px → 44px
- Password toggle: 32px → 44px
- Work type selector: Add 44pt minimum height

#### 5. Color Contrast WCAG Fixes (Theme)
**Issue:** Several text colors fail WCAG AA standards
**Impact:** High - Accessibility compliance
**Implementation:** ~1 hour

Update colors:
- `textSecondary`: #757575 → #616161 (5.74:1 ratio)
- `textHint`: #9E9E9E → #757575 (4.54:1 ratio)

**Total Phase 1:** ~16 hours (2 days)

### Visual Hierarchy Improvements (Week 2 Priority)

#### 6. Enhanced Timer Display (WorkerHomeScreen)
**Features:**
- Progress bar showing % of 8-hour shift
- Status badge: "Shift Aktif" with green dot
- Target display: "Target: 8 jam • 67% selesai"
- Improved empty state with assigned area card

#### 7. GPS Status Card Enhancement (ClockInOutScreen)
**Features:**
- Color-coded accuracy indicator (green/yellow/red)
- Contextual distance display: "22m dari 100m radius"
- Prominent boundary banner with icon
- Loading hints: "Pastikan Anda berada di luar ruangan"

#### 8. Description Input Improvements (ReportSubmissionScreen)
**Features:**
- Real-time character progress bar
- Color-coded feedback (red <10, yellow <100, green ≥100)
- Quick text templates for common work types
- Contextual helper text: "Minimal 5 karakter lagi"

#### 9. Work Type Visual Selector (ReportSubmissionScreen)
**Features:**
- 2-column grid layout with large icons
- Emoji icons (🧹 🌱 🔧 🔍)
- Description text for each type
- Selection checkmark and shadow effect

#### 10. Sticky Submit Footer (ReportSubmissionScreen)
**Features:**
- Always-visible submit button (no scrolling)
- Draft auto-save indicator
- Requirements checklist when form invalid
- Offline mode messaging

**Total Phase 2:** ~24 hours (3 days)

### Accessibility Enhancements (Week 3 Priority)

#### 11. Screen Reader Labels (All Screens)
**Requirements:**
- Add `accessibilityLabel` to all interactive elements
- Add `accessibilityHint` for complex actions
- Use `accessibilityRole` for semantic structure
- Implement `accessibilityLiveRegion` for dynamic content (timer, status)

#### 12. Haptic Feedback (Key Interactions)
**Implementation:**
- Clock-in/out: `impactMedium`
- Photo capture: `impactLight`
- Form errors: `notificationError`
- Success actions: `notificationSuccess`

#### 13. Skeleton Loaders (Loading States)
**Replace spinners with:**
- Card skeleton (animated placeholder)
- List item skeleton
- Photo grid skeleton

#### 14. Focus Indicators (Keyboard Navigation)
**Add visible focus:**
- 2px blue border on focus
- High contrast outline
- Consistent across all inputs/buttons

**Total Phase 3:** ~16 hours (2 days)

### Mobile Performance Optimizations

#### 15. FlatList Optimizations (ReportSubmissionScreen)
```typescript
<FlatList
  data={form.photos}
  renderItem={renderPhotoItem}
  keyExtractor={(item) => item.id}
  // Add these:
  initialNumToRender={3}
  maxToRenderPerBatch={2}
  windowSize={5}
  removeClippedSubviews={true}
  getItemLayout={...}
/>
```

#### 16. Photo Upload Progress Indicator
Show per-photo compression and upload progress:
- "Mengompres foto 1/5... 45%"
- Prevents "app frozen" perception

#### 17. useCallback Optimization
Memoize expensive operations:
- Permission requests
- GPS validation
- Photo compression functions

### Indonesian Language UI Considerations

#### Text Length Handling
- Indonesian translations 20-30% longer than English
- Use shorter synonyms: "Kirim" vs "Mengirimkan"
- Allow multi-line button labels

#### Formality Consistency
- Always use "Anda" (formal) for government context
- Avoid informal "Kamu" or implied informal forms

#### Date/Time Formatting
```typescript
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

format(date, 'd MMMM yyyy, HH:mm', { locale: id });
// Output: "16 Januari 2026, 14:30"
```

### Design System Updates

#### Updated Color Palette (WCAG AA Compliant)
```typescript
colors: {
  // Text (improved contrast)
  textSecondary: '#616161', // 5.74:1 (was #757575)
  textHint: '#757575',      // 4.54:1 (was #9E9E9E)

  // Semantic (improved contrast)
  warning: '#F57C00',       // 4.54:1 (was #FF9800)
  error: '#D32F2F',         // 5.52:1 (was #F44336)
}
```

#### Typography Scale
```typescript
fontSize: {
  xs: 12,    // Helper text
  sm: 14,    // Secondary text
  base: 16,  // Body text (minimum for readability)
  md: 18,    // Emphasized body
  lg: 20,    // Subheadings
  xl: 24,    // Section titles
  '2xl': 28, // Page titles
  '3xl': 36, // Hero text
  '4xl': 48, // Display (timer)
}
```

#### Touch Target Standards
- **Minimum:** 44x44pt (iOS) / 48x48dp (Android)
- **Optimal:** 50-56px for primary actions
- **Spacing:** 8dp minimum between tappable elements

---

**Document Owner:** Mobile Developer
**Last Updated:** 2026-02-05
**Status:** Phase 2 Complete - 17 screens, 10 NB components, 2,141 tests (80.31% coverage)
**Design System:** Neo Brutalism 2.0 (see `specs/design-system/neo-brutalism.md`)
**Related Docs:** [`navigation.md`](navigation.md), [`state-management.md`](state-management.md), [`offline-sync.md`](offline-sync.md), [`design-tokens.md`](design-tokens.md)

---

## NB 2.0 Design Token Migration

**Key Token Changes (Phase 2B):**

| Token | Current | NB 2.0 Required |
|-------|---------|-----------------|
| `nbBorders.default` | 3px | 2px |
| `nbBorders.thin` | 2px | 1px |
| `nbBorderRadius.minimal` | 2px | 6px (base) |
| `nbShadows.sm.shadowOpacity` | 1.0 | 0.18 |
| `nbShadows.sm.shadowRadius` | 0 | 2 |

**See:** history/CHANGELOG.md for complete screen-by-screen migration checklist.

---

## Phase 2C: Client Feedback Changes

> **Full specification:** See [build history](../../history/CHANGELOG.md)

### New Screens (5)

| ID | Screen | Description | Roles |
|----|--------|-------------|-------|
| OT-1 | OvertimeListScreen | List overtime requests with status filter | satgas, linmas, korlap |
| OT-2 | OvertimeSubmitScreen | Submit overtime with embedded aktivitas | satgas, linmas |
| OT-3 | OvertimeApprovalScreen | Review pending overtime requests | korlap |
| OT-4 | OvertimeDetailScreen | Overtime detail with aktivitas photos | Owner + managers |
| TC-1 | TaskCreateScreen | Create tasks with hierarchical assignment | korlap, kepala_rayon, top_mgmt, admin_sys, superadmin |

### Modified Screens (7)

| Screen | Changes |
|--------|---------|
| ClockInOutScreen | Remove GPS boundary UI, area auto-detect from schedule |
| ReportSubmissionScreen → AktivitasSubmissionScreen | Rename, new flow (foto→jenis→deskripsi→lokasi), camera-only, max 3 photos |
| TasksReportsScreen → TasksAktivitasScreen | Rename, add "Tag Saya" filter tab |
| TaskDetailScreen | Add tagged users, rayon scope, simplified completion |
| TaskCompleteScreen | Remove GPS capture, keep description + photo |
| MapDashboardScreen | Updated role-based access (8 roles) |
| RootNavigator | Unified tab config for 8 roles |

### Role-Based Navigation (8 roles)

| Role | Tabs |
|------|------|
| satgas | Home, Aktivitas, Tugas, Lembur, Profil |
| linmas | Home, Aktivitas, Tugas, Lembur, Profil |
| korlap | Home, Aktivitas, Tugas, Monitoring, Profil |
| admin_rayon | Home, Aktivitas, Profil |
| kepala_rayon | Home, Tugas, Monitoring, Profil |
| management | Monitoring, Tugas, Profil |
| admin_system | Monitoring, Tugas, Profil |
| superadmin | Monitoring, Tugas, Profil |

### Phase 2D: Monitoring Enhancements

#### Modified Screens

| Screen | Route | Changes |
|--------|-------|---------|
| MapDashboardScreen | `MonitoringMap` | Major rewrite: polygon rendering (falls back to circle), five-status color markers (active/inactive/outside_area/missing/offline), FAB column (5 buttons: filter/location/zoom+/zoom-/refresh), StatusSummaryBar, UserListStrip, marker tap opens UserDetailSheet |

#### New Sub-Components (Bottom Sheet Navigation)

| Component | Description |
|-----------|-------------|
| UserDetailSheet | Bottom sheet (50-85% snap, `@gorhom/bottom-sheet`) showing shift info, last location, activities/tasks today, WhatsApp/Call/Trail action buttons. Fetches from `GET /monitoring/users/:userId/day-summary` |
| LocationTrail | Polyline overlay on MapView. Green segments inside area, purple outside. Start "S" pin, end "E" pin, clickable points show time/accuracy/battery callout. Fetches from `GET /monitoring/users/:userId/location-history` |
| StatusSummaryBar | 48px horizontal bar below header. Four colored chips (Active/Idle/Outside/Missing) with counts. Tappable to filter map |
| UserListStrip | 80px horizontal scroll at map bottom. Cards sorted: missing > outside > idle > active. Tap to center map + open detail sheet |
| MonitoringFilterModal | Full-screen modal with status multi-select chips, cascading rayon/area dropdowns, role chips, user search, staffing summary card |

#### Updated Screen Count
- Total screens: 17 (no new screens, 1 major rewrite)
- New sub-components: 5 (bottom sheet navigation pattern)

### Phase 2E: Planned Screen Changes (Client Feedback II)

> **Full specification:** See [build history](../../history/CHANGELOG.md)

#### New Screens (2)

| ID | Screen | Description | Roles |
|----|--------|-------------|-------|
| OT-CI | OvertimeClockInScreen | Overtime clock-in with GPS + optional selfie + reason | CLOCKABLE_ROLES |
| OT-CO | OvertimeClockOutScreen | Overtime clock-out with mandatory activity submission | CLOCKABLE_ROLES |

#### Modified Screens (7)

| Screen | Changes |
|--------|---------|
| LoginScreen | `username` → `identifier` input; dynamic keyboard (phone vs text) |
| ProfileScreen | Add profile picture upload/change section |
| ClockInOutScreen | Make selfie optional (add "Skip" button) |
| MapDashboardScreen | Profile pictures in markers; multi-area korlap filter |
| MonitoringFilterModal | Multi-select areas for korlap; admin_rayon rayon-scoped filter |
| TaskDetailScreen | Add audit trail / revision history timeline |
| ActivityDetailScreen | Add audit trail section |

#### New Components (1)

| Component | Description |
|-----------|-------------|
| AuditTrailView | Vertical timeline showing entity change history (revision, approval, status changes) |

#### Navigation Changes

| Role | Change |
|------|--------|
| admin_rayon | **+Home tab** (now clockable); Overtime tab → clock-in/out flow |
| kepala_rayon | **+Home tab** (now clockable); Overtime tab → clock-in/out flow |
| satgas, linmas, korlap | Overtime tab → clock-in/out flow (replaces submission) |

#### Updated Screen Count (Phase 2E)
- Total screens: 19 (+2: OvertimeClockInScreen, OvertimeClockOutScreen)
- Modified: 7 existing screens
- New components: 1 (AuditTrailView)

---

## Phase 3: Plants Management + Monitoring Rebuild + Public Intake

**Status:** Planning (ADR-029–037). Not yet implemented.

### M1-R: Cross-platform parity (mobile native ↔ mobile web ↔ desktop web)

Phase 3 opens with **M1-R Redesign Foundation** (sub-phases 3-R1…3-R5). After M1-R, every mobile screen visually matches its web counterpart at desktop and tablet widths, and the same screens work in mobile web (<768 px) via the web's `ResponsiveShell`. The native app remains the primary field channel; mobile web is a functional escape hatch for supervisors on a phone browser. Roles `satgas`/`linmas`/`korlap` see an install-push banner on mobile-web login directing them to the native app; `staff_kecamatan` submits pruning requests via a dedicated `(kecamatan)` web layout.

| Surface | Native app | Mobile web (<768 px) | Desktop web (≥1280 px) |
|---------|-----------|----------------------|------------------------|
| Login | Full-screen NB form | Same, install-push banner for satgas/linmas/korlap | Centered card, branded sidebar |
| Home (per role) | Bottom-tab nav | ☰ drawer | 220 px sidebar |
| Tasks list | Vertical NB cards | Vertical NB cards | Filterable table |
| Pruning task form | Full-screen NB form, sticky CTA | Full-screen, sticky CTA | Dialog (convert flow) or full page (new) |
| Species autocomplete | Full-screen `NBModal type="fullscreen"` fuzzy | Full-screen sheet | Combobox dropdown |
| Pruning request submit (kecamatan) | 5-step full-screen flow | 5-step full-screen flow on `(kecamatan)` layout | Same, plus breadcrumb |
| Pruning request review (admin_rayon) | Bottom-sheet detail | Vertical card list + filter sheet | Sortable data table + right filter rail |
| Capacity calendar | Read-only chip in ReviewQueue | Vertical week cards (collapsible) + full-screen edit dialog | 7-column week grid editor |
| Monitoring map | Full map + bottom sheets | Full-viewport map + drag-up sheet (10/45/90 % snaps) | Sidebar │ map 65 % │ panel 35 % |
| Modals | `NBModal` (sheet for ≤50 % / fullscreen for complex) | Bottom sheet | Centered Radix Dialog |
| Toasts | `NBToast` bottom | `NBToast` bottom | Toast top-right |

All three presentations consume the **same generated tokens** — colors, shadows, radii, type, motion — emitted by `scripts/build-tokens.ts` from `specs/design-system/tokens.json`. Differences between the three are intentional Layer-3 patterns (input model + screen real estate); never token divergence.

---

### New Screens

| Stack | Screen | File | Role Access |
|-------|--------|------|-------------|
| Monitoring | **MapDashboard v2** (rebuild) | `src/screens/monitoring/MapDashboardScreen.tsx` | korlap / kepala_rayon / admin_rayon / management / admin_system / superadmin |
| Tasks | **Pruning Task Form** (dynamic) | `src/components/tasks/PruningTaskForm.tsx` | satgas / linmas / korlap |
| Tasks | **Task Resume flow** (resume-tomorrow) | `src/screens/tasks/TaskDetailScreen.tsx` (extend) | assignee |
| PruningRequests | Submit Request | `src/screens/pruningRequests/SubmitScreen.tsx` | staff_kecamatan |
| PruningRequests | My Requests | `src/screens/pruningRequests/MyRequestsScreen.tsx` | staff_kecamatan |
| PruningRequests | Request Detail | `src/screens/pruningRequests/RequestDetailScreen.tsx` | owner / admin_rayon (rayon) / management |
| PruningRequests | Review Queue | `src/screens/pruningRequests/ReviewQueueScreen.tsx` | admin_rayon (rayon) |
| Seeds | Seeds List | `src/screens/seeds/SeedsListScreen.tsx` | admin_rayon @ Taman Aktif / management |
| Seeds | Add Transaction | `src/screens/seeds/AddTransactionScreen.tsx` | admin_rayon @ Taman Aktif / management |

### New Components

| Component | File | Notes |
|-----------|------|-------|
| ClusteredUserMarkers | `src/components/monitoring/ClusteredUserMarkers.tsx` | supercluster-backed; MUST preserve `tracksViewChanges={false}` + `key` with `labelMode` + `clusterId` |
| AreaStatusOverlay | `src/components/monitoring/AreaStatusOverlay.tsx` | Polygon fill tinted by `area_plants.status` (ok/due/overdue) |
| MonitoringToggleSheet | `src/components/monitoring/MonitoringToggleSheet.tsx` | Bottom sheet toggles for rayon/area/worker hierarchy + plants overlay |
| SpeciesAutocomplete | `src/components/tasks/SpeciesAutocomplete.tsx` | Autocomplete over 131 species from `plant_species` |

### Mandatory Preservation of Apr 24 Map Fixes

New map components MUST carry forward:
- `tracksViewChanges={false}` on markers; include mode signal in `key`
- `requestAnimationFrame` mount guard for any MapView child that renders async data
- `useFocusEffect` (not one-shot `useEffect`) for tab-revisit data fetches
- LabelMode enum pattern: render bitmap keyed by threshold-zoom mode, not raw zoom float
- No `animateToRegion` call inside marker-press handlers that also trigger bottom-sheet snap

### Navigation Changes

| Role | Change |
|------|--------|
| staff_kecamatan | New role tab set: Submit Request / My Requests / Profile. No Map, no Tasks, no Home. |
| admin_rayon | + Review Queue tab (pruning-requests scoped to `users.rayon_id`) |
| admin_rayon @ Taman Aktif | + Seeds tab |
| management | + Seeds tab (read-only ledger + transaction insert) |

### Redux Slices

New slices: `monitoringV2`, `plants`, `pruningRequests`, `seeds`. Offline-queue scaffolds for `activity.submit`, `activity.partial`, `pruning_request.submit` (full offline polish deferred to Phase 4, ADR-019).

### Updated Screen Count (Phase 3 target)
- Total screens: 27 (+8 vs Phase 2E)
- Modified: MapDashboard, TaskDetail, navigation root
- New components: 4 (cluster markers, area overlay, toggle sheet, species autocomplete)
