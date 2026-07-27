'use client';

import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ChevronDown, Plus, Users } from 'lucide-react';
import type { TFunction } from 'i18next';
import type { BoardShiftGroup, BoardTeam } from '@/lib/schedules/dayBoard';
import type { ScheduleOccurrence } from '@/lib/api/schedule-events';
import {
  ATTENTION_TONES,
  occurrenceTone,
  PRESENCE_TONE_CLASS,
} from '@/lib/presence/tone';

/** Core scheduling roles always given a column so empty ones can be filled. */
const CORE_ROLES = ['satgas', 'linmas', 'korlap'];

/**
 * Names shown before a column collapses.
 *
 * A fully staffed satgas column runs to 10+ rows, which pushes every other
 * shift block off the screen and turns a comparison surface into a scroll. Five
 * caps the column at ~7 rows including the "lainnya" and "Tugaskan" rows while
 * still saying WHO is on today, not just how many.
 */
const VISIBLE_ROWS = 5;

/**
 * Collapse only when it actually buys something: hiding a single name behind a
 * "1 lainnya" row costs a click and saves nothing.
 */
export function shouldCollapse(total: number): boolean {
  return total > VISIBLE_ROWS + 1;
}

/** Per-role header colour (fixed brand tokens; white ink, per OccurrenceChip). */
const ROLE_HEADER: Record<string, string> = {
  satgas: 'bg-nb-primary',
  linmas: 'bg-nb-info',
  korlap: 'bg-nb-warning',
};
const TEAM_HEADER = 'bg-nb-secondary';

/** Shift accent swatch by the trailing number in the shift name (1/2/3). */
function shiftSwatch(name: string): string {
  const n = parseInt(name.match(/\d+/)?.[0] ?? '1', 10);
  return n === 2 ? 'bg-nb-warning' : n === 3 ? 'bg-nb-info' : 'bg-nb-primary';
}

interface ShiftRoleTableProps {
  shifts: BoardShiftGroup[];
  onOccurrenceClick: (occ: ScheduleOccurrence) => void;
  /** Assign into a specific shift (optionally a role). */
  onAssign?: (shiftId: string, role?: string) => void;
  /** Assign a TEAM into a shift — opens the event modal on its team target. */
  onAssignTeam?: (shiftId: string) => void;
  canAssign?: boolean;
  /**
   * `${shiftId}:${role}` → target headcount, for the subject that OWNS this
   * capacity (the tier the district's `staffing_level` names). Absent for every
   * other container — a lokasi under a kawasan-scoped district has no target of its
   * own, and inventing one would show a number nobody set. Only satgas/linmas
   * ever have targets, so korlap simply never matches.
   */
  roleTargets?: Map<string, number>;
  /**
   * `${shiftId}:${role}` → headcount counted toward the target, for a SUBTREE
   * subject: a kawasan/district target is met by everything inside it, so its
   * coverage is the subtree's, not this table's own rows. Omit for a lokasi —
   * its own group already knows its countable-by-role (teams included).
   */
  roleCounts?: Map<string, number>;
}

/**
 * Renders one container's roster: a block per shift (all shifts shown, even
 * empty), each split into a responsive row of role columns + a Tim column.
 */
export function ShiftRoleTable({
  shifts,
  onOccurrenceClick,
  onAssign,
  onAssignTeam,
  canAssign = false,
  roleTargets,
  roleCounts,
}: ShiftRoleTableProps) {
  const { t } = useTranslation(['schedules', 'roles']);

  return (
    <div className="flex flex-col gap-4">
      {shifts.map((group) => {
        // Column set: core roles (always) + any extra roles present, in order.
        const extraRoles = Object.keys(group.byRole).filter((r) => !CORE_ROLES.includes(r));
        const roleCols = [...CORE_ROLES, ...extraRoles];
        const timeLabel =
          group.shift.start_time.slice(0, 5) + '–' + group.shift.end_time.slice(0, 5);

        return (
          <div key={group.shift.id}>
            <div className="mb-2 flex items-center gap-2 text-nb-caption font-bold uppercase tracking-wide text-nb-gray-500">
              <span
                className={`inline-block size-2.5 rounded-nb-sm border-2 border-nb-black ${shiftSwatch(group.shift.name)}`}
              />
              {group.shift.name} · {timeLabel}
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(9.25rem,1fr))]">
              {roleCols.map((role) => (
                <RoleColumn
                  key={role}
                  label={t(`roles:${role}`, role)}
                  headerClass={ROLE_HEADER[role] ?? 'bg-nb-gray-300'}
                  occurrences={group.byRole[role] ?? []}
                  onOccurrenceClick={onOccurrenceClick}
                  onAssign={canAssign ? () => onAssign?.(group.shift.id, role) : undefined}
                  addLabel={t('schedules:board.assign')}
                  target={roleTargets?.get(`${group.shift.id}:${role}`)}
                  // countableByRole, not the column's own rows: a team's members
                  // are real satgas/linmas but are listed under Tim, so counting
                  // rows would report a staffed lokasi as empty. `roleCounts`
                  // only overrides it for a SUBTREE subject (kawasan/district).
                  covered={
                    roleCounts?.get(`${group.shift.id}:${role}`) ??
                    group.countableByRole?.[role] ??
                    (group.byRole[role] ?? []).length
                  }
                  shortLabel={t('schedules:board.roleShort', {
                    shift: group.shift.name,
                    role: t(`roles:${role}`, role),
                  })}
                />
              ))}

              <TeamColumn
                shiftId={group.shift.id}
                teams={group.teams}
                onOccurrenceClick={onOccurrenceClick}
                onAssignTeam={canAssign ? onAssignTeam : undefined}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface RoleColumnProps {
  label: string;
  headerClass: string;
  occurrences: ScheduleOccurrence[];
  onOccurrenceClick: (occ: ScheduleOccurrence) => void;
  onAssign?: () => void;
  addLabel: string;
  /** Target headcount for this shift+role; absent when nothing is required. */
  target?: number;
  /** Headcount counted toward `target` when it differs from this column's own
   *  rows (a kawasan/district counts its whole subtree). Defaults to the rows. */
  covered?: number;
  /** Spelled-out "Shift 1 · Satgas" for the understaffed title/aria text. */
  shortLabel?: string;
}

/**
 * "… 5 lainnya" — the row that stands in for the collapsed remainder, and the
 * second way to expand a column (the header count is the first).
 */
function MoreRow({
  hidden,
  expanded,
  onToggle,
  needsAttention,
  controls,
  t,
}: {
  hidden: number;
  expanded: boolean;
  onToggle: () => void;
  needsAttention: boolean;
  controls: string;
  t: TFunction;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-controls={controls}
      className="flex items-center gap-1.5 border-t border-dashed border-nb-black bg-nb-white px-2.5 py-1.5 text-left text-nb-caption font-bold text-nb-gray-600 hover:bg-nb-gray-50"
    >
      <ChevronDown
        className={`size-3.5 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
        aria-hidden
      />
      {expanded ? t('schedules:board.showLess') : t('schedules:board.moreWorkers', { count: hidden })}
      {/* Collapsing must not hide a problem: a dot here says at least one of the
          hidden rows is a no-show / late / outside-area. */}
      {!expanded && needsAttention && (
        <span
          className={`ml-auto size-2 shrink-0 rounded-full border border-nb-black ${PRESENCE_TONE_CLASS.red.bg}`}
          title={t('schedules:board.hiddenNeedsAttention')}
          aria-label={t('schedules:board.hiddenNeedsAttention')}
        />
      )}
    </button>
  );
}

function RoleColumn({
  label,
  headerClass,
  occurrences,
  onOccurrenceClick,
  onAssign,
  addLabel,
  target,
  covered,
  shortLabel,
}: RoleColumnProps) {
  const { t } = useTranslation(['schedules']);
  const [expanded, setExpanded] = useState(false);
  // useId, not a label-derived string: DayBoard renders one ShiftRoleTable per
  // container, so a derived id repeats across kawasan/lokasi and every
  // aria-controls after the first would point at another column's list.
  const listId = useId();

  const sorted = useMemo(
    () => [...occurrences].sort((a, b) => a.user.full_name.localeCompare(b.user.full_name)),
    [occurrences]
  );
  // Coverage defaults to this column's own rows; a kawasan/district passes its
  // subtree total, which is what its target is measured against.
  const countedToward = covered ?? sorted.length;
  const understaffed = target != null && target > 0 && countedToward < target;

  const collapsible = shouldCollapse(sorted.length);
  const collapsed = collapsible && !expanded;
  const visible = collapsed ? sorted.slice(0, VISIBLE_ROWS) : sorted;
  const hidden = sorted.length - visible.length;
  const hiddenNeedsAttention = useMemo(
    () => (collapsed ? sorted.slice(VISIBLE_ROWS).some((o) => ATTENTION_TONES.has(occurrenceTone(o))) : false),
    [collapsed, sorted]
  );

  const toggle = () => setExpanded((v) => !v);
  const countClass = 'tabular-nums';

  return (
    <div className="flex flex-col overflow-hidden rounded-nb-base border-2 border-nb-black bg-nb-gray-50">
      <div
        className={`flex items-center justify-between border-b-2 border-nb-black px-2.5 py-1.5 text-nb-caption font-bold uppercase tracking-wide text-white ${headerClass}`}
      >
        <span>{label}</span>
        {/* With a target, this role reads "n/target" and flags its own shortfall,
            so the operator sees WHICH role of WHICH shift needs staffing. */}
        {target != null && target > 0 ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full border-2 border-nb-black px-1.5 tabular-nums ${
              understaffed ? 'bg-nb-danger-light text-nb-danger-dark' : 'bg-nb-white text-nb-black'
            }`}
            title={shortLabel}
          >
            {understaffed && <AlertTriangle className="size-3" aria-hidden />}
            {countedToward}/{target}
          </span>
        ) : (
          <span className={countClass}>{sorted.length}</span>
        )}
        {/* The count is the operator's natural target for "show me everyone", so
            it doubles as the expand control whenever there IS a remainder. */}
        {collapsible && (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={expanded}
            aria-controls={listId}
            aria-label={
              expanded
                ? t('schedules:board.showLess')
                : t('schedules:board.showAllWorkers', { count: sorted.length })
            }
            className="-mr-1 ml-1 rounded-nb-sm p-0.5 hover:bg-black/10"
          >
            <ChevronDown
              className={`size-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>
        )}
      </div>
      <div id={listId} className="contents">
      {visible.map((occ) => (
        <button
          key={occ.id}
          type="button"
          onClick={() => onOccurrenceClick(occ)}
          className={`flex items-center gap-2 border-b border-nb-black bg-nb-white px-2.5 py-1.5 text-left text-sm font-medium last:border-b-0 hover:bg-nb-gray-50 ${occ.is_projected ? 'opacity-60' : ''}`}
        >
          {/* Presence bullet — the ONE standard (lib/presence/tone). It used to be
              hardcoded green for everyone, so it carried no information at all. */}
          <span
            className={`size-2 shrink-0 rounded-full border border-nb-black ${PRESENCE_TONE_CLASS[occurrenceTone(occ)].bg}`}
            aria-hidden
          />
          <span className="truncate">{occ.user.full_name}</span>
          {occ.is_detached && <span className="ml-auto shrink-0 text-nb-gray-500">✎</span>}
        </button>
      ))}
      </div>
      {collapsible && (
        <MoreRow
          hidden={hidden}
          expanded={expanded}
          onToggle={toggle}
          needsAttention={hiddenNeedsAttention}
          controls={listId}
          t={t}
        />
      )}
      {onAssign && (
        <button
          type="button"
          onClick={onAssign}
          className="flex items-center justify-center gap-1.5 border-t border-dashed border-nb-black bg-nb-white px-2.5 py-1.5 text-nb-caption font-bold text-nb-gray-500 hover:bg-nb-gray-50"
        >
          <Plus className="size-3.5" aria-hidden />
          {addLabel}
        </button>
      )}
    </div>
  );
}

interface TeamColumnProps {
  shiftId: string;
  teams: BoardTeam[];
  onOccurrenceClick: (occ: ScheduleOccurrence) => void;
  /** Omitted when the operator can't assign — the row simply isn't rendered. */
  onAssignTeam?: (shiftId: string) => void;
}

/**
 * Tim is a column in its own right, always rendered like the core roles. A team
 * is a COMBINATION of roles, so it can't be filed under satgas or linmas — and
 * rendering it only once populated meant a team had nowhere to be assigned
 * from, so the column never appeared (the same chicken-and-egg the
 * district/kawasan assign tables had). Its members still count toward the role
 * targets; see `countableByRole`.
 *
 * Collapses past `VISIBLE_ROWS` exactly like a role column — a city-wide day
 * can carry more teams than fit — minus the attention dot, which has no meaning
 * for a team row (it shows a headcount, not a presence state).
 */
function TeamColumn({ shiftId, teams, onOccurrenceClick, onAssignTeam }: TeamColumnProps) {
  const { t } = useTranslation(['schedules']);
  const [expanded, setExpanded] = useState(false);
  const listId = useId();

  const collapsible = shouldCollapse(teams.length);
  const collapsed = collapsible && !expanded;
  const visible = collapsed ? teams.slice(0, VISIBLE_ROWS) : teams;
  const toggle = () => setExpanded((v) => !v);

  return (
    <div className="flex flex-col overflow-hidden rounded-nb-base border-2 border-nb-black bg-nb-gray-50">
      <div
        className={`flex items-center justify-between border-b-2 border-nb-black px-2.5 py-1.5 text-nb-caption font-bold uppercase tracking-wide text-white ${TEAM_HEADER}`}
      >
        <span>{t('schedules:board.team')}</span>
        <span className="tabular-nums">{teams.length}</span>
        {collapsible && (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={expanded}
            aria-controls={listId}
            aria-label={
              expanded
                ? t('schedules:board.showLess')
                : t('schedules:board.showAllTeams', { count: teams.length })
            }
            className="-mr-1 ml-1 rounded-nb-sm p-0.5 hover:bg-black/10"
          >
            <ChevronDown
              className={`size-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>
        )}
      </div>
      <div id={listId} className="contents">
        {visible.map((team) => (
          <button
            key={team.eventId}
            type="button"
            // Any member resolves the same team event, so the detail modal opens
            // on the team exactly as a name opens on a person. This row used to
            // be a dead button.
            onClick={team.occurrences[0] ? () => onOccurrenceClick(team.occurrences[0]) : undefined}
            className="flex items-center gap-2 border-b border-nb-black bg-nb-white px-2.5 py-1.5 text-left text-sm font-semibold last:border-b-0 hover:bg-nb-gray-50"
            style={team.markerColor ? { borderLeft: `4px solid ${team.markerColor}` } : undefined}
          >
            <Users className="size-3.5 shrink-0 text-nb-gray-500" aria-hidden />
            <span className="truncate">{team.name}</span>
            <span className="ml-auto shrink-0 tabular-nums text-nb-gray-500">{team.count}</span>
          </button>
        ))}
      </div>
      {collapsible && (
        <MoreRow
          hidden={teams.length - visible.length}
          expanded={expanded}
          onToggle={toggle}
          needsAttention={false}
          controls={listId}
          t={t}
        />
      )}
      {onAssignTeam && (
        <button
          type="button"
          onClick={() => onAssignTeam(shiftId)}
          className="flex items-center justify-center gap-1.5 border-t border-dashed border-nb-black bg-nb-white px-2.5 py-1.5 text-nb-caption font-bold text-nb-gray-500 hover:bg-nb-gray-50"
        >
          <Plus className="size-3.5" aria-hidden />
          {t('schedules:board.assign')}
        </button>
      )}
    </div>
  );
}
