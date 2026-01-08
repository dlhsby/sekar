# Screen Specifications - Phase 1 MVP

## Overview

Detailed screen-by-screen specifications for SEKAR Mobile MVP.

---

## 1. Login Screen

### Layout
```
┌─────────────────────────────────┐
│                                 │
│         [SEKAR Logo]            │
│                                 │
│    ┌───────────────────────┐    │
│    │ Username              │    │
│    └───────────────────────┘    │
│                                 │
│    ┌───────────────────────┐    │
│    │ Password          👁   │    │
│    └───────────────────────┘    │
│                                 │
│    [        Login         ]     │
│                                 │
│    [Error message area]         │
│                                 │
└─────────────────────────────────┘
```

### Components
- **Logo:** SEKAR logo/text at top
- **Username Input:** Text input, required
- **Password Input:** Secure text input with visibility toggle
- **Login Button:** Primary button, disabled while loading
- **Error Message:** Red text below button
- **Loading State:** Spinner on button

### Behavior
1. Validate inputs not empty
2. Call POST /auth/login
3. Store JWT in secure storage
4. Navigate based on role:
   - Worker → Worker Home
   - Supervisor → Map Dashboard

### Error Handling
- "Invalid username or password" for 401
- "Connection error" for network failure
- "Server error" for 500

---

## 2. Worker Home Screen

### Layout
```
┌─────────────────────────────────┐
│ ≡  Worker Dashboard      🔄 ●   │ ← Header with sync status
├─────────────────────────────────┤
│ Halo, Ahmad! 👋                 │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ Current Shift               │ │
│ │ ⏱ 04:32:15                  │ │
│ │ Taman Bungkul • Park        │ │
│ │ Clock-in: 08:00             │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ Today's Summary             │ │
│ │ 📝 3 Reports submitted      │ │
│ │ ⏰ 4.5 hours worked         │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ ┌──────────┐  ┌──────────────┐  │
│ │          │  │              │  │
│ │ CLOCK    │  │  NEW REPORT  │  │
│ │   OUT    │  │              │  │
│ │          │  │              │  │
│ └──────────┘  └──────────────┘  │
└─────────────────────────────────┘
```

### Components
- **Header:** Menu icon, title, sync indicator
- **Greeting Card:** User's name
- **Shift Status Card:**
  - Live timer (updates every second)
  - Area name and type
  - Clock-in time
- **Summary Card:**
  - Reports count today
  - Hours worked
- **Quick Action Buttons:**
  - Clock In / Clock Out (primary)
  - New Report (secondary)
- **Sync Status:** Green dot = synced, Orange = pending

### Behavior
- On mount: Fetch current shift status
- Timer: Update every second if clocked in
- Pull-to-refresh: Reload shift data
- Sync indicator: Show pending count

### States
1. **Not clocked in:** Show "Clock In" button
2. **Clocked in:** Show timer and "Clock Out" button
3. **No assignment:** Show "Not assigned to any area"

---

## 3. Clock-In/Out Screen

### Layout (Clock-In)
```
┌─────────────────────────────────┐
│ ←  Clock In                     │
├─────────────────────────────────┤
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Assigned Area               │ │
│ │ Taman Bungkul               │ │
│ │ Park                        │ │
│ │ 📍 Jl. Taman Bungkul        │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Your Location               │ │
│ │ 📍 -7.2905, 112.7398        │ │
│ │ Accuracy: 10m               │ │
│ │ ✓ Within area boundary      │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ [Camera Preview]            │ │
│ │                             │ │
│ │        Take Selfie          │ │
│ │                             │ │
│ └─────────────────────────────┘ │
│                                 │
│ [       CLOCK IN        ]       │ ← Disabled until selfie taken
│                                 │
└─────────────────────────────────┘
```

### Components
- **Header:** Back button, title
- **Area Info Card:** Assigned area details
- **Location Card:**
  - GPS coordinates
  - Accuracy
  - Boundary status (checkmark or warning)
- **Camera Preview:** Front camera view
- **Capture Button:** Take selfie
- **Selfie Preview:** After capture
- **Clock-In Button:** Submit
- **Retake Button:** If selfie taken

### Behavior (Clock-In)
1. Request location permission
2. Start GPS acquisition
3. Show accuracy indicator
4. Calculate distance from area center
5. Show boundary status
6. Enable camera for selfie
7. Capture selfie
8. Show preview with retake option
9. Submit clock-in
10. Start background location tracking
11. Navigate to Home

### Behavior (Clock-Out)
1. Get current GPS
2. Submit clock-out
3. Stop background tracking
4. Navigate to Home

### Validation
- GPS must be within boundary (±100m)
- Selfie required for clock-in
- Error messages for each case

---

## 4. Report Submission Screen

### Layout
```
┌─────────────────────────────────┐
│ ←  New Report                   │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ [Camera/Photo Preview]      │ │
│ │                             │ │
│ │     📷 Take Photo           │ │
│ │                             │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Notes                       │ │
│ │ ┌───────────────────────┐   │ │
│ │ │ Describe your work... │   │ │
│ │ │                       │   │ │
│ │ └───────────────────────┘   │ │
│ │                    0/500    │ │
│ └─────────────────────────────┘ │
│                                 │
│ Condition:                      │
│ ┌────────┐┌────────┐┌────────┐  │
│ │  Baik  ││ Cukup  ││ Buruk  │  │
│ └────────┘└────────┘└────────┘  │
│                                 │
│ 📍 -7.2905, 112.7398           │
│                                 │
│ [       SUBMIT REPORT     ]     │
└─────────────────────────────────┘
```

### Components
- **Header:** Back button, title
- **Photo Section:**
  - Camera button (if no photo)
  - Photo preview (if taken)
  - Retake button
- **Notes Input:**
  - Multi-line text
  - Character counter (max 500)
- **Condition Selector:**
  - Three toggle buttons
  - Baik (Good) / Cukup (Fair) / Buruk (Poor)
  - Optional (none selected OK)
- **GPS Display:** Current coordinates
- **Submit Button:** Disabled until photo taken

### Behavior
1. Open camera on button press
2. Capture photo
3. Compress to max 800px width
4. Show preview
5. Allow notes input
6. Select condition (optional)
7. Get current GPS
8. Submit report
9. Queue media upload
10. Show success message
11. Navigate back

### Offline Behavior
1. Save report locally
2. Queue photo for upload
3. Show "Queued for sync" message
4. Upload when online

---

## 5. My Reports Screen

### Layout
```
┌─────────────────────────────────┐
│ ←  My Reports        📅 Today   │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ [thumb] 10:30               │ │
│ │         Area sekitar...     │ │
│ │         Condition: Baik     │ │
│ │                   ✓ Synced  │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ [thumb] 11:45               │ │
│ │         Membersihkan...     │ │
│ │         Condition: Cukup    │ │
│ │                   ⟳ Pending │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ [thumb] 14:20               │ │
│ │         Menyiram taman...   │ │
│ │         Condition: Baik     │ │
│ │                   ✓ Synced  │ │
│ └─────────────────────────────┘ │
│                                 │
│ [Empty state if no reports]     │
└─────────────────────────────────┘
```

### Components
- **Header:** Back button, title, date picker
- **Report Cards:**
  - Thumbnail (small photo)
  - Time
  - Notes preview (truncated)
  - Condition badge
  - Sync status icon
- **Empty State:** "No reports yet today"

### Behavior
- Load reports for selected date
- Default to today
- Date picker for history
- Tap card to view detail

---

## 6. Supervisor Map Dashboard

### Layout
```
┌─────────────────────────────────┐
│ ≡  Live Map            🔄 30s   │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ Area: [All ▼] Type: [All ▼]│ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│                                 │
│        [Google Map View]        │
│                                 │
│      📍 Worker 1                │
│                                 │
│         📍 Worker 2             │
│                                 │
│   📍 Worker 3                   │
│                                 │
└─────────────────────────────────┘
│ Active Workers: 3               │
├─────────────────────────────────┤
│ 📊 Reports │ 📅 Attendance │... │
└─────────────────────────────────┘
```

### Components
- **Header:** Menu, title, refresh indicator
- **Filter Bar:** Area and type dropdowns
- **Map View:**
  - Google Maps
  - Worker markers (green pins)
  - Marker popups with info
- **Active Count:** Number of active workers
- **Bottom Navigation:** Reports, Attendance tabs

### Marker Popup
```
┌───────────────────────┐
│ Ahmad Rizki           │
│ Taman Bungkul (Park)  │
│ Since: 08:00          │
│ Last update: 10:20    │
└───────────────────────┘
```

### Behavior
- Auto-refresh every 2 minutes
- Manual refresh button
- Tap marker for worker info
- Filter updates markers
- Center map on markers

---

## 7. Supervisor Reports List

### Layout
```
┌─────────────────────────────────┐
│ ≡  Reports             📅 Today │
├─────────────────────────────────┤
│ [Worker ▼] [Area ▼] [Type ▼]   │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ [thumb] Ahmad Rizki  10:30  │ │
│ │         Taman Bungkul       │ │
│ │         "Area sekitar..."   │ │
│ │         Baik     ○ Pending  │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ [thumb] Siti N.      11:45  │ │
│ │         Jl. Darmo           │ │
│ │         "Membersih..."      │ │
│ │         Cukup    ✓ Reviewed │ │
│ └─────────────────────────────┘ │
│                                 │
│ [Pull up for more]              │
└─────────────────────────────────┘
```

### Components
- **Header:** Menu, title, date picker
- **Filter Bar:** Worker, Area, Type dropdowns
- **Report Cards:**
  - Thumbnail
  - Worker name, time
  - Area name
  - Notes preview
  - Condition badge
  - Reviewed status
- **Pull-to-refresh**
- **Infinite scroll**

### Behavior
- Load reports for date (default today)
- Apply filters
- Tap card for detail
- Pull to refresh
- Scroll for more

---

## 8. Supervisor Report Detail

### Layout
```
┌─────────────────────────────────┐
│ ←  Report Detail                │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │                             │ │
│ │    [Full-size Photo]        │ │
│ │                             │ │
│ └─────────────────────────────┘ │
│                                 │
│ Worker: Ahmad Rizki             │
│ Area: Taman Bungkul (Park)      │
│ Time: 10:30, Jan 8, 2026        │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Notes:                      │ │
│ │ Area sekitar bangku taman   │ │
│ │ sudah dibersihkan...        │ │
│ └─────────────────────────────┘ │
│                                 │
│ Condition: [Baik]               │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ [Mini Map with Pin]         │ │
│ └─────────────────────────────┘ │
│                                 │
│ Status: ○ Not Reviewed          │
│ [   MARK AS REVIEWED   ]        │
└─────────────────────────────────┘
```

### Components
- **Header:** Back button, title
- **Photo Viewer:** Full-size, pinch to zoom
- **Info Section:** Worker, area, time
- **Notes:** Full text
- **Condition Badge**
- **Mini Map:** GPS location pin
- **Review Button:** Mark as reviewed

### Behavior
- Tap photo for full-screen
- Pinch to zoom
- Tap review button
- Show confirmation
- Navigate back

---

## 9. Attendance Screen

### Layout
```
┌─────────────────────────────────┐
│ ≡  Attendance          📅 Today │
├─────────────────────────────────┤
│ [Area: All ▼] [Type: All ▼]    │
├─────────────────────────────────┤
│ Total: 3 workers | 24.5 hrs     │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ Ahmad Rizki                 │ │
│ │ Taman Bungkul (Park)        │ │
│ │ In: 08:00  Out: 16:00       │ │
│ │ Hours: 8.0  Reports: 5      │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Siti Nurhaliza              │ │
│ │ Jl. Raya Darmo (Pedestrian) │ │
│ │ In: 07:30  Out: --          │ │
│ │ Hours: 8.5  Reports: 3      │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Components
- **Header:** Menu, title, date picker
- **Filter Bar:** Area and type
- **Summary:** Total workers, total hours
- **Attendance Cards:**
  - Worker name
  - Area and type
  - Clock-in/out times
  - Hours worked
  - Reports count

### Behavior
- Load attendance for date
- Apply filters
- Pull to refresh
- "--" for still active (no clock-out)

---

## Color Scheme

| Element | Color | Hex |
|---------|-------|-----|
| Primary (Green) | Nature theme | #2E7D32 |
| Secondary (Blue) | Trust | #1976D2 |
| Success | Synced/Good | #4CAF50 |
| Warning | Pending | #FF9800 |
| Error | Failed/Bad | #F44336 |
| Background | Light gray | #F5F5F5 |
| Card | White | #FFFFFF |
| Text Primary | Dark gray | #212121 |
| Text Secondary | Medium gray | #757575 |

---

## Typography

| Element | Size | Weight |
|---------|------|--------|
| Header Title | 18sp | Bold |
| Card Title | 16sp | Medium |
| Body Text | 14sp | Regular |
| Caption | 12sp | Regular |
| Button | 16sp | Bold |
| Timer | 32sp | Bold |

---

*Last Updated: January 2026*

