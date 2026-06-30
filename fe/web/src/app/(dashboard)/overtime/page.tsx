/**
 * Overtime List Page (Phase 2C - NEW)
 * Access: MONITORING_ROLES
 */

'use client';

import { useAuth } from '@/lib/auth/hooks';
import { useOvertimes, useApproveOvertime, useRejectOvertime } from '@/lib/api/overtime';
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
        label: 'Lihat',
        icon: Eye,
        onClick: () => {
          view.openWith(row);
        },
      },
      {
        key: 'approve',
        label: 'Setujui',
        icon: Check,
        disabled: approveMutation.isPending,
        hidden: !canApprove || row.status !== 'pending',
        onClick: () => handleApprove(row.id),
      },
      {
        key: 'reject',
        label: 'Tolak',
        icon: X,
        hidden: !canApprove || row.status !== 'pending',
        onClick: () => setRejectingId(row.id),
      },
    ],
    [canApprove, approveMutation.isPending, handleApprove, view]
  );

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

  if (!hasRole(user.role, MONITORING_ROLES)) return null;

  const overtimes = overtimeData?.data || [];
  const pagination = overtimeData?.meta;

  const statusTabs: TabItem<OvertimeStatus | 'all'>[] = [
    { key: 'all', label: 'Semua' },
    { key: 'pending', label: 'Menunggu' },
    { key: 'approved', label: 'Disetujui' },
    { key: 'rejected', label: 'Ditolak' },
  ];

  const statusTone: Record<OvertimeStatus, 'ok' | 'warn' | 'bad'> = {
    pending: 'warn',
    approved: 'ok',
    rejected: 'bad',
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString('id-ID'),
      time: d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const columns: ColumnDef<Overtime>[] = [
    {
      id: 'id',
      accessorKey: 'id',
      header: 'ID',
      enableSorting: false,
      meta: { label: 'ID', defaultHidden: true, filterVariant: 'text' },
      cell: ({ row }) => (
        <span className="font-mono text-[11px] text-nb-gray-600">{row.original.id}</span>
      ),
    },
    {
      id: 'date',
      header: 'Tanggal',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Tanggal' },
      cell: ({ row }) => <div className="text-sm">{formatDateTime(row.original.start_datetime).date}</div>,
    },
    {
      id: 'user',
      header: 'Pengguna',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Pengguna' },
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-nb-black">{row.original.user?.full_name || '-'}</div>
          <div className="text-xs text-nb-gray-600">{row.original.user?.username || ''}</div>
        </div>
      ),
    },
    {
      id: 'area',
      header: 'Area',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Area' },
      cell: ({ row }) => <div className="text-sm">{row.original.area?.name || '-'}</div>,
    },
    {
      id: 'time',
      header: 'Waktu',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Waktu' },
      cell: ({ row }) => (
        <div className="text-sm font-mono">
          {formatDateTime(row.original.start_datetime).time} - {formatDateTime(row.original.end_datetime).time}
        </div>
      ),
    },
    {
      id: 'activity_type',
      header: 'Tipe Aktivitas',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Tipe Aktivitas' },
      cell: ({ row }) => <div className="text-sm">{row.original.activity_type?.name || '-'}</div>,
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Status' },
      cell: ({ row }) => (
        <StatusPill tone={statusTone[row.original.status]} dot>
          {OVERTIME_STATUS_LABELS[row.original.status]}
        </StatusPill>
      ),
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: 'Dibuat',
      enableSorting: false,
      meta: { label: 'Dibuat', defaultHidden: true, filterVariant: 'date' },
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
      <PageHeader description="Kelola permintaan lembur" />

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
            <Field label="Rentang Tanggal">
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
              Reset Filter
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Reject Reason Dialog */}
      {rejectingId && (
        <Card variant="elevated">
          <CardContent>
            <div className="space-y-3">
              <h3 className="font-bold text-nb-black">Alasan Penolakan</h3>
              <FormInput
                label="Alasan"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Masukkan alasan penolakan..."
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleReject(rejectingId)}
                  disabled={!rejectReason.trim() || rejectMutation.isPending}
                >
                  Tolak Lembur
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setRejectingId(null);
                    setRejectReason('');
                  }}
                >
                  Batal
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-nb-black">Daftar Lembur</h2>
            <div className="text-sm text-nb-gray-600">{pagination?.total || 0} total</div>
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
            emptyTitle="Tidak ada permintaan lembur"
          />

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t-3 border-nb-black">
              <div className="text-sm text-nb-gray-600">
                Halaman {pagination.page} dari {pagination.totalPages}
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

      <DetailModal
        open={view.open}
        onOpenChange={view.onOpenChange}
        title="Detail Lembur"
        rows={view.item ? [
          { label: 'Tanggal', value: formatDateTime(view.item.start_datetime).date },
          { label: 'Pengguna', value: view.item.user?.full_name },
          { label: 'Area', value: view.item.area?.name },
          {
            label: 'Waktu',
            value: `${formatDateTime(view.item.start_datetime).time} - ${formatDateTime(view.item.end_datetime).time}`,
          },
          { label: 'Tipe Aktivitas', value: view.item.activity_type?.name },
          {
            label: 'Status',
            value: (
              <StatusPill tone={statusTone[view.item.status]} dot>
                {OVERTIME_STATUS_LABELS[view.item.status]}
              </StatusPill>
            ),
          },
          { label: 'Catatan', value: view.item.notes },
          { label: 'Dibuat', value: formatDate(view.item.created_at) },
        ] : []}
      />
    </div>
  );
}
