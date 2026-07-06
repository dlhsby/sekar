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
  DialogBody,
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

interface ScheduleFormState {
  name: string;
  templateId: string;
  frequency: string;
  cronExpression: string;
  timezone: string;
  isActive: boolean;
}

export default function SchedulesPage() {
  const { t } = useTranslation(['reports', 'common']);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // Create frequency options dynamically with translations
  const FREQUENCY_OPTIONS = useMemo<FormSelectOption[]>(() => [
    { value: 'daily', label: t('schedules.frequencies.daily') },
    { value: 'weekly', label: t('schedules.frequencies.weekly') },
    { value: 'monthly', label: t('schedules.frequencies.monthly') },
  ], [t]);

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
      toast({ level: 'warning', title: t('schedules.messages.validationError') });
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
        toast({ level: 'success', title: t('schedules.messages.updateSuccess') });
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
        toast({ level: 'success', title: t('schedules.messages.createSuccess') });
        setCreateDialogOpen(false);
      }
    } catch {
      toast({
        level: 'danger',
        title: editingScheduleId ? t('schedules.messages.updateError') : t('schedules.messages.createError'),
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
      toast({ level: 'success', title: t('schedules.messages.deleteSuccess') });
      setDeleteDialogOpen(false);
      setScheduleToDelete(null);
    } catch {
      toast({ level: 'danger', title: t('schedules.messages.deleteError') });
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
          title: schedule.is_active ? t('schedules.messages.deactivateSuccess') : t('schedules.messages.activateSuccess'),
        });
      } catch {
        toast({ level: 'danger', title: t('schedules.messages.toggleError') });
      }
    },
    [updateScheduleMutation, toast, t]
  );

  const templateOptions: FormSelectOption[] = templates
    ? templates.map((t) => ({ value: t.id, label: t.name }))
    : [];

  const columns = useMemo<ColumnDef<ReportSchedule>[]>(
    () => [
      {
        id: 'id',
        accessorKey: 'id',
        header: t('schedules.table.id'),
        enableSorting: false,
        meta: { label: t('schedules.table.id'), defaultHidden: true, filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-nb-gray-600">{row.original.id}</span>
        ),
      },
      {
        id: 'name',
        accessorKey: 'name',
        header: t('schedules.table.name'),
        enableSorting: true,
        meta: { label: t('schedules.table.name'), filterVariant: 'text' },
        cell: ({ row }) => <span className="text-nb-body font-medium">{row.original.name}</span>,
      },
      {
        id: 'frequency',
        accessorKey: 'frequency',
        header: t('schedules.table.frequency'),
        enableSorting: true,
        meta: { label: t('schedules.table.frequency'), filterVariant: 'text' },
        cell: ({ row }) => {
          const freq = row.original.frequency;
          const freqLabel =
            freq === 'daily' ? t('schedules.frequencies.daily') : freq === 'weekly' ? t('schedules.frequencies.weekly') : t('schedules.frequencies.monthly');
          return <span className="text-nb-body-sm">{freqLabel}</span>;
        },
      },
      {
        id: 'cron_expression',
        accessorKey: 'cron_expression',
        header: t('schedules.table.cron'),
        enableSorting: true,
        meta: { label: t('schedules.table.cron'), filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm font-mono">{row.original.cron_expression}</span>
        ),
      },
      {
        id: 'is_active',
        accessorKey: 'is_active',
        header: t('schedules.table.status'),
        enableSorting: true,
        meta: { label: t('schedules.table.status'), filterVariant: 'text' },
        cell: ({ row }) =>
          row.original.is_active ? (
            <StatusPill tone="ok" dot>
              {t('schedules.table.statusActive')}
            </StatusPill>
          ) : (
            <StatusPill tone="neutral" dot>
              {t('schedules.table.statusInactive')}
            </StatusPill>
          ),
      },
      {
        id: 'created_at',
        accessorKey: 'created_at',
        header: t('schedules.table.createdAt'),
        meta: { label: t('schedules.table.createdAt'), defaultHidden: true, filterVariant: 'date' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
      {
        id: 'updated_at',
        accessorKey: 'updated_at',
        header: t('schedules.table.updatedAt'),
        meta: { label: t('schedules.table.updatedAt'), defaultHidden: true, filterVariant: 'date' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {formatDate(row.original.updated_at)}
          </span>
        ),
      },
    ],
    [t]
  );

  const rowActions = useCallback(
    (schedule: ReportSchedule): DataTableRowAction<ReportSchedule>[] => [
      {
        key: 'edit',
        label: t('schedules.actions.edit'),
        icon: Pencil,
        onClick: () => handleOpenEdit(schedule),
      },
      {
        key: 'toggle',
        label: schedule.is_active ? t('schedules.actions.deactivate') : t('schedules.actions.activate'),
        icon: Power,
        onClick: () => handleToggleActive(schedule),
      },
      {
        key: 'delete',
        label: t('schedules.actions.delete'),
        icon: Trash2,
        variant: 'danger',
        onClick: () => handleDeleteClick(schedule.id),
      },
    ],
    [handleToggleActive, t]
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
        description={
          schedulesList.length
            ? t('schedules.page.totalCount', { count: schedulesList.length })
            : undefined
        }
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate}>
            {t('schedules.actions.create')}
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
              title={t('schedules.empty.title')}
              description={t('schedules.empty.description')}
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
              {editingScheduleId ? t('schedules.editDialog.title') : t('schedules.createDialog.title')}
            </DialogTitle>
            {!editingScheduleId && (
              <DialogDescription>
                {t('schedules.createDialog.description')}
              </DialogDescription>
            )}
          </DialogHeader>

          <DialogBody className="space-y-4">
            <FormInput
              label={t('schedules.createDialog.nameLabel')}
              value={formState.name}
              onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))}
              placeholder={t('schedules.createDialog.namePlaceholder')}
            />

            {!editingScheduleId && (
              <FormSelect
                label={t('schedules.createDialog.templateLabel')}
                placeholder={t('schedules.createDialog.templatePlaceholder')}
                options={templateOptions}
                value={formState.templateId}
                onChange={(value) => setFormState((s) => ({ ...s, templateId: value }))}
              />
            )}

            <FormSelect
              label={t('schedules.createDialog.frequencyLabel')}
              options={FREQUENCY_OPTIONS}
              value={formState.frequency}
              onChange={(value) => setFormState((s) => ({ ...s, frequency: value }))}
            />

            <FormInput
              label={t('schedules.createDialog.cronLabel')}
              value={formState.cronExpression}
              onChange={(e) =>
                setFormState((s) => ({ ...s, cronExpression: e.target.value }))
              }
              placeholder={t('schedules.createDialog.cronPlaceholder')}
            />

            <FormInput
              label={t('schedules.createDialog.timezoneLabel')}
              value={formState.timezone}
              onChange={(e) => setFormState((s) => ({ ...s, timezone: e.target.value }))}
              placeholder={t('schedules.createDialog.timezonePlaceholder')}
            />
          </DialogBody>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setEditDialogOpen(false);
              }}
            >
              {t('common:actions.cancel')}
            </Button>
            <Button
              onClick={handleSaveSchedule}
              loading={
                createScheduleMutation.isPending || updateScheduleMutation.isPending
              }
            >
              {editingScheduleId ? t('schedules.editDialog.submitButton') : t('schedules.createDialog.submitButton')}
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
              {t('schedules.deleteDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              loading={deleteScheduleMutation.isPending}
            >
              {t('schedules.actions.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
