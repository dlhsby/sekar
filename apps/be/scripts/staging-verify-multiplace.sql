-- staging-verify-multiplace.sql
--
-- Zero-loss proof for the ADR-053 multi-place preservation
-- (migration 17517500000000-PreserveMultiPlaceSchedules).
--
-- Run against the MIGRATED clone (after the full chain + before any hand edits).
-- Every location assignment a live schedule held before the cutover must still be
-- COVERED afterwards — by a row at the same (user, date, shift) whose place is that
-- exact location, OR the kawasan that contains it, OR the rayon that contains it
-- (ADR-053: a broader row covers the narrower places inside it).
--
-- Assignments on schedules that were already soft-deleted are excluded — they were
-- gone before the migration and must NOT be resurrected; they remain in
-- schedule_locations_archive for the record.
--
-- ACCEPTANCE: lost_must_be_zero = 0.
--
-- Verified on the 2026-07-23 staging clone: 134,776 live assignments, 134,776
-- covered, 0 lost; the 1,516 "uncovered" all traced to the 14 soft-deleted parents.

\pset pager off

WITH orig AS (
  SELECT DISTINCT
         a.location_id,
         s0.user_id,
         s0.schedule_date,
         s0.shift_definition_id,
         l.region_id,
         l.district_id
    FROM schedule_locations_archive a
    JOIN schedules s0 ON s0.id = a.schedule_id
    JOIN locations l  ON l.id  = a.location_id
   WHERE s0.deleted_at IS NULL          -- exclude already-deleted schedules
)
SELECT
  count(*) AS live_original_assignments,
  count(*) FILTER (WHERE covered)       AS covered,
  count(*) FILTER (WHERE NOT covered)   AS lost_must_be_zero
FROM (
  SELECT o.*, EXISTS (
    SELECT 1 FROM schedules r
     WHERE r.user_id = o.user_id
       AND r.schedule_date = o.schedule_date
       AND r.shift_definition_id IS NOT DISTINCT FROM o.shift_definition_id
       AND r.deleted_at IS NULL
       AND ( r.location_id = o.location_id
          OR r.region_id   = o.region_id
          OR r.district_id = o.district_id )
  ) AS covered
  FROM orig o
) c;
