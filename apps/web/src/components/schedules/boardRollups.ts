/**
 * Capacity and coverage roll-ups for the day board.
 *
 * Pure functions over the board tree: a parent tier's coverage is always its
 * whole subtree, and its target is either its own or the sum of the tier that
 * owns targets below it. Split out of `DayBoard.tsx` — this is the arithmetic
 * behind the pills, not rendering, and the component was well past the size
 * where the two could still be read together.
 */
import {
  COUNTABLE_ROLES,
  type BoardDistrict,
  type BoardRegion,
  type BoardShiftGroup,
} from '@/lib/schedules/dayBoard';


/**
 * Per-role countable headcount across a whole subject's subtree, keyed
 * `<shift>:<role>`. A kawasan/district target is met by everything inside it (its
 * own assignment PLUS its lokasi), so the coverage number must be the subtree's,
 * not just the rows of the table it is rendered above.
 */
export function subtreeRoleCounts(groups: BoardShiftGroup[][]): Map<string, number> {
  const m = new Map<string, number>();
  for (const list of groups) {
    for (const g of list) {
      for (const role of COUNTABLE_ROLES) {
        // countableByRole, not byRole: a team's members are real satgas/linmas
        // and must count toward the target even though the Tim column, not the
        // role column, is what LISTS them.
        const n = g.countableByRole?.[role] ?? 0;
        if (n === 0) continue;
        const key = `${g.shift.id}:${role}`;
        m.set(key, (m.get(key) ?? 0) + n);
      }
    }
  }
  return m;
}

/**
 * Slice the global `<subject>:<shift>:<role>` map down to one subject, re-keyed
 * `<shift>:<role>` for the components. Returns empty when the subject doesn't
 * own capacity — so a lokasi under a kawasan-scoped district shows counts only.
 */
export function subjectRoleTargets(all: Map<string, number>, prefix: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const [k, v] of all) {
    if (k.startsWith(prefix)) m.set(k.slice(prefix.length), v);
  }
  return m;
}

/**
 * Per-shift countable totals for a whole district subtree (its own assignment + every
 * kawasan assignment + every location), paired with the district-level target.
 * Only shifts that actually have a target produce a pill.
 */
export const sumTotals = (groups: BoardShiftGroup[]): number => groups.reduce((a, g) => a + g.total, 0);

/** Per-shift countable totals across a subtree (its own assignment + descendants). */
export function shiftCountables(
  groups: BoardShiftGroup[][]
): Map<string, { shift: BoardShiftGroup['shift']; countable: number }> {
  const totals = new Map<string, { shift: BoardShiftGroup['shift']; countable: number }>();
  for (const list of groups) {
    for (const g of list) {
      const e = totals.get(g.shift.id) ?? { shift: g.shift, countable: 0 };
      e.countable += g.countable;
      totals.set(g.shift.id, e);
    }
  }
  return totals;
}

/** Every shift-group list under a district (itself, its kawasan, every lokasi). */
export const districtSubtree = (r: BoardDistrict): BoardShiftGroup[][] => [
  r.assignment,
  ...r.looseLocations.map((l) => l.shifts),
  ...r.regions.flatMap((g) => [g.assignment, ...g.locations.map((l) => l.shifts)]),
];

/** Every shift-group list under a kawasan (itself + its lokasi). */
export const regionSubtree = (r: BoardRegion): BoardShiftGroup[][] => [
  r.assignment,
  ...r.locations.map((l) => l.shifts),
];

/**
 * Sum the targets of the tier that OWNS them beneath a subject, per shift.
 *
 * A parent tier carries no target of its own, but operators need to spot which
 * district/kawasan needs staffing without expanding every one. So a parent shows
 * the roll-up of its children's targets — rendered `rolledUp` (dashed) since it
 * is summed from below, not set here, and has no gear.
 */
export function rollupTargets(
  capacities: Map<string, number>,
  prefix: 'reg' | 'loc',
  ids: string[],
  shiftIds: string[]
): Map<string, number> {
  const out = new Map<string, number>();
  for (const shiftId of shiftIds) {
    let sum = 0;
    let found = false;
    for (const id of ids) {
      const v = capacities.get(`${prefix}:${id}:${shiftId}`);
      if (v != null) {
        sum += v;
        found = true;
      }
    }
    if (found && sum > 0) out.set(shiftId, sum);
  }
  return out;
}

/**
 * The capacity pills for a subject: coverage is always its whole subtree; the
 * target is either its own (it owns the tier) or the sum of the owning tier
 * below it (`rolledUp`). Shifts with no target anywhere produce no pill.
 */
export function capacityPills(
  subtree: BoardShiftGroup[][],
  ownKeyPrefix: string,
  capacities: Map<string, number>,
  owned: boolean,
  rolled?: Map<string, number>
): Array<{
  shift: BoardShiftGroup['shift'];
  countable: number;
  target: number;
  rolledUp: boolean;
}> {
  const totals = shiftCountables(subtree);
  return [...totals.values()]
    .map((e) => {
      const target = owned
        ? capacities.get(`${ownKeyPrefix}${e.shift.id}`)
        : rolled?.get(e.shift.id);
      return { ...e, target, rolledUp: !owned };
    })
    .filter(
      (
        x
      ): x is {
        shift: BoardShiftGroup['shift'];
        countable: number;
        target: number;
        rolledUp: boolean;
      } => x.target != null
    );
}
