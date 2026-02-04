# Infrastructure Setup Guide

**Purpose:** Local development infrastructure using Docker Compose for database, admin tools, and AWS emulation.

**Services Included:**
- PostgreSQL 14 (database)
- Adminer (web-based database UI)
- LocalStack (AWS S3 emulation)

**Related Documentation:**
- [AWS S3 Setup](./aws-s3-setup.md) - Production S3 configuration
- [WSL2 Network Setup](./wsl2-network-setup.md) - Network access for mobile testing
- [Phase 2 Deployment](./phase-2-deployment.md) - Complete deployment guide

---

## Quick Start

```bash
# Start all services
cd infra
./start.sh
# or
docker-compose up -d

# Check status
docker-compose ps

# Stop services
./stop.sh
# or
docker-compose down
```

That's it! Services are now running:
- **PostgreSQL:** localhost:5432
- **Adminer:** http://localhost:8080
- **LocalStack S3:** http://localhost:4566

---

## Services Overview

### PostgreSQL 14

**Purpose:** Primary database for SEKAR application.

**Connection Details:**
- **Host:** `localhost` (or `postgres` from within Docker network)
- **Port:** `5432`
- **Database:** `sekar_db`
- **Username:** `postgres`
- **Password:** `postgres`
- **Data Location:** `./infra/data/` (persistent storage)

**Connecting from Backend:**

```bash
# Backend .env configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=sekar_db
```

**Direct Connection:**

```bash
# From host machine
psql -h localhost -p 5432 -U postgres -d sekar_db

# From within Docker network
docker-compose exec postgres psql -U postgres -d sekar_db

# List all databases
docker-compose exec postgres psql -U postgres -c '\l'

# List all tables in sekar_db
docker-compose exec postgres psql -U postgres -d sekar_db -c '\dt'
```

---

### Adminer

**Purpose:** Web-based database management UI (alternative to pgAdmin).

**Access:** http://localhost:8080

**Login Credentials:**
- **System:** PostgreSQL
- **Server:** `postgres` (or `localhost` if connecting from host)
- **Username:** `postgres`
- **Password:** `postgres`
- **Database:** `sekar_db` (or leave empty to see all databases)

**Features:**
- Browse tables and data
- Run SQL queries
- Import/export data
- View database structure
- Edit table data directly
- Execute migrations

**Why Adminer?**
- Lightweight (single PHP file)
- Fast startup
- No installation needed
- Works in browser
- Alternative to heavier tools like pgAdmin

---

### LocalStack

**Purpose:** Local AWS S3 emulation for development (no AWS account/costs needed).

**Endpoint:** http://localhost:4566

**Services Enabled:** S3 only (fast startup)

**Data Location:** `./infra/localstack/data/` (persistent storage)

**Common Operations:**

```bash
# List buckets
docker-compose exec postgres sh -c \
  'AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test \
   aws s3 ls --endpoint-url http://localstack:4566'

# Create bucket
docker-compose exec postgres sh -c \
  'AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test \
   aws s3 mb s3://sekar-media-dev --endpoint-url http://localstack:4566'

# List objects in bucket
docker-compose exec postgres sh -c \
  'AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test \
   aws s3 ls s3://sekar-media-dev --endpoint-url http://localstack:4566 --recursive'

# Download file
docker-compose exec postgres sh -c \
  'AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test \
   aws s3 cp s3://sekar-media-dev/path/to/file.jpg /tmp/file.jpg \
   --endpoint-url http://localstack:4566'

# Upload file (for testing)
docker-compose exec postgres sh -c \
  'AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test \
   aws s3 cp /tmp/test.jpg s3://sekar-media-dev/test.jpg \
   --endpoint-url http://localstack:4566'
```

**Backend Configuration for LocalStack:**

```bash
# Backend .env
AWS_ENDPOINT_URL=http://localhost:4566
AWS_S3_FORCE_PATH_STYLE=true
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_S3_BUCKET=sekar-media-dev
AWS_REGION=ap-southeast-1
```

See [AWS S3 Setup](./aws-s3-setup.md) for production configuration.

---

## Docker Compose Configuration

### File Location

`infra/docker-compose.yml`

### Service Definitions

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    container_name: sekar-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: sekar_db
    ports:
      - "5432:5432"
    volumes:
      - ./data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  adminer:
    image: adminer:latest
    container_name: sekar-adminer
    ports:
      - "8080:8080"
    depends_on:
      - postgres

  localstack:
    image: localstack/localstack:latest
    container_name: sekar-localstack
    environment:
      SERVICES: s3
      DEBUG: 0
      DATA_DIR: /tmp/localstack/data
    ports:
      - "4566:4566"
    volumes:
      - ./localstack/data:/tmp/localstack/data
```

---

## Environment Variables

### Configuration File

Create `infra/.env` (optional - has defaults):

```bash
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=sekar_db
POSTGRES_PORT=5432

# Adminer
ADMINER_PORT=8080

# LocalStack
LOCALSTACK_PORT=4566
LOCALSTACK_DEBUG=0
```

### Defaults

If `.env` doesn't exist, uses defaults from docker-compose.yml:
- PostgreSQL: postgres/postgres/sekar_db on port 5432
- Adminer: port 8080
- LocalStack: port 4566

---

## Common Operations

### Starting Services

```bash
cd infra

# Start all services (detached mode)
docker-compose up -d

# Start specific service
docker-compose up -d postgres

# Start with logs visible
docker-compose up

# Start and rebuild images
docker-compose up -d --build
```

### Stopping Services

```bash
cd infra

# Stop all services (keeps data)
docker-compose down

# Stop specific service
docker-compose stop postgres

# Stop and remove volumes (deletes data!)
docker-compose down -v
```

### Checking Status

```bash
cd infra

# List running services
docker-compose ps

# View logs
docker-compose logs

# Follow logs (real-time)
docker-compose logs -f

# Logs for specific service
docker-compose logs -f postgres
docker-compose logs -f localstack
```

### Restarting Services

```bash
cd infra

# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart postgres
```

---

## Data Persistence

### PostgreSQL Data

**Location:** `infra/data/`

**What's Stored:**
- All database files
- Table data
- Indexes
- User accounts

**Persistence:** Data survives container restarts. Only deleted with `docker-compose down -v`.

**Backup:**

```bash
# Export database
docker-compose exec postgres pg_dump -U postgres sekar_db > backup.sql

# Restore database
cat backup.sql | docker-compose exec -T postgres psql -U postgres sekar_db
```

### LocalStack Data

**Location:** `infra/localstack/data/`

**What's Stored:**
- S3 bucket definitions
- Uploaded files (selfies, reports)

**Persistence:** Data survives container restarts. Only deleted with `docker-compose down -v` or `rm -rf localstack/`.

### Resetting All Data

```bash
cd infra

# Stop containers and remove volumes
docker-compose down -v

# Delete data directories
rm -rf data/ localstack/

# Restart fresh
docker-compose up -d

# Re-seed database
cd ../be
npm run seed
```

---

## Troubleshooting

### Port Already in Use

**Symptom:**
```
Error: Bind for 0.0.0.0:5432 failed: port is already allocated
```

**Solutions:**

1. **Check what's using the port:**
```bash
# Linux/macOS
lsof -i :5432

# Windows
netstat -ano | findstr :5432
```

2. **Kill the process:**
```bash
# Linux/macOS
lsof -ti:5432 | xargs kill -9

# Windows (replace <PID> with process ID)
taskkill /PID <PID> /F
```

3. **Use different port:**
```yaml
# Edit docker-compose.yml
ports:
  - "5433:5432"  # Use 5433 on host instead

# Update backend .env
DATABASE_PORT=5433
```

---

### Docker Compose Command Not Found

**Symptom:**
```
command not found: docker-compose
```

**Solutions:**

1. **Install Docker Desktop** (includes docker-compose)
2. **Use `docker compose` (v2)** instead:
```bash
docker compose up -d  # space instead of hyphen
```

---

### PostgreSQL Won't Start

**Symptom:**
```
postgres exited with code 1
```

**Solutions:**

1. **Check logs:**
```bash
docker-compose logs postgres
```

2. **Common causes:**
   - Data directory permission issues
   - Corrupted data directory
   - Port conflict

3. **Fix:**
```bash
# Stop containers
docker-compose down

# Remove data directory (loses data!)
rm -rf data/

# Start fresh
docker-compose up -d

# Re-seed database
cd ../be && npm run seed
```

---

### LocalStack Not Creating S3 Bucket

**Symptom:**
- Backend logs show S3 errors
- Bucket doesn't exist in LocalStack

**Solutions:**

1. **Check LocalStack logs:**
```bash
docker-compose logs localstack
```

2. **Manually create bucket:**
```bash
docker-compose exec postgres sh -c \
  'AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test \
   aws s3 mb s3://sekar-media-dev --endpoint-url http://localstack:4566'
```

3. **Verify bucket exists:**
```bash
docker-compose exec postgres sh -c \
  'AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test \
   aws s3 ls --endpoint-url http://localstack:4566'
```

---

### Cannot Connect from Backend

**Symptom:**
- Backend can't connect to PostgreSQL
- Connection timeout errors

**Solutions:**

1. **Check service is running:**
```bash
docker-compose ps
# postgres should show "Up" status
```

2. **Verify connection details:**
```bash
# Backend .env should have:
DATABASE_HOST=localhost  # or 'postgres' if backend in Docker
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=sekar_db
```

3. **Test connection:**
```bash
# From host
psql -h localhost -p 5432 -U postgres -d sekar_db

# From backend directory
cd be
npm run start:dev
# Should connect successfully
```

---

### Adminer Shows "Cannot Connect"

**Symptom:**
- Adminer UI loads but can't connect to database

**Solutions:**

1. **Use correct server name:**
   - **From Adminer container:** Use `postgres` (service name)
   - **From host:** Use `localhost`

2. **Verify PostgreSQL is running:**
```bash
docker-compose ps postgres
# Should show "Up"
```

3. **Check credentials match:**
   - Username: `postgres`
   - Password: `postgres`
   - Database: `sekar_db`

---

### Volume Permission Issues

**Symptom:**
```
Permission denied: /var/lib/postgresql/data
```

**Solutions:**

```bash
# Fix permissions on data directory
sudo chown -R $USER:$USER infra/data infra/localstack

# Or run with sudo (not recommended)
sudo docker-compose up -d
```

---

## Scripts Reference

### start.sh

```bash
#!/bin/bash
cd "$(dirname "$0")"
docker-compose up -d
echo "Services started:"
docker-compose ps
```

### stop.sh

```bash
#!/bin/bash
cd "$(dirname "$0")"
docker-compose down
echo "Services stopped."
```

### reset.sh (example - not included)

```bash
#!/bin/bash
cd "$(dirname "$0")"
docker-compose down -v
rm -rf data/ localstack/
docker-compose up -d
echo "Infrastructure reset complete. Don't forget to re-seed the database!"
```

---

## Service Health Checks

### PostgreSQL Health

```bash
# Check if PostgreSQL is accepting connections
docker-compose exec postgres pg_isready -U postgres

# Expected output:
# /var/run/postgresql:5432 - accepting connections
```

### Check All Services

```bash
# View service status
docker-compose ps

# Expected output:
# NAME                IMAGE                      STATUS
# sekar-postgres      postgres:14-alpine         Up (healthy)
# sekar-adminer       adminer:latest             Up
# sekar-localstack    localstack/localstack      Up
```

---

## Integration with Backend

### Backend Start Sequence

```bash
# 1. Start infrastructure
cd infra && ./start.sh

# 2. Wait for PostgreSQL to be ready
docker-compose exec postgres pg_isready -U postgres

# 3. Seed database (first time only)
cd ../be
npm run seed

# 4. Start backend
npm run start:dev
```

### Automated with Script

`scripts/local-dev-start.sh`:

```bash
#!/bin/bash

# Start infrastructure
cd infra && ./start.sh

# Wait for PostgreSQL
echo "Waiting for PostgreSQL..."
sleep 3

# Check if database is seeded
cd ../be
if [ ! -f ".seeded" ]; then
  echo "Seeding database..."
  npm run seed
  touch .seeded
fi

# Start backend
echo "Starting backend..."
npm run start:dev
```

---

## Production vs Development

### Development (Docker Compose)

- All services local
- LocalStack for S3 (no AWS costs)
- Simple credentials (postgres/postgres)
- Data in local directories
- Fast iteration

### Production

- Managed PostgreSQL (AWS RDS, Supabase, etc.)
- Real AWS S3
- Strong credentials (secrets management)
- Automated backups
- High availability
- See [Phase 2 Deployment](./phase-2-deployment.md)

---

## Summary Checklist

Before starting development:

- [ ] Docker and Docker Compose installed
- [ ] Run `cd infra && ./start.sh`
- [ ] Verify services: `docker-compose ps`
- [ ] Access Adminer: http://localhost:8080
- [ ] Test PostgreSQL: `psql -h localhost -p 5432 -U postgres -d sekar_db`
- [ ] Backend `.env` configured with database credentials
- [ ] Run `npm run seed` in backend (first time)
- [ ] Start backend: `npm run start:dev`

---

**Last Updated:** February 2, 2026
**Related:** [AWS S3 Setup](./aws-s3-setup.md), [WSL2 Network](./wsl2-network-setup.md)
