#!/bin/bash
# SEKAR local infrastructure — PostgreSQL, Adminer, MinIO (S3), Redis.
# Consolidates the former infra/start.sh + infra/stop.sh into scripts/.
#
# Usage: ./scripts/infra.sh [start|stop|down|status]
#   start  (default) bring services up and wait for Postgres + MinIO healthy
#   stop   stop containers, preserve data
#   down   stop AND remove volumes (DESTRUCTIVE — wipes DB + object storage)
#   status show compose service status
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

# Run compose from infra/ so relative paths (./data), container names and the
# auto-loaded infra/.env all resolve exactly as the compose file expects.
cd "$ROOT/infra"
ensure_env_file "$ROOT/infra/.env" "$ROOT/infra/.env.example" "infra" || true

cmd="${1:-start}"
case "$cmd" in
  start)
    print_info "Starting infrastructure (PostgreSQL, Adminer, MinIO, Redis)..."
    docker compose up -d
    wait_for_container_healthy sekar-postgres 60 "PostgreSQL"
    wait_for_container_healthy sekar-minio 60 "MinIO"
    print_success "Infrastructure up"
    echo -e "  Postgres : localhost:${POSTGRES_PORT:-5432} (db ${POSTGRES_DB:-sekar_db})"
    echo -e "  Adminer  : http://localhost:${ADMINER_PORT:-8080}"
    echo -e "  MinIO    : API http://localhost:${MINIO_PORT:-9000} · console http://localhost:${MINIO_CONSOLE_PORT:-9001}"
    echo -e "  Redis    : localhost:${REDIS_PORT:-6379}"
    ;;
  stop)
    print_info "Stopping infrastructure (data preserved)..."
    docker compose down
    print_success "Infrastructure stopped"
    ;;
  down)
    print_warning "Removing infrastructure INCLUDING volumes (DB + object storage will be wiped)."
    docker compose down -v
    print_success "Infrastructure removed"
    ;;
  status)
    docker compose ps
    ;;
  *)
    print_error "Usage: ./scripts/infra.sh [start|stop|down|status]"
    exit 1
    ;;
esac
