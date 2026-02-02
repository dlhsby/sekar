# Phase 4: Mobile Implementation Guide

**Component:** Mobile App (React Native + TypeScript)
**Developer Role:** Mobile Developer
**Duration:** 6-8 weeks

---

## Overview

Phase 4 mobile work adds analytics visualization, asset management with QR scanning, and iOS platform support. All features follow Neo Brutalism design system established in Phase 2.

---

## Part A: Analytics & Reporting (Weeks 1-2)

### Screens to Create

#### 1. AnalyticsDashboardScreen

**Location:** `fe/mobile/src/screens/analytics/AnalyticsDashboardScreen.tsx`

**Purpose:** Display worker performance metrics and area statistics

**Components:**
```typescript
<SafeAreaView>
  <ScrollView>
    <NBCard variant="elevated">
      <Text>My Performance</Text>
      {/* Performance metrics */}
      <MetricRow label="Attendance Rate" value="95%" />
      <MetricRow label="Tasks Completed" value="24/25" />
      <MetricRow label="Punctuality Score" value="92/100" />
    </NBCard>

    <NBCard variant="elevated">
      <Text>This Month</Text>
      {/* Charts */}
      <BarChart data={attendanceData} />
    </NBCard>

    <NBCard variant="elevated">
      <Text>Recent Activity</Text>
      {/* Activity timeline */}
      <ActivityTimeline items={recentActivity} />
    </NBCard>
  </ScrollView>
</SafeAreaView>
```

**API Integration:**
```typescript
// services/api/analyticsApi.ts
export const analyticsApi = {
  getWorkerStats: async (workerId: string) => {
    const response = await apiClient.get(`/analytics/workers/${workerId}`);
    return response.data;
  },

  getPerformanceTrends: async (workerId: string, period: string) => {
    const response = await apiClient.get(`/analytics/workers/${workerId}/trends`, {
      params: { period },
    });
    return response.data;
  },
};
```

#### 2. ReportsListScreen

**Location:** `fe/mobile/src/screens/analytics/ReportsListScreen.tsx`

**Purpose:** View generated reports and download/share

**Features:**
- List of available reports (daily, weekly, monthly)
- Filter by date range and type
- Download PDF reports
- Share reports via native share sheet

---

## Part B: Asset Management (Weeks 3-4)

### Screens to Create

#### 1. QRScannerScreen

**Location:** `fe/mobile/src/screens/assets/QRScannerScreen.tsx`

**Dependencies:**
```bash
npm install react-native-camera
npm install react-native-permissions
```

**Implementation:**
```typescript
import { RNCamera } from 'react-native-camera';

export const QRScannerScreen = () => {
  const navigation = useNavigation();
  const [scanned, setScanned] = useState(false);

  const onBarCodeRead = async (barcode: Barcode) => {
    if (scanned) return;
    setScanned(true);

    const assetCode = barcode.data;

    try {
      // Fetch asset details
      const asset = await assetsApi.getByCode(assetCode);

      // Haptic feedback
      triggerHaptic('success');

      // Navigate to asset details
      navigation.navigate('AssetDetails', { assetId: asset.id });
    } catch (error) {
      triggerHaptic('error');
      Alert.alert('Error', 'Asset not found');
      setScanned(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <RNCamera
        style={{ flex: 1 }}
        onBarCodeRead={onBarCodeRead}
        barCodeTypes={[RNCamera.Constants.BarCodeType.qr]}
        captureAudio={false}
      >
        <View style={styles.overlay}>
          <View style={styles.scanArea} />
          <Text style={styles.instruction}>
            Point camera at QR code
          </Text>
        </View>
      </RNCamera>
    </View>
  );
};
```

#### 2. AssetDetailsScreen

**Location:** `fe/mobile/src/screens/assets/AssetDetailsScreen.tsx`

**Components:**
```typescript
<ScrollView>
  <NBCard variant="elevated">
    {asset.photoUrl && (
      <Image source={{ uri: asset.photoUrl }} style={styles.assetPhoto} />
    )}

    <Text style={nbTextStyles.h2}>{asset.name}</Text>
    <NBBadge
      text={asset.status}
      color={getStatusColor(asset.status)}
    />

    <View style={styles.details}>
      <DetailRow label="Asset Code" value={asset.assetCode} />
      <DetailRow label="Type" value={asset.assetType} />
      <DetailRow label="Status" value={asset.status} />
      <DetailRow label="Current Holder" value={asset.currentHolder?.name || 'Available'} />
    </View>
  </NBCard>

  {asset.status === 'available' && (
    <NBButton
      label="Assign to Me"
      onPress={handleAssignToSelf}
      variant="primary"
    />
  )}

  {asset.currentHolder?.id === currentUser.id && (
    <NBButton
      label="Return Asset"
      onPress={handleReturn}
      variant="secondary"
    />
  )}

  <NBCard variant="outlined">
    <Text style={nbTextStyles.h3}>Assignment History</Text>
    <FlatList
      data={asset.assignments}
      renderItem={({ item }) => (
        <AssignmentHistoryItem assignment={item} />
      )}
    />
  </NBCard>
</ScrollView>
```

#### 3. MaintenanceReportScreen

**Location:** `fe/mobile/src/screens/assets/MaintenanceReportScreen.tsx`

**Purpose:** Submit maintenance reports for assets

**Form Fields:**
- Asset selection (scanned or manual)
- Maintenance type (preventive, corrective, inspection)
- Description
- Photos
- Cost (optional)

### API Integration

```typescript
// services/api/assetsApi.ts
export const assetsApi = {
  getByCode: async (assetCode: string) => {
    const response = await apiClient.get(`/assets`, {
      params: { assetCode },
    });
    return response.data[0];
  },

  getDetails: async (assetId: string) => {
    const response = await apiClient.get(`/assets/${assetId}`);
    return response.data;
  },

  assign: async (assetId: string, userId: string) => {
    const response = await apiClient.post(`/assets/${assetId}/assign`, {
      assignedToUser: userId,
    });
    return response.data;
  },

  return: async (assetId: string) => {
    const response = await apiClient.post(`/assets/${assetId}/return`);
    return response.data;
  },

  getHistory: async (assetId: string) => {
    const response = await apiClient.get(`/assets/${assetId}/history`);
    return response.data;
  },
};

// services/api/maintenanceApi.ts
export const maintenanceApi = {
  create: async (data: CreateMaintenanceDto) => {
    const response = await apiClient.post('/maintenance', data);
    return response.data;
  },

  getSchedule: async () => {
    const response = await apiClient.get('/maintenance/schedule');
    return response.data;
  },
};
```

### Redux State

```typescript
// store/slices/assetsSlice.ts
interface AssetsState {
  currentAsset: Asset | null;
  myAssets: Asset[];
  recentScans: Asset[];
  loading: boolean;
  error: string | null;
}

const assetsSlice = createSlice({
  name: 'assets',
  initialState,
  reducers: {
    setCurrentAsset: (state, action) => {
      state.currentAsset = action.payload;
    },
    addRecentScan: (state, action) => {
      state.recentScans.unshift(action.payload);
      if (state.recentScans.length > 10) {
        state.recentScans.pop();
      }
    },
    clearCurrentAsset: (state) => {
      state.currentAsset = null;
    },
  },
});
```

---

## Part C: iOS Platform Support (Weeks 5-6)

### iOS Configuration

#### 1. Xcode Project Setup

**Location:** `fe/mobile/ios/`

**Info.plist Additions:**
```xml
<!-- Camera for QR scanning -->
<key>NSCameraUsageDescription</key>
<string>SEKAR needs camera access to scan asset QR codes</string>

<!-- Location (already configured in Phase 1) -->
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>SEKAR tracks your location during work shifts for attendance verification</string>

<!-- Apple Sign-In -->
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.dlhsurabaya.sekar</string>
    </array>
  </dict>
</array>

<!-- Background Modes -->
<key>UIBackgroundModes</key>
<array>
  <string>location</string>
  <string>fetch</string>
  <string>remote-notification</string>
</array>
```

#### 2. Apple Sign-In Implementation

**Dependencies:**
```bash
npm install @invertase/react-native-apple-authentication
```

**Implementation:**
```typescript
// services/auth/appleAuth.ts
import appleAuth from '@invertase/react-native-apple-authentication';
import { apiClient } from '../api/apiClient';

export class AppleAuth {
  async signIn(): Promise<AuthResult> {
    try {
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      const { identityToken, user } = appleAuthRequestResponse;

      // Send to backend for verification
      const response = await apiClient.post('/auth/apple', {
        identityToken,
        user,
      });

      return response.data;
    } catch (error) {
      console.error('Apple Sign-In failed:', error);
      throw error;
    }
  }

  async getCredentialState(user: string): Promise<string> {
    return await appleAuth.getCredentialStateForUser(user);
  }
}

export const appleAuthService = new AppleAuth();
```

**Login Screen Integration:**
```typescript
// screens/auth/LoginScreen.tsx
import { AppleButton } from '@invertase/react-native-apple-authentication';

export const LoginScreen = () => {
  const handleAppleSignIn = async () => {
    try {
      const result = await appleAuthService.signIn();
      // Handle successful login
      await storeTokens(result.accessToken, result.refreshToken);
      navigation.navigate('Dashboard');
    } catch (error) {
      Alert.alert('Error', 'Apple Sign-In failed');
    }
  };

  return (
    <View>
      {/* Existing NIP/Password login */}

      {Platform.OS === 'ios' && (
        <AppleButton
          buttonStyle={AppleButton.Style.BLACK}
          buttonType={AppleButton.Type.SIGN_IN}
          style={styles.appleButton}
          onPress={handleAppleSignIn}
        />
      )}
    </View>
  );
};
```

#### 3. Siri Shortcuts

**Dependencies:**
```bash
npm install react-native-siri-shortcut
```

**Implementation:**
```typescript
// services/siri/shortcuts.ts
import { donateShortcut } from 'react-native-siri-shortcut';

export class SiriShortcuts {
  async donateClockInShortcut(areaName: string) {
    await donateShortcut({
      activityType: 'com.dlhsurabaya.sekar.clockin',
      title: 'Mulai Shift Kerja',
      userInfo: { action: 'clock_in', area: areaName },
      isEligibleForSearch: true,
      isEligibleForPrediction: true,
      suggestedInvocationPhrase: `Mulai shift di ${areaName}`,
      persistentIdentifier: `clockin-${areaName}`,
    });
  }

  async donateReportShortcut() {
    await donateShortcut({
      activityType: 'com.dlhsurabaya.sekar.report',
      title: 'Buat Laporan',
      userInfo: { action: 'create_report' },
      isEligibleForSearch: true,
      isEligibleForPrediction: true,
      suggestedInvocationPhrase: 'Buat laporan pekerjaan',
      persistentIdentifier: 'create-report',
    });
  }
}

export const siriShortcutsService = new SiriShortcuts();
```

**Usage in App:**
```typescript
// After successful clock-in
await siriShortcutsService.donateClockInShortcut(area.name);

// After report submission
await siriShortcutsService.donateReportShortcut();
```

#### 4. APNs Push Notifications

**Configuration already done in Phase 2 with FCM**

Update `fcmService.ts` to handle iOS-specific token registration:

```typescript
// services/notifications/fcmService.ts
async getToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'ios') {
      // Request iOS permissions
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('iOS notification permission not granted');
        return null;
      }

      // Get APNs token
      const apnsToken = await messaging().getAPNSToken();
      if (apnsToken) {
        console.log('APNs token:', apnsToken);
      }
    }

    // Get FCM token (works for both iOS and Android)
    const token = await messaging().getToken();
    return token;
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
}
```

---

## Navigation Updates

Update `fe/mobile/src/navigation/AppNavigator.tsx`:

```typescript
// Add new screens to stack
<Stack.Screen
  name="AnalyticsDashboard"
  component={AnalyticsDashboardScreen}
  options={{ title: 'Performance' }}
/>
<Stack.Screen
  name="ReportsList"
  component={ReportsListScreen}
  options={{ title: 'Reports' }}
/>
<Stack.Screen
  name="QRScanner"
  component={QRScannerScreen}
  options={{ title: 'Scan Asset' }}
/>
<Stack.Screen
  name="AssetDetails"
  component={AssetDetailsScreen}
  options={{ title: 'Asset Details' }}
/>
<Stack.Screen
  name="MaintenanceReport"
  component={MaintenanceReportScreen}
  options={{ title: 'Maintenance Report' }}
/>
```

---

## Testing

### Component Tests

```bash
# Analytics screens
npm test -- AnalyticsDashboardScreen.test.tsx
npm test -- ReportsListScreen.test.tsx

# Asset screens
npm test -- QRScannerScreen.test.tsx
npm test -- AssetDetailsScreen.test.tsx
npm test -- MaintenanceReportScreen.test.tsx

# iOS-specific
npm test -- appleAuth.test.ts
npm test -- siriShortcuts.test.ts
```

### Integration Tests

```bash
# QR scanning flow
npm test -- qr-scanning.integration.test.ts

# Asset assignment flow
npm test -- asset-assignment.integration.test.ts

# Apple Sign-In flow
npm test -- apple-signin.integration.test.ts
```

---

## Platform-Specific Builds

### Android Build

```bash
cd android
./gradlew assembleRelease
```

### iOS Build

```bash
cd ios
pod install
cd ..
npx react-native run-ios --configuration Release
```

---

## Success Criteria

**Analytics:**
- [ ] Performance metrics displayed correctly
- [ ] Charts render smoothly
- [ ] Reports can be downloaded and shared

**Assets:**
- [ ] QR scanner works reliably
- [ ] Asset assignment tracking works
- [ ] Maintenance reports submitted successfully
- [ ] Camera permissions handled properly

**iOS:**
- [ ] Apple Sign-In works correctly
- [ ] Siri Shortcuts can be created
- [ ] APNs notifications work
- [ ] App builds successfully on iOS
- [ ] All features work identically to Android

---

## Related Documentation

- [Backend Implementation](./backend.md)
- [Web Implementation](./web.md)
- [iOS Platform](./ios.md)
- [Testing Guide](./testing.md)
- [Timeline](./timeline.md)
