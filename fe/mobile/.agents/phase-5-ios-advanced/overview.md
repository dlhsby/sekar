# Phase 5 - iOS & Advanced Features (Mobile)

## 🎯 Objectives

Build iOS app with full feature parity and add advanced features like biometrics.

**Duration:** 10 days  
**Prerequisites:** Phase 4 deployed, stable Android app

---

## 📅 Timeline

| Day | Focus | Features |
|-----|-------|----------|
| Day 1-2 | iOS Setup | Xcode config, pods, signing |
| Day 3-5 | iOS Adaptation | Platform-specific adjustments |
| Day 6 | Biometrics | Face ID / Touch ID login |
| Day 7-8 | i18n | Indonesian, English support |
| Day 9-10 | Polish | Testing, bug fixes, submission |

---

## 📱 iOS Development

### Setup Tasks

1. **Xcode Configuration**
   - Open `ios/` folder in Xcode
   - Configure signing & capabilities
   - Set bundle identifier
   - Configure app icons

2. **CocoaPods Setup**
   ```bash
   cd ios && pod install
   ```

3. **Platform-Specific Files**
   - `GoogleService-Info.plist` for FCM
   - `Info.plist` permissions
   - Privacy manifest for iOS 17+

### iOS-Specific Considerations

**Location Permissions:**
```xml
<!-- ios/SekarApp/Info.plist -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>SEKAR needs your location to verify clock-in at work areas</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>SEKAR tracks your location during work shifts for safety</string>
<key>NSLocationAlwaysUsageDescription</key>
<string>SEKAR tracks your location during work shifts</string>
```

**Camera Permission:**
```xml
<key>NSCameraUsageDescription</key>
<string>SEKAR needs camera access for selfie verification and work reports</string>
```

**Background Modes:**
```xml
<key>UIBackgroundModes</key>
<array>
  <string>location</string>
  <string>remote-notification</string>
</array>
```

---

## 🔐 Biometric Authentication

### Implementation

```typescript
// src/services/auth/biometricService.ts
import ReactNativeBiometrics from 'react-native-biometrics';

const rnBiometrics = new ReactNativeBiometrics();

export const biometricService = {
  async isAvailable(): Promise<{ available: boolean; type: string }> {
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();
    return { 
      available, 
      type: biometryType || 'none' // TouchID, FaceID, Biometrics
    };
  },

  async authenticate(reason: string): Promise<boolean> {
    try {
      const { success } = await rnBiometrics.simplePrompt({ promptMessage: reason });
      return success;
    } catch {
      return false;
    }
  },

  async createKeys(): Promise<string> {
    const { publicKey } = await rnBiometrics.createKeys();
    return publicKey;
  },

  async signData(payload: string): Promise<string> {
    const { signature } = await rnBiometrics.createSignature({
      promptMessage: 'Sign in',
      payload,
    });
    return signature;
  }
};
```

### Biometric Login Flow

```typescript
// src/screens/auth/LoginScreen.tsx
const handleBiometricLogin = async () => {
  const { available, type } = await biometricService.isAvailable();
  
  if (!available) {
    Alert.alert('Not Available', 'Biometric authentication not available');
    return;
  }

  const success = await biometricService.authenticate(
    `Sign in with ${type === 'FaceID' ? 'Face ID' : 'Fingerprint'}`
  );

  if (success) {
    // Get stored credentials and login
    const token = await EncryptedStorage.getItem('biometric_token');
    if (token) {
      await loginWithToken(token);
    }
  }
};
```

---

## 🌐 Multi-Language Support (i18n)

### Setup

```bash
npm install react-i18next i18next
```

### Configuration

```typescript
// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';

import id from './translations/id.json';
import en from './translations/en.json';

const resources = { id, en };

i18n.use(initReactI18next).init({
  resources,
  lng: RNLocalize.getLocales()[0].languageCode,
  fallbackLng: 'id',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
```

### Translation Files

```json
// src/i18n/translations/id.json
{
  "common": {
    "loading": "Memuat...",
    "error": "Terjadi kesalahan",
    "retry": "Coba lagi",
    "submit": "Kirim",
    "cancel": "Batal"
  },
  "auth": {
    "login": "Masuk",
    "logout": "Keluar",
    "username": "Nama Pengguna",
    "password": "Kata Sandi"
  },
  "shift": {
    "clockIn": "Masuk Kerja",
    "clockOut": "Selesai Kerja",
    "currentShift": "Shift Saat Ini"
  },
  "report": {
    "newReport": "Laporan Baru",
    "submitReport": "Kirim Laporan",
    "condition": "Kondisi",
    "good": "Baik",
    "fair": "Cukup",
    "poor": "Buruk"
  }
}
```

```json
// src/i18n/translations/en.json
{
  "common": {
    "loading": "Loading...",
    "error": "An error occurred",
    "retry": "Try again",
    "submit": "Submit",
    "cancel": "Cancel"
  },
  "auth": {
    "login": "Login",
    "logout": "Logout",
    "username": "Username",
    "password": "Password"
  },
  "shift": {
    "clockIn": "Clock In",
    "clockOut": "Clock Out",
    "currentShift": "Current Shift"
  },
  "report": {
    "newReport": "New Report",
    "submitReport": "Submit Report",
    "condition": "Condition",
    "good": "Good",
    "fair": "Fair",
    "poor": "Poor"
  }
}
```

### Usage

```typescript
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();
  
  return (
    <Button title={t('shift.clockIn')} onPress={handleClockIn} />
  );
};
```

---

## 🏗️ New Components

```
src/
├── i18n/
│   ├── index.ts
│   └── translations/
│       ├── id.json
│       └── en.json
├── services/
│   └── auth/
│       └── biometricService.ts
└── screens/
    └── settings/
        └── LanguageSettingsScreen.tsx
```

---

## 📱 App Store Submission

### iOS App Store

1. **App Store Connect Setup**
   - Create app record
   - Add app information
   - Upload screenshots

2. **Build Archive**
   ```bash
   cd ios
   xcodebuild -workspace SekarApp.xcworkspace -scheme SekarApp -configuration Release archive
   ```

3. **Submit for Review**
   - Upload via Xcode or Transporter
   - Fill review information
   - Submit

### Privacy Information
- Data collection disclosure
- Privacy policy URL
- App tracking transparency

---

## ✅ Success Criteria

1. ✅ iOS app has full feature parity
2. ✅ iOS-specific permissions work
3. ✅ Background location on iOS
4. ✅ Face ID / Touch ID login
5. ✅ Indonesian language complete
6. ✅ English language complete
7. ✅ Language switching works
8. ✅ App Store submission ready

---

## 📝 Dependencies

```bash
npm install react-native-biometrics
npm install react-i18next i18next
npm install react-native-localize
```

---

*Last Updated: January 2026*

