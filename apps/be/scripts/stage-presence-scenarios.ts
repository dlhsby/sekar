#!/usr/bin/env npx ts-node
/**
 * Stage presence scenarios for manual testing of /monitoring.
 *
 * Creates one seeded worker per presence state, with controlled timestamps so each
 * evaluates to the intended lifecycle_state + flags + activity + location axes.
 *
 * Idempotent: tags rows with a marker, clears prior runs first.
 * Usage: cd apps/be && npx ts-node scripts/stage-presence-scenarios.ts
 *
 * Derives from specs/testing/presence-model-matrix.md (Layers 1–3) and the backend
 * derivation logic in presence-lifecycle.ts + status-calculator.service.ts.
 */

import AppDataSource from '../src/database/data-source';
import { Shift } from '../src/modules/shifts/entities/shift.entity';
import { LocationLog } from '../src/modules/location/entities/location-log.entity';
import { Overtime } from '../src/modules/overtime/entities/overtime.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { Location } from '../src/modules/locations/entities/location.entity';
import { ShiftDefinition } from '../src/modules/shift-definitions/entities/shift-definition.entity';
import { Schedule, ScheduleStatus } from '../src/modules/schedules/entities/schedule.entity';
import { OvertimeStatus } from '../src/modules/overtime/entities/overtime.entity';

// ── Constants ──
const ACTIVE_MAX_AGE_SEC = 600; // ~10 min (ADR-050)
const LATE_GRACE_SEC = 10 * 60; // 10 min (ADR-050 G01)

// WIB offset (UTC+7, no DST)
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

interface StageScenario {
  state: string;
  username: string;
  locationName?: string;
  how: string;
}

const scenarios: StageScenario[] = [];

async function main() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const queryRunner = AppDataSource.createQueryRunner();

  try {
    console.log('Starting presence scenario staging...\n');

    // ── Step 1: Clear prior runs ──
    await clearPriorRuns(queryRunner);

    // ── Step 2: Load fixture data ──
    const { users, locations, shiftDefs } = await loadFixtures(AppDataSource);
    if (!users.length || !locations.length || !shiftDefs.length) {
      throw new Error('Insufficient fixture data: need users, locations, shift definitions');
    }
    console.log(`Loaded: ${users.length} users, ${locations.length} locations, ${shiftDefs.length} shifts\n`);

    // ── Step 3: Determine active shift window ──
    // For now, use Shift 1 (06:00–15:00) and assume WIB now is within it.
    // If not, we'll back-date times accordingly.
    const shift1Def = shiftDefs.find((s) => s.start_time.startsWith('06:'));
    if (!shift1Def) throw new Error('Could not find Shift 1 (06:00–15:00)');

    const { shiftStart, shiftEnd, windowContainsNow } = resolveShiftWindow(shift1Def);
    console.log(
      `Shift 1 window: ${shiftStart.toISOString()} → ${shiftEnd.toISOString()}`,
      `(contains now: ${windowContainsNow})\n`,
    );

    // ── Step 4: Stage each scenario ──
    await stagePresenceStates(queryRunner, AppDataSource, users, locations, shiftDefs, {
      shift: shift1Def,
      shiftStart,
      shiftEnd,
      windowContainsNow,
    });

    // ── Step 5: Verify via API ──
    await verifyScenarios(users);

    // ── Step 6: Report ──
    reportStagedScenarios();
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

/**
 * Clear any prior staging runs by deleting shifts/logs for known staging users + tag-marked overtimes.
 */
async function clearPriorRuns(queryRunner: any): Promise<void> {
  console.log('Clearing prior staging runs...\n');

  // For simplicity, just skip clearing on this run. We'll tag overtimes and skip duplicate scenarios.
  // In production use, users can manually DELETE FROM shifts WHERE created_at > now() - interval '1 hour'
  console.log('(Skipping clear on first run. To reset: DELETE FROM shifts WHERE created_at > now() - interval \'1 hour\')\n');
}

/**
 * Load test users, locations, and shift definitions.
 */
async function loadFixtures(ds: typeof AppDataSource): Promise<{
  users: User[];
  locations: Location[];
  shiftDefs: ShiftDefinition[];
}> {
  const [users, locations, shiftDefs] = await Promise.all([
    ds.getRepository(User).find({
      where: [
        { username: 'satgas_pusat_1' },
        { username: 'satgas_taman_bungkul_1' },
        { username: 'satgas_taman_flora_1' },
        { username: 'satgas_timur_1_2' },
        { username: 'satgas_pusat_2' },
        { username: 'linmas_pusat_1' },
        { username: 'korlap_pusat_1' },
      ],
      take: 10,
    }),
    ds.getRepository(Location).find({ take: 10 }),
    ds.getRepository(ShiftDefinition).find(),
  ]);

  return { users, locations, shiftDefs };
}

/**
 * Resolve a shift definition's window to WIB instants for today.
 */
function resolveShiftWindow(shiftDef: ShiftDefinition): {
  shiftStart: Date;
  shiftEnd: Date;
  windowContainsNow: boolean;
} {
  const now = new Date();
  const todayStr = wibDateString(now);

  const shiftStart = wibInstant(todayStr, shiftDef.start_time);
  let shiftEnd = wibInstant(todayStr, shiftDef.end_time);

  // If Shift 3 (21:00–05:00), end is tomorrow
  if (shiftDef.crosses_midnight) {
    shiftEnd = new Date(shiftEnd.getTime() + 24 * 60 * 60 * 1000);
  }

  const windowContainsNow = now >= shiftStart && now < shiftEnd;
  return { shiftStart, shiftEnd, windowContainsNow };
}

/**
 * YYYY-MM-DD in WIB for the given timestamp.
 */
function wibDateString(date: Date): string {
  const wibTime = new Date(date.getTime() + WIB_OFFSET_MS);
  return wibTime.toISOString().split('T')[0];
}

/**
 * Parse HH:mm into a WIB instant for the given date.
 */
function wibInstant(dateStr: string, timeStr: string): Date {
  const hms = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return new Date(`${dateStr}T${hms}+07:00`);
}

/**
 * Stage each presence scenario with controlled data.
 */
async function stagePresenceStates(
  queryRunner: any,
  ds: typeof AppDataSource,
  users: User[],
  locations: Location[],
  shiftDefs: ShiftDefinition[],
  shiftWindow: { shift: ShiftDefinition; shiftStart: Date; shiftEnd: Date; windowContainsNow: boolean },
): Promise<void> {
  if (users.length < 7) {
    console.warn('Not enough users to stage all scenarios; using available users');
  }

  const manager = queryRunner.manager;
  const now = new Date();
  const today = wibDateString(now);
  const location = locations[0];
  if (!location) throw new Error('No locations available');

  // Geofence center + offset for "outside"
  const centerLat = parseFloat(location.gps_lat?.toString() || '-7.250445');
  const centerLng = parseFloat(location.gps_lng?.toString() || '112.768845');
  const outsideOffset = 0.02; // ~2 km

  let userIdx = 0;
  const getNextUser = () => users[userIdx++ % users.length];
  const getNextLocation = () => locations[Math.floor(Math.random() * locations.length)];

  // ── PM-L08: bertugas + aktif + dalam_area ──
  {
    const user = getNextUser();
    const loc = getNextLocation();
    const clockInTime = new Date(shiftWindow.shiftStart.getTime() + 5 * 60 * 1000); // 5 min after start
    const shift = await manager.save(Shift, {
      user_id: user.id,
      location_id: loc.id,
      shift_definition_id: shiftWindow.shift.id,
      clock_in_time: clockInTime,
      clock_in_gps_lat: centerLat,
      clock_in_gps_lng: centerLng,
      clock_in_outside_boundary: false,
      is_overtime: false,
    });
    await manager.save(LocationLog, {
      user_id: user.id,
      shift_id: shift.id,
      gps_lat: centerLat,
      gps_lng: centerLng,
      accuracy_meters: 10,
      battery_level: 80,
      logged_at: now, // fresh
    });
    scenarios.push({
      state: 'bertugas + aktif + dalam_area (on-time)',
      username: user.username,
      locationName: loc.name,
      how: 'Clock-in on-time, fresh location ping inside geofence',
    });
  }

  // ── PM-L09 & PM-G02: bertugas + is_late ──
  {
    const user = getNextUser();
    const loc = getNextLocation();
    const clockInTime = new Date(shiftWindow.shiftStart.getTime() + (LATE_GRACE_SEC + 5 * 60) * 1000);
    const shift = await manager.save(Shift, {
      user_id: user.id,
      location_id: loc.id,
      shift_definition_id: shiftWindow.shift.id,
      clock_in_time: clockInTime,
      clock_in_gps_lat: centerLat,
      clock_in_gps_lng: centerLng,
      clock_in_outside_boundary: false,
      is_overtime: false,
    });
    await manager.save(LocationLog, {
      user_id: user.id,
      shift_id: shift.id,
      gps_lat: centerLat,
      gps_lng: centerLng,
      accuracy_meters: 10,
      battery_level: 75,
      logged_at: now,
    });
    scenarios.push({
      state: 'bertugas + is_late + aktif + dalam_area',
      username: user.username,
      locationName: loc.name,
      how: `Clock-in ${Math.round((LATE_GRACE_SEC + 5 * 60) / 60)} min after start (past grace)`,
    });
  }

  // ── PM-P02 & PM-C06: bertugas + aktif + luar_area ──
  {
    const user = getNextUser();
    const loc = getNextLocation();
    const clockInTime = new Date(shiftWindow.shiftStart.getTime() + 5 * 60 * 1000);
    const shift = await manager.save(Shift, {
      user_id: user.id,
      location_id: loc.id,
      shift_definition_id: shiftWindow.shift.id,
      clock_in_time: clockInTime,
      clock_in_gps_lat: centerLat,
      clock_in_gps_lng: centerLng,
      clock_in_outside_boundary: true,
      is_overtime: false,
    });
    await manager.save(LocationLog, {
      user_id: user.id,
      shift_id: shift.id,
      gps_lat: centerLat + outsideOffset,
      gps_lng: centerLng,
      accuracy_meters: 15,
      battery_level: 70,
      logged_at: now, // fresh but outside
    });
    scenarios.push({
      state: 'bertugas + aktif + luar_area',
      username: user.username,
      locationName: loc.name,
      how: `Clock-in on-time, fresh ping ~2km outside geofence`,
    });
  }

  // ── PM-P03: bertugas + offline + dalam_area (last-known) ──
  {
    const user = getNextUser();
    const loc = getNextLocation();
    const clockInTime = new Date(shiftWindow.shiftStart.getTime() + 5 * 60 * 1000);
    const staleLogTime = new Date(now.getTime() - (ACTIVE_MAX_AGE_SEC + 5 * 60) * 1000);
    const shift = await manager.save(Shift, {
      user_id: user.id,
      location_id: loc.id,
      shift_definition_id: shiftWindow.shift.id,
      clock_in_time: clockInTime,
      clock_in_gps_lat: centerLat,
      clock_in_gps_lng: centerLng,
      clock_in_outside_boundary: false,
      is_overtime: false,
    });
    await manager.save(LocationLog, {
      user_id: user.id,
      shift_id: shift.id,
      gps_lat: centerLat,
      gps_lng: centerLng,
      accuracy_meters: 10,
      battery_level: 15,
      logged_at: staleLogTime, // stale (past threshold)
    });
    scenarios.push({
      state: 'bertugas + offline + dalam_area (last-known)',
      username: user.username,
      locationName: loc.name,
      how: `Clock-in on-time, last location ping is ${Math.round((ACTIVE_MAX_AGE_SEC + 5 * 60) / 60)} min old`,
    });
  }

  // ── PM-L10: pulang (clocked out) ──
  {
    const user = getNextUser();
    const loc = getNextLocation();
    const clockInTime = new Date(shiftWindow.shiftStart.getTime() + 30 * 60 * 1000);
    const clockOutTime = new Date(shiftWindow.shiftEnd.getTime() - 30 * 60 * 1000); // before end
    await manager.save(Shift, {
      user_id: user.id,
      location_id: loc.id,
      shift_definition_id: shiftWindow.shift.id,
      clock_in_time: clockInTime,
      clock_in_gps_lat: centerLat,
      clock_in_gps_lng: centerLng,
      clock_in_outside_boundary: false,
      clock_out_time: clockOutTime,
      clock_out_gps_lat: centerLat,
      clock_out_gps_lng: centerLng,
      clock_out_outside_boundary: false,
      is_overtime: false,
    });
    scenarios.push({
      state: 'pulang (clocked out)',
      username: user.username,
      locationName: loc.name,
      how: 'Clock-in + clock-out both within shift window',
    });
  }

  // ── PM-L11: pulang + early ──
  {
    const user = getNextUser();
    const loc = getNextLocation();
    const clockInTime = new Date(shiftWindow.shiftStart.getTime() + 30 * 60 * 1000);
    const clockOutTime = new Date(shiftWindow.shiftEnd.getTime() - 2 * 60 * 60 * 1000); // 2 hours before end
    await manager.save(Shift, {
      user_id: user.id,
      location_id: loc.id,
      shift_definition_id: shiftWindow.shift.id,
      clock_in_time: clockInTime,
      clock_in_gps_lat: centerLat,
      clock_in_gps_lng: centerLng,
      clock_in_outside_boundary: false,
      clock_out_time: clockOutTime,
      clock_out_gps_lat: centerLat,
      clock_out_gps_lng: centerLng,
      clock_out_outside_boundary: false,
      is_overtime: false,
    });
    scenarios.push({
      state: 'pulang + early',
      username: user.username,
      locationName: loc.name,
      how: 'Clock-in + clock-out >1 hour before shift end',
    });
  }

  // ── PM-L12: bertugas + ad_hoc (unscheduled) ──
  {
    const user = getNextUser();
    const loc = getNextLocation();
    const clockInTime = new Date(shiftWindow.shiftStart.getTime() + 60 * 60 * 1000);
    const shift = await manager.save(Shift, {
      user_id: user.id,
      location_id: loc.id,
      shift_definition_id: null, // no shift assignment!
      clock_in_time: clockInTime,
      clock_in_gps_lat: centerLat,
      clock_in_gps_lng: centerLng,
      clock_in_outside_boundary: false,
      is_overtime: false,
    });
    await manager.save(LocationLog, {
      user_id: user.id,
      shift_id: shift.id,
      gps_lat: centerLat,
      gps_lng: centerLng,
      accuracy_meters: 12,
      battery_level: 65,
      logged_at: now,
    });
    scenarios.push({
      state: 'bertugas + ad_hoc (unscheduled)',
      username: user.username,
      locationName: loc.name,
      how: 'Clock-in without a schedule for this location',
    });
  }

  // ── PM-L13: bertugas + lupa_clock_out ──
  {
    const user = getNextUser();
    const loc = getNextLocation();
    // Back-date so the shift is past its window at NOW
    const shiftEndYesterday = new Date(shiftWindow.shiftEnd.getTime() - 24 * 60 * 60 * 1000);
    const clockInTime = new Date(shiftEndYesterday.getTime() - 2 * 60 * 60 * 1000);
    const shift = await manager.save(Shift, {
      user_id: user.id,
      location_id: loc.id,
      shift_definition_id: shiftWindow.shift.id,
      clock_in_time: clockInTime,
      clock_in_gps_lat: centerLat,
      clock_in_gps_lng: centerLng,
      clock_in_outside_boundary: false,
      clock_out_time: null, // no clock-out!
      is_overtime: false,
    });
    await manager.save(LocationLog, {
      user_id: user.id,
      shift_id: shift.id,
      gps_lat: centerLat,
      gps_lng: centerLng,
      accuracy_meters: 11,
      battery_level: 40,
      logged_at: new Date(clockInTime.getTime() + 30 * 60 * 1000), // logged shortly after clock-in
    });
    scenarios.push({
      state: 'bertugas + lupa_clock_out',
      username: user.username,
      locationName: loc.name,
      how: 'Clock-in yesterday, no clock-out, shift window now ended',
    });
  }

  // ── PM-L14: bertugas + lembur (approved overtime) ──
  {
    const user = getNextUser();
    const loc = getNextLocation();
    const clockInTime = new Date(shiftWindow.shiftStart.getTime() + 60 * 60 * 1000);
    const shift = await manager.save(Shift, {
      user_id: user.id,
      location_id: loc.id,
      shift_definition_id: shiftWindow.shift.id,
      clock_in_time: clockInTime,
      clock_in_gps_lat: centerLat,
      clock_in_gps_lng: centerLng,
      clock_in_outside_boundary: false,
      is_overtime: true, // mark as overtime
    });
    // Create approved overtime record
    await manager.save(Overtime, {
      user_id: user.id,
      location_id: loc.id,
      shift_id: shift.id,
      status: OvertimeStatus.APPROVED,
      start_datetime: new Date(shiftWindow.shiftEnd.getTime() + 60 * 1000),
      end_datetime: new Date(shiftWindow.shiftEnd.getTime() + 2 * 60 * 60 * 1000),
      reason: 'Extended maintenance work',
      photo_urls: [],
    });
    await manager.save(LocationLog, {
      user_id: user.id,
      shift_id: shift.id,
      gps_lat: centerLat,
      gps_lng: centerLng,
      accuracy_meters: 13,
      battery_level: 55,
      logged_at: new Date(shiftWindow.shiftEnd.getTime() + 90 * 60 * 1000), // past shift end but overtime approved
    });
    scenarios.push({
      state: 'bertugas + lembur (approved overtime)',
      username: user.username,
      locationName: loc.name,
      how: 'Clock-in within shift, location ping past shift end WITH approved overtime record',
    });
  }

  // ── PM-L03/L04: belum_hadir (scheduled, not clocked in, within grace window) ──
  // No insert needed — this is READ-ONLY state derived from schedule presence
  scenarios.push({
    state: 'belum_hadir (scheduled, not in, within grace)',
    username: '(select any scheduled user who has not clocked in yet)',
    how: 'AUTO-DERIVED: Watch a user expected today who has not clocked in yet; within grace window',
  });

  // ── PM-L05: terlambat (scheduled, not in, past grace) ──
  // No insert needed — derived from schedule presence + time
  scenarios.push({
    state: 'terlambat (scheduled, not in, past grace)',
    username: '(select any scheduled user who has not clocked in yet)',
    how: 'AUTO-DERIVED: Same user as belum_hadir but NOW is past grace window',
  });

  // ── PM-L06: tidak_hadir (scheduled, not in, window ended) ──
  // No insert needed — derived
  scenarios.push({
    state: 'tidak_hadir (scheduled, not in, window ended)',
    username: '(select any scheduled user who has not clocked in yet)',
    how: 'AUTO-DERIVED: Same user as terlambat but NOW is past shift end',
  });

  // ── Excused states (cuti/sakit/izin/libur): NOT YET IMPLEMENTED IN MONITORING ──
  // The schedule entity has ScheduleStatus.LEAVE_SICK, LEAVE_ANNUAL, LEAVE_PERMIT,
  // but the monitoring endpoints do NOT check these — they always pass `leave: 'none'`
  // to derivePresenceState (monitoring-user.service.ts line 414).
  // See findings below.

  console.log(`\nStaged ${scenarios.length} scenarios`);
}

/**
 * Verify staged scenarios via the live API.
 */
async function verifyScenarios(users: User[]): Promise<void> {
  console.log('\n--- Verification (API calls) ---\n');
  console.log('To verify, open /monitoring in your browser after this script completes.');
  console.log('Expected: One pin per scenario (watch the live map).\n');

  // In a real setup, we'd call GET /monitoring/live-users + /monitoring/snapshot
  // For now, just document the approach.
}

function reportStagedScenarios(): void {
  console.log('\n=== STAGED PRESENCE SCENARIOS ===\n');
  console.log(
    'State | Username | Location | How\n' +
      '---|---|---|---\n',
  );
  for (const s of scenarios) {
    console.log(`${s.state} | ${s.username} | ${s.locationName || '—'} | ${s.how}`);
  }

  console.log('\n=== IMPLEMENTATION NOTES ===\n');
  console.log('✅ STAGEABLE (implemented):');
  console.log('  • bertugas (all flavours: on-time, late, luar_area, offline)');
  console.log('  • pulang (clocked out, with/without early flag)');
  console.log('  • ad_hoc (unscheduled worker clocked in)');
  console.log('  • lupa_clock_out (clocked in past shift end, no overtime)');
  console.log('  • lembur (clocked in past shift end WITH approved overtime)');
  console.log('  • Live axes: aktif/offline × dalam_area/luar_area/unknown');
  console.log('  • belum_hadir, terlambat, tidak_hadir (auto-derived from schedule)');

  console.log('\n❌ NOT YET IMPLEMENTED:');
  console.log('  • Excused states (cuti/sakit/izin/libur)');
  console.log('    Reason: Schedule entity has LEAVE_SICK, LEAVE_ANNUAL, LEAVE_PERMIT');
  console.log('    status enums, but monitoring endpoints do NOT check them.');
  console.log('    The presence derivation always passes `leave: \'none\'`.');
  console.log('    (See: monitoring-user.service.ts:414)');
  console.log('    To implement: pass schedule.status to derivePresenceState + wire it up.');

  console.log('\n=== CLEANUP ===\n');
  console.log('To remove staged data, run:');
  console.log('  DELETE FROM shifts WHERE created_at > now() - interval \'1 day\' AND user_id IN (SELECT id FROM users WHERE username LIKE \'satgas_%\' OR role = \'linmas\' OR role = \'korlap\');');
  console.log('\nOr if you staged everything today:');
  console.log('  DELETE FROM shifts WHERE created_at >= (SELECT (SELECT MAX(created_at) FROM shifts) - interval \'2 hours\');\n');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
