/**
 * Overtime List Page (Phase 2C - NEW)
 * Access: MONITORING_ROLES
 */

'use client';

import { useAuth } from '@/lib/auth/hooks';
import { intlLocale } from '@/lib/i18n/date-locale';
import { useOvertimes, useApproveOvertime, useRejectOvertime } from '@/lib/api/overtime';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardHeader,
  CardContent,
  DataTable,
  FormInput,
  Button,
  PageHeader,
  StatusPill,
  Tabs,
  DetailModal,
  type TabItem,
  Field,
  DateRangePicker,
  type DataTableRowAction,
} from '@/components/ui';
import type { ColumnDef } from '@/components/ui/data-table';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Check, X, Eye } from 'lucide-react';
import type { Overtime, OvertimeStatus } from '@/types/models';
import { MONITORING_ROLES, OVERTIME_APPROVER_ROLES, hasRole } from '@/lib/constants/roles';
import { OVERTIME_STATUS_LABELS } from '@/lib/constants/overtime';
import { formatDate } from '@/lib/utils/time';
import { useViewModal } from '@/lib/hooks/use-view-modal';

/**
 * Type guard for overtime status filter values
 */
const isValidOvertimeStatus = (value: string): value is OvertimeStatus | 'all' => {
  return ['all', 'pending', 'approved', 'rejected'].includes(value);
};

export default function OvertimePage() {
  const { t } = useTranslation(['overtime', 'common', 'status']);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<OvertimeStatus | 'all'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const view = useViewModal<Overtime>();
  const limit = 20;

  const approveMutation = useApproveOvertime();
  const rejectMutation = useRejectOvertime();

  useEffect(() => {
    if (!authLoading && user && !hasRole(user.role, MONITORING_ROLES)) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const { data: overtimeData, isLoading } = useOvertimes({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
    page,
    limit,
  });

  const canApprove = user ? hasRole(user.role, OVERTIME_APPROVER_ROLES) : false;

  const handleApprove = useCallback(async (id: string) => {
    await approveMutation.mutateAsync(id);
  }, [approveMutation]);

  const handleReject = useCallback(async (id: string) => {
    if (!rejectReason.trim()) return;
    await rejectMutation.mutateAsync({ id, reason: rejectReason });
    setRejectingId(null);
    setRejectReason('');
  }, [rejectReason, rejectMutation]);

  const rowActions = useCallback(
    (row: Overtime): DataTableRowAction<Overtime>[] => [
      {
        key: 'view',
        label: t('common:actions.view'),
        icon: Eye,
        onClick: () => {
          view.openWith(row);
        },
      },
      {
        key: 'approve',
        label: t('common:actions.approve'),
        icon: Check,
        disabled: approveMutation.isPending,
        hidden: !canApprove || row.status !== 'pending',
        onClick: () => handleApprove(row.id),
      },
      {
        key: 'reject',
        label: t('common:actions.reject'),
        icon: X,
        hidden: !canApprove || row.status !== 'pending',
        onClick: () => setRejectingId(row.id),
      },
    ],
    [canApprove, approveMutation.isPending, handleApprove, view, t]
  );

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-nb-primary mx-auto mb-4"></div>
          <p className="text-nb-gray-600">{t('common:actions.loading')}</p>
        </div>
      </div>
    );
  }

  if (!hasRole(user.role, MONITORING_ROLES)) return null;

  const overtimes = overtimeData?.data || [];
  const pagination = overtimeData?.meta;

  const statusTabs: TabItem<OvertimeStatus | 'all'>[] = [
    { key: 'all', label: t('overtime:list.tabs.all') },
    { key: 'pending', label: t('status:pending') },
    { key: 'approved', label: t('status:approved') },
    { key: 'rejected', label: t('status:rejected') },
  ];

  const statusTone: Record<OvertimeStatus, 'ok' | 'warn' | 'bad'> = {
    pending: 'warn',
    approved: 'ok',
    rejected: 'bad',
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString(intlLocale()),
      time: d.toLocaleTimeString(intlLocale(), { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const columns: ColumnDef<Overtime>[] = [
    {
      id: 'id',
      accessorKey: 'id',
      header: t('overtime:list.table.columns.id'),
      enableSorting: false,
      meta: { label: t('overtime:list.table.columns.id'), defaultHidden: true, filterVariant: 'text' },
      cell: ({ row }) => (
        <span className="font-mono text-[11px] text-nb-gray-600">{row.original.id}</span>
      ),
    },
    {
      id: 'date',
      header: t('overtime:list.table.columns.date'),
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: t('overtime:list.table.columns.date') },
      cell: ({ row }) => <div className="text-sm">{formatDateTime(row.original.start_datetime).date}</div>,
    },
    {
      id: 'user',
      header: t('overtime:list.table.columns.user'),
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: t('overtime:list.table.columns.user') },
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-nb-black">{row.original.user?.full_name || '-'}</div>
          <div className="text-xs text-nb-gray-600">{row.original.user?.username || ''}</div>
        </div>
      ),
    },
    {
      id: 'area',
      header: t('overtime:list.table.columns.area'),
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: t('overtime:list.table.columns.area') },
      cell: ({ row }) => <div className="text-sm">{row.original.area?.name || '-'}</div>,
    },
    {
      id: 'time',
      header: t('overtime:list.table.columns.time'),
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: t('overtime:list.table.columns.time') },
      cell: ({ row }) => (
        <div className="text-sm font-mono">
          {formatDateTime(row.original.start_datetime).time} - {formatDateTime(row.original.end_datetime).time}
        </div>
      ),
    },
    {
      id: 'activity_type',
      header: t('overtime:list.table.columns.activityType'),
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: t('overtime:list.table.columns.activityType') },
      cell: ({ row }) => <div className="text-sm">{row.original.activity_type?.name || '-'}</div>,
    },
    {
      id: 'status',
      header: t('overtime:list.table.columns.status'),
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: t('overtime:list.table.columns.status') },
      cell: ({ row }) => (
        <StatusPill tone={statusTone[row.original.status]} dot>
          {OVERTIME_STATUS_LABELS[row.original.status]}
        </StatusPill>
      ),
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: t('overtime:list.table.columns.createdAt'),
      enableSorting: false,
      meta: { label: t('overtime:list.table.columns.createdAt'), defaultHidden: true, filterVariant: 'date' },
      cell: ({ row }) => (
        <span className="text-nb-body-sm text-nb-gray-600">
          {formatDate(row.original.created_at)}
        </span>
      ),
    },
  ];

  const hasActiveFilters = statusFilter !== 'all' || fromDate || toDate;

  return (
    <div className="space-y-5">
      <PageHeader description={t('overtime:list.description')} />

      {/* Three-tab approval queue */}
      <Tabs
        tabs={statusTabs}
        value={statusFilter}
        onValueChange={(key) => {
          if (isValidOvertimeStatus(key)) {
            setStatusFilter(key);
            setPage(1);
          }
        }}
        aria-label="Filter status lembur"
      />

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label={t('overtime:list.filters.dateRange')}>
              {() => (
                <DateRangePicker
                  showSteppers={false}
                  value={{
                    from: fromDate || new Date().toISOString().slice(0, 10),
                    to: toDate || new Date().toISOString().slice(0, 10),
                  }}
                  onChange={(r) => {
                    setFromDate(r.from);
                    setToDate(r.to);
                    setPage(1);
                  }}
                />
              )}
            </Field>
          </div>

          {hasActiveFilters && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setStatusFilter('all');
                setFromDate('');
                setToDate('');
                setPage(1);
              }}
              className="mt-4"
            >
              {t('common:actions.reset')} {t('common:actions.filter')}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Reject Reason Dialog */}
      {rejectingId && (
        <Card variant="elevated">
          <CardContent>
            <div className="space-y-3">
              <h3 className="font-bold text-nb-black">{t('overtime:list.actions.rejectDialog')}</h3>
              <FormInput
                label={t('overtime:list.actions.reasonLabel')}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t('overtime:list.actions.reasonPlaceholder')}
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleReject(rejectingId)}
                  disabled={!rejectReason.trim() || rejectMutation.isPending}
                >
                  {t('overtime:list.actions.rejectButton')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setRejectingId(null);
                    setRejectReason('');
                  }}
                >
                  {t('common:actions.cancel')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-nb-black">{t('overtime:list.table.title')}</h2>
            <div className="text-sm text-nb-gray-600">{pagination?.total || 0} {t('overtime:list.pagination.total')}</div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable<Overtime, unknown>
            columns={columns}
            data={overtimes}
            loading={isLoading}
            enablePagination={false}
            getRowId={(r) => r.id}
            rowActions={rowActions}
            emptyTitle={t('overtime:list.empty.noRequests')}
          />

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t-3 border-nb-black">
              <div className="text-sm text-nb-gray-600">
                {t('overtime:list.pagination.page', {
                  page: pagination.page,
                  totalPages: pagination.totalPages,
                })}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page === 1}
                  leftIcon={<ChevronLeft className="w-4 h-4" />}
                >
                  {t('overtime:list.pagination.previous')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page === pagination.totalPages}
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                >
                  {t('overtime:list.pagination.next')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <DetailModal
        open={view.open}
        onOpenChange={view.onOpenChange}
        title={t('overtime:list.actions.viewModal')}
        rows={view.item ? [
          { label: t('overtime:detail.fields.date'), value: formatDateTime(view.item.start_datetime).date },
          { label: t('overtime:detail.fields.user'), value: view.item.user?.full_name },
          { label: t('overtime:detail.fields.area'), value: view.item.area?.name },
          {
            label: t('overtime:detail.fields.time'),
            value: `${formatDateTime(view.item.start_datetime).time} - ${formatDateTime(view.item.end_datetime).time}`,
          },
          { label: t('overtime:detail.fields.activityType'), value: view.item.activity_type?.name },
          {
            label: t('overtime:detail.fields.status'),
            value: (
              <StatusPill tone={statusTone[view.item.status]} dot>
                {OVERTIME_STATUS_LABELS[view.item.status]}
              </StatusPill>
            ),
          },
          { label: t('overtime:detail.fields.notes'), value: view.item.notes },
          { label: t('overtime:list.table.columns.createdAt'), value: formatDate(view.item.created_at) },
        ] : []}
      />
    </div>
  );
}
