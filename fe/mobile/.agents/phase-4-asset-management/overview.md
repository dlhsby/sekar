# Phase 4 - Asset Management (Mobile)

## 🎯 Objectives

Add QR code scanning and asset management screens for workers.

**Duration:** 5 days  
**Prerequisites:** Phase 3 deployed, backend Phase 4 complete

---

## 📅 Timeline

| Day | Focus | Screens |
|-----|-------|---------|
| Day 1 | QR Scanner | Camera, scanning, validation |
| Day 2 | Asset Screens | List, detail, search |
| Day 3 | Inspections | Inspection form, submission |
| Day 4 | Maintenance | View tasks, complete tasks |
| Day 5 | Integration | Link reports to assets, testing |

---

## 📱 New Screens

### 1. QR Scanner Screen

```
┌─────────────────────────────────┐
│ ←  Scan Asset                   │
├─────────────────────────────────┤
│                                 │
│    ┌───────────────────────┐    │
│    │                       │    │
│    │    [Camera View]      │    │
│    │                       │    │
│    │    ┌───────────┐      │    │
│    │    │  QR Frame │      │    │
│    │    └───────────┘      │    │
│    │                       │    │
│    └───────────────────────┘    │
│                                 │
│    Point camera at QR code      │
│                                 │
│    [🔦 Flashlight]              │
│                                 │
└─────────────────────────────────┘
```

### 2. Asset Detail Screen

```
┌─────────────────────────────────┐
│ ←  Asset Detail                 │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ [Asset Photo]               │ │
│ └─────────────────────────────┘ │
│                                 │
│ TBK-BENCH-001                   │
│ Wooden Bench #1                 │
│                                 │
│ Type: Bench                     │
│ Area: Taman Bungkul             │
│ Condition: Good                 │
│ Last Inspection: Jan 5, 2026    │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ [Mini map with pin]         │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌──────────┐  ┌──────────────┐  │
│ │ INSPECT  │  │ REPORT ISSUE │  │
│ └──────────┘  └──────────────┘  │
└─────────────────────────────────┘
```

### 3. Asset Inspection Form

```
┌─────────────────────────────────┐
│ ←  Inspect Asset                │
├─────────────────────────────────┤
│ Asset: Wooden Bench #1          │
├─────────────────────────────────┤
│ Condition Rating:               │
│ ┌─────┐┌─────┐┌─────┐┌─────┐   │
│ │ 😊  ││ 🙂  ││ 😐  ││ 😟  │   │
│ │Excel││Good ││Fair ││Poor │   │
│ └─────┘└─────┘└─────┘└─────┘   │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ [Photo of current state]    │ │
│ │      📷 Take Photo          │ │
│ └─────────────────────────────┘ │
│                                 │
│ Notes:                          │
│ ┌─────────────────────────────┐ │
│ │ Any issues observed...      │ │
│ └─────────────────────────────┘ │
│                                 │
│ Issues Found:                   │
│ ☐ Paint peeling                 │
│ ☐ Structural damage             │
│ ☐ Missing parts                 │
│ ☐ Vandalism                     │
│                                 │
│ [      SUBMIT INSPECTION     ]  │
└─────────────────────────────────┘
```

### 4. Asset List Screen

```
┌─────────────────────────────────┐
│ ≡  Assets            🔍 Search │
├─────────────────────────────────┤
│ Filter: [All Types ▼]           │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ [img] TBK-BENCH-001         │ │
│ │       Wooden Bench #1       │ │
│ │       Condition: Good  ✓    │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ [img] TBK-FOUNT-001         │ │
│ │       Main Fountain         │ │
│ │       Condition: Fair  ⚠    │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ [img] TBK-TREE-001          │ │
│ │       Oak Tree #1           │ │
│ │       Condition: Good  ✓    │ │
│ └─────────────────────────────┘ │
│                                 │
│ [     🔲 SCAN QR CODE      ]    │
└─────────────────────────────────┘
```

---

## 🔧 QR Scanner Implementation

### Dependencies

```bash
npm install react-native-camera-kit
# or
npm install react-native-vision-camera
npm install vision-camera-code-scanner
```

### QR Scanner Component

```typescript
// src/components/QRScanner.tsx
import { Camera, CameraType } from 'react-native-camera-kit';
import { useState } from 'react';

export const QRScanner: React.FC<{ onScan: (code: string) => void }> = ({ onScan }) => {
  const [scanned, setScanned] = useState(false);

  const handleScan = (event: { nativeEvent: { codeStringValue: string } }) => {
    if (!scanned) {
      setScanned(true);
      onScan(event.nativeEvent.codeStringValue);
    }
  };

  return (
    <Camera
      style={{ flex: 1 }}
      cameraType={CameraType.Back}
      scanBarcode={true}
      onReadCode={handleScan}
      showFrame={true}
      frameColor="#2E7D32"
    />
  );
};
```

### QR Validation Flow

```typescript
// src/screens/worker/QRScannerScreen.tsx
const handleQRScan = async (code: string) => {
  try {
    // Validate QR with backend
    const asset = await assetsApi.getByQR(code);
    navigation.navigate('AssetDetail', { assetId: asset.id });
  } catch (error) {
    Alert.alert('Invalid QR', 'This QR code is not recognized');
  }
};
```

---

## 🏗️ New Components

```
src/
├── screens/
│   └── worker/
│       ├── QRScannerScreen.tsx
│       ├── AssetListScreen.tsx
│       ├── AssetDetailScreen.tsx
│       ├── AssetInspectionScreen.tsx
│       └── MaintenanceTaskScreen.tsx
├── components/
│   ├── assets/
│   │   ├── AssetCard.tsx
│   │   ├── ConditionBadge.tsx
│   │   └── InspectionForm.tsx
│   └── scanner/
│       └── QRScanner.tsx
└── services/
    └── api/
        └── assetsApi.ts
```

---

## 🔌 API Integration

```typescript
// src/services/api/assetsApi.ts
export const assetsApi = {
  getAll: (filters: AssetFilters) => apiClient.get('/assets', { params: filters }),
  getById: (id: number) => apiClient.get(`/assets/${id}`),
  getByQR: (code: string) => apiClient.get(`/assets/by-qr/${code}`),
  
  createInspection: (assetId: number, data: InspectionDto) => 
    apiClient.post('/inspections', { asset_id: assetId, ...data }),
  
  getMaintenanceTasks: () => apiClient.get('/maintenance'),
  completeMaintenanceTask: (id: number, data: CompleteMaintenanceDto) =>
    apiClient.post(`/maintenance/${id}/complete`, data),
};
```

---

## ✅ Success Criteria

1. ✅ QR scanner works reliably
2. ✅ Assets display correctly
3. ✅ Inspections can be submitted
4. ✅ Photos included in inspections
5. ✅ Maintenance tasks visible
6. ✅ Link reports to assets
7. ✅ Offline asset data cached

---

*Last Updated: January 2026*

