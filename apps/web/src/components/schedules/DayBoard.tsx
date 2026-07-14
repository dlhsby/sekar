'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Settings2 } from 'lucide-react';
import {
  buildDayBoard,
  type BoardLocation,
  type BoardMasterData,
  type BoardRegion,
  type BoardShiftGroup,
} from '@/lib/schedules/dayBoard';
import type { ScheduleOccurrence } from '@/lib/api/schedule-events';
import { ShiftRoleTable } from '@/components/schedules/ShiftRoleTable';

const EMPTY_CAPACITIES = new Map<string, number>();

interface DayBoardProps {
  occurrences: ScheduleOccurrence[];
  master: BoardMasterData;
  onOccurrenceClick: (occ: ScheduleOccurrence) => void;
  onAssign?: (shiftId: string, role?: string) => void;
  canAssign?: boolean;
  /** `${locationId}:${shiftId}` → target satgas+linmas headcount (understaffing). */
  capacities?: Map<string, number>;
  /** When present, a gear on each location opens the capacity editor. */
  onEditCapacity?: (locationId: string, name: string) => void;
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

  const tableProps = { onOccurrenceClick, onAssign, canAssign };

  return (
    <div className="flex flex-col gap-3">
      {tree.map((rayon) => {
        const locCount =
          rayon.regions.reduce((a, r) => a + r.locations.length, 0) + rayon.looseLocations.length;
        return (
          <section
            key={rayon.id}
            className="overflow-hidden rounded-nb-base border-2 border-l-[6px] border-nb-black border-l-nb-primary bg-nb-white shadow-nb-sm"
          >
            <button
              type="button"
              onClick={() => toggle(rayon.id)}
              className="flex w-full flex-wrap items-center gap-3 border-b-2 border-nb-black bg-nb-gray-200 px-4 py-3 text-left text-nb-black aria-expanded:border-b-2"
              aria-expanded={open.has(rayon.id)}
            >
              <Chevron open={open.has(rayon.id)} />
              <span className="text-nb-h3 font-bold">{rayon.name}</span>
              <span className="ml-auto flex flex-wrap items-center gap-2">
                <Pill>{t('schedules:board.petugasCount', { count: rayon.total })}</Pill>
                <Pill>
                  {t('schedules:board.areaCount', {
                    kawasan: rayon.regions.length,
                    lokasi: locCount,
                  })}
                </Pill>
              </span>
            </button>

            {open.has(rayon.id) && (
              <div className="flex flex-col gap-3 p-3">
                {rayon.regions.map((region) => (
                  <RegionCard
                    key={region.id}
                    region={region}
                    open={open}
                    toggle={toggle}
                    tableProps={tableProps}
                    capacities={capacities}
                    onEditCapacity={onEditCapacity}
                  />
                ))}
                {rayon.looseLocations.map((loc) => (
                  <LocationCard
                    key={loc.id}
                    loc={loc}
                    open={open.has(loc.id)}
                    onToggle={() => toggle(loc.id)}
                    tableProps={tableProps}
                    capacities={capacities}
                    onEditCapacity={onEditCapacity}
                  />
                ))}
                {rayon.regions.length === 0 && rayon.looseLocations.length === 0 && (
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
  onAssign?: (shiftId: string, role?: string) => void;
  canAssign: boolean;
}

function RegionCard({
  region,
  open,
  toggle,
  tableProps,
  capacities,
  onEditCapacity,
}: {
  region: BoardRegion;
  open: Set<string>;
  toggle: (id: string) => void;
  tableProps: TableProps;
  capacities: Map<string, number>;
  onEditCapacity?: (locationId: string, name: string) => void;
}) {
  const { t } = useTranslation(['schedules']);
  const hasPlacement = region.placement.some((s) => s.total > 0);
  return (
    <div className="overflow-hidden rounded-nb-base border-2 border-l-[6px] border-nb-black border-l-nb-info">
      <button
        type="button"
        onClick={() => toggle(region.id)}
        className="flex w-full flex-wrap items-center gap-2.5 border-b-2 border-nb-black bg-nb-gray-100 px-3 py-2.5 text-left"
        aria-expanded={open.has(region.id)}
      >
        <Chevron open={open.has(region.id)} />
        <span className="text-nb-caption font-bold uppercase tracking-wide">{region.name}</span>
        <span className="ml-auto flex flex-wrap items-center gap-2">
          <Pill>{t('schedules:board.petugasCount', { count: region.total })}</Pill>
          <Pill>{t('schedules:board.lokasiCount', { count: region.locations.length })}</Pill>
        </span>
      </button>
      {open.has(region.id) && (
        <div className="flex flex-col gap-2 p-2.5">
          {hasPlacement && (
            <div className="rounded-nb-base border-2 border-nb-black border-l-[6px] border-l-nb-secondary bg-nb-gray-50 p-2.5">
              <p className="mb-2 text-nb-caption font-bold uppercase tracking-wide text-nb-gray-500">
                {t('schedules:board.placementKawasan')}
              </p>
              <ShiftRoleTable shifts={region.placement} {...tableProps} />
            </div>
          )}
          {region.locations.map((loc) => (
            <LocationCard
              key={loc.id}
              loc={loc}
              open={open.has(loc.id)}
              onToggle={() => toggle(loc.id)}
              tableProps={tableProps}
              capacities={capacities}
              onEditCapacity={onEditCapacity}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LocationCard({
  loc,
  open,
  onToggle,
  tableProps,
  capacities,
  onEditCapacity,
}: {
  loc: BoardLocation;
  open: boolean;
  onToggle: () => void;
  tableProps: TableProps;
  capacities: Map<string, number>;
  onEditCapacity?: (locationId: string, name: string) => void;
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
                target={capacities.get(`${loc.id}:${s.shift.id}`)}
              />
            ))}
          </span>
        </button>
        {onEditCapacity && (
          <button
            type="button"
            onClick={() => onEditCapacity(loc.id, loc.name)}
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
          <ShiftRoleTable shifts={loc.shifts} {...tableProps} />
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
    const cls = understaffed
      ? 'bg-nb-danger-light text-nb-danger-dark'
      : 'bg-nb-success-light text-nb-success-dark';
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
  return (
    <span
      title={t('schedules:board.shiftTotalTooltip', {
        shift: group.shift.name,
        count: group.total,
      })}
      className="inline-flex items-center gap-1 rounded-full border-2 border-nb-black bg-nb-gray-50 px-2 py-0.5 text-nb-caption font-bold tabular-nums text-nb-gray-600"
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
