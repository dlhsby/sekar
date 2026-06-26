'use client';

import type { UserRole } from '@/types/models';
import { useAuth } from '@/lib/auth/hooks';
import {
  useReports,
  ReportType,
  GeneratedReportStatus,
  type GeneratedReport,
  type ReportFilters,
} from '@/lib/api/reports';
import { useDeleteReport } from '@/lib/api/reports';
import {
  Card,
  CardContent,
  DataTable,
  FormSelect,
  Button,
  PageHeader,
  StatusPill,
  Tabs,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  EmptyState,
  SkeletonTable,
  useToast,
  type TabItem,
  type ColumnDef,
} from '@/components/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Download } from 'lucide-react';
import { hasRole } from '@/lib/constants/roles';

const REPORT_TYPE_OPTIONS = [
  { value: 'all', label: 'Semua Tipe' },
  { value: ReportType.DAILY_OPERATIONS, label: 'Laporan Harian' },
  { value: ReportType.WEEKLY_PERFORMANCE, label: 'Laporan Mingguan' },
  { value: ReportType.MONTHLY_SUMMARY, label: 'Laporan Bulanan' },
  { value: ReportType.WORKER_PERFORMANCE, label: 'Kinerja Pekerja' },
  { value: ReportType.AREA_STATUS, label: 'Status Area' },
  { value: ReportType.OVERTIME_UTILIZATION, label: 'Penggunaan Lembur' },
];

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  [ReportType.DAILY_OPERATIONS]: 'Laporan Harian',
  [ReportType.WEEKLY_PERFORMANCE]: 'Laporan Mingguan',
  [ReportType.MONTHLY_SUMMARY]: 'Laporan Bulanan',
  [ReportType.WORKER_PERFORMANCE]: 'Kinerja Pekerja',
  [ReportType.AREA_STATUS]: 'Status Area',
  [ReportType.OVERTIME_UTILIZATION]: 'Penggunaan Lembur',
};

const REPORT_FORMAT_LABELS: Record<string, string> = {
  pdf: 'PDF',
  csv: 'CSV',
  xlsx: 'Excel',
};

const STATUS_TONE_MAP: Record<GeneratedReportStatus, 'ok' | 'warn' | 'bad'> = {
  [GeneratedReportStatus.PROCESSING]: 'warn',
  [GeneratedReportStatus.COMPLETED]: 'ok',
  [GeneratedReportStatus.FAILED]: 'bad',
};

const STATUS_LABELS: Record<GeneratedReportStatus, string> = {
  [GeneratedReportStatus.PROCESSING]: 'Memproses',
  [GeneratedReportStatus.COMPLETED]: 'Selesai',
  [GeneratedReportStatus.FAILED]: 'Gagal',
};

interface ReportsPageState {
  reportType: string;
  page: number;
  limit: number;
}

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [state, setState] = useState<ReportsPageState>({
    reportType: 'all',
    page: 1,
    limit: 20,
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);

  // Role gate - only REPORTING viewers
  const REPORTING_VIEWERS: UserRole[] = [
    'korlap',
    'kepala_rayon',
    'admin_data',
    'top_management',
    'admin_system',
    'superadmin',
  ];

  useEffect(() => {
    if (!authLoading && user && !hasRole(user.role, REPORTING_VIEWERS)) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const filters: ReportFilters = {
    report_type: state.reportType !== 'all' ? (state.reportType as ReportType) : undefined,
    page: state.page,
    limit: state.limit,
  };

  const { data: reportsData, isLoading, error, refetch } = useReports(filters);
  const deleteReportMutation = useDeleteReport();

  // Auto-refetch while processing
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (
      reportsData?.data &&
      reportsData.data.some((r) => r.status === GeneratedReportStatus.PROCESSING)
    ) {
      interval = setInterval(() => {
        refetch();
      }, 3000); // Poll every 3 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [reportsData?.data, refetch]);

  const handleDownload = (report: GeneratedReport) => {
    if (report.status !== GeneratedReportStatus.COMPLETED || !report.file_url) {
      toast({ level: 'warning', title: 'Laporan belum siap untuk diunduh' });
      return;
    }

    // Open presigned URL in new tab
    window.open(report.file_url, '_blank');
  };

  const handleDeleteClick = (reportId: string) => {
    setReportToDelete(reportId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!reportToDelete) return;

    try {
      await deleteReportMutation.mutateAsync(reportToDelete);
      toast({ level: 'success', title: 'Laporan dihapus' });
      setDeleteDialogOpen(false);
      setReportToDelete(null);
    } catch (err) {
      toast({ level: 'danger', title: 'Gagal menghapus laporan' });
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-nb-body text-nb-gray-600">Memuat…</p>
      </div>
    );
  }

  const reports = reportsData?.data || [];
  const totalPages = reportsData?.meta.totalPages || 1;

  const columns: ColumnDef<GeneratedReport>[] = [
    {
      id: 'title',
      accessorKey: 'title',
      header: 'Judul',
      enableSorting: true,
      meta: { label: 'Judul' },
      cell: ({ row }) => <span className="text-nb-body font-medium">{row.original.title}</span>,
    },
    {
      id: 'report_type',
      accessorKey: 'report_type',
      header: 'Tipe',
      enableSorting: true,
      meta: { label: 'Tipe' },
      cell: ({ row }) => {
        const type = row.original.report_type as ReportType;
        return <span className="text-nb-body-sm">{REPORT_TYPE_LABELS[type]}</span>;
      },
    },
    {
      id: 'format',
      accessorKey: 'format',
      header: 'Format',
      enableSorting: true,
      meta: { label: 'Format' },
      cell: ({ row }) => {
        const format = row.original.format as string;
        return <span className="text-nb-body-sm">{REPORT_FORMAT_LABELS[format] || format}</span>;
      },
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      enableSorting: true,
      meta: { label: 'Status' },
      cell: ({ row }) => {
        const status = row.original.status as GeneratedReportStatus;
        return (
          <StatusPill tone={STATUS_TONE_MAP[status]}>{STATUS_LABELS[status]}</StatusPill>
        );
      },
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: 'Dibuat',
      enableSorting: true,
      meta: { label: 'Dibuat' },
      cell: ({ row }) => {
        const date = new Date(row.original.created_at);
        return <span className="text-nb-body-sm">{date.toLocaleDateString('id-ID')}</span>;
      },
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Aksi', pinRight: true },
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDownload(row.original)}
            disabled={row.original.status !== GeneratedReportStatus.COMPLETED}
            title={
              row.original.status !== GeneratedReportStatus.COMPLETED
                ? 'Laporan belum selesai'
                : 'Unduh laporan'
            }
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteClick(row.original.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan"
        description="Lihat dan kelola laporan yang dihasilkan"
        actions={
          <Link href="/reports/builder">
            <Button leftIcon={<Plus className="h-4 w-4" />}>Buat Laporan</Button>
          </Link>
        }
      />

      <Card>
        <CardContent className="space-y-4">
          <div>
            <FormSelect
              label="Tipe Laporan"
              options={REPORT_TYPE_OPTIONS}
              value={state.reportType}
              onChange={(value) =>
                setState((s) => ({ ...s, reportType: value, page: 1 }))
              }
            />
          </div>

          {isLoading ? (
            <SkeletonTable rows={5} />
          ) : error ? (
            <EmptyState variant="error" />
          ) : reports.length === 0 ? (
            <EmptyState
              variant="noData"
              title="Tidak ada laporan"
              description="Mulai buat laporan baru untuk melihatnya di sini"
            />
          ) : (
            <>
              <DataTable
                columns={columns}
                data={reports}
                getRowId={(r) => String(r.id)}
                enablePagination={false}
              />

              {/* Pagination */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setState((s) => ({ ...s, page: Math.max(1, s.page - 1) }))}
                  disabled={state.page === 1}
                >
                  ← Sebelumnya
                </Button>
                <span className="text-nb-body-sm">
                  {state.page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setState((s) => ({ ...s, page: Math.min(totalPages, s.page + 1) }))}
                  disabled={state.page === totalPages}
                >
                  Berikutnya →
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Laporan?</DialogTitle>
            <DialogDescription>
              Tindakan ini tidak dapat dibatalkan. Laporan akan dihapus secara permanen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              loading={deleteReportMutation.isPending}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
