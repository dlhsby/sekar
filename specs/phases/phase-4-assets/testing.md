# Phase 4 - Asset Management: Testing Plan

---

## Overview

This document outlines testing requirements for asset management, QR code functionality, and maintenance scheduling across backend, mobile, and web components.

---

## Test Coverage Requirements

| Module | Target Coverage | Priority |
|--------|-----------------|----------|
| Assets Service | >80% | High |
| Assets Controller | >80% | High |
| QR Code Service | >80% | High |
| Maintenance Service | >80% | High |
| Maintenance Controller | >80% | High |
| Mobile QR Scanner | >70% | High |
| Mobile Asset Screens | >70% | Medium |
| Web Asset Pages | >70% | Medium |
| Web Calendar | >70% | Medium |

---

## Backend Unit Tests

### Assets Service Tests

```typescript
describe('AssetsService', () => {
  describe('create', () => {
    it('should create asset with auto-generated code');
    it('should create asset with custom code');
    it('should generate QR code on creation');
    it('should upload QR to S3');
    it('should validate unique asset code');
    it('should validate asset type exists');
    it('should set initial status as available');
  });

  describe('findAll', () => {
    it('should return paginated assets');
    it('should filter by asset type');
    it('should filter by status');
    it('should filter by area');
    it('should filter by assigned user');
    it('should search by name');
    it('should search by asset code');
    it('should sort by any column');
  });

  describe('findOne', () => {
    it('should return asset with relations');
    it('should throw NotFoundException for invalid id');
  });

  describe('findByCode', () => {
    it('should return asset by QR code value');
    it('should throw NotFoundException for invalid code');
  });

  describe('update', () => {
    it('should update asset fields');
    it('should not update asset code');
    it('should validate asset type on update');
  });

  describe('remove', () => {
    it('should soft delete asset');
    it('should not delete asset in use');
  });

  describe('assignAsset', () => {
    it('should assign to user');
    it('should assign to area');
    it('should update asset status to in_use');
    it('should create assignment record');
    it('should record condition on assign');
    it('should fail if asset not available');
    it('should fail if already assigned');
  });

  describe('returnAsset', () => {
    it('should return asset');
    it('should update status to available');
    it('should update assignment record');
    it('should record condition on return');
    it('should fail if not assigned');
    it('should fail if wrong user returning');
  });

  describe('getAssignmentHistory', () => {
    it('should return all assignments for asset');
    it('should order by assigned_at desc');
    it('should include user and area details');
  });
});
```

### Assets Controller Tests

```typescript
describe('AssetsController', () => {
  describe('POST /assets', () => {
    it('should create asset (Admin)');
    it('should reject creation (Worker)');
    it('should validate required fields');
    it('should return created asset with QR URL');
  });

  describe('GET /assets', () => {
    it('should return paginated list');
    it('should apply filters');
    it('should apply search');
  });

  describe('GET /assets/:id', () => {
    it('should return asset details');
    it('should return 404 for invalid id');
  });

  describe('GET /assets/by-code/:code', () => {
    it('should return asset by code');
    it('should return 404 for invalid code');
  });

  describe('PATCH /assets/:id', () => {
    it('should update asset (Admin)');
    it('should update asset (Supervisor)');
    it('should reject update (Worker)');
  });

  describe('DELETE /assets/:id', () => {
    it('should soft delete asset (Admin)');
    it('should reject deletion if in use');
  });

  describe('POST /assets/:id/assign', () => {
    it('should assign asset');
    it('should validate assignment data');
  });

  describe('POST /assets/:id/return', () => {
    it('should return asset');
    it('should validate return data');
  });

  describe('POST /assets/generate-qr-batch', () => {
    it('should generate QR for multiple assets');
    it('should return QR URLs');
  });
});
```

### QR Code Service Tests

```typescript
describe('QrCodeService', () => {
  describe('generateQrCode', () => {
    it('should generate PNG buffer');
    it('should upload to S3');
    it('should return S3 URL');
    it('should use error correction level H');
  });

  describe('generateQrCodeDataUrl', () => {
    it('should return base64 data URL');
    it('should be valid PNG data URL');
  });

  describe('generateBulkQrCodes', () => {
    it('should generate multiple QR codes');
    it('should return map of code to URL');
    it('should handle partial failures');
  });

  describe('generateAssetCode', () => {
    it('should generate unique code');
    it('should match expected format');
    it('should be URL safe');
  });
});
```

### Maintenance Service Tests

```typescript
describe('MaintenanceService', () => {
  describe('create', () => {
    it('should create maintenance record');
    it('should validate asset exists');
    it('should set initial status as scheduled');
    it('should calculate priority');
  });

  describe('findAll', () => {
    it('should return paginated records');
    it('should filter by asset');
    it('should filter by status');
    it('should filter by date range');
    it('should filter by type');
  });

  describe('startMaintenance', () => {
    it('should update status to in_progress');
    it('should record who started');
    it('should update asset status to maintenance');
    it('should fail if not scheduled');
  });

  describe('completeMaintenance', () => {
    it('should update status to completed');
    it('should record completion date');
    it('should record actual cost');
    it('should update asset status to available');
    it('should fail if not in_progress');
  });

  describe('getUpcoming', () => {
    it('should return scheduled in next 7 days');
    it('should order by scheduled_date asc');
    it('should include asset details');
  });

  describe('getOverdue', () => {
    it('should return past due scheduled records');
    it('should order by days overdue desc');
    it('should update status to overdue');
  });

  describe('getCalendarData', () => {
    it('should return events for month');
    it('should format for calendar display');
    it('should include status colors');
  });
});
```

---

## Mobile Tests

### QR Scanner Tests

```typescript
describe('QRScanner', () => {
  it('should render camera viewfinder');
  it('should call onScan when QR detected');
  it('should vibrate on successful scan');
  it('should handle permission denied');
  it('should toggle torch on button press');
  it('should show overlay with guide');
});

describe('QRScannerScreen', () => {
  it('should show scanner on mount');
  it('should navigate to asset details on scan');
  it('should show error for invalid QR');
  it('should show manual entry option');
  it('should display recent scans');
  it('should store scan in recent history');
});

describe('ManualCodeInput', () => {
  it('should accept asset code input');
  it('should validate code format');
  it('should lookup asset on submit');
  it('should show error for not found');
});
```

### Asset Screens Tests

```typescript
describe('AssetDetailsScreen', () => {
  it('should load asset on mount');
  it('should display asset photo');
  it('should display asset info');
  it('should show status badge');
  it('should show condition indicator');
  it('should display assignment history');
  it('should display maintenance history');
  it('should show checkout button if available');
  it('should show return button if assigned to user');
  it('should show report button');
});

describe('AssetCheckoutScreen', () => {
  it('should display asset summary');
  it('should require condition selection');
  it('should accept optional notes');
  it('should allow photo capture');
  it('should call checkout API on confirm');
  it('should show success message');
  it('should handle API errors');
  it('should queue offline if no connection');
});

describe('AssetReturnScreen', () => {
  it('should display asset and checkout info');
  it('should require condition selection');
  it('should accept return notes');
  it('should call return API on confirm');
  it('should navigate back on success');
});

describe('MaintenanceReportScreen', () => {
  it('should display asset info');
  it('should require issue type');
  it('should require priority');
  it('should require description');
  it('should allow multiple photos');
  it('should validate form before submit');
  it('should call maintenance API');
  it('should queue offline if no connection');
});

describe('MyAssetsScreen', () => {
  it('should load user assigned assets');
  it('should display asset cards');
  it('should navigate to details on tap');
  it('should show empty state');
  it('should pull to refresh');
});
```

### Component Tests

```typescript
describe('AssetCard', () => {
  it('should display asset photo');
  it('should display asset name');
  it('should display asset code');
  it('should show status badge');
  it('should call onPress');
});

describe('StatusBadge', () => {
  it('should render available in green');
  it('should render in_use in blue');
  it('should render maintenance in orange');
  it('should render retired in gray');
  it('should render lost in red');
});

describe('ConditionSelector', () => {
  it('should render all options');
  it('should highlight selected');
  it('should call onChange on selection');
});

describe('ConditionIndicator', () => {
  it('should show color for excellent');
  it('should show color for good');
  it('should show color for fair');
  it('should show color for poor');
});
```

---

## Web Tests

### Assets Page Tests

```typescript
describe('AssetsListPage', () => {
  it('should load and display assets');
  it('should filter by type');
  it('should filter by status');
  it('should filter by area');
  it('should search by name');
  it('should search by code');
  it('should sort columns');
  it('should paginate results');
  it('should select multiple items');
  it('should export to CSV');
  it('should navigate to add asset');
});

describe('AssetDetailsPage', () => {
  it('should load asset details');
  it('should display asset photo');
  it('should display QR code');
  it('should switch between tabs');
  it('should display assignment history');
  it('should display maintenance history');
  it('should open edit modal');
  it('should confirm delete');
});

describe('AddAssetPage', () => {
  it('should render form fields');
  it('should validate required fields');
  it('should submit form');
  it('should show success message');
  it('should handle errors');
});
```

### QR Generator Tests

```typescript
describe('QRGeneratorPage', () => {
  it('should load assets list');
  it('should select assets');
  it('should select all');
  it('should search assets');
  it('should generate QR preview');
  it('should change size option');
  it('should change layout option');
  it('should toggle include options');
});

describe('QRPrintTemplate', () => {
  it('should render QR codes');
  it('should apply size option');
  it('should apply layout option');
  it('should show/hide name');
  it('should show/hide code');
  it('should show/hide type');
});

describe('Print functionality', () => {
  it('should trigger print dialog');
  it('should render print preview');
  it('should generate PDF');
  it('should download PDF');
});
```

### Maintenance Calendar Tests

```typescript
describe('MaintenanceCalendarPage', () => {
  it('should load calendar events');
  it('should render events on calendar');
  it('should show event colors by status');
  it('should open detail on event click');
  it('should open create on date click');
  it('should navigate months');
});

describe('MaintenanceCalendar', () => {
  it('should render month view');
  it('should display events');
  it('should handle event click');
  it('should handle date click');
  it('should handle event drag');
});

describe('CreateMaintenanceModal', () => {
  it('should render form');
  it('should validate asset selection');
  it('should validate required fields');
  it('should submit maintenance');
  it('should close on success');
});

describe('MaintenanceDetailModal', () => {
  it('should display maintenance info');
  it('should show start button if scheduled');
  it('should show complete button if in_progress');
  it('should allow edit');
});

describe('UpcomingMaintenanceList', () => {
  it('should load upcoming items');
  it('should display as list');
  it('should show quick actions');
});

describe('OverdueMaintenanceList', () => {
  it('should load overdue items');
  it('should highlight overdue');
  it('should allow mark complete');
});
```

---

## Integration Tests

### QR Scanning Flow

```typescript
describe('QR Scanning Integration', () => {
  it('should scan QR → load asset → display details');
  it('should scan → checkout → update asset status');
  it('should scan → return → update asset status');
  it('should scan → report maintenance → create record');
  it('should handle invalid QR code gracefully');
});
```

### Asset Lifecycle Flow

```typescript
describe('Asset Lifecycle Integration', () => {
  it('should create asset with QR in S3');
  it('should assign → use → return cycle');
  it('should track condition through assignments');
  it('should schedule → perform → complete maintenance');
  it('should soft delete without losing history');
});
```

---

## Performance Tests

```typescript
describe('Assets Performance', () => {
  // Setup: 1000 assets, 5000 assignments, 10000 maintenance records

  it('assets list should return in <1s', async () => {
    const start = Date.now();
    await assetsService.findAll({ page: 1, limit: 20 });
    expect(Date.now() - start).toBeLessThan(1000);
  });

  it('asset history should return in <500ms', async () => {
    const start = Date.now();
    await assetsService.getAssignmentHistory(assetId);
    expect(Date.now() - start).toBeLessThan(500);
  });

  it('QR generation should complete in <2s', async () => {
    const start = Date.now();
    await qrCodeService.generateQrCode('TEST-CODE');
    expect(Date.now() - start).toBeLessThan(2000);
  });

  it('bulk QR generation (50) should complete in <30s', async () => {
    const codes = Array(50).fill(null).map((_, i) => `BULK-${i}`);
    const start = Date.now();
    await qrCodeService.generateBulkQrCodes(codes);
    expect(Date.now() - start).toBeLessThan(30000);
  });

  it('maintenance calendar should return in <1s', async () => {
    const start = Date.now();
    await maintenanceService.getCalendarData(new Date());
    expect(Date.now() - start).toBeLessThan(1000);
  });
});
```

---

## Test Data

### Seed Data for Testing

```sql
-- Asset types
INSERT INTO asset_types (name, description, default_maintenance_interval_days)
VALUES
  ('Hand Tool', 'Manual hand tools', 180),
  ('Power Tool', 'Electric/battery powered tools', 90),
  ('Vehicle', 'Transport vehicles', 30),
  ('Heavy Equipment', 'Large machinery', 30);

-- Sample assets
INSERT INTO assets (asset_code, name, asset_type_id, status, condition)
VALUES
  ('ASSET-TEST-001', 'Cangkul Test', 1, 'available', 'good'),
  ('ASSET-TEST-002', 'Mesin Potong Test', 2, 'available', 'excellent'),
  ('ASSET-TEST-003', 'Gerobak Test', 3, 'in_use', 'fair');
```

---

## Acceptance Criteria

### Asset Management
- [ ] Assets can be created with auto-generated QR codes
- [ ] QR codes scannable by mobile app
- [ ] Assets can be assigned to workers
- [ ] Assignment history is tracked
- [ ] Assets can be returned with condition notes
- [ ] Workers can view their assigned assets
- [ ] Supervisors can view all assets
- [ ] Tests pass with >80% backend coverage

### Maintenance
- [ ] Maintenance can be scheduled
- [ ] Maintenance workflow (start → complete) works
- [ ] Upcoming maintenance visible on calendar
- [ ] Overdue maintenance highlighted
- [ ] Workers can report maintenance issues
- [ ] Photos can be attached to reports
- [ ] Tests pass with >80% coverage

### QR Functionality
- [ ] QR codes generated on asset creation
- [ ] QR codes stored in S3
- [ ] Bulk QR generation works
- [ ] QR codes printable from web
- [ ] Mobile scanner detects QR codes
- [ ] Manual code entry works as fallback

### Web Dashboard
- [ ] Assets list displays with filters
- [ ] Asset details show history
- [ ] QR codes can be printed in bulk
- [ ] Calendar shows maintenance schedule
- [ ] Tests pass with >70% coverage

### Mobile App
- [ ] QR scanner opens camera
- [ ] Scanning navigates to asset details
- [ ] Checkout/return flow works
- [ ] Maintenance report submission works
- [ ] Offline queue functions correctly
- [ ] Tests pass with >70% coverage

---

## Sign-Off

| Test Type | Tester | Date | Status |
|-----------|--------|------|--------|
| Backend Unit Tests | | | |
| Backend E2E Tests | | | |
| Mobile Unit Tests | | | |
| Mobile Integration | | | |
| Web Unit Tests | | | |
| Web Integration | | | |
| QR Scanning E2E | | | |
| Performance Tests | | | |
| UAT | | | |

---

**Last Updated:** 2026-01-16
