/**
 * Tasks List Page
 * View and manage task assignments
 * Access: Admin + KepalaRayon + KoordinatorLapangan
 */

'use client';

import { useAuth } from '@/lib/auth/hooks';
import { useTasks, type TaskStatus, type TaskPriority } from '@/lib/api/tasks';
import { NBCard, NBCardHeader, NBCardContent, NBBadge, NBTable, NBSelect, NBButton } from '@/components/nb';
import { NBTableColumn } from '@/components/nb/NBTable';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Task } from '@/lib/api/tasks';

export default function TasksPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | ''>('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Access control
  const allowedRoles = ['Admin', 'KepalaRayon', 'KoordinatorLapangan'];

  useEffect(() => {
    if (!authLoading && user && !allowedRoles.includes(user.role)) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  // Fetch tasks
  const { data: tasksData, isLoading } = useTasks({
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
    page,
    limit,
  });

  // Loading state
  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-nb-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (!allowedRoles.includes(user.role)) {
    return null;
  }

  const tasks = tasksData?.data || [];
  const pagination = tasksData?.meta;

  // Status options
  const statusOptions = [
    { value: '', label: 'Semua Status' },
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
    { value: '', label: 'Semua Prioritas' },
    { value: 'low', label: 'Rendah' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'Tinggi' },
    { value: 'urgent', label: 'Mendesak' },
  ];

  // Status badge colors
  const statusBadges: Record<TaskStatus, 'neutral' | 'primary' | 'success' | 'warning' | 'danger'> = {
    pending: 'neutral',
    assigned: 'primary',
    accepted: 'primary',
    in_progress: 'warning',
    completed: 'success',
    declined: 'danger',
    cancelled: 'neutral',
  };

  // Priority badge colors
  const priorityBadges: Record<TaskPriority, 'neutral' | 'success' | 'warning' | 'danger'> = {
    low: 'neutral',
    normal: 'success',
    high: 'warning',
    urgent: 'danger',
  };

  // Table columns
  const columns: NBTableColumn<Task>[] = [
    {
      key: 'title',
      title: 'Judul Tugas',
      render: (_value: unknown, task: Task) => (
        <div className="font-semibold text-nb-black">{task.title}</div>
      ),
    },
    {
      key: 'assigned_to',
      title: 'Ditugaskan Ke',
      render: (_value: unknown, task: Task) => (
        <div className="text-sm">
          {task.assigned_to ? task.assigned_to.full_name : '-'}
        </div>
      ),
    },
    {
      key: 'area',
      title: 'Area',
      render: (_value: unknown, task: Task) => (
        <div className="text-sm">{task.area ? task.area.name : '-'}</div>
      ),
    },
    {
      key: 'priority',
      title: 'Prioritas',
      render: (_value: unknown, task: Task) => (
        <NBBadge variant={priorityBadges[task.priority]} size="sm">
          {priorityOptions.find((p) => p.value === task.priority)?.label || task.priority}
        </NBBadge>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (_value: unknown, task: Task) => (
        <NBBadge variant={statusBadges[task.status]} size="sm">
          {statusOptions.find((s) => s.value === task.status)?.label || task.status}
        </NBBadge>
      ),
    },
    {
      key: 'due_date',
      title: 'Tenggat',
      render: (_value: unknown, task: Task) => (
        <div className="text-sm">
          {task.due_date
            ? new Date(task.due_date).toLocaleDateString('id-ID')
            : '-'}
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Aksi',
      render: (_value: unknown, task: Task) => (
        <Link
          href={`/tasks/${task.id}`}
          className="text-nb-primary font-semibold hover:underline"
        >
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
          <p className="text-gray-600 mt-1">
            Kelola penugasan pekerja
          </p>
        </div>
        <NBButton onClick={() => router.push('/tasks/new')} variant="primary">
          ➕ Buat Tugas Baru
        </NBButton>
      </div>

      {/* Filters */}
      <NBCard variant="elevated">
        <NBCardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status Filter */}
            <NBSelect
              label="Filter Status"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as TaskStatus | '')}
              options={statusOptions}
            />

            {/* Priority Filter */}
            <NBSelect
              label="Filter Prioritas"
              value={priorityFilter}
              onChange={(value) => setPriorityFilter(value as TaskPriority | '')}
              options={priorityOptions}
            />
          </div>

          {/* Clear Filters */}
          {(statusFilter || priorityFilter) && (
            <button
              onClick={() => {
                setStatusFilter('');
                setPriorityFilter('');
              }}
              className="mt-4 px-4 py-2 border-3 border-black bg-white font-semibold hover:bg-gray-50 active:translate-x-[2px] active:translate-y-[2px] transition-all"
            >
              Reset Filter
            </button>
          )}
        </NBCardContent>
      </NBCard>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <NBCard variant="elevated">
          <NBCardContent>
            <div className="text-sm font-semibold text-gray-600 mb-2">Total Tugas</div>
            <div className="text-3xl font-black text-nb-black">
              {pagination?.total || 0}
            </div>
          </NBCardContent>
        </NBCard>
        <NBCard variant="elevated">
          <NBCardContent>
            <div className="text-sm font-semibold text-gray-600 mb-2">Pending</div>
            <div className="text-3xl font-black text-nb-warning">
              {tasks.filter((t) => t.status === 'pending' || t.status === 'assigned').length}
            </div>
          </NBCardContent>
        </NBCard>
        <NBCard variant="elevated">
          <NBCardContent>
            <div className="text-sm font-semibold text-gray-600 mb-2">Sedang Dikerjakan</div>
            <div className="text-3xl font-black text-nb-primary">
              {tasks.filter((t) => t.status === 'in_progress').length}
            </div>
          </NBCardContent>
        </NBCard>
        <NBCard variant="elevated">
          <NBCardContent>
            <div className="text-sm font-semibold text-gray-600 mb-2">Selesai</div>
            <div className="text-3xl font-black text-nb-success">
              {tasks.filter((t) => t.status === 'completed').length}
            </div>
          </NBCardContent>
        </NBCard>
      </div>

      {/* Table */}
      <NBCard variant="elevated">
        <NBCardHeader>
          <h2 className="text-xl font-bold text-nb-black">Daftar Tugas</h2>
        </NBCardHeader>
        <NBCardContent>
          <NBTable<Task>
            columns={columns}
            data={tasks}
            loading={isLoading}
            emptyText="Tidak ada tugas"
          />

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t-3 border-black">
              <div className="text-sm text-gray-600">
                Halaman {pagination.page} dari {pagination.totalPages} (
                {pagination.total} total tugas)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border-3 border-black bg-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 active:translate-x-[2px] active:translate-y-[2px] transition-all"
                >
                  Sebelumnya
                </button>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(pagination.totalPages, p + 1))
                  }
                  disabled={pagination.page === pagination.totalPages}
                  className="px-4 py-2 border-3 border-black bg-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 active:translate-x-[2px] active:translate-y-[2px] transition-all"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </NBCardContent>
      </NBCard>
    </div>
  );
}
