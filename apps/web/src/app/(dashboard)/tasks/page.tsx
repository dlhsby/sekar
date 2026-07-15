/**
 * Tasks List Page — TSK-1 (Phase 4-R revamp, hifi-web §06)
 * Kanban/table toggle, scope tabs (all/tagged/created), v2.1 status pills.
 * Access: TASK_MANAGER_ROLES
 */

'use client';

import { useTranslation } from 'react-i18next';
import { intlLocale } from '@/lib/i18n/date-locale';
import { useAuth } from '@/lib/auth/hooks';
import {
  useTasks,
  useTaggedTasks,
  useMyTasks,
  useDeleteTask,
  type TaskStatus,
  type TaskPriority,
  type Task,
} from '@/lib/api/tasks';
import {
  Card,
  CardContent,
  DataTable,
  FormSelect,
  Button,
  CreateButton,
  PageHeader,
  StatusPill,
  Tabs,
  DetailModal,
  ConfirmDialog,
  type TabItem,
  type DataTableRowAction,
} from '@/components/ui';
import type { ColumnDef } from '@/components/ui/data-table';
import { TaskKanban } from '@/components/tasks/TaskKanban';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Eye, Trash2 } from 'lucide-react';
import { TASK_MANAGER_ROLES, hasRole } from '@/lib/constants/roles';
import { TaskFormModal } from '@/components/tasks/TaskFormModal';
import { formatDate } from '@/lib/utils/time';
import { useViewModal } from '@/lib/hooks/use-view-modal';
import {
  getTaskStatusLabel,
  getTaskPriorityLabel,
  TASK_STATUS_TONES,
  TASK_PRIORITY_TONES,
} from '@/lib/constants/tasks';

type ActiveTab = 'all' | 'tagged' | 'created';
type ViewMode = 'kanban' | 'table';

export default function TasksPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [view, setView] = useState<ViewMode>('kanban');
  // Kanban has no per-column filters, so it still needs its own Status/Priority
  // dropdowns to scope the board — shown only in Kanban view. Table view uses
  // the DataTable's own Status/Priority enum column filters instead.
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; task: Task | null }>({
    isOpen: false,
    task: null,
  });
  const viewModal = useViewModal<Task>();
  const deleteTask = useDeleteTask();

  const rowActions = useCallback(
    (task: Task): DataTableRowAction<Task>[] => [
      {
        key: 'view',
        label: t('tasks:list.rowActionView'),
        icon: Eye,
        onClick: () => {
          viewModal.openWith(task);
        },
      },
      {
        key: 'delete',
        label: t('tasks:list.rowActionDelete'),
        icon: Trash2,
        variant: 'danger',
        onClick: () => setDeleteDialog({ isOpen: true, task }),
      },
    ],
    [viewModal, t]
  );

  useEffect(() => {
    if (!authLoading && user && !hasRole(user.role, TASK_MANAGER_ROLES)) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Kanban groups client-side across all lanes and has no per-column filters,
  // so it pre-filters server-side via the Status/Priority dropdowns. Table
  // view fetches everything (like every other master-data grid) and filters
  // client-side via the DataTable's own Status/Priority enum columns.
  const filters =
    view === 'kanban'
      ? {
          status: statusFilter !== 'all' ? statusFilter : undefined,
          priority: priorityFilter !== 'all' ? priorityFilter : undefined,
          page: 1,
          limit: 100,
        }
      : { limit: 1000 };

  const allTasksQuery = useTasks(activeTab === 'all' ? filters : undefined);
  const taggedTasksQuery = useTaggedTasks(activeTab === 'tagged' ? filters : undefined);
  const myTasksQuery = useMyTasks(activeTab === 'created' ? filters : undefined);

  const activeQuery =
    activeTab === 'tagged'
      ? taggedTasksQuery
      : activeTab === 'created'
        ? myTasksQuery
        : allTasksQuery;

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-nb-gray-600">{t('common:actions.loading')}</p>
      </div>
    );
  }

  if (!hasRole(user.role, TASK_MANAGER_ROLES)) return null;

  const tasks = activeQuery.data?.data || [];
  const isLoading = activeQuery.isLoading;

  // Build tabs and filter options from i18n
  const scopeTabs: TabItem<ActiveTab>[] = [
    { key: 'all', label: t('tasks:list.scopeTabAll') },
    { key: 'tagged', label: t('tasks:list.scopeTabTagged') },
    { key: 'created', label: t('tasks:list.scopeTabCreated') },
  ];

  const viewTabs: TabItem<ViewMode>[] = [
    { key: 'kanban', label: t('tasks:list.viewTabKanban') },
    { key: 'table', label: t('tasks:list.viewTabTable') },
  ];

  const statusOptions = [
    { value: 'all', label: t('tasks:list.filterStatusAll') },
    ...(Object.keys(TASK_STATUS_TONES) as TaskStatus[]).map((s) => ({
      value: s,
      label: getTaskStatusLabel(s, t),
    })),
  ];
  const priorityOptions = [
    { value: 'all', label: t('tasks:list.filterPriorityAll') },
    ...(Object.keys(TASK_PRIORITY_TONES) as TaskPriority[]).map((p) => ({
      value: p,
      label: getTaskPriorityLabel(p, t),
    })),
  ];

  const columns: ColumnDef<Task>[] = [
    {
      id: 'id',
      accessorKey: 'id',
      header: t('tasks:list.tableHeaderId'),
      enableSorting: false,
      meta: { label: t('tasks:list.tableHeaderId'), defaultHidden: true, filterVariant: 'text' },
      cell: ({ row }) => (
        <span className="font-mono text-[11px] text-nb-gray-600">{row.original.id}</span>
      ),
    },
    {
      id: 'title',
      header: t('tasks:list.tableHeaderTitle'),
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: t('tasks:list.tableHeaderTitle') },
      cell: ({ row }) => <div className="font-semibold text-nb-black">{row.original.title}</div>,
    },
    {
      id: 'assigned_to',
      header: t('tasks:list.tableHeaderAssignedTo'),
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: t('tasks:list.tableHeaderAssignedTo') },
      cell: ({ row }) => <div className="text-nb-body-sm">{row.original.assigned_to?.full_name ?? '-'}</div>,
    },
    {
      id: 'area',
      header: t('tasks:list.tableHeaderArea'),
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: t('tasks:list.tableHeaderArea') },
      cell: ({ row }) => (
        <div className="text-nb-body-sm">{row.original.area?.name ?? row.original.rayon?.name ?? '-'}</div>
      ),
    },
    {
      id: 'priority',
      accessorFn: (row) => getTaskPriorityLabel(row.priority, t),
      header: t('tasks:list.tableHeaderPriority'),
      enableSorting: false,
      meta: {
        label: t('tasks:list.tableHeaderPriority'),
        filterVariant: 'enum',
        filterOptions: priorityOptions.slice(1),
      },
      cell: ({ row }) => (
        <StatusPill tone={TASK_PRIORITY_TONES[row.original.priority]}>
          {getTaskPriorityLabel(row.original.priority, t)}
        </StatusPill>
      ),
    },
    {
      id: 'status',
      accessorFn: (row) => getTaskStatusLabel(row.status, t),
      header: t('tasks:list.tableHeaderStatus'),
      enableSorting: false,
      meta: {
        label: t('tasks:list.tableHeaderStatus'),
        filterVariant: 'enum',
        filterOptions: statusOptions.slice(1),
      },
      cell: ({ row }) => (
        <StatusPill tone={TASK_STATUS_TONES[row.original.status]} dot>
          {getTaskStatusLabel(row.original.status, t)}
        </StatusPill>
      ),
    },
    {
      id: 'due_date',
      header: t('tasks:list.tableHeaderDueDate'),
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: t('tasks:list.tableHeaderDueDate') },
      cell: ({ row }) => (
        <div className="text-nb-body-sm">
          {row.original.due_date ? new Date(row.original.due_date).toLocaleDateString(intlLocale()) : '-'}
        </div>
      ),
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: t('tasks:list.tableHeaderCreated'),
      enableSorting: false,
      meta: { label: t('tasks:list.tableHeaderCreated'), defaultHidden: true, filterVariant: 'date' },
      cell: ({ row }) => (
        <span className="text-nb-body-sm text-nb-gray-600">
          {formatDate(row.original.created_at)}
        </span>
      ),
    },
    {
      id: 'updated_at',
      accessorKey: 'updated_at',
      header: t('tasks:list.tableHeaderUpdated'),
      enableSorting: false,
      meta: { label: t('tasks:list.tableHeaderUpdated'), defaultHidden: true, filterVariant: 'date' },
      cell: ({ row }) => (
        <span className="text-nb-body-sm text-nb-gray-600">
          {formatDate(row.original.updated_at)}
        </span>
      ),
    },
  ];

  const hasFilters = statusFilter !== 'all' || priorityFilter !== 'all';

  return (
    <div className="space-y-5">
      <PageHeader
        description={
          activeQuery.data?.meta.total
            ? t('tasks:list.totalCount', { count: activeQuery.data.meta.total })
            : t('tasks:list.pageHeader')
        }
        // Stays in the masthead, not the table toolbar: Tugas is kanban-first and
        // the table is one of two views, so a toolbar button would vanish in
        // kanban. Same responsive shape as every list page's create action.
        actions={
          <CreateButton label={t('tasks:list.createButton')} onClick={() => setFormOpen(true)} />
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs<ActiveTab>
          tabs={scopeTabs}
          value={activeTab}
          onValueChange={setActiveTab}
          aria-label={t('tasks:list.scopeLabel')}
        />
        <Tabs<ViewMode>
          tabs={viewTabs}
          value={view}
          onValueChange={setView}
          size="sm"
          aria-label={t('tasks:list.viewLabel')}
        />
      </div>

      {view === 'kanban' && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <FormSelect
                label={t('tasks:list.filterStatus')}
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as TaskStatus | 'all')}
                options={statusOptions}
              />
              <FormSelect
                label={t('tasks:list.filterPriority')}
                value={priorityFilter}
                onChange={(value) => setPriorityFilter(value as TaskPriority | 'all')}
                options={priorityOptions}
              />
              {hasFilters && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setStatusFilter('all');
                    setPriorityFilter('all');
                  }}
                >
                  {t('tasks:list.resetFilter')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {view === 'kanban' ? (
        <TaskKanban tasks={tasks} loading={isLoading} />
      ) : (
        <Card>
          <CardContent className="p-4">
            <DataTable<Task, unknown>
              columns={columns}
              data={tasks}
              loading={isLoading}
              getRowId={(r) => r.id}
              rowActions={rowActions}
              emptyTitle={t("tasks:list.emptyTitle")}
            />
          </CardContent>
        </Card>
      )}

      <TaskFormModal open={formOpen} onOpenChange={setFormOpen} />

      <DetailModal
        open={viewModal.open}
        onOpenChange={viewModal.onOpenChange}
        title={t('tasks:detail.taskDetails')}
        rows={viewModal.item ? [
          { label: t('tasks:fields.description'), value: viewModal.item.title },
          { label: t('tasks:list.tableHeaderStatus'), value: (
            <StatusPill tone={TASK_STATUS_TONES[viewModal.item.status]} dot>
              {getTaskStatusLabel(viewModal.item.status, t)}
            </StatusPill>
          ) },
          { label: t('tasks:list.tableHeaderPriority'), value: (
            <StatusPill tone={TASK_PRIORITY_TONES[viewModal.item.priority]}>
              {getTaskPriorityLabel(viewModal.item.priority, t)}
            </StatusPill>
          ) },
          { label: t('tasks:list.tableHeaderAssignedTo'), value: viewModal.item.assigned_to?.full_name },
          { label: t('tasks:list.tableHeaderArea'), value: viewModal.item.area?.name ?? viewModal.item.rayon?.name },
          { label: t('tasks:list.tableHeaderDueDate'), value: viewModal.item.due_date ? new Date(viewModal.item.due_date).toLocaleDateString(intlLocale()) : null },
          { label: t('tasks:list.tableHeaderCreated'), value: formatDate(viewModal.item.created_at) },
          { label: t('tasks:list.tableHeaderUpdated'), value: formatDate(viewModal.item.updated_at) },
        ] : []}
      />

      <ConfirmDialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, isOpen: open })}
        title={t('tasks:list.deleteConfirmTitle')}
        description={t('tasks:list.deleteConfirmDescription')}
        confirmLabel={t('tasks:list.rowActionDelete')}
        loading={deleteTask.isPending}
        onConfirm={async () => {
          if (deleteDialog.task) {
            await deleteTask.mutateAsync(deleteDialog.task.id);
            setDeleteDialog({ isOpen: false, task: null });
          }
        }}
      />
    </div>
  );
}
