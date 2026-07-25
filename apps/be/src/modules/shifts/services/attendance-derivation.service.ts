import { Injectable } from '@nestjs/common';
import { PunchLabel } from '../enums/punch-label.enum';

/**
 * The minimal shape the derivation needs from a punch. Deliberately structural
 * (not the entity) so the logic is trivially unit-testable with plain objects.
 */
export interface DerivablePunch {
  punched_at: Date;
  label: PunchLabel;
  location_id?: string | null;
  shift_definition_id?: string | null;
  gps_lat?: number | null;
  gps_lng?: number | null;
  photo_url?: string | null;
  outside_boundary?: boolean | null;
  is_overtime?: boolean | null;
}

/** One in→out interval of actual attendance. */
export interface AttendanceSegment {
  in: Date;
  out: Date;
  minutes: number;
}

/** The session a stream of punches derives to (ADR-055). */
export interface DerivedSession {
  /** The earliest clock-in punch (Jam Masuk source), or null if none. */
  firstIn: DerivablePunch | null;
  /** The clock-out punch that closed the last segment (Jam Keluar source), or null. */
  lastOut: DerivablePunch | null;
  /** Open ⟺ the last punch (by punched_at) is a clock-in. */
  isOpen: boolean;
  /** Paired in→out intervals. Redundant clock-ins while open are absorbed. */
  segments: AttendanceSegment[];
  /** Sum of segment minutes. Never `lastOut − firstIn` (that would count breaks). */
  workedMinutes: number;
  /** firstIn.punched_at — the session's Jam Masuk. */
  clockInTime: Date | null;
  /** null while open; else the last segment's clock-out — the session's Jam Keluar. */
  clockOutTime: Date | null;
}

/**
 * AttendanceDerivationService — turns an append-only punch stream into a session
 * (ADR-055). Pure + deterministic: no DB, no clock, no I/O. This is the single
 * definition of "what the punches mean", shared by the write-path projection
 * (maintaining the `shifts` row) and every reader that migrates onto punches.
 *
 * Rules (ADR-055):
 *  - Order strictly by `punched_at` (never insert/arrival order).
 *  - Jam Masuk = first clock-in; Jam Keluar = last clock-out (when closed).
 *  - Open ⟺ the last punch is a clock-in.
 *  - A clock-out closes the EARLIEST still-open clock-in, absorbing any redundant
 *    clock-ins in between (IN1, IN2, OUT1 → one segment IN1→OUT1). So after any
 *    clock-out there are zero open clock-ins, which is exactly why the last-punch
 *    rule and the segment model agree.
 *  - A clock-out with no open clock-in is ignored (the write path guards against
 *    it; the derivation is defensive so bad data can't throw).
 *  - Worked minutes = Σ segment durations, never end−start.
 */
@Injectable()
export class AttendanceDerivationService {
  deriveSession(punches: DerivablePunch[]): DerivedSession {
    const ordered = [...punches].sort((a, b) => a.punched_at.getTime() - b.punched_at.getTime());

    let firstIn: DerivablePunch | null = null;
    let lastOut: DerivablePunch | null = null;
    let openFrom: Date | null = null;
    const segments: AttendanceSegment[] = [];

    for (const punch of ordered) {
      if (punch.label === PunchLabel.CLOCK_IN) {
        if (!firstIn) firstIn = punch;
        // Only the earliest clock-in of a run opens the segment; redundant
        // clock-ins while already open are absorbed.
        if (openFrom === null) openFrom = punch.punched_at;
      } else {
        // clock_out: close the currently-open segment, if any.
        if (openFrom !== null) {
          segments.push({
            in: openFrom,
            out: punch.punched_at,
            minutes: this.minutesBetween(openFrom, punch.punched_at),
          });
          openFrom = null;
          lastOut = punch;
        }
        // else: unpaired clock-out — ignored.
      }
    }

    const isOpen = openFrom !== null;
    const workedMinutes = segments.reduce((sum, s) => sum + s.minutes, 0);

    return {
      firstIn,
      lastOut,
      isOpen,
      segments,
      workedMinutes,
      clockInTime: firstIn ? firstIn.punched_at : null,
      clockOutTime: isOpen ? null : lastOut ? lastOut.punched_at : null,
    };
  }

  /** The earliest still-open clock-in given the punches so far — the instant a
   *  new clock-out would pair back to. Used by the min-duration guard. Null when
   *  the session is currently closed (no open clock-in). */
  earliestOpenClockIn(punches: DerivablePunch[]): Date | null {
    const ordered = [...punches].sort((a, b) => a.punched_at.getTime() - b.punched_at.getTime());
    let openFrom: Date | null = null;
    for (const punch of ordered) {
      if (punch.label === PunchLabel.CLOCK_IN) {
        if (openFrom === null) openFrom = punch.punched_at;
      } else if (openFrom !== null) {
        openFrom = null;
      }
    }
    return openFrom;
  }

  private minutesBetween(start: Date, end: Date): number {
    return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  }
}
