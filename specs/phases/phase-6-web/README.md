# Phase 6: Full Web Dashboard

**Timeline:** Weeks 11-12
**Duration:** 2 weeks
**Status:** Planned

---

## Overview

Phase 6 completes the web dashboard with full CRUD capabilities, advanced reporting, bulk operations, and admin configuration tools.

---

## Goals

1. **Full CRUD Operations** - Create, edit, delete workers, areas, assets
2. **Advanced Reporting** - Custom reports, scheduled reports, email delivery
3. **Bulk Operations** - Bulk actions on workers, tasks, reports
4. **Admin Configuration** - System settings, user management
5. **Audit Logging** - Track all admin actions

---

## Deliverables

### Web (Complete Dashboard)

1. **User Management** - CRUD for workers, supervisors, admins
2. **Area Management** - CRUD for areas with map editor
3. **Asset Management** - CRUD for assets, QR code printing
4. **Report Builder** - Custom report generator
5. **System Settings** - Configuration panel
6. **Audit Log** - View all system changes

### Backend

1. **Audit Logging Module** - Track all mutations
2. **Report Scheduler** - Scheduled report generation
3. **Email Service** - Email notifications and reports
4. **Bulk Operations API** - Batch endpoints

---

## Technical Specifications

### Backend API Endpoints

```
User Management:
POST   /api/users/bulk                 - Create multiple users from CSV
PATCH  /api/users/bulk                 - Update multiple users
DELETE /api/users/bulk                 - Delete multiple users

Report Builder:
POST   /api/reports/custom             - Generate custom report
POST   /api/reports/schedule           - Schedule report email
GET    /api/reports/scheduled          - List scheduled reports
DELETE /api/reports/scheduled/:id      - Delete scheduled report

Audit Log:
GET    /api/audit-logs                 - List audit logs (filter by user, date, action)
GET    /api/audit-logs/:id             - Get audit log details

System Settings:
GET    /api/settings                   - Get all settings
PATCH  /api/settings                   - Update settings
```

### Database Schema

**New table: audit_logs**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,  -- create, update, delete
  entity_type VARCHAR(50) NOT NULL,  -- user, area, asset, report
  entity_id UUID,
  old_value JSONB,  -- State before change
  new_value JSONB,  -- State after change
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
```

**New table: scheduled_reports**
```sql
CREATE TABLE scheduled_reports (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  report_type VARCHAR(50) NOT NULL,  -- attendance, reports, performance
  filters JSONB,  -- Report parameters
  schedule_cron VARCHAR(100),  -- Cron expression
  email_recipients TEXT[],  -- Array of email addresses
  created_by UUID REFERENCES users(id),
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**New table: system_settings**
```sql
CREATE TABLE system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default settings
INSERT INTO system_settings (key, value, description) VALUES
('attendance_grace_period_minutes', '5', 'Grace period for late clock-in'),
('gps_validation_radius_meters', '100', 'Maximum distance from area center'),
('report_photo_max_count', '5', 'Maximum photos per report'),
('shift_max_duration_hours', '12', 'Maximum shift duration'),
('notification_email', 'admin@DLH.surabaya.go.id', 'System notification email');
```

---

## Web Features

### 1. User Management

**Create User Form:**
```tsx
const CreateUserForm = () => {
  return (
    <form onSubmit={handleSubmit}>
      <Input name="username" label="Username" required />
      <Input name="full_name" label="Nama Lengkap" required />
      <Input name="phone" label="No. HP" required />
      <Select name="role" label="Peran" options={['worker', 'supervisor', 'admin']} />
      <Select name="assigned_area_id" label="Area Tugas" options={areas} />
      <Input name="password" label="Password" type="password" required />
      <Button type="submit">Buat Pengguna</Button>
    </form>
  );
};
```

**Bulk Import CSV:**
```
username,full_name,phone,role,area_code
worker4,Dani Setiawan,081234567894,worker,TBK001
worker5,Eka Putri,081234567895,worker,TSY001
```

### 2. Area Management

**Map Editor:**
```tsx
const AreaMapEditor = () => {
  const [center, setCenter] = useState<[number, number]>([-7.2756, 112.7138]);
  const [radius, setRadius] = useState(100);

  return (
    <MapContainer center={center} zoom={15}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Circle
        center={center}
        radius={radius}
        pathOptions={{ color: 'green', fillColor: 'lightgreen', fillOpacity: 0.3 }}
        draggable
        onDragEnd={(e) => setCenter([e.target.getLatLng().lat, e.target.getLatLng().lng])}
      />
      <Slider
        label="Radius (meters)"
        value={radius}
        onChange={setRadius}
        min={50}
        max={500}
      />
    </MapContainer>
  );
};
```

### 3. Report Builder

```tsx
const ReportBuilder = () => {
  const [reportType, setReportType] = useState('attendance');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [filters, setFilters] = useState({});

  const generateReport = async () => {
    const report = await apiClient.post('/reports/custom', {
      type: reportType,
      date_range: dateRange,
      filters,
    });

    downloadCSV(report.data);
  };

  return (
    <div>
      <Select value={reportType} onChange={setReportType} options={reportTypes} />
      <DateRangePicker value={dateRange} onChange={setDateRange} />
      <FilterPanel filters={filters} onChange={setFilters} />
      <Button onClick={generateReport}>Generate Report</Button>
    </div>
  );
};
```

### 4. Audit Log

```tsx
const AuditLogTable = () => {
  const { data: logs, isLoading } = useAuditLogs();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Timestamp</TableHead>
          <TableHead>User</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Entity</TableHead>
          <TableHead>Details</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs?.map((log) => (
          <TableRow key={log.id}>
            <TableCell>{formatTimestamp(log.created_at)}</TableCell>
            <TableCell>{log.user?.full_name}</TableCell>
            <TableCell>
              <Badge variant={getActionBadgeVariant(log.action)}>{log.action}</Badge>
            </TableCell>
            <TableCell>{log.entity_type}</TableCell>
            <TableCell>
              <Button variant="ghost" onClick={() => showDiff(log.old_value, log.new_value)}>
                View Changes
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
```

---

## Task Breakdown

### Week 11: CRUD & Bulk Operations

#### Web Developer (5 days)
- [ ] Day 1: User management CRUD
- [ ] Day 2: Area management with map editor
- [ ] Day 3: Asset management CRUD
- [ ] Day 4: Bulk operations (CSV import/export)
- [ ] Day 5: Testing and polish

#### Backend Developer (3 days)
- [ ] Day 1: Audit logging middleware
- [ ] Day 2: Bulk operations endpoints
- [ ] Day 3: Email service integration

### Week 12: Reports & Configuration

#### Web Developer (5 days)
- [ ] Day 1: Report builder UI
- [ ] Day 2: Scheduled reports configuration
- [ ] Day 3: System settings page
- [ ] Day 4: Audit log viewer
- [ ] Day 5: Final testing and deployment

#### Backend Developer (2 days)
- [ ] Day 1: Report scheduler cron jobs
- [ ] Day 2: System settings API

---

## Acceptance Criteria

- [ ] Admin can create/edit/delete users
- [ ] Admin can create areas with map editor
- [ ] Bulk user import from CSV works
- [ ] Custom reports can be generated and exported
- [ ] Scheduled reports sent via email
- [ ] System settings configurable from UI
- [ ] All admin actions logged in audit log
- [ ] Audit log searchable and filterable
- [ ] Web dashboard fully responsive (desktop/tablet)

---

## Dependencies

- nodemailer (email service)
- node-cron (scheduled reports)
- csv-parser (CSV import)
- json2csv (CSV export)
- jsPDF (PDF export)

---

**Phase Owner:** Project Manager
**Last Updated:** 2026-01-16
**Prerequisites:** Phase 5 complete, email server configured
