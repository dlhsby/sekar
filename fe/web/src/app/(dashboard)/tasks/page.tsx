/**
 * Tasks List Page
 * View and manage task assignments
 * Access: Admin + KepalaRayon + KoordinatorLapangan
 */

'use client';

import { useAuth } from '@/lib/auth/hooks';
import { useTasks, type TaskStatus, type TaskPriority } from '@/lib/api/tasks';
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

// Access control
const ALLOWED_ROLES = ['admin', 'kepala_rayon', 'koordinator_lapangan'];

export default function TasksPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    if (!authLoading && user && !ALLOWED_ROLES.includes(user.role)) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  // Fetch tasks
  const { data: tasksData, isLoading } = useTasks({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    priority: priorityFilter !== 'all' ? priorityFilter : undefined,
    page,
    limit,
  });

  // Loading state
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

  // Access denied
  if (!ALLOWED_ROLES.includes(user.role)) {
    return null;
  }

  const tasks = tasksData?.data || [];
  const pagination = tasksData?.meta;

  // Status options
  const statusOptions = [
    { value: 'all', label: 'Semua Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'assigned', label: 'Ditugaskan' },
    { value: 'accepted', label: 'Diterima' },
    { value: 'in_progress', label: 'Sedang Dikerjakan' },
    { value: 'completed', label: 'Selesai' },
    { value: 'declined', label: 'Ditolak' },
    { value: 'cancelled', label: 'Dibatalkan' },
  ];

  // Priority options
  const priorityOptions = [
    { value: 'all', label: 'Semua Prioritas' },
    { value: 'low', label: 'Rendah' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'Tinggi' },
    { value: 'urgent', label: 'Mendesak' },
  ];

  // Status badge colors
  const statusBadges: Record<
    TaskStatus,
    'secondary' | 'default' | 'success' | 'warning' | 'destructive'
  > = {
    pending: 'secondary',
    assigned: 'default',
    accepted: 'default',
    in_progress: 'warning',
    completed: 'success',
    declined: 'destructive',
    cancelled: 'secondary',
  };

  // Priority badge colors
  const priorityBadges: Record<TaskPriority, 'secondary' | 'success' | 'warning' | 'destructive'> =
    {
      low: 'secondary',
      normal: 'success',
      high: 'warning',
      urgent: 'destructive',
    };

  // Table columns
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
      header: 'Area',
      cell: (task) => <div className="text-sm">{task.area ? task.area.name : '-'}</div>,
    },
    {
      key: 'priority',
      header: 'Prioritas',
      cell: (task) => (
        <Badge variant={priorityBadges[task.priority]} size="sm">
          {priorityOptions.find((p) => p.value === task.priority)?.label || task.priority}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (task) => (
        <Badge variant={statusBadges[task.status]} size="sm">
          {statusOptions.find((s) => s.value === task.status)?.label || task.status}
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-nb-black">Tugas</h1>
          <p className="text-nb-gray-600 mt-1">Kelola penugasan pekerja</p>
        </div>
        <Button onClick={() => router.push('/tasks/new')} leftIcon={<Plus className="w-5 h-5" />}>
          Buat Tugas Baru
        </Button>
      </div>

      {/* Filters */}
      <Card variant="elevated">
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status Filter */}
            <FormSelect
              label="Filter Status"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as TaskStatus | 'all')}
              options={statusOptions}
              aria-label="Filter berdasarkan status"
            />

            {/* Priority Filter */}
            <FormSelect
              label="Filter Prioritas"
              value={priorityFilter}
              onChange={(value) => setPriorityFilter(value as TaskPriority | 'all')}
              options={priorityOptions}
            />
          </div>

          {/* Clear Filters */}
          {(statusFilter !== 'all' || priorityFilter !== 'all') && (
            <Button
              variant="secondary"
              onClick={() => {
                setStatusFilter('all');
                setPriorityFilter('all');
              }}
              className="mt-4"
            >
              Reset Filter
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" aria-label="Jumlah tugas per status">
        <Card variant="elevated">
          <CardContent>
            <div className="text-sm font-semibold text-nb-gray-600 mb-2">Total Tugas</div>
            <div className="text-3xl font-black text-nb-black">{pagination?.total || 0}</div>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent>
            <div className="text-sm font-semibold text-nb-gray-600 mb-2">Pending</div>
            <div className="text-3xl font-black text-nb-warning">
              {tasks.filter((t) => t.status === 'pending' || t.status === 'assigned').length}
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent>
            <div className="text-sm font-semibold text-nb-gray-600 mb-2">Sedang Dikerjakan</div>
            <div className="text-3xl font-black text-nb-primary">
              {tasks.filter((t) => t.status === 'in_progress').length}
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent>
            <div className="text-sm font-semibold text-nb-gray-600 mb-2">Selesai</div>
            <div className="text-3xl font-black text-nb-success">
              {tasks.filter((t) => t.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card variant="elevated">
        <CardHeader>
          <h2 className="text-xl font-bold text-nb-black">Daftar Tugas</h2>
        </CardHeader>
        <CardContent>
          <DataTable<Task>
            columns={columns}
            data={tasks}
            loading={isLoading}
            emptyMessage="Tidak ada tugas"
          />

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t-3 border-nb-black">
              <div className="text-sm text-nb-gray-600">
                Halaman {pagination.page} dari {pagination.totalPages} ({pagination.total} total
                tugas)
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
