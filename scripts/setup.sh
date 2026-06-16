#!/bin/bash
# SEKAR one-shot dev setup: prerequisites → env files → infrastructure →
# install all workspaces → migrate (+ optionally seed) the database.
#
# Usage: ./scripts/setup.sh [--yes] [--skip-seed]
#   --yes        seed the database without prompting (CI); SEEDING WIPES DATA
#   --skip-seed  never seed (migrations still run)
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

ASSUME_YES=false
SKIP_SEED=false
for arg in "$@"; do
  case "$arg" in
    --yes) ASSUME_YES=true ;;
    --skip-seed) SKIP_SEED=true ;;
    *) print_error "Unknown flag: $arg (supported: --yes, --skip-seed)"; exit 1 ;;
  esac
done

echo -e "${GREEN}══ SEKAR dev setup ══${NC}"

# 1 — prerequisites (engines: node >=24.13, npm >=10; docker for infra)
print_info "Checking prerequisites..."
require_cmd node "Install Node.js >= 24.13 (https://nodejs.org)"
require_cmd npm "Ships with Node.js"
require_cmd docker "Install Docker (https://docs.docker.com/get-docker/)"
NODE_V="$(node -v | sed 's/^v//')"
NPM_V="$(npm -v)"
version_gte "$NODE_V" "24.13.0" || { print_error "Node $NODE_V < 24.13.0 (see engines in package.json)"; exit 1; }
version_gte "$NPM_V" "10.0.0" || { print_error "npm $NPM_V < 10"; exit 1; }
print_success "node $NODE_V / npm $NPM_V / docker present"

# 2 — env files (infra/.env is created by scripts/infra.sh)
print_info "Ensuring env files..."
ensure_env_file "$ROOT/be/.env.local" "$ROOT/be/.env.local.example" "backend" || true
ensure_env_file "$ROOT/fe/web/.env.local" "$ROOT/fe/web/.env.local.example" "web" || true
ensure_env_file "$ROOT/fe/mobile/.env.local" "$ROOT/fe/mobile/.env.local.example" "mobile" || true

# 3 — root tooling (token pipeline + eslint plugin used by the workspaces)
print_info "Installing root tooling (npm install)..."
( cd "$ROOT" && npm install --no-audit --no-fund )
print_success "Root tooling installed"

# 4 — infrastructure
ensure_infra
# Align backend DB + MinIO ports with infra (handles non-default infra/.env ports)
sync_backend_infra_ports

# 5 — backend: install + migrate (+ seed on confirmation)
print_info "Installing backend dependencies..."
( cd "$ROOT/be" && npm install --no-audit --no-fund )
print_info "Running database migrations..."
if ! ( cd "$ROOT/be" && npm run migration:run ); then
  print_error "Database migrations failed — check DB connectivity (be/.env.local DATABASE_* vs infra/.env POSTGRES_PORT). Aborting setup."
  exit 1
fi
print_success "Backend ready (dependencies + migrations)"

if [ "$SKIP_SEED" = true ]; then
  print_info "Skipping database seed (--skip-seed)"
else
  DO_SEED=false
  if [ "$ASSUME_YES" = true ]; then
    DO_SEED=true
  elif [ -t 0 ]; then
    print_warning "Seeding WIPES the database and recreates demo data (users: admin/password123 …)."
    read -r -p "Seed the database now? [y/N] " reply
    [[ "$reply" =~ ^[Yy]$ ]] && DO_SEED=true
  else
    print_warning "Non-interactive shell — skipping destructive db:seed (pass --yes to force)"
  fi
  if [ "$DO_SEED" = true ]; then
    # On a truly fresh DB some tables (e.g. notifications) are created by
    # TypeORM synchronize at first boot, not by migrations — boot the backend
    # once so the schema is complete before seeding.
    load_ports
    BOOTED_FOR_SEED=false
    if ! curl -sf -o /dev/null --max-time 2 "http://localhost:$BE_PORT/api/v1/health/live"; then
      print_info "Booting backend once so synchronize completes the schema..."
      start_bg backend "$ROOT/be" npm run start:dev
      wait_for_http "http://localhost:$BE_PORT/api/v1/health/live" 120 "Backend (schema sync)"
      BOOTED_FOR_SEED=true
    fi
    print_info "Seeding database (destructive)..."
    ( cd "$ROOT/be" && npm run db:seed )
    print_success "Database seeded"
    if [ "$BOOTED_FOR_SEED" = true ]; then
      stop_pid backend "nest start --watch"
    fi
  fi
fi

# 6 — web
print_info "Installing web dependencies..."
( cd "$ROOT/fe/web" && npm install --no-audit --no-fund )
print_success "Web ready"

# 7 — mobile (Android SDK optional — Metro/tests work without it)
print_info "Installing mobile dependencies..."
( cd "$ROOT/fe/mobile" && npm install --no-audit --no-fund )
if [ -z "${ANDROID_HOME:-}${ANDROID_SDK_ROOT:-}" ] && [ ! -d "$HOME/Android/Sdk" ]; then
  print_warning "No Android SDK detected — Metro and tests still work; 'npm run android' needs the SDK"
else
  print_success "Android SDK detected"
fi
print_success "Mobile ready"

load_ports
echo ""
echo -e "${GREEN}══ Setup complete ══${NC}"
echo -e "  Start everything:  ${GREEN}./scripts/start.sh${NC} (or npm run start)"
echo -e "  Backend only:      ${GREEN}./scripts/start-be.sh${NC}   → http://localhost:$BE_PORT (docs: /api/v1/docs)"
echo -e "  Web only:          ${GREEN}./scripts/start-web.sh${NC}  → http://localhost:$WEB_PORT"
echo -e "  Mobile (Metro):    ${GREEN}./scripts/start-mobile.sh${NC} (--android to build+install)"
echo -e "  Stop:              ${GREEN}./scripts/stop.sh${NC} (--infra to also stop Docker services)"
echo -e "  Ports: ${GREEN}be/.env.local${NC} PORT=$BE_PORT · ${GREEN}fe/web/.env.local${NC} WEB_PORT=$WEB_PORT"
