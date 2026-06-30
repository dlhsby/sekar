/**
 * Jadwal Harian Page — operational daily roster with date picker,
 * status tracking, and row actions (leave, replace, areas, shift).
 */

'use client';

import { useCallback, useMemo, useState } from 'react';
import { format, parse } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Plus, Calendar, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  DataTable,
  FormCombobox,
  PageHeader,
  RoleAvatar,
  StatusPill,
  type ColumnDef,
  type DataTableRowAction,
} from '@/components/ui';
import { RolePill } from '@/components/users/RolePill';
import { RosterActionModal } from '@/components/daily-schedules/RosterActionModal';
import {
  useDailyRoster,
  useGenerateRoster,
  useSetLeave,
  useReplaceWorker,
  useUpdateRosterAreas,
  useUpdateRosterShift,
  type DailySchedule,
} from '@/lib/api/daily-schedules';
import { useUser } from '@/lib/auth/hooks';
import { ADMIN_ROLES } from '@/lib/constants/roles';
import { useAreas } from '@/lib/api/areas';
import { useShiftDefinitions } from '@/lib/api/shift-definitions';
import { useUsers } from '@/lib/api/users';
import { todayJakartaISODate } from '@/lib/utils/formatters';

/**
 * Map status to tone for StatusPill
 */
function getStatusTone(status: DailySchedule['status']): 'ok' | 'warn' | 'bad' | 'info' | 'neutral' {
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
function formatStatus(status: DailySchedule['status']): string {
  const labels: Record<DailySchedule['status'], string> = {
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


export default function DailySchedulesPage() {
  const currentUser = useUser();
  const canManage = !!currentUser && (ADMIN_ROLES.includes(currentUser.role) || ['kepala_rayon', 'admin_data'].includes(currentUser.role));

  // Default to "today" in WIB (matches the server's roster date) so the roster
  // isn't empty for browsers outside UTC+7.
  const [selectedDate, setSelectedDate] = useState(todayJakartaISODate());

  const { data: rosters, isLoading, error, refetch } = useDailyRoster(selectedDate);
  const schedules = useMemo(() => rosters ?? [], [rosters]);

  const { data: areasData } = useAreas({ limit: 1000 });
  const allAreas = useMemo(() => areasData?.data ?? [], [areasData]);

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
  const [areasRosterId, setAreasRosterId] = useState<string | null>(null);
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);

  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shiftRosterId, setShiftRosterId] = useState<string | null>(null);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);

  // Helper to get area names from daily_schedule_areas
  const getAreaNames = (roster: DailySchedule): string[] => {
    return roster.daily_schedule_areas.map((a) => a.area.name);
  };

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

  const columns = useMemo<ColumnDef<DailySchedule>[]>(
    () => [
      {
        id: 'full_name',
        accessorFn: (row) => row.user.full_name,
        header: 'Pekerja',
        meta: { label: 'Pekerja', filterVariant: 'text' },
        cell: ({ row }) => {
          const roster = row.original;
          return (
            <div className="flex items-center gap-2.5">
              <RoleAvatar
                name={roster.user.full_name}
                role={roster.user.role}
                size="sm"
              />
              <div className="min-w-0">
                <p className="truncate font-bold text-nb-black">
                  {roster.user.full_name}
                </p>
                <p className="truncate font-mono text-[11px] text-nb-gray-600">
                  {roster.user.username}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        id: 'role',
        accessorFn: (row) => row.user.role,
        header: 'Role',
        meta: { label: 'Role', filterVariant: 'text', defaultHidden: true },
        cell: ({ row }) => <RolePill role={row.original.user.role} />,
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
          const areaNames = getAreaNames(row.original);
          return (
            <span className="text-nb-body-sm">
              {areaNames.length > 0 ? areaNames.join(', ') : '—'}
            </span>
          );
        },
      },
      {
        id: 'rayon',
        accessorFn: (row) => {
          const area = allAreas.find((a) => a.id === row.daily_schedule_areas[0]?.area_id);
          return area?.rayon?.name ?? '';
        },
        header: 'Rayon',
        meta: { label: 'Rayon', filterVariant: 'text', defaultHidden: true },
        cell: ({ row }) => {
          const area = allAreas.find((a) => a.id === row.original.daily_schedule_areas[0]?.area_id);
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
    [allAreas],
  );

  const rowActions = useCallback(
    (roster: DailySchedule): DataTableRowAction<DailySchedule>[] => {
      if (!canManage) return [];

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
            setSelectedAreaIds(roster.daily_schedule_areas.map((a) => a.area_id));
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
    [canManage],
  );

  // Schedulable roles for replacement
  const schedulableUsers = useMemo(
    () => allUsers.filter((u) => ['satgas', 'linmas'].includes(u.role)),
    [allUsers],
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

        {currentUser && ADMIN_ROLES.includes(currentUser.role) && (
          <Button
            onClick={handleGenerate}
            loading={generateRoster.isPending}
            leftIcon={<Plus className="h-5 w-5" />}
          >
            Generate Roster
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
        emptyDescription={schedules.length === 0 ? 'Klik "Generate Roster" untuk membuat jadwal hari ini.' : undefined}
      />

      {/* Leave Modal */}
      <RosterActionModal
        open={leaveModalOpen}
        title="Cuti"
        onClose={() => setLeaveModalOpen(false)}
        onSubmit={handleSetLeave}
        submitLabel="Simpan"
        loading={setLeave.isPending}
      >
        <div>
          <label className="block text-nb-body font-medium mb-2">Jenis Cuti</label>
          <select
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value as 'sick' | 'annual')}
            className="w-full rounded-nb-base border-2 border-nb-black px-3 py-2"
          >
            <option value="sick">Sakit</option>
            <option value="annual">Tahunan</option>
          </select>
        </div>

        <div>
          <label className="block text-nb-body font-medium mb-2">Catatan (opsional)</label>
          <textarea
            value={leaveNotes}
            onChange={(e) => setLeaveNotes(e.target.value)}
            placeholder="Masukkan catatan…"
            className="w-full rounded-nb-base border-2 border-nb-black px-3 py-2 text-nb-body"
            rows={3}
          />
        </div>
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
      >
        <FormCombobox
          label="Pekerja Pengganti"
          placeholder="Pilih pekerja…"
          value={replacementUserId}
          onChange={setReplacementUserId}
          options={schedulableUsers.map((u) => ({
            value: u.id,
            label: `${u.full_name} (${u.username})`,
          }))}
        />

        <div>
          <label className="block text-nb-body font-medium mb-2">Catatan (opsional)</label>
          <textarea
            value={replaceNotes}
            onChange={(e) => setReplaceNotes(e.target.value)}
            placeholder="Masukkan catatan…"
            className="w-full rounded-nb-base border-2 border-nb-black px-3 py-2 text-nb-body"
            rows={3}
          />
        </div>
      </RosterActionModal>

      {/* Areas Modal */}
      <RosterActionModal
        open={areasModalOpen}
        title="Ubah Area"
        onClose={() => setAreasModalOpen(false)}
        onSubmit={handleUpdateAreas}
        submitLabel="Simpan"
        loading={updateAreas.isPending}
      >
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {allAreas.map((area) => (
            <label key={area.id} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedAreaIds.includes(area.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedAreaIds([...selectedAreaIds, area.id]);
                  } else {
                    setSelectedAreaIds(
                      selectedAreaIds.filter((id) => id !== area.id)
                    );
                  }
                }}
                className="h-4 w-4"
              />
              <span className="text-nb-body">{area.name}</span>
            </label>
          ))}
        </div>
      </RosterActionModal>

      {/* Shift Modal */}
      <RosterActionModal
        open={shiftModalOpen}
        title="Ubah Shift"
        onClose={() => setShiftModalOpen(false)}
        onSubmit={handleUpdateShift}
        submitLabel="Simpan"
        loading={updateShift.isPending}
      >
        <div>
          <label className="block text-nb-body font-medium mb-2">Shift</label>
          <select
            value={selectedShiftId ?? ''}
            onChange={(e) => setSelectedShiftId(e.target.value || null)}
            className="w-full rounded-nb-base border-2 border-nb-black px-3 py-2"
          >
            <option value="">Tanpa Shift</option>
            {shifts.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {shift.name} ({shift.start_time}-{shift.end_time})
              </option>
            ))}
          </select>
        </div>
      </RosterActionModal>
    </div>
  );
}
