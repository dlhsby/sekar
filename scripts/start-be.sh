#!/bin/bash
# Start the SEKAR backend in the foreground (infrastructure auto-started).
# API: http://localhost:<BE_PORT> · Swagger: http://localhost:<BE_PORT>/api/v1/docs
#
# The backend binds 0.0.0.0, so it's already reachable on the LAN. Pass --lan to
# print the phone-facing API URL + the one-time WSL2 Windows port-forward — use
# this when testing the NATIVE mobile app on a real device (the app calls the API
# directly). The phone web browser does NOT need this (start-web.sh proxies /api).
#
# Usage: ./scripts/start-be.sh [--lan [IP]]
#   --lan [IP]   advertise the backend on the LAN (IP auto-detected if omitted)
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

LAN=false
LAN_IP_ARG=""
while [ $# -gt 0 ]; do
  case "$1" in
    --lan)
      LAN=true
      if [[ "${2:-}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then LAN_IP_ARG="$2"; shift; fi
      ;;
    -h|--help)
      cat <<'USAGE'
start-be.sh — start the backend in the foreground (auto-starts Docker infra).
  ./scripts/start-be.sh              localhost (also bound to 0.0.0.0)
  ./scripts/start-be.sh --lan        print the phone-facing API URL + WSL port-forward
  ./scripts/start-be.sh --lan 192.168.1.5   force the advertised LAN IP
Use --lan to test the NATIVE mobile app on a real device.
USAGE
      exit 0 ;;
    *)
      if [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then LAN=true; LAN_IP_ARG="$1";
      else print_error "Unknown flag: $1 (supported: --lan [IP], --help)"; exit 1; fi
      ;;
  esac
  shift
done

load_ports
free_port "$BE_PORT" "backend"
ensure_infra
[ "$LAN" = true ] && print_be_lan_help "$LAN_IP_ARG"
print_info "Starting backend on :$BE_PORT (start:dev, foreground — Ctrl+C to stop)..."
print_info "Swagger: http://localhost:$BE_PORT/api/v1/docs"
cd "$ROOT/apps/be" && npm run start:dev
