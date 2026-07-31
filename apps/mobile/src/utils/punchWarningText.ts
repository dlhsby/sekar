/**
 * Renders `PunchWarning` codes into the bullet lines of the pre-punch confirm
 * dialog. Kept apart from `punchWarnings.ts` so the rules stay pure (and unit
 * testable without i18n) while the copy stays in the locale files.
 */
import i18n from '../i18n/config';
import type { PunchAction, PunchWarning } from './punchWarnings';

/** `135` → `"2j 15m"` / `"2h 15m"`, reusing the shared duration keys. */
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) {
    return i18n.t('common:time.durationHoursMinutes', { count: hours, minutes: mins });
  }
  if (hours > 0) {
    return i18n.t('common:time.durationHours', { count: hours });
  }
  return i18n.t('common:time.durationMinutes', { count: mins });
}

/** One localized sentence per warning, in the order the rules produced them. */
export function formatPunchWarning(warning: PunchWarning): string {
  const { code, minutes, time, areaName } = warning;
  switch (code) {
    case 'outside_area':
      return areaName
        ? i18n.t('attendance:punchConfirm.reasons.outsideArea', { area: areaName })
        : i18n.t('attendance:punchConfirm.reasons.outsideAreaUnknown');
    case 'late':
      return minutes != null && time
        ? i18n.t('attendance:punchConfirm.reasons.late', { duration: formatDuration(minutes), time })
        : i18n.t('attendance:punchConfirm.reasons.lateUnknown');
    case 'outside_window':
      return time
        ? i18n.t('attendance:punchConfirm.reasons.outsideWindow', { time })
        : i18n.t('attendance:punchConfirm.reasons.outsideWindowUnknown');
    case 'early_leave':
      return minutes != null && time
        ? i18n.t('attendance:punchConfirm.reasons.earlyLeave', { duration: formatDuration(minutes), time })
        : i18n.t('attendance:punchConfirm.reasons.earlyLeaveUnknown');
    case 'no_schedule':
      return i18n.t('attendance:punchConfirm.reasons.noSchedule');
    default:
      return '';
  }
}

/**
 * The full dialog body: an intro line, one bullet per reason, and the closing
 * reassurance that the punch is still recorded (there is no approval step — the
 * worker is being informed, not asked for permission).
 */
export function buildPunchConfirmMessage(warnings: PunchWarning[]): string {
  const bullets = warnings.map((w) => `• ${formatPunchWarning(w)}`).join('\n');
  return [
    i18n.t('attendance:punchConfirm.intro'),
    bullets,
    i18n.t('attendance:punchConfirm.footer'),
  ].join('\n\n');
}

export function punchConfirmTitle(action: PunchAction): string {
  return action === 'clock_in'
    ? i18n.t('attendance:punchConfirm.titleClockIn')
    : i18n.t('attendance:punchConfirm.titleClockOut');
}
