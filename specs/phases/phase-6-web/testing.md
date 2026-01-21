# Phase 6 - Full Web Dashboard: Testing Plan

---

## Overview

This document outlines testing requirements for CRUD operations, bulk import/export, report builder, scheduled reports, system settings, and audit logging.

---

## Test Coverage Requirements

| Module | Target Coverage | Priority |
|--------|-----------------|----------|
| User Management | >80% | High |
| Area Management | >80% | High |
| Asset Management | >80% | High |
| Bulk Operations | >80% | High |
| Report Builder | >80% | High |
| Scheduled Reports | >80% | High |
| System Settings | >80% | Medium |
| Audit Logging | >80% | High |
| Web Components | >70% | Medium |

---

## Backend Unit Tests

### Audit Service Tests

```typescript
describe('AuditService', () => {
  describe('log', () => {
    it('should create audit log entry');
    it('should capture user ID');
    it('should capture IP address');
    it('should capture user agent');
    it('should store old value for updates');
    it('should store new value');
    it('should calculate changed fields');
  });

  describe('findAll', () => {
    it('should return paginated logs');
    it('should filter by user');
    it('should filter by action');
    it('should filter by entity type');
    it('should filter by date range');
    it('should search by entity name');
    it('should order by created_at desc');
  });

  describe('export', () => {
    it('should export to CSV');
    it('should apply filters');
    it('should include all columns');
  });
});

describe('AuditInterceptor', () => {
  it('should intercept POST requests');
  it('should intercept PATCH requests');
  it('should intercept DELETE requests');
  it('should not intercept GET requests');
  it('should extract entity type from path');
  it('should call AuditService.log');
});
```

### Settings Service Tests

```typescript
describe('SettingsService', () => {
  describe('findAll', () => {
    it('should return all settings');
    it('should group by category');
    it('should cast values by type');
  });

  describe('findOne', () => {
    it('should return single setting');
    it('should throw NotFoundException for invalid key');
  });

  describe('update', () => {
    it('should update single setting');
    it('should update multiple settings');
    it('should validate value type');
    it('should record updated_by');
    it('should trigger audit log');
  });

  describe('reset', () => {
    it('should reset to default values');
    it('should trigger audit log');
  });
});
```

### Report Scheduler Tests

```typescript
describe('ReportSchedulerService', () => {
  describe('create', () => {
    it('should create scheduled report');
    it('should validate cron expression');
    it('should validate email recipients');
    it('should schedule cron job');
    it('should calculate next run time');
  });

  describe('runSchedule', () => {
    it('should generate report');
    it('should send email with attachment');
    it('should update last run timestamp');
    it('should update next run timestamp');
    it('should handle generation errors');
    it('should handle email errors');
    it('should log run status');
  });

  describe('update', () => {
    it('should update schedule');
    it('should reschedule cron job');
    it('should update next run time');
  });

  describe('delete', () => {
    it('should delete schedule');
    it('should cancel cron job');
  });

  describe('enable/disable', () => {
    it('should enable schedule');
    it('should disable schedule');
    it('should start/stop cron job');
  });
});
```

### Bulk Import Tests

```typescript
describe('BulkImportService', () => {
  describe('importUsers', () => {
    it('should parse CSV file');
    it('should validate required fields');
    it('should validate role values');
    it('should check for duplicate usernames');
    it('should create users in batch');
    it('should return success count');
    it('should return error details');
    it('should rollback on critical error');
  });

  describe('importAreas', () => {
    it('should parse CSV file');
    it('should validate coordinates');
    it('should validate area type');
    it('should create areas in batch');
  });

  describe('importAssets', () => {
    it('should parse CSV file');
    it('should validate asset type');
    it('should generate asset codes');
    it('should create assets in batch');
  });

  describe('validation', () => {
    it('should detect invalid CSV format');
    it('should detect missing columns');
    it('should detect invalid data types');
    it('should provide row-level errors');
  });
});
```

### Email Service Tests

```typescript
describe('EmailService', () => {
  describe('sendEmail', () => {
    it('should send email via SMTP');
    it('should use configured from address');
    it('should handle multiple recipients');
    it('should attach files');
    it('should retry on failure');
    it('should log delivery status');
  });

  describe('sendReportEmail', () => {
    it('should use report email template');
    it('should attach report file');
    it('should include report name in subject');
    it('should handle multiple recipients');
  });
});
```

---

## Web Component Tests

### User Management Tests

```typescript
describe('UsersListPage', () => {
  it('should load and display users');
  it('should filter by role');
  it('should filter by area');
  it('should filter by status');
  it('should search by name');
  it('should sort columns');
  it('should paginate results');
  it('should open add modal');
  it('should open edit modal');
  it('should confirm delete');
});

describe('AddUserModal', () => {
  it('should render form fields');
  it('should validate required fields');
  it('should validate username format');
  it('should validate phone format');
  it('should submit form');
  it('should show error messages');
  it('should close on success');
});

describe('UserDetailPage', () => {
  it('should load user data');
  it('should display profile');
  it('should show shift history');
  it('should show report history');
  it('should allow editing');
  it('should allow password reset');
});
```

### Area Management Tests

```typescript
describe('AreasListPage', () => {
  it('should load and display areas');
  it('should switch between list and map view');
  it('should filter by type');
  it('should search by name');
});

describe('AreaMapEditor', () => {
  it('should render Leaflet map');
  it('should place marker on click');
  it('should update coordinates');
  it('should adjust radius with slider');
  it('should show circle boundary');
  it('should save location');
});

describe('AddAreaModal', () => {
  it('should render form with map');
  it('should validate required fields');
  it('should validate coordinates');
  it('should submit form');
});
```

### Bulk Operations Tests

```typescript
describe('CSVImporter', () => {
  it('should render drop zone');
  it('should accept CSV files');
  it('should reject non-CSV files');
  it('should show preview');
  it('should show import progress');
  it('should show results');
  it('should show errors');
});

describe('BulkImportPage', () => {
  it('should select entity type');
  it('should download template');
  it('should upload file');
  it('should show validation errors');
  it('should complete import');
});

describe('BulkExportPage', () => {
  it('should select entity');
  it('should select format');
  it('should apply filters');
  it('should download file');
});
```

### Report Builder Tests

```typescript
describe('ReportBuilderPage', () => {
  it('should select report type');
  it('should set date range');
  it('should configure filters');
  it('should select columns');
  it('should reorder columns');
  it('should show preview');
  it('should generate PDF');
  it('should generate CSV');
  it('should generate Excel');
  it('should save as template');
});

describe('ColumnSelector', () => {
  it('should list available columns');
  it('should toggle column selection');
  it('should drag to reorder');
  it('should update parent state');
});

describe('ReportPreview', () => {
  it('should display preview data');
  it('should update on filter change');
  it('should show loading state');
});
```

### Scheduled Reports Tests

```typescript
describe('ScheduledReportsPage', () => {
  it('should load schedules');
  it('should display schedules table');
  it('should show next run time');
  it('should toggle enable/disable');
  it('should run now');
  it('should open create modal');
  it('should open edit modal');
  it('should confirm delete');
});

describe('CreateScheduleModal', () => {
  it('should render form');
  it('should select report type');
  it('should configure cron');
  it('should add recipients');
  it('should validate email format');
  it('should submit form');
});

describe('CronBuilder', () => {
  it('should render preset options');
  it('should allow custom cron');
  it('should validate cron expression');
  it('should show human-readable description');
});
```

### System Settings Tests

```typescript
describe('SettingsPage', () => {
  it('should load settings');
  it('should group by category');
  it('should display setting values');
  it('should edit settings');
  it('should validate inputs');
  it('should save changes');
  it('should reset to defaults');
});

describe('SettingInput', () => {
  it('should render number input for numeric');
  it('should render toggle for boolean');
  it('should render text input for string');
  it('should validate based on type');
});
```

### Audit Log Tests

```typescript
describe('AuditLogPage', () => {
  it('should load audit logs');
  it('should filter by user');
  it('should filter by action');
  it('should filter by entity');
  it('should filter by date');
  it('should search');
  it('should paginate');
  it('should open detail modal');
  it('should export to CSV');
});

describe('ChangeDiffModal', () => {
  it('should display audit log details');
  it('should show before/after for updates');
  it('should show new value for creates');
  it('should show old value for deletes');
  it('should format JSON nicely');
});
```

---

## Integration Tests

### CRUD Flow Tests

```typescript
describe('User CRUD Integration', () => {
  it('should create user → list → edit → delete');
  it('should log all actions in audit');
});

describe('Area CRUD Integration', () => {
  it('should create area with map → list → edit → delete');
  it('should log all actions in audit');
});
```

### Report Flow Tests

```typescript
describe('Report Builder Integration', () => {
  it('should build → preview → generate → download');
  it('should save as template → load template');
});

describe('Scheduled Report Integration', () => {
  it('should create → wait → verify email sent');
  it('should run now → verify email sent');
});
```

### Bulk Operations Tests

```typescript
describe('Bulk Import Integration', () => {
  it('should upload CSV → validate → import → verify data');
  it('should handle partial failures');
});

describe('Bulk Export Integration', () => {
  it('should select → filter → export → verify file');
});
```

---

## E2E Tests (Playwright)

```typescript
describe('Admin Dashboard E2E', () => {
  test('should login as admin');
  test('should navigate to users');
  test('should create new user');
  test('should edit user');
  test('should delete user');
  test('should import users from CSV');
  test('should export users to CSV');
});

describe('Report Builder E2E', () => {
  test('should build attendance report');
  test('should download PDF');
  test('should schedule report');
  test('should receive email');
});

describe('Settings E2E', () => {
  test('should change GPS radius');
  test('should verify change in audit log');
});
```

---

## Performance Tests

```typescript
describe('Dashboard Performance', () => {
  it('users list should load in <2s for 1000 users');
  it('audit log should load in <2s for 10000 logs');
  it('bulk import should process 500 rows in <30s');
  it('report generation should complete in <30s');
});
```

---

## Acceptance Criteria

### User Management
- [ ] Admin can create users
- [ ] Admin can edit users
- [ ] Admin can delete users
- [ ] Admin can assign areas
- [ ] Admin can reset passwords
- [ ] All actions logged in audit

### Area Management
- [ ] Admin can create areas with map
- [ ] Admin can edit area boundaries
- [ ] Admin can delete areas
- [ ] Map editor works correctly
- [ ] All actions logged in audit

### Bulk Operations
- [ ] CSV import validates data
- [ ] CSV import shows errors clearly
- [ ] CSV export generates valid file
- [ ] Excel export generates valid file
- [ ] Templates are downloadable

### Report Builder
- [ ] All report types work
- [ ] Filters work correctly
- [ ] Column selection works
- [ ] Column ordering works
- [ ] PDF generation works
- [ ] CSV generation works
- [ ] Excel generation works

### Scheduled Reports
- [ ] Schedules can be created
- [ ] Schedules execute on time
- [ ] Emails are delivered
- [ ] Attachments are correct
- [ ] Run history is tracked

### System Settings
- [ ] Settings can be viewed
- [ ] Settings can be edited
- [ ] Validation works
- [ ] Reset works
- [ ] Changes are logged

### Audit Logging
- [ ] All mutations are logged
- [ ] Filters work correctly
- [ ] Change diff is accurate
- [ ] Export works
- [ ] Performance is acceptable

---

## Sign-Off

| Test Type | Tester | Date | Status |
|-----------|--------|------|--------|
| Backend Unit Tests | | | |
| Web Component Tests | | | |
| Integration Tests | | | |
| E2E Tests | | | |
| Performance Tests | | | |
| Cross-Browser Tests | | | |
| Responsive Tests | | | |
| UAT | | | |

---

**Last Updated:** 2026-01-16
