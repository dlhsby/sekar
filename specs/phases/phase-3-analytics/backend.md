# Phase 3 - Backend Implementation Checklist

**Duration:** 5 days
**Prerequisites:** Phase 2 deployed with sufficient data

---

## Overview

Build comprehensive analytics queries and automated report generation system.

---

## Timeline

| Day | Focus | Deliverables |
|-----|-------|--------------|
| Day 1-2 | Analytics Queries | Worker, area, operational metrics |
| Day 3 | Report Generation | PDF, CSV, Excel generators |
| Day 4 | Scheduler | Automated reports, email delivery |
| Day 5 | Testing & Polish | Integration tests, optimization |

---

## Analytics Module

### Module Structure

```
src/modules/analytics/
├── analytics.module.ts
├── analytics.controller.ts
├── analytics.service.ts
├── analytics.service.spec.ts
├── dto/
│   └── analytics-query.dto.ts
└── queries/
    ├── worker-analytics.query.ts
    ├── area-analytics.query.ts
    └── operational-analytics.query.ts
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /analytics/workers | Worker performance metrics |
| GET | /analytics/workers/:id | Single worker analytics |
| GET | /analytics/areas | Area metrics |
| GET | /analytics/areas/:id | Single area analytics |
| GET | /analytics/operations | Operational metrics |
| GET | /analytics/dashboard | Dashboard summary |

### Worker Analytics

**Query Parameters:**
```typescript
interface WorkerAnalyticsQueryDto {
  start_date: string;  // ISO date
  end_date: string;    // ISO date
  worker_id?: number;  // Optional filter
  area_id?: number;    // Optional filter
}
```

**Response:**
```typescript
interface WorkerAnalyticsResponse {
  workers: {
    worker_id: number;
    full_name: string;
    attendance_rate: number;      // percentage
    avg_shift_hours: number;
    reports_per_day: number;
    task_completion_rate: number;
    avg_task_time_minutes: number;
    late_clock_ins: number;
  }[];
  summary: {
    total_workers: number;
    avg_attendance_rate: number;
    total_reports: number;
  };
}
```

**SQL Query Example:**
```sql
SELECT
  u.id as worker_id,
  u.full_name,
  -- Attendance rate
  COUNT(DISTINCT DATE(s.clock_in_time)) * 100.0 /
    (EXTRACT(EPOCH FROM (:end_date - :start_date)) / 86400 + 1) as attendance_rate,
  -- Average shift hours
  AVG(EXTRACT(EPOCH FROM (s.clock_out_time - s.clock_in_time)) / 3600) as avg_shift_hours,
  -- Reports per day
  COUNT(DISTINCT r.id) * 1.0 / COUNT(DISTINCT DATE(s.clock_in_time)) as reports_per_day,
  -- Task completion rate
  COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) * 100.0 /
    NULLIF(COUNT(DISTINCT t.id), 0) as task_completion_rate
FROM users u
LEFT JOIN shifts s ON u.id = s.worker_id
  AND s.clock_in_time BETWEEN :start_date AND :end_date
LEFT JOIN work_reports r ON u.id = r.submitted_by
  AND r.created_at BETWEEN :start_date AND :end_date
LEFT JOIN tasks t ON u.id = t.assigned_to
  AND t.created_at BETWEEN :start_date AND :end_date
WHERE u.role = 'Worker'
GROUP BY u.id, u.full_name
ORDER BY attendance_rate DESC;
```

### Area Analytics

**Response:**
```typescript
interface AreaAnalyticsResponse {
  areas: {
    area_id: number;
    name: string;
    coverage_rate: number;       // % of days with workers
    reports_count: number;
    avg_condition: string;       // 'Baik', 'Cukup', 'Buruk'
    condition_trend: 'improving' | 'stable' | 'declining';
    peak_hours: string[];        // e.g., ['08:00', '14:00']
  }[];
}
```

### Operational Analytics

**Response:**
```typescript
interface OperationalAnalyticsResponse {
  total_hours: {
    daily: number[];
    weekly: number[];
    monthly: number[];
  };
  system_usage: {
    total_logins: number;
    active_users_today: number;
    reports_today: number;
    tasks_completed_today: number;
  };
}
```

### Implementation Checklist

- [ ] AnalyticsQueryDto with validation
- [ ] Worker analytics service method
- [ ] Area analytics service method
- [ ] Operational analytics service method
- [ ] Dashboard summary aggregation
- [ ] Query optimization with indexes
- [ ] Query caching (optional Redis)
- [ ] Unit tests for all queries

---

## Report Builder Module

### Module Structure

```
src/modules/report-builder/
├── report-builder.module.ts
├── report-builder.controller.ts
├── report-builder.service.ts
├── report-builder.service.spec.ts
├── generators/
│   ├── pdf-generator.ts
│   ├── csv-generator.ts
│   └── excel-generator.ts
├── templates/
│   └── report-templates/
│       ├── daily-attendance.html
│       └── weekly-performance.html
└── entities/
    ├── report-template.entity.ts
    └── generated-report.entity.ts
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /reports/generate | Generate report on-demand |
| GET | /reports/templates | List templates |
| POST | /reports/templates | Create template |
| PUT | /reports/templates/:id | Update template |
| DELETE | /reports/templates/:id | Delete template |
| GET | /reports/archive | List generated reports |
| GET | /reports/archive/:id/download | Download file |

### PDF Generator

```typescript
// generators/pdf-generator.ts
import * as puppeteer from 'puppeteer';

export class PdfGenerator {
  async generate(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html);
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
    });
    await browser.close();
    return pdf;
  }
}
```

### CSV Generator

```typescript
// generators/csv-generator.ts
export class CsvGenerator {
  generate(data: any[], columns: string[]): string {
    const header = columns.join(',');
    const rows = data.map(row =>
      columns.map(col => this.escapeValue(row[col])).join(',')
    );
    return [header, ...rows].join('\n');
  }

  private escapeValue(value: any): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}
```

### Excel Generator

```typescript
// generators/excel-generator.ts
import * as ExcelJS from 'exceljs';

export class ExcelGenerator {
  async generate(data: any[], columns: ColumnConfig[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    // Add headers
    worksheet.columns = columns.map(col => ({
      header: col.header,
      key: col.key,
      width: col.width || 15,
    }));

    // Add data
    worksheet.addRows(data);

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2E7D32' },
    };

    return workbook.xlsx.writeBuffer() as Promise<Buffer>;
  }
}
```

### Implementation Checklist

- [ ] ReportTemplate entity
- [ ] GeneratedReport entity
- [ ] PDF generator with puppeteer
- [ ] CSV generator
- [ ] Excel generator with exceljs
- [ ] Template CRUD service
- [ ] Generate report service
- [ ] Upload to S3
- [ ] Download from archive
- [ ] Unit tests (>80% coverage)

---

## Scheduler Module

### Module Structure

```
src/modules/scheduler/
├── scheduler.module.ts
├── scheduler.service.ts
└── jobs/
    ├── daily-report.job.ts
    └── weekly-report.job.ts
```

### Configuration

```typescript
// scheduler.module.ts
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // ...
  ],
})
export class SchedulerModule {}
```

### Daily Report Job

```typescript
// jobs/daily-report.job.ts
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class DailyReportJob {
  constructor(
    private reportService: ReportBuilderService,
    private emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM) // 08:00 daily
  async handleDailyReport() {
    // Find templates scheduled for daily
    const templates = await this.reportService.findBySchedule('0 8 * * *');

    for (const template of templates) {
      // Generate report
      const report = await this.reportService.generate(template.id, {
        start_date: yesterday(),
        end_date: yesterday(),
      });

      // Send email to recipients
      await this.emailService.sendReport(template.recipients, report);

      // Update last_run_at
      await this.reportService.updateLastRun(template.id);
    }
  }
}
```

### Email Service (AWS SES)

```typescript
// services/email.service.ts
import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';

@Injectable()
export class EmailService {
  private ses = new SESClient({ region: process.env.AWS_REGION });

  async sendReport(recipients: string[], report: GeneratedReport) {
    const message = this.buildEmailWithAttachment(
      recipients,
      `SEKAR Report - ${report.name}`,
      'Please find attached your scheduled report.',
      report.file_url,
    );

    await this.ses.send(new SendRawEmailCommand({ RawMessage: message }));
  }
}
```

### Implementation Checklist

- [ ] @nestjs/schedule configured
- [ ] Daily report cron job
- [ ] Weekly report cron job
- [ ] Custom schedule processing
- [ ] AWS SES setup
- [ ] Email template (HTML)
- [ ] Attachment handling
- [ ] Job execution logging
- [ ] Error handling & retries
- [ ] Unit tests (>80% coverage)

---

## Performance Optimization

### Database Indexes

```sql
-- Analytics query optimization
CREATE INDEX idx_shifts_worker_date ON shifts (worker_id, DATE(clock_in_time));
CREATE INDEX idx_reports_area_date ON work_reports (area_id, DATE(created_at));
CREATE INDEX idx_reports_worker_date ON work_reports (submitted_by, DATE(created_at));
CREATE INDEX idx_tasks_worker_status ON tasks (assigned_to, status);
CREATE INDEX idx_location_pings_worker_time ON location_pings (worker_id, recorded_at DESC);
```

### Query Caching (Optional)

```typescript
// Use Redis for caching frequently accessed analytics
@Injectable()
export class AnalyticsService {
  constructor(private cacheManager: Cache) {}

  async getWorkerAnalytics(query: AnalyticsQueryDto) {
    const cacheKey = `analytics:workers:${JSON.stringify(query)}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const result = await this.calculateWorkerAnalytics(query);
    await this.cacheManager.set(cacheKey, result, 300); // 5 min cache
    return result;
  }
}
```

---

## Testing Requirements

| Module | Target Coverage | Key Tests |
|--------|-----------------|-----------|
| Analytics | >80% | Query accuracy, performance |
| Report Builder | >80% | PDF/CSV/Excel generation |
| Scheduler | >80% | Job execution, email delivery |

### Performance Tests

- [ ] Analytics queries < 2 seconds
- [ ] Report generation < 30 seconds
- [ ] Handle 1M+ location pings
- [ ] Handle 10K+ reports

---

## Dependencies

```bash
npm install puppeteer        # PDF generation
npm install exceljs          # Excel generation
npm install @nestjs/schedule # Cron jobs
npm install @aws-sdk/client-ses # Email
```

---

## Success Criteria

1. Analytics provide accurate metrics
2. Reports generate in PDF/CSV/Excel formats
3. Scheduled reports sent via email
4. Custom report templates work correctly
5. Queries perform well (<2s)
6. All modules have >80% test coverage

---

## Deployment Checklist

### Pre-Deployment

- [ ] All unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] Load test analytics queries (1000 concurrent users)
- [ ] Test report generation with large datasets (10K+ records)
- [ ] Verify email delivery in staging environment
- [ ] Database indexes created and verified
- [ ] S3 bucket permissions configured for report storage

### Environment Variables

```env
# Report Generation
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser  # For Docker
REPORT_STORAGE_BUCKET=sekar-reports-production

# Email Configuration (AWS SES)
AWS_SES_REGION=ap-southeast-1
SES_FROM_EMAIL=reports@sekar.dlh.surabaya.go.id
SES_CONFIGURATION_SET=sekar-emails

# Scheduler
ENABLE_SCHEDULED_REPORTS=true
SCHEDULER_TIMEZONE=Asia/Jakarta

# Analytics Cache (Optional Redis)
REDIS_HOST=redis-cluster.internal
REDIS_PORT=6379
ANALYTICS_CACHE_TTL=300
```

### Deployment Steps

1. **Database Migration**
   ```bash
   npm run migration:run
   npm run seed:report-templates  # Default templates
   ```

2. **Verify Services**
   ```bash
   curl http://localhost:3000/api/analytics/dashboard
   curl http://localhost:3000/api/reports/templates
   ```

3. **Test Report Generation**
   ```bash
   # Generate test report
   curl -X POST http://localhost:3000/api/reports/generate \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "template_id": "daily-attendance",
       "start_date": "2026-01-20",
       "end_date": "2026-01-20",
       "format": "pdf"
     }'
   ```

4. **Monitor Scheduler**
   ```bash
   # Check scheduler logs
   docker logs backend | grep "ReportScheduler"
   ```

### Post-Deployment

- [ ] Verify analytics queries return in <2 seconds
- [ ] Verify PDF generation completes in <30 seconds
- [ ] Verify scheduled reports execute at correct times
- [ ] Monitor S3 storage usage
- [ ] Check email delivery rates (AWS SES dashboard)
- [ ] Set up CloudWatch alarms for failed jobs

### Rollback Plan

1. Stop scheduler: Set `ENABLE_SCHEDULED_REPORTS=false`
2. Revert database migration: `npm run migration:revert`
3. Redeploy previous version
4. Restore backed-up report templates

---

## Performance Benchmarks

| Operation | Target | Acceptable | Notes |
|-----------|--------|------------|-------|
| Worker analytics query | <1s | <2s | 10K shifts, 1K workers |
| Area analytics query | <1s | <2s | 100 areas |
| PDF generation (10 pages) | <15s | <30s | With charts |
| Excel generation (5K rows) | <5s | <10s | Multiple sheets |
| CSV generation (10K rows) | <2s | <5s | Simple format |
| Email delivery | <5s | <10s | Via AWS SES |

---

## API Response Examples

### GET /analytics/workers

**Request:**
```http
GET /api/analytics/workers?start_date=2026-01-01&end_date=2026-01-31
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "workers": [
    {
      "worker_id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
      "full_name": "Pekerja Satu",
      "attendance_rate": 95.0,
      "avg_shift_hours": 8.5,
      "reports_per_day": 3.2,
      "task_completion_rate": 92.5,
      "avg_task_time_minutes": 45.3,
      "late_clock_ins": 2
    }
  ],
  "summary": {
    "total_workers": 25,
    "avg_attendance_rate": 88.5,
    "total_reports": 2400
  }
}
```

### POST /reports/generate

**Request:**
```http
POST /api/reports/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "template_id": "weekly-performance",
  "start_date": "2026-01-13",
  "end_date": "2026-01-19",
  "format": "pdf",
  "filters": {
    "area_id": "c3d4e5f6-a7b8-9012-cdef-123456789012"
  }
}
```

**Response (201 Created):**
```json
{
  "id": "f6a7b8c9-d0e1-2345-f678-456789012345",
  "name": "Weekly Performance - Week 3",
  "format": "pdf",
  "status": "completed",
  "file_url": "https://sekar-reports.s3.amazonaws.com/reports/2026/01/20/weekly-performance-f6a7b8c9.pdf",
  "file_size": 245678,
  "generated_at": "2026-01-20T08:00:00.000Z"
}
```

---

## Sign-Off

**Developer:** _______________ **Date:** _______________

**Reviewer:** _______________ **Date:** _______________

**Last Updated:** 2026-01-21
