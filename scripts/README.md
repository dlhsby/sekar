# SEKAR Scripts

Utility scripts for development and deployment.

---

## Production Deployment

### `deploy-production.sh`

**Purpose:** Automated production deployment with pre-flight checks

**What it does:**
- Validates Git status and branch
- Checks GitHub Actions workflow YAML syntax
- Verifies critical files exist
- Confirms GitHub Secrets are configured
- Commits and pushes to main branch to trigger CI/CD
- Provides deployment monitoring instructions

**Usage:**
```bash
./scripts/deploy-production.sh
```

**When to use:**
- Deploying Phase 2 to production
- After configuring all 16 GitHub Secrets
- When ready to trigger automated deployment

**Prerequisites:**
- All GitHub Secrets configured
- On main branch
- All tests passing locally

---

## Local Development

### `local-dev-start.sh`

**Purpose:** Start complete local development environment

**What it does:**
- Starts PostgreSQL, Adminer, LocalStack (S3 emulator)
- Starts backend API server
- Starts web dashboard
- Provides service URLs and test credentials

**Usage:**
```bash
./scripts/local-dev-start.sh
```

**Services started:**
- Backend API: http://localhost:3000
- Web Dashboard: http://localhost:3001
- PostgreSQL: localhost:5432
- Adminer: http://localhost:8080
- LocalStack S3: http://localhost:4566

---

### `local-dev-stop.sh`

**Purpose:** Stop all local development services

**What it does:**
- Stops backend API
- Stops web dashboard
- Stops all Docker containers (PostgreSQL, Adminer, LocalStack)

**Usage:**
```bash
./scripts/local-dev-stop.sh
```

**When to use:**
- End of development session
- Before system shutdown
- To free up ports/resources

---

## Testing

### `smoke-tests.sh`

**Purpose:** Run smoke tests against deployed API

**What it does:**
- Tests API health endpoint
- Verifies authentication endpoints
- Checks core API functionality
- Reports success/failure

**Usage:**
```bash
./scripts/smoke-tests.sh http://localhost:3000
./scripts/smoke-tests.sh https://api.sekar.wahyutrip.com
```

**When to use:**
- After deployment to verify API is working
- Post-deployment verification
- Quick sanity check of API endpoints

---

## Quick Reference

```bash
# Local development
./scripts/local-dev-start.sh    # Start all services
./scripts/local-dev-stop.sh     # Stop all services

# Production deployment
./scripts/deploy-production.sh  # Deploy to production

# Testing
./scripts/smoke-tests.sh <API_URL>  # Run smoke tests
```

---

## Adding New Scripts

When adding new scripts to this directory:

1. **Use lowercase with dashes:** `my-script-name.sh`
2. **Make executable:** `chmod +x scripts/my-script-name.sh`
3. **Add shebang:** `#!/bin/bash` as first line
4. **Document here:** Add section to this README
5. **Add description:** Use clear comments in script

**Naming convention:**
- `deploy-*.sh` - Deployment scripts
- `local-*.sh` - Local development scripts
- `*-tests.sh` - Testing scripts
- `setup-*.sh` - Setup/configuration scripts

---
