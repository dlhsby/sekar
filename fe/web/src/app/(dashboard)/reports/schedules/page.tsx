'use client';

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
  type DataTableColumn,
} from '@/components/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { ADMIN_ROLES, hasRole } from '@/lib/constants/roles';

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

  // Role gate - admin only
  useEffect(() => {
    if (!authLoading && user && !hasRole(user.role, ADMIN_ROLES)) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const { data: schedules, isLoading: schedulesLoading } = useSchedules();
  const { data: templates } = useReportTemplates();
  const createScheduleMutation = useCreateSchedule();
  const updateScheduleMutation = useUpdateSchedule(editingScheduleId || '');
  const deleteScheduleMutation = useDeleteSchedule();

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
    } catch (err) {
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
    } catch (err) {
      toast({ level: 'danger', title: 'Gagal menghapus jadwal' });
    }
  };

  const handleToggleActive = async (schedule: ReportSchedule) => {
    try {
      await updateScheduleMutation.mutateAsync({
        is_active: !schedule.is_active,
      });
      toast({
        level: 'success',
        title: schedule.is_active ? 'Jadwal dinonaktifkan' : 'Jadwal diaktifkan',
      });
    } catch (err) {
      toast({ level: 'danger', title: 'Gagal memperbarui jadwal' });
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-nb-body text-nb-gray-600">Memuat…</p>
      </div>
    );
  }

  const templateOptions: FormSelectOption[] = templates
    ? templates.map((t) => ({ value: t.id, label: t.name }))
    : [];

  const columns: DataTableColumn<ReportSchedule>[] = [
    {
      header: 'Nama',
      key: 'name',
      cell: (row: ReportSchedule) => <span className="text-nb-body font-medium">{row.name}</span>,
    },
    {
      header: 'Frekuensi',
      key: 'frequency',
      cell: (row: ReportSchedule) => {
        const freq = row.frequency;
        const freqLabel =
          freq === 'daily' ? 'Harian' : freq === 'weekly' ? 'Mingguan' : 'Bulanan';
        return <span className="text-nb-body-sm">{freqLabel}</span>;
      },
    },
    {
      header: 'Cron',
      key: 'cron_expression',
      cell: (row: ReportSchedule) => (
        <span className="text-nb-body-sm font-mono">{row.cron_expression}</span>
      ),
    },
    {
      header: 'Status',
      key: 'is_active',
      cell: (row: ReportSchedule) => (
        <Button
          variant={row.is_active ? 'success' : 'outline'}
          size="sm"
          onClick={() => handleToggleActive(row)}
          className="text-nb-body-sm"
        >
          {row.is_active ? 'Aktif' : 'Nonaktif'}
        </Button>
      ),
    },
    {
      header: 'Aksi',
      key: 'actions',
      cell: (row: ReportSchedule) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenEdit(row)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteClick(row.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const schedulesList = schedules || [];

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
            <DataTable columns={columns} data={schedulesList} />
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
            <DialogTitle>Hapus Jadwal?</DialogTitle>
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
