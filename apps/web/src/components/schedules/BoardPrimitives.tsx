'use client';

/**
 * Small presentational pieces of the day board: the map button, the collapsible
 * "Penempatan" block, the capacity/coverage pill and the two bare chrome atoms.
 *
 * Split out of `DayBoard.tsx` so the component file holds the board's behaviour
 * (expansion, filtering, leaf loading) rather than its chrome.
 */
import { ChevronDown, Map as MapIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { COUNTABLE_ROLES, type BoardShiftGroup } from '@/lib/schedules/dayBoard';


/** Title-bar map button, shared by every tier that HAS a boundary. */
export function MapButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid size-8 shrink-0 place-items-center rounded-nb-base border-2 border-nb-black bg-nb-white shadow-nb-sm hover:bg-nb-gray-50"
      aria-label={label}
      title={label}
    >
      <MapIcon className="size-4" />
    </button>
  );
}


/**
 * The district/kawasan "Penempatan" block. It renders on every tier now (assigning
 * is allowed anywhere), so it collapses by default to keep the board scannable —
 * an empty one shouldn't push the kawasan list off screen.
 */
export function AssignmentBlock({
  id,
  title,
  count,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const { t } = useTranslation(['schedules']);
  return (
    <div className="overflow-hidden rounded-nb-base border-2 border-l-[6px] border-nb-black border-l-nb-secondary bg-nb-gray-50">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`${id}-body`}
        className="flex w-full items-center gap-2 px-2.5 py-2 text-left"
      >
        <Chevron open={open} />
        <span className="text-nb-caption font-bold uppercase tracking-wide text-nb-gray-500">
          {title}
        </span>
        <span className="ml-auto">
          <Pill>{t('schedules:board.petugasCount', { count })}</Pill>
        </span>
      </button>
      {open && (
        <div id={`${id}-body`} className="border-t-2 border-dashed border-nb-black p-2.5">
          {children}
        </div>
      )}
    </div>
  );
}


export function ShiftPill({
  group,
  target,
  rolledUp = false,
  roleTargets,
  roleCounts,
}: {
  group: BoardShiftGroup;
  target?: number;
  /**
   * The target was summed from the tier below, not set on this subject. Rendered
   * dashed + muted so it reads as a roll-up: there is no gear here, and clicking
   * through to the owning tier is what actually changes it.
   */
  rolledUp?: boolean;
  /** `${shiftId}:${role}` → target, so the hint can name the short role. */
  roleTargets?: Map<string, number>;
  /**
   * `${shiftId}:${role}` → coverage counted toward the target. Required for the
   * district/kawasan pills: their `group` is a synthetic per-shift total with no
   * `byRole`, and their coverage is the subtree's anyway. A lokasi omits it and
   * falls back to its own rows.
   */
  roleCounts?: Map<string, number>;
}) {
  const { t } = useTranslation(['schedules', 'roles']);
  const short = group.shift.name.match(/\d+/)?.[0] ?? group.shift.name;
  // With a capacity target, show countable (satgas+linmas) vs target and flag
  // understaffing; otherwise just the scheduled total. The compact "S1·2/3"
  // form is explained in full via the tooltip.
  if (target != null && target > 0) {
    const understaffed = group.countable < target;
    // danger is a constant fill+ink pair (dark-safe); the "ok" green uses a
    // flipping ink (success-dark) so it stays legible in dark mode.
    const cls = understaffed
      ? 'bg-nb-danger-light text-nb-danger-dark'
      : 'bg-nb-primary/20 text-nb-success-dark';
    // Dashed + lighter border = "summed from below"; solid = "set right here".
    const border = rolledUp ? 'border-dashed border-nb-gray-500' : 'border-nb-black';
    // Spell out the per-role split — "0 of 10" alone never said WHICH role to
    // staff, which was the whole point of the hint.
    const breakdown = COUNTABLE_ROLES.map((role) => {
      const roleTarget = roleTargets?.get(`${group.shift.id}:${role}`) ?? 0;
      if (roleTarget <= 0) return null;
      return t('schedules:board.shiftStaffRolePart', {
        role: t(`roles:${role}`, role),
        // byRole holds individuals ONLY — a team's members are listed under Tim
        // but still count toward the target, so falling back to it reported a
        // team-staffed subject as empty (and contradicted this pill's own
        // aggregate, which does count them).
        countable:
          roleCounts?.get(`${group.shift.id}:${role}`) ?? group.countableByRole?.[role] ?? 0,
        target: roleTarget,
      });
    })
      .filter(Boolean)
      .join(' · ');
    return (
      <span
        title={t(
          rolledUp
            ? 'schedules:board.shiftStaffRollupTooltip'
            : 'schedules:board.shiftStaffTooltip',
          { shift: group.shift.name, countable: group.countable, target, breakdown }
        )}
        className={`inline-flex items-center gap-1 rounded-full border-2 px-2 py-0.5 text-nb-caption font-bold tabular-nums ${border} ${cls}`}
      >
        S{short}·{group.countable}/{target}
        {understaffed && <span aria-hidden>⚠</span>}
      </span>
    );
  }
  // Empty shifts are de-emphasised (dashed, muted) so populated ones stand out.
  const empty = group.total === 0;
  return (
    <span
      title={t('schedules:board.shiftTotalTooltip', {
        shift: group.shift.name,
        count: group.total,
      })}
      className={`inline-flex items-center gap-1 rounded-full border-2 px-2 py-0.5 text-nb-caption font-bold tabular-nums ${
        empty
          ? 'border-dashed border-nb-gray-300 text-nb-gray-500'
          : 'border-nb-black bg-nb-gray-50 text-nb-gray-600'
      }`}
    >
      S{short}·{group.total}
    </span>
  );
}

export function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border-2 border-nb-black bg-nb-gray-50 px-2.5 py-0.5 text-nb-caption font-bold tabular-nums text-nb-gray-600">
      {children}
    </span>
  );
}

export function Chevron({ open }: { open: boolean }) {
  return (
    <ChevronDown
      className={`size-4 shrink-0 transition-transform ${open ? '' : '-rotate-90'}`}
      aria-hidden
    />
  );
}
