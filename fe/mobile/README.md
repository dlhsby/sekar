# SEKAR Mobile App

React Native mobile application for DLH Surabaya's worker tracking and task management system.

## Status

**Phase 1 MVP:** COMPLETE ✅
**Last Updated:** January 19, 2026

| Metric | Value |
|--------|-------|
| Screens | 14 (7 worker + 7 supervisor) |
| Components | 11 reusable |
| Tests | 831 passing (100% pass rate) |
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
├── components/          # Reusable UI components (11)
│   ├── Button
│   ├── Card
│   ├── TextInput
│   ├── LoadingSpinner
│   ├── ErrorBanner
│   ├── SyncStatusIndicator
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

# Create .env file
cat > .env << 'EOF'
API_BASE_URL=http://your-backend-ip:3000
GOOGLE_MAPS_API_KEY=your-key-here
EOF
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
- Reports list and history
- Profile management
- Offline-first with auto-sync

### Supervisor Features
- Live map dashboard with worker locations
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

**Current:** 831 tests passing (100% pass rate)

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
- **Success/Warning/Error:** Standard palette

### Components
11 reusable components with consistent styling:
- Large touch targets (min 48px)
- Loading states for async actions
- Error messages with retry options
- Offline indicators

## Documentation

- **Implementation Summary:** `specs/phases/phase-1-mvp/IMPLEMENTATION_SUMMARY.md`
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

### Media
- react-native-image-picker

---

**Version:** 1.0.0
**Phase:** 1 - MVP (COMPLETE)
**React Native:** 0.76.6
**Last Updated:** January 19, 2026
