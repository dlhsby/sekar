# SEKAR Mobile Overtime Implementation Summary

## 1. OvertimeSubmitScreen.tsx
**Path:** `/home/wahyutrip/wahyutrip/dlhsby/taman/projects/sekar/fe/mobile/src/screens/overtime/OvertimeSubmitScreen.tsx`

### State A (No Active Overtime) - Start Form
**Key State Variables:**
- `reason: string` - Optional reason for overtime
- `startSelfieUri: string | null` - Optional selfie photo URI
- `location: Coordinates | null` - GPS location {latitude, longitude, accuracy}
- `isCapturingLocation: boolean` - GPS loading state
- `startErrors: StartErrors` - Form validation errors

**Data Submitted via handleStartOvertime():**
```
StartOvertimeRequest {
  gps_lat: number
  gps_lng: number
  selfie_photo?: string // base64 with "data:image/jpeg;base64," prefix
  reason?: string
}
```

### State B (Active Overtime) - End Form
**Key State Variables:**
- `endActivityTypeId: string` - Selected activity type UUID
- `endDescription: string` - Work description (required)
- `endPhotos: Photo[]` - 1-3 work evidence photos
- `endSelfieUri: string | null` - Optional end selfie
- `elapsed: string` - Timer formatted as "HH:MM:SS"
- `endErrors: EndErrors` - Form validation errors

**Data Submitted via handleEndOvertime():**
```
EndOvertimeRequest {
  gps_lat: number
  gps_lng: number
  activity_type_id: string // UUID
  description: string
  photo_urls: string[] // base64 photo array
  selfie_photo?: string // base64, optional
}
```

**Key Functions:**
- `captureLocation()` - Gets current GPS via Geolocation.getCurrentPosition
- `makeCaptureHandler(setSelfie)` - Creates photo capture handler using launchCamera
- `validateStartForm()` - Checks location is set
- `validateEndForm()` - Checks activity type, description, ≥1 photo, location
- `handleStartOvertime()` - Converts photo to base64, calls startOvertime API, reinits locationTracker
- `handleEndOvertime()` - Converts photos to base64, calls endOvertime API, stops tracker

## 2. OvertimeDetailScreen.tsx
**Path:** `/home/wahyutrip/wahyutrip/dlhsby/taman/projects/sekar/fe/mobile/src/screens/overtime/OvertimeDetailScreen.tsx`

### Location Trail Integration (Lines 410-436)
```typescript
{canViewTrail && (
  <NBCard style={styles.card}>
    <Text>🗺️ RUTE LOKASI</Text>
    <NBButton
      title="Lihat Rute Lokasi Lembur"
      onPress={() => setShowTrailModal(true)}
    />
  </NBCard>
)}

{showTrailModal && overtime.shift_id && overtime.user_id && (
  <OvertimeTrailModal
    visible={showTrailModal}
    onClose={() => setShowTrailModal(false)}
    userId={overtime.user_id}
    shiftId={overtime.shift_id}
    startDatetime={overtime.start_datetime}
    userName={overtime.user?.full_name || 'Petugas'}
  />
)}
```

### Approval Permissions
- **canViewTrail:** Monitoring roles (korlap, kepala_rayon, top_management, admin_system, superadmin)
- **canClockOut:** overtime owner + status === 'in_progress'
- **canApprove:** Supervisor roles based on area/rayon hierarchy

## 3. LocationTrail Component
**Path:** `/home/wahyutrip/wahyutrip/dlhsby/taman/projects/sekar/fe/mobile/src/components/monitoring/LocationTrail.tsx`

**Props:**
```
LocationTrailProps {
  userId: string
  date: string
  shiftId?: string
  mapRef?: React.RefObject<MapView>
  onClose: () => void
  onHideOthersChange?: (hide: boolean) => void
}
```

**Trail Rendering:**
- Polyline segments color-coded: green (#15803D) inside area, purple (#9333EA) outside
- Start marker: green flag with "Mulai HH:MM"
- End marker: red checkered flag with "Akhir HH:MM"
- Intermediate dots: every 5th point with tooltip showing time/accuracy/battery/area status
- Calls `getUserLocationHistory(userId, date, shiftId)` API

**Data Structure (LocationHistoryPoint):**
```
latitude: number
longitude: number
accuracy: number | null  // meters
battery_level: number | null  // 0-100%
logged_at: string  // ISO timestamp
is_within_area: boolean
```

## 4. Location API (locationApi.ts)
**Path:** `/home/wahyutrip/wahyutrip/dlhsby/taman/projects/sekar/fe/mobile/src/services/api/locationApi.ts`

**uploadLocationBatch() Payload:**
```
LocationBatchRequest {
  shift_id: string
  locations: LocationPoint[]
}

LocationPoint {
  gps_lat: number
  gps_lng: number
  accuracy_meters?: number
  battery_level?: number
  logged_at: string  // ISO timestamp
}
```

## 5. Draft/Storage Patterns
**Findings:** NO DRAFT STORAGE IMPLEMENTATION
- No AsyncStorage usage detected in codebase for drafts
- Only uses react-native-encrypted-storage for auth tokens
- All form state is component-level (useState)
- No persistent offline drafts for overtime/activities/shifts
- Storage service only handles: token, refresh_token, user_data

## 6. Overtime Redux Slice (overtimeSlice.ts)
**State:**
```
OvertimeState {
  myOvertimes: Overtime[]
  pendingApprovals: Overtime[]
  selectedOvertime: Overtime | null
  isLoading: boolean
  isSubmitting: boolean
  error: string | null
}
```

**Actions:** setLoading, setSubmitting, setMyOvertimes, setPendingApprovals, addOvertime, updateOvertime, setSelectedOvertime, setError, clearError, resetState

## 7. Overtime Model
**Full Overtime Interface:**
```
Overtime {
  id: string
  user_id: string
  user?: User
  area_id?: string
  area?: Area
  shift_id?: string | null  // Phase 2E: clock-in/out linked shift
  shift?: {
    id: string
    clock_in_photo_url?: string | null
    clock_out_photo_url?: string | null
  } | null
  start_datetime: string  // ISO 8601
  end_datetime?: string  // Optional while in_progress
  reason?: string  // Start form optional field
  status: OvertimeStatus  // pending | approved | rejected | in_progress
  activity_type_id?: string
  activityType?: ActivityType
  description?: string
  photo_urls?: string[]
  gps_lat?: number
  gps_lng?: number
  rejection_reason?: string
}
```

## 8. LocationHistory Model (Phase 2D)
```
LocationHistory {
  user_id: string
  user_name: string
  role: string
  date: string
  shift_id: string | null
  shift_name: string | null
  area_id: string | null
  area_name: string | null
  clock_in_time: string | null
  clock_out_time: string | null
  points: LocationHistoryPoint[]
  total_points: number
  total_distance_meters: number
  time_inside_area_minutes: number
  time_outside_area_minutes: number
  generated_at: string
}

LocationHistoryPoint {
  latitude: number
  longitude: number
  accuracy: number | null
  battery_level: number | null
  logged_at: string
  is_within_area: boolean
}
```
