# Monitoring and Observability

Comprehensive monitoring, logging, and observability specifications for SEKAR production operations.

**What's live vs planned (2026-06):**
- **LIVE:** Health endpoints (`/api/v1/health/live`, `/api/v1/health/ready` with DB + Redis checks), Docker container logs, Redis monitoring
- **STAGING-ONLY:** CloudWatch metrics/dashboards (AWS EC2 `t3.micro` sole tenant; shared RDS `dlhsby` — SEKAR cannot own RDS-level alarms)
- **WIRED, DORMANT:** Sentry error tracking — SDK integrated across **backend** (`apps/be/src/common/sentry`), **web** (`apps/web/src/instrumentation*.ts` + `global-error.tsx`), and **mobile** (`apps/mobile/src/services/crashReporting`). All no-op until a DSN is configured (`SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN_MOBILE`). Create a Sentry project and set those to go live.
- **PLANNED/NOT LIVE:** dedicated dashboards, production monitoring specification (on-prem Docker logs only for now)
- **Authoritative hub:** [`README.md`](./README.md) for infra layout; [`ci-cd.md`](./ci-cd.md) for pipeline.

## Overview

This document defines the monitoring strategy, alerting rules, log aggregation, performance tracking, and incident response procedures for the SEKAR system. Covers staging (AWS shared) and production (on-prem Docker) environments. Goal: rapid issue detection and fast resolution.

---

## 1. Monitoring Architecture

### Observability Stack

```
┌─────────────────────────────────────────────────────────┐
│                   Application Layer                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Backend  │  │  Mobile  │  │   Web    │             │
│  │   API    │  │   App    │  │Dashboard │             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
└───────┼─────────────┼─────────────┼───────────────────┘
        │             │             │
        │ Logs        │ Errors      │ Metrics
        ↓             ↓             ↓
┌─────────────────────────────────────────────────────────┐
│              Observability Services                      │
│                                                          │
│  ┌──────────────────┐  ┌──────────────────┐           │
│  │  CloudWatch      │  │     Sentry       │           │
│  │  - Logs          │  │  - Error tracking│           │
│  │  - Metrics       │  │  - Performance   │           │
│  │  - Alarms        │  │  - Release health│           │
│  │  - Dashboards    │  │    (Phase 2+)    │           │
│  └──────────────────┘  └──────────────────┘           │
│                                                          │
│  ┌──────────────────┐  ┌──────────────────┐           │
│  │  RDS Monitoring  │  │   S3 Analytics   │           │
│  │  - Performance   │  │  - Storage metrics│          │
│  │    Insights      │  │  - Access logs    │          │
│  │  - Enhanced Mon. │  │  - Cost tracking  │          │
│  └──────────────────┘  └──────────────────┘           │
└─────────────────────────────────────────────────────────┘
        │
        ↓ Alerts
┌─────────────────────────────────────────────────────────┐
│              Notification Channels                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
│  │   Email    │  │   Slack    │  │    SMS     │       │
│  │ (Critical) │  │  (All)     │  │(Critical)  │       │
│  └────────────┘  └────────────┘  └────────────┘       │
└─────────────────────────────────────────────────────────┘
```

### Monitoring Layers

| Layer | Tools | Scope |
|-------|-------|-------|
| **Infrastructure (Staging)** | CloudWatch, AWS Health Dashboard | EC2 t3.micro sole tenant (dlhsby box) |
| **Infrastructure (Production)** | Docker logs, basic host monitoring | On-prem VM (not yet fully specified) |
| **Application** | CloudWatch Logs (staging), Docker logs (prod) | API performance, business metrics |
| **Database (Staging)** | RDS Performance Insights, CloudWatch (limited — shared RDS) | Query perf, connections (partial visibility) |
| **Database (Production)** | Docker-Compose logs, PostgreSQL logs | Query perf (manual inspection) |
| **Errors** | Sentry — wired (backend + web + mobile), dormant until a DSN is set | Error tracking, stack traces |
| **Health Endpoints** | `/api/v1/health/live`, `/api/v1/health/ready` | DB + Redis connectivity checks (LIVE) |

---

## 2. CloudWatch Dashboards (Staging Only)

**Note:** These dashboards apply to staging (AWS EC2 sole tenant). SEKAR cannot own alarms on shared RDS. Production (on-prem) monitoring is not yet specified.

### Dashboard 1: System Overview (Staging)

**Name:** `SEKAR-Staging-Overview`
**Refresh:** Auto (1 minute)

**Widgets:**

#### Row 1: API Health
| Widget | Type | Metric | Period |
|--------|------|--------|--------|
| Request Count | Number | `AWS/ApplicationELB/RequestCount` | 5 min |
| Average Latency | Line | `AWS/ApplicationELB/TargetResponseTime` | 1 min |
| Error Rate (4xx) | Line | `AWS/ApplicationELB/HTTPCode_Target_4XX_Count` | 5 min |
| Error Rate (5xx) | Line | `AWS/ApplicationELB/HTTPCode_Target_5XX_Count` | 5 min |

#### Row 2: Infrastructure
| Widget | Type | Metric | Period |
|--------|------|--------|--------|
| CPU Utilization | Line | `AWS/EC2/CPUUtilization` | 5 min |
| Memory Usage | Line | `CWAgent/mem_used_percent` | 5 min |
| Network In | Line | `AWS/EC2/NetworkIn` | 5 min |
| Network Out | Line | `AWS/EC2/NetworkOut` | 5 min |

#### Row 3: Database
| Widget | Type | Metric | Period |
|--------|------|--------|--------|
| DB Connections | Line | `AWS/RDS/DatabaseConnections` | 5 min |
| Read Latency | Line | `AWS/RDS/ReadLatency` | 1 min |
| Write Latency | Line | `AWS/RDS/WriteLatency` | 1 min |
| Free Storage | Line | `AWS/RDS/FreeStorageSpace` | 5 min |

#### Row 4: Storage (S3)
| Widget | Type | Metric | Period |
|--------|------|--------|--------|
| S3 Requests | Number | `AWS/S3/AllRequests` | 5 min |
| S3 4xx Errors | Number | `AWS/S3/4xxErrors` | 5 min |
| S3 5xx Errors | Number | `AWS/S3/5xxErrors` | 5 min |
| Storage Size | Number | `AWS/S3/BucketSizeBytes` | 1 day |

---

### Dashboard 2: Application Performance (Staging)

**Name:** `SEKAR-Application-Metrics` (staging)
**Refresh:** Auto (1 minute)

**Custom Metrics (logged by backend):**

#### API Endpoint Performance
```typescript
// Backend: Log custom metrics
import { CloudWatch } from '@aws-sdk/client-cloudwatch';

async function logMetric(name: string, value: number, unit: string) {
  await cloudwatch.putMetricData({
    Namespace: 'SEKAR/API',
    MetricData: [{
      MetricName: name,
      Value: value,
      Unit: unit,
      Timestamp: new Date(),
    }],
  });
}

// Usage
await logMetric('ClockInSuccess', 1, 'Count');
await logMetric('ClockInDuration', 523, 'Milliseconds');
```

**Tracked Metrics:**
| Metric | Unit | Description |
|--------|------|-------------|
| `ClockInSuccess` | Count | Successful clock-ins |
| `ClockInFailure` | Count | Failed clock-ins |
| `ClockInDuration` | Milliseconds | Clock-in API response time |
| `ReportSubmitSuccess` | Count | Successful report submissions |
| `ReportSubmitFailure` | Count | Failed report submissions |
| `LocationPingBatchSize` | Count | Size of location ping batches |
| `S3UploadSuccess` | Count | Successful S3 uploads |
| `S3UploadFailure` | Count | Failed S3 uploads |
| `S3UploadDuration` | Milliseconds | S3 upload time |
| `ActiveWorkers` | Count | Currently clocked-in workers |
| `ActiveShifts` | Count | Active shifts |

---

### Dashboard 3: Business Metrics (Staging)

**Name:** `SEKAR-Business-KPIs`
**Refresh:** Manual (5 minutes)
**Scope:** Staging only; production business metrics TBD

**Widgets:**

#### Daily Operations
| Widget | Type | Query/Metric | Period |
|--------|------|--------------|--------|
| Active Workers Now | Number | Custom CloudWatch query | Real-time |
| Shifts Today | Number | Custom CloudWatch query | 1 day |
| Reports Today | Number | Custom CloudWatch query | 1 day |
| Photos Uploaded Today | Number | S3 metrics | 1 day |

#### Trends (Last 7 Days)
| Widget | Type | Data Source | Visualization |
|--------|------|-------------|---------------|
| Daily Shift Count | Line | CloudWatch Logs Insights | Line chart |
| Daily Report Count | Line | CloudWatch Logs Insights | Line chart |
| Average Shift Duration | Line | CloudWatch Logs Insights | Line chart |
| GPS Accuracy Distribution | Bar | CloudWatch Logs Insights | Bar chart |

**CloudWatch Logs Insights Queries:**

**Query 1: Active Workers Right Now**
```
fields @timestamp, worker_id
| filter @message like /clock-in/
| filter @timestamp > ago(12h)
| stats latest(@timestamp) as last_clock_in by worker_id
| filter last_clock_in > ago(15m)
| count()
```

**Query 2: Shifts Today**
```
fields @timestamp
| filter @message like /shift created/
| filter @timestamp > ago(1d)
| count()
```

**Query 3: Reports Today**
```
fields @timestamp
| filter @message like /report submitted/
| filter @timestamp > ago(1d)
| count()
```

**Query 4: Average Shift Duration**
```
fields @timestamp, duration_minutes
| filter @message like /shift completed/
| filter @timestamp > ago(7d)
| stats avg(duration_minutes) by bin(@timestamp, 1d)
```

---

## 3. CloudWatch Alarms (Staging Only)

**Important:** These alarms are for the staging environment (AWS shared box with KPI). SEKAR does not own shared RDS or EC2 alarms. Production (on-prem) alerting is not yet specified.

### Critical Alarms (Immediate Response Required, Staging)

#### Alarm 1: API Health Check Failed

**Metric:** `AWS/ApplicationELB/UnHealthyHostCount`
**Threshold:** > 0 for 2 consecutive periods (2 minutes)
**Action:** SNS → Email + SMS + Slack
**Priority:** P0 - Critical

```yaml
AlarmName: SEKAR-Prod-UnhealthyHosts
MetricName: UnHealthyHostCount
Namespace: AWS/ApplicationELB
Statistic: Average
Period: 60
EvaluationPeriods: 2
Threshold: 0
ComparisonOperator: GreaterThanThreshold
TreatMissingData: notBreaching
Actions:
  - arn:aws:sns:ap-southeast-3:ACCOUNT_ID:sekar-critical-alerts
```

#### Alarm 2: API 5xx Error Rate High

**Metric:** `AWS/ApplicationELB/HTTPCode_Target_5XX_Count`
**Threshold:** > 10 errors in 5 minutes
**Action:** SNS → Email + Slack
**Priority:** P0 - Critical

```yaml
AlarmName: SEKAR-Prod-5xxErrors
MetricName: HTTPCode_Target_5XX_Count
Namespace: AWS/ApplicationELB
Statistic: Sum
Period: 300
EvaluationPeriods: 1
Threshold: 10
ComparisonOperator: GreaterThanThreshold
TreatMissingData: notBreaching
Actions:
  - arn:aws:sns:ap-southeast-3:ACCOUNT_ID:sekar-critical-alerts
```

#### Alarm 3: Database CPU High (Shared RDS)

**Metric:** `AWS/RDS/CPUUtilization` (dlhsby — shared with KPI)
**Threshold:** > 80% for 5 consecutive periods (5 minutes)
**Action:** SNS → Email + Slack (informational; SEKAR cannot act on shared resource)
**Priority:** P1 - High
**Note:** RDS alarms are limited — this is a shared resource; coordinate with KPI team.

```yaml
AlarmName: SEKAR-Staging-DB-CPUHigh
MetricName: CPUUtilization
Namespace: AWS/RDS
Dimensions:
  - Name: DBInstanceIdentifier
    Value: dlhsby
Statistic: Average
Period: 60
EvaluationPeriods: 5
Threshold: 80
ComparisonOperator: GreaterThanThreshold
Actions:
  - arn:aws:sns:ap-southeast-3:659828096624:sekar-high-alerts
```

#### Alarm 4: Database Storage Low (Shared RDS)

**Metric:** `AWS/RDS/FreeStorageSpace` (dlhsby — shared with KPI)
**Threshold:** < 10 GB
**Action:** SNS → Email + Slack (informational; SEKAR cannot act on shared resource)
**Priority:** P1 - High
**Note:** RDS alarms are limited — this is a shared resource; coordinate with KPI team.

```yaml
AlarmName: SEKAR-Staging-DB-StorageLow
MetricName: FreeStorageSpace
Namespace: AWS/RDS
Dimensions:
  - Name: DBInstanceIdentifier
    Value: dlhsby
Statistic: Average
Period: 300
EvaluationPeriods: 1
Threshold: 10737418240  # 10 GB in bytes
ComparisonOperator: LessThanThreshold
Actions:
  - arn:aws:sns:ap-southeast-3:659828096624:sekar-high-alerts
```

### Warning Alarms (Staging Only)

#### Alarm 5: API Latency High

**Metric:** `AWS/ApplicationELB/TargetResponseTime`
**Threshold:** > 2 seconds for 3 consecutive periods (3 minutes)
**Action:** SNS → Slack only
**Priority:** P2 - Medium
**Scope:** Staging only

```yaml
AlarmName: SEKAR-Staging-LatencyHigh
MetricName: TargetResponseTime
Namespace: AWS/ApplicationELB
Statistic: Average
Period: 60
EvaluationPeriods: 3
Threshold: 2.0
ComparisonOperator: GreaterThanThreshold
Actions:
  - arn:aws:sns:ap-southeast-3:659828096624:sekar-warning-alerts
```

#### Alarm 6: Database Connections High (Shared RDS)

**Metric:** `AWS/RDS/DatabaseConnections` (dlhsby)
**Threshold:** > 80 connections
**Action:** SNS → Slack only (informational; shared resource)
**Priority:** P2 - Medium

```yaml
AlarmName: SEKAR-Staging-DB-ConnectionsHigh
MetricName: DatabaseConnections
Namespace: AWS/RDS
Dimensions:
  - Name: DBInstanceIdentifier
    Value: dlhsby
Statistic: Average
Period: 300
EvaluationPeriods: 2
Threshold: 80
ComparisonOperator: GreaterThanThreshold
Actions:
  - arn:aws:sns:ap-southeast-3:659828096624:sekar-warning-alerts
```

#### Alarm 7: S3 Upload Failures (Staging)

**Metric:** Custom metric `SEKAR/API/S3UploadFailure`
**Threshold:** > 5 failures in 5 minutes
**Action:** SNS → Slack only
**Priority:** P2 - Medium
**Scope:** Staging only

```yaml
AlarmName: SEKAR-Staging-S3UploadFailures
MetricName: S3UploadFailure
Namespace: SEKAR/API
Statistic: Sum
Period: 300
EvaluationPeriods: 1
Threshold: 5
ComparisonOperator: GreaterThanThreshold
TreatMissingData: notBreaching
Actions:
  - arn:aws:sns:ap-southeast-3:659828096624:sekar-warning-alerts
```

#### Alarm 8: Root Disk Full (Staging) — ✅ LIVE (provisioned 2026-07-13)

**Unlike Alarms 1–7 above (reference designs, mostly ALB-based which staging does
not use), this alarm is actually deployed.** It exists because a Puppeteer temp-file
leak filled the box's 30GB root disk and took the API down (see ADR-024).

- **Metric:** custom `SEKAR/Staging` → `RootDiskUsedPercent` (dim `InstanceId=i-08edccdc966c0985e`).
  Published every 5 min by a **systemd timer** `sekar-disk-metric.timer` on the box
  (`/usr/local/bin/sekar-disk-metric.sh` → `df` → `cloudwatch put-metric-data`).
  Chosen over the CloudWatch **agent** (which would add ~40MB resident RAM to a
  RAM-saturated, already-swapping t3.micro).
- **IAM:** inline policy `sekar-cloudwatch-metrics` on `dlhsby-ec2-role` grants
  `cloudwatch:PutMetricData` scoped to namespace `SEKAR/Staging`.
- **Notification:** SNS topic `sekar-staging-alerts` → email `admin@wahyutrip.com`
  (⚠ subscription must be **confirmed** via the emailed link before alerts arrive).

```yaml
AlarmName: SEKAR-Staging-RootDiskHigh
Namespace: SEKAR/Staging
MetricName: RootDiskUsedPercent
Dimensions:
  - Name: InstanceId
    Value: i-08edccdc966c0985e
Statistic: Maximum
Period: 300
EvaluationPeriods: 2        # > 80% sustained ~10 min
Threshold: 80
ComparisonOperator: GreaterThanThreshold
TreatMissingData: notBreaching
AlarmActions: [arn:aws:sns:ap-southeast-3:659828096624:sekar-staging-alerts]
OKActions:    [arn:aws:sns:ap-southeast-3:659828096624:sekar-staging-alerts]
```

Reproduce/verify: `scripts/ops/setup-staging-disk-alarm.sh` (idempotent). Runbook on
fire: `specs/deployment/operations.md` → "Disk Space Full".

### Alarm Summary Table

| Alarm | Priority | Threshold | Notification | Auto-Action |
|-------|----------|-----------|--------------|-------------|
| **Root Disk Full (LIVE)** | P1 | > 80% for 10 min | Email | None |
| Unhealthy Hosts | P0 | > 0 for 2 min | Email + SMS + Slack | None |
| 5xx Errors | P0 | > 10 in 5 min | Email + Slack | None |
| DB CPU High | P1 | > 80% for 5 min | Email + Slack | Scale up (Phase 2+) |
| DB Storage Low | P1 | < 10 GB | Email + Slack | Increase storage |
| High Latency | P2 | > 2s for 3 min | Slack | None |
| DB Connections | P2 | > 80 | Slack | None |
| S3 Failures | P2 | > 5 in 5 min | Slack | None |

---

## 4. Log Aggregation

### Staging (CloudWatch Log Groups)

#### Application Logs (Staging)

**Log Group:** `/aws/sekar-staging/backend` (Docker container logs forwarded to CloudWatch)
**Retention:** 30 days
**Format:** JSON structured logs

**Log Structure:**
```json
{
  "timestamp": "2026-01-16T10:30:45.123Z",
  "level": "info",
  "message": "Clock-in successful",
  "context": {
    "userId": "uuid-here",
    "workerId": "uuid-here",
    "locationId": "uuid-here",
    "shiftId": "uuid-here",
    "gps": {
      "lat": -7.290500,
      "lng": 112.739800,
      "accuracy": 12.5
    },
    "duration_ms": 523
  },
  "requestId": "uuid-here"
}
```

#### Error Logs (Staging)

**Log Group:** `/aws/sekar-staging/backend-errors`
**Retention:** 90 days
**Format:** JSON with stack traces

**Log Structure:**
```json
{
  "timestamp": "2026-01-16T10:30:45.123Z",
  "level": "error",
  "message": "Failed to upload to S3",
  "error": {
    "name": "S3ServiceException",
    "message": "Access Denied",
    "stack": "Error: Access Denied\n    at ..."
  },
  "context": {
    "userId": "uuid-here",
    "bucket": "sekar-prod-media",
    "key": "selfies/2026/01/worker1_uuid_timestamp.jpg"
  },
  "requestId": "uuid-here"
}
```

#### Database Logs (Staging, Shared RDS)

**Log Group:** `/aws/rds/instance/dlhsby/postgresql` (shared, limited visibility)
**Retention:** 7 days
**Format:** PostgreSQL standard log format
**Note:** SEKAR sees logs for its queries only; KPI also writes to this RDS.

**Logged Events:**
- Slow queries (> 1 second)
- Connection errors
- Deadlocks
- Constraint violations

### Production (On-Prem Docker Logs)

**Log Source:** Docker Compose container logs (no centralized aggregation yet)

**Commands:**
```bash
docker compose -f docker-compose.prod.yml logs backend      # Backend logs
docker compose -f docker-compose.prod.yml logs postgres     # PostgreSQL logs
docker compose -f docker-compose.prod.yml logs redis        # Redis logs
```

**Retention:** Docker default (configurable per container in docker-compose.prod.yml)
**Format:** Container stdout/stderr (structured JSON preferred for backend)

**Archival (TBD):** Manual backup to on-prem storage or optional syslog forwarding

### Log Filtering and Parsing

**Filter Pattern: Find All Errors**
```
[timestamp, request_id, level = "error", ...]
```

**Filter Pattern: Find Slow API Calls**
```
[timestamp, request_id, level, message, duration_ms > 1000]
```

**Filter Pattern: Find Failed Clock-ins**
```
[timestamp, request_id, level = "error", message = "*clock-in*"]
```

### Log Insights Saved Queries

**Query 1: Top 10 Slowest Endpoints**
```
fields @timestamp, message, context.endpoint, context.duration_ms
| filter level = "info"
| sort context.duration_ms desc
| limit 10
```

**Query 2: Error Rate by Hour**
```
fields @timestamp
| filter level = "error"
| stats count() by bin(@timestamp, 1h)
```

**Query 3: Workers with Failed Clock-ins**
```
fields @timestamp, context.workerId, message
| filter level = "error" and message like /clock-in/
| stats count() by context.workerId
| sort count desc
```

**Query 4: GPS Accuracy Distribution**
```
fields @timestamp, context.gps.accuracy
| filter message like /location ping/
| stats avg(context.gps.accuracy), max(context.gps.accuracy), min(context.gps.accuracy)
```

---

## 5. Error Tracking with Sentry (WIRED — dormant until a DSN is set)

**Status:** SDK integrated across all three tiers and verified to no-op when no DSN
is configured (so dev/local and an un-provisioned staging stay quiet):
- **Backend** — `apps/be/src/common/sentry/sentry.ts`, init before `NestFactory.create`
  in `main.ts`; 5xx capture in `http-exception.filter.ts`. Env: `SENTRY_DSN`,
  `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_RELEASE`.
- **Web** — `apps/web/src/instrumentation-client.ts` (browser), `instrumentation.ts`
  (server/edge + `onRequestError`), `src/app/global-error.tsx` (React boundary →
  `captureException`), `next.config.ts` wrapped with `withSentryConfig` (source-map
  upload only when `SENTRY_AUTH_TOKEN` is present). Env: `NEXT_PUBLIC_SENTRY_DSN`,
  `NEXT_PUBLIC_SENTRY_ENVIRONMENT`, `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`.
- **Mobile** — `apps/mobile/src/services/crashReporting/sentry.ts`, init in `index.js`
  + `App.tsx`; `MapErrorBoundary` reports via `captureException`. Env:
  `SENTRY_DSN_MOBILE`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`.

**To activate:** create a Sentry project (one per tier or a shared project filtered
by environment), then set the DSN env(s) above. For web/CI source maps also set
`SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`.

### Sentry Configuration reference

#### Backend Integration (Planned)

```typescript
// src/main.ts — planned, not implemented
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: `sekar-backend@${process.env.APP_VERSION}`,
  tracesSampleRate: 0.1, // 10% of transactions
  beforeSend(event, hint) {
    if (event.request?.headers) {
      delete event.request.headers.authorization;
    }
    return event;
  },
});
```

#### Mobile Integration (Planned)

```typescript
// App.tsx — planned, not implemented
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: Config.SENTRY_DSN,
  environment: Config.ENV,
  release: `sekar-mobile@${Config.VERSION}`,
  tracesSampleRate: 0.2, // 20% of transactions
});
```

### Planned Sentry Dashboards & Alerts

- Backend error frequency, rate trends, stack trace grouping
- Mobile crash-free rate, top crash reasons
- Alerts: High error rate (>10/min), new error types, performance degradation

**Current alternative:** Docker logs and ad-hoc inspection (staging) / `docker compose logs` (production).

---

## 6. Performance Monitoring

### Application Performance Metrics

#### API Response Times

**Percentiles:**
- P50 (Median): Target < 200ms
- P95: Target < 500ms
- P99: Target < 1000ms

**Tracked per Endpoint:**
- `POST /api/auth/login`
- `POST /api/shifts/clock-in`
- `POST /api/shifts/clock-out`
- `POST /api/reports/create`
- `POST /api/location/batch`
- `GET /api/supervisor/active-workers`

#### Database Query Performance

**RDS Performance Insights:**
- Top SQL statements by execution time
- Wait events (locks, I/O)
- Database load (active sessions)

**Slow Query Log:**
- Queries taking > 1 second
- Logged to CloudWatch
- Weekly review and optimization

#### S3 Upload Performance

**Metrics:**
- Average upload time
- P95 upload time
- Upload failure rate
- Retry count

### Mobile App Performance (Phase 2+)

**Firebase Performance Monitoring:**
- App startup time
- Screen rendering time
- Network request duration
- Custom traces (clock-in flow, report submission)

**Metrics:**
| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| App Startup (Cold) | < 3s | > 5s |
| App Startup (Warm) | < 1s | > 2s |
| Clock-in Flow Duration | < 5s | > 10s |
| Report Submit Duration | < 3s | > 8s |

---

## 7. Health Checks (LIVE)

### Live Health Endpoints

**Endpoints:** `GET /api/v1/health/live` and `GET /api/v1/health/ready`

**Status:** LIVE in both staging and production.

**Checks Included:**
- Database connectivity (SELECT 1)
- Redis connectivity

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-06-19T10:30:45.123Z",
  "checks": {
    "database": "ok",
    "redis": "ok"
  }
}
```

**Usage:**
- Staging: CloudWatch health checks (via ELB) — can trigger alarms if endpoints return non-200
- Production (on-prem): Manual monitoring, health check integration (e.g., systemd watchdog, supervisor)
- External: Periodic pings from monitoring tools (e.g., UptimeRobot, Pingdom)

**Deep Health Check (Planned):**
- Database connection pool stats, memory, CPU, error rate — not yet implemented

---

## 8. Alerting Rules (Staging Only)

### Notification Channels (Staging)

#### SNS Topics (AWS ap-southeast-3, Account 659828096624)

**Topic 1: Critical Alerts**
- **Name:** `sekar-critical-alerts`
- **Subscribers:**
  - Email: devops@wahyutrip.com, lead@wahyutrip.com
  - Slack: #sekar-critical channel

**Topic 2: High Priority Alerts**
- **Name:** `sekar-high-alerts`
- **Subscribers:**
  - Email: devops@wahyutrip.com
  - Slack: #sekar-alerts channel

**Topic 3: Warning Alerts**
- **Name:** `sekar-warning-alerts`
- **Subscribers:**
  - Slack: #sekar-monitoring channel

### Notification Channels (Production, On-Prem)

**Status:** Not yet specified. Currently manual monitoring.

**Future options (TBD):**
- Slack webhooks (direct container → Slack)
- Email (optional)
- On-prem monitoring system (Prometheus, Grafana, etc.)

#### Slack Integration

**Setup Slack Webhook:**
```bash
# Create incoming webhook in Slack
# Channels: #sekar-critical, #sekar-alerts, #sekar-monitoring

# Subscribe SNS to Slack via Lambda (AWS Chatbot)
# Or use direct webhook integration
```

**Alert Format:**
```json
{
  "text": "🚨 CRITICAL: Unhealthy hosts detected",
  "attachments": [{
    "color": "danger",
    "fields": [
      {"title": "Alarm", "value": "SEKAR-Prod-UnhealthyHosts", "short": true},
      {"title": "Environment", "value": "Production", "short": true},
      {"title": "Metric", "value": "UnHealthyHostCount > 0", "short": true},
      {"title": "Time", "value": "2026-01-16 10:30:45 WIB", "short": true}
    ],
    "actions": [
      {"type": "button", "text": "View Dashboard", "url": "https://console.aws.amazon.com/cloudwatch/..."},
      {"type": "button", "text": "View Logs", "url": "https://console.aws.amazon.com/cloudwatch/logs/..."}
    ]
  }]
}
```

### On-Call Rotation (Phase 2+)

**Schedule:**
- Week 1: Engineer A (Primary), Engineer B (Backup)
- Week 2: Engineer B (Primary), Engineer C (Backup)
- Week 3: Engineer C (Primary), Engineer A (Backup)

**Escalation:**
1. Alert sent to on-call engineer (SMS + Email + Slack)
2. If no acknowledgment in 15 minutes → Escalate to backup
3. If no acknowledgment in 30 minutes → Escalate to team lead

**Tools:**
- PagerDuty (Phase 2+)
- Opsgenie (alternative)

---

## 9. Incident Response

### Incident Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **P0 - Critical** | System down, data loss | < 15 minutes | All API requests failing, database unavailable |
| **P1 - High** | Major feature broken | < 1 hour | Clock-in not working, reports failing |
| **P2 - Medium** | Minor feature broken | < 4 hours | Slow performance, S3 upload delays |
| **P3 - Low** | Cosmetic issue | < 24 hours | UI glitch, minor typo |

### Incident Response Procedures

#### Step 1: Detect and Alert

**Automated:**
- CloudWatch alarm triggers
- Sentry error threshold exceeded
- Health check fails

**Manual:**
- User report via support channel
- Team member notices issue

#### Step 2: Acknowledge

**Actions:**
1. Acknowledge alert in Slack/PagerDuty
2. Create incident ticket in Jira/GitHub Issues
3. Notify team in #sekar-incidents channel
4. Assign incident commander (IC)

**Template:**
```
INCIDENT #2026-001 - API Unavailable
Severity: P0
Detected: 2026-01-16 10:30 WIB
IC: Ahmad (DevOps)
Status: Investigating
```

#### Step 3: Investigate

**Checklist:**
- [ ] Check CloudWatch dashboard
- [ ] Review recent deployments
- [ ] Check error logs in CloudWatch
- [ ] Verify AWS service health (AWS Health Dashboard)
- [ ] Check database status
- [ ] Check S3 bucket accessibility
- [ ] Review recent code changes

**Communication:**
- Update incident ticket every 15 minutes
- Post updates in #sekar-incidents channel
- Notify stakeholders if P0/P1

#### Step 4: Mitigate

**For API issues (Staging):**
```bash
# Restart backend via SSM Run Command (on AWS box)
aws ssm send-command \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["cd /opt/sekar && docker compose restart backend"]' \
  --targets "Key=tag:Name,Values=sekar-staging"

# Or rollback: re-deploy previous commit via GitHub Actions
```

**For API issues (Production, On-Prem):**
```bash
# SSH to on-prem box and restart
docker compose -f docker-compose.prod.yml restart backend

# Or rollback
git checkout <previous-sha>
docker compose -f docker-compose.prod.yml up -d --build
```

**For database issues (Staging, Shared RDS):**
- **Cannot act independently** — coordinate with KPI team on RDS restart/failover
- If SEKAR-specific connections exhausted: kill idle connections from backend

**For database issues (Production, On-Prem):**
```bash
docker compose -f docker-compose.prod.yml restart postgres
# Or restore from backup (manual, TBD)
```

**For S3/MinIO issues (Staging):**
- Check AWS S3 service status
- Verify IAM role permissions

**For MinIO issues (Production):**
```bash
docker compose -f docker-compose.prod.yml logs minio
# or restart
docker compose -f docker-compose.prod.yml restart minio
```

#### Step 5: Resolve

**Actions:**
1. Verify fix in production
2. Monitor for 30 minutes
3. Mark incident as resolved
4. Notify stakeholders
5. Schedule post-mortem

**Communication:**
```
INCIDENT #2026-001 - RESOLVED
Severity: P0
Detected: 2026-01-16 10:30 WIB
Resolved: 2026-01-16 11:15 WIB
Duration: 45 minutes
Root Cause: Database connection pool exhausted
Fix: Restarted API servers, increased pool size
Post-mortem: Scheduled for 2026-01-17 14:00 WIB
```

#### Step 6: Post-Mortem

**Template:**
```markdown
# Post-Mortem: Incident #2026-001

## Summary
Brief description of what happened.

## Timeline
- 10:30 - Alert triggered: Unhealthy hosts
- 10:32 - Acknowledged, began investigation
- 10:45 - Root cause identified: DB connection pool exhausted
- 11:00 - Mitigation applied: Restarted API servers
- 11:15 - Service restored, monitoring
- 11:45 - Incident resolved

## Root Cause Analysis
Deep dive into why this happened.

## Impact
- Duration: 45 minutes
- Affected: All API endpoints
- Users impacted: ~50 active workers
- Failed requests: ~200

## What Went Well
- Fast detection (2 minutes)
- Clear runbook available
- Good team communication

## What Didn't Go Well
- Took 15 minutes to identify root cause
- No automatic mitigation
- Monitoring didn't catch leading indicators

## Action Items
- [ ] Increase DB connection pool size (Owner: DevOps, Due: 2026-01-20)
- [ ] Add alarm for connection pool usage (Owner: DevOps, Due: 2026-01-22)
- [ ] Document connection pool tuning (Owner: Backend, Due: 2026-01-25)
- [ ] Implement circuit breaker (Owner: Backend, Due: Phase 2)
```

### Incident Communication

**Status Page (Phase 2+):**
- URL: https://status.sekar.wahyutrip.com
- Provider: Statuspage.io or custom
- Updates: Every 30 minutes during incident

**User Communication:**
- In-app notification: "Service temporarily degraded"
- Email to supervisors if > 1 hour downtime
- Post-incident summary

---

## 10. Cost Monitoring

### Staging (AWS Shared Box)

**Cost Responsibility:** SEKAR shares t3.micro (EC2) + `dlhsby` (RDS) with KPI project. Cannot split costs per application without additional tagging/monitoring.

**Budget Tracking (Shared):**
- AWS Cost Explorer: Filter by tags or project (if available)
- Monthly review with KPI team

### Production (On-Prem)

**Cost:** Hardware + electricity — not AWS. No automated cost dashboards.

### Future Cost Monitoring

If SEKAR gets dedicated infrastructure or moves off-prem to AWS, implement:
- CloudWatch cost dashboards
- Budget alerts per service
- S3 lifecycle policies (move old media to cheaper storage classes)
- RDS right-sizing reviews

---

## 11. Reporting

### Staging-Based Reports

**Weekly Operations Report (Staging Only)**
- Uptime %, average response time, error rate
- CloudWatch dashboard review
- Notable incidents

**Automated via CloudWatch Logs Insights or manual dashboard review.**

### Production Reporting

**Status:** Manual monitoring only. Reports TBD post-deployment.

### Future Reporting

Once production is live, establish:
- Weekly health checks (health endpoint, Docker logs)
- Monthly performance & availability summary
- Incident post-mortems as needed

---

## 12. Tools and Access

### Required Tools

| Tool | Purpose | Scope |
|------|---------|-------|
| **AWS Console** | Staging infrastructure (EC2, RDS, S3) | DevOps (Admin), Team (Read-only) |
| **CloudWatch** | Staging monitoring, logs, alarms | Team (staging only) |
| **Sentry** | Error tracking (all tiers) | Wired — dormant until a DSN is set |
| **Slack** | Staging alerting, communication | Team |
| **GitHub** | Code, CI/CD, production deployments | Team |
| **Docker / docker compose** | Production container management (on-prem) | DevOps |
| **PostgreSQL CLI tools** | Production DB management | DevOps |

### Access Management

**AWS IAM Policies:**
- DevOps: Full access
- Backend Developers: Read-only to CloudWatch, RDS
- Frontend Developers: Read-only to CloudWatch
- QA: Read-only to CloudWatch

**Rotation:**
- Review access quarterly
- Remove access for ex-team members immediately

---

## 13. Monitoring Checklist

### Staging (AWS Shared)

**Daily Checks (Automated)**
- [ ] Health endpoints responding (`/api/v1/health/live`, `/api/v1/health/ready`)
- [ ] No critical CloudWatch alarms
- [ ] Error logs absent or < 1%
- [ ] Average latency < 500ms
- [ ] Docker containers running

**Weekly Checks (Manual)**
- [ ] Review CloudWatch dashboard
- [ ] Check slow query logs (RDS)
- [ ] Review incident tickets
- [ ] Coordinate with KPI team if shared resource issues

### Production (On-Prem)

**Daily Checks (Manual)**
- [ ] Health endpoints responding
- [ ] `docker compose ps` shows all containers up
- [ ] `docker compose logs backend` shows no errors
- [ ] SSH ping to on-prem box succeeds

**Weekly Checks (Manual)**
- [ ] Review Docker logs (last 7 days)
- [ ] Check PostgreSQL disk usage
- [ ] Check Redis memory usage
- [ ] Verify backup completion

**Monthly Checks (Manual)**
- [ ] Full system health review
- [ ] Update runbooks
- [ ] Security log audit
- [ ] Performance review

---

**Document Owner:** DevOps Engineer
**Last Updated:** 2026-06-19
**Status:** Active (staging monitoring), TBD (production)
**Related Docs:** [`README.md`](./README.md), [`ci-cd.md`](./ci-cd.md), [`infrastructure.md`](./infrastructure.md)
