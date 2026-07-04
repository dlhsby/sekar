'use client';

import type { UserRole } from '@/types/models';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PageHeader,
  DataTable,
  type ColumnDef,
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
  const { t } = useTranslation(['analytics', 'common']);
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
    const rows = listData?.data ?? [];
    return rows
      .slice(0, 10)
      .map((w) => ({
        name: w.full_name,
        score: w.performance_score,
      }))
      .sort((a, b) => b.score - a.score);
  }, [listData?.data]);

  // Table columns
  const columns = useMemo<ColumnDef<WorkerAnalytics>[]>(() => [
    {
      id: 'full_name',
      accessorKey: 'full_name',
      header: t('workers.table.name'),
      enableSorting: false,
      meta: { label: t('workers.table.name') },
      cell: ({ row }) => <span className="font-medium">{row.original.full_name}</span>,
    },
    {
      id: 'attended',
      accessorKey: 'attended',
      header: t('workers.table.attended'),
      enableSorting: false,
      meta: { label: t('workers.table.attended') },
      cell: ({ row }) => `${row.original.attended} ${t('workers.table.attendedUnit')}`,
    },
    {
      id: 'task_completion_rate',
      accessorKey: 'task_completion_rate',
      header: t('workers.table.taskCompletion'),
      enableSorting: false,
      meta: { label: t('workers.table.taskCompletion') },
      cell: ({ row }) => <span>{row.original.task_completion_rate.toFixed(1)}%</span>,
    },
    {
      id: 'performance_score',
      accessorKey: 'performance_score',
      header: t('workers.table.score'),
      enableSorting: false,
      meta: { label: t('workers.table.score') },
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold">{row.original.performance_score.toFixed(1)}</span>
          <Badge className={GRADE_COLORS[row.original.grade]}>{row.original.grade}</Badge>
        </div>
      ),
    },
  ], [t]);

  return (
    <div className="space-y-6">
      <PageHeader
        description={
          listData?.meta.total
            ? t('workers.page.totalCount', { count: listData.meta.total })
            : undefined
        }
      />

      {/* Ranking Chart */}
      <WorkerRankingChart data={chartData} loading={isListLoading} />

      {/* Search */}
      <FormInput
        label={t('workers.search.label')}
        placeholder={t('workers.search.placeholder')}
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
        <EmptyState variant="noData" title={t('workers.empty.noData')} />
      ) : (
        <DataTable
          columns={columns}
          data={listData.data}
          enablePagination={false}
          getRowId={(w) => w.id}
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
            {t('workers.pagination.previous')}
          </Button>
          <span className="text-nb-body-sm">
            {t('workers.pagination.page', { page, total: Math.ceil(listData.meta.total / limit) })}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(listData.meta.total / limit)}
          >
            {t('workers.pagination.next')}
          </Button>
        </div>
      )}

      {/* Worker Detail Dialog */}
      <Dialog open={!!selectedWorkerId} onOpenChange={(open) => !open && setSelectedWorkerId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{t('workers.detail.title')}</span>
              <button onClick={() => setSelectedWorkerId(null)}>
                <X className="size-5" />
              </button>
            </DialogTitle>
          </DialogHeader>

          {isWorkerLoading ? (
            <div className="py-8 text-center text-nb-gray-600">{t('common:actions.loading')}</div>
          ) : workerDetail ? (
            <div className="space-y-4">
              <Card className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-nb-body-sm text-nb-gray-600">{t('workers.detail.name')}</span>
                  <span className="font-medium">{workerDetail.full_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-nb-body-sm text-nb-gray-600">{t('workers.detail.score')}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{workerDetail.performance_score.toFixed(1)}</span>
                    <Badge className={GRADE_COLORS[workerDetail.grade]}>
                      {workerDetail.grade}
                    </Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-nb-body-sm text-nb-gray-600">{t('workers.detail.attendance')}</span>
                  <span className="font-medium">{workerDetail.attended} {t('workers.table.attendedUnit')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-nb-body-sm text-nb-gray-600">{t('workers.detail.overtime')}</span>
                  <span className="font-medium">{workerDetail.overtime_hours.toFixed(1)} {t('workers.detail.overtimeUnit')}</span>
                </div>
              </Card>

              <Card className="p-4 space-y-3">
                <h4 className="font-semibold text-nb-h3">{t('workers.detail.taskMetrics.title')}</h4>
                <div className="flex justify-between items-center">
                  <span className="text-nb-body-sm text-nb-gray-600">{t('workers.detail.taskMetrics.total')}</span>
                  <span className="font-medium">{workerDetail.total_tasks}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-nb-body-sm text-nb-gray-600">{t('workers.detail.taskMetrics.completed')}</span>
                  <span className="font-medium">{workerDetail.completed_tasks}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-nb-body-sm text-nb-gray-600">{t('workers.detail.taskMetrics.completionRate')}</span>
                  <span className="font-medium">{workerDetail.task_completion_rate.toFixed(1)}%</span>
                </div>
              </Card>

              <Card className="p-4 space-y-3">
                <h4 className="font-semibold text-nb-h3">{t('workers.detail.activityMetrics.title')}</h4>
                <div className="flex justify-between items-center">
                  <span className="text-nb-body-sm text-nb-gray-600">{t('workers.detail.activityMetrics.total')}</span>
                  <span className="font-medium">{workerDetail.total_activities}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-nb-body-sm text-nb-gray-600">{t('workers.detail.activityMetrics.approved')}</span>
                  <span className="font-medium">{workerDetail.approved_activities}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-nb-body-sm text-nb-gray-600">{t('workers.detail.activityMetrics.approvalRate')}</span>
                  <span className="font-medium">{workerDetail.activity_approval_rate.toFixed(1)}%</span>
                </div>
              </Card>

              <Card className="p-4 space-y-3">
                <h4 className="font-semibold text-nb-h3">{t('workers.detail.locationMetrics.title')}</h4>
                <div className="flex justify-between items-center">
                  <span className="text-nb-body-sm text-nb-gray-600">{t('workers.detail.locationMetrics.areaCompliance')}</span>
                  <span className="font-medium">{workerDetail.area_compliance.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-nb-body-sm text-nb-gray-600">{t('workers.detail.locationMetrics.gpsInArea')}</span>
                  <span className="font-medium">{workerDetail.within_area_pings}</span>
                </div>
              </Card>
            </div>
          ) : (
            <EmptyState variant="error" title={t('workers.detail.error')} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
