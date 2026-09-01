/**
 * The write vocabulary scenarios use.
 *
 * The important one is `punch`: it appends to `attendance_punches` and then
 * re-derives the `shifts` projection from the WHOLE log using the production
 * `AttendanceDerivationService`. That service is pure, so the seeded projection
 * is computed by the same code the API uses — only the row upsert is local. The
 * previous seeder wrote `shifts` directly and no punches at all, which left every
 * seeded worker with an empty Log Kehadiran and no derivable Jam Masuk/Keluar.
 */

import { randomUUID } from 'crypto';
import type { DataSource } from 'typeorm';
import { AttendanceDerivationService } from '../../src/modules/shifts/services/attendance-derivation.service';
import { PunchLabel } from '../../src/modules/shifts/enums/punch-label.enum';
import type { Helpers } from './types';

const derivation = new AttendanceDerivationService();

/** WIB is UTC+7 with no DST, so a fixed offset is exact rather than approximate. */
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/** The real instant of `HH:MM` WIB on a service day. */
export function wibAt(serviceDay: string, hhmm: string, plusDays = 0): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const base = new Date(`${serviceDay}T00:00:00Z`).getTime();
  return new Date(base + plusDays * 86_400_000 + h * 3_600_000 + m * 60_000 - WIB_OFFSET_MS);
}

/** Today's WIB service day as YYYY-MM-DD. */
export function wibToday(now = new Date()): string {
  return new Date(now.getTime() + WIB_OFFSET_MS).toISOString().split('T')[0];
}

export function buildHelpers(ds: DataSource): Helpers {
  const shiftDefCache = new Map<string, string>();

  /**
   * Rebuild the session projection for one (user, service_day, shift, overtime)
   * key from its punches. Mirrors what `ShiftsService` does on every punch, so a
   * seeded session is indistinguishable from one produced by the real endpoint.
   */
  async function projectSession(
    userId: string,
    serviceDay: string,
    shiftDefinitionId: string | null,
    isOvertime: boolean,
  ): Promise<void> {
    const punches = (await ds.query(
      `SELECT id, label, punched_at, location_id, gps_lat, gps_lng, outside_boundary
         FROM attendance_punches
        WHERE user_id = $1 AND service_day = $2 AND is_overtime = $3
          AND shift_definition_id IS NOT DISTINCT FROM $4
        ORDER BY punched_at ASC`,
      [userId, serviceDay, isOvertime, shiftDefinitionId],
    )) as Array<{
      label: PunchLabel;
      punched_at: Date;
      location_id: string | null;
      gps_lat: string | null;
      gps_lng: string | null;
      outside_boundary: boolean;
    }>;
    if (punches.length === 0) return;

    const session = derivation.deriveSession(
      punches.map((p) => ({ label: p.label, punched_at: new Date(p.punched_at) })),
    );
    const first = punches[0];
    const lastOut = [...punches].reverse().find((p) => p.label === PunchLabel.CLOCK_OUT);

    // `idx_shifts_session_key` is NOT unique, so there is no arbiter for
    // ON CONFLICT — select-then-write is the only correct upsert here.
    const [existing] = (await ds.query(
      `SELECT id FROM shifts
        WHERE user_id = $1 AND service_day = $2 AND is_overtime = $3
          AND shift_definition_id IS NOT DISTINCT FROM $4
          AND deleted_at IS NULL
        LIMIT 1`,
      [userId, serviceDay, isOvertime, shiftDefinitionId],
    )) as Array<{ id: string }>;

    // `isOpen` is the derived truth: a session is open when the last punch is a
    // clock-in, NOT when a clock-out row happens to be absent.
    const clockOutTime = session.isOpen ? null : session.clockOutTime;

    if (existing) {
      await ds.query(
        `UPDATE shifts
            SET clock_in_time = $2, clock_out_time = $3, location_id = $4,
                clock_out_gps_lat = $5, clock_out_gps_lng = $6, updated_at = now()
          WHERE id = $1`,
        [
          existing.id,
          session.clockInTime,
          clockOutTime,
          first.location_id,
          lastOut?.gps_lat ?? null,
          lastOut?.gps_lng ?? null,
        ],
      );
      return;
    }

    await ds.query(
      `INSERT INTO shifts (id, user_id, location_id, shift_definition_id, service_day,
                           clock_in_time, clock_in_gps_lat, clock_in_gps_lng,
                           clock_in_outside_boundary, clock_out_time,
                           clock_out_gps_lat, clock_out_gps_lng, is_overtime)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        randomUUID(),
        userId,
        first.location_id,
        shiftDefinitionId,
        serviceDay,
        session.clockInTime,
        first.gps_lat,
        first.gps_lng,
        first.outside_boundary,
        clockOutTime,
        lastOut?.gps_lat ?? null,
        lastOut?.gps_lng ?? null,
        isOvertime,
      ],
    );
  }

  return {
    /**
     * The shift whose window contains NOW — the same one the backend resolves
     * via `getCurrentShiftDefinition()`.
     *
     * Scenarios that assert display scope or staffing MUST schedule on this
     * shift: `scheduleScopesForCurrentShift` only matches occurrences on the
     * current shift, so a hardcoded "Shift 3" silently falls back to city scope
     * whenever the suite happens to run outside Shift 3's window. Learned by
     * MON-11 failing at 14:00 for exactly that reason.
     */
    async currentShiftDefId(): Promise<string> {
      const [row] = (await ds.query(
        `SELECT id FROM shift_definitions
          WHERE deleted_at IS NULL AND is_active
            AND ((NOT crosses_midnight
                  AND (now() AT TIME ZONE 'Asia/Jakarta')::time BETWEEN start_time AND end_time)
              OR (crosses_midnight
                  AND ((now() AT TIME ZONE 'Asia/Jakarta')::time >= start_time
                    OR (now() AT TIME ZONE 'Asia/Jakarta')::time < end_time)))
          ORDER BY start_time LIMIT 1`,
      )) as Array<{ id: string }>;
      if (row) return row.id;
      const [fallback] = (await ds.query(
        `SELECT id FROM shift_definitions WHERE deleted_at IS NULL AND is_active
          ORDER BY start_time LIMIT 1`,
      )) as Array<{ id: string }>;
      if (!fallback) throw new Error('no active shift definitions — seed the catalog first');
      return fallback.id;
    },

    async shiftDefId(name: string): Promise<string> {
      const hit = shiftDefCache.get(name);
      if (hit) return hit;
      const [row] = (await ds.query(
        `SELECT id FROM shift_definitions WHERE name = $1 AND deleted_at IS NULL LIMIT 1`,
        [name],
      )) as Array<{ id: string }>;
      if (!row) throw new Error(`Shift definition "${name}" not found — seed the catalog first.`);
      shiftDefCache.set(name, row.id);
      return row.id;
    },

    wibAt,

    async punch(o) {
      await ds.query(
        `INSERT INTO attendance_punches
           (id, user_id, punched_at, label, service_day, shift_definition_id, location_id,
            gps_lat, gps_lng, accuracy_m, outside_boundary, is_overtime,
            poor_accuracy, clock_skew_ms)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          randomUUID(),
          o.userId,
          o.at,
          o.label,
          o.serviceDay,
          o.shiftDefinitionId,
          o.locationId ?? null,
          -7.2905,
          112.7398,
          8,
          o.outsideBoundary ?? false,
          o.isOvertime ?? false,
          o.poorAccuracy ?? false,
          o.clockSkewMs ?? 0,
        ],
      );
      await projectSession(o.userId, o.serviceDay, o.shiftDefinitionId, o.isOvertime ?? false);
    },

    async schedule(o) {
      await ds.query(
        `INSERT INTO schedules (id, user_id, schedule_date, shift_definition_id, status,
                                location_id, region_id, district_id, team_category_id, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'manual')
         ON CONFLICT DO NOTHING`,
        [
          randomUUID(),
          o.userId,
          o.date,
          o.shiftDefinitionId,
          o.status ?? 'planned',
          o.locationId ?? null,
          o.regionId ?? null,
          o.districtId ?? null,
          o.teamCategoryId ?? null,
        ],
      );
    },

    async ping(o) {
      // A ping needs the session it belongs to; presence reads the newest one.
      const [shift] = (await ds.query(
        `SELECT id FROM shifts WHERE user_id = $1 ORDER BY clock_in_time DESC LIMIT 1`,
        [o.userId],
      )) as Array<{ id: string }>;
      await ds.query(
        `INSERT INTO location_logs (id, user_id, shift_id, gps_lat, gps_lng,
                                    accuracy_meters, logged_at, rejection_reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          randomUUID(),
          o.userId,
          shift?.id ?? null,
          o.lat,
          o.lng,
          o.accuracyMeters ?? 8,
          o.at,
          o.rejectionReason ?? null,
        ],
      );
    },

    async track(o) {
      // Points at the worker's OPEN session, matching what clock-in writes. A
      // row pointing at a closed shift is the phantom the monitoring guards
      // exist to reject — scenarios that want one create it explicitly.
      const [open] = (await ds.query(
        `SELECT id, shift_definition_id FROM shifts
          WHERE user_id = $1 AND clock_out_time IS NULL
          ORDER BY clock_in_time DESC LIMIT 1`,
        [o.userId],
      )) as Array<{ id: string; shift_definition_id: string | null }>;
      await ds.query(
        `INSERT INTO user_tracking_status
           (user_id, shift_id, shift_definition_id, location_id, district_id, status,
            is_within_area, last_latitude, last_longitude, last_location_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())
         ON CONFLICT (user_id) DO UPDATE SET
           shift_id = EXCLUDED.shift_id,
           shift_definition_id = EXCLUDED.shift_definition_id,
           location_id = EXCLUDED.location_id,
           district_id = EXCLUDED.district_id,
           status = EXCLUDED.status,
           is_within_area = EXCLUDED.is_within_area,
           last_latitude = EXCLUDED.last_latitude,
           last_longitude = EXCLUDED.last_longitude,
           last_location_at = EXCLUDED.last_location_at,
           updated_at = now()`,
        [
          o.userId,
          open?.id ?? null,
          open?.shift_definition_id ?? null,
          o.locationId ?? null,
          o.districtId ?? null,
          o.status ?? 'active',
          o.withinArea ?? true,
          -7.2905,
          112.7398,
          o.lastLocationAt ?? new Date(),
        ],
      );
    },
  };
}
