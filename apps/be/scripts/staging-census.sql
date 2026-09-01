-- staging-census.sql — the before/after image for the staging cutover rehearsal.
--
-- Run against the throwaway clone (see staging-clone.sh) BEFORE the migration chain
-- and again AFTER, then diff. Acceptance: zero unexplained row loss.
--
-- Must run on BOTH schemas: pre-revamp (areas / rayons / schedule_locations) and
-- post-revamp (locations / districts). Every probe is therefore guarded by
-- to_regclass — an absent table reports "n/a", it never errors.

\pset pager off
\pset footer off
\timing off

\echo '=============================================================='
\echo ' 1. ROW COUNTS — every user table, exact'
\echo '=============================================================='
-- query_to_xml gives an exact count per table in one pass without naming them,
-- so this works identically on both schema generations.
SELECT
  relname AS table_name,
  (xpath(
     '/row/c/text()',
     query_to_xml(format('SELECT count(*) AS c FROM %I.%I', schemaname, relname),
                  false, true, '')
   ))[1]::text::bigint AS rows
FROM pg_stat_user_tables
ORDER BY relname;

\echo ''
\echo '=============================================================='
\echo ' 2. APPLIED MIGRATIONS (tail)'
\echo '=============================================================='
SELECT id, name FROM typeorm_migrations ORDER BY id DESC LIMIT 15;
SELECT count(*) AS migrations_applied FROM typeorm_migrations;

\echo ''
\echo '=============================================================='
\echo ' 3. users.role DISTRIBUTION — must map 1:1 across the rename'
\echo '=============================================================='
-- 17491700000000 renames top_management -> management, admin_data -> admin_rayon.
SELECT role, count(*) AS n, count(*) FILTER (WHERE is_active) AS active
FROM users GROUP BY role ORDER BY role;
SELECT count(*) AS users_with_null_role FROM users WHERE role IS NULL;

\echo ''
\echo '=============================================================='
\echo ' 4. RBAC TABLES — F1: these are created EMPTY by 17491300000000.'
\echo '    After the reference seed they MUST be non-zero, or every'
\echo '    @RequirePermissions handler 403s and monitoring_scope = none.'
\echo '=============================================================='
DO $$
DECLARE n bigint; t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['roles','permissions','role_permissions'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE '% : n/a (table absent)', rpad(t, 20);
    ELSE
      EXECUTE format('SELECT count(*) FROM %I', t) INTO n;
      RAISE NOTICE '% : %', rpad(t, 20), n;
    END IF;
  END LOOP;

  IF to_regclass('public.roles') IS NOT NULL THEN
    FOR t, n IN EXECUTE
      'SELECT monitoring_scope::text, count(*) FROM roles GROUP BY 1 ORDER BY 1'
    LOOP
      RAISE NOTICE '  monitoring_scope % : %', rpad(coalesce(t,'(null)'), 10), n;
    END LOOP;
  END IF;
END $$;

\echo ''
\echo '=============================================================='
\echo ' 5. GEOGRAPHY INTEGRITY — 17496 re-parents areas under kawasan.'
\echo '    Watch for orphans and for rows its name-matching SQL misses.'
\echo '=============================================================='
DO $$
DECLARE loc text; dis text; n bigint;
BEGIN
  -- Table names differ either side of 17492500000000 / 17510000000000.
  loc := CASE WHEN to_regclass('public.locations') IS NOT NULL THEN 'locations'
              WHEN to_regclass('public.areas')     IS NOT NULL THEN 'areas' END;
  dis := CASE WHEN to_regclass('public.districts') IS NOT NULL THEN 'districts'
              WHEN to_regclass('public.rayons')    IS NOT NULL THEN 'rayons' END;

  IF loc IS NULL THEN RAISE NOTICE 'no locations/areas table'; RETURN; END IF;
  RAISE NOTICE 'location table: %   district table: %', loc, coalesce(dis,'n/a');

  EXECUTE format('SELECT count(*) FROM %I', loc) INTO n;
  RAISE NOTICE 'locations total            : %', n;

  -- region_id is nullable BY DESIGN (Rayon Taman Aktif hangs lokasi straight off
  -- the rayon), so a null here is legitimate — but the count must be explainable.
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = loc AND column_name = 'region_id') THEN
    EXECUTE format('SELECT count(*) FROM %I WHERE region_id IS NULL', loc) INTO n;
    RAISE NOTICE 'locations WITHOUT kawasan  : %  (legit only for Taman Aktif)', n;
  ELSE
    RAISE NOTICE 'locations WITHOUT kawasan  : n/a (region_id column absent)';
  END IF;

  -- A location with no parent district is a genuine orphan in either schema.
  IF dis IS NOT NULL AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_name = loc AND column_name IN ('district_id','rayon_id')) THEN
    EXECUTE format(
      'SELECT count(*) FROM %I WHERE %I IS NULL', loc,
      CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_name = loc AND column_name = 'district_id')
           THEN 'district_id' ELSE 'rayon_id' END) INTO n;
    RAISE NOTICE 'locations ORPHANED (no rayon): %  <-- must be 0', n;
  END IF;

  IF to_regclass('public.regions') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM regions' INTO n;
    RAISE NOTICE 'kawasan (regions) total    : %', n;
  ELSE
    RAISE NOTICE 'kawasan (regions) total    : n/a';
  END IF;
END $$;

\echo ''
\echo '=============================================================='
\echo ' 6. STAFFING — 17500 DELETEs all rows before inserting the'
\echo '    workbook set. Anything operator-authored here is at risk.'
\echo '=============================================================='
DO $$
DECLARE n bigint;
BEGIN
  IF to_regclass('public.location_staff_requirements') IS NULL THEN
    RAISE NOTICE 'location_staff_requirements : n/a (table absent)';
  ELSE
    EXECUTE 'SELECT count(*) FROM location_staff_requirements' INTO n;
    RAISE NOTICE 'location_staff_requirements : %', n;
  END IF;
  IF to_regclass('public.area_staff_requirements') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM area_staff_requirements' INTO n;
    RAISE NOTICE 'area_staff_requirements     : % (pre-revamp name)', n;
  END IF;
END $$;

\echo ''
\echo '=============================================================='
\echo ' 7. SCHEDULE UNIQUENESS — 17517 adds UQ(user,date,shift,place).'
\echo '    A duplicate in live data ABORTS THE CHAIN MID-WAY.'
\echo '    Probe this BEFORE migrating, not after.'
\echo '=============================================================='
DO $$
DECLARE n bigint; place_expr text;
BEGIN
  IF to_regclass('public.schedules') IS NULL THEN
    RAISE NOTICE 'schedules : n/a'; RETURN;
  END IF;

  -- The place key is COALESCE(location_id, region_id, district_id, nil) post-revamp;
  -- pre-revamp only the district/rayon column exists. Build whatever is present so
  -- the probe is meaningful on either schema.
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ord)
  INTO place_expr
  FROM (
    SELECT column_name, array_position(
             ARRAY['location_id','region_id','district_id','rayon_id','area_id'],
             column_name) AS ord
    FROM information_schema.columns
    WHERE table_name = 'schedules'
      AND column_name IN ('location_id','region_id','district_id','rayon_id','area_id')
  ) c WHERE ord IS NOT NULL;

  IF place_expr IS NULL THEN
    RAISE NOTICE 'schedules: no place columns found — cannot probe'; RETURN;
  END IF;

  EXECUTE format($q$
    SELECT count(*) FROM (
      SELECT user_id, schedule_date, shift_definition_id,
             COALESCE(%s, '00000000-0000-0000-0000-000000000000'::uuid) AS place
      FROM schedules
      WHERE user_id IS NOT NULL
      GROUP BY 1,2,3,4 HAVING count(*) > 1
    ) d $q$, place_expr) INTO n;

  RAISE NOTICE 'place columns used         : %', place_expr;
  RAISE NOTICE 'DUPLICATE (user,date,shift,place) groups : %  <-- MUST be 0', n;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'duplicate probe skipped: %', SQLERRM;
END $$;

\echo ''
\echo '=============================================================='
\echo ' 8. RETIRED STRUCTURES — dropped by 17516 / 17518 / 17508 etc.'
\echo '    Present BEFORE, absent AFTER. Record the counts so the'
\echo '    post-migration disappearance is an EXPLAINED delta.'
\echo '=============================================================='
DO $$
DECLARE n bigint; t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['schedule_locations','schedule_regions',
                           'schedule_event_locations','user_areas','user_locations'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE '% : absent', rpad(t, 26);
    ELSE
      EXECUTE format('SELECT count(*) FROM %I', t) INTO n;
      RAISE NOTICE '% : %', rpad(t, 26), n;
    END IF;
  END LOOP;
END $$;

\echo ''
\echo '=============================================================='
\echo ' 9. TRACKING STATUS — 17505 collapses the enum 5 -> 3'
\echo '=============================================================='
DO $$
DECLARE r record;
BEGIN
  IF to_regclass('public.user_tracking_status') IS NULL THEN
    RAISE NOTICE 'user_tracking_status : n/a'; RETURN;
  END IF;
  FOR r IN EXECUTE 'SELECT status::text AS s, count(*) AS n
                    FROM user_tracking_status GROUP BY 1 ORDER BY 1' LOOP
    RAISE NOTICE '  % : %', rpad(r.s, 16), r.n;
  END LOOP;
END $$;

\echo ''
\echo '=============================================================='
\echo ' 10. TRANSACTIONAL VOLUME — the operator-authored data that'
\echo '     MUST survive the cutover intact.'
\echo '=============================================================='
DO $$
DECLARE n bigint; t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','shifts','activities','tasks','schedules',
                           'schedule_events','overtimes','location_logs',
                           'pruning_requests','notifications','teams','audit_logs'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE '% : absent', rpad(t, 20);
    ELSE
      EXECUTE format('SELECT count(*) FROM %I', t) INTO n;
      RAISE NOTICE '% : %', rpad(t, 20), n;
    END IF;
  END LOOP;
END $$;

\echo ''
\echo '=== census complete ==='
