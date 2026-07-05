/**
 * SLA urgency derivation for pruning requests.
 *
 * Permohonan perantingan has NO SLA column in the DB — urgency is derived at
 * render time from how long an *open* request has been waiting (since
 * `createdAt`). The review queue surfaces the longest-waiting requests, so the
 * mapping is "longer wait → more urgent": fresh requests are calm (neutral),
 * aging ones warn, overdue ones go red.
 *
 * Only the two open/actionable statuses get a tag (`submitted`,
 * `under_review`); once a request is approved/rejected/assigned/etc. the clock
 * is moot and no tag is shown.
 *
 * The result is rendered as a `StatusPill` via `ListItemCard`'s `extraTag`
 * slot — the shared card primitive stays untouched (no row-tint).
 */

import type { StatusTone } from '../../../components/home/StatusPill';
import type { PruningRequest, PruningRequestStatus } from '../../../types/models.types';

export interface SlaTag {
  tone: StatusTone;
  label: string;
}

/** Statuses still awaiting an admin decision — the only ones with a live SLA. */
const OPEN_STATUSES: ReadonlyArray<PruningRequestStatus> = ['submitted', 'under_review'];

const MS_PER_HOUR = 3_600_000;
const WARN_AFTER_HOURS = 6;
const OVERDUE_AFTER_HOURS = 24;

/**
 * Derive the SLA-urgency tag for a pruning request, or `null` when none applies
 * (closed status, or an unparseable `createdAt`).
 *
 * @param request the pruning request
 * @param now     epoch ms "current time" — injectable so tests stay deterministic
 */
export function pruningSlaTag(
  request: Pick<PruningRequest, 'status' | 'createdAt'>,
  now: number = Date.now(),
): SlaTag | null {
  if (!OPEN_STATUSES.includes(request.status)) {
    return null;
  }

  const created = new Date(request.createdAt).getTime();
  if (Number.isNaN(created)) {
    return null;
  }

  const hoursWaiting = Math.max(0, Math.floor((now - created) / MS_PER_HOUR));

  let tone: StatusTone = 'neutral';
  if (hoursWaiting >= OVERDUE_AFTER_HOURS) {
    tone = 'bad';
  } else if (hoursWaiting >= WARN_AFTER_HOURS) {
    tone = 'warn';
  }

  return { tone, label: `SLA ${hoursWaiting}j` };
}
