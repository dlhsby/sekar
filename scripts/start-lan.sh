#!/bin/bash
# Start SEKAR (backend + web) for testing from another device on your home
# Wi-Fi — e.g. your phone. Binds both apps to 0.0.0.0 and advertises a LAN IP
# so the browser's API/WS calls resolve to a reachable host (not "localhost",
# which on the phone means the phone itself). Backend + web run in the
# background (logs/); stop them with ./scripts/stop.sh.
#
# WSL2 note: WSL runs behind NAT, so your phone reaches the *Windows* host IP,
# not the WSL IP. This script prints the one-time Windows port-forward +
# firewall commands (run once in an elevated PowerShell) and also writes them to
# logs/windows-lan-setup.ps1. A cleaner permanent alternative is WSL2 "mirrored"
# networking — see the printed notes.
#
# Usage: ./scripts/start-lan.sh [LAN_IP]
#   LAN_IP  the address your phone will hit. Default: auto-detected LAN IP
#           (the Windows host IP under WSL). Override if detection picks wrong.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

is_wsl() { grep -qiE "microsoft|wsl" /proc/version 2>/dev/null; }

# The address the phone will connect to. Under WSL that's the Windows host's
# LAN IP; natively it's this machine's LAN IP. Skip loopback + the WSL/Docker
# virtual 172.x ranges so we advertise the real home-network address.
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

LAN_IP="${1:-$(detect_lan_ip)}"
if [ -z "$LAN_IP" ]; then
  print_error "Could not auto-detect a LAN IP. Pass it explicitly: ./scripts/start-lan.sh <ip>"
  exit 1
fi

echo -e "${GREEN}══ SEKAR LAN stack (phone testing) ══${NC}"
load_ports

# Advertise the LAN IP to the browser bundle + allow the phone origin through
# CORS. These env vars override apps/*/.env.local for the child processes only
# (Next + dotenvx both leave already-set env vars untouched) — your .env.local
# files are not modified, so plain ./scripts/start.sh is unaffected next time.
export NEXT_PUBLIC_API_URL="http://$LAN_IP:$BE_PORT"
export NEXT_PUBLIC_WS_URL="ws://$LAN_IP:$BE_PORT"
export CORS_ORIGIN="http://localhost:$WEB_PORT,http://$LAN_IP:$WEB_PORT,http://localhost:19006"

free_port "$BE_PORT" "backend"
free_port "$WEB_PORT" "web"
ensure_infra

# Backend already binds 0.0.0.0 (main.ts). Web needs -H 0.0.0.0 to leave localhost.
start_bg backend "$ROOT/apps/be" npm run start:dev
start_bg web "$ROOT/apps/web" npm run dev -- -H 0.0.0.0

print_info "Waiting for services (backend :$BE_PORT · web :$WEB_PORT)..."
wait_for_http "http://localhost:$BE_PORT/api/v1/health/live" 120 "Backend API" || true
wait_for_http "http://localhost:$WEB_PORT" 120 "Web app" || true

# ── WSL2 Windows-side port-forward + firewall (write to a runnable .ps1) ──────
WSL_IP="$(ip -4 addr show eth0 2>/dev/null | grep -oP 'inet \K[0-9.]+' | head -1 || true)"
PS1_FILE="$LOG_DIR/windows-lan-setup.ps1"
if is_wsl && [ -n "$WSL_IP" ]; then
  cat >"$PS1_FILE" <<PS
# SEKAR — expose WSL2 ports on the Windows LAN so your phone can reach them.
# Run ONCE in an ELEVATED PowerShell (right-click > Run as administrator).
# Re-run only if the WSL IP changes (after a full WSL/PC restart).
netsh interface portproxy add v4tov4 listenport=$BE_PORT  listenaddress=0.0.0.0 connectport=$BE_PORT  connectaddress=$WSL_IP
netsh interface portproxy add v4tov4 listenport=$WEB_PORT listenaddress=0.0.0.0 connectport=$WEB_PORT connectaddress=$WSL_IP
New-NetFirewallRule -DisplayName "SEKAR LAN ($BE_PORT,$WEB_PORT)" -Direction Inbound -Action Allow -Protocol TCP -LocalPort $BE_PORT,$WEB_PORT -ErrorAction SilentlyContinue

# To UNDO later:
# netsh interface portproxy delete v4tov4 listenport=$BE_PORT  listenaddress=0.0.0.0
# netsh interface portproxy delete v4tov4 listenport=$WEB_PORT listenaddress=0.0.0.0
# Remove-NetFirewallRule -DisplayName "SEKAR LAN ($BE_PORT,$WEB_PORT)"
PS
fi

echo ""
echo -e "${BLUE}On your phone (same Wi-Fi), open:${NC}  ${GREEN}http://$LAN_IP:$WEB_PORT${NC}"
echo -e "  • Web:      ${GREEN}http://$LAN_IP:$WEB_PORT${NC}"
echo -e "  • API:      ${GREEN}http://$LAN_IP:$BE_PORT/api/v1${NC}   (health: /health/live)"
echo -e "  • Logs:     logs/backend.log · logs/web.log   ·   Stop: ./scripts/stop.sh"
if is_wsl && [ -n "$WSL_IP" ]; then
  echo ""
  print_warning "WSL2 detected — the phone can't reach WSL ($WSL_IP) directly."
  echo -e "  Run this ONCE in an ${GREEN}elevated PowerShell${NC} on Windows (also saved to ${GREEN}logs/windows-lan-setup.ps1${NC}):"
  echo -e "    ${GREEN}netsh interface portproxy add v4tov4 listenport=$BE_PORT  listenaddress=0.0.0.0 connectport=$BE_PORT  connectaddress=$WSL_IP${NC}"
  echo -e "    ${GREEN}netsh interface portproxy add v4tov4 listenport=$WEB_PORT listenaddress=0.0.0.0 connectport=$WEB_PORT connectaddress=$WSL_IP${NC}"
  echo -e "    ${GREEN}New-NetFirewallRule -DisplayName \"SEKAR LAN ($BE_PORT,$WEB_PORT)\" -Direction Inbound -Action Allow -Protocol TCP -LocalPort $BE_PORT,$WEB_PORT${NC}"
  echo -e "  Tip: from Windows, run it directly with:  ${GREEN}powershell -ExecutionPolicy Bypass -File \\\\wsl.localhost\\...\\logs\\windows-lan-setup.ps1${NC}"
  echo -e "  Cleaner permanent fix: WSL2 mirrored networking — add to ${GREEN}%UserProfile%\\.wslconfig${NC}:  ${GREEN}[wsl2]\\nnetworkingMode=mirrored${NC}  then ${GREEN}wsl --shutdown${NC} (then no portproxy needed)."
fi
echo ""
