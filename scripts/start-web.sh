#!/bin/bash
# Start the SEKAR web app in the foreground. http://localhost:3001
# (Expects the backend on :3000 — run ./scripts/start-be.sh separately.)
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

load_ports
free_port "$WEB_PORT" "web"
print_info "Starting web app on :$WEB_PORT (next dev, foreground — Ctrl+C to stop)..."
cd "$ROOT/apps/web" && npm run dev
