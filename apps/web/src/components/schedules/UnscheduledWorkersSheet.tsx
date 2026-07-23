'use client';

import { useMemo, useState } from 'react';
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
  /** Open Buat Jadwal prefilled with this worker + the panel's date/shift. */
  onSchedule: (worker: UnscheduledWorker, date: string, shiftId: string | null) => void;
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
 */
export function UnscheduledWorkersSheet({
  open,
  onOpenChange,
  initialDate,
  shifts,
  districts,
  onSchedule,
}: UnscheduledWorkersSheetProps) {
  const { t } = useTranslation(['schedules', 'common', 'roles']);

  const [date, setDate] = useState(initialDate);
  const [shiftId, setShiftId] = useState<string>('all');
  const [districtId, setDistrictId] = useState<string>('all');
  const [role, setRole] = useState<string>('all');
  const [showUnavailable, setShowUnavailable] = useState(false);

  const filters = useMemo(
    () => ({
      date,
      shiftDefinitionId: shiftId === 'all' ? null : shiftId,
      districtId: districtId === 'all' ? null : districtId,
      role: role === 'all' ? null : (role as ScheduleWorkerRole),
    }),
    [date, shiftId, districtId, role],
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
    ],
    [t],
  );

  const rowActions = useMemo(
    () => () => [
      {
        key: 'schedule',
        label: t('schedules:unscheduled.actionSchedule'),
        icon: CalendarPlus,
        onClick: (row: UnscheduledWorker) =>
          onSchedule(row, date, shiftId === 'all' ? null : shiftId),
      },
    ],
    [t, onSchedule, date, shiftId],
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
              onChange={setDistrictId}
              options={districtOptions}
            />
            <FormSelect
              label={t('schedules:unscheduled.roleLabel')}
              value={role}
              onChange={setRole}
              options={roleOptions}
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
                  searchPlaceholder={t('schedules:unscheduled.searchPlaceholder')}
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
