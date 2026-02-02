# Phase 4: Comprehensive Testing Guide

**Component:** Testing Strategy for All Phase 4 Features
**Scope:** Analytics, Assets, and iOS Platform
**Duration:** Integrated throughout 10-12 week timeline

---

## Overview

This document outlines testing requirements for Phase 4 features across backend, mobile, web, and iOS platforms. Testing is integrated throughout development with >80% backend coverage and >70% frontend coverage targets.

---

## Test Coverage Requirements

| Module | Target Coverage | Priority |
|--------|-----------------|----------|
| **Backend** |||
| Analytics Service | >80% | High |
| Report Builder | >80% | High |
| Assets Service | >80% | High |
| QR Code Service | >80% | High |
| Maintenance Service | >80% | High |
| Apple Auth Service | >80% | High |
| Fraud Detection | >80% | High |
| Attestation Service | >80% | Medium |
| **Mobile** |||
| QR Scanner | >70% | High |
| Asset Screens | >70% | Medium |
| Analytics Screens | >70% | Medium |
| Apple Sign-In | >70% | High |
| Siri Shortcuts | >70% | Medium |
| Biometric Auth | >70% | High |
| i18n | >70% | Medium |
| **Web** |||
| Analytics Pages | >70% | Medium |
| Asset Pages | >70% | Medium |
| Report Builder | >70% | Medium |
| QR Generator | >70% | Medium |
| Fraud Dashboard | >70% | Medium |

---

## Part A: Backend Unit Tests

### Analytics Module

```typescript
describe('AnalyticsService', () => {
  // Worker Analytics
  describe('getWorkerAnalytics', () => {
    it('should return worker performance metrics');
    it('should filter by date range');
    it('should filter by area');
    it('should calculate attendance rate correctly');
    it('should calculate reports per day correctly');
    it('should calculate task completion rate');
    it('should handle empty results');
    it('should return within 2 seconds for 500 workers');
  });

  // Area Analytics
  describe('getAreaAnalytics', () => {
    it('should return area metrics');
    it('should calculate coverage rate correctly');
    it('should determine condition trend');
    it('should identify peak hours');
    it('should filter by date range');
  });

  // Operational Analytics
  describe('getOperationalAnalytics', () => {
    it('should return daily/weekly/monthly hours');
    it('should return system usage stats');
    it('should aggregate data correctly');
  });

  // Dashboard Summary
  describe('getDashboardSummary', () => {
    it('should return aggregated KPIs');
    it('should return within 1 second');
  });
});
```

### Report Builder Module

```typescript
describe('ReportBuilderService', () => {
  // Template CRUD
  describe('templates', () => {
    it('should create template with valid config');
    it('should validate template config schema');
    it('should update existing template');
    it('should delete template');
    it('should list user templates');
  });

  // Report Generation
  describe('generate', () => {
    it('should generate PDF report');
    it('should generate CSV report');
    it('should generate Excel report');
    it('should upload to S3');
    it('should record in archive');
    it('should complete within 30 seconds');
  });
});

describe('PdfGenerator', () => {
  it('should generate valid PDF buffer');
  it('should render HTML template correctly');
  it('should include charts as images');
  it('should handle empty data');
});

describe('CsvGenerator', () => {
  it('should generate valid CSV string');
  it('should escape special characters');
  it('should handle null values');
  it('should include headers');
});

describe('ExcelGenerator', () => {
  it('should generate valid Excel buffer');
  it('should format headers');
  it('should apply styling');
  it('should handle large datasets');
});
```

### Scheduler Module

```typescript
describe('SchedulerService', () => {
  it('should execute daily report job');
  it('should execute weekly report job');
  it('should find templates by schedule');
  it('should send email with attachment');
  it('should update last_run_at');
  it('should log job execution');
  it('should handle job failures gracefully');
});

describe('EmailService', () => {
  it('should send email via SES');
  it('should attach PDF file');
  it('should handle multiple recipients');
  it('should use correct email template');
});
```

### Assets Module

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

### QR Code Service

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

### Maintenance Module

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

### Apple Auth Module

```typescript
describe('AppleAuthService', () => {
  describe('verifyAppleToken', () => {
    it('should verify valid Apple identity token');
    it('should throw UnauthorizedException for invalid token');
    it('should throw UnauthorizedException for expired token');
    it('should extract email from token');
    it('should handle private relay email');
  });

  describe('findOrCreateUser', () => {
    it('should return existing user with matching Apple ID');
    it('should link Apple ID to existing email user');
    it('should create new user if no match found');
    it('should store Apple user ID');
    it('should handle missing email (private relay)');
  });
});

describe('AuthController - Apple', () => {
  describe('POST /auth/apple', () => {
    it('should authenticate with valid Apple token');
    it('should return JWT tokens');
    it('should return 401 for invalid token');
  });

  describe('POST /auth/apple/link', () => {
    it('should link Apple ID to authenticated user');
    it('should fail if Apple ID already linked');
    it('should require authentication');
  });

  describe('DELETE /auth/apple/unlink', () => {
    it('should unlink Apple ID from user');
    it('should fail if no Apple ID linked');
    it('should require authentication');
  });
});
```

### Fraud Detection Module

```typescript
describe('FraudDetectionService', () => {
  describe('checkLocation', () => {
    it('should pass for valid location');
    it('should fail for mock location enabled');
    it('should fail for rooted device');
    it('should fail for emulator');
    it('should detect velocity anomaly');
    it('should handle first location (no previous)');
    it('should pass for reasonable travel speed');
  });

  describe('logFraudAttempt', () => {
    it('should create fraud log entry');
    it('should store device info');
    it('should store location data');
    it('should set status as detected');
  });

  describe('velocity check', () => {
    it('should calculate distance correctly');
    it('should calculate speed correctly');
    it('should flag speed > 50 m/s');
    it('should pass for normal walking speed');
    it('should pass for driving speed');
  });

  describe('getFraudStats', () => {
    it('should return counts by type');
    it('should return counts by status');
    it('should return unique user count');
    it('should filter by date range');
  });
});
```

### Attestation Service

```typescript
describe('AttestationService', () => {
  describe('generateChallenge', () => {
    it('should generate random challenge');
    it('should store challenge for user');
    it('should expire old challenges');
  });

  describe('verifyiOSAttestation', () => {
    it('should verify valid attestation');
    it('should reject invalid attestation');
    it('should validate challenge matches');
    it('should store device fingerprint on success');
  });

  describe('verifyAndroidSafetyNet', () => {
    it('should verify valid SafetyNet token');
    it('should reject invalid token');
    it('should check CTS profile match');
    it('should check basic integrity');
  });
});
```

---

## Part B: Mobile Unit Tests

### Analytics Screens

```typescript
describe('AnalyticsScreen (Worker)', () => {
  it('should render attendance rate');
  it('should render shift hours');
  it('should render reports count');
  it('should render task completion');
  it('should render trend chart');
  it('should change period');
  it('should refresh data');
});

describe('TeamAnalyticsScreen (Supervisor)', () => {
  it('should render team summary');
  it('should render leaderboard');
  it('should render coverage chart');
  it('should render condition pie chart');
});

describe('PerformanceCard', () => {
  it('should display weekly stats');
  it('should show trend indicators');
  it('should navigate to analytics');
});
```

### QR Scanner

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

### Asset Screens

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

### Asset Components

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

### Apple Sign-In

```typescript
describe('AppleAuthService (Mobile)', () => {
  describe('isAvailable', () => {
    it('should return true on iOS 13+');
    it('should return false on Android');
    it('should return false on iOS < 13');
  });

  describe('signIn', () => {
    it('should request login with email scope');
    it('should request login with name scope');
    it('should return identity token');
    it('should handle user cancellation');
    it('should handle authorization error');
  });

  describe('checkCredentialState', () => {
    it('should return authorized for valid user');
    it('should return revoked for revoked user');
    it('should return not found for invalid user');
  });
});

describe('AppleSignInButton', () => {
  it('should render on iOS');
  it('should not render on Android');
  it('should call onSuccess with response');
  it('should call onError on failure');
  it('should show loading state');
});
```

### Siri Shortcuts

```typescript
describe('SiriShortcuts', () => {
  describe('donateClockIn', () => {
    it('should donate shortcut with area name');
    it('should set suggested phrase');
    it('should be eligible for prediction');
  });

  describe('donateClockOut', () => {
    it('should donate clock out shortcut');
    it('should set correct user info');
  });

  describe('donateCreateReport', () => {
    it('should donate report shortcut');
    it('should be searchable');
  });

  describe('handleShortcutActivation', () => {
    it('should receive user info on activation');
    it('should parse action type');
    it('should parse area parameter');
  });

  describe('clearAll', () => {
    it('should clear all donated shortcuts');
  });
});

describe('DeepLinkHandler', () => {
  it('should navigate to ClockIn on clock_in action');
  it('should navigate to ClockOut on clock_out action');
  it('should navigate to CreateReport on create_report action');
  it('should pass area parameter to ClockIn');
});
```

### Biometric Auth

```typescript
describe('BiometricAuth', () => {
  describe('isAvailable', () => {
    it('should detect Face ID availability');
    it('should detect Touch ID availability');
    it('should detect Fingerprint availability');
    it('should return false if no biometric');
  });

  describe('getBiometryLabel', () => {
    it('should return "Face ID" for FaceID');
    it('should return "Touch ID" for TouchID');
    it('should return "Fingerprint" for Biometrics');
  });

  describe('promptBiometric', () => {
    it('should show biometric prompt');
    it('should return true on success');
    it('should return false on cancel');
    it('should return false on failure');
  });

  describe('enableBiometricLogin', () => {
    it('should store refresh token encrypted');
    it('should set enabled flag');
  });

  describe('disableBiometricLogin', () => {
    it('should remove stored token');
    it('should clear enabled flag');
    it('should delete biometric keys');
  });

  describe('biometricLogin', () => {
    it('should prompt for biometric');
    it('should return token on success');
    it('should return null on failure');
  });
});

describe('BiometricSettingsScreen', () => {
  it('should check biometric availability on mount');
  it('should show biometry type label');
  it('should show enable toggle');
  it('should prompt biometric when enabling');
  it('should disable without prompt');
  it('should show message if not available');
});
```

### Fraud Detection Mobile

```typescript
describe('FraudDetection (Mobile)', () => {
  describe('getDeviceInfo', () => {
    it('should return device ID');
    it('should return platform');
    it('should return OS version');
    it('should return device model');
    it('should return app version');
    it('should detect emulator');
  });

  describe('checkRooted', () => {
    it('should detect rooted Android');
    it('should detect jailbroken iOS');
    it('should return false for normal device');
  });

  describe('checkMockLocation', () => {
    it('should detect mock location on Android');
    it('should return false on iOS');
  });

  describe('validateLocationIntegrity', () => {
    it('should send location and device info');
    it('should return check result');
    it('should handle API errors');
  });
});

describe('Clock-in with Fraud Detection', () => {
  it('should call fraud check before clock-in');
  it('should block clock-in if check fails');
  it('should show warning message');
  it('should proceed if check passes');
});
```

### Internationalization

```typescript
describe('i18n Configuration', () => {
  it('should initialize with Indonesian as default');
  it('should load saved language preference');
  it('should have Indonesian translations');
  it('should have English translations');
});

describe('Translation Coverage', () => {
  it('should have all keys in Indonesian');
  it('should have all keys in English');
  it('should not have missing translations');
});

describe('LanguageSelector', () => {
  it('should display available languages');
  it('should highlight current language');
  it('should change language on selection');
  it('should persist selection');
  it('should sync with backend');
});

describe('useTranslation Hook', () => {
  it('should return translated string');
  it('should handle interpolation');
  it('should handle pluralization');
  it('should fallback to key if missing');
});

describe('Date/Number Formatting', () => {
  it('should format date in Indonesian locale');
  it('should format date in English locale');
  it('should format currency in Indonesian');
  it('should format numbers correctly');
});
```

---

## Part C: Web Dashboard Tests

### Analytics Pages

```typescript
describe('LineChart', () => {
  it('should render with data');
  it('should show tooltip on hover');
  it('should handle empty data');
  it('should be responsive');
});

describe('BarChart', () => {
  it('should render bars for each data point');
  it('should show values on hover');
  it('should handle large datasets');
});

describe('PieChart', () => {
  it('should render pie segments');
  it('should show legend');
  it('should display percentages');
});

describe('WorkerAnalyticsPage', () => {
  it('should load worker data');
  it('should filter by date range');
  it('should filter by area');
  it('should sort table columns');
  it('should paginate results');
  it('should export to CSV');
});

describe('ReportBuilderPage', () => {
  it('should render report type options');
  it('should update preview on config change');
  it('should save template');
  it('should generate PDF');
  it('should download file');
});
```

### Asset Pages

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

### QR Generator

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

### Maintenance Calendar

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

### Fraud Dashboard

```typescript
describe('FraudDashboardPage', () => {
  it('should load fraud statistics');
  it('should display stats cards');
  it('should load fraud logs');
  it('should filter by date range');
  it('should filter by type');
  it('should filter by status');
  it('should search by user');
  it('should paginate results');
});

describe('FraudStatsCards', () => {
  it('should display total alerts');
  it('should display mock location count');
  it('should display velocity anomaly count');
  it('should display device tampering count');
});

describe('FraudLogTable', () => {
  it('should display fraud logs');
  it('should format timestamp');
  it('should show user name');
  it('should show fraud type badge');
  it('should show status badge');
  it('should open detail on row click');
});

describe('FraudDetailModal', () => {
  it('should display fraud details');
  it('should display user info');
  it('should display device info');
  it('should display location info');
  it('should allow status update');
  it('should allow admin notes');
  it('should save changes');
});

describe('FraudTypeBadge', () => {
  it('should render mock_location in red');
  it('should render velocity_anomaly in orange');
  it('should render device_tampering in purple');
});
```

### Device Management

```typescript
describe('DeviceManagementPage', () => {
  it('should load devices');
  it('should filter by user');
  it('should filter by platform');
  it('should filter by trust status');
});

describe('DeviceCard', () => {
  it('should display device info');
  it('should show platform icon');
  it('should show trust status');
  it('should toggle trust on switch');
  it('should remove on button click');
});

describe('AttestationHistoryTable', () => {
  it('should display attestation results');
  it('should show passed/failed status');
  it('should format timestamp');
});
```

---

## Part D: Performance Tests

### Analytics Performance

```typescript
describe('Analytics Performance', () => {
  // Setup: Seed database with production-like data
  // - 500 workers
  // - 50 areas
  // - 1 million location pings
  // - 100K reports

  it('worker analytics should return in <2s', async () => {
    const start = Date.now();
    await analyticsService.getWorkerAnalytics({
      start_date: '2025-12-01',
      end_date: '2025-12-31',
    });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
  });

  it('area analytics should return in <2s', async () => {
    const start = Date.now();
    await analyticsService.getAreaAnalytics({
      start_date: '2025-12-01',
      end_date: '2025-12-31',
    });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
  });

  it('dashboard should return in <1s', async () => {
    const start = Date.now();
    await analyticsService.getDashboardSummary();
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000);
  });
});
```

### Report Generation Performance

```typescript
describe('Report Generation Performance', () => {
  it('PDF report should generate in <30s', async () => {
    const start = Date.now();
    await reportService.generate({
      type: 'attendance',
      format: 'pdf',
      date_range: { start: '2025-12-01', end: '2025-12-31' },
    });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(30000);
  });

  it('CSV export should handle 10K rows in <5s', async () => {
    const start = Date.now();
    await reportService.generate({
      type: 'attendance',
      format: 'csv',
      date_range: { start: '2025-01-01', end: '2025-12-31' },
    });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
  });
});
```

### Assets Performance

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

### Mobile Performance

```typescript
describe('Mobile Performance', () => {
  it('app launch should be < 3 seconds');
  it('Apple Sign-In should complete < 5 seconds');
  it('biometric prompt should appear < 500ms');
  it('language switch should be < 1 second');
  it('fraud check should complete < 2 seconds');
});
```

---

## Part E: Integration Tests

### Analytics Integration

```typescript
describe('Analytics Integration', () => {
  it('should fetch and display worker analytics');
  it('should update charts on filter change');
  it('should generate and download report');
});
```

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

### Apple Sign-In Flow

```typescript
describe('Apple Sign-In Integration', () => {
  it('should sign in new user with Apple');
  it('should sign in existing user with Apple');
  it('should link Apple ID to existing account');
  it('should unlink Apple ID');
  it('should handle token refresh');
});
```

### Biometric Login Flow

```typescript
describe('Biometric Login Integration', () => {
  it('should enable biometric after password login');
  it('should login with biometric on subsequent launch');
  it('should fallback to password on biometric failure');
  it('should disable biometric from settings');
});
```

### Fraud Detection Flow

```typescript
describe('Fraud Detection Integration', () => {
  it('should block clock-in with mock location');
  it('should allow clock-in with valid location');
  it('should log fraud attempt to backend');
  it('should display fraud in admin dashboard');
  it('should update fraud status from admin');
});
```

---

## Part F: iOS-Specific Testing

### iOS Build Tests

```typescript
describe('iOS Build', () => {
  it('should build on iOS simulator');
  it('should build on physical device');
  it('should have valid bundle identifier');
  it('should have required Info.plist permissions');
  it('should have background modes configured');
});
```

### Device Testing Matrix

| Device | iOS Version | Tests |
|--------|-------------|-------|
| iPhone 14 Pro | iOS 16+ | Face ID, Apple Sign-In |
| iPhone SE (3rd) | iOS 15+ | Touch ID, Apple Sign-In |
| iPhone 8 | iOS 15 | Touch ID |
| iPad Pro | iPadOS 16+ | Face ID, multitasking |

### Feature Matrix

| Feature | Test Scenarios |
|---------|---------------|
| Apple Sign-In | New user, existing user, link, unlink |
| Siri Shortcuts | Donate, activate, clear |
| Face ID | Enable, login, cancel, fail |
| Touch ID | Enable, login, cancel, fail |
| Background Location | App backgrounded, terminated |
| Push Notifications | Foreground, background, tap |

---

## Test Data

### Seed Data for Performance Testing

```sql
-- Generate 500 workers
INSERT INTO users (username, full_name, role, ...)
SELECT
  'worker' || generate_series,
  'Worker ' || generate_series,
  'Worker',
  ...
FROM generate_series(1, 500);

-- Generate 1 year of shifts (approx 100K records)
INSERT INTO shifts (worker_id, clock_in_time, clock_out_time, ...)
SELECT
  (random() * 500 + 1)::int,
  date '2025-01-01' + (random() * 365)::int + time '08:00:00',
  date '2025-01-01' + (random() * 365)::int + time '16:00:00',
  ...
FROM generate_series(1, 100000);

-- Generate 100K reports
INSERT INTO work_reports (submitted_by, area_id, condition, ...)
SELECT
  (random() * 500 + 1)::int,
  (random() * 50 + 1)::int,
  (ARRAY['Baik', 'Cukup', 'Buruk'])[floor(random() * 3 + 1)],
  ...
FROM generate_series(1, 100000);
```

### Seed Data for Assets Testing

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

### Analytics Features
- [ ] Worker analytics shows accurate metrics
- [ ] Area analytics shows accurate metrics
- [ ] Dashboard summary loads quickly (<1s)
- [ ] All queries return within 2 seconds
- [ ] Data matches expected calculations
- [ ] PDF reports generate correctly
- [ ] CSV exports are valid
- [ ] Excel exports are valid
- [ ] Templates can be saved and loaded
- [ ] Reports can be scheduled
- [ ] Daily reports sent at scheduled time
- [ ] Weekly reports sent at scheduled time
- [ ] Charts render with real data
- [ ] Filters work correctly
- [ ] Export downloads work
- [ ] Backend tests pass with >80% coverage
- [ ] Web tests pass with >70% coverage
- [ ] Mobile tests pass with >70% coverage

### Asset Management
- [ ] Assets can be created with auto-generated QR codes
- [ ] QR codes scannable by mobile app
- [ ] Assets can be assigned to workers
- [ ] Assignment history is tracked
- [ ] Assets can be returned with condition notes
- [ ] Workers can view their assigned assets
- [ ] Supervisors can view all assets
- [ ] Maintenance can be scheduled
- [ ] Maintenance workflow (start → complete) works
- [ ] Upcoming maintenance visible on calendar
- [ ] Overdue maintenance highlighted
- [ ] Workers can report maintenance issues
- [ ] Photos can be attached to reports
- [ ] QR codes generated on asset creation
- [ ] QR codes stored in S3
- [ ] Bulk QR generation works
- [ ] QR codes printable from web
- [ ] Mobile scanner detects QR codes
- [ ] Manual code entry works as fallback
- [ ] Assets list displays with filters
- [ ] Asset details show history
- [ ] QR codes can be printed in bulk
- [ ] Calendar shows maintenance schedule
- [ ] Checkout/return flow works
- [ ] Offline queue functions correctly
- [ ] Backend tests pass with >80% coverage
- [ ] Web tests pass with >70% coverage
- [ ] Mobile tests pass with >70% coverage

### iOS Platform
- [ ] App builds on Xcode without errors
- [ ] App runs on iOS simulator
- [ ] App runs on physical iOS device
- [ ] All permissions work correctly
- [ ] Background location works
- [ ] New user can sign in with Apple
- [ ] Existing user can sign in with Apple
- [ ] Apple ID can be linked to account
- [ ] Apple ID can be unlinked
- [ ] Private email relay works
- [ ] Clock-in shortcut activates
- [ ] Clock-out shortcut activates
- [ ] Report shortcut activates
- [ ] Shortcuts appear in Shortcuts app
- [ ] Face ID login works
- [ ] Touch ID login works
- [ ] Can enable biometric from settings
- [ ] Can disable biometric from settings
- [ ] Fallback to password works
- [ ] Mock location detected
- [ ] Velocity anomaly detected
- [ ] Fraud logged to backend
- [ ] Admin dashboard shows logs
- [ ] Admin can review/dismiss
- [ ] Indonesian translations complete
- [ ] English translations complete
- [ ] Language switch works
- [ ] Preference persists
- [ ] Dates formatted correctly
- [ ] Backend tests pass with >80% coverage
- [ ] Mobile tests pass with >70% coverage
- [ ] Web tests pass with >70% coverage

---

## Related Documentation

- [Backend Implementation](./backend.md)
- [Mobile Implementation](./mobile.md)
- [Web Implementation](./web.md)
- [iOS Platform](./ios.md)
- [Timeline](./timeline.md)

---

**Last Updated:** 2026-01-30
