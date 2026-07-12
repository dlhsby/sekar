import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 5-2 Analytics — 3 daily materialized views (ADR-025), 90-day rolling
 * window. Each source is pre-aggregated per (entity, day) in a CTE then joined
 * on a UNION'd date grid — this avoids the cartesian over-counting you get from
 * joining shifts×tasks×activities×overtimes×pings in one pass. Every view has a
 * UNIQUE index so `REFRESH MATERIALIZED VIEW CONCURRENTLY` never blocks reads.
 *
 * Column sources verified against the live schema:
 *   shifts(clock_in_time, clock_out_time, shift_definition_id, user_id, location_id)
 *   shift_definitions(start_time::time)
 *   overtimes(start_datetime, end_datetime, status='approved', user_id)
 *   location_logs(logged_at, user_id)  — no historical within-area flag, so
 *     within_area_pings is reported equal to total_pings for now.
 *   asset_maintenances(asset_id, completed_at, status) → assets(location_id)
 */
export class Phase5AnalyticsViews17490002000000 implements MigrationInterface {
  name = 'Phase5AnalyticsViews17490002000000';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---- worker_performance_daily (8 KPIs / user / day) ----
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS worker_performance_daily AS
      WITH shift_daily AS (
        SELECT s.user_id,
               DATE(s.clock_in_time) AS date,
               COUNT(*) FILTER (WHERE s.clock_out_time IS NOT NULL) AS attended,
               ROUND(AVG(EXTRACT(EPOCH FROM (s.clock_in_time::time - sd.start_time)) / 60.0)
                 FILTER (WHERE sd.start_time IS NOT NULL))::int AS late_minutes
        FROM shifts s
        LEFT JOIN shift_definitions sd ON sd.id = s.shift_definition_id
        WHERE s.deleted_at IS NULL AND s.clock_in_time >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY s.user_id, DATE(s.clock_in_time)
      ),
      task_daily AS (
        SELECT t.assigned_to AS user_id,
               DATE(t.created_at) AS date,
               COUNT(*) AS total_tasks,
               COUNT(*) FILTER (WHERE t.status IN ('completed', 'verified')) AS completed_tasks
        FROM tasks t
        WHERE t.deleted_at IS NULL AND t.assigned_to IS NOT NULL
          AND t.created_at >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY t.assigned_to, DATE(t.created_at)
      ),
      activity_daily AS (
        SELECT a.user_id,
               DATE(a.created_at) AS date,
               COUNT(*) AS total_activities,
               COUNT(*) FILTER (WHERE a.status = 'approved') AS approved_activities
        FROM activities a
        WHERE a.deleted_at IS NULL AND a.created_at >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY a.user_id, DATE(a.created_at)
      ),
      overtime_daily AS (
        SELECT o.user_id,
               DATE(o.start_datetime) AS date,
               ROUND(SUM(EXTRACT(EPOCH FROM (o.end_datetime - o.start_datetime)) / 3600.0)
                 FILTER (WHERE o.status = 'approved')::numeric, 1) AS overtime_hours
        FROM overtimes o
        WHERE o.start_datetime >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY o.user_id, DATE(o.start_datetime)
      ),
      ping_daily AS (
        SELECT ll.user_id, DATE(ll.logged_at) AS date, COUNT(*) AS total_pings
        FROM location_logs ll
        WHERE ll.logged_at >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY ll.user_id, DATE(ll.logged_at)
      ),
      base AS (
        SELECT user_id, date FROM shift_daily
        UNION SELECT user_id, date FROM task_daily
        UNION SELECT user_id, date FROM activity_daily
        UNION SELECT user_id, date FROM overtime_daily
        UNION SELECT user_id, date FROM ping_daily
      )
      SELECT b.user_id,
             b.date,
             COALESCE(sh.attended, 0) AS attended,
             COALESCE(sh.late_minutes, 0) AS late_minutes,
             COALESCE(td.total_tasks, 0) AS total_tasks,
             COALESCE(td.completed_tasks, 0) AS completed_tasks,
             COALESCE(ad.total_activities, 0) AS total_activities,
             COALESCE(ad.approved_activities, 0) AS approved_activities,
             COALESCE(pd.total_pings, 0) AS within_area_pings,
             COALESCE(pd.total_pings, 0) AS total_pings,
             COALESCE(od.overtime_hours, 0) AS overtime_hours
      FROM base b
      LEFT JOIN shift_daily sh ON sh.user_id = b.user_id AND sh.date = b.date
      LEFT JOIN task_daily td ON td.user_id = b.user_id AND td.date = b.date
      LEFT JOIN activity_daily ad ON ad.user_id = b.user_id AND ad.date = b.date
      LEFT JOIN overtime_daily od ON od.user_id = b.user_id AND od.date = b.date
      LEFT JOIN ping_daily pd ON pd.user_id = b.user_id AND pd.date = b.date;
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_wpd_user_date ON worker_performance_daily (user_id, date);`,
    );

    // ---- area_metrics_daily (5 KPIs / area / day) ----
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS area_metrics_daily AS
      WITH shift_area AS (
        SELECT s.location_id,
               DATE(s.clock_in_time) AS date,
               COUNT(DISTINCT s.user_id) FILTER (WHERE s.clock_out_time IS NOT NULL) AS attended_workers
        FROM shifts s
        WHERE s.deleted_at IS NULL AND s.location_id IS NOT NULL
          AND s.clock_in_time >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY s.location_id, DATE(s.clock_in_time)
      ),
      task_area AS (
        SELECT t.location_id,
               DATE(t.created_at) AS date,
               COUNT(*) FILTER (WHERE t.status NOT IN ('completed', 'verified', 'declined')) AS open_tasks_count
        FROM tasks t
        WHERE t.deleted_at IS NULL AND t.location_id IS NOT NULL
          AND t.created_at >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY t.location_id, DATE(t.created_at)
      ),
      maint_area AS (
        SELECT ast.location_id,
               DATE(am.completed_at) AS date,
               COUNT(*) AS maintenance_count
        FROM asset_maintenances am
        JOIN assets ast ON ast.id = am.asset_id
        WHERE am.completed_at >= CURRENT_DATE - INTERVAL '90 days'
          AND am.status = 'completed' AND ast.location_id IS NOT NULL
        GROUP BY ast.location_id, DATE(am.completed_at)
      ),
      base AS (
        SELECT location_id, date FROM shift_area
        UNION SELECT location_id, date FROM task_area
        UNION SELECT location_id, date FROM maint_area
      )
      SELECT b.location_id,
             b.date,
             COALESCE(sa.attended_workers, 0) AS attended_workers,
             COALESCE((SELECT COUNT(DISTINCT ua.user_id) FROM user_areas ua WHERE ua.location_id = b.location_id), 0) AS required_workers,
             COALESCE(ta.open_tasks_count, 0) AS open_tasks_count,
             COALESCE(ma.maintenance_count, 0) AS maintenance_count,
             0 AS outside_area_events,
             0 AS missing_events
      FROM base b
      LEFT JOIN shift_area sa ON sa.location_id = b.location_id AND sa.date = b.date
      LEFT JOIN task_area ta ON ta.location_id = b.location_id AND ta.date = b.date
      LEFT JOIN maint_area ma ON ma.location_id = b.location_id AND ma.date = b.date;
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_amd_area_date ON area_metrics_daily (location_id, date);`,
    );

    // ---- operational_metrics_daily (6 KPIs / day) — date spine ----
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS operational_metrics_daily AS
      WITH days AS (
        SELECT generate_series(CURRENT_DATE - INTERVAL '90 days', CURRENT_DATE, INTERVAL '1 day')::date AS date
      ),
      shift_op AS (
        SELECT DATE(clock_in_time) AS date,
               COUNT(DISTINCT user_id) FILTER (WHERE clock_out_time IS NOT NULL) AS total_attended,
               COUNT(DISTINCT user_id) AS total_scheduled
        FROM shifts WHERE deleted_at IS NULL AND clock_in_time >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY DATE(clock_in_time)
      ),
      task_op AS (
        SELECT DATE(created_at) AS date,
               COUNT(*) FILTER (WHERE status IN ('completed', 'verified')) AS tasks_completed,
               ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600.0)
                 FILTER (WHERE completed_at IS NOT NULL)::numeric, 2) AS avg_task_duration_hours
        FROM tasks WHERE deleted_at IS NULL AND created_at >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY DATE(created_at)
      ),
      overtime_op AS (
        SELECT DATE(start_datetime) AS date,
               ROUND(SUM(EXTRACT(EPOCH FROM (end_datetime - start_datetime)) / 3600.0)
                 FILTER (WHERE status = 'approved')::numeric, 1) AS overtime_total_hours
        FROM overtimes WHERE start_datetime >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY DATE(start_datetime)
      )
      SELECT d.date,
             COALESCE(so.total_attended, 0) AS total_attended,
             COALESCE(so.total_scheduled, 0) AS total_scheduled,
             COALESCE(t.tasks_completed, 0) AS tasks_completed,
             COALESCE(t.avg_task_duration_hours, 0) AS avg_task_duration_hours,
             COALESCE(o.overtime_total_hours, 0) AS overtime_total_hours
      FROM days d
      LEFT JOIN shift_op so ON so.date = d.date
      LEFT JOIN task_op t ON t.date = d.date
      LEFT JOIN overtime_op o ON o.date = d.date;
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_omd_date ON operational_metrics_daily (date);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS operational_metrics_daily CASCADE`);
    await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS area_metrics_daily CASCADE`);
    await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS worker_performance_daily CASCADE`);
  }
}
