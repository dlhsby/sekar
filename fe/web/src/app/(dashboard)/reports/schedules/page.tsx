'use client';

import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth/hooks';
import {
  useSchedules,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
  useReportTemplates,
  type ReportSchedule,
  type CreateScheduleDto,
  type UpdateScheduleDto,
} from '@/lib/api/reports';
import {
  Card,
  CardContent,
  DataTable,
  FormInput,
  FormSelect,
  Button,
  PageHeader,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  EmptyState,
  SkeletonTable,
  StatusPill,
  useToast,
  type FormSelectOption,
  type ColumnDef,
  type DataTableRowAction,
} from '@/components/ui';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Pencil, Power } from 'lucide-react';
import { ADMIN_ROLES, hasRole } from '@/lib/constants/roles';
import { formatDate } from '@/lib/utils/time';

const FREQUENCY_OPTIONS: FormSelectOption[] = [
  { value: 'daily', label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
];

interface ScheduleFormState {
  name: string;
  templateId: string;
  frequency: string;
  cronExpression: string;
  timezone: string;
  isActive: boolean;
}

export default function SchedulesPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [formState, setFormState] = useState<ScheduleFormState>({
    name: '',
    templateId: '',
    frequency: 'daily',
    cronExpression: '0 6 * * *',
    timezone: 'Asia/Jakarta',
    isActive: true,
  });

  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);

  // All data fetching and mutations (before conditionals)
  const { data: schedules, isLoading: schedulesLoading } = useSchedules();
  const { data: templates } = useReportTemplates();
  const createScheduleMutation = useCreateSchedule();
  const updateScheduleMutation = useUpdateSchedule(editingScheduleId || '');
  const deleteScheduleMutation = useDeleteSchedule();

  // Role gate - admin only
  useEffect(() => {
    if (!authLoading && user && !hasRole(user.role, ADMIN_ROLES)) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const handleOpenCreate = () => {
    setFormState({
      name: '',
      templateId: '',
      frequency: 'daily',
      cronExpression: '0 6 * * *',
      timezone: 'Asia/Jakarta',
      isActive: true,
    });
    setEditingScheduleId(null);
    setCreateDialogOpen(true);
  };

  const handleOpenEdit = (schedule: ReportSchedule) => {
    setFormState({
      name: schedule.name,
      templateId: schedule.template_id,
      frequency: schedule.frequency,
      cronExpression: schedule.cron_expression,
      timezone: schedule.timezone,
      isActive: schedule.is_active,
    });
    setEditingScheduleId(schedule.id);
    setEditDialogOpen(true);
  };

  const handleSaveSchedule = async () => {
    if (!formState.name || !formState.templateId) {
      toast({ level: 'warning', title: 'Nama dan template diperlukan' });
      return;
    }

    try {
      if (editingScheduleId) {
        // Update
        const updateData: UpdateScheduleDto = {
          name: formState.name,
          frequency: formState.frequency as 'daily' | 'weekly' | 'monthly',
          cron_expression: formState.cronExpression,
          timezone: formState.timezone,
          is_active: formState.isActive,
        };
        await updateScheduleMutation.mutateAsync(updateData);
        toast({ level: 'success', title: 'Jadwal diperbarui' });
        setEditDialogOpen(false);
      } else {
        // Create
        const createData: CreateScheduleDto = {
          name: formState.name,
          template_id: formState.templateId,
          frequency: formState.frequency as 'daily' | 'weekly' | 'monthly',
          cron_expression: formState.cronExpression,
          timezone: formState.timezone,
        };
        await createScheduleMutation.mutateAsync(createData);
        toast({ level: 'success', title: 'Jadwal dibuat' });
        setCreateDialogOpen(false);
      }
    } catch {
      toast({
        level: 'danger',
        title: editingScheduleId ? 'Gagal memperbarui jadwal' : 'Gagal membuat jadwal',
      });
    }
  };

  const handleDeleteClick = (scheduleId: string) => {
    setScheduleToDelete(scheduleId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!scheduleToDelete) return;

    try {
      await deleteScheduleMutation.mutateAsync(scheduleToDelete);
      toast({ level: 'success', title: 'Jadwal dihapus' });
      setDeleteDialogOpen(false);
      setScheduleToDelete(null);
    } catch {
      toast({ level: 'danger', title: 'Gagal menghapus jadwal' });
    }
  };

  const handleToggleActive = useCallback(
    async (schedule: ReportSchedule) => {
      try {
        await updateScheduleMutation.mutateAsync({
          is_active: !schedule.is_active,
        });
        toast({
          level: 'success',
          title: schedule.is_active ? 'Jadwal dinonaktifkan' : 'Jadwal diaktifkan',
        });
      } catch {
        toast({ level: 'danger', title: 'Gagal memperbarui jadwal' });
      }
    },
    [updateScheduleMutation, toast]
  );

  const templateOptions: FormSelectOption[] = templates
    ? templates.map((t) => ({ value: t.id, label: t.name }))
    : [];

  const columns = useMemo<ColumnDef<ReportSchedule>[]>(
    () => [
      {
        id: 'id',
        accessorKey: 'id',
        header: 'ID',
        enableSorting: false,
        meta: { label: 'ID', defaultHidden: true, filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-nb-gray-600">{row.original.id}</span>
        ),
      },
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Nama',
        enableSorting: true,
        meta: { label: 'Nama', filterVariant: 'text' },
        cell: ({ row }) => <span className="text-nb-body font-medium">{row.original.name}</span>,
      },
      {
        id: 'frequency',
        accessorKey: 'frequency',
        header: 'Frekuensi',
        enableSorting: true,
        meta: { label: 'Frekuensi', filterVariant: 'text' },
        cell: ({ row }) => {
          const freq = row.original.frequency;
          const freqLabel =
            freq === 'daily' ? 'Harian' : freq === 'weekly' ? 'Mingguan' : 'Bulanan';
          return <span className="text-nb-body-sm">{freqLabel}</span>;
        },
      },
      {
        id: 'cron_expression',
        accessorKey: 'cron_expression',
        header: 'Cron',
        enableSorting: true,
        meta: { label: 'Cron', filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm font-mono">{row.original.cron_expression}</span>
        ),
      },
      {
        id: 'is_active',
        accessorKey: 'is_active',
        header: 'Status',
        enableSorting: true,
        meta: { label: 'Status', filterVariant: 'text' },
        cell: ({ row }) =>
          row.original.is_active ? (
            <StatusPill tone="ok" dot>
              Aktif
            </StatusPill>
          ) : (
            <StatusPill tone="neutral" dot>
              Nonaktif
            </StatusPill>
          ),
      },
      {
        id: 'created_at',
        accessorKey: 'created_at',
        header: 'Dibuat',
        meta: { label: 'Dibuat', defaultHidden: true, filterVariant: 'date' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
      {
        id: 'updated_at',
        accessorKey: 'updated_at',
        header: 'Diperbarui',
        meta: { label: 'Diperbarui', defaultHidden: true, filterVariant: 'date' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {formatDate(row.original.updated_at)}
          </span>
        ),
      },
    ],
    []
  );

  const rowActions = useCallback(
    (schedule: ReportSchedule): DataTableRowAction<ReportSchedule>[] => [
      {
        key: 'edit',
        label: 'Ubah',
        icon: Pencil,
        onClick: () => handleOpenEdit(schedule),
      },
      {
        key: 'toggle',
        label: schedule.is_active ? 'Nonaktifkan' : 'Aktifkan',
        icon: Power,
        onClick: () => handleToggleActive(schedule),
      },
      {
        key: 'delete',
        label: 'Hapus',
        icon: Trash2,
        variant: 'danger',
        onClick: () => handleDeleteClick(schedule.id),
      },
    ],
    [handleToggleActive]
  );

  const schedulesList = schedules || [];

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-nb-body text-nb-gray-600">{t('common:actions.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jadwal Laporan"
        description="Kelola jadwal laporan otomatis"
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate}>
            Buat Jadwal
          </Button>
        }
      />

      <Card>
        <CardContent>
          {schedulesLoading ? (
            <SkeletonTable rows={5} />
          ) : schedulesList.length === 0 ? (
            <EmptyState
              variant="noData"
              title="Tidak ada jadwal"
              description="Buat jadwal laporan otomatis untuk menjalankan laporan secara berkala"
            />
          ) : (
            <DataTable
              columns={columns}
              data={schedulesList}
              getRowId={(r) => String(r.id)}
              rowActions={rowActions}
            />
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={createDialogOpen || editDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setCreateDialogOpen(false);
          setEditDialogOpen(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingScheduleId ? 'Edit Jadwal' : 'Buat Jadwal Baru'}
            </DialogTitle>
            {!editingScheduleId && (
              <DialogDescription>
                Atur jadwal otomatis untuk menjalankan laporan berkala
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4 py-4">
            <FormInput
              label="Nama Jadwal"
              value={formState.name}
              onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))}
              placeholder="cth: Laporan Harian Rayon Utara"
            />

            {!editingScheduleId && (
              <FormSelect
                label="Template"
                placeholder="Pilih template"
                options={templateOptions}
                value={formState.templateId}
                onChange={(value) => setFormState((s) => ({ ...s, templateId: value }))}
              />
            )}

            <FormSelect
              label="Frekuensi"
              options={FREQUENCY_OPTIONS}
              value={formState.frequency}
              onChange={(value) => setFormState((s) => ({ ...s, frequency: value }))}
            />

            <FormInput
              label="Cron Expression"
              value={formState.cronExpression}
              onChange={(e) =>
                setFormState((s) => ({ ...s, cronExpression: e.target.value }))
              }
              placeholder="0 6 * * * (harian jam 6 pagi)"
            />

            <FormInput
              label="Timezone"
              value={formState.timezone}
              onChange={(e) => setFormState((s) => ({ ...s, timezone: e.target.value }))}
              placeholder="Asia/Jakarta"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setEditDialogOpen(false);
              }}
            >
              Batal
            </Button>
            <Button
              onClick={handleSaveSchedule}
              loading={
                createScheduleMutation.isPending || updateScheduleMutation.isPending
              }
            >
              {editingScheduleId ? 'Simpan' : 'Buat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('schedules:dialog.deleteTitle')}</DialogTitle>
            <DialogDescription>
              Jadwal laporan akan dihapus dan tidak akan dijalankan lagi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              loading={deleteScheduleMutation.isPending}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
