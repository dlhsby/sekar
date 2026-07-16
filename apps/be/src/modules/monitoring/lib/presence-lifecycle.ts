/**
 * Presence lifecycle — the pure derivation at the heart of ADR-050.
 *
 * A worker's attendance state for one **service day** is a pure function of a few
 * facts (schedule + clock in/out + the shift window + now) — nothing is stored,
 * so it cannot drift the way the 5.3 status enum did. Only `bertugas` is ever a
 * live map pin; the other five live in the roster / today's-history panel.
 *
 * The engine works on **resolved instants** (real `Date`s), not `HH:mm` strings:
 * once the shift window is resolved for the service day (cross-midnight applied),
 * "is he late", "past his end", "before his start" are ordinary timestamp
 * comparisons that are automatically correct for shift 3. Resolve the window with
 * {@link resolveShiftWindow}; the caller owns turning DB rows into these facts.
 *
 * Tested against `specs/testing/presence-model-matrix.md` Layers 1 / G / X.
 */

export type LifecycleState =
  | 'tidak_bertugas' // not scheduled today (incl. approved libur/cuti)
  | 'belum_hadir' // scheduled, not yet in, still inside the arrival window
  | 'terlambat' // scheduled, past start+grace, still not in
  | 'bertugas' // clocked in, not out — the only live state
  | 'pulang' // clocked out (voluntary)
  | 'tidak_hadir'; // scheduled, window ended, never in

export type LifecycleFlag =
  | 'is_late' // clocked in after start + grace
  | 'ad_hoc' // clocked in without a schedule for this subject
  | 'lupa_clock_out' // still clocked in past the shift's real end, no overtime
  | 'lembur' // still clocked in past end WITH approved overtime
  | 'early' // clocked out before the shift's real end
  | 'excused'; // an approved leave reason stands behind the absence

export type LeaveReason = 'none' | 'cuti' | 'sakit' | 'izin' | 'libur';

export interface PresenceFacts {
  /** Does an occurrence exist for this worker on this service day? */
  scheduled: boolean;
  /** Clock-in instant, or null if never clocked in today. */
  clockIn: Date | null;
  /** Clock-out instant, or null if still on shift (or never in). */
  clockOut: Date | null;
  /** Resolved shift start instant for this service day; null when unscheduled. */
  shiftStart: Date | null;
  /** Resolved shift end instant (cross-midnight already applied); null when unscheduled. */
  shiftEnd: Date | null;
  /** Grace after start before "late", in ms. Caller resolves per-shift/global default. */
  graceMs: number;
  /** An approved overtime record extends the shift — the only thing that makes past-end presence lembur. */
  overtimeApproved: boolean;
  /** Approved leave reason for today, if any. */
  leave: LeaveReason;
}

export interface PresenceResult {
  state: LifecycleState;
  flags: LifecycleFlag[];
  /** The excused reason, when one applies; null otherwise. */
  leaveReason: LeaveReason | null;
}

/** A clocked-in worker is late when their clock-in lands after start + grace. */
export function isClockInLate(clockIn: Date, shiftStart: Date, graceMs: number): boolean {
  return clockIn.getTime() > shiftStart.getTime() + graceMs;
}

/**
 * Derive the lifecycle state (+ flags) from the day's facts. First-match order,
 * overrides first — mirrors ADR-050's decision table.
 */
export function derivePresenceState(facts: PresenceFacts, now: Date): PresenceResult {
  const flags: LifecycleFlag[] = [];

  // 1. Clocked in, not out → the live state. Ad-hoc / late / past-end are facets
  //    OF being on duty, so they are flags, not separate states.
  if (facts.clockIn && !facts.clockOut) {
    if (!facts.scheduled) flags.push('ad_hoc');
    if (facts.shiftStart && isClockInLate(facts.clockIn, facts.shiftStart, facts.graceMs)) {
      flags.push('is_late');
    }
    if (facts.shiftEnd && now.getTime() > facts.shiftEnd.getTime()) {
      // Lembur is EXPLICIT only. Past-end presence WITHOUT an approved overtime
      // record is a forgotten clock-out, never auto-inferred overtime.
      flags.push(facts.overtimeApproved ? 'lembur' : 'lupa_clock_out');
    }
    return { state: 'bertugas', flags, leaveReason: null };
  }

  // 2. Clocked in AND out → done for the day.
  if (facts.clockIn && facts.clockOut) {
    if (facts.shiftEnd && facts.clockOut.getTime() < facts.shiftEnd.getTime()) {
      flags.push('early');
    }
    return { state: 'pulang', flags, leaveReason: null };
  }

  // ── Not clocked in ──────────────────────────────────────────────────────
  // 3. Approved leave overrides the time-based derivation. A whole-day off
  //    (cuti/libur) reads as off-duty; sick/permit is an excused no-show.
  if (facts.leave === 'cuti' || facts.leave === 'libur') {
    return { state: 'tidak_bertugas', flags: ['excused'], leaveReason: facts.leave };
  }
  if (facts.leave === 'sakit' || facts.leave === 'izin') {
    return { state: 'tidak_hadir', flags: ['excused'], leaveReason: facts.leave };
  }

  // 4. Not scheduled and no leave → simply off duty, not on the map.
  if (!facts.scheduled) {
    return { state: 'tidak_bertugas', flags, leaveReason: null };
  }

  // 5. Scheduled, no leave, not clocked in → where in the window are we?
  if (facts.shiftStart && now.getTime() < facts.shiftStart.getTime() + facts.graceMs) {
    return { state: 'belum_hadir', flags, leaveReason: null };
  }
  if (facts.shiftEnd && now.getTime() < facts.shiftEnd.getTime()) {
    return { state: 'terlambat', flags, leaveReason: null };
  }
  // At or past the end with no clock-in → the accountable no-show.
  return { state: 'tidak_hadir', flags, leaveReason: null };
}

/**
 * Resolve a shift definition's `HH:mm[:ss]` window to real instants for one
 * WIB service day. WIB (UTC+7, no DST) is a fixed offset, so an ISO string with
 * `+07:00` is exact. A midnight-crossing shift's end lands on the next day.
 *
 * @param serviceDate `YYYY-MM-DD` — the day the shift belongs to (its start day).
 */
export function resolveShiftWindow(
  serviceDate: string,
  startTime: string,
  endTime: string,
  crossesMidnight: boolean,
): { start: Date; end: Date } {
  const start = wibInstant(serviceDate, startTime);
  let end = wibInstant(serviceDate, endTime);
  if (crossesMidnight) {
    end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  }
  return { start, end };
}

/** `YYYY-MM-DD` + `HH:mm[:ss]` interpreted as WIB wall-clock → UTC instant. */
function wibInstant(date: string, time: string): Date {
  const hms = time.length === 5 ? `${time}:00` : time; // accept HH:mm or HH:mm:ss
  return new Date(`${date}T${hms}+07:00`);
}
