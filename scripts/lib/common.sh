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
#   backend → apps/be/.env.local      PORT        (default 3000)
#   web     → apps/web/.env.local     WEB_PORT    (default 3001)
#   mobile  → apps/mobile/.env.local  METRO_PORT  (default 8081)
# WEB_PORT/METRO_PORT are exported because `next dev`/`react-native start`
# read the shell, not .env.local. Real exported vars (e.g. from CI) win over
# the files.
env_file_value() { # FILE KEY — last uncommented KEY= value, empty if absent
  [ -f "$1" ] || return 0
  grep -E "^$2=" "$1" | tail -1 | cut -d= -f2 | tr -d '[:space:]' | tr -d '"'
}

load_ports() {
  # Backend precedence: $BE_PORT → $PORT → apps/be/.env.local PORT → 3000. PORT is
  # re-exported to match so the Nest process (which reads PORT, and where a
  # real env var beats apps/be/.env.local) always binds the port we wait on.
  if [ -z "${BE_PORT:-}" ]; then
    BE_PORT="${PORT:-$(env_file_value "$ROOT/apps/be/.env.local" PORT)}"
  fi
  export BE_PORT="${BE_PORT:-3000}"
  export PORT="$BE_PORT"
  # Web precedence: $WEB_PORT → apps/web/.env.local WEB_PORT → 3001.
  if [ -z "${WEB_PORT:-}" ]; then
    WEB_PORT="$(env_file_value "$ROOT/apps/web/.env.local" WEB_PORT)"
  fi
  export WEB_PORT="${WEB_PORT:-3001}"
  # Metro precedence: $METRO_PORT → apps/mobile/.env.local METRO_PORT → 8081.
  if [ -z "${METRO_PORT:-}" ]; then
    METRO_PORT="$(env_file_value "$ROOT/apps/mobile/.env.local" METRO_PORT)"
  fi
  export METRO_PORT="${METRO_PORT:-8081}"
}

# free_port PORT [LABEL] — kill whatever is LISTENing on a TCP port so a fresh
# service can bind it (avoids "EADDRINUSE" from a leftover dev process). Only
# targets listeners, never client connections. No-op when the port is free or
# lsof/fuser are unavailable.
free_port() {
  local port="$1" label="${2:-port $1}" pids=""
  [ -n "$port" ] || return 0
  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -ti tcp:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  elif command -v fuser >/dev/null 2>&1; then
    pids="$(fuser "$port"/tcp 2>/dev/null | tr -s ' ' '\n' | grep -E '^[0-9]+$' || true)"
  fi
  if [ -n "$pids" ]; then
    print_warning "Freeing $label (:$port) — killing PID(s): $(echo "$pids" | tr '\n' ' ')"
    kill -9 $pids 2>/dev/null || true
    sleep 0.3
  fi
}

# set_env_key FILE KEY VALUE — set KEY=VALUE in an env file (replace or append).
set_env_key() {
  local file="$1" key="$2" val="$3"
  if grep -qE "^$key=" "$file"; then
    sed -i.bak "s|^$key=.*|$key=$val|" "$file" && rm -f "$file.bak"
  else
    printf '\n%s=%s\n' "$key" "$val" >> "$file"
  fi
}

# Keep backend ports aligned with the infra host ports. infra/.env may pin
# non-default ports (e.g. Postgres 15432 / MinIO 19000 to dodge clashes with
# other projects on 5432 / 9000); without this a fresh apps/be/.env.local (defaults
# 5432 / 9000) silently targets the wrong services and boot/migrations fail.
sync_backend_infra_ports() {
  local infra_env="$ROOT/infra/.env" be_env="$ROOT/apps/be/.env.local"
  [ -f "$infra_env" ] && [ -f "$be_env" ] || return 0
  # Postgres → DATABASE_PORT
  local pg_port; pg_port="$(env_file_value "$infra_env" POSTGRES_PORT)"
  if [ -n "$pg_port" ] && [ "$(env_file_value "$be_env" DATABASE_PORT)" != "$pg_port" ]; then
    set_env_key "$be_env" DATABASE_PORT "$pg_port"
    print_success "Synced apps/be/.env.local DATABASE_PORT → $pg_port (from infra/.env)"
  fi
  # MinIO → AWS_ENDPOINT_URL host port (only when a custom endpoint is configured)
  local minio_port cur_ep; minio_port="$(env_file_value "$infra_env" MINIO_PORT)"
  cur_ep="$(env_file_value "$be_env" AWS_ENDPOINT_URL)"
  if [ -n "$minio_port" ] && [ -n "$cur_ep" ] && ! printf '%s' "$cur_ep" | grep -q ":$minio_port\$"; then
    set_env_key "$be_env" AWS_ENDPOINT_URL "http://localhost:$minio_port"
    print_success "Synced apps/be/.env.local AWS_ENDPOINT_URL → http://localhost:$minio_port (from infra/.env)"
  fi
  # Redis → REDIS_URL host port
  local redis_port cur_redis; redis_port="$(env_file_value "$infra_env" REDIS_PORT)"
  cur_redis="$(env_file_value "$be_env" REDIS_URL)"
  if [ -n "$redis_port" ] && [ -n "$cur_redis" ] && ! printf '%s' "$cur_redis" | grep -q ":$redis_port\$"; then
    set_env_key "$be_env" REDIS_URL "redis://localhost:$redis_port"
    print_success "Synced apps/be/.env.local REDIS_URL → redis://localhost:$redis_port (from infra/.env)"
  fi
}

# wait_for_container_healthy NAME TIMEOUT_S LABEL — poll a container's Docker
# healthcheck until "healthy" or timeout.
wait_for_container_healthy() {
  local name="$1" timeout="${2:-60}" label="${3:-$1}" waited=0
  until [ "$(docker inspect -f '{{.State.Health.Status}}' "$name" 2>/dev/null)" = "healthy" ]; do
    waited=$((waited + 3))
    if [ "$waited" -ge "$timeout" ]; then
      print_error "$label did not become healthy within ${timeout}s"
      return 1
    fi
    sleep 3
  done
  print_success "$label is healthy"
}

# Bring up PostgreSQL/Adminer/MinIO/Redis via scripts/infra.sh when not running.
ensure_infra() {
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^sekar-postgres$'; then
    print_success "Infrastructure already running (sekar-postgres up)"
  else
    "$ROOT/scripts/infra.sh" start
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

# ── LAN exposure helpers (phone / other devices on the Wi-Fi) ────────────────
# The web is served on the LAN via a same-origin proxy: the browser talks to
# whatever origin served the page, and the web dev server proxies /api +
# /socket.io to the backend (next.config rewrites, gated by SEKAR_LAN_PROXY).
# One build works on localhost AND any LAN host — no baked IP, no CORS. The
# backend itself never needs LAN exposure; only the web port is reachable.

is_wsl() { grep -qiE "microsoft|wsl" /proc/version 2>/dev/null; }

# resolve_adb — best-effort add the Android platform-tools dir to PATH so `adb`
# is callable from non-interactive scripts (which don't source ~/.bashrc). Returns
# 0 if adb is available afterwards, 1 otherwise.
resolve_adb() {
  command_exists adb && return 0
  local candidate
  for candidate in "${ANDROID_HOME:-}/platform-tools" "${ANDROID_SDK_ROOT:-}/platform-tools" "$HOME/Android/Sdk/platform-tools"; do
    if [ -n "$candidate" ] && [ -x "$candidate/adb" ]; then
      export PATH="$candidate:$PATH"; break
    fi
  done
  command_exists adb
}

# detect_lan_ip — the address a phone connects to. Under WSL that's the Windows
# host's LAN IP; natively it's this machine's. Skips loopback + the WSL/Docker
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

# setup_web_lan_env [IP] — export the env the web child needs for LAN access and
# set the LAN_IP global. Requires load_ports first (uses BE_PORT). These override
# apps/web/.env.local for the child only (Next + dotenvx leave already-set env
# vars untouched); .env.local is unchanged. `next dev` already binds 0.0.0.0 by
# default, so no -H flag is needed.
setup_web_lan_env() {
  LAN_IP="${1:-$(detect_lan_ip)}"
  # Empty API/WS URL = same origin (browser → whichever origin served the page).
  export NEXT_PUBLIC_API_URL=""
  export NEXT_PUBLIC_WS_URL=""
  # Proxy /api + /socket.io to the backend (next.config rewrites, gated here).
  export SEKAR_LAN_PROXY=1
  export SEKAR_API_PORT="$BE_PORT"
  # Next 16 blocks cross-origin dev resources (/_next/*); allow the LAN host so a
  # phone can load the JS bundle. Harmless on localhost (always allowed).
  [ -n "$LAN_IP" ] && export SEKAR_ALLOWED_DEV_ORIGINS="$LAN_IP"
}

# wsl_portproxy_hint PORT LABEL — print + record the one-time Windows
# port-forward/firewall needed to reach a WSL2 dev PORT from the LAN (a phone
# can't reach the WSL IP directly). No-op off WSL. Idempotent: appends each
# distinct port to logs/windows-lan-setup.ps1 at most once.
wsl_portproxy_hint() {
  local port="$1" label="${2:-service}" wsl_ip f="$LOG_DIR/windows-lan-setup.ps1"
  is_wsl || return 0
  wsl_ip="$(ip -4 addr show eth0 2>/dev/null | grep -oP 'inet \K[0-9.]+' | head -1 || true)"
  [ -n "$wsl_ip" ] || return 0
  if [ ! -f "$f" ]; then
    cat >"$f" <<'PS'
# SEKAR — expose WSL2 dev port(s) on the Windows LAN so your phone can reach them.
# Run ONCE in an ELEVATED PowerShell (right-click > Run as administrator).
# Re-run only if the WSL IP changes (after a full WSL/PC restart).
# To UNDO a port: netsh interface portproxy delete v4tov4 listenport=<PORT> listenaddress=0.0.0.0 ; Remove-NetFirewallRule -DisplayName "SEKAR LAN (<PORT>)"
PS
  fi
  if ! grep -q "listenport=$port " "$f" 2>/dev/null; then
    cat >>"$f" <<PS
# $label (:$port) → WSL $wsl_ip
netsh interface portproxy add v4tov4 listenport=$port listenaddress=0.0.0.0 connectport=$port connectaddress=$wsl_ip
New-NetFirewallRule -DisplayName "SEKAR LAN ($port)" -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port -ErrorAction SilentlyContinue
PS
  fi
  print_warning "WSL2 — the phone can't reach WSL ($wsl_ip) directly. If it can't connect to :$port ($label), run ONCE in an elevated PowerShell (saved to logs/windows-lan-setup.ps1):"
  echo -e "    ${GREEN}netsh interface portproxy add v4tov4 listenport=$port listenaddress=0.0.0.0 connectport=$port connectaddress=$wsl_ip${NC}"
  echo -e "    ${GREEN}New-NetFirewallRule -DisplayName \"SEKAR LAN ($port)\" -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port${NC}"
}

# adb_server_is_windows — true when `adb` is (or wraps) a Windows adb.exe. This
# matters a lot on WSL2: `adb reverse` tunnels the device port to the machine
# running the ADB SERVER. With a Windows adb.exe that machine is WINDOWS, not
# WSL, so `adb reverse tcp:8081 tcp:$METRO_PORT` lands on Windows' localhost —
# where our dev servers are NOT listening. Each WSL port then needs a Windows
# portproxy (see wsl_portproxy_ensure).
adb_server_is_windows() {
  is_wsl || return 1
  local p
  p="$(command -v adb 2>/dev/null)" || return 1
  # Direct .exe on PATH, a /mnt/c path, or a shell wrapper that execs adb.exe.
  case "$p" in *.exe|/mnt/[a-z]/*) return 0 ;; esac
  head -c 400 "$p" 2>/dev/null | grep -qiE "adb\.exe|/mnt/[a-z]/" && return 0
  return 1
}

# wsl_portproxy_ensure PORT... — make sure Windows forwards each PORT to the
# CURRENT WSL IP, so `adb reverse` (which resolves on Windows) reaches our WSL
# dev servers. Fully env-driven: callers pass $METRO_PORT/$BE_PORT, nothing is
# hardcoded. Idempotent — only touches ports that are missing or STALE (pointing
# at an old WSL IP, which happens on every WSL/PC restart). Batches all fixes
# into ONE elevated PowerShell call (a single UAC prompt). No-op unless the ADB
# server is on Windows.
wsl_portproxy_ensure() {
  adb_server_is_windows || return 0
  local wsl_ip table cmds="" need=() port existing
  wsl_ip="$(ip -4 addr show eth0 2>/dev/null | grep -oP 'inet \K[0-9.]+' | head -1 || true)"
  [ -n "$wsl_ip" ] || { print_warning "WSL IP not detected — skipping Windows port-forward check."; return 0; }

  table="$(powershell.exe -NoProfile -Command "netsh interface portproxy show v4tov4" 2>/dev/null | tr -d '\r' || true)"

  for port in "$@"; do
    [ -n "$port" ] || continue
    # Correct iff some entry for this listenport already points at the current WSL IP.
    existing="$(awk -v p="$port" '$2==p {print $3}' <<<"$table" | grep -Fx "$wsl_ip" | head -1 || true)"
    [ -n "$existing" ] && continue
    need+=("$port")
    # Drop any stale entry for this port on either common listen address first.
    cmds+="netsh interface portproxy delete v4tov4 listenport=$port listenaddress=127.0.0.1 2>\$null; "
    cmds+="netsh interface portproxy delete v4tov4 listenport=$port listenaddress=0.0.0.0 2>\$null; "
    cmds+="netsh interface portproxy add v4tov4 listenport=$port listenaddress=127.0.0.1 connectport=$port connectaddress=$wsl_ip; "
  done

  if [ ${#need[@]} -eq 0 ]; then
    print_success "Windows port-forwards OK for: $* → WSL $wsl_ip"
    return 0
  fi

  print_warning "WSL2 + Windows adb: ports ${need[*]} are not forwarded to this WSL IP ($wsl_ip) — the app can't reach them. Requesting elevation to fix (accept the UAC prompt)..."
  powershell.exe -NoProfile -Command \
    "Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile','-Command','$cmds'" >/dev/null 2>&1 || true

  # Re-read and report honestly rather than assuming the elevation succeeded.
  table="$(powershell.exe -NoProfile -Command "netsh interface portproxy show v4tov4" 2>/dev/null | tr -d '\r' || true)"
  local still=()
  for port in "${need[@]}"; do
    awk -v p="$port" '$2==p {print $3}' <<<"$table" | grep -qFx "$wsl_ip" || still+=("$port")
  done
  if [ ${#still[@]} -eq 0 ]; then
    print_success "Windows port-forwards added: ${need[*]} → WSL $wsl_ip"
  else
    print_error "Still not forwarded: ${still[*]}. Run ONCE in an ELEVATED PowerShell:"
    for port in "${still[@]}"; do
      echo -e "    ${GREEN}netsh interface portproxy add v4tov4 listenport=$port listenaddress=127.0.0.1 connectport=$port connectaddress=$wsl_ip${NC}"
    done
  fi
}

# print_web_lan_help — phone URL + WSL2 port-forward help for the WEB port.
# Uses the LAN_IP + WEB_PORT globals.
print_web_lan_help() {
  if [ -z "${LAN_IP:-}" ]; then
    print_info "LAN: web bound to 0.0.0.0 (no LAN IP auto-detected; pass one to advertise it, or --local to disable)"
    return 0
  fi
  print_info "LAN: also reachable at http://$LAN_IP:$WEB_PORT (same-origin proxy; localhost unaffected)"
  echo -e "${BLUE}On your phone (same Wi-Fi), open:${NC}  ${GREEN}http://$LAN_IP:$WEB_PORT${NC}"
  wsl_portproxy_hint "$WEB_PORT" "web"
}

# print_be_lan_help [IP] — advertise the backend API directly on the LAN for the
# NATIVE mobile app (which calls the API directly, NOT via the web proxy). Sets
# LAN_IP. The NestJS server already binds 0.0.0.0; on WSL2 a port-forward is needed.
print_be_lan_help() {
  LAN_IP="${1:-$(detect_lan_ip)}"
  if [ -z "$LAN_IP" ]; then
    print_info "LAN: backend on 0.0.0.0 (no LAN IP auto-detected; pass one to advertise it)"
    return 0
  fi
  print_info "LAN: backend API reachable at http://$LAN_IP:$BE_PORT (for the native mobile app)"
  echo -e "${BLUE}On your phone's SEKAR app, set the API base URL to:${NC}  ${GREEN}http://$LAN_IP:$BE_PORT${NC}"
  echo -e "  (Android emulator uses ${GREEN}http://10.0.2.2:$BE_PORT${NC}; a real device uses the LAN IP above.)"
  wsl_portproxy_hint "$BE_PORT" "backend API"
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
