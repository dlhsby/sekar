#!/bin/bash
# Start the full SEKAR dev stack: infrastructure (Docker), backend + web in
# the background (PID files + logs under logs/), Metro in the foreground.
# Ctrl+C stops backend/web/Metro (Docker services keep running; use
# ./scripts/stop.sh --infra to stop those too).
#
# Usage: ./scripts/start.sh [--no-mobile]
#   --no-mobile  skip Metro; backend + web keep running in the background
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

NO_MOBILE=false
for arg in "$@"; do
  case "$arg" in
    --no-mobile) NO_MOBILE=true ;;
    *) print_error "Unknown flag: $arg (supported: --no-mobile)"; exit 1 ;;
  esac
done

echo -e "${GREEN}══ SEKAR dev stack ══${NC}"
load_ports
ensure_infra

start_bg backend "$ROOT/be" npm run start:dev
start_bg web "$ROOT/fe/web" npm run dev

print_info "Waiting for services (backend :$BE_PORT · web :$WEB_PORT)..."
wait_for_http "http://localhost:$BE_PORT/api/v1/health/live" 120 "Backend API" || true
wait_for_http "http://localhost:$WEB_PORT" 120 "Web app" || true

echo ""
echo -e "${BLUE}Services:${NC}"
echo -e "  • Backend API:  ${GREEN}http://localhost:$BE_PORT${NC} (Swagger: ${GREEN}http://localhost:$BE_PORT/api/v1/docs${NC})"
echo -e "  • Web app:      ${GREEN}http://localhost:$WEB_PORT${NC}"
echo -e "  • Adminer:      ${GREEN}http://localhost:8080${NC} (see infra/.env)"
echo -e "  • Logs:         ${GREEN}logs/backend.log${NC} · ${GREEN}logs/web.log${NC}"
echo -e "  • Ports:        ${GREEN}be/.env.local${NC} (PORT) · ${GREEN}fe/web/.env.local${NC} (WEB_PORT)"
echo ""

if [ "$NO_MOBILE" = true ]; then
  print_info "Skipping Metro (--no-mobile). Stop services with ./scripts/stop.sh"
  exit 0
fi

cleanup() {
  echo ""
  print_info "Shutting down backend + web..."
  stop_pid backend "nest start --watch|be/dist/src/main"
  stop_pid web "next dev|next-server"
}
trap cleanup INT TERM EXIT

print_info "Starting Metro bundler (Ctrl+C stops Metro + backend + web)..."
cd "$ROOT/fe/mobile" && npm start
