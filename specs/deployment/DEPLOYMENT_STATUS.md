# Current Deployment Status

**Last Updated:** February 10, 2026
**Backend Status:** ✅ Deployed & Healthy
**Database:** ✅ 17 tables, seeded with test data
**Migration Strategy:** ✅ Fixed (proper migrations, no synchronize)

---

## Current Access URLs

### Production Backend
- **Direct Access:** http://16.79.183.240:3000/api/v1/health
- **Nginx Proxy:** http://sekar.wahyutrip.com (proxies to port 3000)
- **api subdomain:** ❌ NOT SET UP (see instructions below)

### API Endpoints
```bash
# Health check
curl http://16.79.183.240:3000/api/v1/health

# Login test
curl -X POST http://16.79.183.240:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

## What We Fixed Today

### 1. ✅ Migration Strategy (DATABASE_SYNCHRONIZE=false)

**Problem:** Deployment was using `DATABASE_SYNCHRONIZE=true` as a workaround because there was no InitialSchema migration.

**Solution:**
- Created `1737000000000-InitialSchema.ts` migration that creates all Phase 1 base tables
- Updated `.github/workflows/backend-ci-cd.yml` to remove synchronize workaround
- Migration order now:
  1. InitialSchema (1737000000000) - Base Phase 1 tables
  2. Phase2DatabaseSchema (1737720000000) - Phase 2 enhancements

**Benefit:** Clean, reproducible deployments. Future deployments will use migrations only.

### 2. ⚠️ Domain Setup (Partially Complete)

**Current State:**
- ✅ `sekar.wahyutrip.com` → 16.79.183.240 (DNS configured, nginx configured)
- ❌ `api.sekar.wahyutrip.com` → No DNS record

**To Complete api Subdomain Setup:**

#### Step 1: Add DNS A Record
Add this DNS record at your domain registrar (Cloudflare/Route53/etc.):
```
Type: A
Name: api.sekar.wahyutrip.com
Value: 16.79.183.240
TTL: Auto
```

#### Step 2: Add Nginx Configuration
SSH to EC2 and run:
```bash
sudo tee /etc/nginx/conf.d/sekar-api.conf << 'EOF'
# SEKAR Backend API - api.sekar.wahyutrip.com
server {
    listen 80;
    server_name api.sekar.wahyutrip.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to NestJS backend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # File upload size limit
    client_max_body_size 50M;

    # Logs
    access_log /var/log/nginx/sekar_api_access.log;
    error_log /var/log/nginx/sekar_api_error.log;
}
EOF

# Test and reload nginx
sudo nginx -t
sudo systemctl reload nginx
```

#### Step 3: Verify
```bash
# Wait for DNS propagation (5-30 minutes)
dig +short api.sekar.wahyutrip.com
# Should return: 16.79.183.240

# Test the API
curl http://api.sekar.wahyutrip.com/api/v1/health
```

### 3. ⚠️ Firebase Cloud Messaging (FCM)

**Current State:**
- ✅ FCM credentials stored in GitHub Secrets
- ✅ FCM credentials injected into .env.production
- ✅ firebase.config.ts supports environment variables
- ⚠️ FCM **DISABLED** (FCM_ENABLED=false)

**To Enable FCM:**

1. Test that FCM works with environment variables:
```bash
# SSH to production
ssh -i ~/.ssh/sekar-key.pem ec2-user@16.79.183.240

# Check credentials are present
cd ~/sekar/backend
grep -E "FCM_" .env.production
# Should show FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY
```

2. Enable FCM in GitHub Secrets:
   - Go to: https://github.com/dlhsby/sekar/settings/environments
   - Click: production → Environment secrets
   - Find: `FCM_ENABLED` (you may need to add it)
   - Set value: `true`

3. Redeploy:
```bash
git commit --allow-empty -m "chore: enable FCM"
git push origin main
```

4. Test FCM:
```bash
# Login to get token
curl -X POST http://16.79.183.240:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"worker1","password":"worker123"}' \
  | jq -r '.access_token' > /tmp/token.txt

# Register FCM token (from mobile app)
curl -X POST http://16.79.183.240:3000/api/v1/notifications/register-token \
  -H "Authorization: Bearer $(cat /tmp/token.txt)" \
  -H "Content-Type: application/json" \
  -d '{"token":"<FCM_DEVICE_TOKEN>","device":"ios"}'
```

---

## Current Test Credentials

```
Admin:
  username: admin
  password: admin123

Supervisors:
  username: supervisor1 / supervisor2
  password: supervisor123

Workers:
  username: worker1 / worker2 / worker3
  password: worker123
```

---

## Database Status

**Tables (17 total):**
```
Phase 1 (7 tables):
  - users
  - area_types
  - areas
  - worker_assignments
  - shifts
  - work_reports
  - location_logs

Phase 2 (9 tables):
  - rayons
  - shift_definitions
  - activity_types
  - area_staff_requirements
  - worker_schedules
  - special_day_overrides
  - tasks
  - notifications
  - notification_tokens

System (1 table):
  - typeorm_migrations
```

**Seeded Data:**
- ✅ 6 users (1 admin, 2 supervisors, 3 workers)
- ✅ 4 area types
- ✅ 3 areas
- ✅ 4 shifts (1 active, 3 completed)
- ✅ 2 work reports
- ✅ 10 location logs

---

## Next Deployment Will Use Proper Migrations

**Previous Approach (DEPRECATED):**
```yaml
# OLD - Used DATABASE_SYNCHRONIZE=true workaround
timeout 30 docker run --rm \
  -e DATABASE_SYNCHRONIZE=true \
  $ECR_REGISTRY/sekar-backend:latest \
  node dist/main.js
```

**New Approach (CURRENT):**
```yaml
# NEW - Uses proper migrations
docker run --rm \
  $ECR_REGISTRY/sekar-backend:latest \
  node ./node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js
```

**Migration Files:**
1. `1737000000000-InitialSchema.ts` - Creates Phase 1 base tables
2. `1737720000000-Phase2DatabaseSchema.ts` - Adds Phase 2 enhancements

---

## Deployment Checklist for Next Time

**Before Push:**
- [ ] All tests passing locally: `cd be && npm test`
- [ ] Clean working tree: `git status`
- [ ] On main branch: `git branch --show-current`

**After Push:**
- [ ] Monitor GitHub Actions: https://github.com/dlhsby/sekar/actions
- [ ] Verify health check: `curl http://16.79.183.240:3000/api/v1/health`
- [ ] Test login: Use curl command from "Test Credentials" section
- [ ] Check logs: SSH to EC2 and run `docker logs sekar-backend`

**Optional (if you set up domain):**
- [ ] Test api subdomain: `curl http://api.sekar.wahyutrip.com/api/v1/health`

---

## File Locations on Production EC2

```
/home/ec2-user/
├── sekar/
│   └── backend/
│       ├── .env.production           # Auto-generated from GitHub Secrets
│       ├── docker-compose.prod.yml   # Container configuration
│       └── (no source code, uses Docker image)
│
/etc/nginx/conf.d/
├── sekar.conf                         # sekar.wahyutrip.com → localhost:3000
└── sekar-api.conf                     # api.sekar.wahyutrip.com (TODO)
```

---

## Quick Reference Commands

**Check Backend Status:**
```bash
ssh -i ~/.ssh/sekar-key.pem ec2-user@16.79.183.240 \
  "docker ps --filter name=sekar-backend --format 'STATUS: {{.Status}}' && \
   curl -s http://localhost:3000/api/v1/health"
```

**Check Database Tables:**
```bash
ssh -i ~/.ssh/sekar-key.pem ec2-user@16.79.183.240 \
  "docker exec sekar-backend node -e \" \
  const { DataSource } = require('typeorm'); \
  const ds = new DataSource({ \
    type: 'postgres', \
    host: process.env.DATABASE_HOST, \
    port: 5432, \
    username: 'sekar_admin', \
    password: process.env.DATABASE_PASSWORD, \
    database: 'sekar_db', \
    ssl: { rejectUnauthorized: false } \
  }); \
  ds.initialize().then(async () => { \
    const result = await ds.query('SELECT tablename FROM pg_tables WHERE schemaname = \\'public\\' ORDER BY tablename'); \
    console.log('Tables:', result.length); \
    result.forEach(r => console.log('  -', r.tablename)); \
    await ds.destroy(); \
  });\""
```

**View Backend Logs:**
```bash
ssh -i ~/.ssh/sekar-key.pem ec2-user@16.79.183.240 \
  "cd ~/sekar/backend && docker-compose -f docker-compose.prod.yml logs --tail=50 backend"
```

**Restart Backend:**
```bash
ssh -i ~/.ssh/sekar-key.pem ec2-user@16.79.183.240 \
  "cd ~/sekar/backend && docker-compose -f docker-compose.prod.yml restart backend"
```

---

## Summary

✅ **What's Working:**
- Backend deployed and healthy
- Database has all 17 tables
- Test data seeded successfully
- Authentication working (admin, supervisor, worker logins)
- Proper migration strategy implemented
- Nginx configured for sekar.wahyutrip.com

⚠️ **What Needs Attention:**
- Set up DNS for api.sekar.wahyutrip.com (if you want to use that subdomain)
- Enable and test FCM (currently disabled but credentials are ready)

🎯 **Ready for:**
- Mobile app testing (point to http://16.79.183.240:3000)
- Web dashboard deployment
- Production use with test data

---

**Last Deployment:** Run 21852949840 (successful)
**Next Steps:** Set up api subdomain (optional) and enable FCM (when ready for push notifications)
