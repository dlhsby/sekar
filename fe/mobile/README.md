# SEKAR Mobile App

React Native mobile application for DLH Surabaya's worker tracking and task management system.

## Status

**Phase 1 MVP:** COMPLETE ✅
**Last Updated:** January 23, 2026

| Metric | Value |
|--------|-------|
| Screens | 14 (7 worker + 7 supervisor) |
| Components | 14 reusable |
| Tests | 1,086+ passing (100% pass rate) |
| Services | 6 core services |

## Project Overview

**Project:** SEKAR (Sistem Evaluasi Kerja Satgas RTH)
**Platform:** Android (MVP), iOS (Phase 5)
**Framework:** React Native 0.76.6 with TypeScript
**State Management:** Redux Toolkit
**Navigation:** React Navigation v7

## Project Structure

```
src/
├── screens/              # Screen components
│   ├── auth/            # Login screen
│   ├── worker/          # Worker screens (7)
│   │   ├── WorkerHomeScreen
│   │   ├── ClockInOutScreen
│   │   ├── ReportSubmissionScreen
│   │   ├── ReportsListScreen
│   │   ├── WorkerProfileScreen
│   │   ├── ShiftHistoryScreen
│   │   └── index.tsx
│   └── supervisor/      # Supervisor screens (7)
│       ├── SupervisorHomeScreen
│       ├── MapDashboardScreen
│       ├── ReportsReviewScreen
│       ├── AttendanceScreen
│       ├── WorkerListScreen
│       ├── AreaOverviewScreen
│       ├── SupervisorProfileScreen
│       └── index.tsx
├── components/          # Reusable UI components (14)
│   ├── common/          # Shared components
│   │   ├── Button        # Primary/secondary/outline + haptic feedback
│   │   ├── Card          # Elevated/outlined/filled variants
│   │   ├── TextInput     # With label, error, and success states
│   │   ├── LoadingSpinner
│   │   ├── ErrorBanner
│   │   ├── SyncStatusIndicator
│   │   ├── SkeletonLoader # Shimmer loading animation
│   │   └── EmptyState     # 9 contextual variants
│   ├── Header
│   ├── MapView
│   ├── PhotoPicker
│   ├── ShiftTimer
│   └── ReportCard
├── services/            # Business logic (6 services)
│   ├── api/             # API client & endpoints
│   ├── storage/         # Secure storage
│   ├── location/        # GPS services
│   ├── media/           # Photo capture & compression
│   ├── permissions/     # Permission handling
│   └── sync/            # Offline sync manager
├── store/               # Redux state management
│   └── slices/          # 4 slices (auth, shift, report, offline)
├── navigation/          # Navigation configuration
├── utils/               # Utility functions
├── types/               # TypeScript definitions
└── constants/           # App constants
```

## Getting Started

### Prerequisites

- Node.js 18+
- Android Studio with Android SDK
- Physical Android device or emulator
- USB debugging enabled (for physical devices)

### Installation

```bash
# Install dependencies
npm install

# Create .env file (API_BASE_URL is host only, no /api path)
cat > .env << 'EOF'
API_BASE_URL=http://your-backend-ip:3000
API_VERSION=v1
GOOGLE_MAPS_API_KEY=your-key-here
APP_ENV=development
EOF
# Result: API calls go to http://your-backend-ip:3000/api/v1
```

### Running the App

```bash
# Start Metro bundler (terminal 1)
npm start

# Run on Android (terminal 2)
npm run android
```

### WSL Development

If developing on WSL2:

```bash
# Get WSL IP
ip addr show eth0 | grep "inet " | awk '{print $2}' | cut -d/ -f1

# In Windows PowerShell (as Admin)
netsh interface portproxy add v4tov4 listenport=8081 listenaddress=0.0.0.0 connectport=8081 connectaddress=<WSL_IP>
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=<WSL_IP>

# Start Metro with correct hostname
REACT_NATIVE_PACKAGER_HOSTNAME=0.0.0.0 npm start
```

## Features

### Worker Features
- GPS-validated clock-in/out with selfie
- Work report submission with photos
- Real-time shift timer
- Background location tracking with battery level
- Reports list and history
- Profile management
- Offline-first with auto-sync

### Supervisor Features
- Live map dashboard with worker locations
- Progressive loading (50 initial, 500 background)
- Map marker clustering for dense areas
- Report review and approval workflow
- Attendance tracking
- Worker list management
- Area overview
- Profile management

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- <filename>
```

**Current:** 1,086+ tests passing (100% pass rate)

## Build

### Debug Build
```bash
npm run android
```

### Release Build
```bash
cd android
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

### ProGuard
ProGuard rules are configured in `android/app/proguard-rules.pro`

## Design System

### Colors
- **Primary:** Green (#2E7D32) - Nature/parks theme
- **Secondary:** Blue (#1976D2) - Trust/government
- **Warning:** Orange (#F57C00) - 4.5:1 contrast for outdoor visibility
- **Success/Error:** Standard palette

### Components
14 reusable components with consistent styling:
- **Touch targets:** 56dp standard, 72dp critical actions
- **Card variants:** Elevated, outlined, filled
- **Button features:** Haptic feedback, focus indicators
- **TextInput states:** Label, error, success with icons
- **SkeletonLoader:** Shimmer animation for loading states
- **EmptyState:** 9 contextual variants (reports, shifts, workers, etc.)
- Loading states for async actions
- Error messages with retry options
- Offline indicators

### Accessibility
- WCAG 2.1 AA compliant
- High contrast text (gray900 for outdoor readability)
- Focus indicators for keyboard/screen reader navigation
- Live region announcements for GPS status

## Documentation

- **Phase 1 Status:** `specs/phases/phase-1-mvp/STATUS.md`
- **Mobile Screens:** `specs/mobile/screens.md`
- **API Contracts:** `specs/api/contracts.md`
- **Design System:** `specs/ui-ux/design-system.md`

## Dependencies

### Core
- react-native: 0.76.6
- typescript: 5.x
- @reduxjs/toolkit
- react-redux
- @react-navigation/native

### Services
- axios
- react-native-encrypted-storage
- @react-native-async-storage/async-storage

### Maps & Location
- react-native-maps
- react-native-geolocation-service
- react-native-device-info (battery level tracking)

### Media
- react-native-image-picker

---

**Version:** 1.0.0
**Phase:** 1 - MVP (COMPLETE)
**React Native:** 0.76.6
**Last Updated:** January 23, 2026
