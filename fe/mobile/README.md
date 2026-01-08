# 🌸 SEKAR Mobile App

React Native mobile application for DKRTH Surabaya's worker tracking and task management system.

## 📱 Project Overview

**Project:** SEKAR (Sistem Evaluasi Kerja Satgas RTH)  
**Platform:** Android (MVP), iOS (Phase 5)  
**Framework:** React Native with TypeScript  
**State Management:** Redux Toolkit  
**Navigation:** React Navigation v6

## 🏗️ Project Structure

```
src/
├── screens/              # Screen components
│   ├── auth/            # Login screen
│   ├── worker/          # Worker-specific screens
│   └── supervisor/      # Supervisor-specific screens
├── components/          # Reusable UI components
│   ├── common/          # Shared components
│   ├── worker/          # Worker-specific components
│   └── supervisor/      # Supervisor-specific components
├── services/            # Business logic & external services
│   ├── api/             # API client & endpoints
│   ├── storage/         # Secure storage & offline storage
│   ├── location/        # GPS & location services
│   └── offline/         # Offline sync services
├── store/               # Redux state management
│   └── slices/          # Redux slices (auth, shift, report, offline)
├── navigation/          # Navigation configuration
├── utils/               # Utility functions (GPS, validators, dates)
├── types/               # TypeScript type definitions
└── constants/           # App constants (config, theme)
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Android Studio (for Android development)
- Xcode (for iOS development, Phase 5)
- React Native development environment set up

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   - Copy environment configuration template
   - Update API URL and Google Maps API key in `src/constants/config.ts`

3. **Run on Android:**
   ```bash
   npx react-native run-android
   ```

4. **Run on iOS (Phase 5):**
   ```bash
   cd ios && pod install && cd ..
   npx react-native run-ios
   ```

## 📦 Dependencies

### Core
- `react-native` - Mobile framework
- `typescript` - Type safety
- `@reduxjs/toolkit` - State management
- `react-redux` - Redux bindings for React
- `@react-navigation/native` - Navigation
- `@react-navigation/native-stack` - Stack navigator
- `@react-navigation/bottom-tabs` - Tab navigator

### Services
- `axios` - HTTP client
- `react-native-encrypted-storage` - Secure storage
- `@react-native-async-storage/async-storage` - Async storage

### Maps & Location
- `react-native-maps` - Google Maps integration
- `react-native-geolocation-service` - GPS location
- ~~`react-native-background-geolocation`~~ - Background tracking (to be added)

### Media
- `react-native-image-picker` - Camera & photo picker
- ~~`react-native-vision-camera`~~ - Alternative camera (to be evaluated)

### Development
- `@testing-library/react-native` - Component testing
- `jest` - Testing framework

## 🎨 Design System

### Colors
- **Primary:** Green (`#2E7D32`) - Nature/parks theme
- **Secondary:** Blue (`#1976D2`) - Trust/government
- **Success:** Green
- **Warning:** Orange
- **Error:** Red

### Typography
- **Headers:** Bold, 20-24px
- **Body:** Regular, 16px
- **Labels:** 14px
- **Buttons:** Bold, 16-18px

### Components
- Large touch targets (min 48px)
- Loading states for all async actions
- Error messages with retry options
- Offline indicators

## 🔧 Configuration

### API Configuration
Edit `src/constants/config.ts`:
```typescript
const config = {
  API_BASE_URL: 'http://localhost:3000',
  GOOGLE_MAPS_API_KEY: 'your-key-here',
  // ... other config
};
```

### Theme Customization
Edit `src/constants/theme.ts` to customize colors, typography, spacing, etc.

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Test Coverage
```bash
npm test -- --coverage
```

### Testing Standards
- Target: >80% coverage for critical features
- Unit tests for utility functions
- Component tests for screens
- Integration tests for workflows

## 📱 Features

### Worker Role
- ✅ Login with username/password
- ⏳ Clock in/out with GPS + selfie
- ⏳ Submit work reports with photos
- ⏳ Offline mode with auto-sync
- ⏳ Background location tracking

### Supervisor Role
- ✅ Login with username/password
- ⏳ Live map view of active workers
- ⏳ Review work reports
- ⏳ View attendance records
- ⏳ Filter by area and area type

## 🔐 Security

- JWT token authentication
- Encrypted storage for sensitive data
- Secure API communication (HTTPS)
- Location tracking only during shifts
- Photo EXIF data validation

## 📦 Build

### Android Debug Build
```bash
npx react-native run-android
```

### Android Release Build
```bash
cd android
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

### iOS Build (Phase 5)
```bash
cd ios
pod install
cd ..
npx react-native run-ios --configuration Release
```

## 📝 Development Status

### ✅ Completed
- [x] Project setup and folder structure
- [x] TypeScript configuration
- [x] Redux store setup
- [x] API client with interceptors
- [x] Navigation structure
- [x] Login screen
- [x] Theme and constants
- [x] Utility functions (GPS, validators, dates)
- [x] Type definitions

### ⏳ In Progress (Week 2)
- [ ] Worker screens implementation
- [ ] Supervisor screens implementation
- [ ] Camera integration
- [ ] GPS services
- [ ] Offline storage
- [ ] Background location tracking

### 📋 TODO (Future)
- [ ] Push notifications (Phase 2)
- [ ] Task assignment (Phase 2)
- [ ] Advanced analytics (Phase 3)
- [ ] Asset management (Phase 4)
- [ ] iOS support (Phase 5)

## 🐛 Known Issues

- None yet (MVP in development)

## 📚 Documentation

- **Project Overview:** `/README.md` (root)
- **Development Plan:** `/.agents/phase-1-mvp/`
- **Mobile Requirements:** `/.agents/phase-1-mvp/mobile-requirements.md`
- **API Documentation:** (backend repo)

## 👥 Team

- **Developer:** 1 full-stack developer
- **Client:** DKRTH Surabaya

## 📄 License

Proprietary - DKRTH Surabaya Municipal Government

---

**Last Updated:** January 2026  
**Version:** 0.1.0 (MVP)  
**React Native:** 0.76.6
