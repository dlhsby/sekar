#!/bin/bash
# Start the full SEKAR dev stack: infrastructure (Docker), backend + web in
# the background (PID files + logs under logs/), Metro in the foreground.
# Ctrl+C stops backend/web/Metro (Docker services keep running; use
# ./scripts/stop.sh --infra to stop those too).
#
# Usage: ./scripts/start.sh [--no-mobile] [--local] [IP]
#   --no-mobile  skip Metro; backend + web keep running in the background
#   --local      localhost only — don't bind 0.0.0.0 or enable the LAN proxy
#   [IP]         override the advertised LAN IP (else auto-detected)
#
# By DEFAULT the web is also reachable from other devices on your Wi-Fi (e.g.
# your phone) via a same-origin proxy. The browser always talks to whatever
# origin served the page, so the SAME build works on localhost AND any LAN host
# — no baked IP, no CORS, nothing breaks offline. On WSL2 a one-time Windows
# port-forward is printed.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

NO_MOBILE=false
LAN=true
LAN_IP_ARG=""
while [ $# -gt 0 ]; do
  case "$1" in
    --no-mobile) NO_MOBILE=true ;;
    --local|--no-lan) LAN=false ;;
    --lan)
      # LAN is on by default; --lan is kept for back-compat. Optional IP override.
      if [[ "${2:-}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then LAN_IP_ARG="$2"; shift; fi
      ;;
    -h|--help)
      cat <<'USAGE'
start.sh — start the dev stack (run this day-to-day).
Auto-starts the Docker infra if it's down, then runs backend + web in the
background (logs/) and Metro in the foreground. Ctrl+C stops the apps; the
Docker services stay up (use ./scripts/stop.sh --infra to stop those too).

  ./scripts/start.sh                 infra + backend + web + Metro (also on LAN)
  ./scripts/start.sh --no-mobile     skip Metro (backend + web keep running)
  ./scripts/start.sh --local         localhost only (no LAN exposure)
  ./scripts/start.sh 192.168.1.5     force the advertised LAN IP

By default the web is reachable from your phone on the LAN via a same-origin
proxy — the same build also works on localhost, so there's no downside. On WSL2
a one-time Windows port-forward is printed. First-time setup is ./scripts/setup.sh.
USAGE
      exit 0 ;;
    *)
      if [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then LAN_IP_ARG="$1";
      else print_error "Unknown flag: $1 (supported: --no-mobile, --local, [IP], --help)"; exit 1; fi
      ;;
  esac
  shift
done

echo -e "${GREEN}══ SEKAR dev stack ══${NC}"
load_ports
# Clean any prior instance FIRST (stale PID files + orphaned `--watch` parents),
# then free the ports. Otherwise `free_port` kills the port listener but the PID
# file still points at a live orphaned watcher, so start_bg wrongly skips
# ("already running") and the health check hangs for 120s. A re-run must always
# start fresh.
stop_pid backend "nest start --watch|apps/be/dist/src/main" >/dev/null 2>&1 || true
stop_pid web "next dev|next-server" >/dev/null 2>&1 || true
free_port "$BE_PORT" "backend"
free_port "$WEB_PORT" "web"
ensure_infra

# ── LAN exposure (default): same-origin proxy, safe for localhost ─────────────
# setup_web_lan_env exports NEXT_PUBLIC_API_URL=""/WS + SEKAR_LAN_PROXY +
# SEKAR_ALLOWED_DEV_ORIGINS for the child processes only (Next + dotenvx leave
# already-set env vars untouched) — .env.local is unchanged. `next dev` binds
# 0.0.0.0 by default, so no -H flag is needed.
if [ "$LAN" = true ]; then
  setup_web_lan_env "$LAN_IP_ARG"
fi

start_bg backend "$ROOT/apps/be" npm run start:dev
start_bg web "$ROOT/apps/web" npm run dev

print_info "Waiting for services (backend :$BE_PORT · web :$WEB_PORT)..."
wait_for_http "http://localhost:$BE_PORT/api/v1/health/live" 120 "Backend API" || true
wait_for_http "http://localhost:$WEB_PORT" 120 "Web app" || true

echo ""
echo -e "${BLUE}Services:${NC}"
echo -e "  • Backend API:  ${GREEN}http://localhost:$BE_PORT${NC} (Swagger: ${GREEN}http://localhost:$BE_PORT/api/v1/docs${NC})"
echo -e "  • Web app:      ${GREEN}http://localhost:$WEB_PORT${NC}"
echo -e "  • Adminer:      ${GREEN}http://localhost:8080${NC} (see infra/.env)"
echo -e "  • Logs:         ${GREEN}logs/backend.log${NC} · ${GREEN}logs/web.log${NC}"
echo -e "  • Ports:        ${GREEN}apps/be/.env.local${NC} (PORT) · ${GREEN}apps/web/.env.local${NC} (WEB_PORT) · ${GREEN}apps/mobile/.env.local${NC} (METRO_PORT=$METRO_PORT)"

# ── Phone URL + one-time WSL2 Windows port-forward / firewall ─────────────────
if [ "$LAN" = true ]; then
  echo ""
  print_web_lan_help
fi
echo ""

if [ "$NO_MOBILE" = true ]; then
  print_info "Skipping Metro (--no-mobile). Stop services with ./scripts/stop.sh"
  exit 0
fi

cleanup() {
  echo ""
  print_info "Shutting down backend + web..."
  stop_pid backend "nest start --watch|apps/be/dist/src/main"
  stop_pid web "next dev|next-server"
}
trap cleanup INT TERM EXIT

free_port "$METRO_PORT" "metro"
print_info "Starting Metro bundler on :$METRO_PORT (Ctrl+C stops Metro + backend + web)..."
cd "$ROOT/apps/mobile" && npm start -- --port "$METRO_PORT"
