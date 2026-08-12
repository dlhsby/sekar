/**
 * Lifecycle pills (ADR-050 axis 1 + its flags) — the web twin of mobile's
 * `lifecycleFlagPills` / `lifecycleStatePill` in `utils/statusHelpers.ts`.
 *
 * Same inputs, same ordering, same precedence, so the same worker never reads
 * one set of pills on a phone and another on the dashboard. Only the tone
 * vocabulary differs: mobile has five StatusTones, web has the nine-tone
 * {@link presenceTone} standard, and each platform maps through its own.
 *
 * Two rules worth stating, because reading only the flags array gets them wrong:
 *
 *  - **Either source counts.** The backend sets `is_late` / `is_scheduled` as
 *    booleans AND mirrors them into `lifecycle_flags`. Both are honoured, as
 *    mobile does — a payload carrying only the boolean must still show the pill.
 *  - **Leave outranks the lifecycle.** An excused absence is rendered by its
 *    reason (cuti / sakit / izin / libur), never as a bare `tidak_hadir`, or an
 *    approved leave reads on screen as a no-show.
 */
import { presenceTone, type PresenceTone } from '@/lib/presence/tone';

export interface LifecycleFacts {
  lifecycle_state?: string | null;
  lifecycle_flags?: string[] | null;
  is_late?: boolean;
  is_scheduled?: boolean;
  is_within_area?: boolean | null;
  leave_reason?: 'cuti' | 'sakit' | 'izin' | 'libur' | null;
}

export interface LifecyclePill {
  tone: PresenceTone;
  /** i18n key — callers translate, so this module stays free of React context. */
  labelKey: string;
}

/**
 * The decorating flags: terlambat → luar jadwal → lembur → lupa clock-out.
 * Returns [] for a plain, on-time, scheduled worker.
 */
export function lifecycleFlagPills(w: LifecycleFacts): LifecyclePill[] {
  const flags = new Set(w.lifecycle_flags ?? []);
  const pills: LifecyclePill[] = [];
  if (w.is_late || flags.has('is_late')) {
    pills.push({ tone: 'orange', labelKey: 'monitoring:lifecycle.late' });
  }
  if (w.is_scheduled === false || flags.has('ad_hoc')) {
    pills.push({ tone: 'purple', labelKey: 'monitoring:lifecycle.luarJadwal' });
  }
  if (flags.has('lembur')) {
    pills.push({ tone: 'blue', labelKey: 'monitoring:lifecycle.lembur' });
  }
  if (flags.has('lupa_clock_out')) {
    pills.push({ tone: 'red', labelKey: 'monitoring:lifecycle.lupaClockOut' });
  }
  return pills;
}

/**
 * The lifecycle axis itself — where the worker sits in the day, as distinct from
 * the flags decorating it. Null when no lifecycle has been derived.
 */
export function lifecycleStatePill(w: LifecycleFacts): LifecyclePill | null {
  const state = w.lifecycle_state;
  if (!state) return null;
  if (w.leave_reason) {
    return { tone: 'blue', labelKey: `monitoring:lifecycle.leave.${w.leave_reason}` };
  }
  return {
    // Tone comes from the shared standard rather than a second hand-rolled
    // switch that could drift from the board and the schedule cards.
    tone: presenceTone({
      lifecycleState: state,
      isWithinArea: w.is_within_area,
      isAdHoc: w.is_scheduled === false,
    }),
    labelKey: `monitoring:lifecycle.state.${state}`,
  };
}
