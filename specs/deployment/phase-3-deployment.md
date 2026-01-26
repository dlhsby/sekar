# Phase 3 Deployment Guide - Analytics & Reporting

Deployment procedures for Phase 3 features including WebSocket real-time tracking, advanced analytics, report builder, scheduled exports, and data warehouse integration.

## Overview

Phase 3 introduces:
- **WebSocket Server** for real-time worker location tracking
- **Advanced Analytics Dashboard** with charts and visualizations
- **Custom Report Builder** for supervisors and admins
- **Scheduled Report Exports** automated via cron jobs
- **Data Warehouse Integration** with Amazon Redshift (optional)
- **Cross-Region Replication** for disaster recovery

---

## 1. Pre-Deployment Checklist

### Code Readiness
- [ ] All Phase 3 features tested in development
- [ ] Unit tests passing (>80% coverage)
- [ ] E2E tests passing
- [ ] WebSocket load tests completed (500 concurrent connections)
- [ ] Database migrations verified
- [ ] API documentation updated
- [ ] Performance benchmarks met

### Infrastructure Readiness
- [ ] Additional ElastiCache Redis nodes provisioned (for WebSocket)
- [ ] CloudFront distribution configured
- [ ] Redshift cluster created (if using data warehouse)
- [ ] S3 bucket for report exports configured
- [ ] CloudWatch alarms configured for WebSocket metrics
- [ ] Database backup taken
- [ ] Multi-AZ RDS enabled

### Team Readiness
- [ ] Team briefed on WebSocket architecture
- [ ] Deployment window scheduled (low-traffic period)
- [ ] Rollback plan reviewed
- [ ] On-call engineer assigned
- [ ] Runbook for WebSocket troubleshooting prepared

---

## 2. WebSocket Server Setup

### Architecture Overview

```
Mobile Clients (500 workers)
        ↓
   Application Load Balancer
   (WebSocket upgrade enabled)
        ↓
   EC2 Instances (3-4 instances)
   - Node.js + Socket.IO
   - Redis Adapter for scaling
        ↓
   ElastiCache Redis Cluster
   (stores WebSocket sessions)
```

### Load Balancer Configuration

**Enable WebSocket Support:**
```bash
# Update target group to support WebSocket
aws elbv2 modify-target-group-attributes \
  --target-group-arn arn:aws:elasticloadbalancing:ap-southeast-1:ACCOUNT_ID:targetgroup/sekar-prod-tg/xxxxx \
  --attributes \
    Key=deregistration_delay.timeout_seconds,Value=60 \
    Key=stickiness.enabled,Value=true \
    Key=stickiness.type,Value=lb_cookie \
    Key=stickiness.lb_cookie.duration_seconds,Value=86400

# Add WebSocket path pattern to ALB listener rules
aws elbv2 create-rule \
  --listener-arn arn:aws:elasticloadbalancing:ap-southeast-1:ACCOUNT_ID:listener/app/sekar-prod-alb/xxxxx \
  --priority 10 \
  --conditions Field=path-pattern,Values='/socket.io/*' \
  --actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:ap-southeast-1:ACCOUNT_ID:targetgroup/sekar-prod-tg/xxxxx
```

**ALB Listener Configuration:**
| Protocol | Port | Path | Target | Stickiness |
|----------|------|------|--------|------------|
| HTTPS | 443 | /socket.io/* | sekar-prod-tg | Enabled (24h) |
| HTTPS | 443 | /api/* | sekar-prod-tg | Disabled |

### Redis Adapter Configuration

**Scale up ElastiCache for WebSocket:**
```bash
# Production: Use Redis cluster mode for horizontal scaling
aws elasticache modify-replication-group \
  --replication-group-id sekar-redis-prod \
  --cache-node-type cache.t3.medium \
  --apply-immediately \
  --num-cache-clusters 3  # Primary + 2 read replicas
```

**Backend Configuration:**
```typescript
// be/src/websocket/socket.gateway.ts
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
});
const subClient = pubClient.duplicate();

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  },
  adapter: createAdapter(pubClient, subClient),
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
});
```

### WebSocket Authentication

**JWT-based authentication:**
```typescript
// Client-side (mobile app)
import io from 'socket.io-client';

const socket = io('https://api.sekar.DLH-sby.go.id', {
  auth: {
    token: accessToken,  // JWT from login
  },
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('Connected to WebSocket');
});

socket.on('location-update', (data) => {
  // Update worker location on map
});
```

**Server-side authentication middleware:**
```typescript
// be/src/websocket/socket.gateway.ts
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const payload = await jwtService.verify(token);
    socket.data.userId = payload.sub;
    socket.data.role = payload.role;
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});
```

---

## 3. Environment Variables - Phase 3 Additions

### Backend (.env additions)

```bash
# WebSocket Configuration
WEBSOCKET_ENABLED=true
WEBSOCKET_PORT=3001  # Optional separate port (or use same as API)
WEBSOCKET_PATH=/socket.io
WEBSOCKET_PING_TIMEOUT=60000
WEBSOCKET_PING_INTERVAL=25000
WEBSOCKET_MAX_CONNECTIONS=1000

# Redis Adapter for WebSocket Scaling
REDIS_ADAPTER_ENABLED=true
REDIS_ADAPTER_HOST=sekar-redis-prod.xxxxx.ng.0001.apse1.cache.amazonaws.com
REDIS_ADAPTER_PORT=6379

# Analytics Configuration
ANALYTICS_CACHE_TTL=3600  # seconds (1 hour)
ANALYTICS_MAX_DATE_RANGE=90  # days
ANALYTICS_AGGREGATION_INTERVAL=hourly  # hourly, daily, weekly

# Report Export Configuration
REPORT_EXPORT_S3_BUCKET=sekar-report-exports
REPORT_EXPORT_FORMATS=csv,xlsx,pdf
REPORT_MAX_FILE_SIZE=52428800  # 50 MB
REPORT_RETENTION_DAYS=90

# Scheduled Jobs (Bull Queue)
SCHEDULER_ENABLED=true
SCHEDULER_TIMEZONE=Asia/Jakarta
SCHEDULER_DAILY_REPORT_TIME=08:00  # Send daily reports at 8 AM WIB
SCHEDULER_WEEKLY_REPORT_DAY=monday
SCHEDULER_MONTHLY_REPORT_DATE=1

# Data Warehouse (Redshift) - Optional
REDSHIFT_ENABLED=false
REDSHIFT_HOST=sekar-redshift.xxxxx.ap-southeast-1.redshift.amazonaws.com
REDSHIFT_PORT=5439
REDSHIFT_DATABASE=sekar_dw
REDSHIFT_USER=sekar_etl
REDSHIFT_PASSWORD={{resolve:secretsmanager:sekar/redshift/password}}
REDSHIFT_SYNC_INTERVAL=daily  # daily, hourly

# CloudFront CDN
CLOUDFRONT_ENABLED=true
CLOUDFRONT_DISTRIBUTION_DOMAIN=media.sekar.DLH-sby.go.id
CLOUDFRONT_SIGNED_URLS=false  # Set to true for private content
```

### Mobile App (.env additions)

```bash
# WebSocket Configuration
WEBSOCKET_URL=https://api.sekar.DLH-sby.go.id
WEBSOCKET_PATH=/socket.io
WEBSOCKET_RECONNECT_ATTEMPTS=5
WEBSOCKET_RECONNECT_DELAY=3000  # milliseconds

# Location Tracking
LOCATION_WEBSOCKET_INTERVAL=30000  # Send location every 30 seconds (Phase 3 real-time)
LOCATION_WEBSOCKET_DISTANCE_FILTER=10  # meters
```

---

## 4. CloudFront CDN Setup

### Distribution Configuration

**Create CloudFront Distribution:**
```bash
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json
```

**cloudfront-config.json:**
```json
{
  "CallerReference": "sekar-prod-2026-01-21",
  "Comment": "SEKAR Production Media Distribution",
  "Enabled": true,
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-sekar-prod-media",
        "DomainName": "sekar-prod-media.s3.ap-southeast-1.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": "origin-access-identity/cloudfront/E1234567890ABC"
        },
        "ConnectionAttempts": 3,
        "ConnectionTimeout": 10
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-sekar-prod-media",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "Compress": true,
    "MinTTL": 86400,
    "DefaultTTL": 2592000,
    "MaxTTL": 31536000,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    }
  },
  "CacheBehaviors": {
    "Quantity": 2,
    "Items": [
      {
        "PathPattern": "selfies/*",
        "TargetOriginId": "S3-sekar-prod-media",
        "ViewerProtocolPolicy": "redirect-to-https",
        "MinTTL": 604800,
        "DefaultTTL": 604800,
        "MaxTTL": 604800
      },
      {
        "PathPattern": "reports/*",
        "TargetOriginId": "S3-sekar-prod-media",
        "ViewerProtocolPolicy": "redirect-to-https",
        "MinTTL": 2592000,
        "DefaultTTL": 2592000,
        "MaxTTL": 2592000
      }
    ]
  },
  "Aliases": {
    "Quantity": 1,
    "Items": ["media.sekar.DLH-sby.go.id"]
  },
  "ViewerCertificate": {
    "ACMCertificateArn": "arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/xxxxx",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  },
  "HttpVersion": "http2",
  "IsIPV6Enabled": true,
  "Logging": {
    "Enabled": true,
    "IncludeCookies": false,
    "Bucket": "sekar-cloudfront-logs.s3.amazonaws.com",
    "Prefix": "production/"
  },
  "PriceClass": "PriceClass_100"
}
```

### Origin Access Identity (OAI)

**Create OAI:**
```bash
aws cloudfront create-cloud-front-origin-access-identity \
  --cloud-front-origin-access-identity-config \
    CallerReference="sekar-oai-$(date +%s)",Comment="SEKAR S3 OAI"
```

**Update S3 Bucket Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontOAI",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity E1234567890ABC"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::sekar-prod-media/*"
    }
  ]
}
```

### DNS Configuration

**Add CNAME record in Route 53:**
```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "media.sekar.DLH-sby.go.id",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "d111111abcdef8.cloudfront.net",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'
```

---

## 5. Amazon Redshift Data Warehouse (Optional)

### Redshift Cluster Setup

**Create Redshift Cluster:**
```bash
aws redshift create-cluster \
  --cluster-identifier sekar-dw-prod \
  --node-type dc2.large \
  --number-of-nodes 2 \
  --master-username sekar_admin \
  --master-user-password $(aws secretsmanager get-random-password --require-each-included-type --password-length 32 --query 'RandomPassword' --output text) \
  --cluster-subnet-group-name sekar-redshift-subnet-group \
  --vpc-security-group-ids sg-xxxxx \
  --publicly-accessible false \
  --encrypted \
  --kms-key-id arn:aws:kms:ap-southeast-1:ACCOUNT_ID:key/xxxxx \
  --tags Key=Environment,Value=Production Key=Project,Value=SEKAR
```

**Cluster Configuration:**
| Parameter | Value |
|-----------|-------|
| Node Type | dc2.large (2 nodes) |
| Storage | 160 GB per node (320 GB total) |
| vCPU | 2 per node |
| Memory | 15 GB per node |
| Cost | ~$500/month |

### ETL Pipeline Setup

**Create ETL Lambda Function:**
```python
# lambda/redshift-etl.py
import psycopg2
import boto3
from datetime import datetime, timedelta

def lambda_handler(event, context):
    """
    Daily ETL: Copy data from RDS PostgreSQL to Redshift
    """

    # Connect to RDS (source)
    rds_conn = psycopg2.connect(
        host=os.environ['RDS_HOST'],
        port=5432,
        database=os.environ['RDS_DATABASE'],
        user=os.environ['RDS_USER'],
        password=os.environ['RDS_PASSWORD']
    )

    # Connect to Redshift (destination)
    redshift_conn = psycopg2.connect(
        host=os.environ['REDSHIFT_HOST'],
        port=5439,
        database=os.environ['REDSHIFT_DATABASE'],
        user=os.environ['REDSHIFT_USER'],
        password=os.environ['REDSHIFT_PASSWORD']
    )

    try:
        # Extract data from RDS (previous day)
        yesterday = (datetime.now() - timedelta(days=1)).date()

        # Copy shifts
        extract_and_load(
            source_conn=rds_conn,
            dest_conn=redshift_conn,
            table='shifts',
            date_filter=f"date >= '{yesterday}'"
        )

        # Copy reports
        extract_and_load(
            source_conn=rds_conn,
            dest_conn=redshift_conn,
            table='reports',
            date_filter=f"date >= '{yesterday}'"
        )

        # Copy location pings (aggregated hourly)
        aggregate_location_pings(rds_conn, redshift_conn, yesterday)

        return {
            'statusCode': 200,
            'body': f'ETL completed for {yesterday}'
        }
    finally:
        rds_conn.close()
        redshift_conn.close()

def extract_and_load(source_conn, dest_conn, table, date_filter):
    """Extract from source and load into destination"""
    # Implementation details...
    pass
```

**Schedule ETL with EventBridge:**
```bash
aws events put-rule \
  --name sekar-daily-etl \
  --schedule-expression "cron(0 2 * * ? *)" \
  --description "Daily ETL from RDS to Redshift at 2 AM UTC (10 AM WIB)"

aws events put-targets \
  --rule sekar-daily-etl \
  --targets "Id"="1","Arn"="arn:aws:lambda:ap-southeast-1:ACCOUNT_ID:function:sekar-redshift-etl"
```

### Redshift Schema

**Create analytics tables:**
```sql
-- Fact table: Daily shift metrics
CREATE TABLE fact_shifts (
    date DATE NOT NULL,
    worker_id UUID NOT NULL,
    area_id UUID NOT NULL,
    shift_duration_minutes INTEGER,
    distance_traveled_km DECIMAL(10,2),
    reports_submitted INTEGER,
    photos_uploaded INTEGER,
    clock_in_time TIMESTAMP,
    clock_out_time TIMESTAMP,
    gps_accuracy_avg DECIMAL(10,2)
)
DISTKEY(worker_id)
SORTKEY(date);

-- Fact table: Hourly location aggregates
CREATE TABLE fact_location_hourly (
    date_hour TIMESTAMP NOT NULL,
    worker_id UUID NOT NULL,
    area_id UUID,
    ping_count INTEGER,
    distance_traveled_km DECIMAL(10,2),
    avg_accuracy DECIMAL(10,2),
    min_lat DECIMAL(10,8),
    max_lat DECIMAL(10,8),
    min_lng DECIMAL(10,8),
    max_lng DECIMAL(10,8)
)
DISTKEY(worker_id)
SORTKEY(date_hour);

-- Dimension table: Workers
CREATE TABLE dim_workers (
    worker_id UUID PRIMARY KEY,
    name VARCHAR(255),
    role VARCHAR(50),
    created_at TIMESTAMP
)
DISTSTYLE ALL;

-- Dimension table: Areas
CREATE TABLE dim_areas (
    area_id UUID PRIMARY KEY,
    name VARCHAR(255),
    district VARCHAR(100),
    subdistrict VARCHAR(100),
    target_time_minutes INTEGER
)
DISTSTYLE ALL;
```

---

## 6. Database Migrations

### Migration Files for Phase 3

**Migration 1: Report Templates Table**
```sql
-- File: be/src/database/migrations/1706000000000-CreateReportTemplatesTable.ts
CREATE TABLE report_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- 'attendance', 'performance', 'area_coverage', 'custom'
    filters JSONB, -- filter configuration
    columns JSONB NOT NULL, -- selected columns
    aggregations JSONB, -- sum, avg, count, etc.
    schedule VARCHAR(50), -- 'once', 'daily', 'weekly', 'monthly'
    schedule_config JSONB, -- day of week, time, etc.
    format VARCHAR(10) NOT NULL, -- 'csv', 'xlsx', 'pdf'
    recipients JSONB, -- email addresses
    created_by UUID NOT NULL REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_report_templates_type ON report_templates(type);
CREATE INDEX idx_report_templates_schedule ON report_templates(schedule);
CREATE INDEX idx_report_templates_created_by ON report_templates(created_by);
```

**Migration 2: Report Exports Table**
```sql
-- File: be/src/database/migrations/1706000001000-CreateReportExportsTable.ts
CREATE TABLE report_exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES report_templates(id),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    format VARCHAR(10) NOT NULL,
    filters JSONB,
    date_range JSONB,
    file_url TEXT, -- S3 URL
    file_size BIGINT, -- bytes
    row_count INTEGER,
    error TEXT,
    requested_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE -- file expiration
);

CREATE INDEX idx_report_exports_template_id ON report_exports(template_id);
CREATE INDEX idx_report_exports_status ON report_exports(status);
CREATE INDEX idx_report_exports_requested_by ON report_exports(requested_by);
CREATE INDEX idx_report_exports_created_at ON report_exports(created_at DESC);
```

**Migration 3: Analytics Cache Table**
```sql
-- File: be/src/database/migrations/1706000002000-CreateAnalyticsCacheTable.ts
CREATE TABLE analytics_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    metric_type VARCHAR(100) NOT NULL, -- 'attendance_rate', 'area_coverage', 'worker_performance'
    filters JSONB,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_analytics_cache_key ON analytics_cache(cache_key);
CREATE INDEX idx_analytics_cache_metric_type ON analytics_cache(metric_type);
CREATE INDEX idx_analytics_cache_expires_at ON analytics_cache(expires_at);
```

**Migration 4: Multi-AZ RDS Conversion**
```bash
# This is an AWS operation, not a SQL migration
# Enable Multi-AZ for production RDS
aws rds modify-db-instance \
  --db-instance-identifier sekar-prod-db \
  --multi-az \
  --apply-immediately

# This will cause a reboot - schedule during maintenance window
```

---

## 7. Deployment Procedure

### Step 1: Pre-Deployment Verification

**Performance Testing:**
```bash
# WebSocket load test with Artillery
cd be
npm install -g artillery

# Test WebSocket connections
artillery run --output report.json websocket-load-test.yml

# websocket-load-test.yml
config:
  target: "https://api-staging.sekar.DLH-sby.go.id"
  phases:
    - duration: 60
      arrivalRate: 10  # 10 connections per second
      name: "Ramp up"
    - duration: 300
      arrivalRate: 50  # 50 connections per second
      name: "Sustained load"
  engines:
    socketio:
      transports: ["websocket"]

scenarios:
  - name: "Worker location tracking"
    engine: socketio
    flow:
      - emit:
          channel: "authenticate"
          data:
            token: "{{token}}"
      - emit:
          channel: "location-update"
          data:
            lat: -7.290500
            lng: 112.739800
            accuracy: 10
      - think: 30
```

**Database Backup:**
```bash
aws rds create-db-snapshot \
  --db-instance-identifier sekar-prod-db \
  --db-snapshot-identifier sekar-prod-db-pre-phase3-$(date +%Y%m%d-%H%M%S)
```

### Step 2: Infrastructure Setup (1-2 days before deployment)

**1. Setup CloudFront:**
```bash
# Create distribution (as shown in section 4)
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json

# Wait for deployment (takes 15-20 minutes)
aws cloudfront get-distribution --id E1234567890ABC --query 'Distribution.Status'

# Update backend to use CloudFront URLs
# Environment variable: CLOUDFRONT_DISTRIBUTION_DOMAIN=media.sekar.DLH-sby.go.id
```

**2. Scale up Redis:**
```bash
# Add more nodes for WebSocket scaling
aws elasticache modify-replication-group \
  --replication-group-id sekar-redis-prod \
  --cache-node-type cache.t3.medium \
  --num-cache-clusters 3 \
  --apply-immediately
```

**3. Enable Multi-AZ RDS:**
```bash
# Schedule during maintenance window
aws rds modify-db-instance \
  --db-instance-identifier sekar-prod-db \
  --multi-az \
  --preferred-maintenance-window "Sun:04:00-Sun:05:00"
```

### Step 3: Deploy Backend

**Merge and deploy:**
```bash
git checkout main
git merge staging
git tag -a v3.0.0 -m "Phase 3 Production Release - Analytics & WebSocket"
git push origin main v3.0.0

# CI/CD will automatically deploy
# Monitor in GitHub Actions and AWS Console
```

**Run migrations:**
```bash
eb ssh sekar-prod
cd /var/app/current
NODE_ENV=production npm run typeorm migration:run
exit
```

### Step 4: Verify WebSocket Connectivity

**Test WebSocket connection:**
```bash
# Install wscat for testing
npm install -g wscat

# Test WebSocket endpoint
wscat -c "wss://api.sekar.DLH-sby.go.id/socket.io/?EIO=4&transport=websocket" \
  -H "Authorization: Bearer $TOKEN"

# Should see: Connected to server
# Try sending a message: {"type":"location-update","data":{"lat":-7.29,"lng":112.74}}
```

**Verify Redis adapter:**
```bash
# Check Redis connections from backend
redis-cli -h sekar-redis-prod.xxxxx.ng.0001.apse1.cache.amazonaws.com
> CLIENT LIST | grep socket
> MONITOR  # Watch real-time commands
```

### Step 5: Deploy Mobile App

```bash
cd fe/mobile

# Build with WebSocket support enabled
cd android
./gradlew assembleRelease

# Test WebSocket from app
# Install APK, login, go to map screen
# Should see real-time location updates of other workers
```

### Step 6: Smoke Tests

**Analytics Dashboard:**
```bash
API_URL="https://api.sekar.DLH-sby.go.id"

# Test attendance analytics
curl "$API_URL/api/analytics/attendance?startDate=2026-01-01&endDate=2026-01-21" \
  -H "Authorization: Bearer $TOKEN"

# Test performance metrics
curl "$API_URL/api/analytics/worker-performance?workerId=$WORKER_ID&period=week" \
  -H "Authorization: Bearer $TOKEN"

# Test area coverage
curl "$API_URL/api/analytics/area-coverage?areaId=$AREA_ID&date=2026-01-21" \
  -H "Authorization: Bearer $TOKEN"
```

**Report Builder:**
```bash
# Create report template
curl -X POST "$API_URL/api/reports/templates" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily Attendance Report",
    "type": "attendance",
    "columns": ["worker_name", "clock_in", "clock_out", "duration"],
    "schedule": "daily",
    "format": "csv"
  }'

# Generate report
curl -X POST "$API_URL/api/reports/export" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "uuid-here",
    "dateRange": {
      "start": "2026-01-20",
      "end": "2026-01-21"
    }
  }'
```

---

## 8. Monitoring - Phase 3 Additions

### WebSocket Metrics

**Custom Metrics:**
```typescript
// Log WebSocket metrics
await logMetric('WebSocketConnections', io.engine.clientsCount, 'Count');
await logMetric('WebSocketMessagesSent', 1, 'Count');
await logMetric('WebSocketMessagesReceived', 1, 'Count');
await logMetric('WebSocketErrors', 1, 'Count');
await logMetric('WebSocketAuthFailed', 1, 'Count');
await logMetric('LocationUpdatesReceived', 1, 'Count');
```

### CloudWatch Alarms

**Alarm 1: High WebSocket Connections**
```yaml
AlarmName: SEKAR-Prod-WebSocket-ConnectionsHigh
MetricName: WebSocketConnections
Namespace: SEKAR/WebSocket
Statistic: Maximum
Period: 60
EvaluationPeriods: 2
Threshold: 800  # 80% of max capacity (1000)
ComparisonOperator: GreaterThanThreshold
Actions:
  - arn:aws:sns:ap-southeast-1:ACCOUNT_ID:sekar-warning-alerts
```

**Alarm 2: WebSocket Authentication Failures**
```yaml
AlarmName: SEKAR-Prod-WebSocket-AuthFailed
MetricName: WebSocketAuthFailed
Namespace: SEKAR/WebSocket
Statistic: Sum
Period: 300
EvaluationPeriods: 1
Threshold: 20
ComparisonOperator: GreaterThanThreshold
Actions:
  - arn:aws:sns:ap-southeast-1:ACCOUNT_ID:sekar-high-alerts
```

**Alarm 3: CloudFront High Error Rate**
```yaml
AlarmName: SEKAR-Prod-CloudFront-5xxErrors
MetricName: 5xxErrorRate
Namespace: AWS/CloudFront
Statistic: Average
Period: 300
EvaluationPeriods: 2
Threshold: 5  # 5%
ComparisonOperator: GreaterThanThreshold
Dimensions:
  - Name: DistributionId
    Value: E1234567890ABC
Actions:
  - arn:aws:sns:ap-southeast-1:ACCOUNT_ID:sekar-high-alerts
```

### Analytics Dashboard Additions

**New Row: WebSocket Metrics**
| Widget | Type | Metric | Period |
|--------|------|--------|--------|
| Active WebSocket Connections | Number | `SEKAR/WebSocket/WebSocketConnections` | Real-time |
| Messages Per Minute | Line | `SEKAR/WebSocket/WebSocketMessagesSent` | 1 min |
| WebSocket Error Rate | Line | `SEKAR/WebSocket/WebSocketErrors / WebSocketMessagesSent * 100` | 5 min |

**New Row: Report Generation**
| Widget | Type | Metric | Period |
|--------|------|--------|--------|
| Reports Generated Today | Number | `SEKAR/Reports/ReportExportCompleted` | 1 day |
| Average Export Time | Line | `SEKAR/Reports/ReportExportDuration` | 5 min |
| Failed Exports | Number | `SEKAR/Reports/ReportExportFailed` | 1 day |

---

## 9. Rollback Procedure

### Disable WebSocket (Quick Mitigation)

```bash
# Disable WebSocket without full rollback
aws elasticbeanstalk update-environment \
  --environment-name sekar-prod \
  --option-settings \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=WEBSOCKET_ENABLED,Value=false

# Mobile app will fall back to HTTP polling for location updates
```

### Full Rollback

```bash
# 1. Revert code
git revert HEAD
git push origin main

# 2. Restore database if needed
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier sekar-prod-db-restored \
  --db-snapshot-identifier sekar-prod-db-pre-phase3-20260121-140000

# 3. Verify Phase 1-2 features still work
./scripts/smoke-tests-phase2.sh https://api.sekar.DLH-sby.go.id
```

---

## 10. Performance Tuning

### WebSocket Optimization

**Backend:**
```typescript
// Optimize Socket.IO configuration
const io = new Server(server, {
  maxHttpBufferSize: 1e6,  // 1 MB
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  allowUpgrades: true,
  perMessageDeflate: false,  // Disable compression for lower latency
  transports: ['websocket'],  // Force WebSocket only (no polling fallback)
});
```

**Mobile:**
```typescript
// Batch location updates
const locationQueue = [];
let batchTimer;

function queueLocationUpdate(location) {
  locationQueue.push(location);

  if (!batchTimer) {
    batchTimer = setTimeout(() => {
      socket.emit('location-batch', locationQueue);
      locationQueue.length = 0;
      batchTimer = null;
    }, 5000);  // Send batch every 5 seconds
  }
}
```

### Database Query Optimization

**Create materialized views for analytics:**
```sql
-- Materialized view for daily attendance summary
CREATE MATERIALIZED VIEW mv_daily_attendance AS
SELECT
    DATE(s.clock_in_time) as date,
    COUNT(DISTINCT s.worker_id) as total_workers,
    AVG(EXTRACT(EPOCH FROM (s.clock_out_time - s.clock_in_time)) / 60) as avg_duration_minutes,
    COUNT(CASE WHEN s.status = 'completed' THEN 1 END) as completed_shifts,
    COUNT(CASE WHEN s.status = 'incomplete' THEN 1 END) as incomplete_shifts
FROM shifts s
WHERE s.deleted_at IS NULL
GROUP BY DATE(s.clock_in_time);

-- Refresh daily at 1 AM
CREATE INDEX idx_mv_daily_attendance_date ON mv_daily_attendance(date DESC);

-- Refresh via cron job
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_attendance;
```

---

**Document Owner:** DevOps Engineer
**Last Updated:** 2026-01-21
**Status:** Active - Phase 3
**Related Docs:** [`infrastructure.md`](./infrastructure.md), [`phase-2-deployment.md`](./phase-2-deployment.md)
