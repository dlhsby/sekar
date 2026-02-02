# Phase 4: Backend Implementation Guide

**Component:** Backend (NestJS + TypeScript + PostgreSQL)
**Developer Role:** Backend Developer
**Duration:** 6-8 weeks

---

## Overview

Phase 4 backend work consolidates three major feature sets: Analytics & Reporting, Asset Management, and iOS platform support. This guide provides implementation specifications for all backend components.

---

## Part A: Analytics & Reporting (Weeks 1-2)

### Module: Analytics

**Location:** `be/src/modules/analytics/`

#### Files to Create

```
analytics/
├── analytics.module.ts
├── analytics.controller.ts
├── analytics.service.ts
├── dto/
│   ├── dashboard-stats.dto.ts
│   ├── worker-analytics.dto.ts
│   ├── area-analytics.dto.ts
│   └── query-filters.dto.ts
├── interfaces/
│   └── analytics.interface.ts
└── __tests__/
    ├── analytics.controller.spec.ts
    └── analytics.service.spec.ts
```

#### API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /analytics/dashboard | Dashboard summary stats | Admin, TopManagement |
| GET | /analytics/workers | Worker performance metrics | Admin, TopManagement, KepalaRayon |
| GET | /analytics/workers/:id | Single worker analytics | Admin, TopManagement, KepalaRayon |
| GET | /analytics/areas | Area metrics | Admin, TopManagement |
| GET | /analytics/areas/:id | Single area analytics | Admin, TopManagement, KepalaRayon |
| GET | /analytics/operations | Operational metrics | Admin, TopManagement |
| GET | /analytics/trends | Time-series trends | Admin, TopManagement |

#### Worker Performance Metrics

```typescript
// dto/worker-analytics.dto.ts
export class WorkerAnalyticsDto {
  workerId: string;
  workerName: string;
  attendanceRate: number; // % of scheduled days present
  avgShiftDuration: number; // Average hours per shift
  reportsPerDay: number; // Average reports submitted per day
  taskCompletionRate: number; // % of assigned tasks completed
  avgTaskCompletionTime: number; // Average hours to complete tasks
  lateClockIns: number; // Count of late arrivals
  earlyClockOuts: number; // Count of early departures
  punctualityScore: number; // 0-100 score based on attendance patterns
}
```

#### Database Views

```sql
-- Create view for worker performance metrics
CREATE OR REPLACE VIEW worker_performance_metrics AS
SELECT
  u.id AS worker_id,
  u.full_name AS worker_name,
  COUNT(DISTINCT s.id) AS total_shifts,
  AVG(EXTRACT(EPOCH FROM (s.clock_out_time - s.clock_in_time)) / 3600) AS avg_hours_per_shift,
  COUNT(DISTINCT wr.id) AS total_reports,
  COUNT(DISTINCT wr.id)::float / NULLIF(COUNT(DISTINCT DATE(s.clock_in_time)), 0) AS reports_per_day,
  SUM(CASE WHEN s.clock_in_time::time <= '08:05:00' THEN 1 ELSE 0 END)::float / NULLIF(COUNT(s.id), 0) AS punctuality_score,
  COUNT(DISTINCT DATE(s.clock_in_time)) AS days_worked,
  COUNT(CASE WHEN s.clock_in_time::time > '08:05:00' THEN 1 END) AS late_clock_ins,
  COUNT(CASE WHEN s.clock_out_time::time < '14:55:00' THEN 1 END) AS early_clock_outs
FROM users u
LEFT JOIN shifts s ON s.worker_id = u.id AND s.deleted_at IS NULL
LEFT JOIN work_reports wr ON wr.submitted_by = u.id AND wr.deleted_at IS NULL
WHERE u.role IN ('Worker', 'Linmas') AND u.deleted_at IS NULL
GROUP BY u.id, u.full_name;

-- Create view for area analytics
CREATE OR REPLACE VIEW area_analytics_metrics AS
SELECT
  a.id AS area_id,
  a.name AS area_name,
  a.rayon_id,
  COUNT(DISTINCT s.id) AS total_shifts,
  COUNT(DISTINCT DATE(s.clock_in_time))::float / 30 AS coverage_rate, -- Last 30 days
  COUNT(DISTINCT wr.id)::float / NULLIF(COUNT(DISTINCT DATE(s.clock_in_time)), 0) AS avg_reports_per_day,
  AVG(wr.condition_rating) AS avg_condition_rating,
  COUNT(DISTINCT t.id) AS total_tasks,
  COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END)::float / NULLIF(COUNT(t.id), 0) AS task_completion_rate
FROM areas a
LEFT JOIN shifts s ON s.area_id = a.id AND s.deleted_at IS NULL AND s.clock_in_time >= NOW() - INTERVAL '30 days'
LEFT JOIN work_reports wr ON wr.area_id = a.id AND wr.deleted_at IS NULL AND wr.created_at >= NOW() - INTERVAL '30 days'
LEFT JOIN tasks t ON t.area_id = a.id AND t.deleted_at IS NULL AND t.created_at >= NOW() - INTERVAL '30 days'
WHERE a.deleted_at IS NULL
GROUP BY a.id, a.name, a.rayon_id;
```

#### Performance Indexes

```sql
CREATE INDEX idx_shifts_worker_date ON shifts (worker_id, DATE(clock_in_time));
CREATE INDEX idx_reports_area_date ON work_reports (area_id, DATE(created_at));
CREATE INDEX idx_reports_worker_date ON work_reports (submitted_by, DATE(created_at));
CREATE INDEX idx_tasks_area_status ON tasks (area_id, status);
CREATE INDEX idx_tasks_assignee_status ON tasks (assigned_to, status);
```

### Module: Reports (Report Builder)

**Location:** `be/src/modules/reports/`

#### Database Schema

```sql
-- Report templates
CREATE TABLE report_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id),
  config JSONB NOT NULL, -- Report configuration (filters, columns, charts)
  schedule VARCHAR(50), -- cron expression for scheduled reports
  recipients TEXT[], -- Email addresses
  format VARCHAR(20) DEFAULT 'PDF', -- PDF, CSV, EXCEL
  is_active BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Generated reports archive
CREATE TABLE generated_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES report_templates(id),
  generated_by UUID REFERENCES users(id),
  file_url TEXT NOT NULL, -- S3 URL
  format VARCHAR(20), -- PDF, CSV, EXCEL
  date_range_start DATE,
  date_range_end DATE,
  file_size_kb INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /reports/generate | Generate report on-demand | Admin, TopManagement |
| GET | /reports/templates | List report templates | Admin, TopManagement |
| POST | /reports/templates | Create report template | Admin |
| PUT | /reports/templates/:id | Update template | Admin |
| DELETE | /reports/templates/:id | Delete template | Admin |
| GET | /reports/archive | List generated reports | Admin, TopManagement |
| GET | /reports/archive/:id/download | Download report file | Admin, TopManagement |

#### Dependencies

```bash
npm install puppeteer        # PDF generation
npm install exceljs          # Excel generation
npm install @nestjs/schedule # Cron jobs
npm install @aws-sdk/client-ses # Email delivery
```

---

## Part B: Asset Management (Weeks 3-4)

### Module: Assets

**Location:** `be/src/modules/assets/`

#### Database Schema

```sql
-- Assets table
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_code VARCHAR(50) UNIQUE NOT NULL, -- QR code value
  name VARCHAR(100) NOT NULL,
  asset_type VARCHAR(50) NOT NULL, -- tool, equipment, vehicle
  description TEXT,
  purchase_date DATE,
  warranty_expiry DATE,
  status VARCHAR(20) DEFAULT 'available', -- available, in-use, maintenance, retired
  current_holder_id UUID REFERENCES users(id), -- Currently assigned worker
  current_area_id UUID REFERENCES areas(id), -- Currently assigned area
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Asset assignments history
CREATE TABLE asset_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID REFERENCES assets(id),
  assigned_to_user UUID REFERENCES users(id),
  assigned_to_area UUID REFERENCES areas(id),
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  returned_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Maintenance records
CREATE TABLE maintenance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID REFERENCES assets(id),
  maintenance_type VARCHAR(50) NOT NULL, -- preventive, corrective, inspection
  scheduled_date DATE,
  completed_date DATE,
  performed_by UUID REFERENCES users(id),
  cost DECIMAL(10, 2),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, in-progress, completed, cancelled
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /assets | Create asset | Admin |
| GET | /assets | List assets (filter by type, status) | Admin, KepalaRayon |
| GET | /assets/:id | Get asset details | Admin, KepalaRayon, Worker |
| PATCH | /assets/:id | Update asset | Admin |
| DELETE | /assets/:id | Delete asset (soft delete) | Admin |
| POST | /assets/:id/assign | Assign to worker/area | Admin, KepalaRayon |
| POST | /assets/:id/return | Return asset | Admin, KepalaRayon, Worker |
| GET | /assets/:id/history | Assignment history | Admin, KepalaRayon |
| POST | /maintenance | Create maintenance record | Admin, KepalaRayon |
| GET | /maintenance | List maintenance (filter by asset, date) | Admin, KepalaRayon |
| GET | /maintenance/:id | Get maintenance details | Admin, KepalaRayon |
| PATCH | /maintenance/:id | Update maintenance | Admin, KepalaRayon |
| DELETE | /maintenance/:id | Delete maintenance | Admin |
| GET | /maintenance/schedule | Upcoming maintenance | Admin, KepalaRayon |
| POST | /maintenance/:id/complete | Mark maintenance complete | Admin, KepalaRayon |

#### DTOs

```typescript
// dto/create-asset.dto.ts
export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  assetCode: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(['tool', 'equipment', 'vehicle'])
  assetType: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @IsDateString()
  @IsOptional()
  warrantyExpiry?: string;

  @IsUrl()
  @IsOptional()
  photoUrl?: string;
}

// dto/assign-asset.dto.ts
export class AssignAssetDto {
  @IsUUID()
  @IsOptional()
  assignedToUser?: string;

  @IsUUID()
  @IsOptional()
  assignedToArea?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
```

---

## Part C: iOS Platform Support (Weeks 5-6)

### Module: Auth (Apple Sign-In)

**Location:** `be/src/modules/auth/`

#### Apple Sign-In Verification

```typescript
// auth/strategies/apple.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor() {
    super({
      clientID: process.env.APPLE_CLIENT_ID,
      teamID: process.env.APPLE_TEAM_ID,
      keyID: process.env.APPLE_KEY_ID,
      privateKeyLocation: process.env.APPLE_PRIVATE_KEY_PATH,
      callbackURL: process.env.APPLE_CALLBACK_URL,
      scope: ['name', 'email'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any) {
    const { email, name } = profile;
    return {
      email,
      firstName: name?.firstName,
      lastName: name?.lastName,
      provider: 'apple',
    };
  }
}
```

#### API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /auth/apple | Apple Sign-In verification | Public |
| POST | /auth/apple/verify-token | Verify Apple ID token | Public |

### Module: Notifications (APNs)

**Location:** `be/src/modules/notifications/`

#### APNs Device Token Support

```typescript
// notifications/services/apns.service.ts
import { Injectable } from '@nestjs/common';
import * as apn from 'apn';

@Injectable()
export class ApnsService {
  private provider: apn.Provider;

  constructor() {
    this.provider = new apn.Provider({
      token: {
        key: process.env.APNS_KEY_PATH,
        keyId: process.env.APNS_KEY_ID,
        teamId: process.env.APPLE_TEAM_ID,
      },
      production: process.env.NODE_ENV === 'production',
    });
  }

  async sendNotification(deviceToken: string, payload: any) {
    const notification = new apn.Notification();
    notification.alert = payload.title;
    notification.body = payload.body;
    notification.sound = 'default';
    notification.badge = 1;
    notification.payload = payload.data;

    const result = await this.provider.send(notification, deviceToken);
    return result;
  }
}
```

### Module: Security (App Attest)

**Location:** `be/src/modules/security/`

#### App Attest Verification

```typescript
// security/services/app-attest.service.ts
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class AppAttestService {
  async generateChallenge(): Promise<string> {
    return crypto.randomBytes(32).toString('base64');
  }

  async verifyAttestation(keyId: string, attestation: string, challenge: string): Promise<boolean> {
    // Verify the attestation against the challenge
    // Implementation follows Apple's App Attest documentation
    // https://developer.apple.com/documentation/devicecheck/validating_apps_that_connect_to_your_server

    try {
      // 1. Decode attestation
      // 2. Verify certificate chain
      // 3. Verify nonce matches challenge
      // 4. Verify app ID
      // 5. Store public key for future assertions

      return true;
    } catch (error) {
      console.error('App Attest verification failed:', error);
      return false;
    }
  }

  async verifyAssertion(keyId: string, assertion: string, clientData: string): Promise<boolean> {
    // Verify subsequent assertions using stored public key
    try {
      // 1. Retrieve stored public key for keyId
      // 2. Verify signature
      // 3. Verify client data hash
      // 4. Update assertion counter

      return true;
    } catch (error) {
      console.error('Assertion verification failed:', error);
      return false;
    }
  }
}
```

#### API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /security/attestation/challenge | Generate attestation challenge | Authenticated |
| POST | /security/attestation/verify | Verify app attestation | Authenticated |
| POST | /security/assertion/verify | Verify app assertion | Authenticated |

---

## Environment Variables

Add to `be/.env`:

```bash
# Analytics & Reporting
ANALYTICS_CACHE_TTL=300 # 5 minutes
REPORT_GENERATION_TIMEOUT=60000 # 60 seconds
REPORT_STORAGE_PATH=reports/
SES_EMAIL_FROM=noreply@sekar.dlhsurabaya.go.id

# Asset Management
ASSET_QR_CODE_PREFIX=SEKAR-
MAINTENANCE_ALERT_DAYS=7 # Days before maintenance due

# iOS Platform
APPLE_CLIENT_ID=com.dlhsurabaya.sekar
APPLE_TEAM_ID=<your-team-id>
APPLE_KEY_ID=<your-key-id>
APPLE_PRIVATE_KEY_PATH=./config/apple-key.p8
APPLE_CALLBACK_URL=https://api.sekar.dlhsurabaya.go.id/auth/apple/callback

# APNs
APNS_KEY_PATH=./config/apns-key.p8
APNS_KEY_ID=<your-apns-key-id>
APNS_PRODUCTION=false

# App Attest
APP_ATTEST_ENABLED=true
APP_BUNDLE_ID=com.dlhsurabaya.sekar
```

---

## Testing Requirements

### Unit Tests

Each module must have >80% test coverage:

```bash
# Analytics
npm test -- analytics.service.spec.ts
npm test -- analytics.controller.spec.ts

# Reports
npm test -- reports.service.spec.ts
npm test -- reports.controller.spec.ts

# Assets
npm test -- assets.service.spec.ts
npm test -- assets.controller.spec.ts

# Maintenance
npm test -- maintenance.service.spec.ts
npm test -- maintenance.controller.spec.ts

# Apple Auth
npm test -- apple.strategy.spec.ts

# APNs
npm test -- apns.service.spec.ts

# App Attest
npm test -- app-attest.service.spec.ts
```

### Integration Tests

```bash
# Test analytics endpoints
npm run test:e2e -- analytics.e2e-spec.ts

# Test report generation
npm run test:e2e -- reports.e2e-spec.ts

# Test asset management
npm run test:e2e -- assets.e2e-spec.ts
```

---

## Success Criteria

**Analytics:**
- [ ] All analytics queries return within 2 seconds
- [ ] Dashboard metrics are accurate
- [ ] Reports can be exported in PDF, CSV, Excel
- [ ] Automated reports send via email on schedule
- [ ] Test coverage >80%

**Assets:**
- [ ] QR codes are unique and scannable
- [ ] Asset assignment tracking works correctly
- [ ] Maintenance alerts sent 7 days before due
- [ ] Asset history is complete and accurate
- [ ] Test coverage >80%

**iOS:**
- [ ] Apple Sign-In works correctly
- [ ] APNs notifications delivered successfully
- [ ] App Attest verification passes
- [ ] iOS-specific endpoints tested
- [ ] Test coverage >80%

---

## Related Documentation

- [Mobile Implementation](./mobile.md)
- [Web Implementation](./web.md)
- [iOS Platform](./ios.md)
- [Testing Guide](./testing.md)
- [Timeline](./timeline.md)
