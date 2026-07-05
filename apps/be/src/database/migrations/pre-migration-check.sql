-- Pre-Migration Data Integrity Check
-- Run this BEFORE executing AddProductionIndexesAndConstraints migration
-- File: be/src/database/migrations/pre-migration-check.sql

\echo '=========================================='
\echo 'Pre-Migration Data Integrity Check'
\echo 'Migration: AddProductionIndexesAndConstraints'
\echo '=========================================='
\echo ''

-- ==========================================
-- CHECK 1: Orphaned Reports
-- ==========================================
\echo '1. Checking for orphaned reports (reports without valid shifts)...'
\echo ''

SELECT
  COUNT(*) as orphaned_count,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ PASS: No orphaned reports found'
    ELSE '❌ FAIL: Found orphaned reports - see details below'
  END as status
FROM reports r
LEFT JOIN shifts s ON r.shift_id = s.id
WHERE s.id IS NULL;

\echo ''
\echo 'Details of orphaned reports (if any):'
SELECT
  r.id as report_id,
  r.shift_id as missing_shift_id,
  r.worker_id,
  r.created_at,
  u.name as worker_name
FROM reports r
LEFT JOIN shifts s ON r.shift_id = s.id
LEFT JOIN users u ON r.worker_id = u.id
WHERE s.id IS NULL
ORDER BY r.created_at DESC
LIMIT 10;

\echo ''
\echo 'Cleanup options for orphaned reports:'
\echo '  Option 1: DELETE FROM reports WHERE shift_id IN (SELECT shift_id FROM orphaned_list);'
\echo '  Option 2: UPDATE reports SET shift_id = <valid_shift_id> WHERE shift_id = <orphaned_shift_id>;'
\echo ''

-- ==========================================
-- CHECK 2: Shifts with NULL area_id
-- ==========================================
\echo '2. Checking for shifts with NULL area_id...'
\echo ''

SELECT
  COUNT(*) as null_area_count,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ PASS: All shifts have area_id'
    ELSE '❌ FAIL: Found shifts with NULL area_id - see details below'
  END as status
FROM shifts
WHERE area_id IS NULL;

\echo ''
\echo 'Details of shifts with NULL area_id (if any):'
SELECT
  s.id as shift_id,
  s.worker_id,
  u.name as worker_name,
  s.clock_in_time,
  s.clock_out_time,
  s.deleted_at,
  COUNT(r.id) as affected_reports
FROM shifts s
LEFT JOIN users u ON s.worker_id = u.id
LEFT JOIN reports r ON r.shift_id = s.id
WHERE s.area_id IS NULL
GROUP BY s.id, s.worker_id, u.name, s.clock_in_time, s.clock_out_time, s.deleted_at
ORDER BY s.clock_in_time DESC
LIMIT 10;

\echo ''
\echo 'Cleanup options for shifts with NULL area_id:'
\echo '  UPDATE shifts SET area_id = <valid_area_id> WHERE id = <shift_id>;'
\echo ''

-- ==========================================
-- CHECK 3: Data Integrity Statistics
-- ==========================================
\echo '3. Data integrity statistics...'
\echo ''

WITH stats AS (
  SELECT
    (SELECT COUNT(*) FROM reports) as total_reports,
    (SELECT COUNT(*) FROM shifts) as total_shifts,
    (SELECT COUNT(*) FROM areas) as total_areas,
    (SELECT COUNT(*) FROM reports r LEFT JOIN shifts s ON r.shift_id = s.id WHERE s.id IS NULL) as orphaned_reports,
    (SELECT COUNT(*) FROM shifts WHERE area_id IS NULL) as shifts_null_area,
    (SELECT COUNT(*) FROM shifts WHERE deleted_at IS NOT NULL) as soft_deleted_shifts,
    (SELECT COUNT(*) FROM reports r JOIN shifts s ON r.shift_id = s.id WHERE s.deleted_at IS NOT NULL) as reports_on_deleted_shifts
)
SELECT
  'Total Reports' as metric, total_reports as count FROM stats
UNION ALL
SELECT 'Total Shifts', total_shifts FROM stats
UNION ALL
SELECT 'Total Areas', total_areas FROM stats
UNION ALL
SELECT 'Orphaned Reports', orphaned_reports FROM stats
UNION ALL
SELECT 'Shifts with NULL area_id', shifts_null_area FROM stats
UNION ALL
SELECT 'Soft-Deleted Shifts', soft_deleted_shifts FROM stats
UNION ALL
SELECT 'Reports on Deleted Shifts', reports_on_deleted_shifts FROM stats;

\echo ''

-- ==========================================
-- CHECK 4: Foreign Key Validation
-- ==========================================
\echo '4. Validating foreign key relationships...'
\echo ''

-- Reports -> Shifts
SELECT
  COUNT(*) as invalid_count,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ PASS: All reports have valid shift references'
    ELSE '❌ FAIL: Some reports have invalid shift references'
  END as status
FROM reports r
WHERE NOT EXISTS (SELECT 1 FROM shifts s WHERE s.id = r.shift_id);

\echo ''

-- Reports -> Workers
SELECT
  COUNT(*) as invalid_count,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ PASS: All reports have valid worker references'
    ELSE '❌ FAIL: Some reports have invalid worker references'
  END as status
FROM reports r
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = r.worker_id);

\echo ''

-- Shifts -> Areas
SELECT
  COUNT(*) as invalid_count,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ PASS: All shifts have valid area references (excluding NULL)'
    ELSE '❌ FAIL: Some shifts have invalid area references'
  END as status
FROM shifts s
WHERE area_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM areas a WHERE a.id = s.area_id);

\echo ''

-- ==========================================
-- CHECK 5: Backfill Simulation
-- ==========================================
\echo '5. Simulating area_id backfill (DRY RUN)...'
\echo ''

WITH backfill_preview AS (
  SELECT
    r.id as report_id,
    r.shift_id,
    s.area_id as would_be_backfilled,
    CASE
      WHEN s.area_id IS NULL THEN '❌ FAIL: Shift has NULL area_id'
      WHEN s.area_id IS NOT NULL THEN '✅ OK: Would backfill successfully'
    END as backfill_status
  FROM reports r
  JOIN shifts s ON r.shift_id = s.id
)
SELECT
  backfill_status,
  COUNT(*) as count
FROM backfill_preview
GROUP BY backfill_status;

\echo ''
\echo 'Sample of reports that would be backfilled:'
SELECT
  r.id as report_id,
  r.shift_id,
  s.area_id as will_receive_area_id,
  a.name as area_name,
  s.deleted_at IS NOT NULL as shift_is_soft_deleted
FROM reports r
JOIN shifts s ON r.shift_id = s.id
LEFT JOIN areas a ON s.area_id = a.id
ORDER BY r.created_at DESC
LIMIT 5;

\echo ''

-- ==========================================
-- SUMMARY
-- ==========================================
\echo '=========================================='
\echo 'Pre-Migration Check Summary'
\echo '=========================================='

WITH checks AS (
  SELECT
    (SELECT COUNT(*) FROM reports r LEFT JOIN shifts s ON r.shift_id = s.id WHERE s.id IS NULL) as orphaned_reports,
    (SELECT COUNT(*) FROM shifts WHERE area_id IS NULL) as shifts_null_area,
    (SELECT COUNT(*) FROM reports r WHERE NOT EXISTS (SELECT 1 FROM shifts s WHERE s.id = r.shift_id)) as invalid_shift_refs,
    (SELECT COUNT(*) FROM reports r WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = r.worker_id)) as invalid_worker_refs,
    (SELECT COUNT(*) FROM shifts s WHERE area_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM areas a WHERE a.id = s.area_id)) as invalid_area_refs
)
SELECT
  CASE
    WHEN orphaned_reports = 0
      AND shifts_null_area = 0
      AND invalid_shift_refs = 0
      AND invalid_worker_refs = 0
      AND invalid_area_refs = 0
    THEN '✅ ALL CHECKS PASSED - Safe to run migration'
    ELSE '❌ CHECKS FAILED - Fix data issues before migration'
  END as overall_status,
  orphaned_reports,
  shifts_null_area,
  invalid_shift_refs,
  invalid_worker_refs,
  invalid_area_refs
FROM checks;

\echo ''
\echo 'Next steps:'
\echo '  If all checks passed: npm run migration:run'
\echo '  If checks failed: Fix data issues using cleanup queries above, then re-run this script'
\echo ''
