#!/usr/bin/env bash
# Dev helper: simulate a worker's mobile clock-in + GPS ping so they appear on
# the web /monitoring map WITHOUT a physical device. The worker must already
# have an ACTIVE SCHEDULE (the clock-in auto-detects the area from it).
#
# Usage:   ./scripts/dev-simulate-worker.sh <username> [password] [lat] [lng]
# Example: ./scripts/dev-simulate-worker.sh satgas_baru 12345678
#
# If lat/lng are omitted, it uses the schedule's area centre (so is_within_area=true).
set -euo pipefail

API="${API:-http://localhost:3000/api/v1}"
USERNAME="${1:?usage: dev-simulate-worker.sh <username> [password] [lat] [lng]}"
PASSWORD="${2:-12345678}"
LAT_OVERRIDE="${3:-}"
LNG_OVERRIDE="${4:-}"

j() { python3 -c "import sys,json;d=json.load(sys.stdin);print(eval('d'+'$1'))"; }

echo "→ login $USERNAME"
TOKEN=$(curl -sf -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"identifier\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" | j "['access_token']")

echo "→ read active schedule (/schedules/my)"
SCHED=$(curl -sf "$API/schedules/my" -H "Authorization: Bearer $TOKEN")
if [ "$SCHED" = "null" ] || [ -z "$SCHED" ]; then
  echo "✗ No active schedule for $USERNAME — assign an area + create a schedule first."
  exit 1
fi
AREA=$(echo "$SCHED" | j "['area']['name']")
LAT="${LAT_OVERRIDE:-$(echo "$SCHED" | j "['area'].get('gps_lat') or -7.2905")}"
LNG="${LNG_OVERRIDE:-$(echo "$SCHED" | j "['area'].get('gps_lng') or 112.7398")}"
echo "  area=$AREA  gps=($LAT,$LNG)"

echo "→ clock in"
SHIFTID=$(curl -sf -X POST "$API/shifts/clock-in" -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d "{\"gps_lat\":$LAT,\"gps_lng\":$LNG}" | j "['id']")
echo "  shift=$SHIFTID"

echo "→ send GPS ping"
NOW=$(date -u +%FT%TZ)
curl -sf -X POST "$API/location/batch" -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"shift_id\":\"$SHIFTID\",\"locations\":[{\"gps_lat\":$LAT,\"gps_lng\":$LNG,\"accuracy_meters\":8,\"battery_level\":90,\"logged_at\":\"$NOW\"}]}" \
  -o /dev/null -w "  batch HTTP %{http_code}\n"

echo "✓ $USERNAME is now ACTIVE on /monitoring (area: $AREA). Open the dashboard to see the pin."
