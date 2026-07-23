'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarPlus, ChevronDown, ChevronRight } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  DataTable,
  FormInput,
  FormSelect,
  StatusPill,
  Skeleton,
  EmptyState,
  type ColumnDef,
} from '@/components/ui';
import {
  useUnscheduledWorkers,
  type UnscheduledWorker,
  type UnavailableWorker,
  type ScheduleWorkerRole,
} from '@/lib/api/unscheduled';
import { getErrorMessage } from '@/lib/api/client';

interface UnscheduledWorkersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Seeds the panel's date picker; the panel then owns its own date. */
  initialDate: string;
  shifts: Array<{ id: string; name: string }>;
  districts: Array<{ id: string; name: string }>;
  regions: Array<{ id: string; name: string; district_id: string }>;
  locations: Array<{ id: string; name: string; district_id: string; region_id?: string | null }>;
  /** Open Buat Jadwal prefilled with this worker and the whole target slot. */
  onSchedule: (worker: UnscheduledWorker, target: UnscheduledTarget) => void;
}

/** The slot the filters describe — what `Jadwalkan` fills. */
export interface UnscheduledTarget {
  date: string;
  shiftId: string | null;
  districtId: string | null;
  regionId: string | null;
  locationId: string | null;
}

/** Debounce a changing value, so typing doesn't fire a workforce scan per keystroke. */
function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/**
 * "Belum Dijadwalkan" — who this day's roster has left out (ADR-054).
 *
 * A sheet rather than a modal on purpose: the board stays readable on the left,
 * because seeing the gap you are filling is the whole point. A `DataTable`
 * rather than a hand-rolled list for the same reason the master grids use one —
 * per-column filters, search and row actions already exist, and this view is
 * fundamentally *filter down to the worker you want to place*.
 *
 * The panel owns its own DATE: an admin planning tomorrow should not have to
 * move the board first. Shift is one of the filters they apply, not something
 * inherited silently from behind the sheet.
 *
 * **Every filter describes the TARGET SLOT**, not the worker: date + shift +
 * rayon + kawasan + lokasi say "this is the assignment I am making", and the
 * list answers "who has no schedule matching it". Geography could not filter
 * PEOPLE anyway — a worker carries a rayon and nothing below it — so the
 * cascade narrows the slot and `Jadwalkan` fills exactly that slot.
 */
export function UnscheduledWorkersSheet({
  open,
  onOpenChange,
  initialDate,
  shifts,
  districts,
  regions,
  locations,
  onSchedule,
}: UnscheduledWorkersSheetProps) {
  const { t } = useTranslation(['schedules', 'common', 'roles']);

  const [date, setDate] = useState(initialDate);
  const [shiftId, setShiftId] = useState<string>('all');
  const [districtId, setDistrictId] = useState<string>('all');
  const [regionId, setRegionId] = useState<string>('all');
  const [locationId, setLocationId] = useState<string>('all');
  const [role, setRole] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showUnavailable, setShowUnavailable] = useState(false);
  const debouncedSearch = useDebounced(search.trim(), 300);

  /**
   * Narrowing the target cascades DOWN: a kawasan outside the chosen rayon, or a
   * lokasi outside the chosen kawasan, describes a slot that cannot exist.
   */
  const onDistrictChange = (next: string) => {
    setDistrictId(next);
    setRegionId('all');
    setLocationId('all');
  };
  const onRegionChange = (next: string) => {
    setRegionId(next);
    setLocationId('all');
  };

  const target = useMemo(
    () => ({
      date,
      shiftId: shiftId === 'all' ? null : shiftId,
      districtId: districtId === 'all' ? null : districtId,
      regionId: regionId === 'all' ? null : regionId,
      locationId: locationId === 'all' ? null : locationId,
    }),
    [date, shiftId, districtId, regionId, locationId],
  );

  const filters = useMemo(
    () => ({
      date: target.date,
      shiftDefinitionId: target.shiftId,
      districtId: target.districtId,
      regionId: target.regionId,
      locationId: target.locationId,
      role: role === 'all' ? null : (role as ScheduleWorkerRole),
      // Server-side because it also spans the TEAMS a worker is scheduled on,
      // which the client never sees for anyone outside the current page.
      q: debouncedSearch || null,
    }),
    [target, role, debouncedSearch],
  );

  // Gated on `open`: this scans the whole schedulable workforce, so it must not
  // run while the sheet is closed.
  const { data, isLoading, error } = useUnscheduledWorkers(filters, open);

  const columns = useMemo<ColumnDef<UnscheduledWorker>[]>(
    () => [
      {
        id: 'full_name',
        accessorFn: (r) => r.full_name,
        header: t('schedules:unscheduled.columnName'),
        meta: { label: t('schedules:unscheduled.columnName') },
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-bold text-nb-black">{row.original.full_name}</div>
            <div className="truncate font-mono text-nb-caption text-nb-gray-500">
              @{row.original.username}
            </div>
          </div>
        ),
      },
      {
        id: 'role',
        accessorFn: (r) => t(`roles:${r.role}`),
        header: t('schedules:unscheduled.columnRole'),
        // Role is how the admin decides WHO to place, so it is a first-class
        // filterable column rather than a subtitle (ADR-054 §4).
        meta: {
          label: t('schedules:unscheduled.columnRole'),
          filterVariant: 'enum',
          filterOptions: (['satgas', 'linmas', 'korlap'] as const).map((r) => ({
            value: t(`roles:${r}`),
            label: t(`roles:${r}`),
          })),
        },
      },
      {
        id: 'district_name',
        accessorFn: (r) => r.district_name ?? '—',
        header: t('schedules:unscheduled.columnDistrict'),
        meta: { label: t('schedules:unscheduled.columnDistrict') },
      },
      {
        id: 'teams',
        accessorFn: (r) => r.teams.join(', '),
        header: t('schedules:unscheduled.columnTeam'),
        // Why a worker free for THIS slot may still be busy elsewhere today —
        // and what the search matches on, so the behaviour is discoverable.
        meta: { label: t('schedules:unscheduled.columnTeam') },
        cell: ({ row }) =>
          row.original.teams.length ? (
            <span className="text-nb-body-sm">{row.original.teams.join(', ')}</span>
          ) : (
            <span className="text-nb-gray-400">—</span>
          ),
      },
    ],
    [t],
  );

  const rowActions = useMemo(
    () => () => [
      {
        key: 'schedule',
        label: t('schedules:unscheduled.actionSchedule'),
        icon: CalendarPlus,
        // Fills exactly the slot the filters describe.
        onClick: (row: UnscheduledWorker) => onSchedule(row, target),
      },
    ],
    [t, onSchedule, target],
  );

  const shiftOptions = useMemo(
    () => [
      { value: 'all', label: t('schedules:unscheduled.allShifts') },
      ...shifts.map((s) => ({ value: s.id, label: s.name })),
    ],
    [shifts, t],
  );
  const districtOptions = useMemo(
    () => [
      { value: 'all', label: t('schedules:unscheduled.allDistricts') },
      ...districts.map((d) => ({ value: d.id, label: d.name })),
    ],
    [districts, t],
  );
  // Kawasan narrows within the chosen rayon; lokasi within the chosen kawasan,
  // falling back to the rayon so a district-direct lokasi (region_id null) stays
  // reachable — the Rayon Taman Aktif case.
  const regionOptions = useMemo(
    () => [
      { value: 'all', label: t('schedules:unscheduled.allRegions') },
      ...regions
        .filter((r) => districtId === 'all' || r.district_id === districtId)
        .map((r) => ({ value: r.id, label: r.name })),
    ],
    [regions, districtId, t],
  );
  const locationOptions = useMemo(
    () => [
      { value: 'all', label: t('schedules:unscheduled.allLocations') },
      ...locations
        .filter((l) => districtId === 'all' || l.district_id === districtId)
        .filter((l) => regionId === 'all' || l.region_id === regionId)
        .map((l) => ({ value: l.id, label: l.name })),
    ],
    [locations, districtId, regionId, t],
  );
  const roleOptions = useMemo(
    () => [
      { value: 'all', label: t('schedules:unscheduled.allRoles') },
      ...(['satgas', 'linmas', 'korlap'] as const).map((r) => ({
        value: r,
        label: t(`roles:${r}`),
      })),
    ],
    [t],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="wide">
        <SheetHeader>
          <SheetTitle>{t('schedules:unscheduled.title')}</SheetTitle>
          <SheetDescription>{t('schedules:unscheduled.description')}</SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FormInput
              label={t('schedules:unscheduled.dateLabel')}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <FormSelect
              label={t('schedules:unscheduled.shiftLabel')}
              value={shiftId}
              onChange={setShiftId}
              options={shiftOptions}
            />
            <FormSelect
              label={t('schedules:unscheduled.districtLabel')}
              value={districtId}
              onChange={onDistrictChange}
              options={districtOptions}
            />
            <FormSelect
              label={t('schedules:unscheduled.regionLabel')}
              value={regionId}
              onChange={onRegionChange}
              options={regionOptions}
            />
            <FormSelect
              label={t('schedules:unscheduled.locationLabel')}
              value={locationId}
              onChange={setLocationId}
              options={locationOptions}
            />
            <FormSelect
              label={t('schedules:unscheduled.roleLabel')}
              value={role}
              onChange={setRole}
              options={roleOptions}
            />
            <FormInput
              label={t('schedules:unscheduled.searchLabel')}
              placeholder={t('schedules:unscheduled.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton variant="text" />
              <Skeleton variant="card" />
            </div>
          ) : error ? (
            <EmptyState variant="error" description={getErrorMessage(error)} />
          ) : (
            <>
              {/* The counts ARE the answer — a day is finished when the first hits 0. */}
              <div className="flex flex-wrap items-center gap-2 text-nb-body-sm">
                <StatusPill tone={data && data.totals.unscheduled > 0 ? 'warn' : 'ok'} dot>
                  {t('schedules:unscheduled.pillUnscheduled', {
                    count: data?.totals.unscheduled ?? 0,
                  })}
                </StatusPill>
                <StatusPill tone="neutral" dot>
                  {t('schedules:unscheduled.pillScheduled', { count: data?.totals.scheduled ?? 0 })}
                </StatusPill>
                <span className="text-nb-caption text-nb-gray-500">
                  {t('schedules:unscheduled.ofWorkforce', { count: data?.totals.workforce ?? 0 })}
                </span>
              </div>

              {data && data.unscheduled.length === 0 ? (
                // "Everyone is placed" is a real answer, not an absence of one.
                <EmptyState
                  variant="noData"
                  title={t('schedules:unscheduled.emptyTitle')}
                  description={t('schedules:unscheduled.emptyDescription')}
                />
              ) : (
                <DataTable
                  columns={columns}
                  data={data?.unscheduled ?? []}
                  getRowId={(r) => r.id}
                  rowActions={rowActions}
                  defaultPageSize={10}
                />
              )}

              {/* Excused absences explain a short roster WITHOUT sitting in the
                  list of people to place — collapsed so they never compete. */}
              {data && data.unavailable.length > 0 && (
                <div className="rounded-nb-base border-2 border-nb-black">
                  <button
                    type="button"
                    onClick={() => setShowUnavailable((v) => !v)}
                    className="flex w-full items-center gap-2 p-3 text-left text-nb-body-sm font-bold"
                  >
                    {showUnavailable ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    {t('schedules:unscheduled.unavailableTitle', {
                      count: data.unavailable.length,
                    })}
                  </button>
                  {showUnavailable && (
                    <ul className="divide-y-2 divide-nb-gray-200 border-t-2 border-nb-black">
                      {data.unavailable.map((w: UnavailableWorker) => (
                        <li key={w.id} className="flex items-center justify-between gap-3 p-3">
                          <div className="min-w-0">
                            <div className="truncate text-nb-body-sm text-nb-gray-600">
                              {w.full_name}
                            </div>
                            <div className="truncate font-mono text-nb-caption text-nb-gray-500">
                              @{w.username} · {t(`roles:${w.role}`)}
                            </div>
                          </div>
                          <StatusPill tone="info">
                            {t(`schedules:unscheduled.reason.${w.status}`)}
                          </StatusPill>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
