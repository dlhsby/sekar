/**
 * Jadwal (Schedules) Page — the daily roster, the single schedule concept
 * (ADR-013): date picker, status tracking, and row actions (leave, replace,
 * areas, shift).
 */

'use client';

import { useCallback, useMemo, useState } from 'react';
import { format, parse } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Plus, Calendar, Pencil, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  DataTable,
  FormCombobox,
  FormMultiCombobox,
  FormSelect,
  Textarea,
  PageHeader,
  RoleAvatar,
  StatusPill,
  type ColumnDef,
  type DataTableRowAction,
} from '@/components/ui';
import { RolePill } from '@/components/users/RolePill';
import { RosterActionModal } from '@/components/schedules/RosterActionModal';
import { AreaListSheet, type AreaListSheetItem } from '@/components/areas/AreaListSheet';
import { getErrorMessage } from '@/lib/api/client';
import {
  useDailyRoster,
  useGenerateRoster,
  useSetLeave,
  useReplaceWorker,
  useUpdateRosterAreas,
  useUpdateRosterShift,
  type Schedule,
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
      return 'warn';
    case 'replaced':
    case 'off':
      return 'neutral';
    default:
      return 'neutral';
  }
}

/**
 * Format status display
 */
function formatStatus(status: Schedule['status']): string {
  const labels: Record<Schedule['status'], string> = {
    planned: 'Rencana',
    present: 'Hadir',
    absent: 'Tidak Hadir',
    leave_sick: 'Cuti Sakit',
    leave_annual: 'Cuti Tahunan',
    replaced: 'Diganti',
    off: 'Libur',
  };
  return labels[status] || status;
}


export default function SchedulesPage() {
  const currentUser = useUser();
  // Only admins generate the roster (backend: USER_MANAGERS).
  const canGenerate = !!currentUser && ADMIN_ROLES.includes(currentUser.role);

  // Default to "today" in WIB (matches the server's roster date) so the roster
  // isn't empty for browsers outside UTC+7.
  const [selectedDate, setSelectedDate] = useState(todayJakartaISODate());

  const { data: rosters, isLoading, error, refetch } = useDailyRoster(selectedDate);
  const schedules = useMemo(() => rosters ?? [], [rosters]);

  const { data: areasData } = useAreas({ limit: 1000 });
  const allAreas = useMemo(() => areasData?.data ?? [], [areasData]);
  // O(1) area lookup for the rayon column (avoids a per-row find over all areas).
  const areaById = useMemo(() => new Map(allAreas.map((a) => [a.id, a])), [allAreas]);

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

  // Modal states
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveRosterId, setLeaveRosterId] = useState<string | null>(null);
  const [leaveType, setLeaveType] = useState<'sick' | 'annual'>('sick');
  const [leaveNotes, setLeaveNotes] = useState('');

  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [replaceRosterId, setReplaceRosterId] = useState<string | null>(null);
  const [replacementUserId, setReplacementUserId] = useState('');
  const [replaceNotes, setReplaceNotes] = useState('');

  const [areasModalOpen, setAreasModalOpen] = useState(false);
  // Roster whose areas are shown in the read-only side sheet (Area column).
  const [areasSheetRoster, setAreasSheetRoster] = useState<Schedule | null>(null);
  const [areasRosterId, setAreasRosterId] = useState<string | null>(null);
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);

  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shiftRosterId, setShiftRosterId] = useState<string | null>(null);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);

  // Helper to get area names from schedule_areas
  const getAreaNames = (roster: Schedule): string[] => {
    return roster.schedule_areas.map((a) => a.area.name);
  };

  // Areas of the roster shown in the side sheet (name + "Rayon · Tipe").
  const areasSheetItems: AreaListSheetItem[] = useMemo(() => {
    if (!areasSheetRoster) return [];
    return areasSheetRoster.schedule_areas.map((sa) => {
      const full = areaById.get(sa.area_id);
      return {
        id: sa.area_id,
        name: sa.area?.name ?? full?.name ?? '—',
        meta: [full?.rayon?.name, full?.areaType?.name].filter(Boolean).join(' · ') || undefined,
      };
    });
  }, [areasSheetRoster, areaById]);

  // Handlers for modals

  const handleSetLeave = async () => {
    if (!leaveRosterId) return;
    try {
      await setLeave.mutateAsync({
        id: leaveRosterId,
        leave_type: leaveType,
        notes: leaveNotes,
      });
      toast.success('Cuti berhasil disimpan');
      setLeaveModalOpen(false);
      setLeaveRosterId(null);
      setLeaveType('sick');
      setLeaveNotes('');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Gagal menyimpan cuti'
      );
    }
  };

  const handleReplace = async () => {
    if (!replaceRosterId || !replacementUserId) return;
    try {
      await replaceWorker.mutateAsync({
        id: replaceRosterId,
        replacement_user_id: replacementUserId,
        notes: replaceNotes,
      });
      toast.success('Pengganti pekerja berhasil disimpan');
      setReplaceModalOpen(false);
      setReplaceRosterId(null);
      setReplacementUserId('');
      setReplaceNotes('');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Gagal menyimpan pengganti'
      );
    }
  };

  const handleUpdateAreas = async () => {
    if (!areasRosterId) return;
    try {
      await updateAreas.mutateAsync({
        id: areasRosterId,
        area_ids: selectedAreaIds,
      });
      toast.success('Area berhasil diperbarui');
      setAreasModalOpen(false);
      setAreasRosterId(null);
      setSelectedAreaIds([]);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Gagal memperbarui area'
      );
    }
  };

  const handleUpdateShift = async () => {
    if (!shiftRosterId) return;
    try {
      await updateShift.mutateAsync({
        id: shiftRosterId,
        shift_definition_id: selectedShiftId,
      });
      toast.success('Shift berhasil diperbarui');
      setShiftModalOpen(false);
      setShiftRosterId(null);
      setSelectedShiftId(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Gagal memperbarui shift'
      );
    }
  };

  const handleGenerate = async () => {
    try {
      const result = await generateRoster.mutateAsync(selectedDate);
      toast.success(`${result.generated} jadwal berhasil dibuat`);
      refetch();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Gagal membuat jadwal'
      );
    }
  };

  const columns = useMemo<ColumnDef<Schedule>[]>(
    () => [
      {
        id: 'full_name',
        // Defensive: a row without a joined user must not crash the whole table.
        accessorFn: (row) => row.user?.full_name ?? '',
        header: 'Pekerja',
        meta: { label: 'Pekerja', filterVariant: 'text' },
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
        header: 'Role',
        meta: { label: 'Role', filterVariant: 'text', defaultHidden: true },
        cell: ({ row }) =>
          row.original.user ? <RolePill role={row.original.user.role} /> : <span>—</span>,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        meta: { label: 'Status', filterVariant: 'text' },
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
        header: 'Shift',
        meta: { label: 'Shift', filterVariant: 'text' },
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
        accessorFn: (row) => getAreaNames(row).join(', '),
        header: 'Area',
        meta: { label: 'Area', filterVariant: 'text' },
        cell: ({ row }) => {
          const roster = row.original;
          const count = roster.schedule_areas.length;
          if (count === 0) return <span className="text-nb-body-sm text-nb-gray-500">—</span>;
          return (
            <button
              type="button"
              onClick={() => setAreasSheetRoster(roster)}
              aria-label={`Lihat ${count} area untuk ${roster.user?.full_name ?? 'pekerja'}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border-2 border-nb-black rounded-nb-base bg-nb-white text-nb-body-sm font-bold shadow-nb-xs hover:shadow-nb-sm active:shadow-none transition-shadow duration-100"
            >
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
              {count} Area
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
        header: 'Rayon',
        meta: { label: 'Rayon', filterVariant: 'text', defaultHidden: true },
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
        header: 'Pengganti',
        meta: { label: 'Pengganti', filterVariant: 'text', defaultHidden: true },
        cell: ({ row }) => (
          <span className="text-nb-body-sm">
            {row.original.replacement_user?.full_name ?? '—'}
          </span>
        ),
      },
    ],
    [areaById],
  );

  const rowActions = useCallback(
    (roster: Schedule): DataTableRowAction<Schedule>[] => {
      if (!canEditRoster(roster)) return [];

      return [
        {
          key: 'leave',
          label: 'Cuti',
          icon: Calendar,
          onClick: () => {
            setLeaveRosterId(roster.id);
            setLeaveType('sick');
            setLeaveNotes('');
            setLeaveModalOpen(true);
          },
        },
        {
          key: 'replace',
          label: 'Ganti Pekerja',
          icon: Pencil,
          onClick: () => {
            setReplaceRosterId(roster.id);
            setReplacementUserId('');
            setReplaceNotes('');
            setReplaceModalOpen(true);
          },
        },
        {
          key: 'areas',
          label: 'Ubah Area',
          icon: Pencil,
          onClick: () => {
            setAreasRosterId(roster.id);
            setSelectedAreaIds(roster.schedule_areas.map((a) => a.area_id));
            setAreasModalOpen(true);
          },
        },
        {
          key: 'shift',
          label: 'Ubah Shift',
          icon: Pencil,
          onClick: () => {
            setShiftRosterId(roster.id);
            setSelectedShiftId(roster.shift_definition_id);
            setShiftModalOpen(true);
          },
        },
      ];
    },
    [canEditRoster],
  );

  // Replacement candidates: satgas/linmas in the SAME rayon as the shift being
  // covered (a cross-rayon replacement makes no operational sense and keeps the
  // list bounded). Falls back to all schedulable workers if the roster's rayon
  // is unknown.
  const replaceRoster = useMemo(
    () => schedules.find((r) => r.id === replaceRosterId) ?? null,
    [schedules, replaceRosterId],
  );
  const schedulableUsers = useMemo(
    () =>
      allUsers.filter(
        (u) =>
          ['satgas', 'linmas'].includes(u.role) &&
          (!replaceRoster?.rayon_id || u.rayon_id === replaceRoster.rayon_id),
      ),
    [allUsers, replaceRoster],
  );

  return (
    <div className="space-y-5">
      <PageHeader description={`Jadwal untuk ${format(parse(selectedDate, 'yyyy-MM-dd', new Date()), 'EEEE, dd MMMM yyyy', { locale: idLocale })}`} />

      {/* Date Picker and Generate Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <label htmlFor="date-picker" className="text-nb-body font-medium">
            Tanggal:
          </label>
          <input
            id="date-picker"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-nb-base border-2 border-nb-black px-3 py-2 text-nb-body"
          />
        </div>

        {canGenerate && (
          <Button
            onClick={handleGenerate}
            loading={generateRoster.isPending}
            leftIcon={<Plus className="h-5 w-5" />}
          >
            Buat Jadwal
          </Button>
        )}
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
        searchPlaceholder="Cari nama pekerja…"
        rowActions={rowActions}
        emptyTitle={schedules.length === 0 ? 'Belum ada jadwal' : undefined}
        emptyDescription={schedules.length === 0 ? 'Klik "Buat Jadwal" untuk membuat jadwal hari ini.' : undefined}
      />

      {/* Leave Modal */}
      <RosterActionModal
        open={leaveModalOpen}
        title="Cuti"
        onClose={() => setLeaveModalOpen(false)}
        onSubmit={handleSetLeave}
        submitLabel="Simpan"
        loading={setLeave.isPending}
        error={setLeave.isError && getErrorMessage(setLeave.error)}
      >
        <FormSelect
          label="Jenis Cuti"
          value={leaveType}
          onChange={(value) => setLeaveType(value as 'sick' | 'annual')}
          options={[
            { value: 'sick', label: 'Sakit' },
            { value: 'annual', label: 'Tahunan' },
          ]}
        />
        <Textarea
          label="Catatan (opsional)"
          value={leaveNotes}
          onChange={(e) => setLeaveNotes(e.target.value)}
          placeholder="Masukkan catatan…"
          rows={3}
        />
      </RosterActionModal>

      {/* Replace Modal */}
      <RosterActionModal
        open={replaceModalOpen}
        title="Ganti Pekerja"
        onClose={() => setReplaceModalOpen(false)}
        onSubmit={handleReplace}
        submitLabel="Simpan"
        loading={replaceWorker.isPending}
        submitDisabled={!replacementUserId}
        error={replaceWorker.isError && getErrorMessage(replaceWorker.error)}
      >
        <FormCombobox
          label="Pekerja Pengganti"
          placeholder="Pilih pekerja…"
          value={replacementUserId}
          onChange={setReplacementUserId}
          required
          options={schedulableUsers.map((u) => ({
            value: u.id,
            label: `${u.full_name} (${u.username})`,
          }))}
        />
        <Textarea
          label="Catatan (opsional)"
          value={replaceNotes}
          onChange={(e) => setReplaceNotes(e.target.value)}
          placeholder="Masukkan catatan…"
          rows={3}
        />
      </RosterActionModal>

      {/* Areas Modal */}
      <RosterActionModal
        open={areasModalOpen}
        title="Ubah Area"
        onClose={() => setAreasModalOpen(false)}
        onSubmit={handleUpdateAreas}
        submitLabel="Simpan"
        loading={updateAreas.isPending}
        error={updateAreas.isError && getErrorMessage(updateAreas.error)}
      >
        <FormMultiCombobox
          label="Area"
          options={allAreas.map((a) => ({ value: a.id, label: a.name }))}
          values={selectedAreaIds}
          onChange={setSelectedAreaIds}
          placeholder="Pilih area"
          searchPlaceholder="Cari area…"
          emptyText="Tidak ada area."
          helperText="Kosongkan untuk menghapus semua area hari ini."
        />
      </RosterActionModal>

      {/* Shift Modal */}
      <RosterActionModal
        open={shiftModalOpen}
        title="Ubah Shift"
        onClose={() => setShiftModalOpen(false)}
        onSubmit={handleUpdateShift}
        submitLabel="Simpan"
        loading={updateShift.isPending}
        error={updateShift.isError && getErrorMessage(updateShift.error)}
      >
        <FormCombobox
          label="Shift"
          value={selectedShiftId ?? ''}
          onChange={(value) => setSelectedShiftId(value || null)}
          placeholder="Tanpa Shift"
          options={shifts.map((shift) => ({
            value: shift.id,
            label: `${shift.name} (${shift.start_time}-${shift.end_time})`,
          }))}
        />
      </RosterActionModal>

      {/* Read-only side sheet listing a roster's areas (Area column). */}
      <AreaListSheet
        open={!!areasSheetRoster}
        title="Area Jadwal"
        subtitle={areasSheetRoster?.user?.full_name ?? '—'}
        items={areasSheetItems}
        resetKey={areasSheetRoster?.id}
        onClose={() => setAreasSheetRoster(null)}
      />
    </div>
  );
}
