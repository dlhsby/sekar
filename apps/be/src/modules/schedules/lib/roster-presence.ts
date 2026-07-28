/**
 * Roster presence — turning a roster row + its session into ADR-050 facts.
 *
 * The Jadwal board and the monitoring map are supposed to agree about a worker:
 * one worker, one presence reading, everywhere (ADR-050). They did not, because
 * only monitoring ever built `PresenceFacts` — roster reads returned the raw
 * `Schedule` row, whose `status` can express *planned / present / absent / leave*
 * and nothing else. Everything the presence model adds on top — on duty but
 * OUTSIDE the area, terlambat, pulang, ad-hoc — was unreachable from a roster
 * read, so five of the nine board tones were dead.
 *
 * This module is the missing translation, and it is deliberately PURE: the same
 * `derivePresenceState` engine monitoring uses, fed from a roster row instead of
 * a tracking snapshot. No new rules are invented here — a second rulebook is
 * exactly how the two surfaces drifted apart in the first place.
 */

import { ScheduleStatus } from '../entities/schedule.entity';
import {
  derivePresenceState,
  resolveShiftWindow,
  type LeaveReason,
  type LifecycleFlag,
  type LifecycleState,
} from '../../monitoring/lib/presence-lifecycle';

/**
 * Roster status → approved leave reason. A leave row IS the approval record:
 * there is no separate leave table, so the status is the only place the reason
 * lives. Anything not listed here carries no leave.
 */
const STATUS_TO_LEAVE: Partial<Record<ScheduleStatus, LeaveReason>> = {
  [ScheduleStatus.LEAVE_SICK]: 'sakit',
  [ScheduleStatus.LEAVE_ANNUAL]: 'cuti',
  [ScheduleStatus.LEAVE_PERMIT]: 'izin',
};

export function scheduleStatusToLeave(status: ScheduleStatus | string): LeaveReason {
  return STATUS_TO_LEAVE[status as ScheduleStatus] ?? 'none';
}

/**
 * Statuses that mean "this worker is expected on duty". `off` and `replaced` are
 * NOT — they are rows that exist to record that nobody is coming, so feeding
 * them in as `scheduled: true` would manufacture a no-show out of a day off.
 */
const EXPECTED_STATUSES: ReadonlySet<string> = new Set<string>([
  ScheduleStatus.PLANNED,
  ScheduleStatus.PRESENT,
  ScheduleStatus.ABSENT,
  ScheduleStatus.LEAVE_SICK,
  ScheduleStatus.LEAVE_ANNUAL,
  ScheduleStatus.LEAVE_PERMIT,
]);

/** The session facts a roster row needs; a subset of the `Shift` projection. */
export interface RosterSession {
  clock_in_time: Date | string | null;
  clock_out_time: Date | string | null;
  is_overtime?: boolean;
}

/** The shift window a roster row needs; a subset of `ShiftDefinition`. */
export interface RosterShiftWindow {
  start_time: string;
  end_time: string;
  crosses_midnight?: boolean | null;
  /** Minutes after the end before an unclosed session stops reading as live. */
  cutoff_grace_min?: number | null;
}

export interface RosterPresence {
  lifecycle_state: LifecycleState;
  lifecycle_flags: LifecycleFlag[];
  leave_reason: LeaveReason | null;
  /** True when the worker punched in without a roster row for this subject. */
  is_scheduled: boolean;
}

const asDate = (v: Date | string | null | undefined): Date | null =>
  v == null ? null : v instanceof Date ? v : new Date(v);

/**
 * Derive one row's presence.
 *
 * @param status      the roster row's status
 * @param serviceDay  `YYYY-MM-DD` the row belongs to (its WIB start day)
 * @param shift       the row's shift definition, when it has one
 * @param session     the matching `shifts` projection row, or null if never in
 * @param graceMs     late grace (`monitoring.late_grace_sec`), so "terlambat"
 *                    means the same thing here as on the monitoring map
 * @param now         evaluation instant — injected, never `new Date()` inside,
 *                    so the whole matrix is testable at a fixed clock
 * @param overtimeApproved whether an APPROVED OVERTIME session exists for this
 *                    worker + service day. Overtime is its own session
 *                    (`is_overtime`), so it is never the session matched to a
 *                    normal roster row — it has to be passed in separately, or
 *                    a worker on approved overtime is accused of forgetting to
 *                    clock out.
 */
export function deriveRosterPresence(
  status: ScheduleStatus | string,
  serviceDay: string,
  shift: RosterShiftWindow | null | undefined,
  session: RosterSession | null | undefined,
  graceMs: number,
  now: Date,
  overtimeApproved = false,
): RosterPresence {
  const leave = scheduleStatusToLeave(status);
  const scheduled = EXPECTED_STATUSES.has(status as string);

  const window =
    shift?.start_time && shift?.end_time
      ? resolveShiftWindow(
          serviceDay,
          shift.start_time,
          shift.end_time,
          shift.crosses_midnight ?? false,
        )
      : null;

  const result = derivePresenceState(
    {
      scheduled,
      clockIn: asDate(session?.clock_in_time),
      clockOut: asDate(session?.clock_out_time),
      shiftStart: window?.start ?? null,
      shiftEnd: window?.end ?? null,
      graceMs,
      // Past this, an unclosed session stops being live: a forgotten punch must
      // not keep someone "on duty" (and inside the staffing count) for days.
      cutoffGraceMs: Math.max(0, shift?.cutoff_grace_min ?? 0) * 60_000,
      // Past-end presence is `lupa_clock_out` UNLESS overtime backs it, in which
      // case ADR-050 calls it `lembur`. The flag comes from the caller because
      // overtime lives in a separate session.
      overtimeApproved: overtimeApproved || session?.is_overtime === true,
      leave,
    },
    now,
  );

  return {
    lifecycle_state: result.state,
    lifecycle_flags: result.flags,
    leave_reason: result.leaveReason,
    is_scheduled: scheduled,
  };
}

/** Session-map key. Exported so the batch loader and the reader cannot disagree. */
export function sessionKey(
  userId: string,
  serviceDay: string,
  shiftDefinitionId: string | null | undefined,
): string {
  return `${userId}|${serviceDay}|${shiftDefinitionId ?? ''}`;
}
