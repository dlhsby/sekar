# Monitoring and Observability

Comprehensive monitoring, logging, and observability specifications for SEKAR production operations.

## Overview

This document defines the monitoring strategy, alerting rules, log aggregation, performance tracking, and incident response procedures for the SEKAR system. The goal is to ensure 99.9% uptime, rapid issue detection, and fast resolution.

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

| Layer | Tools | Purpose |
|-------|-------|---------|
| **Infrastructure** | CloudWatch, AWS Health Dashboard | Server health, network, storage |
| **Application** | CloudWatch Logs, Custom Metrics | API performance, business metrics |
| **Database** | RDS Performance Insights, CloudWatch | Query performance, connections |
| **Errors** | Sentry (Phase 2+) | Error tracking, stack traces |
| **User Experience** | Mobile analytics (Phase 2+) | App crashes, user sessions |
| **Business** | Custom dashboards | KPIs (shifts, reports, workers) |

---

## 2. CloudWatch Dashboards

### Dashboard 1: System Overview

**Name:** `SEKAR-Production-Overview`
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

### Dashboard 2: Application Performance

**Name:** `SEKAR-Application-Metrics`
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

### Dashboard 3: Business Metrics

**Name:** `SEKAR-Business-KPIs`
**Refresh:** Manual (5 minutes)

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

## 3. CloudWatch Alarms

### Critical Alarms (Immediate Response Required)

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
  - arn:aws:sns:ap-southeast-1:ACCOUNT_ID:sekar-critical-alerts
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
  - arn:aws:sns:ap-southeast-1:ACCOUNT_ID:sekar-critical-alerts
```

#### Alarm 3: Database CPU High

**Metric:** `AWS/RDS/CPUUtilization`
**Threshold:** > 80% for 5 consecutive periods (5 minutes)
**Action:** SNS → Email + Slack
**Priority:** P1 - High

```yaml
AlarmName: SEKAR-Prod-DB-CPUHigh
MetricName: CPUUtilization
Namespace: AWS/RDS
Dimensions:
  - Name: DBInstanceIdentifier
    Value: sekar-prod-db
Statistic: Average
Period: 60
EvaluationPeriods: 5
Threshold: 80
ComparisonOperator: GreaterThanThreshold
Actions:
  - arn:aws:sns:ap-southeast-1:ACCOUNT_ID:sekar-high-alerts
```

#### Alarm 4: Database Storage Low

**Metric:** `AWS/RDS/FreeStorageSpace`
**Threshold:** < 10 GB
**Action:** SNS → Email + Slack
**Priority:** P1 - High

```yaml
AlarmName: SEKAR-Prod-DB-StorageLow
MetricName: FreeStorageSpace
Namespace: AWS/RDS
Dimensions:
  - Name: DBInstanceIdentifier
    Value: sekar-prod-db
Statistic: Average
Period: 300
EvaluationPeriods: 1
Threshold: 10737418240  # 10 GB in bytes
ComparisonOperator: LessThanThreshold
Actions:
  - arn:aws:sns:ap-southeast-1:ACCOUNT_ID:sekar-high-alerts
```

### Warning Alarms (Monitor, No Immediate Action)

#### Alarm 5: API Latency High

**Metric:** `AWS/ApplicationELB/TargetResponseTime`
**Threshold:** > 2 seconds for 3 consecutive periods (3 minutes)
**Action:** SNS → Slack only
**Priority:** P2 - Medium

```yaml
AlarmName: SEKAR-Prod-LatencyHigh
MetricName: TargetResponseTime
Namespace: AWS/ApplicationELB
Statistic: Average
Period: 60
EvaluationPeriods: 3
Threshold: 2.0
ComparisonOperator: GreaterThanThreshold
Actions:
  - arn:aws:sns:ap-southeast-1:ACCOUNT_ID:sekar-warning-alerts
```

#### Alarm 6: Database Connections High

**Metric:** `AWS/RDS/DatabaseConnections`
**Threshold:** > 80 connections
**Action:** SNS → Slack only
**Priority:** P2 - Medium

```yaml
AlarmName: SEKAR-Prod-DB-ConnectionsHigh
MetricName: DatabaseConnections
Namespace: AWS/RDS
Dimensions:
  - Name: DBInstanceIdentifier
    Value: sekar-prod-db
Statistic: Average
Period: 300
EvaluationPeriods: 2
Threshold: 80
ComparisonOperator: GreaterThanThreshold
Actions:
  - arn:aws:sns:ap-southeast-1:ACCOUNT_ID:sekar-warning-alerts
```

#### Alarm 7: S3 Upload Failures

**Metric:** Custom metric `SEKAR/API/S3UploadFailure`
**Threshold:** > 5 failures in 5 minutes
**Action:** SNS → Slack only
**Priority:** P2 - Medium

```yaml
AlarmName: SEKAR-Prod-S3UploadFailures
MetricName: S3UploadFailure
Namespace: SEKAR/API
Statistic: Sum
Period: 300
EvaluationPeriods: 1
Threshold: 5
ComparisonOperator: GreaterThanThreshold
TreatMissingData: notBreaching
Actions:
  - arn:aws:sns:ap-southeast-1:ACCOUNT_ID:sekar-warning-alerts
```

### Alarm Summary Table

| Alarm | Priority | Threshold | Notification | Auto-Action |
|-------|----------|-----------|--------------|-------------|
| Unhealthy Hosts | P0 | > 0 for 2 min | Email + SMS + Slack | None |
| 5xx Errors | P0 | > 10 in 5 min | Email + Slack | None |
| DB CPU High | P1 | > 80% for 5 min | Email + Slack | Scale up (Phase 2+) |
| DB Storage Low | P1 | < 10 GB | Email + Slack | Increase storage |
| High Latency | P2 | > 2s for 3 min | Slack | None |
| DB Connections | P2 | > 80 | Slack | None |
| S3 Failures | P2 | > 5 in 5 min | Slack | None |

---

## 4. Log Aggregation

### CloudWatch Log Groups

#### Application Logs

**Log Group:** `/aws/elasticbeanstalk/sekar-prod/var/log/nodejs/nodejs.log`
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
    "areaId": "uuid-here",
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

#### Access Logs

**Log Group:** `/aws/elasticbeanstalk/sekar-prod/var/log/nginx/access.log`
**Retention:** 7 days
**Format:** Combined log format

**Fields:**
- Client IP
- Timestamp
- HTTP method and path
- Status code
- Response size
- User agent
- Response time

#### Error Logs

**Log Group:** `/aws/elasticbeanstalk/sekar-prod/var/log/nodejs/error.log`
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

#### Database Logs

**Log Group:** `/aws/rds/instance/sekar-prod-db/postgresql`
**Retention:** 7 days
**Format:** PostgreSQL standard log format

**Logged Events:**
- Slow queries (> 1 second)
- Connection errors
- Deadlocks
- Constraint violations

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

## 5. Error Tracking with Sentry (Phase 2+)

### Sentry Configuration

#### Backend Integration

```typescript
// src/main.ts
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: `sekar-backend@${process.env.APP_VERSION}`,
  tracesSampleRate: 0.1, // 10% of transactions
  profilesSampleRate: 0.1,
  integrations: [
    new ProfilingIntegration(),
  ],
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request?.headers) {
      delete event.request.headers.authorization;
    }
    return event;
  },
});
```

#### Mobile Integration (React Native)

```typescript
// App.tsx
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: Config.SENTRY_DSN,
  environment: Config.ENV,
  release: `sekar-mobile@${Config.VERSION}`,
  tracesSampleRate: 0.2, // 20% of transactions
  enableAutoSessionTracking: true,
  sessionTrackingIntervalMillis: 30000,
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.user) {
      delete event.user.phone;
    }
    return event;
  },
});
```

### Sentry Dashboards

#### Backend Errors
- Error frequency by endpoint
- Error rate trends
- Most affected users
- Stack trace grouping

#### Mobile Crashes
- Crash-free rate per version
- Top crash reasons
- Affected devices
- OS version distribution

### Sentry Alerts

**Alert 1: High Error Rate**
- Condition: > 10 errors/minute
- Notification: Slack + Email
- Action: Create incident

**Alert 2: New Error Type**
- Condition: New error not seen before
- Notification: Slack
- Action: Investigate

**Alert 3: Performance Degradation**
- Condition: P95 latency > 3 seconds
- Notification: Slack
- Action: Monitor

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

## 7. Health Checks

### API Health Check Endpoint

**Endpoint:** `GET /api/health`

**Implementation:**
```typescript
// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';

@Controller('health')
export class HealthController {
  constructor(
    private dataSource: DataSource,
    private s3Client: S3Client,
  ) {}

  @Get()
  async check() {
    const checks = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: 'unknown',
        s3: 'unknown',
      },
    };

    // Check database
    try {
      await this.dataSource.query('SELECT 1');
      checks.checks.database = 'ok';
    } catch (error) {
      checks.checks.database = 'error';
      checks.status = 'degraded';
    }

    // Check S3
    try {
      await this.s3Client.send(new HeadBucketCommand({
        Bucket: process.env.AWS_S3_BUCKET,
      }));
      checks.checks.s3 = 'ok';
    } catch (error) {
      checks.checks.s3 = 'error';
      checks.status = 'degraded';
    }

    return checks;
  }
}
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-16T10:30:45.123Z",
  "uptime": 12345,
  "checks": {
    "database": "ok",
    "s3": "ok"
  }
}
```

### Deep Health Check (Phase 2+)

**Endpoint:** `GET /api/health/deep`

**Additional Checks:**
- Database connection pool stats
- Memory usage
- CPU usage
- Recent error rate
- Queue depth (if using Bull)

---

## 8. Alerting Rules

### Notification Channels

#### SNS Topics

**Topic 1: Critical Alerts**
- **Name:** `sekar-critical-alerts`
- **Subscribers:**
  - Email: devops@DLH-sby.go.id, lead@DLH-sby.go.id
  - SMS: +6281234567890 (on-call engineer)
  - Slack: #sekar-critical channel

**Topic 2: High Priority Alerts**
- **Name:** `sekar-high-alerts`
- **Subscribers:**
  - Email: devops@DLH-sby.go.id
  - Slack: #sekar-alerts channel

**Topic 3: Warning Alerts**
- **Name:** `sekar-warning-alerts`
- **Subscribers:**
  - Slack: #sekar-monitoring channel

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

**Common Mitigation Actions:**

**For API issues:**
```bash
# Restart application
aws elasticbeanstalk restart-app-server \
  --environment-name sekar-prod

# Or rollback to previous version
aws elasticbeanstalk update-environment \
  --environment-name sekar-prod \
  --version-label prod-<previous-sha>
```

**For database issues:**
```bash
# Promote read replica (if Multi-AZ)
aws rds failover-db-cluster \
  --db-cluster-identifier sekar-prod-cluster

# Or restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier sekar-prod-db-restored \
  --db-snapshot-identifier <snapshot-id>
```

**For S3 issues:**
- Check IAM permissions
- Verify bucket policy
- Check S3 service status

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
- URL: https://status.sekar.DLH-sby.go.id
- Provider: Statuspage.io or custom
- Updates: Every 30 minutes during incident

**User Communication:**
- In-app notification: "Service temporarily degraded"
- Email to supervisors if > 1 hour downtime
- Post-incident summary

---

## 10. Cost Monitoring

### CloudWatch Cost Dashboard

**Widgets:**
1. Total AWS Spend (MTD)
2. Cost by Service (pie chart)
3. EC2 Costs (line chart)
4. RDS Costs (line chart)
5. S3 Costs (line chart)
6. Data Transfer Costs (line chart)

### Budget Alerts

**Budget 1: Total AWS Spend**
- Amount: $600/month
- Alert at: 80% ($480), 100% ($600)
- Notification: Email to finance@DLH-sby.go.id

**Budget 2: RDS Spend**
- Amount: $200/month
- Alert at: 90% ($180)
- Notification: Email to devops@DLH-sby.go.id

**Budget 3: S3 Spend**
- Amount: $50/month
- Alert at: 90% ($45)
- Notification: Email to devops@DLH-sby.go.id

### Cost Optimization Recommendations

**Monthly Review Checklist:**
- [ ] Delete unused snapshots (> 90 days)
- [ ] Review S3 storage classes (move old files to IA/Glacier)
- [ ] Check for idle EC2 instances
- [ ] Review CloudWatch logs retention (reduce if needed)
- [ ] Optimize RDS instance size (right-sizing)
- [ ] Check for unused Elastic IPs

---

## 11. Reporting

### Weekly Operations Report

**Recipients:** Tech Lead, Product Manager
**Delivery:** Every Monday 9:00 AM WIB via email

**Contents:**
1. **System Health Summary**
   - Uptime percentage
   - Average response time
   - Error rate

2. **Usage Statistics**
   - Total active workers
   - Shifts completed
   - Reports submitted
   - Photos uploaded

3. **Incidents**
   - Count by severity
   - Average resolution time
   - Notable incidents

4. **Performance**
   - API response times (P50, P95, P99)
   - Database performance
   - S3 upload success rate

5. **Costs**
   - Total spend
   - Variance from budget
   - Trending

**Automated Generation:**
```python
# scripts/weekly-report.py
import boto3
from datetime import datetime, timedelta

cloudwatch = boto3.client('cloudwatch')

# Fetch metrics
# Generate report
# Send via email (SES)
```

### Monthly Business Report

**Recipients:** Management, Stakeholders
**Delivery:** First Monday of month

**Contents:**
1. System reliability (uptime, incidents)
2. User adoption metrics
3. Feature usage statistics
4. Performance trends
5. Cost analysis
6. Roadmap progress

---

## 12. Tools and Access

### Required Tools

| Tool | Purpose | Access Level |
|------|---------|--------------|
| **AWS Console** | Infrastructure management | Admin (DevOps), Read-only (Developers) |
| **CloudWatch** | Monitoring, logs, alarms | All team |
| **Sentry** | Error tracking | All team |
| **Slack** | Alerting, communication | All team |
| **GitHub** | Code, issues, CI/CD | All team |
| **Datadog** (Phase 3+) | APM, advanced monitoring | DevOps, Backend |

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

### Daily Checks (Automated)
- [ ] Health check passes
- [ ] No critical alarms
- [ ] Error rate < 1%
- [ ] Average latency < 500ms
- [ ] All services running

### Weekly Checks (Manual)
- [ ] Review CloudWatch dashboard
- [ ] Check for new Sentry errors
- [ ] Review slow query log
- [ ] Check AWS costs
- [ ] Review incident tickets
- [ ] Test backup restoration

### Monthly Checks (Manual)
- [ ] Review and update alarms
- [ ] Test disaster recovery procedure
- [ ] Review and optimize costs
- [ ] Update runbooks
- [ ] Security audit (logs, access)
- [ ] Performance review and optimization

---

**Document Owner:** DevOps Engineer
**Last Updated:** 2026-01-16
**Status:** Active
**Related Docs:** [`infrastructure.md`](./infrastructure.md), [`ci-cd.md`](./ci-cd.md)
