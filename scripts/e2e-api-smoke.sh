#!/usr/bin/env bash
#
# SEKAR API E2E smoke test — rerunnable, CI-usable.
#
# Exercises the post-UAT revamp surface (ADR-044…052) end-to-end against a
# RUNNING backend + seeded DB: auth for all 9 roles, RBAC gating, monitoring
# drill-down + roster shape, scheduling occurrences, scope-aware tasks,
# geography, activities/overtime/pruning, and per-role /me.
#
# Usage:
#   ./scripts/e2e-api-smoke.sh                 # against http://localhost:4110/api/v1
#   API_BASE=http://host:port/api/v1 ./scripts/e2e-api-smoke.sh
#   PASSWORD=12345678 ./scripts/e2e-api-smoke.sh
#
# Exit code: 0 = all checks passed, 1 = one or more failed (so CI can gate on it).
#
# Prereqs: backend up (./scripts/start-be.sh) + seeded (npm run db:seed), python3,
# and a login rate limit high enough for a full run — set the Settings key
# `ratelimit.login_per_min` (or env RATE_LIMIT_LOGIN_PER_MIN) accordingly; the
# local-dev template already sets 1000.
#
set -uo pipefail

API_BASE="${API_BASE:-http://localhost:4110/api/v1}"
PASSWORD="${PASSWORD:-12345678}"
TODAY="$(date +%F)"
pass=0; fail=0
declare -A TOK

c_grn=$'\e[32m'; c_red=$'\e[31m'; c_dim=$'\e[2m'; c_rst=$'\e[0m'
ok()   { pass=$((pass+1)); printf "  ${c_grn}✅${c_rst} %-44s ${c_dim}%s${c_rst}\n" "$1" "${2:-}"; }
bad()  { fail=$((fail+1)); printf "  ${c_red}❌ %-44s %s${c_rst}\n" "$1" "${2:-}"; }
hdr()  { printf "\n${c_dim}===== %s =====${c_rst}\n" "$1"; }

login() { # login <identifier> -> echoes access_token ("" on failure)
  curl -s -X POST "$API_BASE/auth/login" -H 'Content-Type: application/json' \
    -d "{\"identifier\":\"$1\",\"password\":\"$PASSWORD\"}" \
    | python3 -c 'import sys,json
try: print(json.load(sys.stdin).get("access_token",""))
except Exception: print("")' 2>/dev/null
}

# status <label> <expected> <method> <path> [token] [body]
status() {
  local label="$1" exp="$2" method="$3" path="$4" tk="${5:-}" body="${6:-}"
  local args=(-s -o /dev/null -w "%{http_code}" -X "$method" "$API_BASE$path")
  [ -n "$tk" ] && args+=(-H "Authorization: Bearer $tk")
  [ -n "$body" ] && args+=(-H 'Content-Type: application/json' -d "$body")
  local code; code=$(curl "${args[@]}")
  if [ "$code" = "$exp" ]; then ok "$label" "$code"; else bad "$label" "got $code want $exp"; fi
}

# json_has <label> <path> <token> <python-expr over var d>  (asserts truthy)
json_has() {
  local label="$1" path="$2" tk="$3" expr="$4"
  local resp; resp=$(curl -s "$API_BASE$path" -H "Authorization: Bearer $tk")
  local res; res=$(printf '%s' "$resp" | python3 -c "import sys,json
try:
    d=json.load(sys.stdin)
    print('OK' if ($expr) else 'NO')
except Exception as e:
    print('ERR:'+str(e)[:40])" 2>/dev/null)
  if [ "$res" = "OK" ]; then ok "$label"; else bad "$label" "assertion failed ($res)"; fi
}

# ---------------------------------------------------------------------------
hdr "AUTH — all 9 roles login"
ROLES=(satgas_pusat_1 linmas_pusat_1 korlap_pusat_1 admin_rayon_pusat_1
       kepala_rayon_pusat_1 management_1 admin_system_1 superadmin
       staff_kecamatan_bubutan_1)
for u in "${ROLES[@]}"; do
  t=$(login "$u"); TOK[$u]="$t"
  [ -n "$t" ] && ok "login $u" "toklen=${#t}" || bad "login $u" "no token"
done
status "reject wrong password" 401 POST /auth/login "" '{"identifier":"satgas_pusat_1","password":"__nope__"}'
# Phone login (identifier accepts username OR phone_number). Uses a stable seed phone.
PHONE_ID="${PHONE_ID:-081300000002}"  # satgas_pusat_1 in the demo seed
PT=$(login "$PHONE_ID"); [ -n "$PT" ] && ok "phone login $PHONE_ID" || bad "phone login $PHONE_ID" "no token"

AS=${TOK[admin_system_1]:-}; KR=${TOK[kepala_rayon_pusat_1]:-}
SAT=${TOK[satgas_pusat_1]:-}; SK=${TOK[staff_kecamatan_bubutan_1]:-}
KL=${TOK[korlap_pusat_1]:-}

hdr "MONITORING — drill-down + roster shape (ADR-050)"
status "city stats (admin)"        200 GET /monitoring/city "$AS"
status "live-users roster"         200 GET /monitoring/live-users "$AS"
status "boundaries (district)"     200 GET "/monitoring/boundaries?level=district" "$AS"
status "search q=taman"            200 GET "/monitoring/search?q=taman" "$AS"
status "satgas BLOCKED from city"  403 GET /monitoring/city "$SAT"
json_has "roster exposes on_leave_users[]" /monitoring/live-users "$AS" \
  "'on_leave_users' in d and isinstance(d['on_leave_users'], list)"
json_has "roster exposes absent_users[] w/ lifecycle_state" /monitoring/live-users "$AS" \
  "isinstance(d.get('absent_users'), list) and (len(d['absent_users'])==0 or 'lifecycle_state' in d['absent_users'][0])"

hdr "SCHEDULES — occurrence model (ADR-047/048)"
status "schedules today ($TODAY)"  200 GET "/schedules/date/$TODAY" "$AS"
status "schedule-events list"      200 GET /schedule-events "$AS"
status "my schedules (satgas)"     200 GET /schedules/my "$SAT"

hdr "TASKS — scope-aware (ADR-046)"
status "tasks list (admin)"        200 GET /tasks "$AS"
status "tasks list (korlap)"       200 GET /tasks "$KL"
json_has "tasks carry a scope field" /tasks "$AS" \
  "(lambda x: (x if isinstance(x,list) else x.get('data') or x.get('items') or []))(d) is not None and (len((d if isinstance(d,list) else d.get('data') or d.get('items') or []))==0 or 'scope' in (d if isinstance(d,list) else d.get('data') or d.get('items'))[0])"

hdr "GEOGRAPHY — city→district→region→location"
status "districts"                 200 GET /districts "$AS"
status "locations"                 200 GET /locations "$AS"

hdr "ACTIVITIES / OVERTIME / PRUNING"
status "activities list"           200 GET /activities "$AS"
status "overtime list"             200 GET /overtime "$AS"
status "pruning-requests (admin)"  200 GET /pruning-requests "$AS"
status "pruning mine=true (staff)" 200 GET "/pruning-requests?mine=true" "$SK"
# Regression: a non-UUID :id must be a clean 400, not a 500 (ParseUUIDPipe).
status "pruning non-uuid id → 400" 400 GET /pruning-requests/not-a-uuid "$SK"

hdr "RBAC — negative gates"
status "satgas BLOCKED create district" 403 POST /districts "$SAT" '{"name":"x"}'
status "staff_kec BLOCKED monitoring"    403 GET /monitoring/city "$SK"

hdr "ME / PROFILE — per role"
for u in satgas_pusat_1 korlap_pusat_1 kepala_rayon_pusat_1 management_1 staff_kecamatan_bubutan_1; do
  status "me $u" 200 GET /auth/me "${TOK[$u]:-}"
done

# ---------------------------------------------------------------------------
printf "\n${c_dim}==================================================${c_rst}\n"
if [ "$fail" -eq 0 ]; then
  printf "${c_grn}ALL PASSED — %d checks${c_rst}\n" "$pass"; exit 0
else
  printf "${c_red}FAILED — %d passed, %d failed${c_rst}\n" "$pass" "$fail"; exit 1
fi
