/**
 * Schedules List Page
 * Display worker schedules with filters and table view
 * Access: Admin + KoordinatorLapangan
 */

'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/hooks';
import { useSchedules, useDeleteSchedule } from '@/lib/api/schedules';
import { WorkerSchedule } from '@/types/models';
import { NBCard, NBCardHeader, NBCardContent, NBTable, NBButton, NBInput, NBSelect, NBModal, NBBadge } from '@/components/nb';
import { NBTableColumn } from '@/components/nb/NBTable';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAreas } from '@/lib/api/areas';
import { useShiftDefinitions } from '@/lib/api/shift-definitions';

export default function SchedulesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // Filters
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<WorkerSchedule | null>(null);

  // Fetch data
  const { data: schedulesData, isLoading } = useSchedules({
    search,
    area_id: areaFilter || undefined,
    shift_definition_id: shiftFilter || undefined,
    page,
    limit,
  });

  const { data: areas } = useAreas({});
  const { data: shifts } = useShiftDefinitions();
  const deleteMutation = useDeleteSchedule();

  // Access control
  useEffect(() => {
    if (!authLoading && user && !['Admin', 'KoordinatorLapangan'].includes(user.role)) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

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

  if (!['Admin', 'KoordinatorLapangan'].includes(user.role)) {
    return null;
  }

  const schedules = schedulesData?.data || [];
  const pagination = schedulesData?.meta;

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Handle delete
  const handleDeleteClick = (schedule: WorkerSchedule) => {
    setScheduleToDelete(schedule);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!scheduleToDelete) return;
    
    try {
      await deleteMutation.mutateAsync(scheduleToDelete.id);
      setDeleteModalOpen(false);
      setScheduleToDelete(null);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  // Table columns
  const columns: NBTableColumn<WorkerSchedule>[] = [
    {
      key: 'user',
      title: 'Pekerja',
      render: (_value: unknown, schedule: WorkerSchedule) => (
        <div>
          <div className="font-semibold text-nb-black">
            {schedule.user?.name || '-'}
          </div>
          <div className="text-sm text-gray-600">
            {schedule.user?.email || ''}
          </div>
        </div>
      ),
    },
    {
      key: 'area',
      title: 'Area',
      render: (_value: unknown, schedule: WorkerSchedule) => (
        <div>
          <div className="font-medium">{schedule.area?.name || '-'}</div>
          <div className="text-sm text-gray-600">{schedule.area?.code || ''}</div>
        </div>
      ),
    },
    {
      key: 'shift',
      title: 'Shift',
      render: (_value: unknown, schedule: WorkerSchedule) => {
        const shift = schedule.shift_definition;
        if (!shift) return '-';
        
        const shiftColors: Record<string, string> = {
          SHIFT1: 'primary',
          SHIFT2: 'success',
          SHIFT3: 'warning',
        };
        
        return (
          <div>
            <NBBadge 
              variant={shiftColors[shift.code] as any || 'primary'}
              size="sm"
            >
              {shift.name}
            </NBBadge>
            <div className="text-xs text-gray-600 mt-1">
              {shift.start_time} - {shift.end_time}
            </div>
          </div>
        );
      },
    },
    {
      key: 'effective_date',
      title: 'Tanggal Mulai',
      render: (_value: unknown, schedule: WorkerSchedule) =>
        formatDate(schedule.effective_date),
    },
    {
      key: 'end_date',
      title: 'Tanggal Selesai',
      render: (_value: unknown, schedule: WorkerSchedule) =>
        schedule.end_date ? formatDate(schedule.end_date) : (
          <span className="text-gray-500 italic">Berlangsung</span>
        ),
    },
    {
      key: 'actions',
      title: 'Aksi',
      render: (_value: unknown, schedule: WorkerSchedule) => (
        <div className="flex gap-2">
          <Link href={`/schedules/${schedule.id}/edit`}>
            <NBButton variant="secondary" size="sm">
              Edit
            </NBButton>
          </Link>
          <NBButton
            variant="danger"
            size="sm"
            onClick={() => handleDeleteClick(schedule)}
          >
            Hapus
          </NBButton>
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-nb-black mb-2">
            Manajemen Jadwal
          </h1>
          <p className="text-gray-600">
            Kelola jadwal kerja pekerja per area dan shift
          </p>
        </div>
        <Link href="/schedules/new">
          <NBButton variant="primary" size="lg">
            + Buat Jadwal Baru
          </NBButton>
        </Link>
      </div>

      {/* Filters */}
      <NBCard variant="elevated" className="mb-6">
        <NBCardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <NBInput
              label="Cari Pekerja"
              type="text"
              placeholder="Nama pekerja..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />

            {/* Area Filter */}
            <NBSelect
              label="Filter Area"
              value={areaFilter}
              onChange={(value) => {
                setAreaFilter(value as string);
                setPage(1);
              }}
              options={[
                { value: '', label: 'Semua Area' },
                ...(areas?.data || []).map((area) => ({
                  value: area.id,
                  label: `${area.name} (${area.code})`,
                })),
              ]}
            />

            {/* Shift Filter */}
            <NBSelect
              label="Filter Shift"
              value={shiftFilter}
              onChange={(value) => {
                setShiftFilter(value as string);
                setPage(1);
              }}
              options={[
                { value: '', label: 'Semua Shift' },
                ...(shifts || []).map((shift) => ({
                  value: shift.id,
                  label: `${shift.name} (${shift.start_time}-${shift.end_time})`,
                })),
              ]}
            />
          </div>
        </NBCardContent>
      </NBCard>

      {/* Table */}
      <NBCard variant="elevated">
        <NBCardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-nb-black">
              Daftar Jadwal
            </h2>
            {pagination && (
              <NBBadge variant="primary">
                {pagination.total} Jadwal
              </NBBadge>
            )}
          </div>
        </NBCardHeader>

        <NBCardContent>
          <NBTable<WorkerSchedule>
            columns={columns}
            data={schedules}
            loading={isLoading}
            emptyText="Belum ada jadwal terdaftar"
          />

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t-3 border-black">
              <div className="text-sm text-gray-600">
                Halaman {pagination.page} dari {pagination.totalPages} (
                {pagination.total} total jadwal)
              </div>
              <div className="flex gap-2">
                <NBButton
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={pagination.page === 1}
                >
                  Sebelumnya
                </NBButton>
                <NBButton
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Selanjutnya
                </NBButton>
              </div>
            </div>
          )}
        </NBCardContent>
      </NBCard>

      {/* Delete Confirmation Modal */}
      <NBModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setScheduleToDelete(null);
        }}
        title="Hapus Jadwal"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Apakah Anda yakin ingin menghapus jadwal ini?
          </p>
          {scheduleToDelete && (
            <div className="p-4 border-3 border-black bg-gray-50">
              <div className="font-semibold">{scheduleToDelete.user?.name}</div>
              <div className="text-sm text-gray-600">
                {scheduleToDelete.area?.name} •{' '}
                {scheduleToDelete.shift_definition?.name}
              </div>
              <div className="text-sm text-gray-600">
                {formatDate(scheduleToDelete.effective_date)}
                {scheduleToDelete.end_date && ` - ${formatDate(scheduleToDelete.end_date)}`}
              </div>
            </div>
          )}
          <p className="text-sm text-gray-600">
            Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex gap-2 justify-end">
            <NBButton
              variant="secondary"
              onClick={() => {
                setDeleteModalOpen(false);
                setScheduleToDelete(null);
              }}
            >
              Batal
            </NBButton>
            <NBButton
              variant="danger"
              onClick={handleDeleteConfirm}
              loading={deleteMutation.isPending}
            >
              Hapus Jadwal
            </NBButton>
          </div>
        </div>
      </NBModal>
    </div>
  );
}
