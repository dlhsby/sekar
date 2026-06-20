# Infrastructure Specifications

Deep-dive reference for AWS managed services and on-prem deployments. **For deployment procedures, see [`deployment-guide.md`](./deployment-guide.md) (authoritative).**

## Current Topology (2026-06)

SEKAR runs on two targets: **(1) Staging/UAT** on AWS account **659828096624** (region **ap-southeast-3** Jakarta), co-tenant with project KPI on shared **t3.micro** EC2, served plain HTTP via KPI's Caddy; **SHARED RDS `kobin-kpi-db` (database `sekar_staging`)** and S3 `sekar-media-staging` (via instance role, no static keys); Redis in-stack container. Deploy via **GitHub OIDC + SSM Run Command** (no SSH). **(2) Production** on **on-prem (pemkot) server**, Docker Compose (`docker-compose.prod.yml`), self-hosted Postgres, Redis, MinIO — not yet deployed. **Env/secrets use dotenvx** (`.env.staging` / `.env.production` committed encrypted; private keys are GitHub Environment secrets; AWS staging box reads key from SSM `/sekar/staging/BE_DOTENV_PRIVATE_KEY`).

---

## Reference: Larger Managed-Cloud Layout (Not Currently Provisioned)

The following VPC, RDS, CloudFront, and ElastiCache sections describe a fuller managed-cloud scale-up pattern (matching [`deployment-guide.md` Appendix A](./deployment-guide.md)). This is **NOT** the current deployment but serves as reference for future evolution.

---

## 1. AWS Account Structure (Reference Layout)

**Current reality:** Staging co-tenants on account **659828096624** (shared with KPI project). Production is on-prem (no AWS). This section describes the *reference* architecture for a dedicated multi-account, multi-region managed setup.

### Reference Account Organization

```
Single AWS Account (659828096624)
└── Staging Environment (current)
    ├── EC2 t3.micro (shared KPI Caddy gateway)
    ├── RDS: kobin-kpi-db, database sekar_staging (shared)
    ├── S3: sekar-media-staging
    └── Redis: in-stack container

Reference (not provisioned):
Root Account
├── Production Account (sekar-prod)
│   ├── VPC: sekar-prod-vpc
│   ├── RDS: sekar-prod-db
│   ├── S3: sekar-prod-media
│   └── Container registries for ECR
└── Backup Region (ap-southeast-3)
    └── [Standby for disaster recovery]
```

### AWS Regions (Reference)
- **Staging:** ap-southeast-3 (Jakarta) — closest to Surabaya, lowest latency
- **Production reference:** ap-southeast-3 primary; ap-southeast-1 (Singapore) backup — Phase 3+

---

## 2. VPC Configuration

### VPC Architecture

```
VPC: sekar-prod-vpc
CIDR: 10.0.0.0/16

├── Public Subnets (for Load Balancer, NAT Gateway)
│   ├── sekar-public-subnet-1a (10.0.1.0/24) - AZ: ap-southeast-1a
│   └── sekar-public-subnet-1b (10.0.2.0/24) - AZ: ap-southeast-1b
│
├── Private Subnets (for Application Servers)
│   ├── sekar-private-subnet-1a (10.0.10.0/24) - AZ: ap-southeast-1a
│   └── sekar-private-subnet-1b (10.0.11.0/24) - AZ: ap-southeast-1b
│
└── Database Subnets (for RDS)
    ├── sekar-db-subnet-1a (10.0.20.0/24) - AZ: ap-southeast-1a
    └── sekar-db-subnet-1b (10.0.21.0/24) - AZ: ap-southeast-1b
```

### Subnet Specifications

| Subnet | Type | CIDR | Availability Zone | Purpose |
|--------|------|------|-------------------|---------|
| sekar-public-subnet-1a | Public | 10.0.1.0/24 | ap-southeast-1a | ALB, NAT Gateway |
| sekar-public-subnet-1b | Public | 10.0.2.0/24 | ap-southeast-1b | ALB, NAT Gateway |
| sekar-private-subnet-1a | Private | 10.0.10.0/24 | ap-southeast-1a | Application servers |
| sekar-private-subnet-1b | Private | 10.0.11.0/24 | ap-southeast-1b | Application servers |
| sekar-db-subnet-1a | Private | 10.0.20.0/24 | ap-southeast-1a | RDS primary |
| sekar-db-subnet-1b | Private | 10.0.21.0/24 | ap-southeast-1b | RDS standby |

### Internet Gateway
- **Name:** sekar-igw
- **Attached to:** sekar-prod-vpc
- **Purpose:** Internet access for public subnets

### NAT Gateway
- **NAT Gateway 1:** sekar-nat-1a (in sekar-public-subnet-1a)
- **NAT Gateway 2:** sekar-nat-1b (in sekar-public-subnet-1b)
- **Purpose:** Outbound internet for private subnets (API calls, npm installs)
- **Elastic IPs:**
  - sekar-nat-eip-1a
  - sekar-nat-eip-1b

### Route Tables

**Public Route Table (sekar-public-rt):**
| Destination | Target |
|-------------|--------|
| 10.0.0.0/16 | local |
| 0.0.0.0/0 | igw-xxxxx (Internet Gateway) |

**Private Route Table 1a (sekar-private-rt-1a):**
| Destination | Target |
|-------------|--------|
| 10.0.0.0/16 | local |
| 0.0.0.0/0 | nat-xxxxx1a (NAT Gateway 1a) |

**Private Route Table 1b (sekar-private-rt-1b):**
| Destination | Target |
|-------------|--------|
| 10.0.0.0/16 | local |
| 0.0.0.0/0 | nat-xxxxx1b (NAT Gateway 1b) |

**Database Route Table (sekar-db-rt):**
| Destination | Target |
|-------------|--------|
| 10.0.0.0/16 | local |

---

## 3. Security Groups

### SG-01: Application Load Balancer Security Group

**Name:** sekar-alb-sg

**Inbound Rules:**
| Type | Protocol | Port | Source | Description |
|------|----------|------|--------|-------------|
| HTTPS | TCP | 443 | 0.0.0.0/0 | Public HTTPS access |
| HTTP | TCP | 80 | 0.0.0.0/0 | Redirect to HTTPS |

**Outbound Rules:**
| Type | Protocol | Port | Destination | Description |
|------|----------|------|-------------|-------------|
| All | All | All | sekar-app-sg | To application servers |

### SG-02: Application Server Security Group

**Name:** sekar-app-sg

**Inbound Rules:**
| Type | Protocol | Port | Source | Description |
|------|----------|------|--------|-------------|
| HTTP | TCP | 3000 | sekar-alb-sg | From load balancer |
| SSH | TCP | 22 | Bastion SG (Phase 2+) | SSH access via bastion |

**Outbound Rules:**
| Type | Protocol | Port | Destination | Description |
|------|----------|------|-------------|-------------|
| PostgreSQL | TCP | 5432 | sekar-db-sg | Database access |
| HTTPS | TCP | 443 | 0.0.0.0/0 | AWS services, npm |
| HTTP | TCP | 80 | 0.0.0.0/0 | Package downloads |

### SG-03: RDS Security Group

**Name:** sekar-db-sg

**Inbound Rules:**
| Type | Protocol | Port | Source | Description |
|------|----------|------|--------|-------------|
| PostgreSQL | TCP | 5432 | sekar-app-sg | From application servers |
| PostgreSQL | TCP | 5432 | Bastion SG (Phase 2+) | Database admin access |

**Outbound Rules:**
| Type | Protocol | Port | Destination | Description |
|------|----------|------|-------------|-------------|
| All | All | All | 0.0.0.0/0 | (None required for RDS) |

### SG-04: Bastion Host Security Group (Phase 2+)

**Name:** sekar-bastion-sg

**Inbound Rules:**
| Type | Protocol | Port | Source | Description |
|------|----------|------|--------|-------------|
| SSH | TCP | 22 | Office IP / VPN | SSH from known IPs only |

**Outbound Rules:**
| Type | Protocol | Port | Destination | Description |
|------|----------|------|-------------|-------------|
| SSH | TCP | 22 | sekar-app-sg | SSH to app servers |
| PostgreSQL | TCP | 5432 | sekar-db-sg | Database access |

---

## 4. RDS PostgreSQL Configuration (Reference Layout)

**Current reality:** Staging uses **shared `kobin-kpi-db` RDS instance** (database `sekar_staging`); production is on-prem (self-hosted Postgres). This section is the *reference* architecture for dedicated managed RDS.

### Reference Database Instance Specifications

#### Staging (Current)
| Parameter | Value |
|-----------|-------|
| Instance Type | db.t3.micro (shared) |
| Database | sekar_staging (on kobin-kpi-db) |
| Backup Retention | 7 days |
| Notes | Co-tenant with KPI project; no dedicated RDS |

#### Production Reference (Not Provisioned)
| Parameter | Value |
|-----------|-------|
| Instance Type | db.t3.small |
| vCPU | 2 |
| Memory | 2 GB |
| Storage | 100 GB GP3 |
| IOPS | 3000 |
| Multi-AZ | Yes |
| Backup Retention | 7 days |

### Reference Database Configuration (Production)

**Database Name:** sekar_db
**Master Username:** sekar_admin
**Master Password:** (in GitHub Environment secrets, injected at deploy; see [`encrypted-secrets.md`](./encrypted-secrets.md))

**PostgreSQL Version:** 14.10 (or latest 14.x)

**Parameter Group:** sekar-postgres14-params
- `max_connections`: 100
- `shared_buffers`: 256MB (auto-tuned by RDS)
- `effective_cache_size`: 768MB (auto-tuned)
- `maintenance_work_mem`: 64MB
- `checkpoint_completion_target`: 0.9
- `wal_buffers`: 16MB
- `default_statistics_target`: 100
- `random_page_cost`: 1.1 (SSD optimized)
- `effective_io_concurrency`: 200
- `work_mem`: 2621kB
- `min_wal_size`: 1GB
- `max_wal_size`: 4GB

### Subnet Group

**Name:** sekar-db-subnet-group
**Subnets:**
- sekar-db-subnet-1a
- sekar-db-subnet-1b

### Backup Configuration

**Automated Backups:**
- Backup retention period: 7 days
- Backup window: 03:00-04:00 UTC (11:00-12:00 WIB - low traffic)
- Copy tags to snapshots: Yes

**Manual Snapshots:**
- Before major deployments
- Before schema changes
- Retention: Keep indefinitely

### Maintenance Window

**Preferred maintenance window:** Sun:04:00-Sun:05:00 UTC (12:00-13:00 WIB Sunday)
**Auto minor version upgrade:** No (manual control)

### Monitoring

**Enhanced Monitoring:**
- Enabled: Yes
- Granularity: 60 seconds
- Monitoring Role: rds-enhanced-monitoring-role

**Performance Insights:**
- Enabled: Yes (Phase 2+)
- Retention: 7 days

**CloudWatch Alarms:**
- CPU Utilization > 80% for 5 minutes
- Free Storage Space < 10 GB
- Read/Write IOPS > 2500 for 5 minutes
- Database Connections > 80

### Encryption

**Encryption at Rest:**
- Enabled: Yes
- KMS Key: aws/rds (AWS managed key)

**Encryption in Transit:**
- SSL/TLS required: Yes
- Minimum TLS version: 1.2

---

## 5. S3 Bucket Configuration

### Bucket Structure

```
sekar-prod-media (Primary bucket)
├── selfies/
│   ├── 2026/01/worker1_uuid_timestamp.jpg
│   └── 2026/01/worker2_uuid_timestamp.jpg
├── reports/
│   ├── photos/
│   │   ├── 2026/01/report_uuid_timestamp.jpg
│   │   └── thumbnails/
│   │       └── report_uuid_timestamp_thumb.jpg
│   └── videos/
│       └── 2026/01/report_uuid_timestamp.mp4
└── exports/ (Phase 3+)
    └── 2026/01/attendance_report_20260115.csv
```

### Bucket Configuration

**Bucket Name:** sekar-prod-media
**Region:** ap-southeast-1
**Versioning:** Disabled (MVP), Enabled (Phase 2+)

### Access Control

**Block Public Access:**
- Block all public access: Yes
- Access via presigned URLs only

**Bucket Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowBackendAppAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT_ID:role/sekar-app-role"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::sekar-prod-media/*"
    }
  ]
}
```

### CORS Configuration

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": [
      "https://sekar.wahyutrip.com",
      "https://api.sekar.wahyutrip.com"
    ],
    "ExposeHeaders": ["ETag"]
  }
]
```

### Lifecycle Policies

**Rule 1: Transition to Infrequent Access**
- Prefix: reports/
- Transition to S3 IA after 90 days
- Move files accessed less frequently to cheaper storage

**Rule 2: Delete Incomplete Multipart Uploads**
- Abort incomplete multipart uploads after 7 days
- Reduce storage costs

**Rule 3: Archive Old Reports (Phase 3+)**
- Prefix: reports/
- Transition to Glacier after 365 days
- Permanent archive for compliance

### Encryption

**Default Encryption:**
- Type: SSE-S3 (AES-256)
- Apply to all objects

### Storage Class

**Default:** S3 Standard
**Auto-tiering:** Enabled (Phase 2+) - intelligent-tiering for cost optimization

### Object Lock

**Status:** Disabled (MVP)
**Future:** Enable for compliance (Phase 4+)

---

## 6. Application Hosting (Reference: ECS/Fargate Layout)

**Current reality:** Staging = EC2 t3.micro (shared), production = Docker Compose on-prem. **Elastic Beanstalk is discontinued** (workflows deleted Apr 2026). This section describes the *reference* architecture for a managed container service (ECS/Fargate or similar).

### Reference Production Layout (Not Provisioned)

**Deployment method:** GitHub Actions + AWS Systems Manager Session Manager (no SSH); ECR for images.

**Application:**
- **Task Definition:** sekar-backend
- **Platform:** Node.js 24+ on ECS Fargate
- **CPU:** 512 vCPU (dev), 1024 vCPU (prod)
- **Memory:** 1GB (dev), 2GB (prod)

**Load Balancer:**
- **Type:** Application Load Balancer (ALB)
- **Target Group:** sekar-prod-tg, health check `/api/health` every 30s
- **SSL/TLS:** ACM certificate for api.sekar.wahyutrip.com, TLS 1.2+

**Scaling (reference):**
- Min tasks: 2, Max: 4
- Scale up if CPU > 70% for 5 min
- Scale down if CPU < 30% for 10 min

**Env vars (reference, from SSM Parameter Store or GitHub Environment secrets):**
```bash
NODE_ENV=production
PORT=3000
DATABASE_HOST=<RDS endpoint>
JWT_SECRET=<from GitHub secrets>
JWT_EXPIRATION=7d
AWS_REGION=ap-southeast-3
AWS_S3_BUCKET=sekar-media-staging
REDIS_URL=redis://<endpoint>:6379
```

See [`deployment-guide.md`](./deployment-guide.md) for current staging/production deploy procedures (GitHub OIDC + SSM Run Command).

---

## 7. CloudFront CDN (Phase 3+)

### Distribution Configuration

**Origin:** sekar-prod-media.s3.ap-southeast-1.amazonaws.com
**Distribution Domain:** media.sekar.wahyutrip.com

**Behaviors:**
| Path Pattern | Origin | Viewer Protocol | Cache Policy |
|-------------|--------|-----------------|--------------|
| /selfies/* | S3 | HTTPS only | Cache for 7 days |
| /reports/photos/* | S3 | HTTPS only | Cache for 30 days |
| /reports/videos/* | S3 | HTTPS only | Cache for 30 days |

**Cache Policy:**
- Min TTL: 1 day
- Max TTL: 365 days
- Default TTL: 30 days

**Geographic Restrictions:**
- Type: Whitelist
- Countries: Indonesia (ID)

**SSL Certificate:**
- Custom SSL (ACM)
- Domain: media.sekar.wahyutrip.com
- Minimum TLS: 1.2

---

## 8. IAM Roles and Policies (Current + Reference)

### Current: GitHub OIDC Role (AWS Staging)

**Role Name:** sekar-gha-deploy (in account 659828096624)

**Trust Relationship:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::659828096624:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:KobiDev/sekar:*"
        }
      }
    }
  ]
}
```

**Inline Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SSMRunCommand",
      "Effect": "Allow",
      "Action": [
        "ssm:SendCommand",
        "ssm:GetCommandInvocation"
      ],
      "Resource": "*"
    },
    {
      "Sid": "S3StagingMedia",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::sekar-media-staging",
        "arn:aws:s3:::sekar-media-staging/*"
      ]
    },
    {
      "Sid": "SSMSecrets",
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters"
      ],
      "Resource": "arn:aws:ssm:ap-southeast-3:659828096624:parameter/sekar/*"
    }
  ]
}
```

See [`ci-cd.md`](./ci-cd.md) for the full GitHub Actions workflow.

### Reference: EC2 Instance Role (Production Reference)

**Role Name:** sekar-app-role (if using managed services)

**Trusted Entity:** EC2, ECS

**Inline Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3MediaAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::sekar-prod-media",
        "arn:aws:s3:::sekar-prod-media/*"
      ]
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:ap-southeast-3:ACCOUNT_ID:log-group:/aws/ecs/sekar-backend/*"
    }
  ]
}
```

### Reference: RDS Monitoring Role

**Role Name:** sekar-rds-monitoring-role

**Trusted Entity:** monitoring.rds.amazonaws.com

**Managed Policies:**
- AmazonRDSEnhancedMonitoringRole

---

## 9. Secrets Management (Current + Reference)

**Current:** Secrets use **dotenvx** encryption (see [`encrypted-secrets.md`](./encrypted-secrets.md)). `.env.staging` and `.env.production` are committed encrypted; private keys stored as **GitHub Environment secrets** (`BE_DOTENV_PRIVATE_KEY`, `WEB_DOTENV_PRIVATE_KEY`). AWS staging box reads its key from **SSM Parameter Store** `/sekar/staging/BE_DOTENV_PRIVATE_KEY` via instance IAM role.

**Reference (for managed services):** AWS Secrets Manager or SSM Parameter Store can hold:
- `sekar/db/password` — RDS master password
- `sekar/jwt/secret` — JWT signing secret
- `sekar/firebase/service-account` — FCM credentials (if using Secrets Manager)

**Rotation policy (reference):**
- Database password: every 90 days
- JWT secret: every 180 days (or on compromise)

---

## 10. Route 53 DNS Configuration

### Hosted Zone

**Domain:** sekar.wahyutrip.com
**Type:** Public hosted zone

### DNS Records

| Name | Type | Value | TTL |
|------|------|-------|-----|
| sekar.wahyutrip.com | A | Alias to ALB | 300 |
| api.sekar.wahyutrip.com | A | Alias to ALB | 300 |
| media.sekar.wahyutrip.com | CNAME | CloudFront distribution | 300 |
| www.sekar.wahyutrip.com | CNAME | sekar.wahyutrip.com | 300 |

### Health Checks

**Health Check 1: API Endpoint**
- Endpoint: https://api.sekar.wahyutrip.com/api/health
- Protocol: HTTPS
- Port: 443
- Path: /api/health
- Interval: 30 seconds
- Failure threshold: 3

**Alarms:**
- Send SNS notification if health check fails

---

## 11. CloudWatch Configuration

### Log Groups

**Application Logs:**
- Name: `/aws/elasticbeanstalk/sekar-prod/var/log/nodejs/nodejs.log`
- Retention: 7 days (dev), 30 days (prod)

**Access Logs:**
- Name: `/aws/elasticbeanstalk/sekar-prod/var/log/nginx/access.log`
- Retention: 7 days

**Error Logs:**
- Name: `/aws/elasticbeanstalk/sekar-prod/var/log/nginx/error.log`
- Retention: 30 days

### Dashboards

**Dashboard: sekar-prod-overview**

Widgets:
1. API Request Count (last 1 hour)
2. Average Response Time (last 1 hour)
3. Error Rate (last 1 hour)
4. CPU Utilization (last 3 hours)
5. Database Connections (last 3 hours)
6. S3 Request Count (last 1 hour)

### Alarms

See [monitoring.md](./monitoring.md) for detailed alarm configurations.

---

## 12. Cost Estimation (Reference)

### Current Staging (AWS Co-tenant)

Staging runs on a **shared t3.micro** (KPI cost covers ~$7/mo) and **shared RDS instance** — minimal isolated cost.

### Reference Production Cost Models (Not Provisioned)

#### MVP (30 workers, managed ECS/RDS)
| Service | Configuration | Monthly Cost (USD) |
|---------|--------------|-------------------|
| ECS Fargate | 512 vCPU, 2 tasks | $25 |
| RDS (db.t3.small) | 1 instance, 100GB | $40 |
| S3 (storage) | 100GB, 10K requests | $3 |
| ALB | 1 load balancer | $20 |
| CloudWatch | Logs, metrics | $5 |
| Data Transfer | 100GB out | $9 |
| **Total** | | **$102** |

#### Full Scale (500 workers, multi-AZ)
| Service | Configuration | Monthly Cost (USD) |
|---------|--------------|-------------------|
| ECS Fargate | 1024 vCPU, 4 tasks | $50 |
| RDS (db.t3.medium, Multi-AZ) | 2 instances, 200GB | $150 |
| S3 (storage) | 500GB, 50K requests | $15 |
| ALB | 1 load balancer | $30 |
| ElastiCache (cache.t3.small) | Redis 7, 3-AZ | $40 |
| CloudWatch | Logs, metrics, alarms | $15 |
| CloudFront | 1TB transfer | $85 |
| Data Transfer | 500GB out | $45 |
| **Total** | | **$430** |

### Cost Optimization (Reference)

1. **Reserved Instances / Savings Plans** — save 30-40% on ECS/RDS
2. **S3 Intelligent-Tiering** — auto-transition old media to cheaper storage (40-60% savings)
3. **Right-sizing** — monitor actual usage; scale down off-peak
4. **Snapshot cleanup** — delete snapshots >90 days old

---

## 13. Disaster Recovery Plan

### Backup Strategy

**RDS Backups:**
- Automated daily backups (7-day retention)
- Manual snapshots before major changes
- Cross-region backup replication (Phase 3+)

**S3 Versioning:**
- Enable versioning for all objects (Phase 2+)
- Lifecycle policy to delete old versions after 90 days

### Recovery Time Objective (RTO)
- Target: < 4 hours
- Database restore: < 1 hour
- Application redeploy: < 30 minutes

### Recovery Point Objective (RPO)
- Target: < 1 hour
- Database: Point-in-time restore up to last 5 minutes
- S3: No data loss (eventual consistency)

### DR Procedures

**Database Failure:**
1. Promote read replica to primary (if Multi-AZ enabled)
2. Or restore from latest snapshot
3. Update DNS to point to new endpoint
4. Verify data integrity

**Application Failure:**
1. Auto Scaling will replace unhealthy instances
2. If entire environment fails, deploy new Elastic Beanstalk environment
3. Restore from latest application version

**Regional Failure (Phase 3+):**
1. Failover to backup region (ap-southeast-3)
2. Restore database from cross-region snapshot
3. Update Route 53 to point to backup region

---

## 14. Infrastructure as Code (Phase 2+)

### Terraform Configuration

**Recommended Structure:**
```
terraform/
├── modules/
│   ├── vpc/
│   ├── rds/
│   ├── s3/
│   ├── elastic-beanstalk/
│   └── cloudfront/
├── environments/
│   ├── dev/
│   ├── staging/
│   └── prod/
└── main.tf
```

**Benefits:**
- Version-controlled infrastructure
- Reproducible environments
- Faster disaster recovery
- Infrastructure testing

### Alternative: AWS CloudFormation

**Stack Structure:**
- sekar-network-stack (VPC, subnets, security groups)
- sekar-database-stack (RDS, parameter groups)
- sekar-storage-stack (S3, CloudFront)
- sekar-application-stack (Elastic Beanstalk, ALB)

---

## 15. Security Hardening Checklist

### Network Security
- [ ] Enable VPC Flow Logs
- [ ] Configure AWS WAF rules (Phase 3+)
- [ ] Enable AWS Shield Standard (automatic)
- [ ] Restrict security group rules to minimum required
- [ ] Use private subnets for all non-public resources

### Access Security
- [ ] Enable MFA for all IAM users
- [ ] Use IAM roles instead of access keys where possible
- [ ] Rotate access keys every 90 days
- [ ] Enable CloudTrail for audit logging
- [ ] Configure AWS Config rules (Phase 2+)

### Data Security
- [ ] Enable encryption at rest for RDS
- [ ] Enable encryption at rest for S3
- [ ] Use SSL/TLS for all data in transit
- [ ] Store secrets in AWS Secrets Manager
- [ ] Enable S3 bucket versioning (Phase 2+)

### Monitoring Security
- [ ] Set up CloudWatch alarms for security events
- [ ] Enable AWS GuardDuty (Phase 3+)
- [ ] Configure SNS notifications for critical alerts
- [ ] Review security logs weekly

---

**Document Owner:** DevOps Engineer
**Last Updated:** 2026-06-19
**Status:** Active
**Related Docs:** [`deployment-guide.md`](./deployment-guide.md) (procedures), [`ci-cd.md`](./ci-cd.md), [`encrypted-secrets.md`](./encrypted-secrets.md), [`monitoring.md`](./monitoring.md)

---

## Redis 7 (Live as of Phase 3)

**Status:** Live — supports monitoring v2 rebuild, location-ping streams, caching (aligned with [ADR-016](../architecture/decisions/ADR-016-redis-websocket-scaling.md), [ADR-029](../architecture/decisions/ADR-029-monitoring-v2-event-sourced-redis.md)).

**Purposes (all on a single Redis 7 instance):**

- **Socket.IO Redis adapter** — cross-instance room fanout; unlocks horizontal scaling of the backend.
- **Redis Streams** — `location-pings` stream with consumer group `status-projectors`; decouples location ingest from status projection so bursts don't back up the ingest endpoint.
- **Cache** — area boundaries (TTL 5 min), `monitoring_configs` rows (TTL 5 min), `area_plants.status` summaries (TTL 1 min), `plant_species` catalog (TTL 1 h).
- **Reserved for Phase 4** — JWT refresh-token blacklist (per ADR-016), rate-limiting counters.

**Docker Compose entry (`infra/docker-compose.yml`):**

```yaml
redis:
  image: redis:7-alpine
  container_name: sekar_redis
  ports: ["6379:6379"]
  volumes: [redis_data:/data]
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 3s
    retries: 5
```

**Backend env vars (added to `.env.example`):**

```
REDIS_URL=redis://localhost:6379
REDIS_STREAM_MAX_LEN=100000
MONITORING_SWEEP_CRON=*/5 * * * *
STAFFING_DEBOUNCE_SECONDS=30
```

**Staging:** In-stack Redis container (docker-compose). **Production (on-prem):** Self-hosted Redis in docker-compose.prod.yml. **Reference (managed):** AWS ElastiCache (cache.t3.small) in same VPC; persistence (AOF) ON; daily snapshot to S3.

### Health-check fallback

If Redis becomes unreachable at runtime, the backend degrades gracefully:

- Socket.IO falls back to in-process adapter (single-instance degraded mode).
- Location pings still persist to Postgres; status projection runs inline (higher latency).
- `/health` endpoint surfaces `redis: "unavailable"` so ops can page.
- Cron sweeps continue uninterrupted.

### Cron jobs (new)

- `MonitoringStaleSweeper` — every 5 min; flips `ACTIVE` without a recent ping to `MISSING`.
- `PlantDueDateRecalculator` — daily at 02:00 local; recomputes `area_plants.next_due_at` and `status`.

### Load-test harness

New directory `infra/loadtest/` with k6 scripts to simulate 500 workers pinging every 12 s (see `specs/testing/strategy.md` for SLOs and pass criteria).
