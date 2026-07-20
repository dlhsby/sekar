'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Map as MapIcon, Settings2 } from 'lucide-react';
import {
  autoExpandedIds,
  buildDayBoard,
  hasAnyBoardFilter,
  pruneDayBoard,
  CITY_NODE_ID,
  COUNTABLE_ROLES,
  type BoardFilters,
  type BoardLocation,
  type BoardMasterData,
  type BoardDistrict,
  type BoardRegion,
  type BoardShiftGroup,
} from '@/lib/schedules/dayBoard';
import type { ScheduleOccurrence } from '@/lib/api/schedule-events';
import type { StaffSubject } from '@/lib/api/location-staff-requirements';
import type { StaffingLevel } from '@/types/models';
import { EmptyState } from '@/components/ui';
import { ShiftRoleTable } from '@/components/schedules/ShiftRoleTable';
import type { AreaMapSubject } from '@/components/schedules/AreaMapModal';

const EMPTY_CAPACITIES = new Map<string, number>();

/**
 * Where a "+ Tugaskan" was clicked — the shift/role plus the container's
 * geography, so the create modal opens pre-filled at that subject (no re-picking
 * the Rayon▸Kawasan▸Lokasi cascade).
 */
export interface AssignContext {
  shiftId: string;
  role?: string;
  district_id?: string;
  region_id?: string;
  location_id?: string;
  /** City-wide placement (Seluruh Surabaya). */
  city?: boolean;
  /** Assigning a TEAM rather than an individual — opens the modal's team target. */
  team?: boolean;
}

/** Geography half of an AssignContext (the container it was clicked in). */
type AssignSubject = Omit<AssignContext, 'shiftId' | 'role'>;

interface DayBoardProps {
  occurrences: ScheduleOccurrence[];
  master: BoardMasterData;
  onOccurrenceClick: (occ: ScheduleOccurrence) => void;
  onAssign?: (ctx: AssignContext) => void;
  canAssign?: boolean;
  /** `<subject>:<shiftId>` → total satgas+linmas target (the subject pill). */
  capacities?: Map<string, number>;
  /**
   * `<subject>:<shiftId>:<role>` → per-role target. The aggregate above cannot
   * say WHICH role is short; this drives the hint's breakdown and the per-role
   * warning on the owning subject's shift+role cards.
   */
  roleCapacities?: Map<string, number>;
  /** When present, a gear on each location opens the capacity editor. */
  onEditCapacity?: (subject: StaffSubject) => void;
  /**
   * Active search criteria. The range query already filters occurrences
   * server-side, but the tree's skeleton comes from `master` — so without this
   * the board kept every district standing at "0 petugas". Drives both the prune
   * and which containers open on their own.
   */
  filters?: BoardFilters;
  /** Clears every criterion — offered from the "nothing matched" state. */
  onClearFilters?: () => void;
  /** Opens the boundary map for a container. Surabaya is never offered one — it
   *  is a city-wide sentinel with no geography of its own. */
  onShowMap?: (subject: AreaMapSubject) => void;
}

/** Title-bar map button, shared by every tier that HAS a boundary. */
function MapButton({ label, onClick }: { label: string; onClick: () => void }) {
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

const NO_FILTERS: BoardFilters = {};

/** Stable identity for a criteria set — re-seeds the open containers when it changes. */
const filterSignature = (f: BoardFilters): string =>
  [f.districtId, f.regionId, f.locationId, f.userId, f.shiftDefinitionId, f.teamCategoryId]
    .map((v) => v ?? '')
    .join('|');

/**
 * Day coverage board (Jadwal redesign P1): District ▸ Kawasan ▸ Lokasi tree, one
 * branch expanded at a time, each container rendering the shared shift +
 * role-column layout. Scales to thousands of workers — nothing renders until a
 * branch is opened.
 */
export function DayBoard({
  occurrences,
  master,
  onOccurrenceClick,
  onAssign,
  canAssign = false,
  capacities = EMPTY_CAPACITIES,
  roleCapacities = EMPTY_CAPACITIES,
  onEditCapacity,
  filters = NO_FILTERS,
  onClearFilters,
  onShowMap,
}: DayBoardProps) {
  const { t } = useTranslation(['schedules', 'common']);
  const tree = useMemo(
    () => pruneDayBoard(buildDayBoard(occurrences, master), filters),
    [occurrences, master, filters]
  );
  const filtered = hasAnyBoardFilter(filters);

  // Seeded from the criteria present on mount — landing on the page with a
  // filter already set (or re-mounting) must open the match too, not only a
  // later change to it.
  const [open, setOpen] = useState<Set<string>>(() => autoExpandedIds(tree, filters));

  // Re-seed the open containers whenever the criteria change, so a match is on
  // screen without hunting for it. Adjusting state during render (rather than in
  // an effect) is React's documented pattern for deriving from a prop, and it
  // avoids rendering the collapsed tree for a frame first. A manual toggle still
  // wins afterwards — this only fires when the signature actually changes.
  const signature = filterSignature(filters);
  const [seenSignature, setSeenSignature] = useState(signature);
  if (seenSignature !== signature) {
    setSeenSignature(signature);
    setOpen(autoExpandedIds(tree, filters));
  }

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const tableProps = { onOccurrenceClick, canAssign };
  // Bind a container's geography to a ShiftRoleTable's (shiftId, role) assign call.
  const mkAssign = (subject: AssignSubject) =>
    canAssign && onAssign
      ? (shiftId: string, role?: string) => onAssign({ ...subject, shiftId, role })
      : undefined;
  // A team carries no single role — the modal opens on its team target instead.
  const mkAssignTeam = (subject: AssignSubject) =>
    canAssign && onAssign
      ? (shiftId: string) => onAssign({ ...subject, shiftId, team: true })
      : undefined;

  return (
    <div className="flex flex-col gap-3">
      {/* "Nothing matched" and "nobody works today" are different answers, and
          conflating them left the operator unable to tell a bad search from an
          empty day. When filtering, the pruned tree IS the answer — an empty
          matched lokasi still renders, so emptyDay would be a lie. */}
      {filtered ? (
        tree.length === 0 && (
          <EmptyState
            variant="noResults"
            title={t('schedules:board.noMatchTitle')}
            description={t('schedules:board.noMatchDesc')}
            action={
              onClearFilters
                ? { label: t('schedules:filters.clear'), onClick: onClearFilters }
                : undefined
            }
          />
        )
      ) : occurrences.length === 0 ? (
        <p className="rounded-nb-base border-2 border-dashed border-nb-black bg-nb-gray-50 py-5 text-center text-nb-body-sm text-nb-gray-500">
          {t('schedules:board.emptyDay')}
        </p>
      ) : null}
      {tree.map((district) => {
        const locCount =
          district.regions.reduce((a, r) => a + r.locations.length, 0) + district.looseLocations.length;
        // Exactly one tier owns capacity, decided by the district — never inferred
        // from where a node sits in the tree. The city node has no district, so it
        // owns nothing.
        const capacityLevel = district.id === CITY_NODE_ID ? undefined : district.staffing_level;
        // Rayon-level understaffing: countable (satgas+linmas) across the whole
        // subtree vs the district target. Only for district-scope, else the target
        // belongs to a kawasan/lokasi and showing it here would double-count.
        const shiftIds = district.placement.map((g) => g.shift.id);
        const districtCapPills = capacityPills(
          districtSubtree(district),
          `ray:${district.id}:`,
          capacities,
          capacityLevel === 'district',
          // Not the owner → sum whichever tier below actually holds the targets.
          capacityLevel === 'region'
            ? rollupTargets(
                capacities,
                'reg',
                district.regions.map((r) => r.id),
                shiftIds
              )
            : capacityLevel === 'location'
              ? rollupTargets(
                  capacities,
                  'loc',
                  [
                    ...district.looseLocations.map((l) => l.id),
                    ...district.regions.flatMap((r) => r.locations.map((l) => l.id)),
                  ],
                  shiftIds
                )
              : undefined
        );
        const districtRoleTargets =
          capacityLevel === 'district'
            ? subjectRoleTargets(roleCapacities, `ray:${district.id}:`)
            : undefined;
        // The district's target is met by its whole subtree, so the coverage shown
        // on its own assign table counts kawasan + lokasi rosters too.
        const districtRoleCounts = subtreeRoleCounts(districtSubtree(district));
        return (
          <section
            key={district.id}
            className="overflow-hidden rounded-nb-base border-2 border-l-[6px] border-nb-black border-l-nb-primary bg-nb-white shadow-nb-sm"
          >
            <div className="flex items-center border-b-2 border-nb-black bg-nb-gray-200">
              <button
                type="button"
                onClick={() => toggle(district.id)}
                className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left text-nb-black"
                aria-expanded={open.has(district.id)}
              >
                <Chevron open={open.has(district.id)} />
                <span className="text-nb-h3 font-bold">
                  {district.id === CITY_NODE_ID ? t('schedules:calendar.board.cityLabel') : district.name}
                </span>
                <span className="ml-auto flex flex-wrap items-center gap-2">
                  {districtCapPills.map(({ shift, countable, target, rolledUp }) => (
                    <ShiftPill
                      key={shift.id}
                      group={{ shift, byRole: {}, teams: [], countableByRole: {}, countable, total: countable }}
                      target={target}
                      rolledUp={rolledUp}
                      roleTargets={rolledUp ? undefined : districtRoleTargets}
                      roleCounts={districtRoleCounts}
                    />
                  ))}
                  <Pill>{t('schedules:board.petugasCount', { count: district.total })}</Pill>
                  {/* Surabaya is city-wide by definition — it has no kawasan or
                      lokasi, so "0 kawasan · 0 lokasi" would read as a defect. */}
                  {district.id !== CITY_NODE_ID && (
                    <Pill>
                      {t('schedules:board.areaCount', {
                        kawasan: district.regions.length,
                        lokasi: locCount,
                      })}
                    </Pill>
                  )}
                </span>
              </button>
              {/* Surabaya has no boundary of its own — it IS the city. */}
              {onShowMap && district.id !== CITY_NODE_ID && (
                <span className="mr-2">
                  <MapButton
                    label={t('schedules:board.showMap')}
                    onClick={() => onShowMap({ level: 'district', id: district.id, name: district.name })}
                  />
                </span>
              )}
              {onEditCapacity && capacityLevel === 'district' && district.id !== CITY_NODE_ID && (
                <button
                  type="button"
                  onClick={() => onEditCapacity({ type: 'district', id: district.id, name: district.name })}
                  className="mr-4 grid size-8 shrink-0 place-items-center rounded-nb-base border-2 border-nb-black bg-nb-white shadow-nb-sm hover:bg-nb-gray-50"
                  aria-label={t('schedules:staffCapacity.title')}
                  title={t('schedules:staffCapacity.title')}
                >
                  <Settings2 className="size-4" />
                </button>
              )}
            </div>

            {open.has(district.id) && (
              <div className="flex flex-col gap-3 p-3">
                {/* Surabaya holds nothing but city-wide placements, so its shift
                    + role table IS its body — no "Penempatan" wrapper to
                    distinguish it from siblings it doesn't have. Gating it on
                    already-having-content made a city-wide schedule impossible to
                    assign: no table, so no way in, so the table never appeared. */}
                {district.id === CITY_NODE_ID ? (
                  <ShiftRoleTable
                    shifts={district.placement}
                    {...tableProps}
                    onAssign={mkAssign({ city: true })}
                    onAssignTeam={mkAssignTeam({ city: true })}
                  />
                ) : (
                  <PlacementBlock
                    id={`${district.id}-placement`}
                    title={t('schedules:board.placementDistrict')}
                    count={sumTotals(district.placement)}
                    open={open.has(`${district.id}:placement`)}
                    onToggle={() => toggle(`${district.id}:placement`)}
                  >
                    <ShiftRoleTable
                      shifts={district.placement}
                      {...tableProps}
                      onAssign={mkAssign({ district_id: district.id })}
                      onAssignTeam={mkAssignTeam({ district_id: district.id })}
                      roleTargets={districtRoleTargets}
                      roleCounts={districtRoleCounts}
                    />
                  </PlacementBlock>
                )}
                {/* One continuous rail down the district's children, in the district's
                    own accent: "these belong to that". A single 2px stroke per
                    group rather than per-row elbows — hairline connectors would
                    fight the NB language and duplicate each card's 6px accent. */}
                {(district.regions.length > 0 || district.looseLocations.length > 0) && (
                  <div className="flex flex-col gap-3 border-l-2 border-nb-primary/40">
                    {district.regions.map((region) => (
                      <RegionCard
                        key={region.id}
                        region={region}
                        districtId={district.id}
                        mkAssign={mkAssign}
                        mkAssignTeam={mkAssignTeam}
                        onShowMap={onShowMap}
                        open={open}
                        toggle={toggle}
                        tableProps={tableProps}
                        capacities={capacities}
                        roleCapacities={roleCapacities}
                        onEditCapacity={onEditCapacity}
                        capacityLevel={capacityLevel}
                      />
                    ))}
                    {district.looseLocations.map((loc) => (
                      <LocationCard
                        key={loc.id}
                        loc={loc}
                        onAssign={mkAssign({ district_id: district.id, location_id: loc.id })}
                        onAssignTeam={mkAssignTeam({ district_id: district.id, location_id: loc.id })}
                        onShowMap={onShowMap}
                        open={open.has(loc.id)}
                        onToggle={() => toggle(loc.id)}
                        tableProps={tableProps}
                        capacities={capacities}
                        roleTargets={
                          capacityLevel === 'location'
                            ? subjectRoleTargets(roleCapacities, `loc:${loc.id}:`)
                            : undefined
                        }
                        onEditCapacity={onEditCapacity}
                        showCapacity={capacityLevel === 'location'}
                        indentClass="ml-8"
                      />
                    ))}
                  </div>
                )}
                {district.id !== CITY_NODE_ID &&
                  district.regions.length === 0 &&
                  district.looseLocations.length === 0 &&
                  !district.placement.some((s) => s.total > 0) && (
                    <p className="py-6 text-center text-nb-body-sm text-nb-gray-500">
                      {t('schedules:board.emptyDistrict')}
                    </p>
                  )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/**
 * The district/kawasan "Penempatan" block. It renders on every tier now (assigning
 * is allowed anywhere), so it collapses by default to keep the board scannable —
 * an empty one shouldn't push the kawasan list off screen.
 */
function PlacementBlock({
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

interface TableProps {
  onOccurrenceClick: (occ: ScheduleOccurrence) => void;
  canAssign: boolean;
}

/** Builds a container-bound (shiftId, role) assign handler for a ShiftRoleTable. */
type MkAssign = (subject: AssignSubject) => ((shiftId: string, role?: string) => void) | undefined;
type MkAssignTeam = (subject: AssignSubject) => ((shiftId: string) => void) | undefined;

/**
 * Per-role countable headcount across a whole subject's subtree, keyed
 * `<shift>:<role>`. A kawasan/district target is met by everything inside it (its
 * own placement PLUS its lokasi), so the coverage number must be the subtree's,
 * not just the rows of the table it is rendered above.
 */
function subtreeRoleCounts(groups: BoardShiftGroup[][]): Map<string, number> {
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
function subjectRoleTargets(all: Map<string, number>, prefix: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const [k, v] of all) {
    if (k.startsWith(prefix)) m.set(k.slice(prefix.length), v);
  }
  return m;
}

/**
 * Per-shift countable totals for a whole district subtree (its own placement + every
 * kawasan placement + every location), paired with the district-level target.
 * Only shifts that actually have a target produce a pill.
 */
const sumTotals = (groups: BoardShiftGroup[]): number => groups.reduce((a, g) => a + g.total, 0);

/** Per-shift countable totals across a subtree (its own placement + descendants). */
function shiftCountables(
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
const districtSubtree = (r: BoardDistrict): BoardShiftGroup[][] => [
  r.placement,
  ...r.looseLocations.map((l) => l.shifts),
  ...r.regions.flatMap((g) => [g.placement, ...g.locations.map((l) => l.shifts)]),
];

/** Every shift-group list under a kawasan (itself + its lokasi). */
const regionSubtree = (r: BoardRegion): BoardShiftGroup[][] => [
  r.placement,
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
function rollupTargets(
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
function capacityPills(
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

function RegionCard({
  region,
  districtId,
  mkAssign,
  mkAssignTeam,
  onShowMap,
  open,
  toggle,
  tableProps,
  capacities,
  roleCapacities,
  onEditCapacity,
  capacityLevel,
}: {
  region: BoardRegion;
  districtId: string;
  mkAssign: MkAssign;
  mkAssignTeam: MkAssignTeam;
  onShowMap?: (subject: AreaMapSubject) => void;
  open: Set<string>;
  toggle: (id: string) => void;
  tableProps: TableProps;
  capacities: Map<string, number>;
  roleCapacities: Map<string, number>;
  onEditCapacity?: (subject: StaffSubject) => void;
  /** Which tier the parent district says owns capacity (undefined = the city node). */
  capacityLevel?: StaffingLevel;
}) {
  const { t } = useTranslation(['schedules']);
  // Kawasan-level understaffing: countable (satgas+linmas) across the region's
  // own placement + all its locations, vs the kawasan target (grouped districts
  // define KEBUTUHAN at this level). Pills show only for shifts with a target.
  const regionShifts = new Map<string, { shift: BoardShiftGroup['shift']; countable: number }>();
  const accumulate = (g: BoardShiftGroup) => {
    const e = regionShifts.get(g.shift.id) ?? { shift: g.shift, countable: 0 };
    e.countable += g.countable;
    regionShifts.set(g.shift.id, e);
  };
  region.placement.forEach(accumulate);
  region.locations.forEach((loc) => loc.shifts.forEach(accumulate));
  const regionRoleTargets =
    capacityLevel === 'region'
      ? subjectRoleTargets(roleCapacities, `reg:${region.id}:`)
      : undefined;
  // A kawasan's target is met by its own placement PLUS its lokasi.
  const regionRoleCounts = subtreeRoleCounts(regionSubtree(region));
  const capPills = capacityPills(
    regionSubtree(region),
    `reg:${region.id}:`,
    capacities,
    capacityLevel === 'region',
    capacityLevel === 'location'
      ? rollupTargets(
          capacities,
          'loc',
          region.locations.map((l) => l.id),
          region.placement.map((g) => g.shift.id)
        )
      : undefined
  );
  return (
    // ml-4: one step in from the district's own PENEMPATAN block, which sits at
    // district depth. The kawasan is a child, so it reads as one level deeper.
    <div className="ml-4 overflow-hidden rounded-nb-base border-2 border-l-[6px] border-nb-black border-l-nb-info">
      <div className="flex w-full flex-wrap items-center gap-2.5 border-b-2 border-nb-black bg-nb-gray-100 px-3 py-2.5">
        <button
          type="button"
          onClick={() => toggle(region.id)}
          className="flex flex-1 flex-wrap items-center gap-2.5 text-left"
          aria-expanded={open.has(region.id)}
        >
          <Chevron open={open.has(region.id)} />
          <span className="text-nb-caption font-bold uppercase tracking-wide">{region.name}</span>
          <span className="ml-auto flex flex-wrap items-center gap-1.5">
            {capPills.map(({ shift, countable, target, rolledUp }) => (
              <ShiftPill
                key={shift.id}
                group={{ shift, byRole: {}, teams: [], countableByRole: {}, countable, total: countable }}
                target={target}
                rolledUp={rolledUp}
                roleTargets={rolledUp ? undefined : regionRoleTargets}
                roleCounts={regionRoleCounts}
              />
            ))}
            <Pill>{t('schedules:board.petugasCount', { count: region.total })}</Pill>
            <Pill>{t('schedules:board.lokasiCount', { count: region.locations.length })}</Pill>
          </span>
        </button>
        {onShowMap && (
          <span className="mr-2">
            <MapButton
              label={t('schedules:board.showMap')}
              onClick={() => onShowMap({ level: 'region', id: region.id, name: region.name })}
            />
          </span>
        )}
        {onEditCapacity && capacityLevel === 'region' && (
          <button
            type="button"
            onClick={() => onEditCapacity({ type: 'region', id: region.id, name: region.name })}
            className="grid size-8 shrink-0 place-items-center rounded-nb-base border-2 border-nb-black bg-nb-white shadow-nb-sm hover:bg-nb-gray-50"
            aria-label={t('schedules:staffCapacity.title')}
            title={t('schedules:staffCapacity.title')}
          >
            <Settings2 className="size-4" />
          </button>
        )}
      </div>
      {open.has(region.id) && (
        <div className="flex flex-col gap-2 p-2.5">
          {/* Assign at the kawasan regardless of scope; only the target is scope-bound. */}
          <PlacementBlock
            id={`${region.id}-placement`}
            title={t('schedules:board.placementKawasan')}
            count={sumTotals(region.placement)}
            open={open.has(`${region.id}:placement`)}
            onToggle={() => toggle(`${region.id}:placement`)}
          >
            <ShiftRoleTable
              shifts={region.placement}
              {...tableProps}
              onAssign={mkAssign({ district_id: districtId, region_id: region.id })}
              onAssignTeam={mkAssignTeam({ district_id: districtId, region_id: region.id })}
              roleTargets={regionRoleTargets}
              roleCounts={regionRoleCounts}
            />
          </PlacementBlock>
          {region.locations.length > 0 && (
            <div className="flex flex-col gap-2 border-l-2 border-nb-info/40">
              {region.locations.map((loc) => (
                <LocationCard
                  key={loc.id}
                  loc={loc}
                  onAssign={mkAssign({
                    district_id: districtId,
                    region_id: region.id,
                    location_id: loc.id,
                  })}
                  onAssignTeam={mkAssignTeam({
                    district_id: districtId,
                    region_id: region.id,
                    location_id: loc.id,
                  })}
                  onShowMap={onShowMap}
                  open={open.has(loc.id)}
                  onToggle={() => toggle(loc.id)}
                  tableProps={tableProps}
                  capacities={capacities}
                  roleTargets={
                    capacityLevel === 'location'
                      ? subjectRoleTargets(roleCapacities, `loc:${loc.id}:`)
                      : undefined
                  }
                  onEditCapacity={onEditCapacity}
                  showCapacity={capacityLevel === 'location'}
                  indentClass="ml-4"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LocationCard({
  loc,
  onAssign,
  onAssignTeam,
  onShowMap,
  open,
  onToggle,
  tableProps,
  capacities,
  roleTargets,
  onEditCapacity,
  showCapacity = false,
  indentClass = '',
}: {
  loc: BoardLocation;
  /** Container-bound assign (already carries this location's geography). */
  onAssign?: (shiftId: string, role?: string) => void;
  onAssignTeam?: (shiftId: string) => void;
  onShowMap?: (subject: AreaMapSubject) => void;
  open: boolean;
  onToggle: () => void;
  tableProps: TableProps;
  capacities: Map<string, number>;
  /** `<shift>:<role>` targets when this lokasi owns its capacity. */
  roleTargets?: Map<string, number>;
  /**
   * Indent step for this card. Each container puts its own "Penempatan" block at
   * depth 0 and steps its children in by 16px, so depth tracks the actual tree:
   * a lokasi under a kawasan sits deeper than one hanging straight off the
   * district. Gives the hierarchy a second channel besides the border colour
   * (colour alone fails WCAG 2.1 AA).
   */
  indentClass?: string;
  onEditCapacity?: (subject: StaffSubject) => void;
  /** True only when the parent district's `staffing_level` is `location`, i.e. this
   *  lokasi owns its capacity. Never inferred from tree position — a lokasi under
   *  a kawasan owns capacity too when the district is lokasi-scoped. */
  showCapacity?: boolean;
}) {
  const { t } = useTranslation(['schedules']);
  return (
    <div
      className={`overflow-hidden rounded-nb-base border-2 border-l-[6px] border-nb-black border-l-nb-warning bg-nb-white ${indentClass}`}
    >
      <div className="flex w-full flex-wrap items-center gap-2.5 px-3 py-2.5">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 flex-wrap items-center gap-2.5 text-left"
          aria-expanded={open}
        >
          <Chevron open={open} />
          <span className="font-bold">{loc.name}</span>
          <span className="ml-auto flex flex-wrap items-center gap-1.5">
            {loc.shifts.map((s) => (
              <ShiftPill
                key={s.shift.id}
                group={s}
                target={showCapacity ? capacities.get(`loc:${loc.id}:${s.shift.id}`) : undefined}
                roleTargets={roleTargets}
              />
            ))}
          </span>
        </button>
        {onShowMap && (
          <span className="mr-2">
            <MapButton
              label={t('schedules:board.showMap')}
              onClick={() => onShowMap({ level: 'location', id: loc.id, name: loc.name })}
            />
          </span>
        )}
        {showCapacity && onEditCapacity && (
          <button
            type="button"
            onClick={() => onEditCapacity({ type: 'location', id: loc.id, name: loc.name })}
            className="grid size-8 shrink-0 place-items-center rounded-nb-base border-2 border-nb-black bg-nb-white shadow-nb-sm hover:bg-nb-gray-50"
            aria-label={t('schedules:staffCapacity.title')}
            title={t('schedules:staffCapacity.title')}
          >
            <Settings2 className="size-4" />
          </button>
        )}
      </div>
      {open && (
        <div className="border-t-2 border-dashed border-nb-black p-3">
          <ShiftRoleTable
            shifts={loc.shifts}
            {...tableProps}
            onAssign={onAssign}
            onAssignTeam={onAssignTeam}
            roleTargets={roleTargets}
          />
        </div>
      )}
    </div>
  );
}

function ShiftPill({
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
          ? 'border-dashed border-nb-gray-300 text-nb-gray-400'
          : 'border-nb-black bg-nb-gray-50 text-nb-gray-600'
      }`}
    >
      S{short}·{group.total}
    </span>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border-2 border-nb-black bg-nb-gray-50 px-2.5 py-0.5 text-nb-caption font-bold tabular-nums text-nb-gray-600">
      {children}
    </span>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <ChevronDown
      className={`size-4 shrink-0 transition-transform ${open ? '' : '-rotate-90'}`}
      aria-hidden
    />
  );
}
