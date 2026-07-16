import type { SeedContext } from '../lib/context';

/**
 * Seed monitoring configs (Phase 2D + Phase 3 additions).
 * Combines 5 Phase 2 configs + 4 Phase 3 configs = 9 total, idempotent via ON CONFLICT.
 */
export async function seedMonitoringConfigs(ctx: SeedContext): Promise<void> {
  ctx.log('📡 Seeding Monitoring Configs…');

  // Phase 2 monitoring configs (5)
  const phase2Configs = [
    {
      key: 'status_thresholds',
      value: JSON.stringify({
        active_max_age_seconds: 600,
        location_ping_interval_seconds: 60,
      }),
      description: 'Status calculation thresholds',
    },
    {
      key: 'geofencing',
      value: JSON.stringify({ tolerance_meters: 50, outside_area_grace_seconds: 120 }),
      description: 'Geofencing tolerance settings',
    },
    {
      key: 'map_defaults',
      value: JSON.stringify({
        center_lat: -7.2575,
        center_lng: 112.7521,
        zoom: 12,
        cluster_zoom_threshold: 14,
        cluster_threshold: 30,
      }),
      description: 'Map default view (Surabaya)',
    },
    {
      key: 'alerts',
      value: JSON.stringify({
        missing_user_notify: true,
        understaffed_notify: true,
        low_battery_threshold: 15,
      }),
      description: 'Alert configuration',
    },
    {
      key: 'location_ping',
      value: JSON.stringify({ interval_seconds: 60, batch_size: 10 }),
      description: 'Mobile location ping settings',
    },
  ];

  for (const cfg of phase2Configs) {
    await ctx.qr.query(
      `INSERT INTO monitoring_configs (key, value, description)
       VALUES ($1, $2::jsonb, $3)
       ON CONFLICT (key) DO NOTHING`,
      [cfg.key, cfg.value, cfg.description],
    );
  }
  ctx.log(`  ✓ ${phase2Configs.length} Phase 2 monitoring configs inserted`);

  // Phase 3 monitoring configs (4)
  const phase3Configs = [
    {
      key: 'plants_forecast',
      value: JSON.stringify({
        default_pruning_cycle_days: 90,
        overdue_threshold_days: 30,
        due_soon_window_days: 14,
      }),
      description: 'Plant pruning forecast configuration (Phase 3)',
    },
    {
      key: 'service_capacity_defaults',
      value: JSON.stringify({
        default_capacity_per_week: 5,
        overbooking_tolerance: 10,
        booking_window_weeks: 12,
      }),
      description: 'Service capacity booking defaults (Phase 3)',
    },
    {
      key: 'pruning_request_workflow',
      value: JSON.stringify({
        auto_assign_to_rayon: false,
        review_deadline_days: 7,
        reference_code_prefix: 'PR',
      }),
      description: 'Pruning request workflow settings (Phase 3)',
    },
    {
      key: 'seed_inventory',
      value: JSON.stringify({
        low_stock_threshold_grams: 500,
        low_stock_threshold_pieces: 50,
        reorder_notification: true,
      }),
      description: 'Seed inventory alert thresholds (Phase 3)',
    },
  ];

  for (const cfg of phase3Configs) {
    await ctx.qr.query(
      `INSERT INTO monitoring_configs (key, value, description)
       VALUES ($1, $2::jsonb, $3)
       ON CONFLICT (key) DO NOTHING`,
      [cfg.key, cfg.value, cfg.description],
    );
  }
  ctx.log(`  ✓ ${phase3Configs.length} Phase 3 monitoring configs inserted`);
}
