# Data Flow Architecture

Comprehensive data flow patterns and sequences for all major SEKAR system operations.

## Core Data Flow Principles

### 1. Client-Server Communication
- **Protocol:** REST over HTTPS
- **Format:** JSON request/response bodies
- **Authentication:** JWT Bearer token in Authorization header
- **Error Format:** Consistent error objects with status codes

### 2. Offline-First Mobile Pattern
- **Write Operations:** Queue locally → Sync when online
- **Read Operations:** Local cache first → Fetch if stale/missing
- **Conflict Resolution:** Last-write-wins (Phase 1), server-authoritative

### 3. Media Upload Pattern
- **Small files (<5MB):** Direct API upload via multipart/form-data
- **Large files (>5MB):** Presigned S3 URL → Direct upload → Callback API
- **Thumbnails:** Generated asynchronously via Lambda

---

## Authentication Flows

### AF-1: User Login

```
┌────────┐                ┌─────────┐              ┌──────────┐
│ Mobile │                │   API   │              │    DB    │
└───┬────┘                └────┬────┘              └────┬─────┘
    │                          │                        │
    │ POST /api/auth/login     │                        │
    │ { phone, password }      │                        │
    ├─────────────────────────>│                        │
    │                          │                        │
    │                          │ Find user by phone     │
    │                          ├───────────────────────>│
    │                          │                        │
    │                          │<───────────────────────┤
    │                          │ User record            │
    │                          │                        │
    │                          │ Verify password        │
    │                          │ (bcrypt.compare)       │
    │                          │                        │
    │                          │ Generate JWT           │
    │                          │ (user_id, role)        │
    │                          │                        │
    │<─────────────────────────┤                        │
    │ 200 OK                   │                        │
    │ { token, user }          │                        │
    │                          │                        │
    │ Store token securely     │                        │
    │ (EncryptedStorage)       │                        │
    │                          │                        │
```

**Validation:**
1. Phone number format (10-13 digits)
2. Password minimum 6 characters
3. User exists and not soft-deleted
4. Password matches hash

**Error Cases:**
- `401 Unauthorized`: Invalid credentials
- `404 Not Found`: User not found
- `403 Forbidden`: Account deactivated

---

### AF-2: Token Refresh (Phase 2+)

```
Mobile → API: POST /api/auth/refresh
           Headers: Authorization: Bearer {expired_token}

API → DB: Verify refresh token not revoked
API → Mobile: 200 OK { token: new_jwt, refreshToken }

Mobile: Store new token
```

---

## Clock-In/Out Flows

### CIO-1: Clock-In Sequence

```
┌────────┐     ┌─────┐     ┌─────────┐     ┌─────┐     ┌──────┐
│ Mobile │     │ GPS │     │   API   │     │ DB  │     │  S3  │
└───┬────┘     └──┬──┘     └────┬────┘     └──┬──┘     └───┬──┘
    │             │              │             │            │
    │ Request location           │             │            │
    │ permission │               │             │            │
    ├────────────>│               │             │            │
    │             │               │             │            │
    │<────────────┤               │             │            │
    │ Permission granted          │             │            │
    │             │               │             │            │
    │ Get current coordinates     │             │            │
    ├────────────>│               │             │            │
    │             │               │             │            │
    │<────────────┤               │             │            │
    │ Lat/Lng     │               │             │            │
    │             │               │             │            │
    │ Open camera                 │             │            │
    │ Capture selfie              │             │            │
    │             │               │             │            │
    │ POST /api/shifts/clock-in   │             │            │
    │ { areaId, lat, lng, photo } │             │            │
    ├────────────────────────────>│             │            │
    │             │               │             │            │
    │             │               │ Verify JWT  │            │
    │             │               │             │            │
    │             │               │ Get area    │            │
    │             │               │ boundaries  │            │
    │             │               ├────────────>│            │
    │             │               │             │            │
    │             │               │<────────────┤            │
    │             │               │ Area data   │            │
    │             │               │             │            │
    │             │               │ Validate GPS│            │
    │             │               │ (Haversine) │            │
    │             │               │             │            │
    │             │               │ Check worker│            │
    │             │               │ assignment  │            │
    │             │               ├────────────>│            │
    │             │               │             │            │
    │             │               │<────────────┤            │
    │             │               │ Assignment  │            │
    │             │               │             │            │
    │             │               │ Upload photo│            │
    │             │               ├────────────────────────>│
    │             │               │             │            │
    │             │               │<────────────────────────┤
    │             │               │ S3 URL      │            │
    │             │               │             │            │
    │             │               │ Create shift│            │
    │             │               │ record      │            │
    │             │               ├────────────>│            │
    │             │               │             │            │
    │             │               │<────────────┤            │
    │             │               │ Shift ID    │            │
    │             │               │             │            │
    │<────────────────────────────┤             │            │
    │ 201 Created                 │             │            │
    │ { shift }   │               │             │            │
    │             │               │             │            │
    │ Start location tracking     │             │            │
    │ (15 min intervals)          │             │            │
    │             │               │             │            │
```

**Validation Rules:**
1. GPS accuracy < 50 meters
2. Distance to area center < 100 meters (Haversine)
3. Worker assigned to this area
4. No active shift exists
5. Photo file size < 5MB
6. Photo format: JPEG/PNG

**Business Logic:**
```typescript
// Haversine distance calculation
const R = 6371e3; // Earth radius in meters
const φ1 = lat1 * Math.PI / 180;
const φ2 = lat2 * Math.PI / 180;
const Δφ = (lat2 - lat1) * Math.PI / 180;
const Δλ = (lng2 - lng1) * Math.PI / 180;

const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
const distance = R * c; // in meters

if (distance > 100) {
  throw new BadRequestException('Too far from work area');
}
```

**Error Cases:**
- `400 Bad Request`: GPS validation failed, already clocked in
- `403 Forbidden`: Not assigned to this area
- `404 Not Found`: Area not found
- `413 Payload Too Large`: Photo too large

---

### CIO-2: Clock-Out Sequence

```
Mobile → GPS: Get current location
GPS → Mobile: Lat/Lng

Mobile → Camera: Capture selfie
Camera → Mobile: Photo

Mobile → API: POST /api/shifts/{shiftId}/clock-out
             { lat, lng, photo }

API → DB: Get shift record
API: Validate shift is active
API: Validate GPS (same area)
API → S3: Upload clock-out photo
API → DB: Update shift (clock_out_time, clock_out_photo, location)
API → Mobile: 200 OK { shift }

Mobile: Stop location tracking
Mobile: Update local state
```

**Validation Rules:**
1. Shift exists and belongs to user
2. Shift is active (clock_out_time is null)
3. GPS within area boundary (100m tolerance)
4. Photo required

---

### CIO-3: Location Tracking During Shift

```
┌────────┐          ┌─────┐          ┌─────────┐
│ Mobile │          │ GPS │          │   API   │
└───┬────┘          └──┬──┘          └────┬────┘
    │                  │                  │
    │ Every 15 minutes │                  │
    ├─────────────────>│                  │
    │                  │                  │
    │<─────────────────┤                  │
    │ Lat/Lng          │                  │
    │                  │                  │
    │ POST /api/location/track            │
    │ { shiftId, lat, lng, timestamp }    │
    ├─────────────────────────────────────>│
    │                  │                  │
    │                  │          Verify shift active
    │                  │          Store location point
    │                  │                  │
    │<─────────────────────────────────────┤
    │ 201 Created      │                  │
    │                  │                  │
```

**Offline Handling:**
- Queue location points locally
- Batch upload when online (max 50 points per request)
- Include timestamp for accurate tracking

---

## Work Report Flows

### WR-1: Submit Work Report

```
┌────────┐     ┌────────┐     ┌─────────┐     ┌─────┐     ┌──────┐
│ Mobile │     │ Camera │     │   API   │     │ DB  │     │  S3  │
└───┬────┘     └───┬────┘     └────┬────┘     └──┬──┘     └───┬──┘
    │              │               │             │            │
    │ Worker fills form            │             │            │
    │ (description, work_type)     │             │            │
    │              │               │             │            │
    │ Tap "Add Photo"              │             │            │
    ├─────────────>│               │             │            │
    │              │               │             │            │
    │<─────────────┤               │             │            │
    │ Photo(s)     │               │             │            │
    │              │               │             │            │
    │ [If offline] │               │             │            │
    │ Store in AsyncStorage        │             │            │
    │ Show "Queued" badge          │             │            │
    │              │               │             │            │
    │ [If online]  │               │             │            │
    │ POST /api/reports            │             │            │
    │ { shiftId, description,      │             │            │
    │   workType, photos[] }       │             │            │
    ├─────────────────────────────>│             │            │
    │              │               │             │            │
    │              │               │ Verify shift active      │
    │              │               ├────────────>│            │
    │              │               │             │            │
    │              │               │<────────────┤            │
    │              │               │             │            │
    │              │               │ Upload photos (parallel) │
    │              │               ├────────────────────────>│
    │              │               ├────────────────────────>│
    │              │               ├────────────────────────>│
    │              │               │             │            │
    │              │               │<────────────────────────┤
    │              │               │ S3 URLs     │            │
    │              │               │             │            │
    │              │               │ Create report           │
    │              │               ├────────────>│            │
    │              │               │             │            │
    │              │               │<────────────┤            │
    │              │               │ Report ID   │            │
    │              │               │             │            │
    │<─────────────────────────────┤             │            │
    │ 201 Created  │               │             │            │
    │ { report }   │               │             │            │
    │              │               │             │            │
```

**Request Format:**
```typescript
POST /api/reports
Content-Type: multipart/form-data

{
  shift_id: "uuid",
  description: "Membersihkan area taman",
  work_type: "cleaning",
  photos: [File, File, File] // Max 5 photos
}
```

**Validation Rules:**
1. Shift exists and is active
2. Description 10-500 characters
3. work_type in enum (cleaning, planting, maintenance, inspection)
4. 1-5 photos required
5. Each photo < 5MB
6. Photo format: JPEG/PNG

**Offline Queue Structure:**
```typescript
interface QueuedReport {
  id: string; // Local UUID
  shift_id: string;
  description: string;
  work_type: string;
  photos: string[]; // Local file URIs
  timestamp: Date;
  status: 'queued' | 'syncing' | 'failed';
  retryCount: number;
}
```

---

### WR-2: View Work Reports (Worker)

```
Mobile → API: GET /api/reports/my-reports?shift_id={id}

API → DB: Query reports WHERE shift_id = {id}
API → Mobile: 200 OK { reports: [...] }

Mobile: Display list with thumbnails
```

**Response Format:**
```json
{
  "reports": [
    {
      "id": "uuid",
      "shift_id": "uuid",
      "description": "Membersihkan area taman",
      "work_type": "cleaning",
      "photos": [
        "https://s3.../photo1.jpg",
        "https://s3.../photo2.jpg"
      ],
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### WR-3: Review Reports (Supervisor)

```
Supervisor Web → API: GET /api/supervisor/reports?date={date}&status=pending

API → DB: Query reports with filters
          JOIN shifts, users, areas
          WHERE supervisor_id = current_user

API → Web: 200 OK { reports: [...] }

Web: Display in table with filters

--- Approve Report ---

Web → API: PATCH /api/supervisor/reports/{id}/approve
          { notes: "Good work" }

API → DB: Update report status = 'approved'
          Store supervisor notes

API → Web: 200 OK { report }

[Phase 2+]
API → Push Notification: Notify worker
```

---

## Supervisor Dashboard Flows

### SD-1: Real-Time Worker Map

```
Supervisor Web → API: GET /api/supervisor/active-workers

API → DB: Query active shifts with latest location
          SELECT shifts.*, locations.*
          FROM shifts
          JOIN users ON shifts.user_id = users.id
          JOIN LATERAL (
            SELECT * FROM location_tracking
            WHERE shift_id = shifts.id
            ORDER BY timestamp DESC LIMIT 1
          ) locations ON true
          WHERE shifts.clock_out_time IS NULL
          AND shifts.assigned_supervisor_id = {current_user}

API → Web: 200 OK { workers: [...] }

Web: Plot markers on map
Web: Update every 60 seconds (polling)

[Phase 3+]
Web: Use WebSocket for real-time updates
```

**Response Format:**
```json
{
  "workers": [
    {
      "user": {
        "id": "uuid",
        "name": "John Doe",
        "phone": "081234567890"
      },
      "shift": {
        "id": "uuid",
        "clock_in_time": "2024-01-15T08:00:00Z",
        "area": {
          "name": "Taman Bungkul"
        }
      },
      "location": {
        "latitude": -7.289,
        "longitude": 112.734,
        "timestamp": "2024-01-15T10:25:00Z"
      }
    }
  ]
}
```

---

### SD-2: Daily Summary Statistics

```
Web → API: GET /api/supervisor/dashboard/summary?date=2024-01-15

API → DB: Multiple aggregation queries:
          1. COUNT active shifts
          2. COUNT completed shifts
          3. COUNT pending reports
          4. SUM work hours
          5. COUNT absent workers

API → Web: 200 OK { summary }

Web: Display in cards/widgets
```

---

## Offline Sync Flows

### OS-1: Sync Queue Processing

```
┌────────┐              ┌─────────────┐              ┌─────────┐
│ Mobile │              │ Sync Queue  │              │   API   │
└───┬────┘              └──────┬──────┘              └────┬────┘
    │                          │                          │
    │ Network restored         │                          │
    ├─────────────────────────>│                          │
    │                          │                          │
    │                          │ Get queued items (FIFO)  │
    │                          │                          │
    │                          │ Process item 1: Clock-in │
    │                          ├─────────────────────────>│
    │                          │                          │
    │                          │<─────────────────────────┤
    │                          │ Success                  │
    │                          │                          │
    │                          │ Remove from queue        │
    │                          │                          │
    │                          │ Process item 2: Report   │
    │                          ├─────────────────────────>│
    │                          │                          │
    │                          │<─────────────────────────┤
    │                          │ Success                  │
    │                          │                          │
    │                          │ Remove from queue        │
    │                          │                          │
    │<─────────────────────────┤                          │
    │ Sync complete (2/2)      │                          │
    │                          │                          │
```

**Queue Priority:**
1. Clock-in/out (highest)
2. Location tracking
3. Work reports
4. Profile updates (lowest)

**Retry Strategy:**
- Exponential backoff: 1s, 2s, 4s, 8s, 16s (max)
- Max retries: 5
- Failed items: Mark as "requires manual review"

**Conflict Resolution:**
- Server timestamp wins (server-authoritative)
- Merge non-conflicting fields
- Log conflicts for admin review (Phase 2+)

---

### OS-2: Data Refresh Strategy

```
Mobile App Launch
  ↓
Check network status
  ↓
[If online]
  ↓
Fetch user profile
Fetch today's shift (if exists)
Fetch assigned areas
Fetch pending reports
  ↓
Store in Redux + AsyncStorage
  ↓
[If offline]
  ↓
Load from AsyncStorage
Show "Offline" indicator
```

**Cache Invalidation:**
- User profile: 24 hours
- Areas: 7 days
- Shifts: On app open + after clock-in/out
- Reports: After submission

---

## Media Upload Flows

### MU-1: Direct API Upload (Small Files)

```
Mobile → API: POST /api/reports
           Content-Type: multipart/form-data
           Body: FormData with photos

API → S3: PutObject for each photo
API → DB: Store S3 URLs in report record
API → Mobile: 201 Created { report }
```

---

### MU-2: Presigned URL Upload (Large Files) - Phase 2+

```
Mobile → API: POST /api/media/presigned-url
           { filename, contentType, size }

API: Generate presigned S3 POST URL (15 min expiration)
API → Mobile: 200 OK { uploadUrl, fields }

Mobile → S3: POST {uploadUrl}
          FormData with fields + file

S3 → Mobile: 204 No Content

Mobile → API: POST /api/reports
           { ..., photoUrls: ["s3://..."] }

API → DB: Store report with S3 URLs
API → Mobile: 201 Created { report }
```

---

## Error Handling Patterns

### Overview

This section documents error recovery sequences for all major flows. Each flow includes retry logic, offline queueing, and graceful degradation strategies.

**Error Recovery Principles:**
1. **Fail Gracefully**: Never crash the app; always show user-friendly messages
2. **Auto-Retry**: Use exponential backoff for transient errors (network, server 5xx)
3. **Queue Offline**: Save critical operations to AsyncStorage for later sync
4. **Preserve Data**: Never lose user input (photos, reports, location data)
5. **Clear Feedback**: Show specific error messages and recovery actions

---

### ER-1: Network Error Recovery with Exponential Backoff

**Scenario**: API request fails due to network unavailability

```
Mobile App              AsyncStorage         API Server
    │                        │                     │
    │ POST /shifts/clock-in  │                     │
    ├────────────────────────┼─────────────────────X Network Error
    │                        │                     │
    │ Detect network error   │                     │
    │                        │                     │
    │ Save to offline queue  │                     │
    ├───────────────────────>│                     │
    │                        │                     │
    │ Show "Saved offline"   │                     │
    │                        │                     │
    │ Retry attempt 1 (1s)   │                     │
    ├────────────────────────┼─────────────────────X Still offline
    │                        │                     │
    │ Retry attempt 2 (2s)   │                     │
    ├────────────────────────┼─────────────────────X Still offline
    │                        │                     │
    │ Retry attempt 3 (4s)   │                     │
    ├────────────────────────┼────────────────────>│
    │                        │                     │ Network restored
    │                        │                     │
    │                        │<────────────────────┤
    │<───────────────────────┼─────────────────────┤ 201 Created
    │                        │                     │
    │ Remove from queue      │                     │
    ├───────────────────────>│                     │
    │                        │                     │
    │ Show "Sync complete"   │                     │
    │                        │                     │
```

**Exponential Backoff Strategy:**
```typescript
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000]; // milliseconds
const MAX_RETRIES = 5;

async function retryWithBackoff(operation: () => Promise<any>, attempt = 0) {
  try {
    return await operation();
  } catch (error) {
    if (attempt >= MAX_RETRIES || !isRetryable(error)) {
      throw error;
    }
    
    const delay = RETRY_DELAYS[attempt];
    await sleep(delay);
    return retryWithBackoff(operation, attempt + 1);
  }
}

function isRetryable(error: any): boolean {
  // Network errors
  if (!error.response) return true;
  
  // Server errors (5xx)
  if (error.response.status >= 500) return true;
  
  // Rate limiting (429)
  if (error.response.status === 429) return true;
  
  // Don't retry client errors (4xx except 429)
  return false;
}
```

**User Feedback:**
- Attempt 1-2: Show spinner with "Menghubungi server..."
- Attempt 3-4: Show "Koneksi lambat. Mencoba lagi..."
- Attempt 5+: Show "Disimpan offline. Akan dikirim otomatis saat online."

---

### ER-2: Token Expiration Recovery

**Scenario**: Access token expires during API request, auto-refresh and retry

```
Mobile App              Token Store           API Server
    │                        │                     │
    │ GET /shifts/active     │                     │
    │ Authorization: Bearer accessToken            │
    ├────────────────────────┼────────────────────>│
    │                        │                     │
    │                        │                     │ Validate token
    │                        │                     │ Token expired
    │                        │                     │
    │                        │<────────────────────┤
    │<───────────────────────┼─────────────────────┤ 401 Unauthorized
    │                        │                     │ { code: "TOKEN_EXPIRED" }
    │                        │                     │
    │ Detect token expiration│                     │
    │                        │                     │
    │ Get refresh token      │                     │
    ├───────────────────────>│                     │
    │<───────────────────────┤                     │
    │ refreshToken          │                     │
    │                        │                     │
    │ POST /auth/refresh     │                     │
    │ Body: { refreshToken } │                     │
    ├────────────────────────┼────────────────────>│
    │                        │                     │
    │                        │                     │ Validate refresh token
    │                        │                     │ Generate new tokens
    │                        │                     │
    │                        │<────────────────────┤
    │<───────────────────────┼─────────────────────┤ 200 OK
    │                        │                     │ { accessToken, refreshToken }
    │                        │                     │
    │ Store new tokens       │                     │
    ├───────────────────────>│                     │
    │                        │                     │
    │ Retry original request │                     │
    │ GET /shifts/active     │                     │
    │ Authorization: Bearer newAccessToken         │
    ├────────────────────────┼────────────────────>│
    │                        │                     │
    │                        │<────────────────────┤
    │<───────────────────────┼─────────────────────┤ 200 OK
    │                        │                     │ { shift }
    │                        │                     │
```

**Axios Interceptor Implementation:**
```typescript
// Add response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if error is token expiration and we haven't retried yet
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      
      try {
        // Get refresh token
        const refreshToken = await getRefreshToken();
        
        // Refresh the token
        const { data } = await apiClient.post('/auth/refresh', {
          refreshToken,
        });
        
        // Store new tokens
        await storeTokens(data.accessToken, data.refreshToken);
        
        // Update authorization header
        originalRequest.headers['Authorization'] = `Bearer ${data.accessToken}`;
        
        // Retry original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout user
        await logout();
        navigation.navigate('Login');
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
```

**Edge Cases:**
- Refresh token also expired → Force logout, navigate to Login
- Multiple requests fail simultaneously → Queue requests, refresh once, retry all
- Refresh fails (server error) → Retry refresh with backoff, max 3 attempts

---

### ER-3: GPS Validation Failure Recovery

**Scenario**: Clock-in fails due to GPS out of bounds, guide user to correct location

```
Mobile App              GPS Service           API Server           Map Service
    │                        │                     │                     │
    │ Request location       │                     │                     │
    ├───────────────────────>│                     │                     │
    │                        │                     │                     │
    │<───────────────────────┤                     │                     │
    │ Coordinates: (-7.25, 112.74)                │                     │
    │ Accuracy: 12m          │                     │                     │
    │                        │                     │                     │
    │ POST /shifts/clock-in  │                     │                     │
    │ { areaId, gps_lat, gps_lng }                │                     │
    ├────────────────────────┼────────────────────>│                     │
    │                        │                     │                     │
    │                        │                     │ Calculate distance  │
    │                        │                     │ Distance: 150m      │
    │                        │                     │ Max allowed: 100m   │
    │                        │                     │                     │
    │                        │<────────────────────┤                     │
    │<───────────────────────┼─────────────────────┤ 400 Bad Request     │
    │                        │                     │ { code: "GPS_OUT_OF_BOUNDS",
    │                        │                     │   distance: 150,    │
    │                        │                     │   maxDistance: 100, │
    │                        │                     │   boundaryCenter: {...} }
    │                        │                     │                     │
    │ Show error modal       │                     │                     │
    │ "Anda 150m dari lokasi"│                     │                     │
    │                        │                     │                     │
    │ Fetch area boundary    │                     │                     │
    ├────────────────────────┼────────────────────>│                     │
    │                        │                     │                     │
    │                        │<────────────────────┤                     │
    │<───────────────────────┼─────────────────────┤ 200 OK              │
    │                        │                     │ { boundary: [...] } │
    │                        │                     │                     │
    │ Request map display    │                     │                     │
    ├────────────────────────┼─────────────────────┼────────────────────>│
    │                        │                     │                     │
    │<───────────────────────┼─────────────────────┼─────────────────────┤
    │ Show map with:         │                     │                     │
    │ - User location (red)  │                     │                     │
    │ - Boundary (blue polygon)                   │                     │
    │ - Distance indicator   │                     │                     │
    │ - "Retry" button       │                     │                     │
    │                        │                     │                     │
    │ User moves closer      │                     │                     │
    │                        │                     │                     │
    │ Tap "Retry"            │                     │                     │
    │                        │                     │                     │
    │ Request location again │                     │                     │
    ├───────────────────────>│                     │                     │
    │                        │                     │                     │
    │<───────────────────────┤                     │                     │
    │ Coordinates: (-7.249, 112.741)              │                     │
    │ Accuracy: 8m           │                     │                     │
    │                        │                     │                     │
    │ POST /shifts/clock-in  │                     │                     │
    ├────────────────────────┼────────────────────>│                     │
    │                        │                     │                     │
    │                        │                     │ Calculate distance  │
    │                        │                     │ Distance: 45m ✓     │
    │                        │                     │                     │
    │                        │<────────────────────┤                     │
    │<───────────────────────┼─────────────────────┤ 201 Created         │
    │                        │                     │ { shift }           │
    │                        │                     │                     │
    │ Show success           │                     │                     │
    │ Navigate to active shift                    │                     │
    │                        │                     │                     │
```

**Error Message Display:**
```typescript
if (error.code === 'GPS_OUT_OF_BOUNDS') {
  Alert.alert(
    'Terlalu Jauh dari Lokasi',
    `Anda berada ${error.distance}m dari area kerja (maksimal ${error.maxDistance}m).\n\n` +
    'Pindah lebih dekat ke area yang ditandai pada peta.',
    [
      {
        text: 'Lihat Peta',
        onPress: () => showBoundaryMap(error.boundaryCenter, error.boundary),
      },
      {
        text: 'Coba Lagi',
        onPress: () => retryClockIn(),
      },
    ]
  );
}
```

**Related Error Codes:**
- `GPS_PERMISSION_DENIED` → Guide to settings
- `GPS_LOW_ACCURACY` (>50m) → Wait for better signal
- `GPS_TIMEOUT` → Retry location request

---

### ER-4: Photo Upload Retry with Progressive Compression

**Scenario**: Photo upload fails, retry with compression to reduce size

```
Mobile App              Camera/Gallery        API Server           S3 Storage
    │                        │                     │                     │
    │ Capture/select photo   │                     │                     │
    ├───────────────────────>│                     │                     │
    │                        │                     │                     │
    │<───────────────────────┤                     │                     │
    │ Photo: 4.2MB           │                     │                     │
    │ Dimensions: 4000x3000  │                     │                     │
    │                        │                     │                     │
    │ POST /reports          │                     │                     │
    │ FormData: photos[]     │                     │                     │
    │ Size: 4.2MB            │                     │                     │
    ├────────────────────────┼────────────────────>│                     │
    │                        │                     │                     │
    │                        │                     │ PutObject photo    │
    │                        │                     ├────────────────────>│
    │                        │                     │                     X
    │                        │                     │<────────────────────┤
    │                        │                     │ Network timeout     │
    │                        │                     │                     │
    │                        │<────────────────────┤                     │
    │<───────────────────────┼─────────────────────┤ 500 Internal Error  │
    │                        │                     │ "S3 upload timeout" │
    │                        │                     │                     │
    │ Detect upload failure  │                     │                     │
    │                        │                     │                     │
    │ Compress photo 80%     │                     │                     │
    │ New size: 1.8MB        │                     │                     │
    │ Dimensions: 2000x1500  │                     │                     │
    │                        │                     │                     │
    │ Retry: POST /reports   │                     │                     │
    │ FormData: compressed   │                     │                     │
    ├────────────────────────┼────────────────────>│                     │
    │                        │                     │                     │
    │                        │                     │ PutObject photo    │
    │                        │                     ├────────────────────>│
    │                        │                     │                     │
    │                        │                     │<────────────────────┤
    │                        │                     │ Success             │
    │                        │                     │                     │
    │                        │<────────────────────┤                     │
    │<───────────────────────┼─────────────────────┤ 201 Created         │
    │                        │                     │ { report }          │
    │                        │                     │                     │
    │ Show success           │                     │                     │
    │ Delete local copy      │                     │                     │
    │                        │                     │                     │
```

**Progressive Compression Strategy:**
```typescript
const COMPRESSION_LEVELS = [
  { quality: 1.0, maxWidth: 4000 },   // Original
  { quality: 0.8, maxWidth: 2000 },   // First retry
  { quality: 0.6, maxWidth: 1500 },   // Second retry
  { quality: 0.4, maxWidth: 1000 },   // Third retry
];

async function uploadPhotoWithRetry(photo: Photo, attempt = 0) {
  try {
    const compression = COMPRESSION_LEVELS[attempt];
    const compressedPhoto = await compressImage(photo, compression);
    
    return await uploadPhoto(compressedPhoto);
  } catch (error) {
    if (attempt < COMPRESSION_LEVELS.length - 1) {
      console.log(`Upload failed, retrying with compression level ${attempt + 1}`);
      return uploadPhotoWithRetry(photo, attempt + 1);
    }
    
    // All retries failed - queue for later
    await offlineQueue.add({
      type: 'photo_upload',
      photo: photo.path,
      compression: COMPRESSION_LEVELS[COMPRESSION_LEVELS.length - 1],
    });
    
    throw new Error('Upload failed. Saved for later sync.');
  }
}
```

**Offline Photo Handling:**
1. Store original photo in app's Document directory
2. Save reference in AsyncStorage offline queue
3. Delete photo only after successful upload confirmation
4. Retry all queued photos on network reconnection

---

### ER-5: Offline Queue Recovery on App Restart

**Scenario**: App crashes or is force-closed with pending operations, recover on restart

```
Mobile App Launch       AsyncStorage          Redux Store          API Server
    │                        │                     │                     │
    │ App.tsx initializing   │                     │                     │
    │                        │                     │                     │
    │ Load offline queue     │                     │                     │
    ├───────────────────────>│                     │                     │
    │                        │                     │                     │
    │<───────────────────────┤                     │                     │
    │ Queue items: [         │                     │                     │
    │   { type: "clock_in",  │                     │                     │
    │     data: {...},       │                     │                     │
    │     timestamp: T1,     │                     │                     │
    │     retries: 2 },      │                     │                     │
    │   { type: "report",    │                     │                     │
    │     data: {...},       │                     │                     │
    │     timestamp: T2,     │                     │                     │
    │     retries: 0 }       │                     │                     │
    │ ]                      │                     │                     │
    │                        │                     │                     │
    │ Restore to Redux       │                     │                     │
    ├────────────────────────┼────────────────────>│                     │
    │                        │                     │                     │
    │ Check network status   │                     │                     │
    │ Status: Online         │                     │                     │
    │                        │                     │                     │
    │ Process queue item 1   │                     │                     │
    │ POST /shifts/clock-in  │                     │                     │
    ├────────────────────────┼─────────────────────┼────────────────────>│
    │                        │                     │                     │
    │                        │                     │<────────────────────┤
    │<───────────────────────┼─────────────────────┼─────────────────────┤
    │                        │                     │ 201 Created         │
    │                        │                     │                     │
    │ Remove from queue      │                     │                     │
    ├───────────────────────>│                     │                     │
    │                        │                     │                     │
    │ Update Redux state     │                     │                     │
    ├────────────────────────┼────────────────────>│                     │
    │                        │                     │                     │
    │ Process queue item 2   │                     │                     │
    │ POST /reports          │                     │                     │
    ├────────────────────────┼─────────────────────┼────────────────────>│
    │                        │                     │                     │
    │                        │                     │<────────────────────┤
    │<───────────────────────┼─────────────────────┼─────────────────────┤
    │                        │                     │ 201 Created         │
    │                        │                     │                     │
    │ Remove from queue      │                     │                     │
    ├───────────────────────>│                     │                     │
    │                        │                     │                     │
    │ Queue empty            │                     │                     │
    │ Show "All data synced" │                     │                     │
    │                        │                     │                     │
```

**Queue Recovery Implementation:**
```typescript
// On app initialization
export function initializeApp() {
  return async (dispatch: AppDispatch) => {
    try {
      // Load offline queue from AsyncStorage
      const queueJson = await AsyncStorage.getItem('offlineQueue');
      const queue = queueJson ? JSON.parse(queueJson) : [];
      
      // Restore to Redux store
      dispatch(setOfflineQueue(queue));
      
      // Check network status
      const isConnected = await NetInfo.fetch().then(
        state => state.isConnected
      );
      
      if (isConnected && queue.length > 0) {
        // Process queue
        dispatch(processSyncQueue());
      }
    } catch (error) {
      console.error('Failed to initialize offline queue:', error);
    }
  };
}

// Queue processor with retry logic
export function processSyncQueue() {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const queue = getState().offline.queue;
    
    for (const item of queue) {
      try {
        await processQueueItem(item);
        
        // Remove from queue on success
        dispatch(removeFromQueue(item.id));
        await persistQueue(getState().offline.queue);
      } catch (error) {
        // Increment retry count
        if (item.retries < MAX_RETRIES) {
          dispatch(incrementRetries(item.id));
        } else {
          // Mark as failed after max retries
          dispatch(markAsFailed(item.id));
        }
      }
    }
  };
}
```

**Queue Persistence:**
- Save queue to AsyncStorage after every mutation
- Include timestamp for each operation (for conflict resolution)
- Preserve retry count across app restarts
- Mark failed items for manual review

---

### ER-6: Server Error Fallback Strategy

**Scenario**: API returns 500 error, show cached data and retry

```
Mobile App              Cache (Redux)         API Server
    │                        │                     │
    │ GET /shifts/active     │                     │
    ├────────────────────────┼────────────────────>│
    │                        │                     │
    │                        │                     │ Database error
    │                        │                     │ Connection pool full
    │                        │                     │
    │                        │<────────────────────┤
    │<───────────────────────┼─────────────────────┤ 500 Internal Error
    │                        │                     │ { code: "INTERNAL_ERROR" }
    │                        │                     │
    │ Detect server error    │                     │
    │                        │                     │
    │ Load from cache        │                     │
    ├───────────────────────>│                     │
    │                        │                     │
    │<───────────────────────┤                     │
    │ Cached shift data      │                     │
    │ (last fetched 5 min ago)                    │
    │                        │                     │
    │ Show UI with:          │                     │
    │ - Cached data          │                     │
    │ - "Data may be outdated" banner             │
    │ - Pull-to-refresh enabled                   │
    │                        │                     │
    │ Schedule retry (30s)   │                     │
    │                        │                     │
    │ ... 30 seconds later ...                    │
    │                        │                     │
    │ GET /shifts/active     │                     │
    │ (background retry)     │                     │
    ├────────────────────────┼────────────────────>│
    │                        │                     │
    │                        │                     │ Server recovered
    │                        │                     │
    │                        │<────────────────────┤
    │<───────────────────────┼─────────────────────┤ 200 OK
    │                        │                     │ { shift }
    │                        │                     │
    │ Update cache           │                     │
    ├───────────────────────>│                     │
    │                        │                     │
    │ Update UI              │                     │
    │ Remove banner          │                     │
    │                        │                     │
```

**Server Error Handling:**
```typescript
async function fetchWithFallback(
  endpoint: string,
  cacheKey: string
) {
  try {
    const response = await api.get(endpoint);
    
    // Update cache on success
    await cache.set(cacheKey, response.data);
    
    return { data: response.data, fromCache: false };
  } catch (error) {
    if (error.response?.status >= 500) {
      // Server error - try cache
      const cachedData = await cache.get(cacheKey);
      
      if (cachedData) {
        // Schedule background retry
        scheduleRetry(endpoint, cacheKey, 30000); // 30 seconds
        
        return {
          data: cachedData,
          fromCache: true,
          error: 'Server error. Showing cached data.',
        };
      }
    }
    
    throw error;
  }
}

function scheduleRetry(
  endpoint: string,
  cacheKey: string,
  delay: number
) {
  setTimeout(async () => {
    try {
      const response = await api.get(endpoint);
      await cache.set(cacheKey, response.data);
      
      // Notify user if app is in foreground
      if (AppState.currentState === 'active') {
        dispatch(showToast('Data updated'));
      }
    } catch (error) {
      // Retry failed - schedule another retry with longer delay
      if (delay < 300000) { // Max 5 minutes
        scheduleRetry(endpoint, cacheKey, delay * 2);
      }
    }
  }, delay);
}
```

**Fallback Priorities:**
1. **Fresh API data** (preferred)
2. **Cached data with background refresh** (server error)
3. **Stale cached data with warning** (network error)
4. **Offline queue placeholder** (no cache available)
5. **Error message with retry button** (last resort)

---

### ER-7: Conflict Resolution During Sync

**Scenario**: Offline changes conflict with server state, resolve automatically

```
Mobile (Offline)        AsyncStorage          API Server           Database
    │                        │                     │                     │
    │ User edits profile     │                     │                     │
    │ name: "John" → "Johnny"│                     │                     │
    │                        │                     │                     │
    │ Save to offline queue  │                     │                     │
    ├───────────────────────>│                     │                     │
    │                        │                     │                     │
    │ ... Network restored ... (10 minutes later) │                     │
    │                        │                     │                     │
    │ POST /users/me         │                     │                     │
    │ { name: "Johnny" }     │                     │                     │
    │ If-Unmodified-Since: T1                     │                     │
    ├────────────────────────┼────────────────────>│                     │
    │                        │                     │                     │
    │                        │                     │ SELECT * FROM users │
    │                        │                     │ WHERE id = me       │
    │                        │                     ├────────────────────>│
    │                        │                     │                     │
    │                        │                     │<────────────────────┤
    │                        │                     │ updated_at: T2      │
    │                        │                     │ name: "John Doe"    │
    │                        │                     │ (Supervisor edited) │
    │                        │                     │                     │
    │                        │                     │ Detect conflict     │
    │                        │                     │ T2 > T1             │
    │                        │                     │                     │
    │                        │<────────────────────┤                     │
    │<───────────────────────┼─────────────────────┤ 409 Conflict        │
    │                        │                     │ {                   │
    │                        │                     │   code: "CONFLICT", │
    │                        │                     │   clientValue: "Johnny",
    │                        │                     │   serverValue: "John Doe",
    │                        │                     │   lastModified: T2  │
    │                        │                     │ }                   │
    │                        │                     │                     │
    │ Show conflict dialog   │                     │                     │
    │ "Data telah diubah.    │                     │                     │
    │  Server: 'John Doe'    │                     │                     │
    │  Lokal: 'Johnny'"      │                     │                     │
    │                        │                     │                     │
    │ User selects "Keep Server"                  │                     │
    │                        │                     │                     │
    │ Update local state     │                     │                     │
    │ name: "John Doe"       │                     │                     │
    │                        │                     │                     │
    │ Remove from queue      │                     │                     │
    ├───────────────────────>│                     │                     │
    │                        │                     │                     │
```

**Conflict Resolution Strategies:**

**1. Server Wins (Default for profile edits by supervisor):**
```typescript
if (error.response?.status === 409) {
  const { serverValue, fieldName } = error.response.data;
  
  // Auto-accept server value for supervisor-managed fields
  if (SUPERVISOR_MANAGED_FIELDS.includes(fieldName)) {
    dispatch(updateField(fieldName, serverValue));
    await removeFromQueue(queueItemId);
    
    showToast(`${fieldName} telah diperbarui oleh supervisor`);
    return;
  }
}
```

**2. Client Wins (For user-generated content):**
```typescript
// Force update with ignore conflict flag
await api.put('/reports/' + reportId, data, {
  headers: { 'X-Force-Update': 'true' },
});
```

**3. Merge (For non-conflicting fields):**
```typescript
const merged = {
  ...serverData,
  ...clientData,
  updated_at: Math.max(serverData.updated_at, clientData.updated_at),
};

await api.put('/users/me', merged);
```

**4. Manual Resolution (For critical conflicts):**
```typescript
Alert.alert(
  'Konflik Data',
  `Field "${fieldName}" telah diubah di server.\n\n` +
  `Server: "${serverValue}"\n` +
  `Lokal: "${clientValue}"\n\n` +
  'Pilih nilai yang ingin disimpan:',
  [
    {
      text: 'Gunakan Server',
      onPress: () => resolveConflict('server'),
    },
    {
      text: 'Gunakan Lokal',
      onPress: () => resolveConflict('client'),
    },
  ]
);
```

**Conflict-Free Fields:**
- Timestamps (server always wins)
- Status fields managed by backend
- Calculated fields (recalculated on server)
- Foreign keys (validated on server)

---

### Client-Side Error Handling Implementation

**Complete Error Handler:**
```typescript
async function handleApiError(error: any, operation: QueueOperation) {
  if (error.response) {
    // API error response
    switch (error.response.status) {
      case 400:
        // Validation error - don't retry
        showError('Invalid request: ' + error.response.data.message);
        await removeFromQueue(operation.id);
        break;
        
      case 401:
        // Token expired - try refresh, then retry
        if (error.response.data.code === 'TOKEN_EXPIRED') {
          await refreshToken();
          return retryOperation(operation);
        } else {
          // Invalid credentials - logout
          await logout();
          navigation.navigate('Login');
        }
        break;
        
      case 403:
        // Forbidden - don't retry
        showError('You are not authorized for this action');
        await removeFromQueue(operation.id);
        break;
        
      case 404:
        // Not found - don't retry
        showError('Resource not found');
        await removeFromQueue(operation.id);
        break;
        
      case 409:
        // Conflict - resolve manually or auto-resolve
        await handleConflict(error.response.data, operation);
        break;
        
      case 429:
        // Rate limited - retry with delay
        const retryAfter = error.response.headers['retry-after'] || 60;
        await sleep(retryAfter * 1000);
        return retryOperation(operation);
        break;
        
      case 500:
      case 502:
      case 503:
      case 504:
        // Server error - retry with backoff
        return retryWithBackoff(operation);
        break;
        
      default:
        showError('An error occurred. Please try again.');
        return retryWithBackoff(operation);
    }
  } else if (error.request) {
    // Network error - queue offline
    await queueOffline(operation);
    showInfo('Saved offline. Will sync when connected.');
  } else {
    // Other error
    console.error('Unexpected error:', error);
    showError('An unexpected error occurred');
  }
}
```

---

## Rate Limiting (Phase 2+)

```
Client → API: 10th request in 1 minute

API: Check rate limit
     User has exceeded 100 requests/minute

API → Client: 429 Too Many Requests
              Headers:
                X-RateLimit-Limit: 100
                X-RateLimit-Remaining: 0
                X-RateLimit-Reset: 1234567890

Client: Wait until reset time
        Show "Too many requests" message
```

---

**Document Owner:** Software Architect
**Last Updated:** 2026-01-16
**Status:** Active
**Related Docs:** [`system-overview.md`](./system-overview.md), [`security.md`](./security.md), [`../api/contracts.md`](../api/contracts.md)
