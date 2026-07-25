import { Injectable } from '@nestjs/common';

/**
 * One shift a clock-in could be attributed to, on a specific service-day.
 * Times are the shift-definition's; `service_day` is the shift's START date (WIB)
 * — for a crossing shift the after-midnight tail still belongs to the start date.
 */
export interface AttributionCandidate {
  shift_definition_id: string;
  service_day: string; // YYYY-MM-DD (WIB), the shift's start date
  start_time: string; // 'HH:MM' or 'HH:MM:SS'
  end_time: string;
  crosses_midnight: boolean;
  early_window_min: number;
  cutoff_grace_min: number;
  // Display fields for the mobile shift picker (optional — the resolver ignores them).
  shift_name?: string;
  shift_code?: string;
}

/** Where `now` falls relative to a candidate's window. */
export type AttributionPhase = 'early' | 'covering' | 'grace';

export interface AttributionMatch {
  candidate: AttributionCandidate;
  phase: AttributionPhase;
  /** Minutes from `now` to the shift's start (negative = already started). */
  minutesToStart: number;
}

/**
 * ShiftAttributionService — decides which shift-definition (and service-day) a
 * clock-in near a shift boundary belongs to (ADR-055 attribution window). Pure +
 * deterministic (no DB, no wall clock): callers pass the worker's candidate
 * rows + the current WIB instant.
 *
 * A candidate's window is `[start − early_window, end + cutoff_grace]`. Within it
 * the punch is attributable; past `end + cutoff_grace` the shift drops out (a
 * still-open session becomes a dangling `lupa_clock_out`). Matches are ranked so
 * the most likely shift is first — this both picks the default attribution and
 * feeds the mobile shift picker:
 *   1. `covering` (now inside the shift) beats `early`/`grace`
 *   2. `early` (about to start) beats `grace` (already ended)
 *   3. ties break toward the shift whose start is nearest `now`.
 */
@Injectable()
export class ShiftAttributionService {
  /** All attributable candidates, best-first. Empty when none is in window. */
  resolveAll(candidates: AttributionCandidate[], nowWib: Date): AttributionMatch[] {
    const nowMs = nowWib.getTime();
    const matches: AttributionMatch[] = [];

    for (const c of candidates) {
      const startMs = this.wibInstant(c.service_day, c.start_time);
      const durationMin = this.durationMinutes(c.start_time, c.end_time, c.crosses_midnight);
      const endMs = startMs + durationMin * 60_000;
      const earlyMs = startMs - c.early_window_min * 60_000;
      const graceMs = endMs + c.cutoff_grace_min * 60_000;

      if (nowMs < earlyMs || nowMs >= graceMs) continue;

      const phase: AttributionPhase =
        nowMs < startMs ? 'early' : nowMs < endMs ? 'covering' : 'grace';
      matches.push({
        candidate: c,
        phase,
        minutesToStart: Math.round((startMs - nowMs) / 60_000),
      });
    }

    const rank: Record<AttributionPhase, number> = { covering: 0, early: 1, grace: 2 };
    return matches.sort((a, b) => {
      if (rank[a.phase] !== rank[b.phase]) return rank[a.phase] - rank[b.phase];
      // Nearest start first (absolute distance).
      return Math.abs(a.minutesToStart) - Math.abs(b.minutesToStart);
    });
  }

  /** The single best attribution, or null when nothing is in window. */
  resolveBest(candidates: AttributionCandidate[], nowWib: Date): AttributionMatch | null {
    return this.resolveAll(candidates, nowWib)[0] ?? null;
  }

  /** WIB wall-clock `YYYY-MM-DD` + `HH:MM[:SS]` as a UTC-framed instant, matching
   *  `TimezoneUtil.jakartaNow()` (which returns WIB wall-clock in UTC fields). */
  private wibInstant(serviceDay: string, time: string): number {
    const hms = time.length === 5 ? `${time}:00` : time;
    return new Date(`${serviceDay}T${hms}Z`).getTime();
  }

  private durationMinutes(startTime: string, endTime: string, crossesMidnight: boolean): number {
    const min = (t: string): number => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const start = min(startTime);
    const end = min(endTime) + (crossesMidnight ? 24 * 60 : 0);
    return Math.max(0, end - start);
  }
}
