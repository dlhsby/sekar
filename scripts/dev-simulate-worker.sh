#!/usr/bin/env bash
# Dev helper: simulate a worker's mobile clock-in + GPS track so they appear on
# the web /monitoring map WITHOUT a physical device. The worker must already
# have a schedule for the service day (clock-in reads the location from it).
#
# Usage:   ./scripts/dev-simulate-worker.sh <username> [password] [lat] [lng]
# Example: ./scripts/dev-simulate-worker.sh abd_qodir 12345678
#
# Several workers at once:
#   for u in abd_qodir abd_haris abd_malik; do ./scripts/dev-simulate-worker.sh "$u"; done
#
# If lat/lng are omitted it uses the scheduled location's centre, so the punch
# lands inside the boundary (clock_in_outside_boundary=false).
#
# Env:
#   API       full API base (default: http://localhost:<PORT from apps/be/.env.local>/api/v1)
#   PINGS     number of GPS pings to emit (default 5)
#   STEP_M    metres between consecutive pings (default 40)
#   INTERVAL  seconds between consecutive pings (default 60)
#
# STEP_M must stay ABOVE the server's stationary-thinning floor (25 m,
# DEFAULT_THINNING.minMoveMeters in location-thinning.util.ts) or the backend
# refuses the pings as redundant and the pin never moves. The script prints the
# accepted/rejected split the API returns so a bad choice is visible.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Port comes from the backend's own env file — this repo runs the BE on 4110
# locally, not the 3000 default, and hardcoding either one breaks the other.
default_port() {
  local env_file="$REPO_ROOT/apps/be/.env.local"
  [ -f "$env_file" ] && sed -n 's/^PORT=\([0-9]\+\).*/\1/p' "$env_file" | head -1
}
PORT="$(default_port)"
API="${API:-http://localhost:${PORT:-3000}/api/v1}"

USERNAME="${1:?usage: dev-simulate-worker.sh <username> [password] [lat] [lng]}"
PASSWORD="${2:-12345678}"
LAT_OVERRIDE="${3:-}"
LNG_OVERRIDE="${4:-}"
PINGS="${PINGS:-5}"
STEP_M="${STEP_M:-40}"
INTERVAL="${INTERVAL:-60}"

die() { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# Reads a value out of a JSON document on stdin. `path` is a python expression
# applied to the parsed body (e.g. "['access_token']"); a missing key prints
# nothing rather than a traceback, so callers can test for empty.
j() {
  python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    v = eval('d' + '''$1''')
except Exception:
    sys.exit(0)
print('' if v is None else v)
"
}

echo "→ API $API"
echo "→ login $USERNAME"
LOGIN=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"identifier\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")
TOKEN=$(echo "$LOGIN" | j "['access_token']")
[ -n "$TOKEN" ] || die "login failed: $(echo "$LOGIN" | head -c 200)"

# /schedules/my/day returns the caller's roster rows for the current WIB service
# day as an ARRAY (the old singular /schedules/my is gone, and the pre-rename
# 'area' key is now 'location').
echo "→ read today's roster (/schedules/my/day)"
SCHED=$(curl -s "$API/schedules/my/day" -H "Authorization: Bearer $TOKEN")
PLACE=$(echo "$SCHED" | j "[0]['location']['name']")
[ -n "$PLACE" ] || die "no schedule today for $USERNAME — assign a location + schedule first. Response: $(echo "$SCHED" | head -c 200)"

LAT="${LAT_OVERRIDE:-$(echo "$SCHED" | j "[0]['location'].get('gps_lat') or -7.2905")}"
LNG="${LNG_OVERRIDE:-$(echo "$SCHED" | j "[0]['location'].get('gps_lng') or 112.7398")}"
echo "  lokasi=$PLACE  gps=($LAT,$LNG)"

# Clock in, or adopt the shift that is already open. Re-running the script for a
# worker who never clocked out is the normal case when staging a demo, and a
# hard failure there would be pure friction.
echo "→ clock in"
CLOCKIN=$(curl -s -X POST "$API/shifts/clock-in" -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"gps_lat\":$LAT,\"gps_lng\":$LNG,\"accuracy_m\":8,\"is_mocked\":false}")
SHIFTID=$(echo "$CLOCKIN" | j "['id']")
if [ -z "$SHIFTID" ]; then
  echo "  clock-in refused ($(echo "$CLOCKIN" | j "['message']")) — reusing the open shift"
  SHIFTID=$(curl -s "$API/shifts/current" -H "Authorization: Bearer $TOKEN" | j "['id']")
  [ -n "$SHIFTID" ] || die "no open shift and clock-in failed: $(echo "$CLOCKIN" | head -c 300)"
fi
OUTSIDE=$(echo "$CLOCKIN" | j "['clock_in_outside_boundary']")
echo "  shift=$SHIFTID${OUTSIDE:+  outside_boundary=$OUTSIDE}"

# Walk east from the start point, one STEP_M hop per ping. The last ping is
# stamped NOW: presence is derived from the age of the newest ping, so a track
# that ends in the past would render the worker OFFLINE the moment it lands.
echo "→ send $PINGS pings ($STEP_M m apart, ${INTERVAL}s apart)"
LOCATIONS=$(python3 - "$LAT" "$LNG" "$PINGS" "$STEP_M" "$INTERVAL" <<'PY'
import json, math, sys
from datetime import datetime, timedelta, timezone

lat, lng = float(sys.argv[1]), float(sys.argv[2])
pings, step_m, interval = int(sys.argv[3]), float(sys.argv[4]), int(sys.argv[5])

# Metres per degree of longitude shrinks with latitude; at Surabaya (~7.3°S) the
# error from ignoring it is ~1%, which would silently eat into the 25 m floor.
deg_per_m_lng = 1.0 / (111_320.0 * math.cos(math.radians(lat)))
now = datetime.now(timezone.utc)

out = []
for i in range(pings):
    age = (pings - 1 - i) * interval
    out.append({
        "gps_lat": round(lat, 8),
        "gps_lng": round(lng + i * step_m * deg_per_m_lng, 8),
        "accuracy_meters": 8,
        "battery_level": max(20, 95 - i * 2),
        "logged_at": (now - timedelta(seconds=age)).isoformat().replace("+00:00", "Z"),
        "is_mocked": False,
    })
print(json.dumps(out))
PY
)

BATCH=$(curl -s -X POST "$API/location/batch" -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"shift_id\":\"$SHIFTID\",\"locations\":$LOCATIONS}")
ACCEPTED=$(echo "$BATCH" | j "['count']")
REJECTED=$(echo "$BATCH" | j "['rejected']")
[ -n "$ACCEPTED" ] || die "batch failed: $(echo "$BATCH" | head -c 300)"
echo "  sent=$PINGS accepted=$ACCEPTED rejected=${REJECTED:-0}"

# `rejected` counts integrity refusals only (mocked, null island, impossible
# travel). Stationary thinning drops pings SILENTLY — they are simply absent
# from `count` — so a too-small STEP_M shows up here and nowhere else.
THINNED=$(( PINGS - ACCEPTED - ${REJECTED:-0} ))
if [ "$THINNED" -gt 0 ]; then
  echo "  ! $THINNED ping(s) thinned as stationary — raise STEP_M above the 25 m floor"
fi
if [ "${REJECTED:-0}" != "0" ]; then
  echo "  ! ${REJECTED} ping(s) refused by the integrity gate — check the backend log"
fi

echo "✓ $USERNAME is ACTIVE on /monitoring (lokasi: $PLACE). Open the dashboard to see the pin."
