# Phase 1 - MVP Overview (Mobile)

## 🎯 Objectives

Build a working Android app for SEKAR pilot:
- **30 workers** can clock-in/out and submit reports
- **Supervisors** can monitor workers on map and review reports
- **Offline-first** design for poor connectivity areas

---

## 📅 Timeline

**Duration:** 9 days (Days 6-14 of overall project)

| Day | Focus | Screens/Features |
|-----|-------|------------------|
| Day 6-7 | Foundation | Setup, Auth, API client |
| Day 8-9 | Worker Core | Home, Clock-in/out, Reports |
| Day 10 | Offline & Location | Background tracking, sync |
| Day 11 | Supervisor | Map, Reports list, Attendance |
| Day 12-13 | Testing & Polish | Tests, bug fixes, optimization |
| Day 14 | Build & Deploy | APK generation |

---

## 📱 Screens

### Worker Screens

1. **Login Screen**
   - Username/password input
   - Login button
   - Error handling
   - Auto-login if token valid

2. **Worker Home Screen**
   - Greeting with name
   - Current shift status
   - Shift timer
   - Assigned area display
   - Quick actions (Clock-in/out, New Report)
   - Sync status indicator

3. **Clock-In/Out Screen**
   - Large action button
   - GPS location display
   - Area boundary indicator
   - Camera for selfie (clock-in)
   - Validation messages

4. **Report Submission Screen**
   - Camera capture
   - Photo preview
   - Notes input (500 chars)
   - Condition buttons (Baik/Cukup/Buruk)
   - GPS display
   - Submit button
   - Upload progress

5. **My Reports Screen**
   - List of today's reports
   - Date filter
   - Report cards with thumbnail
   - Upload status indicators

### Supervisor Screens

1. **Map Dashboard**
   - Google Maps view
   - Worker markers
   - Filter by area/type
   - Auto-refresh (2 min)
   - Worker count

2. **Reports List**
   - Scrollable list
   - Filter bar (date, worker, area)
   - Report cards
   - Pull-to-refresh

3. **Report Detail**
   - Full image/video
   - Worker info
   - GPS on map
   - Notes and condition
   - "Mark Reviewed" button

4. **Attendance Screen**
   - Date picker
   - Filter by area
   - Attendance list
   - Hours worked

---

## 🏗️ Architecture

### App Structure
```
src/
├── screens/
│   ├── auth/
│   │   └── LoginScreen.tsx
│   ├── worker/
│   │   ├── HomeScreen.tsx
│   │   ├── ClockInOutScreen.tsx
│   │   ├── ReportScreen.tsx
│   │   └── MyReportsScreen.tsx
│   └── supervisor/
│       ├── MapDashboardScreen.tsx
│       ├── ReportsListScreen.tsx
│       ├── ReportDetailScreen.tsx
│       └── AttendanceScreen.tsx
├── components/
│   ├── common/
│   ├── worker/
│   └── supervisor/
├── services/
│   ├── api/
│   ├── location/
│   ├── camera/
│   ├── storage/
│   └── offline/
├── store/
├── navigation/
├── utils/
└── types/
```

### Key Services

1. **API Service** - Axios client with interceptors
2. **Secure Storage** - JWT token storage
3. **Location Service** - GPS with background tracking
4. **Camera Service** - Photo/video capture
5. **Offline Service** - Queue management and sync

---

## 🔗 Dependencies on Backend

| Mobile Feature | Backend Endpoint | Day Available |
|----------------|------------------|---------------|
| Login | POST /auth/login | Day 2 ✅ |
| Auto-login | GET /auth/me | Day 2 ✅ |
| Get areas | GET /areas | Day 3 |
| Clock-in | POST /shifts/clock-in | Day 4 |
| Clock-out | POST /shifts/clock-out | Day 4 |
| Current shift | GET /shifts/current | Day 4 |
| Create report | POST /reports | Day 5 |
| Upload media | POST /reports/:id/upload-media | Day 5 |
| My reports | GET /reports/my-reports | Day 5 |
| Active workers | GET /supervisor/active-workers | Day 5 |
| Reports list | GET /supervisor/reports | Day 5 |
| Attendance | GET /supervisor/attendance | Day 5 |

---

## 📊 Success Criteria

1. ✅ Workers can login and see their assigned area
2. ✅ Workers can clock-in with GPS + selfie
3. ✅ Clock-in rejected if outside area boundary
4. ✅ Workers can submit reports with photos
5. ✅ Reports save offline and sync when online
6. ✅ Workers can clock-out
7. ✅ Background location tracking works
8. ✅ Supervisors see active workers on map
9. ✅ Supervisors can view and filter reports
10. ✅ Supervisors can mark reports as reviewed
11. ✅ App works offline for entire shift
12. ✅ Battery usage <15% per 8-hour shift
13. ✅ APK builds successfully

---

## 🚨 Out of Scope (MVP)

- iOS version → Phase 5
- Task assignment → Phase 2
- Push notifications → Phase 2
- QR code scanning → Phase 4
- Advanced analytics → Phase 3
- Biometric login → Phase 5
- Multi-language → Phase 5

---

*See screen specs in `requirements/screen-specs.md`*
*See implementation guide in `implementation/implementation-guide.md`*

