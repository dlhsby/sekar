'use client';

/**
 * The kawasan and lokasi cards.
 *
 * Both are pure renderers of one board node: header with capacity pills and a
 * headcount, body with a `ShiftRoleTable`. Split out of `DayBoard.tsx`, which
 * keeps the district/city level and all of the state.
 */
import { useTranslation } from 'react-i18next';
import { Settings2 } from 'lucide-react';
import {
  workersOf,
  type BoardLocation,
  type BoardRegion,
  type BoardShiftGroup,
} from '@/lib/schedules/dayBoard';
import type { StaffSubject } from '@/lib/api/location-staff-requirements';
import type { StaffingLevel } from '@/types/models';
import { ShiftRoleTable } from '@/components/schedules/ShiftRoleTable';
import type { AreaMapSubject } from '@/components/schedules/AreaMapModal';
import type { MkAssign, MkAssignTeam, TableProps } from '@/components/schedules/boardTypes';
import {
  AssignmentBlock,
  Chevron,
  MapButton,
  Pill,
  ShiftPill,
} from '@/components/schedules/BoardPrimitives';
import {
  capacityPills,
  regionSubtree,
  rollupTargets,
  subjectRoleTargets,
  subtreeRoleCounts,
} from '@/components/schedules/boardRollups';

export function RegionCard({
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
  // own assignment + all its locations, vs the kawasan target (grouped districts
  // define KEBUTUHAN at this level). Pills show only for shifts with a target.
  const regionShifts = new Map<string, { shift: BoardShiftGroup['shift']; countable: number }>();
  const accumulate = (g: BoardShiftGroup) => {
    const e = regionShifts.get(g.shift.id) ?? { shift: g.shift, countable: 0 };
    e.countable += g.countable;
    regionShifts.set(g.shift.id, e);
  };
  region.assignment.forEach(accumulate);
  region.locations.forEach((loc) => loc.shifts.forEach(accumulate));
  const regionRoleTargets =
    capacityLevel === 'region'
      ? subjectRoleTargets(roleCapacities, `reg:${region.id}:`)
      : undefined;
  // A kawasan's target is met by its own assignment PLUS its lokasi.
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
          region.assignment.map((g) => g.shift.id)
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
                group={{ shift, byRole: {}, teams: [], countableByRole: {}, countable, total: countable, userIds: [] }}
                target={target}
                rolledUp={rolledUp}
                roleTargets={rolledUp ? undefined : regionRoleTargets}
                roleCounts={regionRoleCounts}
              />
            ))}
            <Pill>{t('schedules:board.petugasCount', { count: region.workerCount })}</Pill>
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
          <AssignmentBlock
            id={`${region.id}-assignment`}
            title={t('schedules:board.assignmentKawasan')}
            count={workersOf(region.assignment).length}
            open={open.has(`${region.id}:assignment`)}
            onToggle={() => toggle(`${region.id}:assignment`)}
          >
            <ShiftRoleTable
              shifts={region.assignment}
              {...tableProps}
              onAssign={mkAssign({ district_id: districtId, region_id: region.id })}
              onAssignTeam={mkAssignTeam({ district_id: districtId, region_id: region.id })}
              roleTargets={regionRoleTargets}
              roleCounts={regionRoleCounts}
            />
          </AssignmentBlock>
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


export function LocationCard({
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
          {/* Deactivated, but people are still rostered here — say so rather than
              hide the card, which is what made those workers invisible while the
              rayon's headcount kept counting them. */}
          {loc.is_active === false && (
            <span className="rounded-nb-sm border-2 border-nb-black bg-nb-warning-light px-1.5 py-0.5 text-nb-caption font-bold uppercase">
              {t('schedules:board.inactiveLokasi')}
            </span>
          )}
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
