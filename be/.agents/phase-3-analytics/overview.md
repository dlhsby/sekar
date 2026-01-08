# Phase 3 - Analytics & Reporting (Backend)

## 🎯 Objectives

Build comprehensive analytics queries and automated report generation system.

**Duration:** 5 days  
**Prerequisites:** Phase 2 deployed with sufficient data

---

## 📅 Timeline

| Day | Focus | Features |
|-----|-------|----------|
| Day 1-2 | Analytics Queries | Worker, area, operational metrics |
| Day 3 | Report Generation | PDF, CSV, Excel generators |
| Day 4 | Scheduler | Automated reports, email delivery |
| Day 5 | Testing & Polish | Integration tests, optimization |

---

## 🎨 Features

### 1. Worker Performance Analytics

**Metrics:**
- Attendance rate (% of scheduled days)
- Average shift duration
- Reports submitted per day
- Task completion rate
- Average task completion time
- Late clock-ins / Early clock-outs

### 2. Area Analytics

**Metrics:**
- Coverage rate (% of days with workers)
- Average reports per area
- Condition rating trends
- Issues reported by type
- Response time to issues
- Peak activity hours

### 3. Operational Analytics

**Metrics:**
- Total worker hours per day/week/month
- Shift patterns analysis
- GPS tracking coverage
- Report review time
- Task response metrics
- System usage statistics

### 4. Report Generation

**Formats:**
- PDF (formatted with charts)
- CSV (raw data)
- Excel (with formulas)

**Report Types:**
- Daily attendance summary
- Weekly performance report
- Monthly operational report
- Custom reports

### 5. Scheduled Reports

**Features:**
- Cron-based scheduling
- Email delivery (AWS SES)
- Template management
- Report archive

---

## 🗄️ Database Changes

```sql
-- Report templates
CREATE TABLE report_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  created_by INT REFERENCES users(id),
  config JSONB NOT NULL,
  schedule VARCHAR(50), -- Cron expression
  recipients TEXT[], -- Email addresses
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated reports archive
CREATE TABLE generated_reports (
  id SERIAL PRIMARY KEY,
  template_id INT REFERENCES report_templates(id),
  generated_by INT REFERENCES users(id),
  file_url TEXT,
  format VARCHAR(20), -- pdf, csv, excel
  date_range_start DATE,
  date_range_end DATE,
  file_size_kb INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🔌 API Endpoints

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /analytics/workers | Worker performance metrics |
| GET | /analytics/workers/:id | Single worker analytics |
| GET | /analytics/areas | Area metrics |
| GET | /analytics/areas/:id | Single area analytics |
| GET | /analytics/operations | Operational metrics |
| GET | /analytics/dashboard | Dashboard summary |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /reports/generate | Generate report |
| GET | /reports/templates | List templates |
| POST | /reports/templates | Create template |
| PUT | /reports/templates/:id | Update template |
| DELETE | /reports/templates/:id | Delete template |
| GET | /reports/archive | List generated reports |
| GET | /reports/archive/:id/download | Download report |

---

## 🏗️ Module Structure

```
src/modules/
├── analytics/
│   ├── analytics.module.ts
│   ├── analytics.controller.ts
│   ├── analytics.service.ts
│   ├── analytics.service.spec.ts
│   ├── dto/
│   │   └── analytics-query.dto.ts
│   └── queries/
│       ├── worker-analytics.query.ts
│       ├── area-analytics.query.ts
│       └── operational-analytics.query.ts
├── report-builder/
│   ├── report-builder.module.ts
│   ├── report-builder.controller.ts
│   ├── report-builder.service.ts
│   ├── report-builder.service.spec.ts
│   ├── generators/
│   │   ├── pdf-generator.ts
│   │   ├── csv-generator.ts
│   │   └── excel-generator.ts
│   ├── templates/
│   └── entities/
│       ├── report-template.entity.ts
│       └── generated-report.entity.ts
└── scheduler/
    ├── scheduler.module.ts
    ├── scheduler.service.ts
    └── jobs/
        ├── daily-report.job.ts
        └── weekly-report.job.ts
```

---

## 📊 Analytics Query Examples

### Worker Performance
```typescript
// GET /analytics/workers?start_date=2026-01-01&end_date=2026-01-31
{
  "workers": [
    {
      "worker_id": 1,
      "full_name": "Ahmad Rizki",
      "attendance_rate": 95.5,
      "avg_shift_hours": 7.8,
      "reports_per_day": 4.2,
      "task_completion_rate": 88.0,
      "avg_task_time_minutes": 45,
      "late_clock_ins": 2
    }
  ],
  "summary": {
    "total_workers": 30,
    "avg_attendance_rate": 92.3,
    "total_reports": 2500
  }
}
```

### Area Metrics
```typescript
// GET /analytics/areas?start_date=2026-01-01&end_date=2026-01-31
{
  "areas": [
    {
      "area_id": 1,
      "name": "Taman Bungkul",
      "coverage_rate": 100,
      "reports_count": 450,
      "avg_condition": "Baik",
      "condition_trend": "stable",
      "peak_hours": ["08:00", "14:00"]
    }
  ]
}
```

---

## 🧪 Testing Requirements

| Module | Target | Key Tests |
|--------|--------|-----------|
| Analytics | >80% | Query accuracy, performance |
| Report Builder | >80% | PDF/CSV/Excel generation |
| Scheduler | >80% | Job execution, email delivery |

### Performance Tests
- Analytics queries < 2 seconds
- Report generation < 30 seconds
- Handle 1M+ location pings

---

## ✅ Success Criteria

1. ✅ Analytics provide accurate metrics
2. ✅ Reports generate in PDF/CSV/Excel
3. ✅ Scheduled reports sent via email
4. ✅ Custom report templates work
5. ✅ Queries perform well (<2s)
6. ✅ All modules >80% coverage

---

## 📝 Dependencies

```bash
npm install puppeteer       # PDF generation
npm install exceljs         # Excel generation
npm install @nestjs/schedule # Cron jobs
npm install @aws-sdk/client-ses # Email
```

---

*Last Updated: January 2026*

