/**
 * Schedules Page — SCH-1 (Phase 4-R revamp, hifi-web §07)
 * Weekly grid (default) + table toggle, week navigation, v2.1 chrome.
 * Access: admin_system, superadmin, korlap, admin_data
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/hooks';
import { useSchedules, useDeleteSchedule } from '@/lib/api/schedules';
import { WorkerSchedule } from '@/types/models';
import {
  Card,
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
  PageHeader,
  StatusPill,
  Tabs,
  type TabItem,
} from '@/components/ui';
import type { ColumnDef } from '@/components/ui/data-table';
import { ScheduleWeeklyGrid } from '@/components/schedules/ScheduleWeeklyGrid';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAreas } from '@/lib/api/areas';
import { useShiftDefinitions } from '@/lib/api/shift-definitions';
import { getErrorMessage } from '@/lib/api/client';

type ViewMode = 'grid' | 'table';

const VIEW_TABS: TabItem<ViewMode>[] = [
  { key: 'grid', label: 'Grid Mingguan' },
  { key: 'table', label: 'Tabel' },
];

const ALLOWED = ['admin_system', 'superadmin', 'korlap', 'admin_data'];

/** Monday (local) of the week containing `d`. */
function mondayOf(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = copy.getDay() || 7; // Sun → 7
  copy.setDate(copy.getDate() - (day - 1));
  return copy;
}

function ymd(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function SchedulesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [view, setView] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');
  const [shiftFilter, setShiftFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [weekStart, setWeekStart] = useState<Date>(() => mondayOf(new Date()));
  const limit = view === 'grid' ? 200 : 20;

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<WorkerSchedule | null>(null);

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    return d;
  }, [weekStart]);

  const { data: schedulesData, isLoading } = useSchedules({
    search,
    area_id: areaFilter !== 'all' ? areaFilter : undefined,
    shift_definition_id: shiftFilter !== 'all' ? shiftFilter : undefined,
    // Scope the grid to the visible week; the table keeps the broad list.
    date_from: view === 'grid' ? ymd(weekStart) : undefined,
    date_to: view === 'grid' ? ymd(weekEnd) : undefined,
    page: view === 'grid' ? 1 : page,
    limit,
  });

  const { data: areas } = useAreas({});
  const { data: shifts } = useShiftDefinitions();
  const deleteMutation = useDeleteSchedule();

  useEffect(() => {
    if (!authLoading && user && !ALLOWED.includes(user.role)) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-nb-gray-600">Memuat…</p>
      </div>
    );
  }

  if (!ALLOWED.includes(user.role)) return null;

  const schedules = schedulesData?.data || [];
  const pagination = schedulesData?.meta;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const weekLabel = `${weekStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${weekEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const shiftWeek = (n: number) => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + n * 7);
      return d;
    });
  };

  const handleDeleteConfirm = async () => {
    if (!scheduleToDelete) return;
    try {
      await deleteMutation.mutateAsync(scheduleToDelete.id);
      setDeleteModalOpen(false);
      setScheduleToDelete(null);
      toast.success('Jadwal dihapus');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const columns: ColumnDef<WorkerSchedule>[] = [
    {
      key: 'user',
      header: 'Pekerja',
      cell: (s) => (
        <div>
          <div className="font-semibold text-nb-black">{s.user?.full_name || '-'}</div>
          <div className="font-mono text-[11px] text-nb-gray-600">{s.user?.username || ''}</div>
        </div>
      ),
    },
    {
      key: 'area',
      header: 'Area',
      cell: (s) => (
        <div>
          <div className="font-medium">{s.area?.name || '-'}</div>
          <div className="font-mono text-[11px] text-nb-gray-600">{s.area?.code || ''}</div>
        </div>
      ),
    },
    {
      key: 'shift',
      header: 'Shift',
      cell: (s) => {
        const shift = s.shift_definition;
        if (!shift) return '-';
        const tone =
          shift.code === 'SHIFT2' ? 'ok' : shift.code === 'SHIFT3' ? 'info' : 'neutral';
        return (
          <div>
            <StatusPill tone={tone}>{shift.name}</StatusPill>
            <div className="mt-1 font-mono text-[11px] text-nb-gray-600">
              {shift.start_time} - {shift.end_time}
            </div>
          </div>
        );
      },
    },
    {
      key: 'effective_date',
      header: 'Tanggal Mulai',
      cell: (s) => formatDate(s.effective_date),
    },
    {
      key: 'end_date',
      header: 'Tanggal Selesai',
      cell: (s) =>
        s.end_date ? (
          formatDate(s.end_date)
        ) : (
          <span className="italic text-nb-gray-500">Berlangsung</span>
        ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      cell: (s) => (
        <div className="flex gap-2">
          <Link href={`/schedules/${s.id}/edit`}>
            <Button variant="secondary" size="sm">
              <Edit className="size-4" />
            </Button>
          </Link>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setScheduleToDelete(s);
              setDeleteModalOpen(true);
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        description="Kelola jadwal kerja per area dan shift."
        actions={
          <Link href="/schedules/new">
            <Button leftIcon={<Plus className="size-5" />}>Buat Jadwal</Button>
          </Link>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs<ViewMode>
          tabs={VIEW_TABS}
          value={view}
          onValueChange={setView}
          aria-label="Tampilan jadwal"
        />
        {view === 'grid' && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => shiftWeek(-1)}
              aria-label="Minggu sebelumnya"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="rounded-nb-base border-2 border-nb-black bg-nb-warning-light px-3 py-1 font-mono text-[11px] font-bold text-nb-black">
              {weekLabel}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => shiftWeek(1)}
              aria-label="Minggu berikutnya"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormInput
              label="Cari Pekerja"
              type="text"
              placeholder="Nama pekerja…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
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

      {view === 'grid' ? (
        <ScheduleWeeklyGrid schedules={schedules} weekStart={weekStart} loading={isLoading} />
      ) : (
        <Card>
          <CardContent className="p-4">
            <DataTable<WorkerSchedule>
              columns={columns}
              data={schedules}
              loading={isLoading}
              emptyMessage="Belum ada jadwal terdaftar"
            />
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t-2 border-nb-black pt-4">
                <div className="font-mono text-[11px] text-nb-gray-600">
                  Halaman {pagination.page} dari {pagination.totalPages} · {pagination.total} jadwal
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
              <div className="border-2 border-nb-black bg-nb-gray-50 p-4">
                <div className="font-semibold">{scheduleToDelete.user?.full_name}</div>
                <div className="text-nb-body-sm text-nb-gray-600">
                  {scheduleToDelete.area?.name} • {scheduleToDelete.shift_definition?.name}
                </div>
                <div className="text-nb-body-sm text-nb-gray-600">
                  {formatDate(scheduleToDelete.effective_date)}
                  {scheduleToDelete.end_date && ` - ${formatDate(scheduleToDelete.end_date)}`}
                </div>
              </div>
            )}
            <p className="text-nb-body-sm text-nb-gray-600">Tindakan ini tidak dapat dibatalkan.</p>
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
