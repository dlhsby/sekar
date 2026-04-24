# Phase 4: Backend Specifications

**Date:** March 13, 2026
**Status:** Not Started
**Depends On:** Phase 3 Backend (Complete)
**Related Sub-Phases:** 4-1, 4-2, 4-3, 4-4, 4-8

---

## Current Codebase Facts (Post-Phase 3 Expected Values)

| Fact | Value |
|------|-------|
| Modules | 20 (Phase 2E: 18 + Phase 3: export, health) |
| Endpoints | ~145 |
| Tests | >1,500 passing (>90% stmts) |
| Coverage | >90% stmts, >80% branches |
| Redis | Installed — cache, Socket.IO adapter, JWT blacklist |
| Export | ExportModule with CSV/Excel via exceljs, async export_jobs |
| Cron jobs | ~7 active (monitoring refresh, shift reminder, stale status, retention x3, export retry) |
| Rate limiting | Global 100 req/min + per-endpoint limits via Redis |
| JWT | 15-min access + 7-day refresh with Redis blacklist |
| Logging | Structured JSON logging with Sentry integration |

---

## A. Reporting Module (Sub-Phase 4-1)

### A1. Module Structure

```
be/src/modules/reporting/
├── reporting.module.ts
├── reporting.controller.ts
├── reporting.controller.spec.ts
├── reporting.service.ts
├── reporting.service.spec.ts
├── dto/
│   ├── create-report.dto.ts
│   ├── create-schedule.dto.ts
│   ├── report-query.dto.ts
│   └── update-schedule.dto.ts
├── entities/
│   ├── report-template.entity.ts
│   ├── generated-report.entity.ts
│   └── report-schedule.entity.ts
├── generators/
│   ├── pdf.generator.ts
│   ├── pdf.generator.spec.ts
│   └── templates/
│       ├── daily-operations.hbs
│       ├── weekly-performance.hbs
│       ├── monthly-summary.hbs
│       ├── worker-performance.hbs
│       ├── area-status.hbs
│       └── overtime-utilization.hbs
├── reports/
│   ├── daily-operations.report.ts
│   ├── weekly-performance.report.ts
│   ├── monthly-summary.report.ts
│   ├── worker-performance.report.ts
│   ├── area-status.report.ts
│   └── overtime-utilization.report.ts
└── cron/
    └── report-scheduler.cron.ts
```

### A2. Endpoints

```
GET    /reporting/templates                → ReportTemplate[]
GET    /reporting/templates/:slug          → ReportTemplate
POST   /reporting/generate                 → GeneratedReport (202 Accepted)
GET    /reporting/reports                  → PaginatedResponse<GeneratedReport>
GET    /reporting/reports/:id              → GeneratedReport (with presigned download URL)
DELETE /reporting/reports/:id              → void

GET    /reporting/schedules                → ReportSchedule[]
POST   /reporting/schedules                → ReportSchedule
PATCH  /reporting/schedules/:id            → ReportSchedule
DELETE /reporting/schedules/:id            → void
```

**Auth:** All endpoints require `@UseGuards(JwtAuthGuard, RolesGuard)`

| Endpoint | Roles |
|----------|-------|
| Templates (GET) | All authenticated users |
| Generate report | `admin_system`, `superadmin`, `kepala_rayon`, `korlap` |
| View own reports | All authenticated users (scoped to own reports) |
| Manage schedules | `admin_system`, `superadmin` |

### A3. Generate Report DTO

**File:** `be/src/modules/reporting/dto/create-report.dto.ts`

```typescript
export class CreateReportDto {
  @IsString()
  @IsNotEmpty()
  templateSlug: string;  // e.g., 'daily-operations'

  @IsEnum(['pdf', 'csv', 'xlsx'])
  @IsOptional()
  format?: string = 'pdf';

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsUUID()
  @IsOptional()
  areaId?: string;

  @IsUUID()
  @IsOptional()
  rayonId?: string;

  @IsUUID()
  @IsOptional()
  workerId?: string;  // For worker-performance report
}
```

### A4. PDF Generator (ADR-024)

**File:** `be/src/modules/reporting/generators/pdf.generator.ts`

```typescript
@Injectable()
export class PdfGenerator {
  private browser: Browser | null = null;

  async onModuleInit() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  async generatePdf(templateName: string, data: Record<string, unknown>): Promise<Buffer> {
    const templatePath = join(__dirname, 'templates', `${templateName}.hbs`);
    const templateSource = await readFile(templatePath, 'utf-8');
    const template = Handlebars.compile(templateSource);
    const html = template(data);

    const page = await this.browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      printBackground: true,
    });
    await page.close();
    return Buffer.from(pdf);
  }
}
```

> **Resource management:** Puppeteer browser instance is shared across requests (singleton). Max 3 concurrent page generations via semaphore to prevent OOM. Browser is recycled every 100 generations to prevent memory leaks.

### A5. Report Scheduler Cron

**File:** `be/src/modules/reporting/cron/report-scheduler.cron.ts`

```typescript
@Cron('* * * * *', { timeZone: 'Asia/Jakarta' })  // Every minute
async checkSchedules() {
  const dueSchedules = await this.reportScheduleRepo.find({
    where: {
      is_active: true,
      next_run_at: LessThanOrEqual(new Date()),
    },
  });

  for (const schedule of dueSchedules) {
    await this.reportingService.generateFromSchedule(schedule);
    schedule.last_run_at = new Date();
    schedule.next_run_at = this.calculateNextRun(schedule);
    await this.reportScheduleRepo.save(schedule);
  }
}
```

**Default schedules (seeded):**

| Report | Frequency | Time (WIB) | Cron Expression |
|--------|-----------|------------|-----------------|
| Daily Operations | Daily | 06:00 | `0 6 * * *` |
| Weekly Performance | Weekly (Monday) | 07:00 | `0 7 * * 1` |
| Monthly Summary | Monthly (1st) | 08:00 | `0 8 1 * *` |

---

## B. Analytics Module (Sub-Phase 4-2)

### B1. Module Structure

```
be/src/modules/analytics/
├── analytics.module.ts
├── analytics.controller.ts
├── analytics.controller.spec.ts
├── analytics.service.ts
├── analytics.service.spec.ts
├── dto/
│   ├── analytics-query.dto.ts
│   └── analytics-response.dto.ts
└── cron/
    └── analytics-refresh.cron.ts
```

### B2. Endpoints

```
GET /analytics/dashboard              → DashboardSummaryDto
GET /analytics/workers                → PaginatedResponse<WorkerAnalyticsDto>
GET /analytics/workers/:id            → WorkerDetailAnalyticsDto
GET /analytics/areas                  → PaginatedResponse<AreaAnalyticsDto>
GET /analytics/areas/:id              → AreaDetailAnalyticsDto
GET /analytics/operational            → OperationalAnalyticsDto
GET /analytics/operational/trends     → OperationalTrendsDto

POST /analytics/refresh               → { message: 'Views refreshed', duration_ms: number }
```

**Auth:**

| Endpoint | Roles |
|----------|-------|
| Dashboard summary | All authenticated users |
| Worker analytics (own) | `satgas`, `linmas` (own data only) |
| Worker analytics (team) | `korlap`, `kepala_rayon` (area/rayon scope) |
| Worker analytics (all) | `admin_system`, `superadmin`, `top_management` |
| Area analytics | `korlap` (own area), `kepala_rayon` (own rayon), admin roles (all) |
| Operational analytics | `kepala_rayon`, `top_management`, `admin_system`, `superadmin` |
| Refresh views | `admin_system`, `superadmin` |

### B3. Worker Analytics DTO

```typescript
export class WorkerAnalyticsDto {
  userId: string;
  fullName: string;
  role: string;
  areaName: string;
  rayonName: string;
  period: { startDate: string; endDate: string };

  // 8 Worker KPIs
  attendanceRate: number;         // % days attended / scheduled (0-100)
  punctualityScore: number;       // % on-time arrivals (0-100)
  taskCompletionRate: number;     // % completed / assigned (0-100)
  avgTaskDurationHours: number;   // Average hours to complete a task
  activitySubmissionRate: number; // % days with activity submission
  activityApprovalRate: number;   // % approved / submitted (0-100)
  areaCompliancePercent: number;  // % pings within area boundary
  overtimeHours: number;          // Total approved overtime hours

  performanceScore: number;       // Weighted composite (0-100)
}
```

### B4. Performance Score Algorithm

```typescript
// Weighted composite score (0-100)
const performanceScore =
  attendanceRate * 0.25 +           // 25% weight
  punctualityScore * 0.15 +         // 15% weight
  taskCompletionRate * 0.20 +       // 20% weight
  activitySubmissionRate * 0.15 +   // 15% weight
  activityApprovalRate * 0.10 +     // 10% weight
  areaCompliancePercent * 0.15;     // 15% weight

// Grade thresholds
// A: >= 90, B: >= 75, C: >= 60, D: >= 40, F: < 40
```

> **Note:** `avgTaskDurationHours` and `overtimeHours` are informational metrics not included in the composite score — they lack meaningful normalization scales.

### B5. Area Analytics DTO

```typescript
export class AreaAnalyticsDto {
  areaId: string;
  areaName: string;
  rayonName: string;
  period: { startDate: string; endDate: string };

  // 5 Area KPIs
  staffingCoverageRatio: number;    // attended / required (0-200%)
  taskBacklog: number;              // Open tasks not yet completed
  maintenanceFrequency: number;     // Maintenance events per month
  incidentRate: number;             // Outside-area + missing events per day
  avgWorkerPerformance: number;     // Mean performanceScore of area workers
}
```

### B6. Operational Analytics DTO

```typescript
export class OperationalAnalyticsDto {
  period: { startDate: string; endDate: string };

  // 6 Operational KPIs
  systemAttendanceRate: number;     // % system-wide attendance
  taskThroughput: number;           // Tasks completed per day
  avgResponseTimeHours: number;     // Avg time from task creation to completion
  overtimeRatio: number;            // Overtime hours / regular hours
  workerUtilization: number;        // % workers with active shift on given day
  geofenceCompliance: number;       // % within-area pings system-wide
}
```

### B7. Analytics Query DTO

```typescript
export class AnalyticsQueryDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;  // Default: 30 days ago

  @IsDateString()
  @IsOptional()
  endDate?: string;    // Default: today

  @IsUUID()
  @IsOptional()
  areaId?: string;

  @IsUUID()
  @IsOptional()
  rayonId?: string;

  @IsEnum(['daily', 'weekly', 'monthly'])
  @IsOptional()
  granularity?: string = 'daily';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;
}
```

---

## C. Asset Management Module (Sub-Phase 4-3)

### C1. Module Structure

```
be/src/modules/assets/
├── assets.module.ts
├── assets.controller.ts
├── assets.controller.spec.ts
├── assets.service.ts
├── assets.service.spec.ts
├── dto/
│   ├── create-asset.dto.ts
│   ├── update-asset.dto.ts
│   ├── checkout-asset.dto.ts
│   ├── return-asset.dto.ts
│   ├── create-maintenance.dto.ts
│   └── asset-query.dto.ts
├── entities/
│   ├── asset.entity.ts
│   ├── asset-category.entity.ts
│   ├── asset-assignment.entity.ts
│   └── asset-maintenance.entity.ts
└── services/
    ├── qr-code.service.ts
    └── qr-code.service.spec.ts
```

### C2. Endpoints

```
# Asset Categories
GET    /assets/categories                  → AssetCategory[]

# Assets CRUD
GET    /assets                             → PaginatedResponse<Asset>
GET    /assets/:id                         → Asset (with assignments + maintenances)
POST   /assets                             → Asset
PATCH  /assets/:id                         → Asset
DELETE /assets/:id                         → void (soft delete)

# QR Code
POST   /assets/:id/qr                     → { qrCodeUrl: string }
POST   /assets/qr/bulk                    → { urls: string[] }
GET    /assets/scan/:code                  → Asset (lookup by asset_code)

# Assignment
POST   /assets/:id/checkout               → AssetAssignment
POST   /assets/:id/return                 → AssetAssignment
GET    /assets/:id/assignments             → AssetAssignment[]
GET    /assets/my-assets                   → Asset[] (current user's checked-out assets)

# Maintenance
POST   /assets/:id/maintenance             → AssetMaintenance
PATCH  /assets/maintenance/:id             → AssetMaintenance
GET    /assets/maintenance/calendar         → AssetMaintenance[] (month view)
GET    /assets/maintenance/overdue          → AssetMaintenance[]
```

**Auth:**

| Endpoint | Roles |
|----------|-------|
| View assets | All authenticated users (scoped to area/rayon) |
| Create/update/delete assets | `korlap`, `kepala_rayon`, `admin_system`, `superadmin` |
| Generate QR codes | `korlap`, `kepala_rayon`, `admin_system`, `superadmin` |
| Checkout asset | `satgas`, `linmas`, `korlap` (own area) |
| Return asset | `satgas`, `linmas`, `korlap` (own area) |
| My assets | All clockable roles |
| Create/update maintenance | `korlap`, `kepala_rayon`, `admin_system`, `superadmin` |
| View maintenance calendar | All authenticated users (scoped) |

### C3. QR Code Service (ADR-026)

**File:** `be/src/modules/assets/services/qr-code.service.ts`

```typescript
@Injectable()
export class QrCodeService {
  constructor(private readonly s3Service: S3Service) {}

  async generateQrCode(assetCode: string, assetId: string): Promise<string> {
    // ADR-026: Plain string format for scan reliability and offline support
    const qrData = `SEKAR:${assetCode}`;

    const qrBuffer = await QRCode.toBuffer(qrData, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'H', // High (30%) for outdoor durability per ADR-026
    });

    const s3Key = `qr-codes/${assetCode}.png`;
    await this.s3Service.upload(s3Key, qrBuffer, 'image/png');
    return s3Key;
  }

  async generateBulk(assets: { code: string; id: string }[]): Promise<string[]> {
    return Promise.all(
      assets.map(a => this.generateQrCode(a.code, a.id)),
    );
  }
}
```

> **Offline scanning:** QR contains asset_code (human-readable) so mobile can display asset info even without network. Full details fetched via `GET /assets/scan/:code` when online.

### C4. Checkout Asset DTO

```typescript
export class CheckoutAssetDto {
  @IsUUID()
  @IsOptional()
  assignedTo?: string;  // Default: current user

  @IsDateString()
  @IsOptional()
  expectedReturnAt?: string;

  @IsEnum(['good', 'fair', 'poor', 'damaged'])
  conditionAtCheckout: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}
```

### C5. Asset Scope Enforcement

Assets are scoped to rayon and area:

```typescript
async findAll(user: User, query: AssetQueryDto): Promise<PaginatedResponse<Asset>> {
  const qb = this.assetRepo.createQueryBuilder('asset')
    .leftJoinAndSelect('asset.category', 'category')
    .where('asset.deleted_at IS NULL');

  switch (user.role) {
    case 'satgas':
    case 'linmas':
      qb.andWhere('asset.area_id = :areaId', { areaId: user.area_id });
      break;
    case 'korlap':
      qb.andWhere('asset.area_id IN (SELECT area_id FROM user_areas WHERE user_id = :userId)',
        { userId: user.id });
      break;
    case 'kepala_rayon':
      qb.andWhere('asset.rayon_id = :rayonId', { rayonId: user.rayon_id });
      break;
  }

  return this.paginate(qb, query);
}
```

---

## D. iOS Backend Support (Sub-Phase 4-4)

### D1. Apple Sign-In Endpoint

```
POST /auth/apple
Body: { identityToken: string, authorizationCode: string, fullName?: string }
Response: { access_token: string, refresh_token: string, user: UserDto }
```

```typescript
@Injectable()
export class AppleAuthService {
  async verifyAndLogin(dto: AppleLoginDto): Promise<AuthResponseDto> {
    const appleUser = await appleSignin.verifyIdToken(dto.identityToken, {
      audience: process.env.APPLE_CLIENT_ID,
      ignoreExpiration: false,
    });

    let user = await this.usersService.findByAppleId(appleUser.sub);
    if (!user) {
      user = await this.usersService.createFromApple({
        appleId: appleUser.sub,
        email: appleUser.email,
        fullName: dto.fullName,
      });
    }

    return this.authService.generateTokenPair(user);
  }
}
```

> **Database change:** Add `apple_id VARCHAR(255) UNIQUE` column to `users` table. See database.md section D for migration.

### D2. Apple Sign-In Migration

```sql
ALTER TABLE users ADD COLUMN apple_id VARCHAR(255);
CREATE UNIQUE INDEX idx_users_apple_id ON users(apple_id) WHERE apple_id IS NOT NULL;
```

---

## E. New Error Codes (Phase 4)

### E1. Reporting Errors

| Code | HTTP Status | Message | Trigger |
|------|-------------|---------|---------|
| `REPORT_001` | 404 | Report template not found | Invalid template slug |
| `REPORT_002` | 400 | Invalid report parameters | Missing required filter for template |
| `REPORT_003` | 500 | Report generation failed | Puppeteer error or template rendering failure |
| `REPORT_004` | 404 | Generated report not found | Report ID doesn't exist or access denied |
| `REPORT_005` | 429 | Report generation rate limited | Max 3 concurrent generations |

### E2. Analytics Errors

| Code | HTTP Status | Message | Trigger |
|------|-------------|---------|---------|
| `ANALYTICS_001` | 400 | Invalid date range | Start date after end date, or range > 365 days |
| `ANALYTICS_002` | 503 | Analytics data refreshing | Materialized view refresh in progress |

### E3. Asset Errors

| Code | HTTP Status | Message | Trigger |
|------|-------------|---------|---------|
| `ASSET_001` | 404 | Asset not found | Invalid asset ID or asset_code |
| `ASSET_002` | 409 | Asset already checked out | Checkout attempted on in-use asset |
| `ASSET_003` | 409 | Asset not checked out | Return attempted on available asset |
| `ASSET_004` | 400 | Asset in maintenance | Checkout attempted on asset in maintenance |
| `ASSET_005` | 400 | Invalid asset code format | QR scan returned invalid format |

### E4. Apple Auth Errors

| Code | HTTP Status | Message | Trigger |
|------|-------------|---------|---------|
| `APPLE_001` | 401 | Apple token verification failed | Invalid or expired Apple identity token |
| `APPLE_002` | 409 | Apple ID already linked | Apple ID associated with different user |

---

## F. Cron Jobs Summary (Phase 4 Additions)

| Cron | Schedule (WIB) | Module | Purpose |
|------|----------------|--------|---------|
| Report scheduler | Every minute | Reporting | Check and execute scheduled reports |
| Analytics refresh | Daily 02:00 (ADR-025) | Analytics | Refresh 3 materialized views + invalidate Redis cache |
| Maintenance overdue | Daily 08:00 | Assets | Mark overdue maintenances |
| Generated reports cleanup | Weekly Sun 04:00 | Reporting | Purge reports >90 days + S3 files |

---

## G. Testing Guidance

### G1. Puppeteer Testing

Mock Puppeteer browser in unit tests:

```typescript
const mockPage = {
  setContent: jest.fn(),
  pdf: jest.fn().mockResolvedValue(Buffer.from('fake-pdf')),
  close: jest.fn(),
};

const mockBrowser = {
  newPage: jest.fn().mockResolvedValue(mockPage),
  close: jest.fn(),
};

jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue(mockBrowser),
}));
```

### G2. Materialized View Testing

Use raw table queries in tests instead of materialized views:

```typescript
jest.spyOn(queryRunner, 'query').mockResolvedValue([
  { user_id: 'uuid', date: '2026-03-01', attended: 1, total_tasks: 5, completed_tasks: 3 },
]);
```

### G3. QR Code Testing

Mock `qrcode` package:

```typescript
jest.mock('qrcode', () => ({
  toBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-qr')),
}));
```

---

## H. Coverage Requirements

| Module | Target | Notes |
|--------|--------|-------|
| Reporting | >80% stmts | Mock Puppeteer, S3, cron |
| Analytics | >80% stmts | Mock materialized view queries |
| Assets | >80% stmts | Mock QR generation, S3 |
| Apple Auth | >80% stmts | Mock Apple token verification |
| Overall project | >90% stmts maintained | Must not drop below Phase 3 baseline |

---

**Last Updated:** 2026-03-13
