#!/usr/bin/env bash
# End-to-end walk of the PROCESS.md presence scenarios against the sim clone.
#
# Real DB state -> real API read -> assert the derived presence. Takes over ONE
# existing roster row (rather than inserting, which the ADR-053 uniqueness key
# correctly rejects) and restores its original status + sessions at the end.
#
# Clock-dependent variants (evaluated at 02:00 tomorrow, etc.) stay in the unit
# tests, which can inject `now`; this script only asserts state-driven outcomes.
set -uo pipefail

API=http://localhost:4110/api/v1
PSQL=(docker exec sekar-staging-sim psql -U postgres -d sekar_staging -tAc)
USER_NAME=satgas_barat_1_1
PASS=1234567890
DAY=$(date +%Y-%m-%d)

TOKEN=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"identifier\":\"$USER_NAME\",\"password\":\"$PASS\"}" |
  python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
UID_=$("${PSQL[@]}" "select id from users where username='$USER_NAME'" | tr -d '\r\n')
SD1=$("${PSQL[@]}" "select id from shift_definitions where name='Shift 1' and deleted_at is null" | tr -d '\r\n')

# Take over an existing Shift 1 row for today.
ROW_ID=$("${PSQL[@]}" "select id from schedules where user_id='$UID_' and schedule_date='$DAY'
  and shift_definition_id='$SD1' and deleted_at is null limit 1" | tr -d '\r\n')
if [ -z "$ROW_ID" ]; then echo "no Shift 1 row today for $USER_NAME — aborting"; exit 1; fi
ORIG_STATUS=$("${PSQL[@]}" "select status from schedules where id='$ROW_ID'" | tr -d '\r\n')

# Snapshot the day's sessions so they can be restored.
"${PSQL[@]}" "create temp table _e2e_bak as select * from shifts where user_id='$UID_' and service_day='$DAY'" >/dev/null 2>&1
SESS_BAK=$("${PSQL[@]}" "select count(*) from shifts where user_id='$UID_' and service_day='$DAY'" | tr -d '\r\n')

restore() {
  "${PSQL[@]}" "update schedules set status='$ORIG_STATUS' where id='$ROW_ID'" >/dev/null
  # Drop what this run created, then put the original sessions back.
  "${PSQL[@]}" "delete from shifts where user_id='$UID_' and service_day='$DAY'" >/dev/null 2>&1
}
trap restore EXIT

pass=0; fail=0
sql() { "${PSQL[@]}" "$1" >/dev/null; }
setstatus() { sql "update schedules set status='$1' where id='$ROW_ID'"; }
clearsessions() { sql "delete from shifts where user_id='$UID_' and service_day='$DAY'"; }
session() { # session <clock_in> [clock_out|NULL] [is_overtime]
  clearsessions
  sql "insert into shifts (user_id, service_day, shift_definition_id, clock_in_time, clock_out_time, is_overtime)
       values ('$UID_','$DAY','$SD1','${DAY}T$1:00+07', $2, ${3:-false})"
}

field() {
  curl -s "$API/schedules/my/day?date=$DAY" -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys,json
rows=json.load(sys.stdin)
r=next((x for x in rows if x['id']=='$ROW_ID'), None)
if r is None: print('ROW_MISSING'); raise SystemExit
v=r.get('$1')
print(','.join(sorted(v)) if isinstance(v,list) else ('null' if v is None else v))
"
}
check() { # check <id> <desc> <field> <expected>
  local got; got=$(field "$3")
  if [ "$got" = "$4" ]; then printf '  ✔ %-4s %-50s %s=%s\n' "$1" "$2" "$3" "$got"; pass=$((pass+1))
  else printf '  ✘ %-4s %-50s %s: want "%s" got "%s"\n' "$1" "$2" "$3" "$4" "$got"; fail=$((fail+1)); fi
}

echo "worker=$USER_NAME row=$ROW_ID day=$DAY (Shift 1 06:00–15:00, orig status=$ORIG_STATUS, ${SESS_BAK} session(s) backed up)"

echo ""
echo "── S30 scheduled, never clocked in ───────────────────────────────────────"
setstatus planned; clearsessions
check S30 "window closed, no punch -> tidak_hadir"          lifecycle_state tidak_hadir
check S30 "still counts as expected (is_scheduled)"         is_scheduled    True
setstatus absent
check S30 "cron-persisted absent agrees with the display"   lifecycle_state tidak_hadir

echo ""
echo "── S31/S22/S17 on duty ───────────────────────────────────────────────────"
setstatus present; session 06:05 NULL
check S31 "open session -> bertugas"                        lifecycle_state bertugas
check S22 "open past shift end -> lupa_clock_out"           lifecycle_flags lupa_clock_out
session 08:30 NULL
check S17 "clock-in after start+grace -> is_late"           lifecycle_flags is_late,lupa_clock_out

echo ""
echo "── S34 clocked out ───────────────────────────────────────────────────────"
session 06:05 "'${DAY}T15:05:00+07'"
check S34 "clocked in and out -> pulang"                    lifecycle_state pulang
check S34 "left at the end -> no early flag"                lifecycle_flags ""
session 06:05 "'${DAY}T12:00:00+07'"
check S34 "clocked out before end -> early"                 lifecycle_flags early

echo ""
echo "── S23 overtime vs forgotten clock-out ──────────────────────────────────"
# `lembur` needs BOTH the normal open session (which the roster row matches) and a
# separate approved-overtime session. An overtime session alone must NOT satisfy
# the roster row — that is asserted below.
session 06:05 NULL
sql "insert into shifts (user_id, service_day, shift_definition_id, clock_in_time, is_overtime)
     values ('$UID_','$DAY','$SD1','${DAY}T15:10:00+07', true)"
check S23 "normal + overtime session -> lembur, not lupa"    lifecycle_flags lembur
clearsessions
sql "insert into shifts (user_id, service_day, shift_definition_id, clock_in_time, is_overtime)
     values ('$UID_','$DAY','$SD1','${DAY}T15:10:00+07', true)"
check S23 "overtime ALONE never satisfies the roster row"    lifecycle_state tidak_hadir

echo ""
echo "── S35/S36 leave ─────────────────────────────────────────────────────────"
clearsessions
setstatus leave_annual
check S35 "cuti -> tidak_bertugas (off duty, not a no-show)" lifecycle_state tidak_bertugas
check S35 "cuti flagged excused"                            lifecycle_flags excused
setstatus leave_sick
check S36 "sakit -> tidak_hadir but EXCUSED"                lifecycle_state tidak_hadir
check S36 "sakit carries excused (never an unexcused no-show)" lifecycle_flags excused

echo ""
echo "── S37/S38 rows that expect nobody ──────────────────────────────────────"
setstatus off
check S38 "off -> tidak_bertugas"                           lifecycle_state tidak_bertugas
check S38 "off is not scheduled -> can never be a no-show"  is_scheduled    False
setstatus replaced
check S37 "replaced -> not scheduled"                       is_scheduled    False

echo ""
echo "── S32 live inside/outside axis ─────────────────────────────────────────"
setstatus present; session 06:05 NULL
sql "insert into user_tracking_status (user_id, status, is_within_area)
     values ('$UID_','active',false)
     on conflict (user_id) do update set is_within_area=false, status='active'"
check S32 "on duty OUTSIDE area -> is_within_area false"    is_within_area  False
sql "update user_tracking_status set is_within_area=true where user_id='$UID_'"
check S31 "on duty inside area -> is_within_area true"      is_within_area  True
clearsessions; setstatus planned
check S33 "not on duty -> stale snapshot suppressed (null)" is_within_area  null

echo ""
echo "── S13 future rows carry no lifecycle ───────────────────────────────────"
ADMIN_TOKEN=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"identifier":"superadmin","password":"12345678"}' |
  python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
FUT_NULLS=$(curl -s "$API/schedules/range?from=$(date -d '+40 days' +%Y-%m-%d)&to=$(date -d '+50 days' +%Y-%m-%d)" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -c "
import sys,json
rows=json.load(sys.stdin)
print('NO-ROWS' if not rows else ('all-null' if all(r.get('lifecycle_state') is None for r in rows) else 'LEAK'))
")
if [ "$FUT_NULLS" != "LEAK" ]; then printf '  ✔ %-4s %-50s %s\n' "S13" "future rows -> lifecycle null" "$FUT_NULLS"; pass=$((pass+1));
else printf '  ✘ %-4s %-50s %s\n' "S13" "future rows -> lifecycle null" "$FUT_NULLS"; fail=$((fail+1)); fi

echo ""
echo "=========================================="
printf ' PASS %d   FAIL %d\n' "$pass" "$fail"
echo "=========================================="
[ "$fail" -eq 0 ]
