# Phase 3: Analytics & Reporting

**Timeline:** Weeks 5-6 (after Phase 2 deployment)
**Duration:** 2 weeks
**Status:** Planned

---

## Overview

Phase 3 provides comprehensive analytics and automated reporting capabilities for data-driven decision making by supervisors and administrators. This phase builds upon the WebSocket foundation established in Phase 2, extending it with analytics-specific real-time updates.

---

## Goals

1. **Worker Analytics** - Performance metrics per worker (attendance, productivity, task completion)
2. **Area Analytics** - Coverage, condition trends, issue frequency per area
3. **Operational Analytics** - System-wide metrics and KPIs
4. **Automated Reports** - Scheduled reports via email (daily, weekly, monthly)
5. **Report Builder** - Custom report templates with export options
6. **Real-Time Analytics** - Extend Phase 2 WebSocket with analytics-specific events

> **Note:** WebSocket foundation (gateway, authentication, room management) was implemented in Phase 2. This phase extends it with analytics-specific events.

---

## Key Features

### 1. Worker Performance Analytics

**Metrics:**
- Attendance rate (% of scheduled days present)
- Average shift duration
- Reports submitted per day
- Task completion rate
- Average task completion time
- Late clock-ins / Early clock-outs count
- Punctuality score

**Visualizations:**
- Worker leaderboard (top performers)
- Performance trends over time (line chart)
- Comparison charts (worker vs worker)
- Heatmap of active hours

### 2. Area Analytics

**Metrics:**
- Coverage rate (% of days with workers assigned)
- Average reports per area per day
- Condition rating trends (improving/stable/declining)
- Issues reported by type
- Peak activity hours

**Visualizations:**
- Area comparison charts
- Condition trend lines
- Issue type distribution (pie chart)
- Coverage heatmap calendar
- Geographic heat map

### 3. Automated Reports

**Report Types:**
- Daily attendance summary
- Weekly performance report
- Monthly operational report
- Incident reports (urgent issues)
- Custom scheduled reports

**Delivery:**
- Email (PDF attachment)
- Download from dashboard
- API endpoint for integration

### 4. Real-Time Analytics (WebSocket Extension)

> **Prerequisite:** WebSocket gateway from Phase 2 (see `specs/phases/phase-2-enhanced/README.md`)

**New Analytics Events (extends Phase 2 events):**
- `analytics:worker_performance` - Real-time performance metrics update
- `analytics:area_status` - Area health status changes
- `analytics:report_generated` - Automated report generated notification
- `analytics:kpi_alert` - KPI threshold breach alert
- `analytics:trend_change` - Significant trend change notification

---

## Database Changes

### New Tables

```sql
-- Report templates
CREATE TABLE report_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  created_by INT REFERENCES users(id),
  config JSONB NOT NULL,
  schedule VARCHAR(50),
  recipients TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated reports archive
CREATE TABLE generated_reports (
  id SERIAL PRIMARY KEY,
  template_id INT REFERENCES report_templates(id),
  generated_by INT REFERENCES users(id),
  file_url TEXT NOT NULL,
  format VARCHAR(20),
  date_range_start DATE,
  date_range_end DATE,
  file_size_kb INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Database Views

```sql
CREATE VIEW worker_performance_metrics AS
SELECT
  u.id AS worker_id,
  u.full_name AS worker_name,
  COUNT(DISTINCT s.id) AS total_shifts,
  AVG(EXTRACT(EPOCH FROM (s.clock_out_time - s.clock_in_time)) / 3600) AS avg_hours_per_shift,
  COUNT(DISTINCT wr.id) AS total_reports,
  SUM(CASE WHEN s.clock_in_time::time <= '08:05:00' THEN 1 ELSE 0 END)::float / NULLIF(COUNT(s.id), 0) AS punctuality_score,
  COUNT(DISTINCT DATE(s.clock_in_time)) AS days_worked
FROM users u
LEFT JOIN shifts s ON s.worker_id = u.id AND s.deleted_at IS NULL
LEFT JOIN work_reports wr ON wr.submitted_by = u.id AND wr.deleted_at IS NULL
WHERE u.role = 'Worker' AND u.deleted_at IS NULL
GROUP BY u.id, u.full_name;
```

### Performance Indexes

```sql
CREATE INDEX idx_shifts_worker_date ON shifts (worker_id, DATE(clock_in_time));
CREATE INDEX idx_reports_area_date ON work_reports (area_id, DATE(created_at));
CREATE INDEX idx_reports_worker_date ON work_reports (submitted_by, DATE(created_at));
CREATE INDEX idx_location_pings_worker_time ON location_pings (worker_id, recorded_at DESC);
```

---

## API Endpoints

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /analytics/dashboard | Dashboard summary stats |
| GET | /analytics/workers | Worker performance metrics |
| GET | /analytics/workers/:id | Single worker analytics |
| GET | /analytics/areas | Area metrics |
| GET | /analytics/areas/:id | Single area analytics |
| GET | /analytics/operations | Operational metrics |
| GET | /analytics/trends | Time-series trends |

### Report Builder

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /reports/generate | Generate report on-demand |
| GET | /reports/templates | List report templates |
| POST | /reports/templates | Create report template |
| PUT | /reports/templates/:id | Update template |
| DELETE | /reports/templates/:id | Delete template |
| GET | /reports/archive | List generated reports |
| GET | /reports/archive/:id/download | Download report file |

### WebSocket

| Event | Direction | Description |
|-------|-----------|-------------|
| worker:location_update | Server→Client | Real-time location |
| worker:shift_start | Server→Client | Clock-in event |
| worker:shift_end | Server→Client | Clock-out event |
| report:new | Server→Client | New report submitted |
| task:assigned | Server→Client | Task assignment |
| task:completed | Server→Client | Task completion |

---

## Dependencies

### Backend
```bash
npm install puppeteer        # PDF generation
npm install exceljs          # Excel generation
npm install @nestjs/schedule # Cron jobs
npm install @aws-sdk/client-ses # Email delivery
npm install @nestjs/websockets socket.io # WebSocket
```

### Web Dashboard
```bash
npm install recharts         # Charts
npm install socket.io-client # WebSocket client
npm install jspdf            # Client PDF
npm install leaflet.heat     # Heat maps
```

---

## Performance Requirements

| Query | Target Response Time | Data Volume |
|-------|---------------------|-------------|
| Dashboard summary | <1 second | All data |
| Worker analytics | <2 seconds | 500 workers, 1 month |
| Area analytics | <2 seconds | 50 areas, 1 month |
| Report generation | <30 seconds | 1 month data |
| WebSocket latency | <500ms | Real-time updates |

---

## Success Criteria

1. Analytics queries return accurate data within 2 seconds
2. Reports can be exported in PDF, CSV, and Excel formats
3. Automated reports are sent via email on schedule
4. Custom report templates can be saved and reused
5. Dashboard visualizations are clear and actionable
6. WebSocket provides real-time updates without refresh
7. All new modules have >80% test coverage
8. System handles 1M+ location pings efficiently

---

## Related Documentation

- **Backend Checklist:** [`backend.md`](./backend.md)
- **Mobile Checklist:** [`mobile.md`](./mobile.md)
- **Web Checklist:** [`web.md`](./web.md)
- **Timeline:** [`timeline.md`](./timeline.md)
- **Testing:** [`testing.md`](./testing.md)
- **Progress:** [`STATUS.md`](./STATUS.md)

---

**Phase Owner:** Project Manager
**Last Updated:** 2026-01-16
**Prerequisites:** Phase 2 deployed with sufficient data collected
