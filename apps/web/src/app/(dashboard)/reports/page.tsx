'use client';

import type { UserRole } from '@/types/models';
import { intlLocale } from '@/lib/i18n/date-locale';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  EmptyState,
  SkeletonTable,
  useToast,
  type ColumnDef,
  type DataTableRowAction,
  CreateButton,
} from '@/components/ui';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Download } from 'lucide-react';
import { hasRole } from '@/lib/constants/roles';

const STATUS_TONE_MAP: Record<GeneratedReportStatus, 'ok' | 'warn' | 'bad'> = {
  [GeneratedReportStatus.PROCESSING]: 'warn',
  [GeneratedReportStatus.COMPLETED]: 'ok',
  [GeneratedReportStatus.FAILED]: 'bad',
};

interface ReportsPageState {
  reportType: string;
  page: number;
  limit: number;
}

// Role gate - only REPORTING viewers
const REPORTING_VIEWERS: UserRole[] = [
  'korlap',
  'kepala_rayon',
  'admin_rayon',
  'management',
  'admin_system',
  'superadmin',
];

export default function ReportsPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [state, setState] = useState<ReportsPageState>({
    reportType: 'all',
    page: 1,
    limit: 20,
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);

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

  const handleDownload = useCallback((report: GeneratedReport) => {
    if (report.status !== GeneratedReportStatus.COMPLETED || !report.file_url) {
      toast({ level: 'warning', title: t('reports:list.messages.notReady') });
      return;
    }

    // Open presigned URL in new tab
    window.open(report.file_url, '_blank');
  }, [toast, t]);

  const handleDeleteClick = useCallback((reportId: string) => {
    setReportToDelete(reportId);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = async () => {
    if (!reportToDelete) return;

    try {
      await deleteReportMutation.mutateAsync(reportToDelete);
      toast({ level: 'success', title: t('reports:list.messages.deleteSuccess') });
      setDeleteDialogOpen(false);
      setReportToDelete(null);
    } catch {
      toast({ level: 'danger', title: t('reports:list.messages.deleteFailed') });
    }
  };

  const rowActions = useCallback(
    (report: GeneratedReport): DataTableRowAction<GeneratedReport>[] => [
      {
        key: 'download',
        label: t('reports:list.actions.download'),
        icon: Download,
        onClick: () => handleDownload(report),
        disabled: report.status !== GeneratedReportStatus.COMPLETED,
      },
      {
        key: 'delete',
        label: t('reports:list.actions.delete'),
        icon: Trash2,
        variant: 'danger',
        onClick: () => handleDeleteClick(report.id),
      },
    ],
    [handleDownload, handleDeleteClick, t]
  );

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-nb-body text-nb-gray-600">{t('common:actions.loading')}</p>
      </div>
    );
  }

  const reports = reportsData?.data || [];
  const totalPages = reportsData?.meta.totalPages || 1;

  const columns: ColumnDef<GeneratedReport>[] = [
    {
      id: 'id',
      accessorKey: 'id',
      header: t('reports:list.columnHeaders.id'),
      enableSorting: false,
      meta: { label: t('reports:list.columnHeaders.id'), defaultHidden: true, filterVariant: 'text' },
      cell: ({ row }) => (
        <span className="font-mono text-[11px] text-nb-gray-600">{row.original.id}</span>
      ),
    },
    {
      id: 'title',
      accessorKey: 'title',
      header: t('reports:list.columnHeaders.title'),
      enableSorting: true,
      meta: { label: t('reports:list.columnHeaders.title') },
      cell: ({ row }) => <span className="text-nb-body font-medium">{row.original.title}</span>,
    },
    {
      id: 'report_type',
      accessorKey: 'report_type',
      header: t('reports:list.columnHeaders.type'),
      enableSorting: true,
      meta: { label: t('reports:list.columnHeaders.type') },
      cell: ({ row }) => {
        const type = row.original.report_type as ReportType;
        return <span className="text-nb-body-sm">{t(`reports:list.typeLabels.${type}`)}</span>;
      },
    },
    {
      id: 'format',
      accessorKey: 'format',
      header: t('reports:list.columnHeaders.format'),
      enableSorting: true,
      meta: { label: t('reports:list.columnHeaders.format') },
      cell: ({ row }) => {
        const format = row.original.format as string;
        return <span className="text-nb-body-sm">{t(`reports:formats.${format}`) || format}</span>;
      },
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: t('reports:list.columnHeaders.status'),
      enableSorting: true,
      meta: { label: t('reports:list.columnHeaders.status') },
      cell: ({ row }) => {
        const status = row.original.status as GeneratedReportStatus;
        return (
          <StatusPill tone={STATUS_TONE_MAP[status]}>{t(`reports:list.statusLabels.${status}`)}</StatusPill>
        );
      },
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: t('reports:list.columnHeaders.createdAt'),
      enableSorting: true,
      meta: { label: t('reports:list.columnHeaders.createdAt') },
      cell: ({ row }) => {
        const date = new Date(row.original.created_at);
        return <span className="text-nb-body-sm">{date.toLocaleDateString(intlLocale())}</span>;
      },
    },
  ];

  // Build type options dynamically with i18n
  const reportTypeOptions = [
    { value: 'all', label: t('reports:list.typeOptions.all') },
    { value: ReportType.DAILY_OPERATIONS, label: t('reports:list.typeLabels.daily_operations') },
    { value: ReportType.WEEKLY_PERFORMANCE, label: t('reports:list.typeLabels.weekly_performance') },
    { value: ReportType.MONTHLY_SUMMARY, label: t('reports:list.typeLabels.monthly_summary') },
    { value: ReportType.WORKER_PERFORMANCE, label: t('reports:list.typeLabels.worker_performance') },
    { value: ReportType.AREA_STATUS, label: t('reports:list.typeLabels.area_status') },
    { value: ReportType.OVERTIME_UTILIZATION, label: t('reports:list.typeLabels.overtime_utilization') },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        description={
          reportsData?.meta.total
            ? t('reports:list.totalCount', { count: reportsData.meta.total })
            : undefined
        }
        actions={
          // Create-by-navigation (the builder is its own route), so the button is
          // wrapped rather than given an onClick — same shape as every other
          // create action.
          <Link href="/reports/builder">
            <CreateButton label={t('reports:list.actions.create')} />
          </Link>
        }
      />

      <Card>
        <CardContent className="space-y-4">
          <div>
            <FormSelect
              label={t('reports:list.filterTypeLabel')}
              options={reportTypeOptions}
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
              title={t('reports:list.emptyTitle')}
              description={t('reports:list.emptyDescription')}
            />
          ) : (
            <>
              <DataTable
                columns={columns}
                data={reports}
                getRowId={(r) => String(r.id)}
                enablePagination={false}
                rowActions={rowActions}
              />

              {/* Pagination */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setState((s) => ({ ...s, page: Math.max(1, s.page - 1) }))}
                  disabled={state.page === 1}
                >
                  {t('reports:list.pagination.previous')}
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
                  {t('reports:list.pagination.next')}
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
            <DialogTitle>{t('reports:dialog.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('reports:list.deleteDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              loading={deleteReportMutation.isPending}
            >
              {t('reports:list.actions.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
