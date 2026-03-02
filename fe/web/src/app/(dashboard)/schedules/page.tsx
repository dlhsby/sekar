/**
 * Schedules List Page
 * Display worker schedules with filters and table view
 * Access: Admin + KoordinatorLapangan
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/hooks';
import { useSchedules, useDeleteSchedule } from '@/lib/api/schedules';
import { WorkerSchedule } from '@/types/models';
import {
  Card,
  CardHeader,
  CardContent,
  DataTable,
  Button,
  FormInput,
  FormSelect,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Badge,
} from '@/components/ui';
import type { ColumnDef } from '@/components/ui/data-table';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAreas } from '@/lib/api/areas';
import { useShiftDefinitions } from '@/lib/api/shift-definitions';

export default function SchedulesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Filters
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');
  const [shiftFilter, setShiftFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<WorkerSchedule | null>(null);

  // Fetch data
  const { data: schedulesData, isLoading } = useSchedules({
    search,
    area_id: areaFilter !== 'all' ? areaFilter : undefined,
    shift_definition_id: shiftFilter !== 'all' ? shiftFilter : undefined,
    page,
    limit,
  });

  const { data: areas } = useAreas({});
  const { data: shifts } = useShiftDefinitions();
  const deleteMutation = useDeleteSchedule();

  // Access control
  useEffect(() => {
    if (
      !authLoading &&
      user &&
      !['admin_system', 'superadmin', 'korlap', 'admin_data'].includes(user.role)
    ) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

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

  if (!['admin_system', 'superadmin', 'korlap', 'admin_data'].includes(user.role)) {
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
  const columns: ColumnDef<WorkerSchedule>[] = [
    {
      key: 'user',
      header: 'Pekerja',
      cell: (schedule) => (
        <div>
          <div className="font-semibold text-nb-black">{schedule.user?.full_name || '-'}</div>
          <div className="text-sm text-nb-gray-600">{schedule.user?.username || ''}</div>
        </div>
      ),
    },
    {
      key: 'area',
      header: 'Area',
      cell: (schedule) => (
        <div>
          <div className="font-medium">{schedule.area?.name || '-'}</div>
          <div className="text-sm text-nb-gray-600">{schedule.area?.code || ''}</div>
        </div>
      ),
    },
    {
      key: 'shift',
      header: 'Shift',
      cell: (schedule) => {
        const shift = schedule.shift_definition;
        if (!shift) return '-';

        const shiftColors: Record<string, 'default' | 'success' | 'warning'> = {
          SHIFT1: 'default',
          SHIFT2: 'success',
          SHIFT3: 'warning',
        };

        return (
          <div>
            <Badge variant={shiftColors[shift.code] || 'default'} size="sm">
              {shift.name}
            </Badge>
            <div className="text-xs text-nb-gray-600 mt-1">
              {shift.start_time} - {shift.end_time}
            </div>
          </div>
        );
      },
    },
    {
      key: 'effective_date',
      header: 'Tanggal Mulai',
      cell: (schedule) => formatDate(schedule.effective_date),
    },
    {
      key: 'end_date',
      header: 'Tanggal Selesai',
      cell: (schedule) =>
        schedule.end_date ? (
          formatDate(schedule.end_date)
        ) : (
          <span className="text-nb-gray-500 italic">Berlangsung</span>
        ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      cell: (schedule) => (
        <div className="flex gap-2">
          <Link href={`/schedules/${schedule.id}/edit`}>
            <Button variant="secondary" size="sm">
              <Edit className="w-4 h-4" />
            </Button>
          </Link>
          <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(schedule)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-nb-black mb-2">Manajemen Jadwal</h1>
          <p className="text-nb-gray-600">Kelola jadwal kerja pekerja per area dan shift</p>
        </div>
        <Link href="/schedules/new">
          <Button size="lg" leftIcon={<Plus className="w-5 h-5" />}>
            Buat Jadwal Baru
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card variant="elevated" className="mb-6">
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <FormInput
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
            <FormSelect
              label="Filter Area"
              value={areaFilter}
              onChange={(value) => {
                setAreaFilter(value as string);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'Semua Area' },
                ...(areas?.data || []).map((area) => ({
                  value: area.id,
                  label: `${area.name} (${area.code})`,
                })),
              ]}
            />

            {/* Shift Filter */}
            <FormSelect
              label="Filter Shift"
              value={shiftFilter}
              onChange={(value) => {
                setShiftFilter(value as string);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'Semua Shift' },
                ...(shifts || []).map((shift) => ({
                  value: shift.id,
                  label: `${shift.name} (${shift.start_time}-${shift.end_time})`,
                })),
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-nb-black">Daftar Jadwal</h2>
            {pagination && <Badge variant="default">{pagination.total} Jadwal</Badge>}
          </div>
        </CardHeader>

        <CardContent>
          <DataTable<WorkerSchedule>
            columns={columns}
            data={schedules}
            loading={isLoading}
            emptyMessage="Belum ada jadwal terdaftar"
          />

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t-3 border-nb-black">
              <div className="text-sm text-nb-gray-600">
                Halaman {pagination.page} dari {pagination.totalPages} ({pagination.total} total
                jadwal)
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

      {/* Delete Confirmation Modal */}
      <Dialog
        open={deleteModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteModalOpen(false);
            setScheduleToDelete(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md" aria-labelledby="schedule-dialog-title">
          <DialogHeader>
            <DialogTitle id="schedule-dialog-title">Hapus Jadwal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-nb-gray-700">Apakah Anda yakin ingin menghapus jadwal ini?</p>
            {scheduleToDelete && (
              <div className="p-4 border-2 border-nb-black bg-nb-gray-50">
                <div className="font-semibold">{scheduleToDelete.user?.full_name}</div>
                <div className="text-sm text-nb-gray-600">
                  {scheduleToDelete.area?.name} • {scheduleToDelete.shift_definition?.name}
                </div>
                <div className="text-sm text-nb-gray-600">
                  {formatDate(scheduleToDelete.effective_date)}
                  {scheduleToDelete.end_date && ` - ${formatDate(scheduleToDelete.end_date)}`}
                </div>
              </div>
            )}
            <p className="text-sm text-nb-gray-600">Tindakan ini tidak dapat dibatalkan.</p>
          </div>
          <DialogFooter className="flex gap-3 sm:gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setDeleteModalOpen(false);
                setScheduleToDelete(null);
              }}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              loading={deleteMutation.isPending}
            >
              Hapus Jadwal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
