# Phase 6: Advanced Web Dashboard & Operations

**Timeline:** Weeks 11-12
**Duration:** 2 weeks
**Status:** Planned
**Prerequisites:** Phase 2-5 complete

---

## Overview

Phase 6 extends the web dashboard (built in Phase 2) with advanced reporting, bulk operations, audit logging, and system configuration capabilities. This phase focuses on operational efficiency and compliance features for administrators.

---

## Scope Changes from Original Plan

> **Note:** Basic web dashboard CRUD features have been moved to Phase 2 to enable earlier availability of the admin interface. Phase 6 now focuses exclusively on advanced operational features.

### Features Moved to Phase 2:
- User Management CRUD (create, read, update, delete)
- Area Management CRUD with map editor
- Rayon Management CRUD
- KMZ Import for area boundaries
- Worker Scheduling interface
- Real-time monitoring dashboard
- Basic authentication and role-based access

### Features Remaining in Phase 6:
- Advanced Reporting & Report Builder
- Scheduled Report Delivery (Email)
- Bulk Operations (CSV import/export)
- Audit Logging System
- System Settings Configuration
- Asset Management CRUD (if not in Phase 4)

---

## Goals

1. **Advanced Reporting** - Custom report builder with flexible filters and aggregations
2. **Scheduled Reports** - Automated report generation and email delivery
3. **Bulk Operations** - CSV import/export for users, areas, assets
4. **Audit Logging** - Track all administrative actions for compliance
5. **System Configuration** - Centralized settings management

---

## Deliverables

### Web Dashboard Extensions

| Feature | Description | Priority |
|---------|-------------|----------|
| Report Builder | Custom report generator with filters | High |
| Scheduled Reports | Cron-based report generation + email | High |
| Audit Log Viewer | Searchable admin action history | High |
| Bulk User Import | CSV upload for creating multiple users | Medium |
| Bulk Data Export | Export data to CSV/PDF/Excel | Medium |
| System Settings | Configuration panel for admins | Medium |

### Backend Modules

| Module | Description | Endpoints |
|--------|-------------|-----------|
| Audit Logging | Track all mutations | 2 endpoints |
| Report Scheduler | Scheduled report generation | 4 endpoints |
| Email Service | Email notifications and reports | Internal service |
| Bulk Operations | Batch create/update/delete | 6 endpoints |
| System Settings | Key-value configuration | 2 endpoints |

---

## Technical Specifications

### Backend API Endpoints

#### Bulk Operations

```
POST   /api/v1/users/bulk/import       - Import users from CSV
POST   /api/v1/users/bulk/export       - Export users to CSV
PATCH  /api/v1/users/bulk              - Bulk update users
DELETE /api/v1/users/bulk              - Bulk delete users (soft delete)

POST   /api/v1/areas/bulk/import       - Import areas from CSV
POST   /api/v1/areas/bulk/export       - Export areas to CSV
```

#### Report Builder & Scheduler

```
POST   /api/v1/reports/builder         - Generate custom report
GET    /api/v1/reports/builder/types   - List available report types
GET    /api/v1/reports/builder/fields  - Get fields for report type

POST   /api/v1/reports/scheduled       - Create scheduled report
GET    /api/v1/reports/scheduled       - List scheduled reports
PATCH  /api/v1/reports/scheduled/:id   - Update scheduled report
DELETE /api/v1/reports/scheduled/:id   - Delete scheduled report
POST   /api/v1/reports/scheduled/:id/run - Manually run scheduled report
```

#### Audit Logging

```
GET    /api/v1/audit-logs              - List audit logs (paginated, filterable)
GET    /api/v1/audit-logs/:id          - Get audit log details
GET    /api/v1/audit-logs/export       - Export audit logs to CSV
```

#### System Settings

```
GET    /api/v1/settings                - Get all settings (admin only)
PATCH  /api/v1/settings                - Update settings (admin only)
GET    /api/v1/settings/:key           - Get specific setting
```

---

### Database Schema

#### audit_logs Table

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,           -- 'create', 'update', 'delete', 'login', 'logout'
  entity_type VARCHAR(50) NOT NULL,      -- 'user', 'area', 'rayon', 'schedule', 'report', 'task'
  entity_id UUID,
  old_value JSONB,                       -- State before change (null for create)
  new_value JSONB,                       -- State after change (null for delete)
  ip_address VARCHAR(45),                -- IPv4 or IPv6
  user_agent TEXT,
  metadata JSONB,                        -- Additional context
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

#### scheduled_reports Table

```sql
CREATE TABLE scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  report_type VARCHAR(50) NOT NULL,      -- 'attendance', 'work_reports', 'performance', 'area_status'
  filters JSONB NOT NULL DEFAULT '{}',   -- Report parameters
  output_format VARCHAR(20) DEFAULT 'csv', -- 'csv', 'pdf', 'excel'
  schedule_cron VARCHAR(100) NOT NULL,   -- Cron expression
  timezone VARCHAR(50) DEFAULT 'Asia/Jakarta',
  email_recipients TEXT[] NOT NULL,
  email_subject VARCHAR(200),
  include_empty BOOLEAN DEFAULT FALSE,   -- Send even if no data
  created_by UUID REFERENCES users(id) NOT NULL,
  last_run_at TIMESTAMP,
  last_run_status VARCHAR(20),           -- 'success', 'failed', 'no_data'
  next_run_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_scheduled_reports_next_run ON scheduled_reports(next_run_at) WHERE is_active = true;
CREATE INDEX idx_scheduled_reports_creator ON scheduled_reports(created_by);
```

#### system_settings Table

```sql
CREATE TABLE system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  value_type VARCHAR(20) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
  category VARCHAR(50),                    -- 'attendance', 'gps', 'report', 'notification'
  description TEXT,
  is_sensitive BOOLEAN DEFAULT FALSE,      -- Hide value in API responses
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Default settings
INSERT INTO system_settings (key, value, value_type, category, description) VALUES
  ('attendance.grace_period_minutes', '15', 'number', 'attendance', 'Grace period for late clock-in (minutes)'),
  ('attendance.early_clockout_minutes', '5', 'number', 'attendance', 'Minimum shift duration before clock-out allowed'),
  ('gps.validation_radius_meters', '100', 'number', 'gps', 'Maximum distance from area center for valid GPS'),
  ('gps.tracking_interval_seconds', '300', 'number', 'gps', 'Background location tracking interval'),
  ('report.photo_max_count', '5', 'number', 'report', 'Maximum photos per work report'),
  ('report.photo_max_size_mb', '5', 'number', 'report', 'Maximum photo file size in MB'),
  ('shift.max_duration_hours', '12', 'number', 'attendance', 'Maximum shift duration before auto clock-out'),
  ('notification.admin_email', 'admin@dlh.surabaya.go.id', 'string', 'notification', 'System notification email'),
  ('notification.alert_understaffed', 'true', 'boolean', 'notification', 'Send alert when area is understaffed'),
  ('system.maintenance_mode', 'false', 'boolean', 'system', 'Enable maintenance mode');
```

---

## Web Dashboard Features

### 1. Report Builder

```
┌─────────────────────────────────────────────────────────────────────┐
│ REPORT BUILDER                                          [Generate]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Report Type: [Attendance Report      ▼]                           │
│                                                                     │
│  Date Range:  [2026-01-01] to [2026-01-31]                         │
│                                                                     │
│  Filters:                                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Rayon:     [All Rayons           ▼]                         │   │
│  │ Area:      [All Areas            ▼]                         │   │
│  │ Shift:     [All Shifts           ▼]                         │   │
│  │ Worker:    [All Workers          ▼]                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Output Format: (●) CSV  ( ) PDF  ( ) Excel                        │
│                                                                     │
│  Columns:                                                           │
│  [✓] Date  [✓] Worker Name  [✓] Area  [✓] Clock In  [✓] Clock Out │
│  [✓] Hours Worked  [ ] GPS Coordinates  [✓] Reports Submitted      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Report Types:**
| Type | Description | Key Metrics |
|------|-------------|-------------|
| Attendance Report | Worker clock-in/out data | Hours worked, punctuality |
| Work Reports Summary | Submitted reports by worker/area | Report count, activity types |
| Area Performance | Area-level metrics | Staff coverage, report density |
| Task Completion | Task status and completion rates | Completion %, turnaround time |
| GPS Tracking | Location data analysis | Distance traveled, boundary violations |

### 2. Scheduled Reports

```
┌─────────────────────────────────────────────────────────────────────┐
│ SCHEDULED REPORTS                                   [+ Create New]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ Weekly Attendance Summary                              [Edit] │ │
│  │ Every Monday at 08:00 → admin@dlh.surabaya.go.id            │ │
│  │ Last run: 2026-01-20 08:00 (Success)                        │ │
│  │ Next run: 2026-01-27 08:00                      [●] Active   │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ Daily Area Status                                      [Edit] │ │
│  │ Daily at 18:00 → kepala.bidang@dlh.surabaya.go.id           │ │
│  │ Last run: 2026-01-23 18:00 (Success)                        │ │
│  │ Next run: 2026-01-24 18:00                      [●] Active   │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Schedule Options:**
- Daily (specific time)
- Weekly (day of week + time)
- Monthly (day of month + time)
- Custom cron expression

### 3. Audit Log Viewer

```
┌─────────────────────────────────────────────────────────────────────┐
│ AUDIT LOG                                              [Export CSV] │
├─────────────────────────────────────────────────────────────────────┤
│ Filter: [User ▼] [Action ▼] [Entity ▼] [Date Range] [Search...]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  │ Timestamp           │ User         │ Action  │ Entity    │ ID  │ │
│  ├─────────────────────┼──────────────┼─────────┼───────────┼─────┤ │
│  │ 2026-01-24 10:30:15 │ admin        │ UPDATE  │ user      │ ... │ │
│  │ 2026-01-24 10:28:42 │ admin        │ CREATE  │ schedule  │ ... │ │
│  │ 2026-01-24 10:15:08 │ kepalaselatan│ UPDATE  │ task      │ ... │ │
│  │ 2026-01-24 09:45:33 │ admin        │ DELETE  │ user      │ ... │ │
│  │ 2026-01-24 09:30:00 │ koordinator1 │ CREATE  │ task      │ ... │ │
│                                                                     │
│  [< Prev]  Page 1 of 42  [Next >]                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Audit Detail Modal:**
```
┌────────────────────────────────────────────────────────────────┐
│ AUDIT DETAIL                                              [×]  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Timestamp: 2026-01-24 10:30:15 WIB                           │
│  User: admin (System Administrator)                            │
│  Action: UPDATE                                                │
│  Entity: user (f634880a-7498-449a-a293-9c5204176300)          │
│  IP Address: 192.168.1.100                                     │
│                                                                │
│  Changes:                                                      │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Field        │ Old Value      │ New Value                │ │
│  ├──────────────┼────────────────┼──────────────────────────┤ │
│  │ is_active    │ true           │ false                    │ │
│  │ updated_at   │ 2026-01-20...  │ 2026-01-24...           │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 4. Bulk Operations

#### CSV Import Template
```csv
username,full_name,phone,role,rayon_code,area_name
worker10,Budi Santoso,081234567800,Worker,SELATAN,Taman Bungkul
worker11,Dewi Lestari,081234567801,Worker,SELATAN,Taman Harmoni
linmas5,Ahmad Fauzi,081234567802,Linmas,PUSAT,Jalan Raya Darmo
```

#### Import Interface
```
┌─────────────────────────────────────────────────────────────────────┐
│ BULK USER IMPORT                                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Download template: [Download CSV Template]                      │
│                                                                     │
│  2. Upload filled CSV:                                              │
│     ┌───────────────────────────────────────────────────────────┐  │
│     │  📁 Drop CSV file here or [Browse]                        │  │
│     └───────────────────────────────────────────────────────────┘  │
│                                                                     │
│  3. Preview & Validate:                                             │
│     ┌───────────────────────────────────────────────────────────┐  │
│     │ Row │ Status   │ Username │ Name         │ Error          │  │
│     ├─────┼──────────┼──────────┼──────────────┼────────────────┤  │
│     │ 1   │ ✓ Valid  │ worker10 │ Budi Santoso │                │  │
│     │ 2   │ ✓ Valid  │ worker11 │ Dewi Lestari │                │  │
│     │ 3   │ ✗ Error  │ linmas5  │ Ahmad Fauzi  │ Area not found │  │
│     └───────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Valid: 2 | Errors: 1 | Total: 3                                   │
│                                                                     │
│  [Cancel]                        [Import 2 Valid Records]          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5. System Settings

```
┌─────────────────────────────────────────────────────────────────────┐
│ SYSTEM SETTINGS                                            [Save]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ATTENDANCE                                                         │
│  ───────────────────────────────────────────────────────────────── │
│  Grace period for late clock-in:     [15    ] minutes              │
│  Minimum shift duration:             [5     ] minutes              │
│  Maximum shift duration:             [12    ] hours                │
│                                                                     │
│  GPS TRACKING                                                       │
│  ───────────────────────────────────────────────────────────────── │
│  Validation radius:                  [100   ] meters               │
│  Background tracking interval:       [300   ] seconds              │
│                                                                     │
│  REPORTS                                                            │
│  ───────────────────────────────────────────────────────────────── │
│  Maximum photos per report:          [5     ]                      │
│  Maximum photo size:                 [5     ] MB                   │
│                                                                     │
│  NOTIFICATIONS                                                      │
│  ───────────────────────────────────────────────────────────────── │
│  Admin notification email:           [admin@dlh.surabaya.go.id   ] │
│  Alert on understaffed areas:        [✓] Enabled                   │
│                                                                     │
│  SYSTEM                                                             │
│  ───────────────────────────────────────────────────────────────── │
│  Maintenance mode:                   [ ] Disabled                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Checklist

### Week 11: Bulk Operations & Audit Logging

#### Backend Developer

- [ ] Create AuditLog entity and repository
- [ ] Implement audit logging interceptor
- [ ] Create BulkOperations module
  - [ ] CSV parser service
  - [ ] Bulk user import endpoint
  - [ ] Bulk user export endpoint
  - [ ] Validation and error handling
- [ ] Create SystemSettings module
  - [ ] Entity and CRUD operations
  - [ ] Default settings migration

#### Web Developer

- [ ] Create Audit Log page
  - [ ] Log table with pagination
  - [ ] Filter controls
  - [ ] Detail modal with diff view
  - [ ] CSV export
- [ ] Create Bulk Import page
  - [ ] File upload component
  - [ ] Preview table
  - [ ] Validation display
  - [ ] Import progress indicator

### Week 12: Reports & Configuration

#### Backend Developer

- [ ] Create ReportBuilder service
  - [ ] Report type registry
  - [ ] Dynamic query builder
  - [ ] CSV/PDF/Excel generators
- [ ] Create ReportScheduler module
  - [ ] Scheduled report entity
  - [ ] Cron job runner
  - [ ] Email service integration
- [ ] Write comprehensive tests

#### Web Developer

- [ ] Create Report Builder page
  - [ ] Report type selector
  - [ ] Filter builder component
  - [ ] Column selector
  - [ ] Preview and download
- [ ] Create Scheduled Reports page
  - [ ] Report list
  - [ ] Create/edit modal
  - [ ] Schedule configuration
  - [ ] Status indicators
- [ ] Create System Settings page
  - [ ] Categorized settings form
  - [ ] Validation
  - [ ] Save confirmation

---

## Dependencies

```json
{
  "backend": {
    "nodemailer": "^6.9.0",      // Email sending
    "node-cron": "^3.0.0",       // Scheduled tasks
    "csv-parser": "^3.0.0",      // CSV parsing
    "json2csv": "^6.0.0",        // CSV generation
    "pdfkit": "^0.14.0",         // PDF generation
    "exceljs": "^4.4.0"          // Excel generation
  },
  "frontend": {
    "react-dropzone": "^14.0.0", // File upload
    "papaparse": "^5.4.0",       // CSV parsing (client)
    "react-diff-viewer": "^3.0.0" // Diff visualization
  }
}
```

---

## Success Criteria

- [ ] Custom reports can be generated with flexible filters
- [ ] Reports can be exported to CSV, PDF, and Excel formats
- [ ] Scheduled reports are delivered via email on time
- [ ] Bulk import successfully creates users with validation
- [ ] All admin actions are logged in audit trail
- [ ] Audit logs are searchable and exportable
- [ ] System settings can be configured without code changes
- [ ] All features follow Neo Brutalism design system
- [ ] Test coverage >80% for new modules

---

## Security Considerations

1. **Audit Log Integrity**
   - Audit logs cannot be modified or deleted (append-only)
   - Sensitive data (passwords) never logged
   - IP address and user agent captured

2. **Bulk Operations**
   - File size limits enforced
   - Malformed CSV handled gracefully
   - Transaction rollback on partial failures

3. **Scheduled Reports**
   - Email recipients validated
   - Report data access follows role permissions
   - Sensitive data can be excluded

4. **System Settings**
   - Changes require admin role
   - All changes audited
   - Sensitive settings (API keys) masked in UI

---

## Related Documents

- [Phase 2 Web Dashboard](../phase-2-enhanced/web.md) - Base CRUD features
- [Neo Brutalism Design System](../../ui-ux/neo-brutalism.md) - UI guidelines
- [API Contracts](../../api/contracts.md) - API specifications
- [Database Schema](../../database/schema.md) - Table definitions

---

**Phase Owner:** Project Manager
**Last Updated:** 2026-01-24
**Status:** Planned
**Prerequisites:** Phase 2-5 complete, Email server configured
