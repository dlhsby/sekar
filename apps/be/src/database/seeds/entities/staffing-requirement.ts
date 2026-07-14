import type { SeedContext } from '../lib/context';
import { loadStaffingSnapshot } from '../load-seed-data';

/**
 * Seed the staffing requirements (KEBUTUHAN) from the client workbook
 * (`data/staffing.snapshot.json`) into the polymorphic
 * `location_staff_requirements` table: region-level for the 7 grouped rayons'
 * kawasan, location-level for Taman Aktif parks (per each rayon's
 * `staffing_level`). Satgas-only, WEEKDAY (the sheet is a flat count); linmas +
 * weekend/holiday are added later via the UI.
 *
 * Runs for both demo and staging. Must run AFTER seedRegions + seedAreas (FKs).
 * Idempotent via deterministic ids.
 */
export async function seedStaffingRequirements(ctx: SeedContext): Promise<void> {
  ctx.log('👷 Seeding staffing requirements (KEBUTUHAN, from workbook)…');

  const rows = loadStaffingSnapshot();
  let region = 0;
  let location = 0;
  for (const r of rows) {
    const locationId = r.subject_type === 'location' ? r.subject_id : null;
    const regionId = r.subject_type === 'region' ? r.subject_id : null;
    const rayonId = r.subject_type === 'rayon' ? r.subject_id : null;
    await ctx.qr.query(
      `INSERT INTO location_staff_requirements
         (id, location_id, region_id, rayon_id, shift_definition_id, role, required_count, day_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET required_count = EXCLUDED.required_count`,
      [
        r.id,
        locationId,
        regionId,
        rayonId,
        r.shift_definition_id,
        r.role,
        r.required_count,
        r.day_type,
      ],
    );
    if (regionId) region += 1;
    if (locationId) location += 1;
  }

  ctx.log(`  ✓ ${rows.length} requirements (${region} kawasan-level + ${location} location-level)`);
}
