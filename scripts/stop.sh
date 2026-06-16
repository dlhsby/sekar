#!/bin/bash
# Stop SEKAR dev services started by scripts/start*.sh (PID files in logs/,
# with pkill fallbacks for foreground-started leftovers).
#
# Usage: ./scripts/stop.sh [--infra]
#   --infra  also stop the Docker services (PostgreSQL, Adminer, MinIO, Redis)
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

STOP_INFRA=false
for arg in "$@"; do
  case "$arg" in
    --infra) STOP_INFRA=true ;;
    *) print_error "Unknown flag: $arg (supported: --infra)"; exit 1 ;;
  esac
done

echo -e "${GREEN}══ Stopping SEKAR dev services ══${NC}"
stop_pid backend "nest start --watch|be/dist/src/main"
stop_pid web "next dev|next-server"
stop_pid metro "react-native start|react-native/cli.js start"

if [ "$STOP_INFRA" = true ]; then
  "$ROOT/scripts/infra.sh" stop
else
  print_info "Docker services left running (pass --infra to stop them too)"
fi
print_success "Done"
