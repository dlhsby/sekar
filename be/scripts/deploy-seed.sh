#!/bin/bash
# SEKAR Production Database Seeding Script
# This script is designed to run on the EC2 instance after deployment
# It seeds the database using the same connection as migrations

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}SEKAR Production Database Seeding${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Check if running on EC2 with proper credentials
if [ ! -f .env.production ]; then
  echo -e "${RED}❌ ERROR: .env.production not found${NC}"
  echo "This script must be run from the backend directory on EC2"
  exit 1
fi

# Load environment variables
source .env.production

# Verify required variables
REQUIRED_VARS=(
  "DATABASE_HOST"
  "DATABASE_PORT"
  "DATABASE_USER"
  "DATABASE_PASSWORD"
  "DATABASE_NAME"
  "ECR_REGISTRY"
)

for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    echo -e "${RED}❌ ERROR: $VAR not set in .env.production${NC}"
    exit 1
  fi
done

echo -e "${GREEN}✅ Environment variables loaded${NC}"
echo ""

# Verify database connectivity
echo "🔍 Testing database connection..."
docker run --rm \
  -e PGPASSWORD=$DATABASE_PASSWORD \
  postgres:14-alpine \
  psql -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USER -d $DATABASE_NAME \
  -c "SELECT version();" > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Database connection successful${NC}"
else
  echo -e "${RED}❌ ERROR: Cannot connect to database${NC}"
  echo "Check DATABASE_HOST, DATABASE_PASSWORD, and network connectivity"
  exit 1
fi
echo ""

# Verify migrations are applied
echo "🔍 Checking migration status..."
MIGRATION_COUNT=$(docker run --rm \
  -e PGPASSWORD=$DATABASE_PASSWORD \
  postgres:14-alpine \
  psql -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USER -d $DATABASE_NAME \
  -t -c "SELECT COUNT(*) FROM typeorm_migrations;" 2>/dev/null | xargs)

if [ "$MIGRATION_COUNT" == "0" ] || [ -z "$MIGRATION_COUNT" ]; then
  echo -e "${RED}❌ ERROR: No migrations applied!${NC}"
  echo "Run migrations first: npm run migration:run:prod"
  exit 1
fi

echo -e "${GREEN}✅ Found $MIGRATION_COUNT migrations applied${NC}"
echo ""

# Verify tables exist
echo "🔍 Verifying database schema..."
TABLES_COUNT=$(docker run --rm \
  -e PGPASSWORD=$DATABASE_PASSWORD \
  postgres:14-alpine \
  psql -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USER -d $DATABASE_NAME \
  -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" | xargs)

if [ "$TABLES_COUNT" -lt 16 ]; then
  echo -e "${RED}❌ ERROR: Only $TABLES_COUNT tables found, expected at least 16${NC}"
  echo "Schema may be incomplete. Check migration logs."
  exit 1
fi

echo -e "${GREEN}✅ Database schema complete ($TABLES_COUNT tables)${NC}"
echo ""

# Check if data already exists
echo "🔍 Checking for existing data..."
USER_COUNT=$(docker run --rm \
  -e PGPASSWORD=$DATABASE_PASSWORD \
  postgres:14-alpine \
  psql -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USER -d $DATABASE_NAME \
  -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs)

if [ "$USER_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  WARNING: Found $USER_COUNT existing users${NC}"
  read -p "Do you want to continue seeding? This may create duplicate data. (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Seeding cancelled"
    exit 0
  fi
fi
echo ""

# Run Phase 1 seeding (users, areas, work zones)
echo "📦 Running Phase 1 seeding (core data)..."
docker run --rm \
  -e DATABASE_HOST=$DATABASE_HOST \
  -e DATABASE_PORT=$DATABASE_PORT \
  -e DATABASE_USER=$DATABASE_USER \
  -e DATABASE_PASSWORD=$DATABASE_PASSWORD \
  -e DATABASE_NAME=$DATABASE_NAME \
  -e DATABASE_SSL=true \
  -e DATABASE_SYNCHRONIZE=false \
  -e DATABASE_MIGRATIONS_RUN=false \
  -e NODE_ENV=production \
  $ECR_REGISTRY/sekar-backend:latest \
  npm run seed:prod

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Phase 1 seeding failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Phase 1 seeding complete${NC}"
echo ""

# Run Phase 2 seeding (rayons)
echo "📦 Running Phase 2 seeding (rayons)..."
docker run --rm \
  -e DATABASE_HOST=$DATABASE_HOST \
  -e DATABASE_PORT=$DATABASE_PORT \
  -e DATABASE_USER=$DATABASE_USER \
  -e DATABASE_PASSWORD=$DATABASE_PASSWORD \
  -e DATABASE_NAME=$DATABASE_NAME \
  -e DATABASE_SSL=true \
  -e DATABASE_SYNCHRONIZE=false \
  -e DATABASE_MIGRATIONS_RUN=false \
  -e NODE_ENV=production \
  $ECR_REGISTRY/sekar-backend:latest \
  npm run seed:phase2:prod

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Phase 2 seeding failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Phase 2 seeding complete${NC}"
echo ""

# Run Task seeding (sample tasks)
echo "📦 Running Task seeding (sample data)..."
docker run --rm \
  -e DATABASE_HOST=$DATABASE_HOST \
  -e DATABASE_PORT=$DATABASE_PORT \
  -e DATABASE_USER=$DATABASE_USER \
  -e DATABASE_PASSWORD=$DATABASE_PASSWORD \
  -e DATABASE_NAME=$DATABASE_NAME \
  -e DATABASE_SSL=true \
  -e DATABASE_SYNCHRONIZE=false \
  -e DATABASE_MIGRATIONS_RUN=false \
  -e NODE_ENV=production \
  $ECR_REGISTRY/sekar-backend:latest \
  npm run seed:tasks:prod

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Task seeding failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Task seeding complete${NC}"
echo ""

# Verify seeding results
echo "🔍 Verifying seeded data..."
docker run --rm \
  -e PGPASSWORD=$DATABASE_PASSWORD \
  postgres:14-alpine \
  psql -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USER -d $DATABASE_NAME \
  -c "SELECT
    (SELECT COUNT(*) FROM users) as users,
    (SELECT COUNT(*) FROM areas) as areas,
    (SELECT COUNT(*) FROM work_zones) as work_zones,
    (SELECT COUNT(*) FROM rayons) as rayons,
    (SELECT COUNT(*) FROM tasks) as tasks;"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Database seeding complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Test credentials:"
echo "  Admin:      admin / admin123"
echo "  Supervisor: supervisor1 / supervisor123"
echo "  Worker:     worker1 / worker123"
echo ""
