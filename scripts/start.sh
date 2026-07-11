#!/bin/bash
# Start the full SEKAR dev stack: infrastructure (Docker), backend + web in
# the background (PID files + logs under logs/), Metro in the foreground.
# Ctrl+C stops backend/web/Metro (Docker services keep running; use
# ./scripts/stop.sh --infra to stop those too).
#
# Usage: ./scripts/start.sh [--no-mobile] [--lan [IP]]
#   --no-mobile  skip Metro; backend + web keep running in the background
#   --lan [IP]   also expose the app on your home Wi-Fi so another device (e.g.
#                your phone) can reach it. Binds web to 0.0.0.0, advertises a
#                LAN IP to the browser bundle (API/WS) + CORS. IP auto-detected
#                (the Windows host IP under WSL); pass one to override.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

NO_MOBILE=false
LAN=false
LAN_IP_ARG=""
while [ $# -gt 0 ]; do
  case "$1" in
    --no-mobile) NO_MOBILE=true ;;
    --lan)
      LAN=true
      # Optional IP immediately after --lan (e.g. --lan 192.168.1.5).
      if [[ "${2:-}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then LAN_IP_ARG="$2"; shift; fi
      ;;
    -h|--help)
      cat <<'USAGE'
start.sh — start the dev stack (run this day-to-day).
Auto-starts the Docker infra if it's down, then runs backend + web in the
background (logs/) and Metro in the foreground. Ctrl+C stops the apps; the
Docker services stay up (use ./scripts/stop.sh --infra to stop those too).

  ./scripts/start.sh                 infra + backend + web + Metro (localhost)
  ./scripts/start.sh --no-mobile     skip Metro (backend + web keep running)
  ./scripts/start.sh --lan           also reachable from your phone on the LAN
  ./scripts/start.sh --lan 192.168.1.5   force the advertised LAN IP
  ./scripts/start.sh --lan --no-mobile   phone web testing, no Metro

--lan advertises your LAN IP to the browser (API/WS) + opens CORS, without
touching .env.local. On WSL2 it prints the one-time Windows port-forward +
firewall step. First-time setup is ./scripts/setup.sh.
USAGE
      exit 0 ;;
    *) print_error "Unknown flag: $1 (supported: --no-mobile, --lan [IP], --help)"; exit 1 ;;
  esac
  shift
done

is_wsl() { grep -qiE "microsoft|wsl" /proc/version 2>/dev/null; }

# The address a phone connects to. Under WSL that's the Windows host's LAN IP;
# natively it's this machine's LAN IP. Skip loopback + the WSL/Docker virtual
# 172.x ranges so we advertise the real home-network address.
detect_lan_ip() {
  local ip=""
  if is_wsl; then
    local ipconfig="/mnt/c/Windows/System32/ipconfig.exe"
    command -v ipconfig.exe >/dev/null 2>&1 && ipconfig="ipconfig.exe"
    ip="$("$ipconfig" 2>/dev/null | grep -aiE "IPv4" \
      | grep -oE "[0-9]+(\.[0-9]+){3}" | grep -vE "^(127\.|172\.)" | head -1 || true)"
  fi
  [ -z "$ip" ] && ip="$(hostname -I 2>/dev/null | tr ' ' '\n' | grep -vE "^(127\.|172\.)" | head -1 || true)"
  echo "$ip"
}

echo -e "${GREEN}══ SEKAR dev stack ══${NC}"
load_ports
free_port "$BE_PORT" "backend"
free_port "$WEB_PORT" "web"
ensure_infra

# ── LAN mode: advertise a reachable IP + bind web to all interfaces ───────────
# These env vars override apps/*/.env.local for the child processes only (Next +
# dotenvx both leave already-set env vars untouched) — .env.local is unchanged.
WEB_ARGS=()
LAN_IP=""
if [ "$LAN" = true ]; then
  LAN_IP="${LAN_IP_ARG:-${LAN_IP:-$(detect_lan_ip)}}"
  if [ -z "$LAN_IP" ]; then
    print_error "Could not auto-detect a LAN IP. Pass one: ./scripts/start.sh --lan <ip>"
    exit 1
  fi
  # Same-origin: the browser talks only to the web origin; the web dev server
  # proxies /api + /socket.io to the backend (next.config rewrites, gated by
  # SEKAR_LAN_PROXY). So only the WEB port must be reachable from the phone — no
  # separate backend-port firewall rule, no CORS.
  export NEXT_PUBLIC_API_URL="http://$LAN_IP:$WEB_PORT"
  export NEXT_PUBLIC_WS_URL="http://$LAN_IP:$WEB_PORT"
  # NOTE: no CORS override needed — the browser only ever talks to the web origin
  # (same-origin proxy above), so CORS never applies. CORS_ORIGIN stays purely
  # env-driven (apps/be/.env.local) for anyone hitting the API cross-origin.
  export SEKAR_LAN_PROXY=1
  export SEKAR_API_PORT="$BE_PORT"
  # Next 16 blocks cross-origin dev resources (/_next/*) by default; without this
  # the phone can't load the JS bundle and the page hangs on the loading gate.
  export SEKAR_ALLOWED_DEV_ORIGINS="$LAN_IP"
  WEB_ARGS=(-- -H 0.0.0.0) # leave localhost-only; backend already binds 0.0.0.0
  print_info "LAN mode: serving http://$LAN_IP:$WEB_PORT (API proxied to :$BE_PORT — only the web port needs to reach your phone)"
fi

start_bg backend "$ROOT/apps/be" npm run start:dev
start_bg web "$ROOT/apps/web" npm run dev "${WEB_ARGS[@]}"

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

# ── LAN mode: phone URL + one-time WSL2 Windows port-forward / firewall ───────
if [ "$LAN" = true ]; then
  WSL_IP="$(ip -4 addr show eth0 2>/dev/null | grep -oP 'inet \K[0-9.]+' | head -1 || true)"
  echo ""
  echo -e "${BLUE}On your phone (same Wi-Fi), open:${NC}  ${GREEN}http://$LAN_IP:$WEB_PORT${NC}"
  if is_wsl && [ -n "$WSL_IP" ]; then
    PS1_FILE="$LOG_DIR/windows-lan-setup.ps1"
    cat >"$PS1_FILE" <<PS
# SEKAR — expose the WSL2 web port on the Windows LAN so your phone can reach it.
# (The API is proxied through the web server, so only the web port is needed.)
# Run ONCE in an ELEVATED PowerShell (right-click > Run as administrator).
# Re-run only if the WSL IP changes (after a full WSL/PC restart).
netsh interface portproxy add v4tov4 listenport=$WEB_PORT listenaddress=0.0.0.0 connectport=$WEB_PORT connectaddress=$WSL_IP
New-NetFirewallRule -DisplayName "SEKAR LAN ($WEB_PORT)" -Direction Inbound -Action Allow -Protocol TCP -LocalPort $WEB_PORT -ErrorAction SilentlyContinue
# To UNDO: netsh interface portproxy delete v4tov4 listenport=$WEB_PORT listenaddress=0.0.0.0 ; Remove-NetFirewallRule -DisplayName "SEKAR LAN ($WEB_PORT)"
PS
    print_warning "WSL2 — the phone can't reach WSL ($WSL_IP) directly. If it can't connect, run ONCE in an elevated PowerShell (saved to logs/windows-lan-setup.ps1):"
    echo -e "    ${GREEN}netsh interface portproxy add v4tov4 listenport=$WEB_PORT listenaddress=0.0.0.0 connectport=$WEB_PORT connectaddress=$WSL_IP${NC}"
    echo -e "    ${GREEN}New-NetFirewallRule -DisplayName \"SEKAR LAN ($WEB_PORT)\" -Direction Inbound -Action Allow -Protocol TCP -LocalPort $WEB_PORT${NC}"
  fi
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
