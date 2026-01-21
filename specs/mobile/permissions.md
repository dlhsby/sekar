# Device Permissions

Complete guide for requesting and managing device permissions in SEKAR mobile app.

## Overview

SEKAR requires several device permissions to function properly. All permissions must be requested with clear explanations and graceful degradation when denied.

---

## Required Permissions

| Permission | Platform | Purpose | Required | Fallback |
|------------|----------|---------|----------|----------|
| **Location (GPS)** | Both | Clock-in/out validation, tracking | Yes | Cannot clock in |
| **Camera** | Both | Selfie capture, report photos | Yes | Cannot take photos |
| **Photo Library** | Both | Select existing photos | No | Camera only |
| **Notifications** | Both | Shift reminders, sync alerts | No | No reminders |
| **Background Location** | Both | Location tracking during shift | Yes | Manual pings only |

---

## Location Permission

### Android Configuration

**File:** `android/app/src/main/AndroidManifest.xml`

```xml
<manifest>
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
  <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
  <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
</manifest>
```

### iOS Configuration

**File:** `ios/SEKAR/Info.plist`

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>SEKAR memerlukan akses lokasi untuk memvalidasi absensi Anda di area kerja yang ditugaskan.</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>SEKAR memerlukan akses lokasi untuk melacak keberadaan Anda selama shift kerja berlangsung.</string>

<key>NSLocationAlwaysUsageDescription</key>
<string>SEKAR memerlukan akses lokasi bahkan saat aplikasi tertutup untuk melacak keberadaan Anda selama shift.</string>
```

### Implementation

```typescript
// services/permissions/locationPermission.ts
import Geolocation from 'react-native-geolocation-service';
import { Platform, PermissionsAndroid } from 'react-native';

export class LocationPermission {
  async requestWhenInUse(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      const status = await Geolocation.requestAuthorization('whenInUse');
      return status === 'granted';
    }

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Izin Lokasi',
          message: 'SEKAR memerlukan akses lokasi untuk memvalidasi absensi Anda.',
          buttonPositive: 'Izinkan',
          buttonNegative: 'Tolak',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    return false;
  }

  async requestAlways(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      const status = await Geolocation.requestAuthorization('always');
      return status === 'granted';
    }

    if (Platform.OS === 'android') {
      // Android 10+ requires background location permission
      if (Platform.Version >= 29) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
          {
            title: 'Izin Lokasi Latar Belakang',
            message:
              'SEKAR memerlukan akses lokasi di latar belakang untuk melacak keberadaan Anda selama shift.',
            buttonPositive: 'Izinkan',
            buttonNegative: 'Tolak',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }

      // Android 9 and below: foreground permission is enough
      return await this.requestWhenInUse();
    }

    return false;
  }

  async checkPermission(): Promise<'granted' | 'denied' | 'never_ask_again'> {
    if (Platform.OS === 'ios') {
      const status = await Geolocation.requestAuthorization('whenInUse');
      return status === 'granted' ? 'granted' : 'denied';
    }

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted ? 'granted' : 'denied';
    }

    return 'denied';
  }
}
```

### Usage in Screens

```tsx
// screens/worker/ClockInScreen.tsx
const ClockInScreen = () => {
  const [locationPermission, setLocationPermission] = useState<boolean>(false);

  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    const permissionService = new LocationPermission();
    const status = await permissionService.checkPermission();

    if (status === 'granted') {
      setLocationPermission(true);
      getCurrentLocation();
    } else {
      // Show permission rationale
      showPermissionDialog();
    }
  };

  const showPermissionDialog = () => {
    Alert.alert(
      'Izin Lokasi Diperlukan',
      'SEKAR memerlukan akses lokasi untuk memvalidasi bahwa Anda berada di area kerja yang ditugaskan saat absen masuk.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Izinkan',
          onPress: async () => {
            const permissionService = new LocationPermission();
            const granted = await permissionService.requestWhenInUse();

            if (granted) {
              setLocationPermission(true);
              getCurrentLocation();
            } else {
              // Show settings redirect
              showOpenSettingsDialog();
            }
          },
        },
      ]
    );
  };

  const showOpenSettingsDialog = () => {
    Alert.alert(
      'Izin Ditolak',
      'Anda perlu mengizinkan akses lokasi di pengaturan perangkat.',
      [
        { text: 'Nanti', style: 'cancel' },
        { text: 'Buka Pengaturan', onPress: () => Linking.openSettings() },
      ]
    );
  };
};
```

---

## Camera Permission

### Android Configuration

```xml
<uses-permission android:name="android.permission.CAMERA" />
```

### iOS Configuration

```xml
<key>NSCameraUsageDescription</key>
<string>SEKAR memerlukan akses kamera untuk mengambil foto selfie saat absen dan foto laporan pekerjaan.</string>
```

### Implementation

```typescript
// services/permissions/cameraPermission.ts
import { Platform, PermissionsAndroid } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

export class CameraPermission {
  async request(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      const result = await request(PERMISSIONS.IOS.CAMERA);
      return result === RESULTS.GRANTED;
    }

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Izin Kamera',
          message: 'SEKAR memerlukan akses kamera untuk mengambil foto.',
          buttonPositive: 'Izinkan',
          buttonNegative: 'Tolak',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    return false;
  }

  async check(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      const result = await check(PERMISSIONS.IOS.CAMERA);
      return result === RESULTS.GRANTED;
    }

    if (Platform.OS === 'android') {
      return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
    }

    return false;
  }
}
```

### Usage

```tsx
// components/CameraButton.tsx
const CameraButton = ({ onPhotoTaken }: Props) => {
  const handlePress = async () => {
    const cameraPermission = new CameraPermission();
    const hasPermission = await cameraPermission.check();

    if (!hasPermission) {
      const granted = await cameraPermission.request();

      if (!granted) {
        Alert.alert(
          'Izin Kamera Diperlukan',
          'Anda perlu mengizinkan akses kamera untuk mengambil foto.',
          [
            { text: 'Nanti', style: 'cancel' },
            { text: 'Buka Pengaturan', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
    }

    // Open camera
    const photo = await ImagePicker.openCamera({
      mediaType: 'photo',
      width: 800,
      height: 800,
      cropping: false,
      compressImageQuality: 0.8,
    });

    onPhotoTaken(photo);
  };

  return (
    <Button onPress={handlePress}>
      <MaterialCommunityIcons name="camera" size={24} />
      Ambil Foto
    </Button>
  );
};
```

---

## Photo Library Permission

### Android Configuration

```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />
```

### iOS Configuration

```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>SEKAR memerlukan akses galeri foto untuk memilih foto yang ada.</string>
```

### Implementation

```typescript
export class PhotoLibraryPermission {
  async request(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      const result = await request(PERMISSIONS.IOS.PHOTO_LIBRARY);
      return result === RESULTS.GRANTED;
    }

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    return false;
  }
}
```

---

## Notifications Permission

### Android Configuration

```xml
<!-- No explicit permission needed for Android < 13 -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

### iOS Configuration

```xml
<key>NSUserNotificationsUsageDescription</key>
<string>SEKAR mengirimkan notifikasi untuk pengingat shift dan status sinkronisasi.</string>
```

### Implementation

```typescript
import messaging from '@react-native-firebase/messaging';

export class NotificationPermission {
  async request(): Promise<boolean> {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    return enabled;
  }

  async check(): Promise<boolean> {
    const authStatus = await messaging().hasPermission();
    return authStatus === messaging.AuthorizationStatus.AUTHORIZED;
  }
}
```

---

## Permission Request Flow

### Progressive Disclosure

Request permissions just-in-time when needed, not all at app launch.

```tsx
// App.tsx - Permission flow
const App = () => {
  useEffect(() => {
    // Don't request permissions on app launch
    // Request only when feature is accessed
  }, []);

  return <RootNavigator />;
};

// ClockInScreen - Request location when needed
const ClockInScreen = () => {
  const handleClockIn = async () => {
    // 1. Check permission
    const hasPermission = await locationPermission.check();

    if (!hasPermission) {
      // 2. Show rationale
      const userWantsToAllow = await showPermissionRationale();

      if (!userWantsToAllow) {
        return;
      }

      // 3. Request permission
      const granted = await locationPermission.request();

      if (!granted) {
        // 4. Show settings redirect
        showOpenSettingsDialog();
        return;
      }
    }

    // 5. Proceed with clock-in
    performClockIn();
  };
};
```

### Permission Rationale Dialog

```tsx
const showPermissionRationale = (type: 'location' | 'camera'): Promise<boolean> => {
  return new Promise((resolve) => {
    const messages = {
      location: {
        title: 'Izin Lokasi Diperlukan',
        message:
          'SEKAR memerlukan akses lokasi untuk memastikan Anda berada di area kerja saat absen. Lokasi Anda hanya digunakan selama shift kerja.',
      },
      camera: {
        title: 'Izin Kamera Diperlukan',
        message:
          'SEKAR memerlukan akses kamera untuk mengambil foto selfie saat absen dan foto laporan pekerjaan.',
      },
    };

    Alert.alert(messages[type].title, messages[type].message, [
      {
        text: 'Nanti',
        style: 'cancel',
        onPress: () => resolve(false),
      },
      {
        text: 'Izinkan',
        onPress: () => resolve(true),
      },
    ]);
  });
};
```

---

## Permission States

### Permission State Management

```typescript
// store/slices/permissionsSlice.ts
interface PermissionsState {
  location: 'granted' | 'denied' | 'never_ask_again' | 'unknown';
  camera: 'granted' | 'denied' | 'never_ask_again' | 'unknown';
  photoLibrary: 'granted' | 'denied' | 'never_ask_again' | 'unknown';
  notifications: 'granted' | 'denied' | 'unknown';
}

const initialState: PermissionsState = {
  location: 'unknown',
  camera: 'unknown',
  photoLibrary: 'unknown',
  notifications: 'unknown',
};

const permissionsSlice = createSlice({
  name: 'permissions',
  initialState,
  reducers: {
    setPermissionStatus: (
      state,
      action: PayloadAction<{ type: keyof PermissionsState; status: string }>
    ) => {
      state[action.payload.type] = action.payload.status as any;
    },
  },
});
```

---

## Handling Permission Denial

### Graceful Degradation

```tsx
// ClockInScreen - Handle denied location
const ClockInScreen = () => {
  const [locationPermission, setLocationPermission] = useState(false);

  if (!locationPermission) {
    return (
      <View style={styles.container}>
        <MaterialCommunityIcons name="map-marker-off" size={64} color={colors.gray400} />
        <Text style={styles.title}>Izin Lokasi Diperlukan</Text>
        <Text style={styles.message}>
          SEKAR memerlukan akses lokasi untuk memvalidasi absensi Anda. Tanpa izin
          lokasi, Anda tidak dapat melakukan absen.
        </Text>
        <Button onPress={requestLocationPermission}>Izinkan Lokasi</Button>
        <Button variant="text" onPress={() => Linking.openSettings()}>
          Buka Pengaturan
        </Button>
      </View>
    );
  }

  return <ClockInForm />;
};
```

### "Never Ask Again" State (Android)

```typescript
const handlePermissionDenied = async (permission: string) => {
  // Check if "Never ask again" was selected
  const canAskAgain = await PermissionsAndroid.shouldShowRequestPermissionRationale(
    permission
  );

  if (!canAskAgain) {
    // User selected "Never ask again"
    Alert.alert(
      'Izin Diperlukan',
      'Anda telah menolak izin ini secara permanen. Silakan aktifkan di pengaturan aplikasi.',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Buka Pengaturan', onPress: () => Linking.openSettings() },
      ]
    );
  }
};
```

---

## Testing Permissions

### Manual Testing Checklist

- [ ] Test first-time permission request
- [ ] Test "Allow" flow
- [ ] Test "Deny" flow
- [ ] Test "Never ask again" (Android)
- [ ] Test revoking permission in settings
- [ ] Test granting permission in settings after denial
- [ ] Test background location permission (Android 10+)
- [ ] Test camera permission with physical camera
- [ ] Test notification permission

### Automated Testing

```typescript
// __tests__/permissions.test.ts
describe('LocationPermission', () => {
  it('should request location permission on iOS', async () => {
    Platform.OS = 'ios';
    const permission = new LocationPermission();

    const granted = await permission.requestWhenInUse();

    expect(Geolocation.requestAuthorization).toHaveBeenCalledWith('whenInUse');
  });

  it('should handle denied permission', async () => {
    const permission = new LocationPermission();
    (Geolocation.requestAuthorization as jest.Mock).mockResolvedValue('denied');

    const granted = await permission.requestWhenInUse();

    expect(granted).toBe(false);
  });
});
```

---

**Document Owner:** Mobile Developer
**Last Updated:** 2026-01-16
**Status:** Active - Phase 1
**Dependencies:** `react-native-permissions`, `react-native-geolocation-service`, `@react-native-firebase/messaging`
