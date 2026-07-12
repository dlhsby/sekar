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
# These env vars override apps/*/.env.local for the child processes only (Next +
# dotenvx both leave already-set env vars untouched) — .env.local is unchanged.
WEB_ARGS=()
LAN_IP=""
if [ "$LAN" = true ]; then
  LAN_IP="${LAN_IP_ARG:-$(detect_lan_ip)}"
  # Empty API/WS URL = same origin: the browser talks to whatever origin served
  # the page (localhost OR the LAN IP), and the web dev server proxies /api +
  # /socket.io to the backend (next.config rewrites, gated by SEKAR_LAN_PROXY).
  # One build works everywhere — no baked IP, no CORS, nothing breaks offline.
  export NEXT_PUBLIC_API_URL=""
  export NEXT_PUBLIC_WS_URL=""
  export SEKAR_LAN_PROXY=1
  export SEKAR_API_PORT="$BE_PORT"
  # Next 16 blocks cross-origin dev resources (/_next/*); allow the LAN host so a
  # phone can load the JS bundle. Harmless on localhost (always allowed).
  [ -n "$LAN_IP" ] && export SEKAR_ALLOWED_DEV_ORIGINS="$LAN_IP"
  WEB_ARGS=(-- -H 0.0.0.0) # reachable on the LAN; localhost is unaffected
  if [ -n "$LAN_IP" ]; then
    print_info "LAN: also reachable at http://$LAN_IP:$WEB_PORT (same-origin proxy; localhost unaffected)"
  else
    print_info "LAN: web bound to 0.0.0.0 (no LAN IP auto-detected; pass one to advertise it, or --local to disable)"
  fi
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

# ── Phone URL + one-time WSL2 Windows port-forward / firewall ─────────────────
if [ "$LAN" = true ] && [ -n "$LAN_IP" ]; then
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
