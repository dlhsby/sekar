'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings2 } from 'lucide-react';
import {
  autoExpandedIds,
  buildDayBoard,
  hasAnyBoardFilter,
  pruneDayBoard,
  CITY_NODE_ID,
  type BoardFilters,
  type BoardMasterData,
  type DaySummaryIndex,
  workersOf,
} from '@/lib/schedules/dayBoard';
import type { ScheduleOccurrence } from '@/lib/api/schedule-events';
import type { StaffSubject } from '@/lib/api/location-staff-requirements';
import { EmptyState } from '@/components/ui';
import { ShiftRoleTable } from '@/components/schedules/ShiftRoleTable';
import type { AreaMapSubject } from '@/components/schedules/AreaMapModal';
import {
  capacityPills,
  districtSubtree,
  rollupTargets,
  subjectRoleTargets,
  subtreeRoleCounts,
} from '@/components/schedules/boardRollups';
import { AssignmentBlock, Chevron, MapButton, Pill, ShiftPill } from '@/components/schedules/BoardPrimitives';
import { LocationCard, RegionCard } from '@/components/schedules/BoardCards';
import type {
  AssignContext,
  AssignSubject,
} from '@/components/schedules/boardTypes';

// Re-exported: the schedules page imports `AssignContext` from here, and it is
// the board's public vocabulary regardless of which file declares it.
export type { AssignContext };

const EMPTY_CAPACITIES = new Map<string, number>();


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
  /**
   * Server-side tallies for the collapsed board (`GET /schedules/day-summary`).
   *
   * When present, `occurrences` is no longer the whole day — it holds only the
   * containers the operator has opened — and every headline count comes from
   * here instead. Omit it and the board behaves exactly as before, deriving
   * everything from `occurrences` (week/month views, unit tests).
   */
  summary?: DaySummaryIndex;
  /**
   * A container was opened: fetch its rows. Called once per container id as it
   * enters the open set; the caller is expected to cache.
   */
  onExpandContainer?: (containerId: string) => void;
  /** Container ids whose rows are in flight — those cards show a skeleton. */
  loadingContainers?: Set<string>;
}

/** Stable empty set so the default prop doesn't re-render on every parent pass. */
const EMPTY_LOADING: Set<string> = new Set();

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
  summary,
  onExpandContainer,
  loadingContainers = EMPTY_LOADING,
}: DayBoardProps) {
  const { t } = useTranslation(['schedules', 'common']);
  const tree = useMemo(
    () => pruneDayBoard(buildDayBoard(occurrences, master, summary), filters, summary),
    [occurrences, master, filters, summary]
  );
  // Distinct people across the whole board. With a summary this is Postgres's
  // count; without one (week/month, tests) the client still holds every
  // occurrence and can union the ids itself.
  const cityWorkerCount = summary
    ? summary.cityWorkers
    : new Set(tree.flatMap((d) => d.workerIds)).size;

  // "Nobody works today" must be read from the SUMMARY, not from `occurrences`:
  // with lazy loading the latter is empty until a card is opened, so the banner
  // claimed an empty day on every fully-populated board.
  const dayIsEmpty = summary ? summary.counts.size === 0 : occurrences.length === 0;
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

  // Fetch a container's rows the first time it is open.
  //
  // Driven off `open` rather than off `toggle` so the filter re-seed above is
  // covered too: `autoExpandedIds` can open a container nobody clicked, and its
  // rows are just as needed. Ids are only ever added here, so each container is
  // requested once per criteria set; caching is the caller's job (a query key).
  //
  // The bookkeeping lives entirely inside the effect — a ref must not be read or
  // written while rendering.
  const requested = useRef<{ signature: string; ids: Set<string> }>({
    signature,
    ids: new Set(),
  });
  useEffect(() => {
    if (!onExpandContainer) return;
    // A filter change replaces the whole result set, so anything fetched under
    // the previous criteria has to be requested again.
    if (requested.current.signature !== signature) {
      requested.current = { signature, ids: new Set() };
    }
    for (const id of open) {
      // The assignment blocks are `<containerId>:assignment`, not containers.
      if (id.includes(':') || requested.current.ids.has(id)) continue;
      requested.current.ids.add(id);
      onExpandContainer(id);
    }
  }, [open, signature, onExpandContainer]);

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
      ) : dayIsEmpty ? (
        <p className="rounded-nb-base border-2 border-dashed border-nb-black bg-nb-gray-50 py-5 text-center text-nb-body-sm text-nb-gray-500">
          {t('schedules:board.emptyDay')}
        </p>
      ) : null}
      {(() => {
        const renderCard = (district: (typeof tree)[number], nested?: React.ReactNode) => {
        const locCount =
          district.regions.reduce((a, r) => a + r.locations.length, 0) + district.looseLocations.length;
        // Exactly one tier owns capacity, decided by the district — never inferred
        // from where a node sits in the tree. The city node has no district, so it
        // owns nothing.
        const capacityLevel = district.id === CITY_NODE_ID ? undefined : district.staffing_level;
        // Rayon-level understaffing: countable (satgas+linmas) across the whole
        // subtree vs the district target. Only for district-scope, else the target
        // belongs to a kawasan/lokasi and showing it here would double-count.
        const shiftIds = district.assignment.map((g) => g.shift.id);
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
            // Stable hook so a test (or a11y tooling) can scope to ONE card. With
            // Surabaya nesting every rayon, a document-wide getAllByRole(...)[0]
            // now hits the city's controls first.
            data-testid={`board-card-${district.id}`}
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
                      group={{ shift, byRole: {}, teams: [], countableByRole: {}, countable, total: countable, userIds: [] }}
                      target={target}
                      rolledUp={rolledUp}
                      roleTargets={rolledUp ? undefined : districtRoleTargets}
                      roleCounts={districtRoleCounts}
                    />
                  ))}
                  <Pill>
                    {t('schedules:board.petugasCount', {
                      // Display-only roll-up: Surabaya visibly CONTAINS every rayon,
                      // so a parent count smaller than its children would read as a
                      // bug. Kept out of the data model — pruneDayBoard uses `total`
                      // to decide emptiness.
                      // PEOPLE, not occurrences: a worker covering two lokasi in
                      // one day is one petugas (ADR-053). Summing `total` counted
                      // them twice the moment multi-place days became possible.
                      // `workerCount` rather than `workerIds.length`: the board
                      // no longer holds every occurrence, so the client cannot
                      // union the ids — the summary carries the DISTINCT figure
                      // Postgres computed per tier.
                      count:
                        district.id === CITY_NODE_ID
                          ? cityWorkerCount
                          : district.workerCount,
                    })}
                  </Pill>
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
                {/* The card's counts are already on screen (they came from the
                    summary); only the NAMES are still in flight. Saying so beats
                    an empty table that reads as "nobody is scheduled here". */}
                {loadingContainers.has(district.id) && (
                  <p role="status" className="text-nb-body-sm text-nb-gray-500">
                    {t('schedules:board.loadingWorkers')}
                  </p>
                )}
                {/* Surabaya holds nothing but city-wide assignments, so its shift
                    + role table IS its body — no "Penempatan" wrapper to
                    distinguish it from siblings it doesn't have. Gating it on
                    already-having-content made a city-wide schedule impossible to
                    assign: no table, so no way in, so the table never appeared. */}
                {district.id === CITY_NODE_ID ? (
                  <AssignmentBlock
                    id={`${district.id}-assignment`}
                    title={t('schedules:board.assignmentCity')}
                    count={workersOf(district.assignment).length}
                    open={open.has(`${district.id}:assignment`)}
                    onToggle={() => toggle(`${district.id}:assignment`)}
                  >
                    <ShiftRoleTable
                      shifts={district.assignment}
                      {...tableProps}
                      onAssign={mkAssign({ city: true })}
                      onAssignTeam={mkAssignTeam({ city: true })}
                    />
                  </AssignmentBlock>
                ) : (
                  <AssignmentBlock
                    id={`${district.id}-assignment`}
                    title={t('schedules:board.assignmentDistrict')}
                    count={workersOf(district.assignment).length}
                    open={open.has(`${district.id}:assignment`)}
                    onToggle={() => toggle(`${district.id}:assignment`)}
                  >
                    <ShiftRoleTable
                      shifts={district.assignment}
                      {...tableProps}
                      onAssign={mkAssign({ district_id: district.id })}
                      onAssignTeam={mkAssignTeam({ district_id: district.id })}
                      roleTargets={districtRoleTargets}
                      roleCounts={districtRoleCounts}
                    />
                  </AssignmentBlock>
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
                  !district.assignment.some((s) => s.total > 0) && (
                    <p className="py-6 text-center text-nb-body-sm text-nb-gray-500">
                      {t('schedules:board.emptyDistrict')}
                    </p>
                  )}
              </div>
            )}
            {/* Gated on the card's own open state — otherwise collapsing Surabaya
                would hide its header body but leave every nested rayon on screen. */}
            {open.has(district.id) && nested}
          </section>
        );
        };
        // EXPERIMENT: Surabaya is the root container — every rayon renders INSIDE
        // it rather than as a sibling, so the city reads as one tree instead of a
        // city card followed by eight unrelated cards.
        const city = tree.find((d) => d.id === CITY_NODE_ID);
        const rayons = tree.filter((d) => d.id !== CITY_NODE_ID);
        const nestedRayons = (
          <div className="flex flex-col gap-3 border-t-2 border-nb-black bg-nb-gray-50 p-3">
            {rayons.map((d) => renderCard(d))}
          </div>
        );
        return city ? renderCard(city, nestedRayons) : rayons.map((d) => renderCard(d));
      })()}
    </div>
  );
}




