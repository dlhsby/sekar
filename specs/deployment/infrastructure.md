# Infrastructure Specifications

Comprehensive AWS infrastructure setup for SEKAR production deployment.

## Overview

This document details the AWS infrastructure architecture, configuration, and provisioning specifications for the SEKAR system. The infrastructure is designed to support 500 workers across 30 locations with high availability, security, and cost optimization.

---

## 1. AWS Account Structure

### Account Organization

```
Root Account
├── Production Account (sekar-prod)
│   ├── VPC: sekar-prod-vpc
│   ├── RDS: sekar-prod-db
│   ├── S3: sekar-prod-media
│   └── Elastic Beanstalk: sekar-prod-api
├── Staging Account (sekar-staging)
│   └── [Mirror of production at smaller scale]
└── Development Account (sekar-dev)
    └── [Development resources]
```

### AWS Regions
- **Primary Region:** ap-southeast-1 (Singapore)
- **Backup Region:** ap-southeast-3 (Jakarta) - Phase 3+
- **Reason:** Closest to Surabaya, lowest latency

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

## 4. RDS PostgreSQL Configuration

### Database Instance Specifications

#### Development Environment
| Parameter | Value |
|-----------|-------|
| Instance Type | db.t3.micro |
| vCPU | 2 |
| Memory | 1 GB |
| Storage | 20 GB GP2 |
| IOPS | Baseline |
| Multi-AZ | No |
| Backup Retention | 3 days |

#### Production Environment
| Parameter | Value |
|-----------|-------|
| Instance Type | db.t3.small |
| vCPU | 2 |
| Memory | 2 GB |
| Storage | 100 GB GP3 |
| IOPS | 3000 |
| Multi-AZ | Yes (Phase 2+) |
| Backup Retention | 7 days |

### Database Configuration

**Database Name:** sekar_db
**Master Username:** sekar_admin
**Master Password:** (stored in AWS Secrets Manager)

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
      "https://sekar.DLH-sby.go.id",
      "https://api.sekar.DLH-sby.go.id"
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

## 6. Application Hosting (Elastic Beanstalk)

### Elastic Beanstalk Application

**Application Name:** sekar-backend
**Platform:** Node.js 18 running on 64bit Amazon Linux 2023

### Environment Configuration

#### Development Environment

**Environment Name:** sekar-dev
**Instance Type:** t3.micro
**Min Instances:** 1
**Max Instances:** 1
**Load Balancer:** None (direct access)

#### Production Environment

**Environment Name:** sekar-prod
**Instance Type:** t3.small
**Min Instances:** 2
**Max Instances:** 4
**Load Balancer:** Application Load Balancer

### Auto Scaling Configuration

**Scaling Metrics:**
| Metric | Scale Up | Scale Down |
|--------|----------|------------|
| CPU Utilization | > 70% for 5 min | < 30% for 10 min |
| Network Out | > 6 MB for 5 min | < 2 MB for 10 min |
| Latency | > 2s for 3 min | - |

**Scaling Policy:**
- Scale up: Add 1 instance
- Scale down: Remove 1 instance
- Cooldown: 300 seconds

### Load Balancer Configuration

**Type:** Application Load Balancer (ALB)
**Scheme:** Internet-facing
**Subnets:** sekar-public-subnet-1a, sekar-public-subnet-1b

**Listeners:**
| Protocol | Port | Default Action |
|----------|------|----------------|
| HTTPS | 443 | Forward to sekar-prod-tg |
| HTTP | 80 | Redirect to HTTPS |

**Target Group (sekar-prod-tg):**
- Protocol: HTTP
- Port: 3000
- Health check path: /api/health
- Health check interval: 30 seconds
- Healthy threshold: 2
- Unhealthy threshold: 5
- Timeout: 5 seconds
- Deregistration delay: 30 seconds

**Stickiness:**
- Type: None (stateless API)

### SSL/TLS Configuration

**Certificate Source:** AWS Certificate Manager (ACM)
**Domain:** api.sekar.DLH-sby.go.id
**Certificate Type:** RSA-2048
**Validation:** DNS validation

**SSL Policy:** ELBSecurityPolicy-TLS-1-2-2017-01
- TLS 1.2 minimum
- Strong cipher suites only

### Environment Properties

```bash
NODE_ENV=production
PORT=3000
DATABASE_HOST=sekar-prod-db.xxxxx.ap-southeast-1.rds.amazonaws.com
DATABASE_PORT=5432
DATABASE_USER=sekar_admin
DATABASE_PASSWORD={{resolve:secretsmanager:sekar/db/password}}
DATABASE_NAME=sekar_db
JWT_SECRET={{resolve:secretsmanager:sekar/jwt/secret}}
JWT_EXPIRATION=7d
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=sekar-prod-media
CORS_ORIGIN=https://sekar.DLH-sby.go.id
```

### EC2 Instance Configuration

**AMI:** Amazon Linux 2023
**Security Group:** sekar-app-sg
**IAM Instance Profile:** sekar-app-role
**User Data:**
```bash
#!/bin/bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
rpm -U ./amazon-cloudwatch-agent.rpm

# Configure Node.js environment
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=1536"
```

**Root Volume:**
- Type: GP3
- Size: 20 GB
- IOPS: 3000

### Health Monitoring

**Application Health Check:**
- Path: /api/health
- Interval: 30 seconds
- Timeout: 5 seconds
- Unhealthy threshold: 5

**Enhanced Health Reporting:**
- System: OK
- Application: OK
- Health check URL: /api/health

---

## 7. CloudFront CDN (Phase 3+)

### Distribution Configuration

**Origin:** sekar-prod-media.s3.ap-southeast-1.amazonaws.com
**Distribution Domain:** media.sekar.DLH-sby.go.id

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
- Domain: media.sekar.DLH-sby.go.id
- Minimum TLS: 1.2

---

## 8. IAM Roles and Policies

### IAM Role: sekar-app-role

**Trusted Entity:** EC2, Elastic Beanstalk

**Managed Policies:**
- AWSElasticBeanstalkWebTier
- AWSElasticBeanstalkWorkerTier
- AWSElasticBeanstalkMulticontainerDocker

**Inline Policy: sekar-app-policy**
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
        "logs:PutLogEvents",
        "logs:DescribeLogStreams"
      ],
      "Resource": "arn:aws:logs:ap-southeast-1:ACCOUNT_ID:log-group:/aws/elasticbeanstalk/sekar-prod/*"
    },
    {
      "Sid": "SecretsManagerAccess",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:ap-southeast-1:ACCOUNT_ID:secret:sekar/*"
      ]
    }
  ]
}
```

### IAM Role: sekar-rds-monitoring-role

**Trusted Entity:** monitoring.rds.amazonaws.com

**Managed Policies:**
- AmazonRDSEnhancedMonitoringRole

### IAM User: sekar-ci-deploy

**Purpose:** CI/CD deployments from GitHub Actions

**Policies:**
- sekar-ci-deploy-policy (inline)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ElasticBeanstalkDeploy",
      "Effect": "Allow",
      "Action": [
        "elasticbeanstalk:*",
        "s3:*",
        "ec2:*",
        "cloudformation:*",
        "autoscaling:*",
        "elasticloadbalancing:*"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## 9. AWS Secrets Manager

### Secrets Structure

**Secret 1: sekar/db/password**
- Description: RDS master password
- Value: `{SecureRandomPassword}`

**Secret 2: sekar/jwt/secret**
- Description: JWT signing secret
- Value: `{SecureRandomString-256bit}`

**Secret 3: sekar/aws/credentials**
- Description: AWS access keys for S3 (if not using IAM roles)
- Value:
  ```json
  {
    "access_key_id": "AKIAXXXXX",
    "secret_access_key": "xxxxxx"
  }
  ```

### Rotation Policy

- Database password: Rotate every 90 days (Phase 2+)
- JWT secret: Rotate every 180 days (Phase 2+)
- AWS credentials: Rotate on-demand

---

## 10. Route 53 DNS Configuration

### Hosted Zone

**Domain:** sekar.DLH-sby.go.id
**Type:** Public hosted zone

### DNS Records

| Name | Type | Value | TTL |
|------|------|-------|-----|
| sekar.DLH-sby.go.id | A | Alias to ALB | 300 |
| api.sekar.DLH-sby.go.id | A | Alias to ALB | 300 |
| media.sekar.DLH-sby.go.id | CNAME | CloudFront distribution | 300 |
| www.sekar.DLH-sby.go.id | CNAME | sekar.DLH-sby.go.id | 300 |

### Health Checks

**Health Check 1: API Endpoint**
- Endpoint: https://api.sekar.DLH-sby.go.id/api/health
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

## 12. Cost Estimation

### Monthly AWS Costs

#### Development Environment
| Service | Configuration | Monthly Cost (USD) |
|---------|--------------|-------------------|
| RDS (db.t3.micro) | 1 instance, 20GB | $15 |
| S3 (storage) | 10GB, 1000 requests | $1 |
| Elastic Beanstalk (t3.micro) | 1 instance | $7 |
| Data Transfer | 10GB out | $1 |
| **Total** | | **$24** |

#### Production Environment (MVP - 30 workers)
| Service | Configuration | Monthly Cost (USD) |
|---------|--------------|-------------------|
| RDS (db.t3.small) | 1 instance, 100GB | $40 |
| S3 (storage) | 100GB, 10K requests | $3 |
| Elastic Beanstalk (t3.small) | 2 instances | $30 |
| ALB | 1 load balancer | $20 |
| NAT Gateway | 2 gateways, 50GB transfer | $70 |
| Route 53 | 1 hosted zone, 1M queries | $2 |
| CloudWatch | Logs, metrics | $5 |
| Data Transfer | 100GB out | $9 |
| **Total** | | **$179** |

#### Production Environment (Full Scale - 500 workers)
| Service | Configuration | Monthly Cost (USD) |
|---------|--------------|-------------------|
| RDS (db.t3.medium, Multi-AZ) | 2 instances, 200GB | $150 |
| S3 (storage) | 500GB, 50K requests | $15 |
| Elastic Beanstalk (t3.small) | 4 instances | $60 |
| ALB | 1 load balancer, higher traffic | $30 |
| NAT Gateway | 2 gateways, 200GB transfer | $140 |
| Route 53 | 1 hosted zone, 5M queries | $2 |
| CloudWatch | Logs, metrics, alarms | $15 |
| CloudFront (Phase 3+) | 1TB transfer | $85 |
| Data Transfer | 500GB out | $45 |
| **Total** | | **$542** |

### Cost Optimization Strategies

1. **Use Reserved Instances (Phase 2+)**
   - Save 30-40% on EC2/RDS costs
   - Commit to 1-year term

2. **S3 Intelligent-Tiering**
   - Automatically move old files to cheaper storage
   - Save 40-60% on storage costs

3. **CloudFront for Media Delivery (Phase 3+)**
   - Reduce S3 requests and data transfer costs
   - Faster delivery for users

4. **Right-Size Instances**
   - Monitor actual usage
   - Scale down during low-traffic periods

5. **Delete Unused Snapshots**
   - Automated cleanup after 90 days
   - Keep only necessary backups

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
**Last Updated:** 2026-04-24
**Status:** Active
**Related Docs:** [`ci-cd.md`](./ci-cd.md), [`monitoring.md`](./monitoring.md)

---

## Phase 3 Infrastructure Additions

**Status:** Planning (aligned with `specs/phases/phase-3-plants-monitoring-rebuild/infrastructure.md`, [ADR-016](../architecture/decisions/ADR-016-redis-websocket-scaling.md), [ADR-029](../architecture/decisions/ADR-029-monitoring-v2-event-sourced-redis.md)).

### Redis 7

Redis is promoted from Phase 4 to Phase 3 to support the monitoring v2 rebuild.

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

**Production:** Managed Redis (AWS ElastiCache, cache.t3.small to start) in the same VPC as the backend; same security group as RDS access. Persistence (AOF) ON; daily snapshot to S3.

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
