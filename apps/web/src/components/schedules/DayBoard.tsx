'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Settings2 } from 'lucide-react';
import {
  buildDayBoard,
  CITY_NODE_ID,
  type BoardLocation,
  type BoardMasterData,
  type BoardRayon,
  type BoardRegion,
  type BoardShiftGroup,
} from '@/lib/schedules/dayBoard';
import type { ScheduleOccurrence } from '@/lib/api/schedule-events';
import type { StaffSubject } from '@/lib/api/location-staff-requirements';
import type { StaffingLevel } from '@/types/models';
import { ShiftRoleTable } from '@/components/schedules/ShiftRoleTable';

const EMPTY_CAPACITIES = new Map<string, number>();

/**
 * Where a "+ Tugaskan" was clicked — the shift/role plus the container's
 * geography, so the create modal opens pre-filled at that subject (no re-picking
 * the Rayon▸Kawasan▸Lokasi cascade).
 */
export interface AssignContext {
  shiftId: string;
  role?: string;
  rayon_id?: string;
  region_id?: string;
  location_id?: string;
  /** City-wide placement (Seluruh Surabaya). */
  city?: boolean;
}

/** Geography half of an AssignContext (the container it was clicked in). */
type AssignSubject = Omit<AssignContext, 'shiftId' | 'role'>;

interface DayBoardProps {
  occurrences: ScheduleOccurrence[];
  master: BoardMasterData;
  onOccurrenceClick: (occ: ScheduleOccurrence) => void;
  onAssign?: (ctx: AssignContext) => void;
  canAssign?: boolean;
  /** `${locationId}:${shiftId}` → target satgas+linmas headcount (understaffing). */
  capacities?: Map<string, number>;
  /** When present, a gear on each location opens the capacity editor. */
  onEditCapacity?: (subject: StaffSubject) => void;
}

/**
 * Day coverage board (Jadwal redesign P1): Rayon ▸ Kawasan ▸ Lokasi tree, one
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
  onEditCapacity,
}: DayBoardProps) {
  const { t } = useTranslation(['schedules', 'common']);
  const tree = useMemo(() => buildDayBoard(occurrences, master), [occurrences, master]);
  const [open, setOpen] = useState<Set<string>>(new Set());
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

  return (
    <div className="flex flex-col gap-3">
      {occurrences.length === 0 && (
        <p className="rounded-nb-base border-2 border-dashed border-nb-black bg-nb-gray-50 py-5 text-center text-nb-body-sm text-nb-gray-500">
          {t('schedules:board.emptyDay')}
        </p>
      )}
      {tree.map((rayon) => {
        const locCount =
          rayon.regions.reduce((a, r) => a + r.locations.length, 0) + rayon.looseLocations.length;
        // Exactly one tier owns capacity, decided by the rayon — never inferred
        // from where a node sits in the tree. The city node has no rayon, so it
        // owns nothing.
        const capacityLevel = rayon.id === CITY_NODE_ID ? undefined : rayon.staffing_level;
        // Rayon-level understaffing: countable (satgas+linmas) across the whole
        // subtree vs the rayon target. Only for rayon-scope, else the target
        // belongs to a kawasan/lokasi and showing it here would double-count.
        const rayonCapPills = capacityLevel === 'rayon' ? rayonShiftTotals(rayon, capacities) : [];
        return (
          <section
            key={rayon.id}
            className="overflow-hidden rounded-nb-base border-2 border-l-[6px] border-nb-black border-l-nb-primary bg-nb-white shadow-nb-sm"
          >
            <div className="flex items-center border-b-2 border-nb-black bg-nb-gray-200">
            <button
              type="button"
              onClick={() => toggle(rayon.id)}
              className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left text-nb-black"
              aria-expanded={open.has(rayon.id)}
            >
              <Chevron open={open.has(rayon.id)} />
              <span className="text-nb-h3 font-bold">
                {rayon.id === CITY_NODE_ID ? t('schedules:calendar.board.cityLabel') : rayon.name}
              </span>
              <span className="ml-auto flex flex-wrap items-center gap-2">
                {rayonCapPills.map(({ shift, countable, target }) => (
                  <ShiftPill
                    key={shift.id}
                    group={{ shift, countable, total: countable } as BoardShiftGroup}
                    target={target}
                  />
                ))}
                <Pill>{t('schedules:board.petugasCount', { count: rayon.total })}</Pill>
                <Pill>
                  {t('schedules:board.areaCount', {
                    kawasan: rayon.regions.length,
                    lokasi: locCount,
                  })}
                </Pill>
              </span>
            </button>
            {onEditCapacity && capacityLevel === 'rayon' && rayon.id !== CITY_NODE_ID && (
              <button
                type="button"
                onClick={() => onEditCapacity({ type: 'rayon', id: rayon.id, name: rayon.name })}
                className="mr-4 grid size-8 shrink-0 place-items-center rounded-nb-base border-2 border-nb-black bg-nb-white shadow-nb-sm hover:bg-nb-gray-50"
                aria-label={t('schedules:staffCapacity.title')}
                title={t('schedules:staffCapacity.title')}
              >
                <Settings2 className="size-4" />
              </button>
            )}
            </div>

            {open.has(rayon.id) && (
              <div className="flex flex-col gap-3 p-3">
                {rayon.placement.some((s) => s.total > 0) && (
                  <div className="rounded-nb-base border-2 border-l-[6px] border-nb-black border-l-nb-secondary bg-nb-gray-50 p-2.5">
                    <p className="mb-2 text-nb-caption font-bold uppercase tracking-wide text-nb-gray-500">
                      {t('schedules:board.placementRayon')}
                    </p>
                    <ShiftRoleTable
                      shifts={rayon.placement}
                      {...tableProps}
                      onAssign={mkAssign(
                        rayon.id === CITY_NODE_ID ? { city: true } : { rayon_id: rayon.id }
                      )}
                    />
                  </div>
                )}
                {rayon.regions.map((region) => (
                  <RegionCard
                    key={region.id}
                    region={region}
                    rayonId={rayon.id}
                    mkAssign={mkAssign}
                    open={open}
                    toggle={toggle}
                    tableProps={tableProps}
                    capacities={capacities}
                    onEditCapacity={onEditCapacity}
                    capacityLevel={capacityLevel}
                  />
                ))}
                {rayon.looseLocations.map((loc) => (
                  <LocationCard
                    key={loc.id}
                    loc={loc}
                    onAssign={mkAssign({ rayon_id: rayon.id, location_id: loc.id })}
                    open={open.has(loc.id)}
                    onToggle={() => toggle(loc.id)}
                    tableProps={tableProps}
                    capacities={capacities}
                    onEditCapacity={onEditCapacity}
                    showCapacity={capacityLevel === 'location'}
                  />
                ))}
                {rayon.regions.length === 0 &&
                  rayon.looseLocations.length === 0 &&
                  !rayon.placement.some((s) => s.total > 0) && (
                    <p className="py-6 text-center text-nb-body-sm text-nb-gray-500">
                      {t('schedules:board.emptyRayon')}
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

interface TableProps {
  onOccurrenceClick: (occ: ScheduleOccurrence) => void;
  canAssign: boolean;
}

/** Builds a container-bound (shiftId, role) assign handler for a ShiftRoleTable. */
type MkAssign = (subject: AssignSubject) => ((shiftId: string, role?: string) => void) | undefined;

/**
 * Per-shift countable totals for a whole rayon subtree (its own placement + every
 * kawasan placement + every location), paired with the rayon-level target.
 * Only shifts that actually have a target produce a pill.
 */
function rayonShiftTotals(
  rayon: BoardRayon,
  capacities: Map<string, number>
): Array<{ shift: BoardShiftGroup['shift']; countable: number; target: number }> {
  const totals = new Map<string, { shift: BoardShiftGroup['shift']; countable: number }>();
  const accumulate = (g: BoardShiftGroup) => {
    const e = totals.get(g.shift.id) ?? { shift: g.shift, countable: 0 };
    e.countable += g.countable;
    totals.set(g.shift.id, e);
  };
  rayon.placement.forEach(accumulate);
  rayon.looseLocations.forEach((l) => l.shifts.forEach(accumulate));
  rayon.regions.forEach((r) => {
    r.placement.forEach(accumulate);
    r.locations.forEach((l) => l.shifts.forEach(accumulate));
  });

  return [...totals.values()]
    .map((e) => ({ ...e, target: capacities.get(`ray:${rayon.id}:${e.shift.id}`) }))
    .filter((x): x is { shift: BoardShiftGroup['shift']; countable: number; target: number } =>
      x.target != null
    );
}

function RegionCard({
  region,
  rayonId,
  mkAssign,
  open,
  toggle,
  tableProps,
  capacities,
  onEditCapacity,
  capacityLevel,
}: {
  region: BoardRegion;
  rayonId: string;
  mkAssign: MkAssign;
  open: Set<string>;
  toggle: (id: string) => void;
  tableProps: TableProps;
  capacities: Map<string, number>;
  onEditCapacity?: (subject: StaffSubject) => void;
  /** Which tier the parent rayon says owns capacity (undefined = the city node). */
  capacityLevel?: StaffingLevel;
}) {
  const { t } = useTranslation(['schedules']);
  const hasPlacement = region.placement.some((s) => s.total > 0);
  // Kawasan-level understaffing: countable (satgas+linmas) across the region's
  // own placement + all its locations, vs the kawasan target (grouped rayons
  // define KEBUTUHAN at this level). Pills show only for shifts with a target.
  const regionShifts = new Map<string, { shift: BoardShiftGroup['shift']; countable: number }>();
  const accumulate = (g: BoardShiftGroup) => {
    const e = regionShifts.get(g.shift.id) ?? { shift: g.shift, countable: 0 };
    e.countable += g.countable;
    regionShifts.set(g.shift.id, e);
  };
  region.placement.forEach(accumulate);
  region.locations.forEach((loc) => loc.shifts.forEach(accumulate));
  const capPills =
    capacityLevel === 'region'
      ? [...regionShifts.values()]
          .map((e) => ({ e, target: capacities.get(`reg:${region.id}:${e.shift.id}`) }))
          .filter((x) => x.target != null)
      : [];
  return (
    <div className="overflow-hidden rounded-nb-base border-2 border-l-[6px] border-nb-black border-l-nb-info">
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
            {capPills.map(({ e, target }) => (
              <ShiftPill
                key={e.shift.id}
                group={
                  { shift: e.shift, countable: e.countable, total: e.countable } as BoardShiftGroup
                }
                target={target}
              />
            ))}
            <Pill>{t('schedules:board.petugasCount', { count: region.total })}</Pill>
            <Pill>{t('schedules:board.lokasiCount', { count: region.locations.length })}</Pill>
          </span>
        </button>
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
          {hasPlacement && (
            <div className="rounded-nb-base border-2 border-nb-black border-l-[6px] border-l-nb-secondary bg-nb-gray-50 p-2.5">
              <p className="mb-2 text-nb-caption font-bold uppercase tracking-wide text-nb-gray-500">
                {t('schedules:board.placementKawasan')}
              </p>
              <ShiftRoleTable
                shifts={region.placement}
                {...tableProps}
                onAssign={mkAssign({ rayon_id: rayonId, region_id: region.id })}
              />
            </div>
          )}
          {region.locations.map((loc) => (
            <LocationCard
              key={loc.id}
              loc={loc}
              onAssign={mkAssign({ rayon_id: rayonId, region_id: region.id, location_id: loc.id })}
              open={open.has(loc.id)}
              onToggle={() => toggle(loc.id)}
              tableProps={tableProps}
              capacities={capacities}
              onEditCapacity={onEditCapacity}
              showCapacity={capacityLevel === 'location'}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LocationCard({
  loc,
  onAssign,
  open,
  onToggle,
  tableProps,
  capacities,
  onEditCapacity,
  showCapacity = false,
}: {
  loc: BoardLocation;
  /** Container-bound assign (already carries this location's geography). */
  onAssign?: (shiftId: string, role?: string) => void;
  open: boolean;
  onToggle: () => void;
  tableProps: TableProps;
  capacities: Map<string, number>;
  onEditCapacity?: (subject: StaffSubject) => void;
  /** True only when the parent rayon's `staffing_level` is `location`, i.e. this
   *  lokasi owns its capacity. Never inferred from tree position — a lokasi under
   *  a kawasan owns capacity too when the rayon is lokasi-scoped. */
  showCapacity?: boolean;
}) {
  const { t } = useTranslation(['schedules']);
  return (
    <div className="overflow-hidden rounded-nb-base border-2 border-l-[6px] border-nb-black border-l-nb-warning bg-nb-white">
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
              />
            ))}
          </span>
        </button>
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
          <ShiftRoleTable shifts={loc.shifts} {...tableProps} onAssign={onAssign} />
        </div>
      )}
    </div>
  );
}

function ShiftPill({ group, target }: { group: BoardShiftGroup; target?: number }) {
  const { t } = useTranslation(['schedules']);
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
    return (
      <span
        title={t('schedules:board.shiftStaffTooltip', {
          shift: group.shift.name,
          countable: group.countable,
          target,
        })}
        className={`inline-flex items-center gap-1 rounded-full border-2 border-nb-black px-2 py-0.5 text-nb-caption font-bold tabular-nums ${cls}`}
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
