# Phase 5: System Maintenance & Operations Guide

**Date:** March 13, 2026
**Status:** Not Started
**Depends On:** Phase 5 Sub-Phases 5-1 through 5-5 Complete
**Related Sub-Phase:** 5-6
**Audience:** System administrators, DevOps engineers

---

## Current Codebase Facts (Post-Phase 4 Expected Values)

| Fact | Value |
|------|-------|
| Backend | NestJS 11.x on Node.js 24.x, PM2 process manager |
| Database | PostgreSQL 14, ~31 tables (24 Phase 4 + 7 Phase 5) |
| Cache | Redis 7 (JWT blacklist, analytics cache, WebSocket scaling) |
| Storage | AWS S3 (sekar-media-prod bucket) |
| Monitoring | Sentry (backend + mobile), structured logging |
| Hosting | AWS EC2 (backend), Vercel (web), Google Play / App Store (mobile) |
| CI/CD | GitHub Actions (3 pipelines: backend, web, mobile) |

---

## A. System Architecture Overview

### A1. Production Environment

```
                    ┌─────────────────────┐
                    │   Cloudflare DNS     │
                    └──────┬──────────────┘
                           │
               ┌───────────┼──────────────┐
               │           │              │
       ┌───────▼──┐  ┌─────▼────┐  ┌─────▼────┐
       │  Vercel   │  │  EC2     │  │  S3      │
       │  Next.js  │  │  NestJS  │  │  Media   │
       │  Web App  │  │  Backend │  │  Storage │
       └──────────┘  └────┬─────┘  └──────────┘
                          │
                ┌─────────┼─────────┐
                │         │         │
         ┌──────▼──┐ ┌────▼───┐ ┌──▼──────┐
         │ PG 14   │ │ Redis  │ │ Sentry  │
         │ Database │ │ Cache  │ │ Errors  │
         └─────────┘ └────────┘ └─────────┘
```

### A2. Server Access

| Server | Host | Access | Purpose |
|--------|------|--------|---------|
| Production API | api.sekar.wahyutrip.com | SSH key | Backend + DB + Redis |
| Staging API | api-staging.sekar.wahyutrip.com | SSH key | Testing |
| Web (Prod) | sekar.wahyutrip.com | Vercel Dashboard | Frontend |
| Web (Staging) | staging.sekar.wahyutrip.com | Vercel Dashboard | Testing |

### A3. Key Directories

```bash
# Production server
/app/sekar/                    # Application root
/app/sekar/be/                 # Backend source
/app/sekar/be/dist/            # Compiled backend
/app/sekar/be/.env             # Environment variables (NEVER commit)
/var/log/sekar/                # Application logs
/var/backups/sekar/            # Database backups
```

---

## B. Server Administration

### B1. PM2 Process Management

```bash
# View running processes
pm2 list

# Restart backend
pm2 restart sekar-api

# View logs (live)
pm2 logs sekar-api

# View last 100 lines
pm2 logs sekar-api --lines 100

# Reload without downtime (graceful)
pm2 reload sekar-api

# View process info
pm2 show sekar-api

# Save current process list (survives reboot)
pm2 save

# Monitor CPU/memory in real-time
pm2 monit
```

### B2. Database Administration

```bash
# Connect to production database
psql -h localhost -U sekar_prod -d sekar_db

# Connect to staging database
psql -h localhost -U sekar_staging -d sekar_staging_db

# Check database size
psql -c "SELECT pg_size_pretty(pg_database_size('sekar_db'));"

# Check table sizes
psql -c "SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
         FROM pg_catalog.pg_statio_user_tables
         ORDER BY pg_total_relation_size(relid) DESC
         LIMIT 20;"

# Check active connections
psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname='sekar_db';"

# Check long-running queries
psql -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query
         FROM pg_stat_activity
         WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
         AND state != 'idle';"

# Kill a stuck query
psql -c "SELECT pg_terminate_backend(<pid>);"
```

### B3. Redis Administration

```bash
# Connect to Redis
redis-cli

# Check memory usage
redis-cli INFO memory

# Check connected clients
redis-cli INFO clients

# Check key count by database
redis-cli INFO keyspace

# Flush analytics cache only (DB 0, pattern-based)
redis-cli KEYS "analytics:*" | xargs redis-cli DEL

# Flush JWT blacklist (careful!)
redis-cli KEYS "jwt:blacklist:*" | xargs redis-cli DEL

# Monitor commands in real-time
redis-cli MONITOR
```

### B4. S3 Storage Administration

```bash
# List bucket contents
aws s3 ls s3://sekar-media-prod/ --recursive --human-readable

# Check bucket size
aws s3 ls s3://sekar-media-prod/ --recursive --summarize | tail -2

# Copy file from S3
aws s3 cp s3://sekar-media-prod/profiles/user-123.jpg ./

# Delete old generated reports (>90 days)
aws s3 ls s3://sekar-media-prod/reports/ | awk '{print $4}' | while read key; do
  aws s3 rm "s3://sekar-media-prod/reports/$key"
done
```

---

## C. Routine Maintenance Tasks

### C1. Daily Tasks

| Task | Time (WIB) | Command / Action | Automated |
|------|-----------|-----------------|-----------|
| Check health endpoints | 06:00 | `curl https://api.sekar.wahyutrip.com/health` | Yes (cron) |
| Review Sentry errors | 09:00 | Check Sentry dashboard | Manual |
| Verify database backup | 04:00 | Check `/var/backups/sekar/` | Yes (cron) |
| Monitor disk usage | 06:00 | `df -h` check <80% | Yes (alert) |
| Review PM2 logs for errors | 09:00 | `pm2 logs --err --lines 50` | Manual |

### C2. Weekly Tasks

| Task | Day | Command / Action |
|------|-----|-----------------|
| Review analytics view refresh | Monday | Check `cron_analytics_refresh` log |
| Check SSL certificate expiry | Monday | `echo \| openssl s_client -connect api.sekar.wahyutrip.com:443 2>/dev/null \| openssl x509 -noout -dates` |
| Review slow queries | Wednesday | Check `pg_stat_statements` |
| Clear old PM2 logs | Sunday | `pm2 flush` |
| Review S3 storage usage | Friday | `aws s3 ls --summarize` |

### C3. Monthly Tasks

| Task | Week | Action |
|------|------|--------|
| Database vacuum | 1st | `VACUUM ANALYZE;` on all tables |
| Review and rotate logs | 1st | Archive logs older than 30 days |
| Update dependencies (patch) | 2nd | `npm audit`, apply patch updates |
| Review user accounts | 3rd | Deactivate inactive accounts (>90 days) |
| Performance review | 4th | Check response times, DB query stats |
| Backup restore test | 4th | Restore backup to staging, verify |

---

## D. Cron Jobs

### D1. Application Cron Jobs (NestJS)

These run inside the NestJS application via `@nestjs/schedule`:

| Job | Schedule | Description |
|-----|----------|-------------|
| Monitoring status refresh | Every 60s | Recalculate worker tracking statuses |
| Daily report generation | 06:00 WIB | Generate daily ops reports per rayon |
| Analytics view refresh | 02:00 WIB | `REFRESH MATERIALIZED VIEW CONCURRENTLY` |
| Maintenance overdue check | 08:00 WIB | Flag overdue asset maintenance |
| Generated reports cleanup | 03:00 WIB | Delete reports older than 90 days |
| Scheduled report execution | Per config | Execute user-configured report schedules |

### D2. System Cron Jobs

```cron
# Database backup (daily at 02:00 WIB)
0 2 * * * /usr/local/bin/backup-sekar-db.sh >> /var/log/sekar/backup.log 2>&1

# Redis RDB backup (daily at 03:00 WIB)
0 3 * * * redis-cli BGSAVE >> /var/log/sekar/redis-backup.log 2>&1

# Log rotation (daily at 04:00 WIB)
0 4 * * * /usr/sbin/logrotate /etc/logrotate.d/sekar

# Health check (every minute)
* * * * * curl -sf https://api.sekar.wahyutrip.com/health > /dev/null || /usr/local/bin/alert-health.sh

# Disk usage check (every 6 hours)
0 */6 * * * /usr/local/bin/check-disk.sh >> /var/log/sekar/disk.log 2>&1

# SSL certificate check (daily at 00:00)
0 0 * * * /usr/local/bin/check-ssl.sh >> /var/log/sekar/ssl.log 2>&1
```

### D3. Backup Script

```bash
#!/bin/bash
# /usr/local/bin/backup-sekar-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/sekar"
S3_BUCKET="sekar-backups"
DB_NAME="sekar_db"
DB_USER="sekar_prod"

# Create backup
pg_dump -h localhost -U $DB_USER $DB_NAME | gzip > "$BACKUP_DIR/sekar_db_$DATE.sql.gz"

# Upload to S3
aws s3 cp "$BACKUP_DIR/sekar_db_$DATE.sql.gz" "s3://$S3_BUCKET/daily/"

# Delete local backups older than 7 days
find $BACKUP_DIR -name "sekar_db_*.sql.gz" -mtime +7 -delete

# Delete S3 backups older than 30 days
aws s3 ls "s3://$S3_BUCKET/daily/" | awk '{print $4}' | while read file; do
  file_date=$(echo $file | grep -oP '\d{8}')
  if [ $(date -d "$file_date" +%s) -lt $(date -d "30 days ago" +%s) ]; then
    aws s3 rm "s3://$S3_BUCKET/daily/$file"
  fi
done

echo "Backup completed: sekar_db_$DATE.sql.gz"
```

---

## E. Deployment Procedures

### E1. Backend Deployment

```bash
# 1. SSH into server
ssh sekar-prod

# 2. Navigate to application
cd /app/sekar

# 3. Pull latest code
git pull origin main

# 4. Install dependencies
cd be && npm ci --production

# 5. Run migrations
npm run migration:run

# 6. Build
npm run build

# 7. Reload application (zero-downtime)
pm2 reload sekar-api

# 8. Verify health
curl -s https://api.sekar.wahyutrip.com/health | jq .

# 9. Monitor logs for 5 minutes
pm2 logs sekar-api --lines 0
```

### E2. Rollback Procedure

```bash
# 1. Identify the commit to rollback to
git log --oneline -10

# 2. Revert to previous version
git revert HEAD --no-edit
git push origin main

# 3. Or checkout specific commit
git checkout <commit-hash> -- be/

# 4. Rebuild and restart
cd be && npm ci --production && npm run build
pm2 reload sekar-api

# 5. Revert database migration if needed
npm run migration:revert

# 6. Verify
curl -s https://api.sekar.wahyutrip.com/health | jq .
```

### E3. Database Migration Deployment

```bash
# 1. Always backup first
/usr/local/bin/backup-sekar-db.sh

# 2. Test on staging
ssh sekar-staging
cd /app/sekar/be && npm run migration:run
# Verify staging works

# 3. Apply to production (during low-traffic window: 02:00-04:00 WIB)
ssh sekar-prod
cd /app/sekar/be && npm run migration:run

# 4. Verify
psql -c "SELECT * FROM migrations ORDER BY id DESC LIMIT 5;"

# 5. If migration fails, revert
npm run migration:revert
# Or restore from backup:
gunzip < /var/backups/sekar/sekar_db_latest.sql.gz | psql -h localhost -U sekar_prod sekar_db
```

### E4. Mobile App Deployment

#### Android (Google Play)

1. Build release APK/AAB locally or via CI
2. Upload to Google Play Console → Production track
3. Set rollout percentage (start 10%, then 50%, then 100%)
4. Monitor crash reports in Play Console for 24 hours

#### iOS (App Store — Phase 5)

1. Build archive in Xcode or CI (macos runner)
2. Upload to App Store Connect via Xcode or `xcrun altool`
3. Submit for review (1-3 days)
4. Once approved, release to App Store
5. Monitor crash reports in Xcode Organizer

---

## F. Troubleshooting

### F1. Application Not Responding

```bash
# 1. Check PM2 status
pm2 list

# 2. If crashed, check error logs
pm2 logs sekar-api --err --lines 100

# 3. Check system resources
htop  # CPU and memory
df -h # Disk space

# 4. Check if port is in use
lsof -i :3000

# 5. Restart if needed
pm2 restart sekar-api

# 6. If persistent, check database
psql -c "SELECT 1;" -h localhost -U sekar_prod sekar_db
```

### F2. Database Connection Issues

```bash
# Check PostgreSQL is running
systemctl status postgresql

# Check connection count
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Check for connection pool exhaustion
psql -c "SELECT max_conn, used, max_conn - used AS available
         FROM (SELECT count(*) AS used FROM pg_stat_activity) t1,
              (SELECT setting::int AS max_conn FROM pg_settings WHERE name='max_connections') t2;"

# Restart PostgreSQL if needed
systemctl restart postgresql
```

### F3. Redis Issues

```bash
# Check Redis is running
systemctl status redis

# Check memory usage
redis-cli INFO memory | grep used_memory_human

# If memory is full
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Restart Redis
systemctl restart redis
```

### F4. High Memory Usage

```bash
# Check what's using memory
ps aux --sort=-%mem | head -20

# Check Node.js memory
pm2 show sekar-api | grep memory

# If Node.js is using too much memory
pm2 restart sekar-api --max-memory-restart 512M
```

### F5. Slow API Responses

```bash
# 1. Check Sentry for performance issues
# Navigate to Sentry → Performance

# 2. Check database slow queries
psql -c "SELECT query, calls, mean_exec_time, total_exec_time
         FROM pg_stat_statements
         ORDER BY mean_exec_time DESC
         LIMIT 10;"

# 3. Check Redis cache hit rate
redis-cli INFO stats | grep keyspace

# 4. Check if materialized views are stale
psql -c "SELECT schemaname, matviewname, last_refresh
         FROM pg_matviews
         WHERE matviewname LIKE '%metrics%' OR matviewname LIKE '%performance%';"

# 5. Manual refresh if needed
psql -c "REFRESH MATERIALIZED VIEW CONCURRENTLY worker_performance_daily;"
```

### F6. S3 Upload Issues

```bash
# Test S3 connectivity
aws s3 ls s3://sekar-media-prod/

# Check IAM credentials
aws sts get-caller-identity

# Check bucket policy
aws s3api get-bucket-policy --bucket sekar-media-prod
```

---

## G. Security Operations

### G1. Security Checklist

| Check | Frequency | Command/Action |
|-------|-----------|---------------|
| Review access logs | Daily | Check Nginx/Caddy access logs |
| Check for failed logins | Daily | Query audit_logs for failed auth |
| Rotate JWT secret | Quarterly | Update JWT_SECRET, restart app |
| Update SSL certificates | Before expiry | Auto-renewed via Let's Encrypt |
| Review IAM permissions | Monthly | AWS Console → IAM |
| Dependency audit | Monthly | `npm audit` in be/ |
| Review open ports | Monthly | `nmap localhost` |

### G2. Incident Response

1. **Detect** — Sentry alert, health check failure, or user report
2. **Assess** — Determine severity (Critical/High/Medium/Low)
3. **Contain** — If security breach, rotate affected credentials immediately
4. **Fix** — Apply hotfix, deploy
5. **Notify** — Inform affected users if data was compromised
6. **Review** — Post-incident review, update procedures

### G3. Credential Rotation

```bash
# 1. Generate new JWT secret
openssl rand -base64 64

# 2. Update .env on server
nano /app/sekar/be/.env  # Update JWT_SECRET

# 3. Restart application (all active sessions will be invalidated)
pm2 restart sekar-api

# 4. For database password rotation
psql -c "ALTER USER sekar_prod PASSWORD 'new_password';"
# Update .env with new password
pm2 restart sekar-api
```

---

## H. Data Retention & Cleanup

### H1. Retention Policies

| Data Type | Retention | Cleanup Method |
|-----------|-----------|---------------|
| Location logs | 90 days | Cron: DELETE WHERE created_at < NOW() - INTERVAL '90 days' |
| Audit logs | 1 year | Archive to S3, then delete |
| Generated reports (S3) | 90 days | Application cron job |
| Shift records | Indefinite | No cleanup |
| Activity records | Indefinite | No cleanup |
| User tracking status | Current only | Overwritten on each update |
| Redis cache | TTL-based | Auto-eviction |
| PM2 logs | 30 days | Log rotation |
| Database backups | 30 days (local), 90 days (S3) | Backup script |

### H2. Data Cleanup Script

```bash
#!/bin/bash
# /usr/local/bin/cleanup-sekar-data.sh

# Run as cron: 0 4 * * 0  (weekly, Sunday 04:00)

echo "Starting SEKAR data cleanup: $(date)"

# 1. Delete old location logs (>90 days)
psql -h localhost -U sekar_prod sekar_db -c \
  "DELETE FROM location_logs WHERE created_at < NOW() - INTERVAL '90 days';"

# 2. Archive old audit logs (>1 year) to S3
psql -h localhost -U sekar_prod sekar_db -c \
  "COPY (SELECT * FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year')
   TO '/tmp/audit_archive.csv' WITH CSV HEADER;"
aws s3 cp /tmp/audit_archive.csv "s3://sekar-backups/archive/audit_$(date +%Y%m%d).csv"
psql -h localhost -U sekar_prod sekar_db -c \
  "DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';"

# 3. VACUUM after deletions
psql -h localhost -U sekar_prod sekar_db -c "VACUUM ANALYZE;"

echo "Cleanup completed: $(date)"
```

---

## I. Scaling Considerations

### I1. When to Scale

| Metric | Threshold | Action |
|--------|-----------|--------|
| API response time P95 | >2 seconds sustained | Optimize queries, add indexes |
| CPU usage | >80% sustained | Scale up EC2 instance |
| Memory usage | >85% sustained | Scale up or optimize |
| DB connections | >80% pool | Increase pool size or add read replicas |
| Concurrent WebSocket | >500 | Add Redis pub/sub adapter, scale horizontally |
| S3 storage | >50 GB | Review retention, enable lifecycle rules |

### I2. Horizontal Scaling

If single-server is insufficient:

1. **Load Balancer** — Add ALB/NLB in front of multiple EC2 instances
2. **Redis Adapter** — WebSocket already uses Redis for pub/sub (Phase 4)
3. **Read Replicas** — PostgreSQL read replica for analytics queries
4. **CDN** — CloudFront for static assets and S3 media

### I3. Database Optimization

```sql
-- Regular maintenance
VACUUM ANALYZE;

-- Reindex bloated indexes
REINDEX TABLE location_logs;

-- Check index usage
SELECT indexrelname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- Drop unused indexes
-- (only after confirming idx_scan = 0 for >30 days)
```

---

## J. Monitoring & Alerting

### J1. Health Check Endpoints

| Endpoint | Auth | Checks | Expected Response |
|----------|------|--------|-------------------|
| `GET /health` | None | App running | `{ "status": "ok" }` |
| `GET /health/full` | Admin JWT | DB + Redis + S3 | `{ "status": "ok", "database": "ok", "redis": "ok" }` |

### J2. Alert Configuration

| Alert | Channel | Condition |
|-------|---------|-----------|
| API Down | Slack + SMS | Health check fails 3x consecutive |
| High Error Rate | Slack | >50 Sentry events/hour |
| Database Full | Email | Disk >80% |
| SSL Expiring | Email | Certificate expires in <14 days |
| Backup Failed | Slack | Backup script exit code != 0 |
| High Memory | Slack | Node.js >512MB for >10 minutes |

### J3. Useful Monitoring Commands

```bash
# System overview
htop

# Network connections
ss -tuln

# Disk I/O
iostat -x 1 5

# PostgreSQL activity
psql -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Redis monitoring
redis-cli --latency-history

# Application metrics
pm2 show sekar-api
```

---

**Last Updated:** 2026-03-13
