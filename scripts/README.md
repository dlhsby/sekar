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

One-command scripts for everyday dev work. Run from anywhere; they resolve
the project root themselves. Ports stay per-project: backend `be/.env.local`
(`PORT`, default 3000), web `fe/web/.env.local` (`WEB_PORT`, default 3001) —
the scripts read both and export `WEB_PORT` so `next dev -p ${WEB_PORT:-3001}`
picks it up. Exported env vars override the files for one-off runs:

```bash
BE_PORT=3010 WEB_PORT=3011 ./scripts/start.sh --no-mobile
PORT=3012 ./scripts/start-be.sh        # PORT and BE_PORT are interchangeable
WEB_PORT=3013 ./scripts/start-web.sh
```

The same commands are exposed from the root `package.json`
(`npm run setup|start|stop|start:be|start:web|start:mobile`).

### `setup.sh` — one-shot setup

```bash
./scripts/setup.sh              # prompts before the destructive db:seed
./scripts/setup.sh --yes        # seed without prompting (CI / fresh checkout)
./scripts/setup.sh --skip-seed  # never seed (migrations still run)
```

Checks prerequisites (node ≥24.13, npm ≥10, docker), copies missing env files
(`be/.env.local`, `fe/web/.env.local`, `fe/mobile/.env.local`), installs all
workspaces, starts the Docker infrastructure, runs migrations and (on a fresh
database) boots the backend once so TypeORM synchronize completes the schema
before seeding. Idempotent — safe to re-run.

### `start.sh` — full dev stack

```bash
./scripts/start.sh              # infra + backend + web (background) + Metro (foreground)
./scripts/start.sh --no-mobile  # skip Metro; backend + web keep running
```

Backend + web run in the background with PID files and logs under `logs/`
(`logs/backend.log`, `logs/web.log`); Metro runs in the foreground and Ctrl+C
shuts down all three. Docker services stay up (`stop.sh --infra` stops them).

### `start-be.sh` / `start-web.sh` / `start-mobile.sh` — single services

```bash
./scripts/start-be.sh             # infra + backend, foreground
./scripts/start-web.sh            # web, foreground
./scripts/start-mobile.sh         # Metro, foreground
./scripts/start-mobile.sh --android   # build + install + launch on Android
```

### `stop.sh`

```bash
./scripts/stop.sh           # stop backend / web / Metro (PID files + pattern sweep)
./scripts/stop.sh --infra   # also stop the Docker services
```

Services are started in their own process groups, so `stop.sh` reliably kills
the whole tree (npm wrapper + nest/next/metro children).

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
./scripts/setup.sh              # One-shot setup (env files, installs, infra, DB)
./scripts/start.sh              # Start everything (Ctrl+C stops)
./scripts/stop.sh [--infra]     # Stop services (and optionally Docker)

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
