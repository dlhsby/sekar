#!/bin/bash
# Start the SEKAR backend in the foreground (infrastructure auto-started).
# API: http://localhost:3000 · Swagger: http://localhost:3000/api/docs
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

load_ports
free_port "$BE_PORT" "backend"
ensure_infra
print_info "Starting backend on :$BE_PORT (start:dev, foreground — Ctrl+C to stop)..."
print_info "Swagger: http://localhost:$BE_PORT/api/v1/docs"
cd "$ROOT/apps/be" && npm run start:dev
