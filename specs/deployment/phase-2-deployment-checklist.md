# Phase 2 Deployment Checklist

**Quick reference for production deployment**

---

## Pre-Deployment (Local)

- [ ] All tests passing: `npm test` (845/845)
- [ ] Coverage ≥90%: `npm run test:cov` (90.77%)
- [ ] Unified seeder works: `npm run seed`
- [ ] Migration tested locally: `npm run migration:run`
- [ ] Health check works: `curl http://localhost:3000/api/health`
- [ ] No debug code (console.log, debugger)
- [ ] Environment variables documented
- [ ] Committed to develop branch
- [ ] Tested on development environment

---

## Production Deployment

### 1. Backup (5 min)

```bash
ssh -i ~/.ssh/sekar-prod.pem ec2-user@<ELASTIC_IP>
mkdir -p ~/backups/$(date +%Y%m%d)
docker exec sekar-postgres pg_dump -U postgres sekar_db > \
  ~/backups/$(date +%Y%m%d)/sekar_db_pre_phase2_$(date +%H%M%S).sql
ls -lh ~/backups/$(date +%Y%m%d)/
```

- [ ] Database backup created
- [ ] Backup file size >1MB (verify not empty)

### 2. Environment Setup (10 min)

```bash
ssh -i ~/.ssh/sekar-prod.pem ec2-user@<ELASTIC_IP>
cd ~/sekar
nano .env
```

**Add/Verify:**
- [ ] `FCM_ENABLED=true`
- [ ] `FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json`
- [ ] `NOTIFICATION_RETRY_ATTEMPTS=3`
- [ ] `TASK_AUTO_ASSIGN_ENABLED=false`
- [ ] `DATABASE_SYNCHRONIZE=false`
- [ ] `DATABASE_MIGRATIONS_RUN=false`

### 3. Firebase Config (5 min)

```bash
scp -i ~/.ssh/sekar-prod.pem \
  /path/to/firebase-service-account.json \
  ec2-user@<ELASTIC_IP>:~/sekar/config/
```

- [ ] Firebase JSON uploaded
- [ ] File exists: `ls ~/sekar/config/firebase-service-account.json`

### 4. Deploy (5-8 min)

**Option A: Automatic**
```bash
git checkout main
git merge develop
git push origin main
```

**Option B: Manual**
- [ ] Go to GitHub Actions
- [ ] Select "Backend CI/CD"
- [ ] Click "Run workflow"
- [ ] Select: main / production
- [ ] Click "Run workflow"

**Monitor:**
- [ ] Lint passing
- [ ] Tests passing (845/845)
- [ ] Security scan passing
- [ ] Build successful
- [ ] ECR push successful
- [ ] Migration executed successfully ⚠️ CRITICAL
- [ ] Containers restarted
- [ ] Logs showing startup

### 5. Verification (15 min)

#### Health Check
```bash
curl http://<SERVER_IP>:3000/api/health
```
- [ ] Returns: `{"status":"ok","database":"connected"}`

#### Swagger
```bash
# Open browser: http://<SERVER_IP>:3000/api/docs
```
- [ ] Shows 83 endpoints (40 Phase 1 + 43 Phase 2)

#### Authentication
```bash
curl -X POST http://<SERVER_IP>:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```
- [ ] Returns JWT token

#### Phase 2 Endpoints
```bash
TOKEN="<jwt_token>"
curl http://<SERVER_IP>:3000/api/rayons -H "Authorization: Bearer $TOKEN"
curl http://<SERVER_IP>:3000/api/activity-types -H "Authorization: Bearer $TOKEN"
curl http://<SERVER_IP>:3000/api/tasks -H "Authorization: Bearer $TOKEN"
```
- [ ] All return 200 with empty arrays `[]`

#### Database Migration
```bash
ssh -i ~/.ssh/sekar-prod.pem ec2-user@<ELASTIC_IP>
docker exec -it sekar-postgres psql -U postgres -d sekar_db
SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 1;
\dt
\q
```
- [ ] Shows: Phase2DatabaseSchema1737720000000
- [ ] 16 tables exist (10 + 6 new)

#### Application Logs
```bash
docker-compose logs --tail=100 backend | grep -E "(ERROR|WARN)"
```
- [ ] "Nest application successfully started"
- [ ] No ERROR messages
- [ ] Phase 2 routes mapped

---

## Post-Deployment (1 hour)

### Immediate Testing

- [ ] Mobile app can connect and login
- [ ] GPS tracking works
- [ ] Reports can be submitted
- [ ] Web dashboard loads (http://<SERVER_IP>:3001)
- [ ] Rayons page accessible (empty)
- [ ] Tasks page accessible (empty)

### Monitoring

```bash
# Watch logs for errors
docker-compose logs -f backend | grep ERROR
```

- [ ] No errors for 30 minutes
- [ ] CPU usage <50%
- [ ] Memory usage <70%
- [ ] Response times <500ms

---

## Day 1 Tasks

- [ ] Import production areas via KMZ
- [ ] Create rayons via admin UI
- [ ] Create shift definitions
- [ ] Test FCM on physical device
- [ ] Verify WebSocket real-time updates
- [ ] Check CloudWatch metrics

---

## Rollback Plan (If Needed)

```bash
ssh -i ~/.ssh/sekar-prod.pem ec2-user@<ELASTIC_IP>
cd ~/sekar

# 1. Stop containers
docker-compose down

# 2. Revert migration
docker-compose run --rm backend npm run migration:revert:prod

# 3. Pull backup image
docker pull <ECR_REGISTRY>/sekar-backend:backup-<TIMESTAMP>
docker tag <ECR_REGISTRY>/sekar-backend:backup-<TIMESTAMP> \
  <ECR_REGISTRY>/sekar-backend:latest

# 4. Restart
docker-compose up -d
```

- [ ] Containers stopped
- [ ] Migration reverted
- [ ] Backup image restored
- [ ] Health check OK
- [ ] Phase 2 endpoints return 404 (as expected)

---

## Success Criteria

✅ All must be true:

- [ ] 845 tests passed in CI/CD
- [ ] Migration executed successfully
- [ ] Health check returns OK
- [ ] 83 endpoints in Swagger
- [ ] Phase 2 endpoints return 200
- [ ] Mobile app connects
- [ ] No errors for 30 minutes
- [ ] 16 tables in database
- [ ] WebSocket works
- [ ] FCM notifications work (if enabled)

---

## Contacts

- **GitHub Actions:** https://github.com/<YOUR_ORG>/sekar/actions
- **Swagger:** http://<SERVER_IP>:3000/api/docs
- **Production Server:** `ssh -i ~/.ssh/sekar-prod.pem ec2-user@<ELASTIC_IP>`

---

**Estimated Total Time:** 2-3 hours (including monitoring)

**Last Updated:** February 2, 2026
