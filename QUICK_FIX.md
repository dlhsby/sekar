# Quick Fix for Deployment Issue

**TL;DR:** The "postgres service not running" error is **NOT AN ERROR**. Production uses AWS RDS, not local Docker PostgreSQL.

---

## 🚀 Fix Your Deployment in 5 Minutes

### Step 1: Copy New Seeding Script to EC2

**From your local machine:**

```bash
scp -i ~/.ssh/sekar-prod.pem \
  be/scripts/deploy-seed.sh \
  ec2-user@16.79.183.240:~/sekar/backend/scripts/

ssh -i ~/.ssh/sekar-prod.pem ec2-user@16.79.183.240 \
  "chmod +x ~/sekar/backend/scripts/deploy-seed.sh"
```

### Step 2: SSH to EC2 and Run Seeding

```bash
ssh -i ~/.ssh/sekar-prod.pem ec2-user@16.79.183.240

cd ~/sekar/backend
./scripts/deploy-seed.sh
```

### Step 3: Verify it Works

```bash
# Check health
curl http://localhost:3000/api/v1/health

# Test login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

**Expected:** JSON response with `access_token` and `refresh_token`.

---

## ✅ Done!

Your deployment is now fixed. The seeding script will:
- Validate environment and database connectivity
- Check that migrations are applied
- Seed Phase 1 data (users, areas, work zones)
- Seed Phase 2 data (rayons)
- Seed sample tasks

**Test Credentials:**
- Admin: `admin` / `admin123`
- Supervisor: `supervisor1` / `supervisor123`
- Worker: `worker1` / `worker123`

---

## 📚 More Info

- **Full explanation:** `/DEPLOYMENT_FIX.md`
- **Operations manual:** `/specs/deployment/PRODUCTION_OPERATIONS.md`
- **Architecture diagram:** Production uses RDS, not local PostgreSQL

---

## 🔥 Common Questions

**Q: Why "postgres service not running"?**
A: This is **EXPECTED**. Production uses AWS RDS, not a local Docker container.

**Q: Why did migrations work but seeding failed?**
A: They were using different connection methods. The new script uses the same method as migrations.

**Q: Will future deployments work automatically?**
A: Yes! Migrations run automatically via CI/CD. Seeding is manual (run once).

**Q: What if I need to reseed later?**
A: Just run `./scripts/deploy-seed.sh` again. It warns you if data exists.
