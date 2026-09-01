#!/bin/bash
# Start the SEKAR web app in the foreground. http://localhost:<WEB_PORT>
# (Expects the backend on <BE_PORT> — run ./scripts/start-be.sh separately.)
#
# By DEFAULT the web is also reachable from your phone on the LAN via a
# same-origin proxy (the phone talks only to the web port; /api + /socket.io are
# proxied to the backend — no CORS, no second firewall rule). The same build
# also works on localhost, so there's no downside. On WSL2 a one-time Windows
# port-forward is printed. Use --local for localhost only.
#
# Usage: ./scripts/start-web.sh [--local] [IP]
#   --local   localhost only — no LAN proxy / no 0.0.0.0 advertise
#   [IP]      override the advertised LAN IP (else auto-detected)
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

LAN=true
LAN_IP_ARG=""
while [ $# -gt 0 ]; do
  case "$1" in
    --local|--no-lan) LAN=false ;;
    --lan)
      LAN=true
      if [[ "${2:-}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then LAN_IP_ARG="$2"; shift; fi
      ;;
    -h|--help)
      cat <<'USAGE'
start-web.sh — start the web app in the foreground.
  ./scripts/start-web.sh                web on localhost AND the LAN (phone-ready)
  ./scripts/start-web.sh --local        localhost only (no LAN exposure)
  ./scripts/start-web.sh 192.168.1.5    force the advertised LAN IP
Expects the backend running separately (./scripts/start-be.sh).
USAGE
      exit 0 ;;
    *)
      if [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then LAN_IP_ARG="$1";
      else print_error "Unknown flag: $1 (supported: --local, [IP], --help)"; exit 1; fi
      ;;
  esac
  shift
done

load_ports
free_port "$WEB_PORT" "web"
if [ "$LAN" = true ]; then
  # Sets NEXT_PUBLIC_API_URL=""/WS + SEKAR_LAN_PROXY + SEKAR_ALLOWED_DEV_ORIGINS
  # for this child process; .env.local is untouched. `next dev` binds 0.0.0.0.
  setup_web_lan_env "$LAN_IP_ARG"
  print_web_lan_help
fi
print_info "Starting web app on :$WEB_PORT (next dev, foreground — Ctrl+C to stop)..."
cd "$ROOT/apps/web" && npm run dev
