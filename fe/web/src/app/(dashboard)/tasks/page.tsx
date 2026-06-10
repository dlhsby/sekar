/**
 * Tasks List Page (Phase 2C - 8 statuses, tabs, verification)
 * Access: TASK_MANAGER_ROLES
 */

'use client';

import { useAuth } from '@/lib/auth/hooks';
import {
  useTasks,
  useTaggedTasks,
  useMyTasks,
  type TaskStatus,
  type TaskPriority,
} from '@/lib/api/tasks';
import {
  Card,
  CardHeader,
  CardContent,
  Badge,
  DataTable,
  FormSelect,
  Button,
} from '@/components/ui';
import type { ColumnDef } from '@/components/ui/data-table';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Task } from '@/lib/api/tasks';
import { TASK_MANAGER_ROLES, hasRole } from '@/lib/constants/roles';
import { TASK_STATUS_LABELS, TASK_STATUS_BADGES } from '@/lib/constants/tasks';

type ActiveTab = 'all' | 'tagged' | 'created';

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Rendah',
  normal: 'Normal',
  high: 'Tinggi',
  urgent: 'Mendesak',
};

const PRIORITY_BADGES: Record<TaskPriority, 'secondary' | 'success' | 'warning' | 'destructive'> = {
  low: 'secondary',
  normal: 'success',
  high: 'warning',
  urgent: 'destructive',
};

export default function TasksPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    if (!authLoading && user && !hasRole(user.role, TASK_MANAGER_ROLES)) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const filters = {
    status: statusFilter !== 'all' ? statusFilter : undefined,
    priority: priorityFilter !== 'all' ? priorityFilter : undefined,
    page,
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-nb-primary mx-auto mb-4"></div>
          <p className="text-nb-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!hasRole(user.role, TASK_MANAGER_ROLES)) return null;

  const tasks = activeQuery.data?.data || [];
  const pagination = activeQuery.data?.meta;
  const isLoading = activeQuery.isLoading;

  const statusOptions = [
    { value: 'all', label: 'Semua Status' },
    { value: 'pending', label: TASK_STATUS_LABELS.pending },
    { value: 'assigned', label: TASK_STATUS_LABELS.assigned },
    { value: 'accepted', label: TASK_STATUS_LABELS.accepted },
    { value: 'declined', label: TASK_STATUS_LABELS.declined },
    { value: 'in_progress', label: TASK_STATUS_LABELS.in_progress },
    { value: 'completed', label: TASK_STATUS_LABELS.completed },
    { value: 'verified', label: TASK_STATUS_LABELS.verified },
    { value: 'revision_needed', label: TASK_STATUS_LABELS.revision_needed },
  ];

  const priorityOptions = [
    { value: 'all', label: 'Semua Prioritas' },
    { value: 'low', label: 'Rendah' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'Tinggi' },
    { value: 'urgent', label: 'Mendesak' },
  ];

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: 'all', label: 'Semua Tugas' },
    { key: 'tagged', label: 'Ditandai' },
    { key: 'created', label: 'Dibuat Saya' },
  ];

  const columns: ColumnDef<Task>[] = [
    {
      key: 'title',
      header: 'Judul Tugas',
      cell: (task) => <div className="font-semibold text-nb-black">{task.title}</div>,
    },
    {
      key: 'assigned_to',
      header: 'Ditugaskan Ke',
      cell: (task) => (
        <div className="text-sm">{task.assigned_to ? task.assigned_to.full_name : '-'}</div>
      ),
    },
    {
      key: 'area',
      header: 'Area / Rayon',
      cell: (task) => (
        <div className="text-sm">
          {task.area ? task.area.name : task.rayon ? task.rayon.name : '-'}
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Prioritas',
      cell: (task) => (
        <Badge variant={PRIORITY_BADGES[task.priority]} size="sm">
          {PRIORITY_LABELS[task.priority]}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (task) => (
        <Badge variant={TASK_STATUS_BADGES[task.status]} size="sm">
          {TASK_STATUS_LABELS[task.status]}
        </Badge>
      ),
    },
    {
      key: 'due_date',
      header: 'Tenggat',
      cell: (task) => (
        <div className="text-sm">
          {task.due_date ? new Date(task.due_date).toLocaleDateString('id-ID') : '-'}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      cell: (task) => (
        <Link href={`/tasks/${task.id}`} className="text-nb-primary font-semibold hover:underline">
          Detail
        </Link>
      ),
    },
  ];

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    setPage(1);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-nb-gray-600 mt-1">Kelola penugasan</p>
        </div>
        <Button onClick={() => router.push('/tasks/new')} leftIcon={<Plus className="w-5 h-5" />}>
          Buat Tugas Baru
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b-3 border-nb-black">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-6 py-3 font-bold text-sm border-b-3 -mb-[3px] transition-colors ${
              activeTab === tab.key
                ? 'border-nb-primary text-nb-primary'
                : 'border-transparent text-nb-gray-600 hover:text-nb-black'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card variant="elevated">
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
          {(statusFilter !== 'all' || priorityFilter !== 'all') && (
            <Button
              variant="secondary"
              onClick={() => {
                setStatusFilter('all');
                setPriorityFilter('all');
                setPage(1);
              }}
              className="mt-4"
            >
              Reset Filter
            </Button>
          )}
        </CardContent>
      </Card>

      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-nb-black">Daftar Tugas</h2>
            <div className="text-sm text-nb-gray-600">{pagination?.total || 0} total</div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable<Task>
            columns={columns}
            data={tasks}
            loading={isLoading}
            emptyMessage="Tidak ada tugas"
          />
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t-3 border-nb-black">
              <div className="text-sm text-nb-gray-600">
                Halaman {pagination.page} dari {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page === 1}
                  leftIcon={<ChevronLeft className="w-4 h-4" />}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page === pagination.totalPages}
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
