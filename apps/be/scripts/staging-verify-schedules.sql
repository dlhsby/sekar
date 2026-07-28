-- =============================================================================
-- staging-verify-schedules.sql — scheduling / attendance drift report
--
-- READ-ONLY. Safe to run against live staging as often as you like: no INSERT,
-- UPDATE, DELETE or DDL anywhere in this file. Run it BEFORE the migration
-- chain (section 5 is a hard pre-flight gate) and again afterwards as the
-- go/no-go check, then diff the two outputs.
--
--   psql "$DATABASE_URL" -f apps/be/scripts/staging-verify-schedules.sql
--   docker exec -i <pg> psql -U postgres -d sekar_staging \
--     -f /dev/stdin < apps/be/scripts/staging-verify-schedules.sql
--
-- Companion: staging-verify-multiplace.sql (ADR-053 place coverage).
-- =============================================================================

\pset pager off
\timing off

\echo ''
\echo '=============================================================='
\echo ' 1. Scale — is this the database you think it is?'
\echo '=============================================================='
SELECT 'schedules'         AS table, count(*) AS rows FROM schedules
UNION ALL SELECT 'schedule_events',   count(*) FROM schedule_events
UNION ALL SELECT 'shift_definitions', count(*) FROM shift_definitions
UNION ALL SELECT 'shifts (sessions)', count(*) FROM shifts
UNION ALL SELECT 'attendance_punches',count(*) FROM attendance_punches
ORDER BY 1;

\echo ''
\echo '=============================================================='
\echo ' 2. Recurrence mix — every standing assignment should be DAILY'
\echo '=============================================================='
-- A `none` event is a one-off. That is legitimate for a genuine one-day
-- substitute, but a STANDING assignment left as `none` silently stops producing
-- roster rows the day after its start_date. Section 4 finds the ones that hurt.
SELECT
  recurrence_type,
  count(*)                                        AS events,
  count(*) FILTER (WHERE end_date IS NULL)        AS open_ended,
  count(*) FILTER (WHERE end_date IS NOT NULL)    AS bounded,
  count(*) FILTER (WHERE is_team)                 AS team_events,
  count(*) FILTER (WHERE NOT is_active)           AS inactive,
  min(start_date)                                 AS earliest_start,
  max(start_date)                                 AS latest_start
FROM schedule_events
WHERE deleted_at IS NULL
GROUP BY recurrence_type
ORDER BY events DESC;

\echo ''
\echo '=============================================================='
\echo ' 3. Roster provenance — manual (legacy) vs event-generated'
\echo '=============================================================='
-- After the ADR-047 cutover, FUTURE rows should be 100% event-generated. A
-- manual future row is a row nothing will regenerate or keep in sync.
SELECT
  CASE WHEN schedule_date < CURRENT_DATE THEN 'past'
       WHEN schedule_date = CURRENT_DATE THEN 'today'
       ELSE 'future' END                                        AS period,
  count(*)                                                      AS rows,
  count(*) FILTER (WHERE schedule_event_id IS NULL)             AS manual_no_event,
  count(*) FILTER (WHERE schedule_event_id IS NOT NULL)         AS from_event,
  count(*) FILTER (WHERE is_detached)                           AS detached_overrides,
  min(schedule_date)                                            AS from_date,
  max(schedule_date)                                            AS to_date
FROM schedules
WHERE deleted_at IS NULL
GROUP BY 1
ORDER BY min(schedule_date);

\echo ''
\echo '-- Manual rows dated in the FUTURE (expect 0; each one is orphaned) ------'
SELECT s.schedule_date, u.username, u.role, sd.name AS shift
FROM schedules s
JOIN users u ON u.id = s.user_id
LEFT JOIN shift_definitions sd ON sd.id = s.shift_definition_id
WHERE s.deleted_at IS NULL
  AND s.schedule_event_id IS NULL
  AND s.schedule_date > CURRENT_DATE
ORDER BY s.schedule_date, u.username
LIMIT 50;

\echo ''
\echo '=============================================================='
\echo ' 4. Coverage gaps — who the converter would act on'
\echo '=============================================================='
\echo '-- 4a. Clockable workers with NO active schedule_event at all ----------'
-- These people are simply not scheduled. That may be correct (resigned, on
-- long leave, deliberately off-roster) — the Jadwal page surfaces them under
-- "Belum Dijadwalkan". Listed so a human decides, never auto-created.
SELECT u.username, u.role, u.district_id, sd.name AS standing_shift
FROM users u
LEFT JOIN shift_definitions sd ON sd.id = u.shift_definition_id
WHERE u.deleted_at IS NULL
  AND u.is_active
  AND u.role IN ('satgas', 'linmas')
  AND NOT EXISTS (
    SELECT 1 FROM schedule_events e
    WHERE e.user_id = u.id AND e.deleted_at IS NULL AND e.is_active
  )
ORDER BY u.role, u.username;

\echo ''
\echo '-- 4b. Same, as a count by role ---------------------------------------'
SELECT u.role, count(*) AS clockable_without_event
FROM users u
WHERE u.deleted_at IS NULL AND u.is_active
  AND u.role IN ('satgas', 'linmas')
  AND NOT EXISTS (
    SELECT 1 FROM schedule_events e
    WHERE e.user_id = u.id AND e.deleted_at IS NULL AND e.is_active
  )
GROUP BY u.role ORDER BY 1;

\echo ''
\echo '-- 4c. Active events producing NO future rows -------------------------'
-- An open-ended event with no rows ahead means the materializer has not run,
-- or the recurrence expands to nothing. Either way the roster is a lie.
SELECT e.recurrence_type, e.start_date, e.end_date, u.username, sd.name AS shift
FROM schedule_events e
LEFT JOIN users u ON u.id = e.user_id
LEFT JOIN shift_definitions sd ON sd.id = e.shift_definition_id
WHERE e.deleted_at IS NULL AND e.is_active
  AND (e.end_date IS NULL OR e.end_date >= CURRENT_DATE)
  AND NOT EXISTS (
    SELECT 1 FROM schedules s
    WHERE s.schedule_event_id = e.id AND s.deleted_at IS NULL
      AND s.schedule_date > CURRENT_DATE
  )
ORDER BY e.start_date
LIMIT 50;

\echo ''
\echo '=============================================================='
\echo ' 5. PRE-FLIGHT GATE — duplicate (user, date, shift, place)'
\echo '=============================================================='
-- Migration 17517 adds a partial UNIQUE index on
-- (user_id, schedule_date, shift_definition_id, COALESCE(location_id, region_id,
-- district_id)). Any row below ABORTS the migration chain mid-way. This must
-- return zero rows before you deploy.
SELECT
  user_id,
  schedule_date,
  shift_definition_id,
  COALESCE(location_id, region_id, district_id) AS place,
  count(*) AS duplicates
FROM schedules
WHERE deleted_at IS NULL
GROUP BY 1, 2, 3, 4
HAVING count(*) > 1
ORDER BY duplicates DESC
LIMIT 50;

\echo ''
\echo '-- Gate verdict --------------------------------------------------------'
SELECT CASE WHEN count(*) = 0
            THEN 'PASS — no duplicate (user, date, shift, place)'
            ELSE 'FAIL — ' || count(*) || ' duplicate group(s); migration 17517 WILL abort'
       END AS uniqueness_gate
FROM (
  SELECT 1 FROM schedules
  WHERE deleted_at IS NULL
  GROUP BY user_id, schedule_date, shift_definition_id,
           COALESCE(location_id, region_id, district_id)
  HAVING count(*) > 1
) dupes;

\echo ''
\echo '=============================================================='
\echo ' 6. Shift definitions — real shifts vs leftovers'
\echo '=============================================================='
-- Smoke/test rows left ACTIVE show up in every operator picker and in the
-- staffing math. Anything with 0/0/0 references is safe to remove; see
-- staging-cleanup-shift-definitions.sql.
SELECT
  d.name,
  d.is_active,
  d.start_time,
  d.end_time,
  d.crosses_midnight,
  d.cutoff_grace_min,
  (SELECT count(*) FROM schedule_events e
     WHERE e.shift_definition_id = d.id AND e.deleted_at IS NULL) AS events,
  (SELECT count(*) FROM schedules s
     WHERE s.shift_definition_id = d.id AND s.deleted_at IS NULL) AS roster_rows,
  (SELECT count(*) FROM shifts sh
     WHERE sh.shift_definition_id = d.id)                        AS sessions
FROM shift_definitions d
WHERE d.deleted_at IS NULL
ORDER BY d.start_time, d.name;

\echo ''
\echo '=============================================================='
\echo ' 7. Materialization horizon — reached vs expected'
\echo '=============================================================='
-- `schedule.materialization_days` (env SCHEDULE_MATERIALIZATION_DAYS, code
-- default 30) governs how far ahead rows exist. If the number below is much
-- larger than the configured value, something materialized with an explicit
-- range and the config does not describe reality — pin it before cutover.
SELECT
  max(schedule_date)                          AS furthest_row,
  max(schedule_date) - CURRENT_DATE           AS days_ahead,
  count(DISTINCT schedule_date) FILTER (WHERE schedule_date > CURRENT_DATE) AS future_days_covered
FROM schedules
WHERE deleted_at IS NULL;

\echo ''
\echo '=============================================================='
\echo ' 8. Absence-sweep blast radius (ADR-056)'
\echo '=============================================================='
-- The hourly ScheduleAbsenceCron rewrites every PAST `planned` row whose window
-- has closed. On a database that has never run ADR-056 the first sweep is
-- unbounded — this is how many rows it would touch, and how far back.
SELECT
  count(*)                                  AS past_planned_rows,
  min(schedule_date)                        AS oldest,
  max(schedule_date)                        AS newest,
  CURRENT_DATE - min(schedule_date)         AS lookback_days_needed
FROM schedules
WHERE deleted_at IS NULL
  AND status = 'planned'
  AND schedule_date < CURRENT_DATE;

\echo ''
\echo '=============================================================='
\echo ' 9. Roster status distribution (sanity)'
\echo '=============================================================='
SELECT status, count(*) AS rows,
       count(*) FILTER (WHERE schedule_date < CURRENT_DATE) AS past,
       count(*) FILTER (WHERE schedule_date >= CURRENT_DATE) AS today_or_future
FROM schedules WHERE deleted_at IS NULL
GROUP BY status ORDER BY rows DESC;

\echo ''
\echo '=============================================================='
\echo ' 10. Attendance sanity — punches vs session projection'
\echo '=============================================================='
-- `shifts` is a projection of `attendance_punches` (ADR-055). A session with no
-- punch behind it, or a punch day with no session, means the projection drifted.
SELECT
  (SELECT count(*) FROM attendance_punches)                                AS punches,
  (SELECT count(*) FROM shifts)                                            AS sessions,
  (SELECT count(*) FROM shifts WHERE service_day IS NULL)                  AS sessions_missing_service_day,
  (SELECT count(*) FROM shifts WHERE clock_out_time IS NULL)               AS open_sessions,
  (SELECT count(*) FROM shifts sh WHERE NOT EXISTS (
      SELECT 1 FROM attendance_punches p WHERE p.user_id = sh.user_id
        AND p.service_day = sh.service_day))                               AS sessions_without_punch;

\echo ''
\echo '-- Open sessions older than 2 days (forgotten clock-outs) -------------'
SELECT sh.service_day, u.username, sd.name AS shift, sh.clock_in_time
FROM shifts sh
JOIN users u ON u.id = sh.user_id
LEFT JOIN shift_definitions sd ON sd.id = sh.shift_definition_id
WHERE sh.clock_out_time IS NULL
  AND sh.service_day < CURRENT_DATE - 2
ORDER BY sh.service_day DESC
LIMIT 25;

\echo ''
\echo '-- Dangling sessions by day (never auto-closed, by ADR-055) ------------'
-- A forgotten clock-out stays open on purpose: ADR-055 says it is "never
-- auto-closed", and the correction flow (Koreksi Kehadiran) is deferred. So
-- these days never settle — the worker reads `bertugas` + `lupa_clock_out`
-- forever in history. TODAY's counts are unaffected (a stale session belongs to
-- its own service_day), but reports over those days are wrong. Track the trend:
-- a growing number means workers are not being reminded to clock out.
SELECT service_day, count(*) AS open_sessions, count(DISTINCT user_id) AS workers
FROM shifts
WHERE clock_out_time IS NULL AND service_day < CURRENT_DATE
GROUP BY service_day ORDER BY service_day DESC LIMIT 15;

\echo ''
\echo '=============================================================='
\echo ' 11. Photo verification coverage'
\echo '=============================================================='
-- `selfie_photo` is @IsOptional() on the clock-in DTO, so a punch with no photo
-- is accepted. "Clock-in with photo verification" is a headline feature, so a
-- low number here means the feature is effectively off. Deciding whether to
-- make it mandatory is a product call (a hard requirement blocks a worker whose
-- camera fails) — this just makes the number visible.
SELECT
  label,
  count(*)                                          AS punches,
  count(*) FILTER (WHERE photo_url IS NOT NULL)     AS with_photo,
  round(100.0 * count(*) FILTER (WHERE photo_url IS NOT NULL) / NULLIF(count(*), 0), 1)
                                                    AS pct_with_photo,
  count(*) FILTER (WHERE photo_url LIKE 'data:%')   AS inline_base64
FROM attendance_punches
GROUP BY label ORDER BY label;

\echo ''
\echo '-- inline_base64 must stay 0: data-URIs in the DB are the F9 OOM class ---'

\echo ''
\echo '=============================================================='
\echo ' Report complete. Compare against the pre-migration run.'
\echo '=============================================================='
