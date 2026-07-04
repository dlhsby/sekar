/**
 * Jadwal (Schedules) Page — the daily roster, the single schedule concept
 * (ADR-013): date picker, status tracking, and row actions (absence, edit, delete).
 */

'use client';

import { useCallback, useMemo, useState } from 'react';
import { format, parse } from 'date-fns';
import { dateFnsLocale } from '@/lib/i18n/date-locale';
import { Plus, Calendar, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DataTable,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  FormSelect,
  Textarea,
  PageHeader,
  RoleAvatar,
  StatusPill,
  type ColumnDef,
  type DataTableRowAction,
} from '@/components/ui';
import { RolePill } from '@/components/users/RolePill';
import { AddScheduleModal } from '@/components/schedules/AddScheduleModal';
import { EditScheduleModal } from '@/components/schedules/EditScheduleModal';
import { AreaListSheet, type AreaListSheetItem } from '@/components/areas/AreaListSheet';
import { getErrorMessage } from '@/lib/api/client';
import {
  useDailyRoster,
  useGenerateRoster,
  useSetLeave,
  useReplaceWorker,
  useUpdateRosterAreas,
  useUpdateRosterShift,
  useAddSchedule,
  useDeleteSchedule,
  type Schedule,
  type LeaveType,
} from '@/lib/api/schedules';
import { useUser } from '@/lib/auth/hooks';
import { ADMIN_ROLES } from '@/lib/constants/roles';
import { useAreas } from '@/lib/api/areas';
import { useShiftDefinitions } from '@/lib/api/shift-definitions';
import { useUsers } from '@/lib/api/users';
import { useUserAreas } from '@/lib/api/user-areas';
import { canEditTargetRole, isGlobalRosterEditor } from '@/lib/schedule-permissions';
import { todayJakartaISODate } from '@/lib/utils/formatters';

/**
 * Map status to tone for StatusPill
 */
function getStatusTone(status: Schedule['status']): 'ok' | 'warn' | 'bad' | 'info' | 'neutral' {
  switch (status) {
    case 'present':
      return 'ok';
    case 'planned':
      return 'info';
    case 'absent':
      return 'bad';
    case 'leave_sick':
    case 'leave_annual':
    case 'leave_permit':
      return 'warn';
    case 'replaced':
    case 'off':
      return 'neutral';
    default:
      return 'neutral';
  }
}

/**
 * Get area names for a schedule (helper)
 */
function getAreaNames(schedule: Schedule, areaById: Map<string, any>): string[] {
  return schedule.schedule_areas
    .map((sa) => areaById.get(sa.area_id)?.name)
    .filter(Boolean) as string[];
}

export default function SchedulesPage() {
  const { t } = useTranslation(['schedules', 'common']);
  const currentUser = useUser();
  // Only admins generate the roster (backend: USER_MANAGERS).
  const canGenerate = !!currentUser && ADMIN_ROLES.includes(currentUser.role);

  // Format status display — use useMemo to handle t dependency
  const formatStatus = useCallback((status: Schedule['status']): string => {
    const statusKey = `status.${status}` as const;
    return t(statusKey, status);
  }, [t]);

  // Default to "today" in WIB (matches the server's roster date) so the roster
  // isn't empty for browsers outside UTC+7.
  const [selectedDate, setSelectedDate] = useState(todayJakartaISODate());

  const { data: rosters, isLoading, error, refetch } = useDailyRoster(selectedDate);
  const schedules = useMemo(() => rosters ?? [], [rosters]);

  const { data: areasData } = useAreas({ limit: 1000 });
  const allAreas = useMemo(() => areasData?.data ?? [], [areasData]);
  // O(1) area lookup for the rayon column (avoids a per-row find over all areas).
  const areaById = useMemo(() => new Map(allAreas.map((a) => [a.id, a])), [allAreas]);

  // Rayons that have areas (the cascade source), de-duplicated from the loaded
  // areas' populated `rayon` relation.
  const allRayons = useMemo(() => {
    const rayonMap = new Map<string, { id: string; name: string }>();
    allAreas.forEach((area) => {
      if (area.rayon && !rayonMap.has(area.rayon.id)) {
        rayonMap.set(area.rayon.id, { id: area.rayon.id, name: area.rayon.name });
      }
    });
    return Array.from(rayonMap.values());
  }, [allAreas]);

  // A korlap edits only rows in their own assigned areas — fetch those to gate
  // the per-row actions (mirrors the backend hierarchy; backend is the real gate).
  const { data: myAreas } = useUserAreas(
    currentUser?.role === 'korlap' ? currentUser.id : undefined,
  );
  const myAreaIds = useMemo(() => (myAreas ?? []).map((a) => a.id), [myAreas]);

  /** Per-row edit permission — mirrors be `SchedulesService.assertCanEdit`. */
  const canEditRoster = useCallback(
    (roster: Schedule): boolean => {
      if (!currentUser) return false;
      const targetRole = roster.user?.role;
      if (!targetRole || !canEditTargetRole(currentUser.role, targetRole)) return false;
      if (isGlobalRosterEditor(currentUser.role)) return true;
      if (currentUser.role === 'kepala_rayon' || currentUser.role === 'admin_data') {
        if (!currentUser.rayon_id) return false;
        if (roster.rayon_id === currentUser.rayon_id) return true;
        return roster.schedule_areas.some(
          (a) => areaById.get(a.area_id)?.rayon?.id === currentUser.rayon_id,
        );
      }
      if (currentUser.role === 'korlap') {
        return roster.schedule_areas.some((a) => myAreaIds.includes(a.area_id));
      }
      return false;
    },
    [currentUser, areaById, myAreaIds],
  );

  const { data: shifts = [] } = useShiftDefinitions();
  const { data: usersData } = useUsers({ limit: 1000 });
  const allUsers = useMemo(() => usersData?.data ?? [], [usersData]);

  const generateRoster = useGenerateRoster();
  const setLeave = useSetLeave();
  const replaceWorker = useReplaceWorker();
  const updateAreas = useUpdateRosterAreas();
  const updateShift = useUpdateRosterShift();
  const addSchedule = useAddSchedule();
  const deleteSchedule = useDeleteSchedule();

  // Modal states
  const [absenceModalOpen, setAbsenceModalOpen] = useState(false);
  const [absenceRosterId, setAbsenceRosterId] = useState<string | null>(null);
  const [absenceType, setAbsenceType] = useState<'sick' | 'annual' | 'permit' | 'off'>('sick');
  const [absenceNotes, setAbsenceNotes] = useState('');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteRosterId, setDeleteRosterId] = useState<string | null>(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editRosterId, setEditRosterId] = useState<string | null>(null);

  const [addModalOpen, setAddModalOpen] = useState(false);

  const [areasSheetRoster, setAreasSheetRoster] = useState<Schedule | null>(null);
  const areasSheetItems = useMemo<AreaListSheetItem[]>(() => {
    if (!areasSheetRoster) return [];
    return areasSheetRoster.schedule_areas.map((sa) => {
      const area = areaById.get(sa.area_id);
      return {
        id: sa.area_id,
        name: area?.name ?? '—',
      };
    });
  }, [areasSheetRoster, areaById]);

  // Delete target: the roster being deleted
  const deleteTarget = useMemo(
    () => schedules.find((r) => r.id === deleteRosterId) ?? null,
    [schedules, deleteRosterId],
  );

  const handleSetAbsence = async () => {
    if (!absenceRosterId) return;

    // Map UI type to API leave_type
    const leaveTypeMap: Record<typeof absenceType, LeaveType> = {
      sick: 'sick',
      annual: 'annual',
      permit: 'permit',
      off: 'off',
    };

    try {
      await setLeave.mutateAsync({
        id: absenceRosterId,
        leave_type: leaveTypeMap[absenceType],
        notes: absenceNotes || undefined,
      });
      toast.success(t('messages.absenceSuccess'));
      setAbsenceModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDeleteSchedule = async () => {
    if (!deleteRosterId) return;
    try {
      await deleteSchedule.mutateAsync(deleteRosterId);
      toast.success(t('messages.deleteSuccess'));
      setDeleteModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleReplaceWorker = async (id: string, replacementUserId: string) => {
    try {
      await replaceWorker.mutateAsync({
        id,
        replacement_user_id: replacementUserId,
      });
    } catch (err) {
      throw err;
    }
  };

  const handleUpdateShiftForEdit = async (id: string, shiftId: string | null) => {
    try {
      await updateShift.mutateAsync({
        id,
        shift_definition_id: shiftId,
      });
    } catch (err) {
      throw err;
    }
  };

  const handleUpdateAreasForEdit = async (id: string, areaIds: string[]) => {
    try {
      await updateAreas.mutateAsync({
        id,
        area_ids: areaIds,
      });
    } catch (err) {
      throw err;
    }
  };

  const handleAddSchedule = async (input: { user_id: string; date: string; shift_definition_id?: string | null; area_ids?: string[] }) => {
    try {
      await addSchedule.mutateAsync(input);
      setAddModalOpen(false);
      refetch();
    } catch (err) {
      throw err;
    }
  };

  const handleGenerate = async () => {
    try {
      const result = await generateRoster.mutateAsync(selectedDate);
      toast.success(`${result.generated} ${t('messages.generateSuccess')}`);
      refetch();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t('messages.generateError')
      );
    }
  };

  const columns = useMemo<ColumnDef<Schedule>[]>(
    () => [
      {
        id: 'full_name',
        accessorFn: (row) => row.user?.full_name ?? '',
        header: t('table.worker'),
        meta: { label: t('table.worker'), filterVariant: 'text' },
        cell: ({ row }) => {
          const roster = row.original;
          const fullName = roster.user?.full_name ?? '—';
          return (
            <div className="flex items-center gap-2.5">
              <RoleAvatar
                name={fullName}
                role={roster.user?.role ?? 'satgas'}
                size="sm"
              />
              <div className="min-w-0">
                <p className="truncate font-bold text-nb-black">{fullName}</p>
                <p className="truncate font-mono text-[11px] text-nb-gray-600">
                  {roster.user?.username ?? '—'}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        id: 'role',
        accessorFn: (row) => row.user?.role ?? '',
        header: t('table.role'),
        meta: { label: t('table.role'), filterVariant: 'text', defaultHidden: true },
        cell: ({ row }) =>
          row.original.user ? <RolePill role={row.original.user.role} /> : <span>—</span>,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: t('table.status'),
        meta: { label: t('table.status'), filterVariant: 'text' },
        cell: ({ row }) => (
          <StatusPill tone={getStatusTone(row.original.status)} dot>
            {formatStatus(row.original.status)}
          </StatusPill>
        ),
      },
      {
        id: 'shift',
        accessorFn: (row) => {
          const shift = row.shift_definition;
          return shift ? `${shift.name} (${shift.start_time}-${shift.end_time})` : '';
        },
        header: t('table.shift'),
        meta: { label: t('table.shift'), filterVariant: 'text' },
        cell: ({ row }) => {
          const shift = row.original.shift_definition;
          return (
            <span className="text-nb-body-sm">
              {shift ? `${shift.name} (${shift.start_time}-${shift.end_time})` : '—'}
            </span>
          );
        },
      },
      {
        id: 'areas',
        accessorFn: (row) => getAreaNames(row, areaById).join(', '),
        header: t('table.area'),
        meta: { label: t('table.area'), filterVariant: 'text' },
        cell: ({ row }) => {
          const roster = row.original;
          const count = roster.schedule_areas.length;
          if (count === 0) return <span className="text-nb-body-sm text-nb-gray-500">—</span>;
          return (
            <button
              type="button"
              onClick={() => setAreasSheetRoster(roster)}
              aria-label={t('buttons.areaCountAriaLabel', { count, name: roster.user?.full_name ?? 'pekerja' })}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border-2 border-nb-black rounded-nb-base bg-nb-white text-nb-body-sm font-bold shadow-nb-xs hover:shadow-nb-sm active:shadow-none transition-shadow duration-100"
            >
              📍
              {t('buttons.areaCount', { count })}
            </button>
          );
        },
      },
      {
        id: 'rayon',
        accessorFn: (row) => {
          const area = areaById.get(row.schedule_areas[0]?.area_id ?? '');
          return area?.rayon?.name ?? '';
        },
        header: t('table.rayon'),
        meta: { label: t('table.rayon'), filterVariant: 'text', defaultHidden: true },
        cell: ({ row }) => {
          const area = areaById.get(row.original.schedule_areas[0]?.area_id ?? '');
          return (
            <span className="text-nb-body-sm">{area?.rayon?.name ?? '—'}</span>
          );
        },
      },
      {
        id: 'replacement',
        accessorFn: (row) => row.replacement_user?.full_name ?? '',
        header: t('table.replacement'),
        meta: { label: t('table.replacement'), filterVariant: 'text', defaultHidden: true },
        cell: ({ row }) => (
          <span className="text-nb-body-sm">
            {row.original.replacement_user?.full_name ?? '—'}
          </span>
        ),
      },
    ],
    [areaById, t],
  );

  const rowActions = useCallback(
    (roster: Schedule): DataTableRowAction<Schedule>[] => {
      if (!canEditRoster(roster)) return [];

      const actions: DataTableRowAction<Schedule>[] = [
        {
          key: 'absence',
          label: t('rowActions.absence'),
          icon: Calendar,
          onClick: () => {
            setAbsenceRosterId(roster.id);
            setAbsenceType('sick');
            setAbsenceNotes('');
            setAbsenceModalOpen(true);
          },
        },
        {
          key: 'edit',
          label: t('rowActions.edit'),
          icon: Pencil,
          onClick: () => {
            setEditRosterId(roster.id);
            setEditModalOpen(true);
          },
        },
      ];

      // Delete action: admin only
      if (currentUser && ADMIN_ROLES.includes(currentUser.role)) {
        actions.push({
          key: 'delete',
          label: t('rowActions.delete'),
          icon: Trash2,
          onClick: () => {
            setDeleteRosterId(roster.id);
            setDeleteModalOpen(true);
          },
        });
      }

      return actions;
    },
    [canEditRoster, currentUser, t],
  );

  // Edit target: the roster being edited in the modal
  const editRoster = useMemo(
    () => schedules.find((r) => r.id === editRosterId) ?? null,
    [schedules, editRosterId],
  );

  // Determine if roster is empty (show/hide Generate button)
  const alreadyGenerated = schedules.length > 0;

  return (
    <div className="space-y-5">
      <PageHeader description={format(parse(selectedDate, 'yyyy-MM-dd', new Date()), 'EEEE, dd MMMM yyyy', { locale: dateFnsLocale() })} />

      {/* Date Picker and Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <label htmlFor="date-picker" className="text-nb-body font-medium">
            {t('page.dateLabel')}
          </label>
          <input
            id="date-picker"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-nb-base border-2 border-nb-black px-3 py-2 text-nb-body"
          />
        </div>

        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            {t('common:actions.refresh')}
          </Button>

          {canGenerate && !alreadyGenerated && !isLoading && (
            <Button
              onClick={handleGenerate}
              loading={generateRoster.isPending}
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              {t('buttons.generate')}
            </Button>
          )}

          {canEditRoster(
            schedules[0] ?? ({ rayon_id: currentUser?.rayon_id } as Schedule)
          ) && (
            <Button
              onClick={() => setAddModalOpen(true)}
              variant="secondary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              {t('buttons.addOne')}
            </Button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={schedules}
        loading={isLoading}
        error={!!error}
        onRetry={() => refetch()}
        onRefresh={() => refetch()}
        getRowId={(r) => r.id}
        searchPlaceholder={t('page.searchPlaceholder')}
        rowActions={rowActions}
        emptyTitle={schedules.length === 0 ? t('page.emptyTitle') : undefined}
        emptyDescription={schedules.length === 0 ? t('page.emptyDescription') : undefined}
      />

      {/* Absence Modal (Ketidakhadiran) */}
      <Dialog open={absenceModalOpen} onOpenChange={setAbsenceModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('modals.absence.title')}</DialogTitle>
          </DialogHeader>

          <DialogBody>
            <div className="space-y-4">
              <FormSelect
                label={t('modals.absence.typeLabel')}
                value={absenceType}
                onChange={(value) => setAbsenceType(value as 'sick' | 'annual' | 'permit' | 'off')}
                options={[
                  { value: 'sick', label: t('modals.absence.typeSick') },
                  { value: 'annual', label: t('modals.absence.typeAnnual') },
                  { value: 'permit', label: t('modals.absence.typePermit') },
                  { value: 'off', label: t('modals.absence.typeOff') },
                ]}
              />
              <Textarea
                label={t('modals.absence.notesLabel')}
                value={absenceNotes}
                onChange={(e) => setAbsenceNotes(e.target.value)}
                placeholder={t('modals.absence.notesPlaceholder')}
                rows={3}
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAbsenceModalOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={handleSetAbsence} loading={setLeave.isPending}>
              {t('common:actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('modals.delete.title')}</DialogTitle>
          </DialogHeader>

          <DialogBody>
            <div className="space-y-3">
              <p className="text-nb-body">
                {t('modals.delete.confirm', {
                  name: deleteTarget?.user?.full_name ?? '—',
                  date: selectedDate,
                })}
              </p>
              <p className="text-nb-body-sm text-nb-gray-600">
                {t('modals.delete.warning')}
              </p>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              onClick={handleDeleteSchedule}
              loading={deleteSchedule.isPending}
              variant="destructive"
            >
              {t('modals.delete.title')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Schedule Modal */}
      <EditScheduleModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        roster={editRoster}
        onReplaceWorker={handleReplaceWorker}
        onUpdateShift={handleUpdateShiftForEdit}
        onUpdateAreas={handleUpdateAreasForEdit}
        replaceLoading={replaceWorker.isPending}
        shiftLoading={updateShift.isPending}
        areasLoading={updateAreas.isPending}
        allUsers={allUsers}
        shifts={shifts}
        allRayons={allRayons}
        allAreas={allAreas}
        error={
          replaceWorker.isError || updateShift.isError || updateAreas.isError
            ? getErrorMessage(
                replaceWorker.error || updateShift.error || updateAreas.error
              )
            : undefined
        }
      />

      {/* Add Schedule Modal */}
      <AddScheduleModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSubmit={handleAddSchedule}
        loading={addSchedule.isPending}
        date={selectedDate}
        allUsers={allUsers}
        shifts={shifts}
        allRayons={allRayons}
        allAreas={allAreas}
        error={addSchedule.isError ? getErrorMessage(addSchedule.error) : undefined}
      />

      {/* Read-only side sheet listing a roster's areas */}
      <AreaListSheet
        open={!!areasSheetRoster}
        title={t('modals.areaList.title')}
        subtitle={areasSheetRoster?.user?.full_name ?? '—'}
        items={areasSheetItems}
        resetKey={areasSheetRoster?.id}
        onClose={() => setAreasSheetRoster(null)}
      />
    </div>
  );
}
