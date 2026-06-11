#!/bin/bash
# Shared helpers for the SEKAR dev scripts. Source from any script in scripts/:
#   SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
#   source "$SCRIPT_DIR/lib/common.sh"
# Exposes: ROOT (project root), LOG_DIR, print_* helpers, command_exists,
# require_cmd, version_gte, ensure_env_file, ensure_infra, wait_for_http,
# start_bg / stop_pid (PID-file based background process management).

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info()    { echo -e "${BLUE}ℹ${NC} $1"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error()   { echo -e "${RED}✗${NC} $1"; }

# Project root = parent of scripts/lib
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_DIR="$ROOT/logs"
mkdir -p "$LOG_DIR"

command_exists() { command -v "$1" >/dev/null 2>&1; }

require_cmd() {
  if ! command_exists "$1"; then
    print_error "$1 is not installed. $2"
    exit 1
  fi
}

# version_gte CURRENT REQUIRED — true when CURRENT >= REQUIRED (semver-ish).
version_gte() {
  [ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -n1)" = "$2" ]
}

# ensure_env_file TARGET EXAMPLE LABEL — copy the example if target is missing.
ensure_env_file() {
  local target="$1" example="$2" label="$3"
  if [ -f "$target" ]; then
    print_success "$label env already present ($(basename "$target"))"
    return 0
  fi
  if [ ! -f "$example" ]; then
    print_warning "$label: no $(basename "$example") found — skipping"
    return 1
  fi
  cp "$example" "$target"
  print_success "$label env created from $(basename "$example") — review values before production use"
}

# Load per-project dev ports — each app's env file stays the source of truth:
#   backend → be/.env            PORT      (default 3000)
#   web     → fe/web/.env.local  WEB_PORT  (default 3001)
# WEB_PORT is exported because `next dev -p ${WEB_PORT:-3001}` reads the
# shell, not .env.local. Real exported vars (e.g. from CI) win over the files.
env_file_value() { # FILE KEY — last uncommented KEY= value, empty if absent
  [ -f "$1" ] || return 0
  grep -E "^$2=" "$1" | tail -1 | cut -d= -f2 | tr -d '[:space:]' | tr -d '"'
}

load_ports() {
  if [ -z "${BE_PORT:-}" ]; then
    BE_PORT="$(env_file_value "$ROOT/be/.env" PORT)"
  fi
  export BE_PORT="${BE_PORT:-3000}"
  if [ -z "${WEB_PORT:-}" ]; then
    WEB_PORT="$(env_file_value "$ROOT/fe/web/.env.local" WEB_PORT)"
  fi
  export WEB_PORT="${WEB_PORT:-3001}"
}

# Bring up PostgreSQL/Adminer/LocalStack via infra/start.sh when not running.
ensure_infra() {
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^sekar-postgres$'; then
    print_success "Infrastructure already running (sekar-postgres up)"
  else
    print_info "Starting infrastructure (PostgreSQL, Adminer, LocalStack)..."
    "$ROOT/infra/start.sh"
  fi
}

# wait_for_http URL TIMEOUT_S LABEL — poll until 2xx/3xx or timeout.
wait_for_http() {
  local url="$1" timeout="${2:-60}" label="${3:-$1}" waited=0
  until curl -sf -o /dev/null --max-time 2 "$url"; do
    waited=$((waited + 2))
    if [ "$waited" -ge "$timeout" ]; then
      print_error "$label did not respond within ${timeout}s ($url)"
      return 1
    fi
    sleep 2
  done
  print_success "$label is up ($url)"
}

# start_bg NAME DIR CMD... — start a background service with PID file + log.
# setsid gives the service its own process group (PGID = PID) so stop_pid can
# kill the whole tree — npm wrappers like `nest start --watch` spawn child
# node processes that would otherwise survive as orphans holding the port.
start_bg() {
  local name="$1" dir="$2"
  shift 2
  local pid_file="$LOG_DIR/$name.pid"
  if [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
    print_warning "$name already running (PID $(cat "$pid_file")) — skipping"
    return 0
  fi
  ( cd "$dir" && nohup setsid "$@" >"$LOG_DIR/$name.log" 2>&1 & echo $! >"$pid_file" )
  print_success "$name started (PID $(cat "$pid_file"), log: logs/$name.log)"
}

# stop_pid NAME [FALLBACK_PKILL_PATTERN] — kill the PID-file process GROUP;
# fall back to pkill when the PID file is stale or missing.
stop_pid() {
  local name="$1" pattern="${2:-}"
  local pid_file="$LOG_DIR/$name.pid"
  local stopped=false
  if [ -f "$pid_file" ]; then
    local pid
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" 2>/dev/null; then
      kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
      sleep 1
      kill -KILL -- "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
      print_success "$name stopped (PGID $pid)"
      stopped=true
    fi
    rm -f "$pid_file"
  fi
  # Sweep leftovers (foreground starts, stale PID files, pre-setsid orphans).
  if [ -n "$pattern" ] && pgrep -f "$pattern" >/dev/null 2>&1; then
    pkill -TERM -f "$pattern" 2>/dev/null || true
    sleep 1
    pkill -KILL -f "$pattern" 2>/dev/null || true
    print_success "$name leftovers stopped (matched by pattern)"
    stopped=true
  fi
  [ "$stopped" = false ] && print_info "$name not running"
  return 0
}
