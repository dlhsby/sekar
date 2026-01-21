# Phase 4 - Mobile Implementation Checklist

**Duration:** 5 days
**Prerequisites:** Phase 3 mobile deployed, backend Phase 4 complete

---

## Overview

Add QR code scanning capability and asset management screens to the mobile app for workers and supervisors.

---

## Timeline

| Day | Focus | Deliverables |
|-----|-------|--------------|
| Day 1 | QR Scanner Setup | Camera permissions, scanner screen |
| Day 2 | Asset Details | Asset info, history display |
| Day 3 | Asset Actions | Checkout, return workflows |
| Day 4 | Maintenance | Report maintenance issues |
| Day 5 | Testing & Polish | Integration tests, UX polish |

---

## New Screens

### QR Scanner Screen

**Path:** `src/screens/shared/QRScannerScreen.tsx`

```
+----------------------------------+
|  <  Scan Asset                   |
+----------------------------------+
|                                  |
|     +------------------------+   |
|     |                        |   |
|     |   [Camera Viewfinder]  |   |
|     |                        |   |
|     |      [  ]              |   |
|     |   Align QR code here   |   |
|     |                        |   |
|     +------------------------+   |
|                                  |
|   Point camera at asset QR code  |
|                                  |
|   [  Enter Code Manually  ]      |
|                                  |
|   Recent Scans:                  |
|   - ASSET-ABC123 (Cangkul)       |
|   - ASSET-DEF456 (Mesin Potong)  |
+----------------------------------+
```

**Features:**
- [ ] Camera viewfinder with QR overlay
- [ ] Auto-focus on QR code
- [ ] Torch/flashlight toggle
- [ ] Manual code entry option
- [ ] Recent scans history
- [ ] Vibration on successful scan
- [ ] Error handling for invalid codes
- [ ] Permission denied handling

### Asset Details Screen

**Path:** `src/screens/shared/AssetDetailsScreen.tsx`

```
+----------------------------------+
|  <  Asset Details                |
+----------------------------------+
|  +----------------------------+  |
|  |      [Asset Photo]         |  |
|  +----------------------------+  |
|                                  |
|  Cangkul Besi                    |
|  Code: ASSET-ABC123              |
|  Type: Hand Tool                 |
|                                  |
|  Status: [ Available ]           |
|  Condition: Good                 |
|                                  |
+----------------------------------+
|  Details                         |
+----------------------------------+
|  Brand:        Krisbow           |
|  Model:        KW-001            |
|  Serial:       SN-2024-0001      |
|  Location:     Taman Bungkul     |
+----------------------------------+
|  Assignment History              |
+----------------------------------+
|  Jan 10 - Ahmad (returned)       |
|  Jan 5 - Budi (returned)         |
|  Dec 28 - Stored                 |
+----------------------------------+
|  Maintenance History             |
+----------------------------------+
|  Jan 8 - Inspection (Completed)  |
|  Dec 15 - Sharpening (Completed) |
+----------------------------------+
|                                  |
| [  Checkout Asset  ] [  Report  ]|
+----------------------------------+
```

**Features:**
- [ ] Asset photo display
- [ ] Basic info section
- [ ] Status badge (Available/In Use/Maintenance)
- [ ] Condition indicator
- [ ] Expandable details section
- [ ] Assignment history list
- [ ] Maintenance history list
- [ ] Action buttons based on status

### Asset Checkout Screen

**Path:** `src/screens/worker/AssetCheckoutScreen.tsx`

```
+----------------------------------+
|  <  Checkout Asset               |
+----------------------------------+
|  Asset: Cangkul Besi             |
|  Code: ASSET-ABC123              |
+----------------------------------+
|                                  |
|  Condition Check                 |
|  +----------------------------+  |
|  | How is the asset condition?|  |
|  +----------------------------+  |
|  [Excellent] [Good] [Fair] [Poor]|
|                                  |
|  Notes (optional)                |
|  +----------------------------+  |
|  | Any damage or issues...    |  |
|  +----------------------------+  |
|                                  |
|  Take Photo (optional)           |
|  +--------+                      |
|  |  [+]   | Add photo            |
|  +--------+                      |
|                                  |
|  [ Confirm Checkout ]            |
+----------------------------------+
```

**Features:**
- [ ] Asset summary header
- [ ] Condition selector
- [ ] Notes text input
- [ ] Photo capture option
- [ ] Confirm button with loading state
- [ ] Success confirmation dialog

### Asset Return Screen

**Path:** `src/screens/worker/AssetReturnScreen.tsx`

```
+----------------------------------+
|  <  Return Asset                 |
+----------------------------------+
|  Asset: Cangkul Besi             |
|  Checked out: Jan 10, 2026       |
+----------------------------------+
|                                  |
|  Return Condition                |
|  [Excellent] [Good] [Fair] [Poor]|
|                                  |
|  Any issues to report?           |
|  +----------------------------+  |
|  | Describe any damage...     |  |
|  +----------------------------+  |
|                                  |
|  Photo of current condition      |
|  +--------+                      |
|  |  [+]   | Add photo            |
|  +--------+                      |
|                                  |
|  [ Confirm Return ]              |
+----------------------------------+
```

### Maintenance Report Screen

**Path:** `src/screens/shared/MaintenanceReportScreen.tsx`

```
+----------------------------------+
|  <  Report Maintenance Issue     |
+----------------------------------+
|  Asset: Mesin Potong Rumput      |
|  Code: ASSET-DEF456              |
+----------------------------------+
|                                  |
|  Issue Type                      |
|  [ Breakdown  ] [ Damage ]       |
|  [ Inspection ] [ Other  ]       |
|                                  |
|  Priority                        |
|  [ Low ] [ Medium ] [ High ]     |
|                                  |
|  Description *                   |
|  +----------------------------+  |
|  | Mesin tidak mau menyala    |  |
|  | setelah dipakai pagi ini...|  |
|  +----------------------------+  |
|                                  |
|  Photos                          |
|  +--------+ +--------+           |
|  | [img1] | | [+]    |           |
|  +--------+ +--------+           |
|                                  |
|  [ Submit Report ]               |
+----------------------------------+
```

**Features:**
- [ ] Issue type selector
- [ ] Priority selector
- [ ] Description text area
- [ ] Multiple photo upload
- [ ] Submit with validation
- [ ] Offline queue support

---

## New Components

### QR Scanner Component

```typescript
// src/components/scanner/QRScanner.tsx
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';

interface QRScannerProps {
  onScan: (code: string) => void;
  onError?: (error: Error) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onError }) => {
  const device = useCameraDevice('back');
  const [torch, setTorch] = useState(false);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (codes.length > 0) {
        Vibration.vibrate(100);
        onScan(codes[0].value);
      }
    },
  });

  if (!device) {
    return <NoCameraView />;
  }

  return (
    <View style={styles.container}>
      <Camera
        device={device}
        isActive={true}
        codeScanner={codeScanner}
        torch={torch ? 'on' : 'off'}
        style={StyleSheet.absoluteFill}
      />
      <QROverlay />
      <TorchButton onPress={() => setTorch(!torch)} />
    </View>
  );
};
```

### Asset Card Component

```typescript
// src/components/assets/AssetCard.tsx
interface AssetCardProps {
  asset: Asset;
  onPress: () => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({ asset, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Image source={{ uri: asset.photoUrl }} style={styles.photo} />
      <View style={styles.info}>
        <Text style={styles.name}>{asset.name}</Text>
        <Text style={styles.code}>{asset.assetCode}</Text>
        <StatusBadge status={asset.status} />
      </View>
      <ConditionIndicator condition={asset.condition} />
    </TouchableOpacity>
  );
};
```

### Status Badge Component

```typescript
// src/components/assets/StatusBadge.tsx
const statusColors = {
  available: '#4CAF50',
  in_use: '#2196F3',
  maintenance: '#FF9800',
  retired: '#9E9E9E',
  lost: '#F44336',
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const color = statusColors[status] || '#9E9E9E';
  const label = status.replace('_', ' ').toUpperCase();

  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
};
```

### Condition Selector Component

```typescript
// src/components/assets/ConditionSelector.tsx
interface ConditionSelectorProps {
  value: string;
  onChange: (condition: string) => void;
}

const conditions = [
  { value: 'excellent', label: 'Excellent', color: '#4CAF50' },
  { value: 'good', label: 'Good', color: '#8BC34A' },
  { value: 'fair', label: 'Fair', color: '#FFC107' },
  { value: 'poor', label: 'Poor', color: '#F44336' },
];

export const ConditionSelector: React.FC<ConditionSelectorProps> = ({
  value,
  onChange,
}) => {
  return (
    <View style={styles.container}>
      {conditions.map((condition) => (
        <TouchableOpacity
          key={condition.value}
          style={[
            styles.option,
            value === condition.value && styles.selected,
            { borderColor: condition.color },
          ]}
          onPress={() => onChange(condition.value)}
        >
          <Text style={styles.label}>{condition.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};
```

---

## Component Structure

```
src/components/
├── scanner/
│   ├── QRScanner.tsx
│   ├── QROverlay.tsx
│   ├── ManualCodeInput.tsx
│   └── RecentScans.tsx
├── assets/
│   ├── AssetCard.tsx
│   ├── AssetList.tsx
│   ├── StatusBadge.tsx
│   ├── ConditionIndicator.tsx
│   ├── ConditionSelector.tsx
│   ├── AssetPhoto.tsx
│   ├── AssignmentHistory.tsx
│   └── MaintenanceHistory.tsx
└── maintenance/
    ├── IssueTypeSelector.tsx
    ├── PrioritySelector.tsx
    └── MaintenanceCard.tsx
```

---

## API Integration

### Assets API Service

```typescript
// src/services/api/assetsApi.ts
import { apiClient } from './apiClient';

export const assetsApi = {
  getAssetByCode: (code: string) =>
    apiClient.get(`/assets/by-code/${code}`),

  getAssetDetails: (id: string) =>
    apiClient.get(`/assets/${id}`),

  getAssetHistory: (id: string) =>
    apiClient.get(`/assets/${id}/history`),

  getAssetMaintenance: (id: string) =>
    apiClient.get(`/assets/${id}/maintenance`),

  checkoutAsset: (id: string, data: CheckoutData) =>
    apiClient.post(`/assets/${id}/assign`, data),

  returnAsset: (id: string, data: ReturnData) =>
    apiClient.post(`/assets/${id}/return`, data),

  getMyAssets: () =>
    apiClient.get('/assets', { params: { assigned_to_me: true } }),
};
```

### Maintenance API Service

```typescript
// src/services/api/maintenanceApi.ts
export const maintenanceApi = {
  reportIssue: (data: MaintenanceReport) =>
    apiClient.post('/maintenance', data),

  getAssetMaintenance: (assetId: string) =>
    apiClient.get('/maintenance', { params: { asset_id: assetId } }),
};
```

---

## Redux State

```typescript
// src/store/slices/assetsSlice.ts
interface AssetsState {
  currentAsset: Asset | null;
  myAssets: Asset[];
  recentScans: string[];
  isLoading: boolean;
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
      state.recentScans = [
        action.payload,
        ...state.recentScans.filter((s) => s !== action.payload).slice(0, 9),
      ];
    },
    clearCurrentAsset: (state) => {
      state.currentAsset = null;
    },
  },
  extraReducers: (builder) => {
    // Async thunks for API calls
  },
});
```

---

## Navigation Updates

### Add to Worker Navigator

```typescript
// src/navigation/WorkerNavigator.tsx
<Stack.Screen name="QRScanner" component={QRScannerScreen} />
<Stack.Screen name="AssetDetails" component={AssetDetailsScreen} />
<Stack.Screen name="AssetCheckout" component={AssetCheckoutScreen} />
<Stack.Screen name="AssetReturn" component={AssetReturnScreen} />
<Stack.Screen name="MaintenanceReport" component={MaintenanceReportScreen} />
<Stack.Screen name="MyAssets" component={MyAssetsScreen} />
```

### Add Scan Button to Home

```typescript
// Add floating action button or toolbar button
<FAB
  icon="qr-code-scanner"
  onPress={() => navigation.navigate('QRScanner')}
  style={styles.fab}
/>
```

---

## Implementation Checklist

### Day 1: QR Scanner Setup

- [ ] Install react-native-vision-camera
- [ ] Configure camera permissions (Android)
- [ ] Configure camera permissions (iOS)
- [ ] QRScanner component
- [ ] QROverlay component
- [ ] QRScannerScreen
- [ ] Manual code input option
- [ ] Recent scans storage
- [ ] Navigation from home screen

### Day 2: Asset Details

- [ ] AssetDetailsScreen
- [ ] AssetCard component
- [ ] StatusBadge component
- [ ] ConditionIndicator component
- [ ] Assignment history display
- [ ] Maintenance history display
- [ ] Asset photo display
- [ ] API integration

### Day 3: Asset Actions

- [ ] AssetCheckoutScreen
- [ ] AssetReturnScreen
- [ ] ConditionSelector component
- [ ] Photo capture for condition
- [ ] Checkout API integration
- [ ] Return API integration
- [ ] Success/error handling
- [ ] MyAssetsScreen (list of checked out)

### Day 4: Maintenance Reporting

- [ ] MaintenanceReportScreen
- [ ] IssueTypeSelector component
- [ ] PrioritySelector component
- [ ] Multi-photo upload
- [ ] Maintenance API integration
- [ ] Offline queue support
- [ ] Success confirmation

### Day 5: Testing & Polish

- [ ] Unit tests for components
- [ ] Integration tests
- [ ] QR scanning edge cases
- [ ] Camera permission flows
- [ ] Loading states
- [ ] Error handling
- [ ] UI polish

---

## Dependencies

```bash
npm install react-native-vision-camera
# OR
npm install react-native-camera-kit

# For additional features
npm install react-native-image-picker  # Already installed
npm install react-native-fs            # File handling
```

---

## Permissions Configuration

### Android (android/app/src/main/AndroidManifest.xml)

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="true" />
```

### iOS (ios/Sekar/Info.plist)

```xml
<key>NSCameraUsageDescription</key>
<string>SEKAR needs camera access to scan asset QR codes</string>
```

---

## Testing Requirements

| Component | Tests |
|-----------|-------|
| QRScanner | Scan detection, error handling |
| AssetDetailsScreen | Data display, history |
| AssetCheckoutScreen | Form validation, submission |
| AssetReturnScreen | Form validation, submission |
| MaintenanceReportScreen | Form validation, offline queue |

---

## Success Criteria

1. Camera opens with QR viewfinder
2. QR codes detected and parsed correctly
3. Asset details display after scan
4. Workers can checkout/return assets
5. Condition tracked on checkout/return
6. Maintenance issues can be reported
7. Recent scans stored locally
8. Works offline (queues operations)

---

**Last Updated:** 2026-01-16
