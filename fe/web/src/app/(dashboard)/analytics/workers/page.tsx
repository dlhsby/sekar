'use client';

import type { UserRole } from '@/types/models';
import { useState, useMemo } from 'react';
import {
  PageHeader,
  DataTable,
  type DataTableColumn,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  SkeletonTable,
  EmptyState,
  Button,
  FormInput,
  Card,
} from '@/components/ui';
import { useUser, useRequireAuth } from '@/lib/auth/hooks';
import { useWorkerAnalytics, useWorker, type WorkerAnalytics } from '@/lib/api/analytics';
import { WorkerRankingChart } from '@/components/analytics/WorkerRankingChart';
import { X } from 'lucide-react';

const ANALYTICS_VIEWERS: UserRole[] = ['korlap', 'kepala_rayon', 'admin_data', 'top_management', 'admin_system', 'superadmin'];

type Grade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

const GRADE_COLORS: Record<Grade, string> = {
  A: 'bg-nb-success text-nb-white',
  B: 'bg-nb-primary text-nb-white',
  C: 'bg-nb-warning text-nb-black',
  D: 'bg-nb-danger-light text-nb-black',
  E: 'bg-nb-danger text-nb-white',
  F: 'bg-nb-black text-nb-white',
};

export default function WorkerAnalyticsPage() {
  useRequireAuth(ANALYTICS_VIEWERS);

  const [search, setSearch] = useState('');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: listData, isLoading: isListLoading } = useWorkerAnalytics({
    search,
    page,
    limit,
  });

  const { data: workerDetail, isLoading: isWorkerLoading } = useWorker(selectedWorkerId || '', {});

  // Chart data from list
  const chartData = useMemo(() => {
    if (!listData?.data) return [];
    return listData.data
      .slice(0, 10)
      .map((w) => ({
        name: w.full_name,
        score: w.performance_score,
      }))
      .sort((a, b) => b.score - a.score);
  }, [listData?.data]);

  // Table columns
  const columns: DataTableColumn<WorkerAnalytics>[] = [
    {
      header: 'Nama',
      key: 'full_name',
      cell: (row: WorkerAnalytics) => <span className="font-medium">{row.full_name}</span>,
    },
    {
      header: 'Hadir',
      key: 'attended',
      cell: (row: WorkerAnalytics) => `${row.attended} hari`,
    },
    {
      header: 'Tugas',
      key: 'task_completion_rate',
      cell: (row: WorkerAnalytics) => <span>{row.task_completion_rate.toFixed(1)}%</span>,
    },
    {
      header: 'Skor',
      key: 'performance_score',
      cell: (row: WorkerAnalytics) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold">{row.performance_score.toFixed(1)}</span>
          <Badge className={GRADE_COLORS[row.grade]}>{row.grade}</Badge>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Analitik Pekerja" />

      {/* Ranking Chart */}
      <WorkerRankingChart data={chartData} loading={isListLoading} />

      {/* Search */}
      <FormInput
        label="Cari pekerja"
        placeholder="Cari pekerja..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />

      {/* Table */}
      {isListLoading ? (
        <SkeletonTable rows={5} />
      ) : !listData?.data || listData.data.length === 0 ? (
        <EmptyState variant="noData" title="Tidak ada data pekerja" />
      ) : (
        <DataTable
          columns={columns}
          data={listData.data}
          onRowClick={(row) => setSelectedWorkerId(row.id)}
        />
      )}

      {/* Pagination */}
      {listData && listData.meta.total > limit && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Sebelumnya
          </Button>
          <span className="text-nb-body-sm">
            Halaman {page} dari {Math.ceil(listData.meta.total / limit)}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(listData.meta.total / limit)}
          >
            Selanjutnya
          </Button>
        </div>
      )}

      {/* Worker Detail Dialog */}
      <Dialog open={!!selectedWorkerId} onOpenChange={(open) => !open && setSelectedWorkerId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Detail Pekerja</span>
              <button onClick={() => setSelectedWorkerId(null)}>
                <X className="size-5" />
              </button>
            </DialogTitle>
          </DialogHeader>

          {isWorkerLoading ? (
            <div className="py-8 text-center text-nb-gray-600">Memuat...</div>
          ) : workerDetail ? (
            <div className="space-y-4">
              <Card className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-nb-body-sm text-nb-gray-600">Nama</span>
                  <span className="font-medium">{workerDetail.full_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-nb-body-sm text-nb-gray-600">Skor</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{workerDetail.performance_score.toFixed(1)}</span>
                    <Badge className={GRADE_COLORS[workerDetail.grade]}>
                      {workerDetail.grade}
                    </Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-nb-body-sm text-nb-gray-600">Kehadiran</span>
                  <span className="font-medium">{workerDetail.attended} hari</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-nb-body-sm text-nb-gray-600">Lembur</span>
                  <span className="font-medium">{workerDetail.overtime_hours.toFixed(1)} jam</span>
                </div>
              </Card>

              <Card className="p-4 space-y-3">
                <h4 className="font-semibold text-nb-h3">Metrik Tugas</h4>
                <div className="flex justify-between items-center">
                  <span className="text-nb-body-sm text-nb-gray-600">Total Tugas</span>
                  <span className="font-medium">{workerDetail.total_tasks}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-nb-body-sm text-nb-gray-600">Diselesaikan</span>
                  <span className="font-medium">{workerDetail.completed_tasks}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-nb-body-sm text-nb-gray-600">Tingkat Penyelesaian</span>
                  <span className="font-medium">{workerDetail.task_completion_rate.toFixed(1)}%</span>
                </div>
              </Card>

              <Card className="p-4 space-y-3">
                <h4 className="font-semibold text-nb-h3">Metrik Aktivitas</h4>
                <div className="flex justify-between items-center">
                  <span className="text-nb-body-sm text-nb-gray-600">Total Aktivitas</span>
                  <span className="font-medium">{workerDetail.total_activities}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-nb-body-sm text-nb-gray-600">Disetujui</span>
                  <span className="font-medium">{workerDetail.approved_activities}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-nb-body-sm text-nb-gray-600">Tingkat Persetujuan</span>
                  <span className="font-medium">{workerDetail.activity_approval_rate.toFixed(1)}%</span>
                </div>
              </Card>

              <Card className="p-4 space-y-3">
                <h4 className="font-semibold text-nb-h3">Metrik Lokasi</h4>
                <div className="flex justify-between items-center">
                  <span className="text-nb-body-sm text-nb-gray-600">Compliance Area</span>
                  <span className="font-medium">{workerDetail.area_compliance.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-nb-body-sm text-nb-gray-600">GPS Dalam Area</span>
                  <span className="font-medium">{workerDetail.within_area_pings}</span>
                </div>
              </Card>
            </div>
          ) : (
            <EmptyState variant="error" title="Gagal memuat detail" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
