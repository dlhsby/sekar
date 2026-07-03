/**
 * Pruning Requests dashboard list page (Phase 3 — admin disposition)
 *
 * Lets admin / admin_data / kepala_rayon / top_management triage kecamatan
 * pruning requests from the desktop instead of the mobile app. Mirrors the
 * mobile ReviewQueueScreen but with a paginated table + status filter.
 */

'use client';

import type { DetailModalRow } from '@/components/ui';
import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  DataTable,
  FormSelect,
  PageHeader,
  StatusPill,
  DetailModal,
  type ColumnDef,
  type DataTableRowAction,
} from '@/components/ui';
import { useAuth } from '@/lib/auth/hooks';
import { hasRole } from '@/lib/constants/roles';
import { formatDate } from '@/lib/utils/time';
import { useViewModal } from '@/lib/hooks/use-view-modal';
import type { UserRole } from '@/types/models';
import { useTranslation } from 'react-i18next';
import {
  PRUNING_REQUEST_ADMIN_ROLES,
  PRUNING_REQUEST_STATUS_LABELS,
  PRUNING_REQUEST_STATUS_TONES,
} from '@/lib/constants/pruning-requests';
import {
  usePruningRequests,
  type PruningRequest,
  type PruningRequestStatus,
} from '@/lib/api/pruning-requests';

const STATUS_FILTER_OPTIONS: Array<{ label: string; value: PruningRequestStatus | 'all' }> = [
  { label: 'Semua Status', value: 'all' },
  { label: 'Terkirim', value: 'submitted' },
  { label: 'Sedang Ditinjau', value: 'under_review' },
  { label: 'Disetujui', value: 'approved' },
  { label: 'Ditolak', value: 'rejected' },
  { label: 'Ditugaskan', value: 'assigned' },
  { label: 'Sedang Dikerjakan', value: 'in_progress' },
  { label: 'Selesai', value: 'done' },
  { label: 'Dibatalkan', value: 'cancelled' },
];

export default function PruningRequestsPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<PruningRequestStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const view = useViewModal<PruningRequest>();
  const limit = 20;

  useEffect(() => {
    if (!authLoading && user && !hasRole(user.role, [...PRUNING_REQUEST_ADMIN_ROLES] as UserRole[])) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const filters = {
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    limit,
  };
  const { data, isLoading, isError } = usePruningRequests(filters);

  const columns = useMemo<ColumnDef<PruningRequest>[]>(
    () => [
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
        id: 'referenceCode',
        header: 'Kode Referensi',
        enableSorting: false,
        enableColumnFilter: false,
        meta: { label: 'Kode Referensi' },
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.referenceCode}</span>,
      },
      {
        id: 'submitter',
        header: 'Kecamatan',
        enableSorting: false,
        enableColumnFilter: false,
        meta: { label: 'Kecamatan' },
        cell: ({ row }) => (
          <div className="text-sm">
            <div className="font-semibold">{row.original.kecamatanName ?? '-'}</div>
            <div className="text-nb-gray-600">{row.original.submitter?.full_name ?? '-'}</div>
          </div>
        ),
      },
      {
        id: 'rayon',
        header: 'Rayon',
        enableSorting: false,
        enableColumnFilter: false,
        meta: { label: 'Rayon' },
        cell: ({ row }) => <div className="text-sm">{row.original.rayon?.name ?? '-'}</div>,
      },
      {
        id: 'expected',
        header: 'Minggu / Tanggal',
        enableSorting: false,
        enableColumnFilter: false,
        meta: { label: 'Minggu / Tanggal' },
        cell: ({ row }) => (
          <div className="text-sm">
            {row.original.expectedDate ? (
              <>{new Date(row.original.expectedDate).toLocaleDateString('id-ID')}</>
            ) : row.original.expectedYear && row.original.expectedIsoWeek ? (
              <>
                W{row.original.expectedIsoWeek}/{row.original.expectedYear}
              </>
            ) : (
              '-'
            )}
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        enableSorting: false,
        enableColumnFilter: false,
        meta: { label: 'Status' },
        cell: ({ row }) => (
          <StatusPill tone={PRUNING_REQUEST_STATUS_TONES[row.original.status]} dot>
            {PRUNING_REQUEST_STATUS_LABELS[row.original.status]}
          </StatusPill>
        ),
      },
      {
        id: 'created_at',
        accessorKey: 'createdAt',
        header: 'Dibuat',
        enableSorting: false,
        meta: { label: 'Dibuat', defaultHidden: true, filterVariant: 'date' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: 'updated_at',
        accessorKey: 'updatedAt',
        header: 'Diperbarui',
        enableSorting: false,
        meta: { label: 'Diperbarui', defaultHidden: true, filterVariant: 'date' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {formatDate(row.original.updatedAt)}
          </span>
        ),
      },
    ],
    []
  );

  const rowActions = useCallback(
    (row: PruningRequest): DataTableRowAction<PruningRequest>[] => [
      {
        key: 'view',
        label: 'Lihat',
        icon: Eye,
        onClick: () => {
          view.openWith(row);
        },
      },
    ],
    [view]
  );

  const handleStatusChange = (val: string) => {
    setStatusFilter(val as PruningRequestStatus | 'all');
    setPage(1);
  };

  const totalPages = data?.meta?.totalPages ?? 1;

  return (
    <div className="space-y-5">
      <PageHeader description={t('pruning:page.description')} />

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="md:w-64">
              <FormSelect
                label={t('pruning:page.filterLabel')}
                value={statusFilter}
                onChange={handleStatusChange}
                options={STATUS_FILTER_OPTIONS}
              />
            </div>
            {data?.meta && (
              <div className="text-sm text-nb-gray-600">
                {t('pruning:page.totalLabel')}: <span className="font-semibold">{data.meta.total}</span> {t('pruning:page.requests')}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isError ? (
            <div className="py-10 text-center text-nb-danger">
              {t('pruning:page.loadError')}
            </div>
          ) : (
            <DataTable<PruningRequest, unknown>
              columns={columns}
              data={data?.data ?? []}
              loading={isLoading}
              enablePagination={false}
              getRowId={(r) => r.id}
              rowActions={rowActions}
              emptyTitle={t('pruning:page.emptyTitle')}
            />
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                leftIcon={<ChevronLeft className="w-4 h-4" />}
              >
                {t('common:pagination.previous')}
              </Button>
              <span className="text-sm text-nb-gray-600">
                {t('common:pagination.pageOf', { page, total: totalPages })}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                {t('common:pagination.next')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {view.item && (
        <DetailModal
          open={view.open}
          onOpenChange={view.onOpenChange}
          title={t('pruning:page.detailTitle')}
          rows={[
            { label: t('pruning:page.referenceCode'), value: view.item.referenceCode },
            { label: t('pruning:page.kecamatan'), value: view.item.submitter },
            {
              label: t('pruning:page.status'),
              value: (
                <StatusPill tone={PRUNING_REQUEST_STATUS_TONES[view.item.status]}>
                  {PRUNING_REQUEST_STATUS_LABELS[view.item.status]}
                </StatusPill>
              ),
            },
            { label: t('pruning:page.plantSpecies'), value: view.item.plantSpeciesName },
            { label: t('pruning:page.quantity'), value: view.item.quantity },
            { label: t('pruning:page.unit'), value: view.item.unit },
            { label: t('pruning:page.location'), value: view.item.location },
            { label: t('pruning:page.notes'), value: view.item.notes },
            { label: t('pruning:page.createdAt'), value: formatDate(view.item.createdAt) },
          ] as DetailModalRow[]}
        />
      )}
    </div>
  );
}
