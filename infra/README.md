# SEKAR Infrastructure

Local development infrastructure for SEKAR project.

## Services

### PostgreSQL 14
- **Port:** 5432
- **Database:** sekar_db
- **User:** postgres
- **Password:** postgres
- **Data:** `./data/` (persistent)

### Adminer
- **Port:** 8080
- **URL:** http://localhost:8080
- **Purpose:** Web-based database management

### LocalStack
- **Port:** 4566
- **Service:** S3 only (fast startup)
- **Data:** `./localstack/data/` (persistent)
- **Purpose:** Local AWS S3 emulation for development

## Usage

### Start All Services
```bash
./start.sh
# or
docker-compose up -d
```

### Stop Services
```bash
./stop.sh
# or
docker-compose down
```

### Check Status
```bash
docker-compose ps
```

### View Logs
```bash
docker-compose logs -f
docker-compose logs -f postgres
docker-compose logs -f localstack
```

### S3 Operations (LocalStack)

**List buckets:**
```bash
docker-compose exec postgres sh -c \
  'AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test \
   aws s3 ls --endpoint-url http://localstack:4566'
```

**List objects in bucket:**
```bash
docker-compose exec postgres sh -c \
  'AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test \
   aws s3 ls s3://sekar-media-dev --endpoint-url http://localstack:4566 --recursive'
```

**Download file:**
```bash
docker-compose exec postgres sh -c \
  'AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test \
   aws s3 cp s3://sekar-media-dev/path/to/file.jpg /tmp/file.jpg --endpoint-url http://localstack:4566'
```

## Environment Variables

Configure via `.env` file (copy from `.env.example`):

```env
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

## Data Persistence

- **PostgreSQL:** `./data/` - Database files persist across container restarts
- **LocalStack:** `./localstack/data/` - Uploaded S3 files persist across restarts

To reset data:
```bash
docker-compose down -v
rm -rf data/ localstack/
docker-compose up -d
```
