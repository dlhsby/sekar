/**
 * Tasks List Page — TSK-1 (Phase 4-R revamp, hifi-web §06)
 * Kanban/table toggle, scope tabs (all/tagged/created), v2.1 status pills.
 * Access: TASK_MANAGER_ROLES
 */

'use client';

import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth/hooks';
import {
  useTasks,
  useTaggedTasks,
  useMyTasks,
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
  PageHeader,
  StatusPill,
  Tabs,
  DetailModal,
  type TabItem,
  type DataTableRowAction,
} from '@/components/ui';
import type { ColumnDef } from '@/components/ui/data-table';
import { TaskKanban } from '@/components/tasks/TaskKanban';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { TASK_MANAGER_ROLES, hasRole } from '@/lib/constants/roles';
import { TaskFormModal } from '@/components/tasks/TaskFormModal';
import { formatDate } from '@/lib/utils/time';
import { useViewModal } from '@/lib/hooks/use-view-modal';
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_TONES,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_TONES,
} from '@/lib/constants/tasks';

type ActiveTab = 'all' | 'tagged' | 'created';
type ViewMode = 'kanban' | 'table';

const SCOPE_TABS: TabItem<ActiveTab>[] = [
  { key: 'all', label: 'Semua Tugas' },
  { key: 'tagged', label: 'Ditandai' },
  { key: 'created', label: 'Dibuat Saya' },
];

const VIEW_TABS: TabItem<ViewMode>[] = [
  { key: 'kanban', label: 'Papan' },
  { key: 'table', label: 'Tabel' },
];

export default function TasksPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [view, setView] = useState<ViewMode>('kanban');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const viewModal = useViewModal<Task>();
  // The board groups client-side across all lanes, so it needs a wider window
  // than the paginated table.
  const limit = view === 'kanban' ? 100 : 20;

  const rowActions = useCallback(
    (task: Task): DataTableRowAction<Task>[] => [
      {
        key: 'view',
        label: 'Lihat',
        icon: Eye,
        onClick: () => {
          viewModal.openWith(task);
        },
      },
    ],
    [viewModal]
  );

  useEffect(() => {
    if (!authLoading && user && !hasRole(user.role, TASK_MANAGER_ROLES)) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const filters = {
    status: statusFilter !== 'all' ? statusFilter : undefined,
    priority: priorityFilter !== 'all' ? priorityFilter : undefined,
    page: view === 'kanban' ? 1 : page,
    limit,
  };

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
        <p className="text-nb-gray-600">Memuat…</p>
      </div>
    );
  }

  if (!hasRole(user.role, TASK_MANAGER_ROLES)) return null;

  const tasks = activeQuery.data?.data || [];
  const pagination = activeQuery.data?.meta;
  const isLoading = activeQuery.isLoading;

  const statusOptions = [
    { value: 'all', label: 'Semua Status' },
    ...(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((s) => ({
      value: s,
      label: TASK_STATUS_LABELS[s],
    })),
  ];
  const priorityOptions = [
    { value: 'all', label: 'Semua Prioritas' },
    ...(Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]).map((p) => ({
      value: p,
      label: TASK_PRIORITY_LABELS[p],
    })),
  ];

  const columns: ColumnDef<Task>[] = [
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
      id: 'title',
      header: 'Judul Tugas',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Judul Tugas' },
      cell: ({ row }) => <div className="font-semibold text-nb-black">{row.original.title}</div>,
    },
    {
      id: 'assigned_to',
      header: 'Ditugaskan Ke',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Ditugaskan Ke' },
      cell: ({ row }) => <div className="text-nb-body-sm">{row.original.assigned_to?.full_name ?? '-'}</div>,
    },
    {
      id: 'area',
      header: 'Area / Rayon',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Area / Rayon' },
      cell: ({ row }) => (
        <div className="text-nb-body-sm">{row.original.area?.name ?? row.original.rayon?.name ?? '-'}</div>
      ),
    },
    {
      id: 'priority',
      header: 'Prioritas',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Prioritas' },
      cell: ({ row }) => (
        <StatusPill tone={TASK_PRIORITY_TONES[row.original.priority]}>
          {TASK_PRIORITY_LABELS[row.original.priority]}
        </StatusPill>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Status' },
      cell: ({ row }) => (
        <StatusPill tone={TASK_STATUS_TONES[row.original.status]} dot>
          {TASK_STATUS_LABELS[row.original.status]}
        </StatusPill>
      ),
    },
    {
      id: 'due_date',
      header: 'Tenggat',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Tenggat' },
      cell: ({ row }) => (
        <div className="text-nb-body-sm">
          {row.original.due_date ? new Date(row.original.due_date).toLocaleDateString('id-ID') : '-'}
        </div>
      ),
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: 'Dibuat',
      enableSorting: false,
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
      enableSorting: false,
      meta: { label: 'Diperbarui', defaultHidden: true, filterVariant: 'date' },
      cell: ({ row }) => (
        <span className="text-nb-body-sm text-nb-gray-600">
          {formatDate(row.original.updated_at)}
        </span>
      ),
    },
  ];

  const handleScopeChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const hasFilters = statusFilter !== 'all' || priorityFilter !== 'all';

  return (
    <div className="space-y-5">
      <PageHeader
        description="Kelola penugasan lapangan."
        actions={
          <Button onClick={() => setFormOpen(true)} leftIcon={<Plus className="size-5" />}>
            Buat Tugas
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs<ActiveTab>
          tabs={SCOPE_TABS}
          value={activeTab}
          onValueChange={handleScopeChange}
          aria-label="Lingkup tugas"
        />
        <Tabs<ViewMode>
          tabs={VIEW_TABS}
          value={view}
          onValueChange={(v) => {
            setView(v);
            setPage(1); // avoid landing on an out-of-range page after the toggle
          }}
          size="sm"
          aria-label="Tampilan"
        />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <FormSelect
              label="Filter Status"
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value as TaskStatus | 'all');
                setPage(1);
              }}
              options={statusOptions}
            />
            <FormSelect
              label="Filter Prioritas"
              value={priorityFilter}
              onChange={(value) => {
                setPriorityFilter(value as TaskPriority | 'all');
                setPage(1);
              }}
              options={priorityOptions}
            />
            {hasFilters && (
              <Button
                variant="secondary"
                onClick={() => {
                  setStatusFilter('all');
                  setPriorityFilter('all');
                  setPage(1);
                }}
              >
                Reset Filter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {view === 'kanban' ? (
        <TaskKanban tasks={tasks} loading={isLoading} />
      ) : (
        <Card>
          <CardContent className="p-4">
            <DataTable<Task, unknown>
              columns={columns}
              data={tasks}
              loading={isLoading}
              enablePagination={false}
              getRowId={(r) => r.id}
              rowActions={rowActions}
              emptyTitle="Tidak ada tugas"
            />
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t-2 border-nb-black pt-4">
                <div className="font-mono text-[11px] text-nb-gray-600">
                  Halaman {pagination.page} dari {pagination.totalPages} · {pagination.total} total
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pagination.page === 1}
                    leftIcon={<ChevronLeft className="size-4" />}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.page === pagination.totalPages}
                    rightIcon={<ChevronRight className="size-4" />}
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <TaskFormModal open={formOpen} onOpenChange={setFormOpen} />

      <DetailModal
        open={viewModal.open}
        onOpenChange={viewModal.onOpenChange}
        title="Detail Tugas"
        rows={viewModal.item ? [
          { label: 'Judul', value: viewModal.item.title },
          { label: 'Status', value: (
            <StatusPill tone={TASK_STATUS_TONES[viewModal.item.status]} dot>
              {TASK_STATUS_LABELS[viewModal.item.status]}
            </StatusPill>
          ) },
          { label: 'Prioritas', value: (
            <StatusPill tone={TASK_PRIORITY_TONES[viewModal.item.priority]}>
              {TASK_PRIORITY_LABELS[viewModal.item.priority]}
            </StatusPill>
          ) },
          { label: 'Ditugaskan Ke', value: viewModal.item.assigned_to?.full_name },
          { label: 'Area / Rayon', value: viewModal.item.area?.name ?? viewModal.item.rayon?.name },
          { label: 'Tenggat', value: viewModal.item.due_date ? new Date(viewModal.item.due_date).toLocaleDateString('id-ID') : null },
          { label: 'Dibuat', value: formatDate(viewModal.item.created_at) },
          { label: 'Diperbarui', value: formatDate(viewModal.item.updated_at) },
        ] : []}
      />
    </div>
  );
}
