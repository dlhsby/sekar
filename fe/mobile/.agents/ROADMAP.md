# SEKAR Mobile App Roadmap

This document outlines the development roadmap for the **Mobile (React Native)** component across all phases of the SEKAR project.

## 🎯 Overall Mobile Goal

Build a robust, offline-capable mobile application for workers and supervisors to manage daily operations, with support for both Android and iOS platforms.

---

## 📱 Phase Summary

| Phase | Duration | Focus |
|-------|----------|-------|
| Phase 1 | 5 days | MVP - Core functionality |
| Phase 2 | 5 days | Tasks & Notifications |
| Phase 3 | 3 days | Analytics screens |
| Phase 4 | 5 days | Asset Management & QR |
| Phase 5 | 10 days | iOS & Advanced |

---

## 🗺️ Phase Breakdown

### Phase 1: MVP 🔴 CURRENT (5 days)

**Objective:** Core worker and supervisor functionality

**Features:**
- Authentication (login/logout)
- Worker home screen with area info
- Clock in/out with GPS validation & selfie
- Work report submission with photos
- Supervisor live map with worker locations
- Supervisor reports and attendance lists
- Offline mode & sync queue

**Screens:**
- Login
- Worker Home
- Clock In/Out
- Create Report
- Report History
- Supervisor Map
- Reports List
- Attendance List

### Phase 2: Enhanced Features 🟡 NEXT (5 days)

**Objective:** Task management and push notifications

**Features:**
- Push notifications (FCM)
- Task list for workers
- Task detail and actions (accept/decline/complete)
- Task completion with photo evidence
- Supervisor task creation
- Task assignment

**New Screens:**
- My Tasks (worker)
- Task Detail
- Task Complete
- Tasks Dashboard (supervisor)
- Create Task

### Phase 3: Analytics (3 days)

**Objective:** Performance visualization

**Features:**
- Worker personal performance stats
- Weekly/monthly trends
- Supervisor team analytics
- Charts and graphs

**New Screens:**
- Worker Analytics
- Team Analytics (supervisor)

**Updates:**
- Performance card on home screen

### Phase 4: Asset Management (5 days)

**Objective:** QR codes and asset tracking

**Features:**
- QR code scanner
- Asset list and search
- Asset detail view
- Asset inspection form
- Maintenance task viewing
- Link reports to assets

**New Screens:**
- QR Scanner
- Asset List
- Asset Detail
- Asset Inspection
- Maintenance Tasks

### Phase 5: iOS & Advanced (10 days)

**Objective:** iOS release and polish

**Features:**
- iOS app with full feature parity
- Biometric authentication (Face ID / Touch ID)
- Multi-language support (ID, EN)
- iOS-specific optimizations
- App Store submission

**Updates:**
- Biometric login option
- Language settings screen

---

## 📁 Documentation Structure

```
fe/mobile/.agents/
├── README.md                           # This overview
├── ROADMAP.md                          # Phase timeline
├── CURRENT_STATUS.md                   # Development progress
│
├── phase-1-mvp/                        # 🔴 CURRENT
│   ├── overview.md
│   ├── requirements/
│   ├── design/
│   └── CHECKLIST.md
│
├── phase-2-enhanced-features/          # 🟡 NEXT
│   ├── overview.md
│   └── CHECKLIST.md
│
├── phase-3-analytics/                  # 🟢 FUTURE
│   └── overview.md
│
├── phase-4-asset-management/           # 🟢 FUTURE
│   └── overview.md
│
└── phase-5-ios-advanced/               # 🟢 FUTURE
    └── overview.md
```

---

## 🛠️ Tech Stack

- **Framework:** React Native 0.73+
- **Language:** TypeScript 5.x
- **Navigation:** React Navigation 6.x
- **State Management:** Zustand
- **API Client:** Axios
- **Offline Storage:** WatermelonDB / SQLite
- **Maps:** react-native-maps (Google Maps)
- **Camera:** react-native-vision-camera
- **Location:** react-native-geolocation-service
- **Push:** @react-native-firebase/messaging

---

*Last Updated: January 2026*
