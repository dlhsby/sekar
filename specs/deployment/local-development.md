# Local Development Setup Guide

**Purpose:** Complete guide for setting up and running SEKAR locally for development on Linux/macOS/WSL2, including Docker infrastructure, workspace setup, media storage, and mobile device networking.

---

## Quick Start (One Command)

For the fastest setup, run from the project root:

```bash
./scripts/setup.sh          # Creates env files, installs all dependencies, starts Docker, runs migrations
./scripts/start.sh          # Starts backend + web in background; Metro (mobile) in foreground
./scripts/stop.sh           # Stops all services (add --infra to also stop Docker)
```

That's it! Services run at:
- **Backend:** http://localhost:3000 (API docs at /api/v1/docs)
- **Web Dashboard:** http://localhost:3001
- **MinIO Console:** http://localhost:9001 (minioadmin/minioadmin)
- **Adminer:** http://localhost:8080 (postgres/postgres)

**Test users:** All use password `12345678`
- `superadmin/12345678` (local)
- `satgas1/12345678`
- `081200000006/12345678` (phone login)

---

## Table of Contents

1. [Infrastructure (Docker Services)](#infrastructure-docker-services)
2. [Running Each Workspace](#running-each-workspace)
3. [Local Media Storage with MinIO](#local-media-storage-with-minio)
4. [WSL2 Network Setup (Physical Mobile Devices)](#wsl2-network-setup-physical-mobile-devices)
5. [Troubleshooting](#troubleshooting)
6. [Related Documentation](#related-documentation)

---

## Infrastructure (Docker Services)

### Services Overview

SEKAR uses Docker Compose to run all local infrastructure. Services are defined in `infra/docker-compose.yml` with configuration in `infra/.env`.

| Service | Purpose | Port | Credentials | Data Location |
|---------|---------|------|-------------|---|
| **PostgreSQL 14** | Primary database | 5432 | postgres/postgres, db: sekar_db | `infra/data/` |
| **Adminer** | Web database UI | 8080 | (use DB creds above) | — |
| **MinIO** | S3-compatible object storage | 9000 (API), 9001 (console) | minioadmin/minioadmin | `sekar-minio-data` volume |
| **Redis 7** | In-memory cache, streaming | 16379 | — | `sekar-redis-data` volume |

**Note:** MinIO replaces LocalStack (the production stack also uses MinIO, so dev and prod behave identically). Adminer is the lightweight database UI (alternative to pgAdmin).

### Starting & Stopping Services

```bash
# Start all services (from project root)
./scripts/infra.sh start

# Or manually from infra/
cd infra
docker-compose up -d

# View status
docker-compose ps

# Follow logs
docker-compose logs -f

# Stop (keeps data)
docker-compose down

# Stop AND remove volumes (deletes data!)
docker-compose down -v
```

### Service Details

#### PostgreSQL

**Connection from Host:**
```bash
# Command line
psql -h localhost -p 5432 -U postgres -d sekar_db

# From within Docker network
docker-compose exec postgres psql -U postgres -d sekar_db

# Useful commands
docker-compose exec postgres psql -U postgres -c '\l'        # List databases
docker-compose exec postgres psql -U postgres -d sekar_db -c '\dt'   # List tables
```

**Backup & Restore:**
```bash
# Export database
docker-compose exec postgres pg_dump -U postgres sekar_db > backup.sql

# Restore database
cat backup.sql | docker-compose exec -T postgres psql -U postgres sekar_db
```

#### Adminer (Database Management UI)

Access at http://localhost:8080 (can use IP address or `postgres` service name when connecting from within Docker).

**Login:**
- **System:** PostgreSQL
- **Server:** `postgres` (from Adminer container) or `localhost` (from host)
- **Username:** `postgres`
- **Password:** `postgres`
- **Database:** `sekar_db` (or leave empty to see all)

**Features:** Browse/edit tables, run SQL, import/export data, manage structure.

#### Redis (Monitoring v2, Staffing, BullMQ)

**Connection:** `redis://localhost:16379` (dev uses 16379 to avoid colliding with system Redis; see `infra/.env`).

**Test connection:**
```bash
docker-compose exec redis redis-cli ping
# Expected: PONG
```

**View stream (monitoring events):**
```bash
docker-compose exec redis redis-cli xlen sekar:monitoring:stream
```

### Data Persistence & Cleanup

**PostgreSQL Data:** `infra/data/` — survives container restarts. Deleted only with `docker-compose down -v` or `rm -rf data/`.

**MinIO Data:** `sekar-minio-data` Docker volume — survives restarts. Deleted with `docker-compose down -v`.

**Redis Data:** `sekar-redis-data` Docker volume — survives restarts. Deleted with `docker-compose down -v`.

**Reset Everything:**
```bash
cd infra
docker-compose down -v
rm -rf data/
docker-compose up -d
# Then re-seed the backend database (see Running Backend below)
```

---

## Running Each Workspace

Each workspace (`/`, `apps/be/`, `apps/web/`, `apps/mobile/`) is fully independent — `npm install` in one never touches another.

### Root-Level Tooling (One Time)

```bash
cd /project/root
npm install

# This installs:
# - Token pipeline (npm run tokens:build / tokens:verify / test:tokens)
# - ESLint plugin
# - Workspace scaffolding

# Verify tokens can build
npm run tokens:verify
```

### Backend (NestJS)

**First Time:**

```bash
cd be

# Copy environment template
cp .env.local.example .env.local

# Install dependencies
npm install

# Run migrations and seed database (DESTRUCTIVE — wipes existing data first)
npm run migration:run
npm run db:seed

# (optional) Run tests
npm test          # Unit tests
npm run test:cov  # With coverage (>80% required)
```

**Running:**

```bash
cd be
npm run start:dev

# http://localhost:3000
# API documentation: http://localhost:3000/api/v1/docs

# Or with custom port
PORT=3001 npm run start:dev
```

**Useful Commands:**

```bash
# Generate new migration
npm run migration:generate -- --name AddNewTable

# List applied migrations
npm run migration:show

# Revert last migration
npm run migration:revert

# Re-seed (destructive)
npm run db:seed

# Reset database completely
npm run db:reset
```

**Environment (.env.local essentials — see full reference in `specs/deployment/environment-variables.md`):**

```bash
NODE_ENV=development
PORT=3000

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=sekar_db
DATABASE_SYNCHRONIZE=true      # Auto-create tables (dev only!)
DATABASE_MIGRATIONS_RUN=false   # Don't auto-run migrations

# MinIO S3
AWS_ENDPOINT_URL=http://localhost:9000
AWS_S3_FORCE_PATH_STYLE=true
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_S3_BUCKET=sekar-media-dev
AWS_REGION=ap-southeast-3

# JWT
JWT_SECRET=dev-secret-key-change-in-production-min-32-chars
JWT_EXPIRATION=15m
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production-32chars
JWT_REFRESH_EXPIRATION=7d

# Monitoring v2 / BullMQ (live)
REDIS_URL=redis://localhost:16379
REDIS_STREAM_MAX_LEN=100000
STAFFING_DEBOUNCE_SECONDS=30
MONITORING_SWEEP_CRON=*/5 * * * *
MISSING_THRESHOLD_SECONDS=900
BULLMQ_PREFIX=sekar-dev
BULLMQ_FCM_RETRY_ATTEMPTS=3
BULLMQ_FCM_RETRY_BACKOFF_MS=5000

# Firebase (leave disabled until Firebase is configured)
FCM_ENABLED=false

# CORS
CORS_ORIGIN=http://localhost:3001,http://localhost:19006,http://localhost:8081

# Rate limiting (dev — very permissive; production tightens)
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
AUTH_LOGIN_THROTTLE_LIMIT=1000
AUTH_LOGIN_THROTTLE_TTL=60000
```

### Web Dashboard (Next.js)

**First Time:**

```bash
cd apps/web

# Copy environment template
cp .env.local.example .env.local

# (Optional) Add Google Maps API key if you need maps
# Edit .env.local: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=pk_...
# Get token from: https://console.cloud.google.com/google/maps-apis

# Install dependencies
npm install
```

**Running:**

```bash
cd apps/web
npm run dev

# http://localhost:3001
# Log in with superadmin/12345678 (local; SEED_SUPERADMIN_PASSWORD elsewhere)
```

**Custom Port:**

Edit `apps/web/.env.local`:
```bash
WEB_PORT=3002
```

Then:
```bash
npm run dev  # Reads WEB_PORT from .env.local
```

**Build for Production:**

```bash
npm run build
npm run start  # Serves the production build
```

**Run Tests:**

```bash
npm test          # Unit tests
npm run test:e2e  # Playwright E2E tests
```

**Environment (.env.local essentials):**

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_API_VERSION=v1
NEXT_PUBLIC_WS_URL=ws://localhost:3000

# Maps (optional)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=pk_...or_leave_blank

# Development
NODE_ENV=development
WEB_PORT=3001
NEXT_PUBLIC_FEATURE_PWA=false
NEXT_PUBLIC_ENABLE_DEVTOOLS=true
```

### Mobile App (React Native)

**First Time:**

```bash
cd apps/mobile

# Copy environment template
cp .env.local.example .env.local

# Set API_BASE_URL for your environment:
# - Android emulator: http://10.0.2.2:3000
# - Physical device: http://YOUR_LAN_IP:3000
# - iOS simulator: http://localhost:3000

# Install dependencies
npm install
```

**Running on Android Emulator:**

```bash
cd apps/mobile

# Start Metro (packager) in foreground
npm start

# In another terminal, build and run on emulator
npm run android

# Or: build for all connected/running devices
npm run android:all

# Rebuild cache if stale
npm start -- --reset-cache
```

**Running on iOS (macOS only):**

```bash
cd apps/mobile

npm start          # Metro in foreground

# In another terminal
npm run ios
```

**Physical Device:**

See [WSL2 Network Setup (Physical Mobile Devices)](#wsl2-network-setup-physical-mobile-devices) below.

**Environment (.env.local essentials):**

```bash
# Android emulator default
API_BASE_URL=http://10.0.2.2:3000
API_VERSION=v1

# Physical device (replace YOUR_IP with your LAN IP)
# API_BASE_URL=http://YOUR_IP:3000
# API_VERSION=v1

# iOS simulator
# API_BASE_URL=http://localhost:3000
# API_VERSION=v1

APP_ENV=development
GOOGLE_MAPS_API_KEY=          # Leave blank for dev, or add your key
FEATURE_PLANTS_ENABLED=false
FEATURE_PRUNING_REQUESTS_ENABLED=false
FEATURE_PLANT_SEEDS_ENABLED=false
```

---

## Local Media Storage with MinIO

SEKAR stores media (selfies, work report photos/videos) in an S3-compatible bucket during development. MinIO is a self-hosted S3 alternative — the same engine used in production.

### MinIO Console (Web UI)

Access at http://localhost:9001

**Login:** `minioadmin` / `minioadmin`

**Features:**
- Browse buckets and files
- View object metadata
- Upload/download files (for testing)
- Set bucket policies (not needed for presigned URLs)

### How the Backend Uses MinIO

The backend is configured (via `.env.local`) to:
1. Connect to MinIO at `http://localhost:9000` (API endpoint)
2. Use credentials `minioadmin`/`minioadmin`
3. Auto-create the bucket `sekar-media-dev` on first boot (via `S3InitService`)
4. Upload files (selfies, reports) with a prefix (e.g., `shifts/2026-06-17/...`)
5. Generate presigned URLs (24-hour expiry) for download

**Verification:**

```bash
# List all buckets
docker-compose exec postgres sh -c \
  'AWS_ACCESS_KEY_ID=minioadmin AWS_SECRET_ACCESS_KEY=minioadmin \
   aws s3 ls --endpoint-url http://minio:9000'

# List files in sekar-media-dev
docker-compose exec postgres sh -c \
  'AWS_ACCESS_KEY_ID=minioadmin AWS_SECRET_ACCESS_KEY=minioadmin \
   aws s3 ls s3://sekar-media-dev --endpoint-url http://minio:9000 --recursive'

# Download a file for testing
docker-compose exec postgres sh -c \
  'AWS_ACCESS_KEY_ID=minioadmin AWS_SECRET_ACCESS_KEY=minioadmin \
   aws s3 cp s3://sekar-media-dev/path/to/file.jpg /tmp/file.jpg \
   --endpoint-url http://minio:9000'
```

### Local Filesystem Fallback (Optional)

If you want to skip MinIO entirely and store files on disk (quick testing only, not recommended):

**Edit `apps/be/src/config/configuration.ts`:**
```typescript
s3: {
  enabled: process.env.S3_ENABLED !== 'false',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
}
```

**Set in `apps/be/.env.local`:**
```bash
S3_ENABLED=false
UPLOAD_DIR=./uploads
```

Files will be saved to `apps/be/uploads/` locally. This requires modifying the S3 service to check the flag; not recommended for production.

---

## WSL2 Network Setup (Physical Mobile Devices)

If you're running the backend in WSL2 (Windows Subsystem for Linux 2) and want to test the mobile app on a physical device connected to your WiFi, you need to forward traffic from Windows to WSL2.

### When You Need This

You need WSL2 port forwarding **only if:**
- Backend runs inside WSL2
- Mobile device (phone/tablet) is on the same WiFi as Windows
- You want to test on a physical device (not Android emulator)

**You DON'T need this if:**
- Backend runs natively on Windows (not in WSL2)
- Using Android emulator (use `10.0.2.2:3000`)
- Using iOS simulator on macOS (use `localhost:3000`)

### Prerequisites

- Windows 10/11 with WSL2 installed
- Administrator access to Windows (for firewall rules)
- Backend running in WSL2 on port 3000
- Physical device on same WiFi network

### Step 1: Get WSL2 IP Address

In your WSL2 terminal:

```bash
hostname -I | awk '{print $1}'
```

**Example output:**
```
172.25.165.11
```

This IP may change when you restart WSL2. Save it for the next step.

### Step 2: Set Up Port Forwarding (Windows PowerShell as Administrator)

1. **Open PowerShell as Administrator:**
   - Press `Win + X`
   - Select "Windows PowerShell (Admin)" or "Terminal (Admin)"

2. **Add port forwarding rule:**

```powershell
# Replace <WSL2_IP> with the IP from Step 1
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=<WSL2_IP>
```

**Example:**
```powershell
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=172.25.165.11
```

**What this does:**
- Tells Windows to listen on port 3000 from any network interface
- Forwards traffic to port 3000 inside WSL2 at the specified IP

### Step 3: Allow Through Windows Firewall

Still in PowerShell (as Administrator):

```powershell
netsh advfirewall firewall add rule name="WSL Backend Port 3000" dir=in action=allow protocol=TCP localport=3000
```

This creates an inbound firewall rule so your local network can reach the backend.

### Step 4: Get Windows IP Address

You need your Windows machine's IP address so mobile devices can connect.

**Option A: From WSL2 (easiest)**

When you run `npm run start:dev`, the backend detects and displays:
```
🌐 Network access: http://192.168.1.100:3000
```

Look for this "Network access" line in the console output — it's your Windows IP.

**Option B: From Windows PowerShell:**

```powershell
ipconfig | findstr IPv4
```

**Example output:**
```
IPv4 Address. . . . . . . . . . . : 192.168.1.100
```

### Step 5: Verify Access

**From WSL2:**

```bash
curl http://<YOUR_WINDOWS_IP>:3000/api/health
```

**Example:**
```bash
curl http://192.168.1.100:3000/api/health
```

**Expected response:**
```json
{"status":"ok","timestamp":"2026-06-17T...","uptime":123.456,"environment":"development"}
```

**From Mobile Device:**

1. Ensure phone is on **same WiFi** as Windows PC
2. Open browser on phone
3. Visit: `http://<YOUR_WINDOWS_IP>:3000/api/health`
4. Should see the JSON response (or access the API)

### Step 6: Configure Mobile App

Update `apps/mobile/.env.local`:

```bash
API_BASE_URL=http://192.168.1.100:3000
API_VERSION=v1
```

**Rebuild mobile app after changing .env:**

```bash
cd apps/mobile

# Android
npm run android

# iOS
npm run ios
```

### Managing Port Forwarding Rules

**View current rules:**

```powershell
netsh interface portproxy show all
```

**Example output:**
```
Listen on ipv4:             Connect to ipv4:

Address         Port        Address         Port
--------------- ----------  --------------- ----------
0.0.0.0         3000        172.25.165.11   3000
```

**Update rule (when WSL2 IP changes):**

```powershell
# Get new WSL2 IP
hostname -I | awk '{print $1}'

# Delete old rule
netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0

# Add new rule with updated IP
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=<NEW_WSL2_IP>
```

**Remove rules (when done testing):**

```powershell
# Remove port forwarding
netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0

# Remove firewall rule
netsh advfirewall firewall delete rule name="WSL Backend Port 3000"
```

### Automated Setup Script (Windows PowerShell)

Save as `setup-wsl-network.ps1`:

```powershell
# Run as Administrator
$wslIP = bash.exe -c "hostname -I | awk '{print `$1}'"
$wslIP = $wslIP.Trim()

Write-Host "WSL2 IP: $wslIP"

# Remove old rule if exists
netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0 2>$null

# Add new rule
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=$wslIP

# Add firewall rule if not exists
$firewallRule = Get-NetFirewallRule -DisplayName "WSL Backend Port 3000" -ErrorAction SilentlyContinue
if (-not $firewallRule) {
    netsh advfirewall firewall add rule name="WSL Backend Port 3000" dir=in action=allow protocol=TCP localport=3000
}

Write-Host "Port forwarding configured successfully!"
Write-Host "Backend accessible at: http://<YOUR_WINDOWS_IP>:3000"
```

**Usage:**
```powershell
# Run as Administrator
.\setup-wsl-network.ps1
```

### WSL2 IP Address Keeps Changing

**Quick Fix:** Re-run the setup script above.

**Permanent Fix (Windows 11 22H2+):**

Create `C:\Users\<YourUsername>\.wslconfig`:

```ini
[wsl2]
networkingMode=mirrored
```

This mirrors the Windows network to WSL2, making `localhost` work without port forwarding.

---

## Troubleshooting

### Docker & Infrastructure

#### Port Already in Use

**Symptom:**
```
Error: Bind for 0.0.0.0:5432 failed: port is already allocated
```

**Solution:**

```bash
# Find what's using the port (e.g., 5432)
lsof -i :5432

# Kill the process
lsof -ti:5432 | xargs kill -9

# Or use a different port in infra/.env
POSTGRES_PORT=5433
DATABASE_PORT=5433  # Update apps/be/.env.local to match
```

#### Docker Compose Command Not Found

```bash
# Use docker compose (v2 — with space, not hyphen)
docker compose up -d

# Or install Docker Desktop / docker-compose package
```

#### PostgreSQL Won't Start

```bash
# Check logs
docker-compose logs postgres

# Fix: Remove corrupted data directory
docker-compose down
rm -rf infra/data/
docker-compose up -d

# Re-seed the database
cd be && npm run migration:run && npm run db:seed
```

#### MinIO Issues

**Bucket not created automatically:**
```bash
# Check MinIO logs
docker-compose logs minio

# Manually create bucket
docker-compose exec postgres sh -c \
  'AWS_ACCESS_KEY_ID=minioadmin AWS_SECRET_ACCESS_KEY=minioadmin \
   aws s3 mb s3://sekar-media-dev --endpoint-url http://minio:9000'

# Verify
docker-compose exec postgres sh -c \
  'AWS_ACCESS_KEY_ID=minioadmin AWS_SECRET_ACCESS_KEY=minioadmin \
   aws s3 ls --endpoint-url http://minio:9000'
```

#### Cannot Connect from Backend

```bash
# Verify services are running
docker-compose ps

# Test database connection manually
psql -h localhost -p 5432 -U postgres -d sekar_db

# Check backend .env matches docker-compose config
cat apps/be/.env.local | grep DATABASE_
```

### Backend

#### Dependencies Not Found

```bash
# From project root, reinstall root tooling
npm install

# Then in backend
cd be && npm install
```

#### Port 3000 in Use

```bash
# Use different port
PORT=3001 npm run start:dev

# Or kill the process
lsof -ti:3000 | xargs kill -9
```

#### Database Connection Failed

```bash
# Check backend .env
cat apps/be/.env.local | grep DATABASE_

# Verify PostgreSQL is running
docker-compose ps postgres  # Should show "Up"

# Test direct connection
psql -h localhost -p 5432 -U postgres -d sekar_db

# If still failing, re-seed
npm run migration:run && npm run db:seed
```

#### Missing S3 Bucket

```bash
# Backend should auto-create in development
# If not, manually create:
docker-compose exec postgres sh -c \
  'AWS_ACCESS_KEY_ID=minioadmin AWS_SECRET_ACCESS_KEY=minioadmin \
   aws s3 mb s3://sekar-media-dev --endpoint-url http://minio:9000'

# Verify bucket config in apps/be/.env.local
cat apps/be/.env.local | grep AWS_
```

### Web Dashboard

#### Cannot Start / Port Conflict

```bash
# Check WEB_PORT in apps/web/.env.local
cat apps/web/.env.local | grep WEB_PORT

# Try different port
WEB_PORT=3002 npm run dev
```

#### API Connection Refused

```bash
# Verify backend is running
curl http://localhost:3000/api/health

# Check NEXT_PUBLIC_API_URL in apps/web/.env.local
cat apps/web/.env.local | grep NEXT_PUBLIC_API_URL

# Should be: http://localhost:3000 (without /api/v1)
```

#### Google Maps API Key Missing

```bash
# Maps don't work, but dashboard still runs
# To enable maps, add token to apps/web/.env.local
# Get from: https://console.cloud.google.com/google/maps-apis

# Set in .env.local
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=pk_...

# Restart: npm run dev
```

### Mobile App

#### Metro Bundler Cache Stale

```bash
npm start -- --reset-cache
```

#### Cannot Connect to Backend (Emulator)

```bash
# Verify backend is running on port 3000
curl http://localhost:3000/api/health

# Check API_BASE_URL in apps/mobile/.env.local
cat apps/mobile/.env.local | grep API_BASE_URL

# For emulator, should be: http://10.0.2.2:3000
# For physical device: http://YOUR_IP:3000
# For iOS simulator: http://localhost:3000
```

#### Android Build Issues

```bash
# Clean Gradle cache
cd apps/mobile/android && ./gradlew clean

# Rebuild
cd apps/mobile && npm run android

# Or for all devices
npm run android:all
```

#### API Request Timeout

```bash
# On physical device, verify port forwarding is active
netsh interface portproxy show all  # Windows PowerShell

# Check Windows firewall rule
netsh advfirewall firewall show rule name="WSL Backend Port 3000"

# Verify phone and PC on same WiFi
```

### WSL2 Network

#### Phone Can't Connect to Backend

**Solutions (in order):**

1. Verify backend is running:
   ```bash
   curl http://localhost:3000/api/health
   ```

2. Check port forwarding is active:
   ```powershell
   netsh interface portproxy show all
   ```

3. Verify firewall rule exists:
   ```powershell
   netsh advfirewall firewall show rule name="WSL Backend Port 3000"
   ```

4. Verify Windows IP hasn't changed:
   ```powershell
   ipconfig | findstr IPv4
   ```

5. Ensure phone and PC on same WiFi network

6. Test from Windows browser:
   ```
   http://localhost:3000/api/health
   ```

#### WSL2 IP Keeps Changing

Run the automated setup script (`setup-wsl-network.ps1`) after WSL2 restarts, or enable Windows 11's mirrored networking (see [WSL2 IP Address Keeps Changing](#wsl2-ip-address-keeps-changing)).

---

## Related Documentation

- **[deployment-guide.md](./deployment-guide.md)** — Production deployment (self-hosted Docker + AWS)
- **[environment-variables.md](./environment-variables.md)** — Complete env var reference for all workspaces
- **[credentials-setup.md](./credentials-setup.md)** — Firebase, Google Maps, and other API credentials
- **[ios-release-guide.md](./ios-release-guide.md)** — iOS app release checklist
- **[android-release-guide.md](./android-release-guide.md)** — Android app release checklist
- **Project CLAUDE.md** — Quick start, role values, conventions, key resources

---

## Summary Checklist

Before starting development:

- [ ] Docker and Docker Compose installed (`docker -v` and `docker-compose --version`)
- [ ] Clone repo and `cd` to project root
- [ ] Run `./scripts/setup.sh` (creates env files, installs deps, starts infra)
- [ ] Verify services: `docker-compose ps` (all should show "Up")
- [ ] Test database: `psql -h localhost -p 5432 -U postgres -d sekar_db`
- [ ] Access Adminer: http://localhost:8080 (login with postgres/postgres)
- [ ] (Optional) Backend started: `cd be && npm run start:dev` (http://localhost:3000)
- [ ] (Optional) Web started: `cd apps/web && npm run dev` (http://localhost:3001)
- [ ] (Optional) Mobile Metro: `cd apps/mobile && npm start`
- [ ] Test with `superadmin/12345678` (local) or `satgas1/12345678`

For physical mobile device testing on WSL2, follow [WSL2 Network Setup](#wsl2-network-setup-physical-mobile-devices).

---

**Last Updated:** June 19, 2026  
**Related:** [deployment-guide.md](./deployment-guide.md), [environment-variables.md](./environment-variables.md), [WSL2 Network Setup](#wsl2-network-setup-physical-mobile-devices)
