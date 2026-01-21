# Phase 4: Asset Management & Inventory

**Timeline:** Weeks 7-8
**Duration:** 2 weeks
**Status:** Planned

---

## Overview

Phase 4 adds asset and equipment management capabilities, including inventory tracking, maintenance scheduling, and QR code/NFC tag support.

---

## Goals

1. **Asset Registry** - Track tools, equipment, vehicles
2. **QR Code Scanning** - Mobile app scans asset QR codes
3. **Maintenance Scheduling** - Preventive maintenance tracking
4. **Asset Assignment** - Assign assets to workers/areas
5. **Maintenance Reports** - Link reports to assets

---

## Deliverables

### Backend (2 new modules)

1. **Assets Module**
   - Asset entity (tools, equipment, vehicles)
   - CRUD endpoints for asset management
   - Asset assignment to workers/areas
   - Asset status tracking (available, in-use, maintenance)

2. **Maintenance Module**
   - Maintenance schedule entity
   - Maintenance history
   - Preventive maintenance alerts
   - Link maintenance reports to assets

### Mobile (3 new screens)

1. **QR Scanner Screen** - Scan asset QR codes
2. **Asset Details Screen** - View asset info and history
3. **Maintenance Report Screen** - Submit maintenance reports

### Web (Asset Management)

1. **Assets List** - View all assets
2. **Asset Details** - Asset history and assignments
3. **Maintenance Schedule** - Calendar view of maintenance
4. **QR Code Generator** - Generate printable QR codes

---

## Technical Specifications

### Backend API Endpoints

```
Assets:
POST   /api/assets                     - Create asset
GET    /api/assets                     - List assets (filter by type, status)
GET    /api/assets/:id                 - Get asset details
PATCH  /api/assets/:id                 - Update asset
DELETE /api/assets/:id                 - Delete asset
POST   /api/assets/:id/assign          - Assign to worker/area
POST   /api/assets/:id/return          - Return asset
GET    /api/assets/:id/history         - Assignment history

Maintenance:
POST   /api/maintenance                - Create maintenance record
GET    /api/maintenance                - List maintenance (filter by asset, date)
GET    /api/maintenance/:id            - Get maintenance details
PATCH  /api/maintenance/:id            - Update maintenance
DELETE /api/maintenance/:id            - Delete maintenance
GET    /api/maintenance/schedule       - Upcoming maintenance
POST   /api/maintenance/:id/complete   - Mark maintenance complete
```

### Database Schema

**New table: assets**
```sql
CREATE TABLE assets (
  id UUID PRIMARY KEY,
  asset_code VARCHAR(50) UNIQUE NOT NULL,  -- QR code value
  name VARCHAR(100) NOT NULL,
  asset_type VARCHAR(50) NOT NULL,  -- tool, equipment, vehicle
  description TEXT,
  purchase_date DATE,
  warranty_expiry DATE,
  status VARCHAR(20) DEFAULT 'available',  -- available, in-use, maintenance, retired
  current_holder_id UUID REFERENCES users(id),  -- Currently assigned worker
  current_area_id UUID REFERENCES areas(id),  -- Currently assigned area
  photo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

**New table: asset_assignments**
```sql
CREATE TABLE asset_assignments (
  id UUID PRIMARY KEY,
  asset_id UUID REFERENCES assets(id),
  assigned_to_user UUID REFERENCES users(id),
  assigned_to_area UUID REFERENCES areas(id),
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  returned_at TIMESTAMP,
  notes TEXT
);
```

**New table: maintenance_records**
```sql
CREATE TABLE maintenance_records (
  id UUID PRIMARY KEY,
  asset_id UUID REFERENCES assets(id),
  maintenance_type VARCHAR(50) NOT NULL,  -- preventive, corrective, inspection
  scheduled_date DATE,
  completed_date DATE,
  performed_by UUID REFERENCES users(id),
  cost DECIMAL(10, 2),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'scheduled',  -- scheduled, in-progress, completed, cancelled
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### QR Code Integration

```typescript
// Mobile: QR Scanner
import { RNCamera } from 'react-native-camera';

const QRScannerScreen = () => {
  const onBarCodeRead = async (barcode: Barcode) => {
    const assetCode = barcode.data;

    // Fetch asset details from API
    const asset = await apiClient.get(`/assets?asset_code=${assetCode}`);

    navigation.navigate('AssetDetails', { assetId: asset.id });
  };

  return (
    <RNCamera
      onBarCodeRead={onBarCodeRead}
      barCodeTypes={[RNCamera.Constants.BarCodeType.qr]}
    />
  );
};

// Web: QR Code Generator
import QRCode from 'qrcode';

const generateQRCode = async (assetCode: string) => {
  const qrDataUrl = await QRCode.toDataURL(assetCode, {
    width: 300,
    margin: 2,
  });

  return qrDataUrl;
};
```

---

## Task Breakdown

### Week 7: Backend + Mobile

#### Backend Developer (5 days)
- [ ] Day 1-2: Assets module (entities, DTOs, service, controller)
- [ ] Day 3: Asset assignment logic
- [ ] Day 4-5: Maintenance module
- [ ] Testing and documentation

#### Mobile Developer (5 days)
- [ ] Day 1: QR scanner integration
- [ ] Day 2: Asset details screen
- [ ] Day 3: Maintenance report screen
- [ ] Day 4: Asset assignment workflow
- [ ] Day 5: Testing

### Week 8: Web Dashboard

#### Web Developer (5 days)
- [ ] Day 1: Assets list page
- [ ] Day 2: Asset details page
- [ ] Day 3: QR code generator
- [ ] Day 4: Maintenance schedule calendar
- [ ] Day 5: Testing and polish

---

## Dependencies

- react-native-camera (QR scanning)
- qrcode library (QR generation)
- react-big-calendar (maintenance schedule)

---

## Acceptance Criteria

- [ ] Admin can create and manage assets
- [ ] Each asset has unique QR code
- [ ] Worker can scan QR to view asset details
- [ ] Asset assignment tracked with history
- [ ] Maintenance schedules can be created
- [ ] Preventive maintenance alerts sent 7 days before due
- [ ] Maintenance reports linked to assets
- [ ] QR codes printable from web dashboard

---

**Phase Owner:** Project Manager
**Last Updated:** 2026-01-16
**Prerequisites:** Phase 3 complete
