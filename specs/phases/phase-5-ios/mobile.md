# Phase 5 - Mobile Implementation Checklist

**Duration:** 10 days
**Prerequisites:** Phase 4 mobile deployed

---

## Overview

Configure iOS platform support, implement Apple Sign-In, Siri Shortcuts, biometric authentication, fraud detection, and internationalization (i18n).

---

## Timeline

| Day | Focus | Deliverables |
|-----|-------|--------------|
| Day 1-2 | iOS Build Setup | Xcode config, certificates |
| Day 3 | Apple Sign-In | iOS authentication |
| Day 4 | Siri Shortcuts | Voice commands |
| Day 5 | Biometric Auth | Face ID / Touch ID |
| Day 6-7 | Fraud Detection | GPS spoofing prevention |
| Day 8-9 | Internationalization | Multi-language support |
| Day 10 | Testing & Polish | iOS-specific testing |

---

## iOS Build Configuration

### Xcode Project Setup

**1. Bundle Identifier:**
```
com.DLH.sekar
```

**2. Info.plist Permissions:**
```xml
<!-- Location -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>SEKAR memerlukan akses lokasi untuk verifikasi kehadiran di area kerja.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>SEKAR memerlukan akses lokasi untuk pelacakan lokasi selama shift kerja.</string>

<!-- Camera -->
<key>NSCameraUsageDescription</key>
<string>SEKAR memerlukan akses kamera untuk foto laporan dan scan QR code.</string>

<!-- Photo Library -->
<key>NSPhotoLibraryUsageDescription</key>
<string>SEKAR memerlukan akses galeri foto untuk melampirkan foto laporan.</string>

<!-- Face ID -->
<key>NSFaceIDUsageDescription</key>
<string>SEKAR menggunakan Face ID untuk login yang lebih cepat dan aman.</string>

<!-- Background Modes -->
<key>UIBackgroundModes</key>
<array>
  <string>location</string>
  <string>fetch</string>
  <string>remote-notification</string>
</array>
```

**3. Capabilities:**
- Sign in with Apple
- Push Notifications
- Background Modes
- Associated Domains
- Siri

### Checklist

- [ ] Apple Developer Program enrollment active
- [ ] App ID created with capabilities
- [ ] Development certificate
- [ ] Distribution certificate
- [ ] Development provisioning profile
- [ ] Distribution provisioning profile
- [ ] Xcode project configured
- [ ] CocoaPods installed (`cd ios && pod install`)
- [ ] Build successful on simulator
- [ ] Build successful on physical device

---

## Apple Sign-In

### Installation

```bash
npm install @invertase/react-native-apple-authentication
cd ios && pod install
```

### Implementation

```typescript
// src/services/auth/appleAuth.ts
import appleAuth from '@invertase/react-native-apple-authentication';
import { apiClient } from '../api/apiClient';

export const appleAuthService = {
  isAvailable: async (): Promise<boolean> => {
    return appleAuth.isSupported;
  },

  signIn: async (): Promise<AuthResponse> => {
    const appleAuthResponse = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
    });

    const { identityToken, user, fullName, email } = appleAuthResponse;

    if (!identityToken) {
      throw new Error('Apple Sign-In failed: No identity token');
    }

    // Build full name from Apple response
    const displayName = fullName
      ? `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim()
      : undefined;

    // Send to backend
    const response = await apiClient.post('/auth/apple', {
      identityToken,
      user,
      fullName: displayName,
      email,
    });

    return response.data;
  },

  checkCredentialState: async (user: string): Promise<boolean> => {
    const state = await appleAuth.getCredentialStateForUser(user);
    return state === appleAuth.State.AUTHORIZED;
  },
};
```

### Apple Sign-In Button Component

```typescript
// src/components/auth/AppleSignInButton.tsx
import { AppleButton } from '@invertase/react-native-apple-authentication';

interface AppleSignInButtonProps {
  onSuccess: (response: AuthResponse) => void;
  onError: (error: Error) => void;
}

export const AppleSignInButton: React.FC<AppleSignInButtonProps> = ({
  onSuccess,
  onError,
}) => {
  const handlePress = async () => {
    try {
      const response = await appleAuthService.signIn();
      onSuccess(response);
    } catch (error) {
      onError(error);
    }
  };

  if (!appleAuthService.isAvailable()) {
    return null; // Only show on iOS 13+
  }

  return (
    <AppleButton
      buttonStyle={AppleButton.Style.BLACK}
      buttonType={AppleButton.Type.SIGN_IN}
      style={styles.appleButton}
      onPress={handlePress}
    />
  );
};
```

### Checklist

- [ ] Install react-native-apple-authentication
- [ ] Configure Xcode capability
- [ ] Create App ID with Sign in with Apple
- [ ] AppleSignInButton component
- [ ] Backend integration
- [ ] Handle first-time vs returning user
- [ ] Store Apple user ID securely
- [ ] Credential state monitoring

---

## Siri Shortcuts

### Installation

```bash
npm install react-native-siri-shortcut
cd ios && pod install
```

### Implementation

```typescript
// src/services/siri/shortcuts.ts
import {
  SiriShortcutsEvent,
  donateShortcut,
  clearShortcutsWithIdentifiers,
  presentShortcut,
} from 'react-native-siri-shortcut';

export const siriShortcuts = {
  donateClockIn: async (areaName: string) => {
    await donateShortcut({
      activityType: 'com.DLH.sekar.clockin',
      title: 'Mulai Shift',
      suggestedInvocationPhrase: `Mulai shift di ${areaName}`,
      isEligibleForSearch: true,
      isEligibleForPrediction: true,
      userInfo: { action: 'clock_in', area: areaName },
      persistentIdentifier: `clockin-${areaName}`,
    });
  },

  donateClockOut: async () => {
    await donateShortcut({
      activityType: 'com.DLH.sekar.clockout',
      title: 'Selesai Shift',
      suggestedInvocationPhrase: 'Selesai shift kerja',
      isEligibleForSearch: true,
      isEligibleForPrediction: true,
      userInfo: { action: 'clock_out' },
      persistentIdentifier: 'clockout',
    });
  },

  donateCreateReport: async () => {
    await donateShortcut({
      activityType: 'com.DLH.sekar.report',
      title: 'Buat Laporan',
      suggestedInvocationPhrase: 'Buat laporan kerja',
      isEligibleForSearch: true,
      isEligibleForPrediction: true,
      userInfo: { action: 'create_report' },
      persistentIdentifier: 'create-report',
    });
  },

  handleShortcutActivation: (callback: (userInfo: any) => void) => {
    const subscription = SiriShortcutsEvent.addListener(
      'SiriShortcutListener',
      ({ userInfo }) => {
        callback(userInfo);
      }
    );
    return subscription;
  },

  clearAll: async () => {
    await clearShortcutsWithIdentifiers([
      'clockin',
      'clockout',
      'create-report',
    ]);
  },
};
```

### Deep Link Handling

```typescript
// src/navigation/DeepLinkHandler.tsx
import { useEffect } from 'react';
import { Linking } from 'react-native';
import { siriShortcuts } from '@/services/siri/shortcuts';

export const DeepLinkHandler: React.FC = () => {
  useEffect(() => {
    const subscription = siriShortcuts.handleShortcutActivation(
      (userInfo) => {
        switch (userInfo.action) {
          case 'clock_in':
            navigation.navigate('ClockIn', { area: userInfo.area });
            break;
          case 'clock_out':
            navigation.navigate('ClockOut');
            break;
          case 'create_report':
            navigation.navigate('CreateReport');
            break;
        }
      }
    );

    return () => subscription.remove();
  }, []);

  return null;
};
```

### Checklist

- [ ] Install react-native-siri-shortcut
- [ ] Configure Siri capability in Xcode
- [ ] Donate clock-in shortcut after assignment
- [ ] Donate clock-out shortcut after clock-in
- [ ] Donate report shortcut after clock-in
- [ ] Handle shortcut activation via deep links
- [ ] Clear shortcuts on logout
- [ ] Present shortcut for user customization

---

## Biometric Authentication

### Installation

```bash
npm install react-native-biometrics
cd ios && pod install
```

### Implementation

```typescript
// src/services/auth/biometricAuth.ts
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import EncryptedStorage from 'react-native-encrypted-storage';

const rnBiometrics = new ReactNativeBiometrics();

export const biometricAuth = {
  isAvailable: async (): Promise<{ available: boolean; biometryType: string }> => {
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();
    return { available, biometryType: biometryType || 'None' };
  },

  getBiometryLabel: (biometryType: string): string => {
    switch (biometryType) {
      case BiometryTypes.FaceID:
        return 'Face ID';
      case BiometryTypes.TouchID:
        return 'Touch ID';
      case BiometryTypes.Biometrics:
        return 'Fingerprint';
      default:
        return 'Biometric';
    }
  },

  createKeys: async (): Promise<string> => {
    const { publicKey } = await rnBiometrics.createKeys();
    return publicKey;
  },

  promptBiometric: async (promptMessage: string): Promise<boolean> => {
    try {
      const { success } = await rnBiometrics.simplePrompt({
        promptMessage,
        cancelButtonText: 'Batal',
      });
      return success;
    } catch {
      return false;
    }
  },

  signWithBiometric: async (payload: string): Promise<string | null> => {
    try {
      const { success, signature } = await rnBiometrics.createSignature({
        promptMessage: 'Konfirmasi identitas Anda',
        payload,
        cancelButtonText: 'Batal',
      });
      return success ? signature : null;
    } catch {
      return null;
    }
  },

  enableBiometricLogin: async (refreshToken: string): Promise<void> => {
    // Store encrypted token for biometric login
    await EncryptedStorage.setItem('biometric_token', refreshToken);
    await EncryptedStorage.setItem('biometric_enabled', 'true');
  },

  disableBiometricLogin: async (): Promise<void> => {
    await EncryptedStorage.removeItem('biometric_token');
    await EncryptedStorage.setItem('biometric_enabled', 'false');
    await rnBiometrics.deleteKeys();
  },

  isBiometricLoginEnabled: async (): Promise<boolean> => {
    const enabled = await EncryptedStorage.getItem('biometric_enabled');
    return enabled === 'true';
  },

  biometricLogin: async (): Promise<string | null> => {
    const success = await biometricAuth.promptBiometric('Login dengan biometrik');
    if (success) {
      return await EncryptedStorage.getItem('biometric_token');
    }
    return null;
  },
};
```

### Biometric Settings Screen

```typescript
// src/screens/settings/BiometricSettingsScreen.tsx
export const BiometricSettingsScreen: React.FC = () => {
  const [available, setAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState('');
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    checkBiometric();
  }, []);

  const checkBiometric = async () => {
    const { available, biometryType } = await biometricAuth.isAvailable();
    setAvailable(available);
    setBiometryType(biometryType);
    setEnabled(await biometricAuth.isBiometricLoginEnabled());
  };

  const toggleBiometric = async (value: boolean) => {
    if (value) {
      const success = await biometricAuth.promptBiometric('Aktifkan biometrik');
      if (success) {
        await biometricAuth.enableBiometricLogin(refreshToken);
        setEnabled(true);
      }
    } else {
      await biometricAuth.disableBiometricLogin();
      setEnabled(false);
    }
  };

  if (!available) {
    return <Text>Biometrik tidak tersedia di perangkat ini</Text>;
  }

  return (
    <View>
      <Text>{biometricAuth.getBiometryLabel(biometryType)}</Text>
      <Switch value={enabled} onValueChange={toggleBiometric} />
    </View>
  );
};
```

### Checklist

- [ ] Install react-native-biometrics
- [ ] Check biometric availability
- [ ] Display biometry type (Face ID/Touch ID/Fingerprint)
- [ ] Enable biometric login toggle
- [ ] Store refresh token securely
- [ ] Biometric prompt on login screen
- [ ] Fallback to password login
- [ ] Delete keys on logout

---

## Fraud Detection (Mobile)

### Mock Location Detection

```typescript
// src/services/security/fraudDetection.ts
import DeviceInfo from 'react-native-device-info';
import Geolocation from 'react-native-geolocation-service';

export const fraudDetection = {
  getDeviceInfo: async (): Promise<DeviceInfoDto> => {
    const [deviceId, isEmulator, model, systemVersion] = await Promise.all([
      DeviceInfo.getUniqueId(),
      DeviceInfo.isEmulator(),
      DeviceInfo.getModel(),
      DeviceInfo.getSystemVersion(),
    ]);

    return {
      deviceId,
      platform: Platform.OS,
      osVersion: systemVersion,
      deviceModel: model,
      appVersion: DeviceInfo.getVersion(),
      isEmulator,
      isRooted: await this.checkRooted(),
      isMockLocationEnabled: await this.checkMockLocation(),
    };
  },

  checkRooted: async (): Promise<boolean> => {
    // iOS: Check for jailbreak
    // Android: Check for root
    return false; // Implement platform-specific checks
  },

  checkMockLocation: async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      // Android: Check Settings.Secure.ALLOW_MOCK_LOCATION
      // or location.isFromMockProvider()
      return false;
    }
    // iOS doesn't have mock location setting
    return false;
  },

  validateLocationIntegrity: async (position: GeolocationPosition): Promise<LocationCheckResult> => {
    const deviceInfo = await this.getDeviceInfo();

    const response = await apiClient.post('/fraud/check-location', {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      speed: position.coords.speed,
      deviceInfo,
    });

    return response.data;
  },
};
```

### Integration with Clock-In

```typescript
// Enhanced clock-in with fraud detection
const handleClockIn = async () => {
  // Get location
  const position = await getCurrentPosition();

  // Validate location integrity
  const checkResult = await fraudDetection.validateLocationIntegrity(position);

  if (!checkResult.passed) {
    Alert.alert(
      'Peringatan Keamanan',
      'Terdeteksi aktivitas mencurigakan. Clock-in tidak dapat dilakukan.'
    );
    return;
  }

  // Proceed with clock-in
  await shiftsApi.clockIn({
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
  });
};
```

### Checklist

- [ ] Device info collection
- [ ] Emulator detection
- [ ] Root/jailbreak detection
- [ ] Mock location detection (Android)
- [ ] Integrate with clock-in flow
- [ ] Show warning for suspicious activity
- [ ] Send device info with location requests

---

## Internationalization (i18n)

### Installation

```bash
npm install i18next react-i18next
npm install @react-native-async-storage/async-storage  # Already installed
```

### Configuration

```typescript
// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import id from './locales/id.json';
import en from './locales/en.json';

const LANGUAGE_KEY = 'app_language';

const languageDetector = {
  type: 'languageDetector',
  async: true,
  detect: async (callback: (lang: string) => void) => {
    const savedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
    callback(savedLang || 'id');
  },
  init: () => {},
  cacheUserLanguage: async (lang: string) => {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources: {
      id: { translation: id },
      en: { translation: en },
    },
    fallbackLng: 'id',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
```

### Translation Files

```json
// src/i18n/locales/id.json
{
  "common": {
    "loading": "Memuat...",
    "error": "Terjadi kesalahan",
    "retry": "Coba lagi",
    "cancel": "Batal",
    "save": "Simpan",
    "delete": "Hapus",
    "confirm": "Konfirmasi"
  },
  "auth": {
    "login": "Masuk",
    "logout": "Keluar",
    "username": "Username",
    "password": "Password",
    "forgotPassword": "Lupa password?",
    "signInWithApple": "Masuk dengan Apple"
  },
  "shift": {
    "clockIn": "Clock In",
    "clockOut": "Clock Out",
    "startShift": "Mulai Shift",
    "endShift": "Selesai Shift",
    "shiftActive": "Shift Aktif",
    "noActiveShift": "Tidak ada shift aktif"
  },
  "report": {
    "createReport": "Buat Laporan",
    "condition": "Kondisi",
    "description": "Deskripsi",
    "photos": "Foto",
    "submit": "Kirim Laporan"
  }
}
```

```json
// src/i18n/locales/en.json
{
  "common": {
    "loading": "Loading...",
    "error": "An error occurred",
    "retry": "Retry",
    "cancel": "Cancel",
    "save": "Save",
    "delete": "Delete",
    "confirm": "Confirm"
  },
  "auth": {
    "login": "Login",
    "logout": "Logout",
    "username": "Username",
    "password": "Password",
    "forgotPassword": "Forgot password?",
    "signInWithApple": "Sign in with Apple"
  },
  "shift": {
    "clockIn": "Clock In",
    "clockOut": "Clock Out",
    "startShift": "Start Shift",
    "endShift": "End Shift",
    "shiftActive": "Active Shift",
    "noActiveShift": "No active shift"
  },
  "report": {
    "createReport": "Create Report",
    "condition": "Condition",
    "description": "Description",
    "photos": "Photos",
    "submit": "Submit Report"
  }
}
```

### Usage in Components

```typescript
// Example usage
import { useTranslation } from 'react-i18next';

export const LoginScreen: React.FC = () => {
  const { t } = useTranslation();

  return (
    <View>
      <Text>{t('auth.login')}</Text>
      <TextInput placeholder={t('auth.username')} />
      <TextInput placeholder={t('auth.password')} />
      <Button title={t('auth.login')} />
    </View>
  );
};
```

### Language Selector

```typescript
// src/components/settings/LanguageSelector.tsx
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'en', label: 'English' },
];

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();

  const changeLanguage = async (code: string) => {
    await i18n.changeLanguage(code);
    // Also update backend preference
    await apiClient.put('/users/me/language', { language: code });
  };

  return (
    <View>
      {languages.map((lang) => (
        <TouchableOpacity
          key={lang.code}
          onPress={() => changeLanguage(lang.code)}
          style={[
            styles.option,
            i18n.language === lang.code && styles.selected,
          ]}
        >
          <Text>{lang.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};
```

### Checklist

- [ ] Install i18next and react-i18next
- [ ] Create i18n configuration
- [ ] Extract all strings to JSON files
- [ ] Indonesian (id) translations
- [ ] English (en) translations
- [ ] Language selector component
- [ ] Persist language preference
- [ ] Sync with backend preference
- [ ] Date formatting per locale
- [ ] Number formatting per locale

---

## Testing Requirements

| Feature | Tests |
|---------|-------|
| iOS Build | Build on simulator, physical device |
| Apple Sign-In | Token flow, error handling |
| Siri Shortcuts | Donation, activation |
| Biometric | Enable/disable, login flow |
| Fraud Detection | Device info, location validation |
| i18n | Language switch, all strings |

---

## Success Criteria

1. iOS app builds and runs on physical device
2. Apple Sign-In works for new and existing users
3. Siri can trigger "Mulai shift" command
4. Face ID / Touch ID login works
5. Fraud detection catches mock locations
6. App supports Indonesian and English
7. All features have parity with Android

---

**Last Updated:** 2026-01-16
