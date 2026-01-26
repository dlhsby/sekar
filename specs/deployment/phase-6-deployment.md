# Phase 6 Deployment Guide - Web Dashboard

Deployment procedures for Phase 6 web dashboard featuring full CRUD operations, bulk actions, advanced filtering, audit logs, and admin tools.

## Overview

Phase 6 introduces:
- **Next.js Web Dashboard** for supervisors and admins
- **Full CRUD Operations** for all entities
- **Bulk Actions** for managing multiple records
- **Advanced Filtering & Search** with saved filters
- **Audit Logs** tracking all changes
- **Data Export** in multiple formats (CSV, Excel, PDF)
- **Role-Based Access Control** with granular permissions
- **Real-time Updates** via WebSocket

---

## 1. Pre-Deployment Checklist

### Code Readiness
- [ ] Next.js application built and tested
- [ ] All CRUD operations functional
- [ ] Unit tests passing (>80% coverage)
- [ ] E2E tests passing (Cypress/Playwright)
- [ ] Responsive design verified (desktop, tablet, mobile)
- [ ] Browser compatibility tested (Chrome, Firefox, Safari, Edge)
- [ ] Performance benchmarks met (Lighthouse score > 90)
- [ ] Security audit completed

### Infrastructure Readiness
- [ ] Hosting platform selected (Vercel, AWS Amplify, or self-hosted)
- [ ] CDN configured for static assets
- [ ] Database backup taken
- [ ] CloudWatch alarms configured for web metrics
- [ ] SSL certificate provisioned
- [ ] DNS records configured

### Deployment Platform Options
- **Option 1: Vercel** (Recommended for Next.js)
  - Zero-config deployment
  - Global CDN
  - Automatic HTTPS
  - Built-in analytics
- **Option 2: AWS Amplify**
  - Native AWS integration
  - CI/CD built-in
  - Cost-effective
- **Option 3: Self-hosted (AWS EC2/ECS)**
  - Full control
  - Custom scaling
  - More complex setup

---

## 2. Environment Variables - Phase 6 Additions

### Web Dashboard (.env.production)

```bash
# Next.js Configuration
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.sekar.DLH-sby.go.id
NEXT_PUBLIC_WEBSOCKET_URL=wss://api.sekar.DLH-sby.go.id
NEXT_PUBLIC_APP_NAME=SEKAR Dashboard
NEXT_PUBLIC_APP_VERSION=1.0.0

# Authentication
NEXT_PUBLIC_AUTH_STORAGE_KEY=sekar_auth_token
NEXTAUTH_URL=https://dashboard.sekar.DLH-sby.go.id
NEXTAUTH_SECRET=<random-32-byte-string>
JWT_SECRET=<same-as-backend>

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<your-key>

# Sentry (Error Tracking)
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
SENTRY_AUTH_TOKEN=<your-token>

# Analytics
NEXT_PUBLIC_GA_TRACKING_ID=G-XXXXXXXXXX  # Google Analytics 4
NEXT_PUBLIC_ENABLE_ANALYTICS=true

# Feature Flags
NEXT_PUBLIC_ENABLE_BULK_ACTIONS=true
NEXT_PUBLIC_ENABLE_AUDIT_LOGS=true
NEXT_PUBLIC_ENABLE_DATA_EXPORT=true
NEXT_PUBLIC_MAX_EXPORT_ROWS=10000

# File Upload
NEXT_PUBLIC_MAX_FILE_SIZE=10485760  # 10 MB
NEXT_PUBLIC_ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf

# Session
SESSION_TIMEOUT=3600000  # 1 hour in milliseconds
SESSION_REFRESH_INTERVAL=300000  # 5 minutes
```

### Backend (.env additions for Web Support)

```bash
# Web Dashboard CORS
CORS_ORIGIN=https://dashboard.sekar.DLH-sby.go.id,https://sekar.DLH-sby.go.id
CORS_CREDENTIALS=true

# Audit Logging
AUDIT_LOG_ENABLED=true
AUDIT_LOG_DETAILED=true  # Log request/response payloads
AUDIT_LOG_RETENTION_DAYS=365

# Bulk Operations
BULK_OPERATION_MAX_ITEMS=100
BULK_OPERATION_TIMEOUT=300000  # 5 minutes

# Export Configuration
EXPORT_MAX_ROWS=10000
EXPORT_TIMEOUT=120000  # 2 minutes
EXPORT_S3_BUCKET=sekar-exports
EXPORT_TEMP_DIR=/tmp/sekar-exports
```

---

## 3. Hosting Setup

### Option 1: Vercel Deployment (Recommended)

**Step 1: Install Vercel CLI**
```bash
npm install -g vercel
```

**Step 2: Connect Project**
```bash
cd fe/web
vercel login
vercel link
```

**Step 3: Configure Project**
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["sin1"],
  "env": {
    "NEXT_PUBLIC_API_URL": "@sekar_api_url",
    "NEXT_PUBLIC_WEBSOCKET_URL": "@sekar_websocket_url",
    "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY": "@google_maps_api_key",
    "NEXTAUTH_SECRET": "@nextauth_secret"
  }
}
```

**Step 4: Deploy**
```bash
# Preview deployment (staging)
vercel

# Production deployment
vercel --prod
```

**Step 5: Configure Custom Domain**
```bash
vercel domains add dashboard.sekar.DLH-sby.go.id
```

**DNS Configuration (Route 53):**
```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "dashboard.sekar.DLH-sby.go.id",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "cname.vercel-dns.com"}]
      }
    }]
  }'
```

---

### Option 2: AWS Amplify Deployment

**Step 1: Create Amplify App**
```bash
aws amplify create-app \
  --name sekar-dashboard \
  --repository https://github.com/your-org/sekar \
  --oauth-token $GITHUB_TOKEN \
  --platform WEB \
  --iam-service-role-arn arn:aws:iam::ACCOUNT_ID:role/sekar-amplify-role
```

**Step 2: Create Branch**
```bash
aws amplify create-branch \
  --app-id d111111abcdef \
  --branch-name main \
  --framework Next.js \
  --enable-auto-build
```

**Step 3: Configure Build Settings**
```yaml
# amplify.yml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd fe/web
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: fe/web/.next
    files:
      - '**/*'
  cache:
    paths:
      - fe/web/node_modules/**/*
```

**Step 4: Configure Environment Variables**
```bash
aws amplify update-app \
  --app-id d111111abcdef \
  --environment-variables \
    NEXT_PUBLIC_API_URL=https://api.sekar.DLH-sby.go.id \
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$MAPS_API_KEY
```

**Step 5: Configure Custom Domain**
```bash
aws amplify create-domain-association \
  --app-id d111111abcdef \
  --domain-name sekar.DLH-sby.go.id \
  --sub-domain-settings prefix=dashboard,branchName=main
```

---

### Option 3: Self-Hosted (Docker + AWS ECS)

**Dockerfile:**
```dockerfile
# fe/web/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build Next.js app
RUN npm run build

# Production image
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npm", "start"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  web-dashboard:
    build:
      context: ./fe/web
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://api.sekar.DLH-sby.go.id
      - NEXT_PUBLIC_WEBSOCKET_URL=wss://api.sekar.DLH-sby.go.id
    restart: unless-stopped
    networks:
      - sekar-network

networks:
  sekar-network:
    driver: bridge
```

**Deploy to ECS:**
```bash
# Build and push Docker image
docker build -t sekar-web:latest fe/web
docker tag sekar-web:latest ACCOUNT_ID.dkr.ecr.ap-southeast-1.amazonaws.com/sekar-web:latest
docker push ACCOUNT_ID.dkr.ecr.ap-southeast-1.amazonaws.com/sekar-web:latest

# Create ECS task definition
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json

# Update ECS service
aws ecs update-service \
  --cluster sekar-prod-cluster \
  --service sekar-web-service \
  --task-definition sekar-web:1
```

---

## 4. Database Migrations

### Migration Files for Phase 6

**Migration 1: Audit Logs Table**
```sql
-- File: be/src/database/migrations/1708000000000-CreateAuditLogsTable.ts
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'export', 'bulk_update'
    entity_type VARCHAR(100) NOT NULL, -- 'user', 'area', 'shift', 'report', 'asset', 'task'
    entity_id UUID NOT NULL,

    -- Change details
    changes JSONB, -- { "field": { "old": "value", "new": "value" } }
    metadata JSONB, -- Additional context (IP, user agent, etc.)

    -- Request details
    ip_address INET,
    user_agent TEXT,
    request_method VARCHAR(10),
    request_path TEXT,

    -- Result
    status VARCHAR(20) NOT NULL, -- 'success', 'failed'
    error_message TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_composite ON audit_logs(entity_type, entity_id, created_at DESC);
```

**Migration 2: Saved Filters Table**
```sql
-- File: be/src/database/migrations/1708000001000-CreateSavedFiltersTable.ts
CREATE TABLE saved_filters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    entity_type VARCHAR(100) NOT NULL, -- 'shifts', 'reports', 'users', 'assets'
    filters JSONB NOT NULL, -- Filter configuration
    is_public BOOLEAN DEFAULT FALSE, -- Share with other users
    is_default BOOLEAN DEFAULT FALSE, -- Auto-apply on page load

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_saved_filters_user_id ON saved_filters(user_id);
CREATE INDEX idx_saved_filters_entity_type ON saved_filters(entity_type);
CREATE INDEX idx_saved_filters_is_public ON saved_filters(is_public);
```

**Migration 3: Bulk Operations Log Table**
```sql
-- File: be/src/database/migrations/1708000002000-CreateBulkOperationsTable.ts
CREATE TABLE bulk_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    operation VARCHAR(100) NOT NULL, -- 'bulk_delete', 'bulk_update', 'bulk_export'
    entity_type VARCHAR(100) NOT NULL,

    -- Operation details
    total_items INTEGER NOT NULL,
    successful_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    progress_percent INTEGER DEFAULT 0,

    -- Results
    result_summary JSONB, -- { "created": 10, "updated": 20, "failed": 2 }
    errors JSONB, -- Array of error messages

    -- File (for exports)
    file_url TEXT,
    file_size BIGINT,

    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bulk_operations_user_id ON bulk_operations(user_id);
CREATE INDEX idx_bulk_operations_status ON bulk_operations(status);
CREATE INDEX idx_bulk_operations_created_at ON bulk_operations(created_at DESC);
```

**Migration 4: User Preferences Table**
```sql
-- File: be/src/database/migrations/1708000003000-CreateUserPreferencesTable.ts
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id),

    -- UI preferences
    theme VARCHAR(20) DEFAULT 'light', -- 'light', 'dark', 'auto'
    language VARCHAR(10) DEFAULT 'id', -- 'id', 'en'
    timezone VARCHAR(50) DEFAULT 'Asia/Jakarta',
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    time_format VARCHAR(10) DEFAULT '24h', -- '12h', '24h'

    -- Dashboard preferences
    default_dashboard VARCHAR(100), -- 'overview', 'map', 'reports'
    items_per_page INTEGER DEFAULT 25,

    -- Notification preferences
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    notification_frequency VARCHAR(20) DEFAULT 'realtime', -- 'realtime', 'hourly', 'daily'

    -- Data export preferences
    default_export_format VARCHAR(10) DEFAULT 'xlsx', -- 'csv', 'xlsx', 'pdf'

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
```

---

## 5. Web Application Architecture

### Technology Stack

**Frontend:**
- **Framework:** Next.js 14+ (App Router)
- **UI Library:** React 18+
- **Styling:** Tailwind CSS
- **State Management:** Zustand / Redux Toolkit
- **Data Fetching:** React Query (TanStack Query)
- **Forms:** React Hook Form + Zod validation
- **Charts:** Chart.js / Recharts
- **Maps:** Google Maps React
- **Tables:** TanStack Table
- **Real-time:** Socket.IO client

**Key Dependencies:**
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@tanstack/react-query": "^5.0.0",
    "@tanstack/react-table": "^8.0.0",
    "socket.io-client": "^4.6.0",
    "react-hook-form": "^7.49.0",
    "zod": "^3.22.0",
    "tailwindcss": "^3.4.0",
    "chart.js": "^4.4.0",
    "react-chartjs-2": "^5.2.0",
    "@react-google-maps/api": "^2.19.0",
    "date-fns": "^3.0.0",
    "axios": "^1.6.0",
    "zustand": "^4.4.0"
  }
}
```

### Project Structure

```
fe/web/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── workers/
│   │   ├── areas/
│   │   ├── shifts/
│   │   ├── reports/
│   │   ├── tasks/
│   │   ├── assets/
│   │   ├── analytics/
│   │   ├── audit-logs/
│   │   └── layout.tsx
│   ├── api/
│   │   └── auth/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/ (shadcn/ui components)
│   ├── forms/
│   ├── tables/
│   ├── charts/
│   └── maps/
├── lib/
│   ├── api.ts
│   ├── auth.ts
│   ├── utils.ts
│   └── constants.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useWebSocket.ts
│   └── usePermissions.ts
├── stores/
│   ├── authStore.ts
│   └── uiStore.ts
├── types/
│   └── index.ts
└── public/
    ├── images/
    └── icons/
```

---

## 6. Key Features Implementation

### Audit Logging Interceptor

**Backend:**
```typescript
// be/src/common/interceptors/audit-log.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, body, ip, headers } = request;

    // Only log mutating operations (POST, PUT, PATCH, DELETE)
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle().pipe(
        tap({
          next: (response) => {
            this.auditLogService.log({
              user_id: user?.id,
              action: this.mapMethodToAction(method),
              entity_type: this.extractEntityType(url),
              entity_id: response?.id || body?.id,
              changes: this.computeChanges(body, response),
              ip_address: ip,
              user_agent: headers['user-agent'],
              request_method: method,
              request_path: url,
              status: 'success',
            });
          },
          error: (error) => {
            this.auditLogService.log({
              user_id: user?.id,
              action: this.mapMethodToAction(method),
              entity_type: this.extractEntityType(url),
              status: 'failed',
              error_message: error.message,
              ip_address: ip,
              request_path: url,
            });
          },
        }),
      );
    }

    return next.handle();
  }

  private mapMethodToAction(method: string): string {
    const map = { POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete' };
    return map[method] || 'unknown';
  }

  private extractEntityType(url: string): string {
    // Extract entity type from URL: /api/users/123 -> 'user'
    const match = url.match(/\/api\/(\w+)/);
    return match ? match[1].slice(0, -1) : 'unknown'; // Remove trailing 's'
  }

  private computeChanges(requestBody: any, response: any): any {
    // Compare request body with response to track changes
    // Return object with old/new values for each changed field
    return {}; // Simplified
  }
}
```

### Bulk Operations Queue

**Backend:**
```typescript
// be/src/modules/bulk-operations/bulk-operations.processor.ts
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('bulk-operations')
export class BulkOperationsProcessor {
  @Process('bulk-update')
  async handleBulkUpdate(job: Job) {
    const { operation_id, entity_type, items, update_data } = job.data;

    let successful = 0;
    let failed = 0;
    const errors = [];

    for (let i = 0; i < items.length; i++) {
      try {
        await this.updateEntity(entity_type, items[i], update_data);
        successful++;

        // Update progress
        const progress = Math.round(((i + 1) / items.length) * 100);
        await this.bulkOperationsService.updateProgress(operation_id, progress);
      } catch (error) {
        failed++;
        errors.push({ item: items[i], error: error.message });
      }
    }

    // Mark operation as completed
    await this.bulkOperationsService.complete(operation_id, {
      successful_items: successful,
      failed_items: failed,
      errors,
    });
  }

  @Process('bulk-delete')
  async handleBulkDelete(job: Job) {
    // Similar to bulk-update
  }

  @Process('bulk-export')
  async handleBulkExport(job: Job) {
    const { operation_id, entity_type, filters, format } = job.data;

    // Fetch data
    const data = await this.fetchData(entity_type, filters);

    // Generate file
    const filePath = await this.generateFile(data, format);

    // Upload to S3
    const fileUrl = await this.uploadToS3(filePath);

    // Update operation
    await this.bulkOperationsService.complete(operation_id, {
      file_url: fileUrl,
      successful_items: data.length,
    });
  }
}
```

---

## 7. Deployment Procedure

### Step 1: Pre-Deployment Tests

```bash
# Run tests
cd fe/web
npm test
npm run test:e2e

# Build production bundle
npm run build

# Test production build locally
npm start

# Lighthouse audit
npx lighthouse http://localhost:3000 --output html --output-path ./lighthouse-report.html
```

### Step 2: Deploy to Production

**Vercel:**
```bash
cd fe/web
vercel --prod
```

**AWS Amplify:**
```bash
# Push to main branch (auto-deploys)
git push origin main
```

**Self-hosted:**
```bash
# Build and push Docker image
docker build -t sekar-web:v1.0.0 fe/web
docker push ACCOUNT_ID.dkr.ecr.ap-southeast-1.amazonaws.com/sekar-web:v1.0.0

# Deploy to ECS
aws ecs update-service \
  --cluster sekar-prod-cluster \
  --service sekar-web-service \
  --force-new-deployment
```

### Step 3: Verify Deployment

```bash
# Check health
curl https://dashboard.sekar.DLH-sby.go.id/api/health

# Test login
# Manual: Open browser, navigate to dashboard, login

# Check performance
npx lighthouse https://dashboard.sekar.DLH-sby.go.id --output json
```

---

## 8. Monitoring - Phase 6 Additions

### Web Vitals Monitoring

**Frontend Monitoring:**
```typescript
// fe/web/lib/analytics.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export function sendToAnalytics(metric: any) {
  // Send to Google Analytics
  if (window.gtag) {
    window.gtag('event', metric.name, {
      event_category: 'Web Vitals',
      value: Math.round(metric.value),
      event_label: metric.id,
      non_interaction: true,
    });
  }

  // Send to custom backend
  fetch('/api/metrics', {
    method: 'POST',
    body: JSON.stringify(metric),
    headers: { 'Content-Type': 'application/json' },
  });
}

// Track all Web Vitals
getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### CloudWatch Dashboard

**Web Dashboard Metrics:**
| Widget | Type | Metric | Target |
|--------|------|--------|--------|
| Page Load Time | Line | Custom/PageLoadTime | < 2s |
| Time to First Byte | Line | Custom/TTFB | < 600ms |
| Largest Contentful Paint | Line | Custom/LCP | < 2.5s |
| Cumulative Layout Shift | Line | Custom/CLS | < 0.1 |
| First Input Delay | Line | Custom/FID | < 100ms |
| Error Rate | Line | Custom/ErrorRate | < 1% |

---

## 9. User Training & Documentation

### Admin User Guide

Create comprehensive documentation:
- [ ] Login and authentication
- [ ] Dashboard overview
- [ ] User management (CRUD)
- [ ] Area management with map tools
- [ ] Shift monitoring and reports
- [ ] Task assignment workflows
- [ ] Asset management and QR codes
- [ ] Analytics and reporting
- [ ] Audit log review
- [ ] Bulk operations guide
- [ ] Data export procedures

### Training Plan

**Week 1: Supervisor Training**
- Overview of web dashboard
- Monitoring worker locations
- Reviewing reports
- Task assignment
- Basic analytics

**Week 2: Admin Training**
- User management
- Area configuration
- Asset management
- Advanced analytics
- Audit logs
- System settings

---

## 10. Success Criteria

Phase 6 deployment is successful when:

**Technical Metrics:**
- [ ] Lighthouse score > 90 (Performance, Accessibility, Best Practices, SEO)
- [ ] Time to First Byte < 600ms
- [ ] Largest Contentful Paint < 2.5s
- [ ] First Input Delay < 100ms
- [ ] Cumulative Layout Shift < 0.1
- [ ] Error rate < 1%
- [ ] Uptime > 99.9%

**Functional Metrics:**
- [ ] All CRUD operations working
- [ ] Bulk actions processing correctly
- [ ] Data exports generating valid files
- [ ] Audit logs capturing all changes
- [ ] Real-time updates via WebSocket functional
- [ ] Role-based access control enforced

**User Metrics:**
- [ ] > 80% of supervisors and admins trained
- [ ] > 90% user satisfaction (survey)
- [ ] Average session duration > 10 minutes
- [ ] < 5 support tickets per week after first month

---

**Document Owner:** DevOps Engineer
**Last Updated:** 2026-01-21
**Status:** Active - Phase 6
**Related Docs:** [`infrastructure.md`](./infrastructure.md), [`phase-5-deployment.md`](./phase-5-deployment.md)
