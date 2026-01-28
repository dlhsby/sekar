# SEKAR Web Dashboard - Deployment Guide

Comprehensive deployment guide for SEKAR web dashboard using Docker and CI/CD.

**Last Updated:** January 27, 2026
**Target Environments:** Development, Staging, Production
**Status:** Phase 2E DevOps & Deployment

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Local Development](#local-development)
4. [Docker Deployment](#docker-deployment)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [AWS Deployment](#aws-deployment)
7. [Monitoring & Logging](#monitoring--logging)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 20.x LTS | Runtime environment |
| Docker | 24.x+ | Containerization |
| Docker Compose | 2.x+ | Multi-container orchestration |
| Git | 2.x+ | Version control |

### Required Accounts

- **GitHub** - Source code repository
- **GitHub Container Registry** - Docker image storage
- **AWS Account** (optional) - Cloud deployment
- **Slack** (optional) - Deployment notifications

---

## Environment Configuration

### Environment Variables

Create `.env.local` for local development:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_API_VERSION=v1

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_ERROR_REPORTING=false

# Development
NEXT_TELEMETRY_DISABLED=1
NODE_ENV=development
```

Create `.env.production` for production:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://api.sekar.dlhsurabaya.go.id
NEXT_PUBLIC_API_VERSION=v1

# Analytics
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Error Reporting
NEXT_PUBLIC_ENABLE_ERROR_REPORTING=true
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx

# Production
NEXT_TELEMETRY_DISABLED=1
NODE_ENV=production
```

### GitHub Secrets

Configure in **Settings → Secrets and variables → Actions**:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Production API URL | `https://api.sekar.dlhsurabaya.go.id` |
| `LHCI_GITHUB_APP_TOKEN` | Lighthouse CI token | GitHub token |
| `SLACK_WEBHOOK` | Slack webhook for notifications | `https://hooks.slack.com/...` |
| `AWS_ACCESS_KEY_ID` | AWS credentials | IAM access key |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials | IAM secret key |
| `DOCKER_REGISTRY_TOKEN` | Docker registry token | GitHub PAT |

---

## Local Development

### Standard Development Server

```bash
cd fe/web
npm install
npm run dev
```

Open http://localhost:3000

### Docker Development (Hot Reload)

```bash
cd fe/web
docker-compose -f docker-compose.dev.yml up
```

Services started:
- **Web:** http://localhost:3001
- **Backend:** http://localhost:3000
- **Database:** localhost:5432
- **Adminer:** http://localhost:8080

### Stop Development Containers

```bash
docker-compose -f docker-compose.dev.yml down
```

---

## Docker Deployment

### Build Production Image

```bash
cd fe/web
docker build -t sekar-web:latest .
```

### Run Production Container

```bash
docker run -d \
  --name sekar-web \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=https://api.sekar.dlhsurabaya.go.id \
  -e NEXT_PUBLIC_API_VERSION=v1 \
  sekar-web:latest
```

### Multi-Container Deployment

```bash
cd fe/web
docker-compose up -d
```

Services:
- **Web Dashboard:** http://localhost:3001
- **Backend API:** http://localhost:3000
- **PostgreSQL:** localhost:5432

### Health Check

```bash
# Check web health
curl http://localhost:3001/api/health

# Check container logs
docker logs sekar-web

# Check container status
docker ps | grep sekar
```

### Stop and Remove Containers

```bash
cd fe/web
docker-compose down

# Remove volumes (WARNING: deletes database)
docker-compose down -v
```

---

## CI/CD Pipeline

### Pipeline Stages

The GitHub Actions workflow includes 9 stages:

1. **Lint and Type Check** - ESLint, TypeScript, Prettier
2. **Build** - Next.js production build
3. **E2E Tests** - Playwright tests (3 browsers)
4. **Accessibility Audit** - Lighthouse accessibility
5. **Performance Audit** - Lighthouse performance
6. **Docker Build** - Multi-platform image build
7. **Deploy Staging** - Auto-deploy to staging (develop branch)
8. **Deploy Production** - Auto-deploy to production (main branch)
9. **Security Scan** - Trivy vulnerability scanning

### Triggering Pipeline

**Push to develop:**
```bash
git push origin develop
# → Triggers: Build, Test, Audit, Docker Build, Deploy Staging
```

**Push to main:**
```bash
git push origin main
# → Triggers: Build, Test, Audit, Docker Build, Deploy Production
```

**Pull request:**
```bash
git push origin feature-branch
# → Triggers: Build, Test, Audit (no deployment)
```

### Viewing Pipeline Status

1. Go to **Actions** tab in GitHub
2. Select workflow run
3. View job logs and artifacts

### Pipeline Artifacts

| Artifact | Description | Retention |
|----------|-------------|-----------|
| `nextjs-build` | Built .next directory | 7 days |
| `playwright-report-*` | E2E test results (per browser) | 30 days |
| `playwright-screenshots-*` | Failed test screenshots | 30 days |
| `lighthouse-results` | Accessibility audit results | 30 days |
| `lighthouse-performance` | Performance audit results | 30 days |
| `sbom` | Software Bill of Materials | 90 days |

---

## AWS Deployment

### Architecture Overview

```
┌─────────────┐
│   Route 53  │  DNS
└──────┬──────┘
       │
┌──────▼──────┐
│ CloudFront  │  CDN
└──────┬──────┘
       │
┌──────▼──────┐
│     ALB     │  Load Balancer
└──────┬──────┘
       │
┌──────▼──────┐
│  ECS/Fargate│  Containers
│   (Web App) │
└──────┬──────┘
       │
┌──────▼──────┐
│     RDS     │  PostgreSQL
└─────────────┘
```

### 1. Create ECR Repository

```bash
# Create repository
aws ecr create-repository \
  --repository-name sekar/web \
  --region ap-southeast-1

# Login to ECR
aws ecr get-login-password --region ap-southeast-1 | \
  docker login --username AWS --password-stdin \
  <account-id>.dkr.ecr.ap-southeast-1.amazonaws.com
```

### 2. Push Image to ECR

```bash
# Tag image
docker tag sekar-web:latest \
  <account-id>.dkr.ecr.ap-southeast-1.amazonaws.com/sekar/web:latest

# Push image
docker push \
  <account-id>.dkr.ecr.ap-southeast-1.amazonaws.com/sekar/web:latest
```

### 3. Create ECS Cluster

```bash
aws ecs create-cluster \
  --cluster-name sekar-cluster \
  --region ap-southeast-1
```

### 4. Create Task Definition

Create `ecs-task-definition.json`:

```json
{
  "family": "sekar-web",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::<account-id>:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "web",
      "image": "<account-id>.dkr.ecr.ap-southeast-1.amazonaws.com/sekar/web:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "NEXT_PUBLIC_API_URL",
          "value": "https://api.sekar.dlhsurabaya.go.id"
        },
        {
          "name": "NEXT_PUBLIC_API_VERSION",
          "value": "v1"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/sekar-web",
          "awslogs-region": "ap-southeast-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "node -e \"require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})\""
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

Register task definition:

```bash
aws ecs register-task-definition \
  --cli-input-json file://ecs-task-definition.json
```

### 5. Create ECS Service

```bash
aws ecs create-service \
  --cluster sekar-cluster \
  --service-name sekar-web \
  --task-definition sekar-web \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:ap-southeast-1:<account-id>:targetgroup/sekar-web/xxx,containerName=web,containerPort=3000"
```

### 6. Configure Auto Scaling

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/sekar-cluster/sekar-web \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10

# Create scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/sekar-cluster/sekar-web \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

`scaling-policy.json`:
```json
{
  "TargetValue": 70.0,
  "PredefinedMetricSpecification": {
    "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
  },
  "ScaleInCooldown": 300,
  "ScaleOutCooldown": 60
}
```

### 7. Setup CloudFront CDN

```bash
# Create CloudFront distribution
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json
```

### 8. Configure Route 53

```bash
# Create hosted zone (if not exists)
aws route53 create-hosted-zone \
  --name sekar.dlhsurabaya.go.id \
  --caller-reference $(date +%s)

# Create A record pointing to CloudFront
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456 \
  --change-batch file://route53-change.json
```

---

## Monitoring & Logging

### CloudWatch Dashboards

Create dashboard `sekar-web-dashboard`:

**Metrics to monitor:**
- **ECS Service:** CPU, Memory, Running tasks
- **ALB:** Request count, Target response time, HTTP errors
- **CloudFront:** Requests, Cache hit rate, Error rate

### CloudWatch Alarms

```bash
# High CPU alarm
aws cloudwatch put-metric-alarm \
  --alarm-name sekar-web-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --dimensions Name=ServiceName,Value=sekar-web Name=ClusterName,Value=sekar-cluster

# High error rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name sekar-web-high-errors \
  --alarm-description "Alert when 5xx errors exceed 10" \
  --metric-name HTTPCode_Target_5XX_Count \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 60 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

### Application Logs

View logs:
```bash
# ECS container logs
aws logs tail /ecs/sekar-web --follow

# Filter errors
aws logs filter-log-events \
  --log-group-name /ecs/sekar-web \
  --filter-pattern "ERROR"
```

### Error Tracking (Sentry)

Install Sentry SDK:
```bash
npm install @sentry/nextjs
```

Initialize in `sentry.client.config.ts`:
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### Performance Monitoring (Vercel Analytics)

Already configured in `app/layout.tsx`:
```typescript
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

---

## Troubleshooting

### Build Failures

**Problem:** Docker build fails with "ENOENT" error
```bash
# Solution: Ensure .dockerignore excludes node_modules
echo "node_modules" >> .dockerignore
```

**Problem:** Next.js build fails with "Module not found"
```bash
# Solution: Clear cache and reinstall
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

### Container Crashes

**Problem:** Container exits with code 137 (OOM)
```bash
# Solution: Increase memory limit
docker run -m 2g sekar-web:latest
# Or in docker-compose.yml:
deploy:
  resources:
    limits:
      memory: 2G
```

**Problem:** Health check fails
```bash
# Debug health check
docker exec sekar-web curl http://localhost:3000/api/health

# Check logs
docker logs sekar-web
```

### Deployment Issues

**Problem:** ECS task fails to start
```bash
# Check task stopped reason
aws ecs describe-tasks \
  --cluster sekar-cluster \
  --tasks <task-id>

# Common causes:
# - Insufficient memory/CPU
# - Image pull errors
# - Environment variable issues
```

**Problem:** 502 Bad Gateway
```bash
# Checklist:
# 1. Verify target group health
# 2. Check security group allows traffic
# 3. Verify container port mapping
# 4. Check application logs
```

### Performance Issues

**Problem:** Slow page loads
```bash
# Run Lighthouse audit
lighthouse http://sekar.dlhsurabaya.go.id/dashboard

# Check CloudFront cache hit rate
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name CacheHitRate \
  --start-time 2026-01-27T00:00:00Z \
  --end-time 2026-01-27T23:59:59Z \
  --period 3600 \
  --statistics Average
```

---

## Rollback Procedures

### Rollback Docker Image

```bash
# List previous images
docker images | grep sekar-web

# Tag previous image as latest
docker tag sekar-web:previous sekar-web:latest

# Restart container
docker-compose up -d --force-recreate web
```

### Rollback ECS Deployment

```bash
# List task definition revisions
aws ecs list-task-definitions \
  --family-prefix sekar-web

# Update service to previous revision
aws ecs update-service \
  --cluster sekar-cluster \
  --service sekar-web \
  --task-definition sekar-web:1
```

### Rollback via GitHub

```bash
# Revert commit
git revert <commit-hash>
git push origin main
# → Triggers new deployment with reverted code
```

---

## Security Checklist

- [ ] **Secrets Management:** Use AWS Secrets Manager or GitHub Secrets
- [ ] **HTTPS Only:** Enforce SSL/TLS (CloudFront + ACM)
- [ ] **Security Headers:** Configured in next.config.ts
- [ ] **IAM Permissions:** Least privilege principle
- [ ] **Container Scanning:** Trivy in CI/CD pipeline
- [ ] **Network Security:** VPC, security groups, NACLs
- [ ] **DDoS Protection:** AWS Shield + CloudFront
- [ ] **WAF:** AWS WAF rules for common attacks
- [ ] **Audit Logging:** CloudTrail enabled
- [ ] **Backup & Recovery:** RDS automated backups

---

## Support

For deployment issues:
1. Check [Troubleshooting](#troubleshooting) section
2. Review CloudWatch logs
3. Contact DevOps team: devops@dlhsurabaya.go.id

For application issues:
1. Check Sentry error tracking
2. Review application logs
3. Contact development team: dev@dlhsurabaya.go.id
