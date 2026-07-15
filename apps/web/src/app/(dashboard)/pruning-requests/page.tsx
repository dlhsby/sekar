/**
 * Pruning Requests dashboard list page (Phase 3 — admin disposition)
 *
 * Lets admin / admin_rayon / kepala_rayon / management triage kecamatan
 * pruning requests from the desktop. Full DataTable with toolbar (search, column
 * filters, column toggle, refresh) + row actions (View, Edit, Cancel).
 */

'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Eye, Pencil, Trash2, Plus } from 'lucide-react';
import {
  Button,
  DataTable,
  PageHeader,
  StatusPill,
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
  getPruningRequestStatusLabel,
  PRUNING_REQUEST_STATUS_TONES,
  PRUNING_REQUEST_ADMIN_ROLES,
} from '@/lib/constants/pruning-requests';
import {
  usePruningRequests,
  type PruningRequest,
  type PruningRequestStatus,
} from '@/lib/api/pruning-requests';

const PRUNING_REQUEST_STATUSES: PruningRequestStatus[] = [
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'assigned',
  'in_progress',
  'done',
  'cancelled',
];
import { PruningRequestFormModal } from '@/components/pruning-requests/PruningRequestFormModal';
import { CancelPruningRequestModal } from '@/components/pruning-requests/CancelPruningRequestModal';

export default function PruningRequestsPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<PruningRequest | null>(null);
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; request: PruningRequest | null }>({
    isOpen: false,
    request: null,
  });
  const view = useViewModal<PruningRequest>();
  const limit = 20;

  useEffect(() => {
    if (!authLoading && user && !hasRole(user.role, [...PRUNING_REQUEST_ADMIN_ROLES] as UserRole[])) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const filters = {
    page,
    limit,
  };
  const { data, isLoading, isError, refetch } = usePruningRequests(filters);
  const requests = useMemo(() => data?.data ?? [], [data]);

  const columns = useMemo<ColumnDef<PruningRequest>[]>(
    () => [
      {
        id: 'id',
        accessorKey: 'id',
        header: t('common:id'),
        enableSorting: false,
        meta: { label: t('common:id'), defaultHidden: true, filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-nb-gray-600">{row.original.id}</span>
        ),
      },
      {
        id: 'referenceCode',
        accessorKey: 'referenceCode',
        header: t('pruning:columns.referenceCode'),
        enableSorting: false,
        meta: { label: t('pruning:columns.referenceCode'), filterVariant: 'text' },
        cell: ({ row }) => <span className="font-mono text-sm font-semibold">{row.original.referenceCode}</span>,
      },
      {
        id: 'submitter',
        header: t('pruning:columns.kecamatan'),
        enableSorting: false,
        meta: { label: t('pruning:columns.kecamatan'), filterVariant: 'text' },
        cell: ({ row }) => (
          <div className="text-sm">
            <div className="font-semibold">{row.original.kecamatanName ?? '-'}</div>
            <div className="text-nb-gray-600">{row.original.submitter?.full_name ?? '-'}</div>
          </div>
        ),
      },
      {
        id: 'address',
        accessorKey: 'address',
        header: t('pruning:form.addressLabel'),
        enableSorting: false,
        meta: { label: t('pruning:form.addressLabel'), filterVariant: 'text', defaultHidden: true },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600 max-w-xs truncate">
            {row.original.address ?? '-'}
          </span>
        ),
      },
      {
        id: 'rayon',
        accessorFn: (r) => r.rayon?.name ?? '',
        header: t('pruning:columns.rayon'),
        enableSorting: false,
        meta: { label: t('pruning:columns.rayon'), filterVariant: 'text' },
        cell: ({ row }) => <div className="text-sm">{row.original.rayon?.name ?? '-'}</div>,
      },
      {
        id: 'expected',
        header: t('pruning:columns.dateRange'),
        enableSorting: false,
        enableColumnFilter: false,
        meta: { label: t('pruning:columns.dateRange') },
        cell: ({ row }) => (
          <div className="text-sm">
            {row.original.expectedDate ? (
              formatDate(row.original.expectedDate)
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
        accessorKey: 'status',
        header: t('pruning:columns.status'),
        enableSorting: false,
        meta: {
          label: t('pruning:columns.status'),
          filterVariant: 'enum',
          filterOptions: PRUNING_REQUEST_STATUSES.map((s) => ({
            value: s,
            label: getPruningRequestStatusLabel(s, t),
          })),
        },
        cell: ({ row }) => (
          <StatusPill tone={PRUNING_REQUEST_STATUS_TONES[row.original.status]} dot>
            {getPruningRequestStatusLabel(row.original.status, t)}
          </StatusPill>
        ),
      },
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        header: t('pruning:columns.createdAt'),
        enableSorting: false,
        meta: { label: t('pruning:columns.createdAt'), defaultHidden: true, filterVariant: 'date' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: 'updatedAt',
        accessorKey: 'updatedAt',
        header: t('pruning:columns.updatedAt'),
        enableSorting: false,
        meta: { label: t('pruning:columns.updatedAt'), defaultHidden: true, filterVariant: 'date' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {formatDate(row.original.updatedAt)}
          </span>
        ),
      },
    ],
    [t]
  );

  const rowActions = useCallback(
    (r: PruningRequest): DataTableRowAction<PruningRequest>[] => [
      {
        key: 'view',
        label: t('common:actions.view'),
        icon: Eye,
        onClick: () => {
          view.openWith(r);
        },
      },
      {
        key: 'edit',
        label: t('common:actions.edit'),
        icon: Pencil,
        onClick: () => {
          setEditingRequest(r);
          setFormOpen(true);
        },
      },
      {
        key: 'cancel',
        label: t('pruning:cancel.actionLabel'),
        icon: Trash2,
        variant: 'danger',
        onClick: () => setCancelModal({ isOpen: true, request: r }),
      },
    ],
    [view, t]
  );

  const totalPages = data?.meta?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader description={t('pruning:page.description')} />

      <DataTable
        columns={columns}
        data={requests}
        loading={isLoading}
        error={!!isError}
        onRetry={() => refetch()}
        onRefresh={() => refetch()}
        getRowId={(r) => r.id}
        enablePagination={false}
        searchPlaceholder={t('pruning:page.searchPlaceholder')}
        rowActions={rowActions}
        createAction={{
          label: t('pruning:page.buttonCreate'),
          onClick: () => {
            setEditingRequest(null);
            setFormOpen(true);
          },
        }}
        emptyTitle={t('pruning:page.emptyTitle')}
        emptyDescription={t('pruning:page.emptyDescription')}
        emptyAction={
          <Button
            onClick={() => {
              setEditingRequest(null);
              setFormOpen(true);
            }}
            leftIcon={<Plus className="h-5 w-5" />}
          >
            {t('pruning:page.buttonCreateFirst')}
          </Button>
        }
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isLoading}
          >
            {t('common:pagination.previous')}
          </Button>
          <span className="text-sm text-nb-gray-600 min-w-24 text-center">
            {t('common:pagination.pageOf', { page, total: totalPages })}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isLoading}
          >
            {t('common:pagination.next')}
          </Button>
        </div>
      )}

      {/* Form Modal */}
      <PruningRequestFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        request={editingRequest}
        onSuccess={() => refetch()}
      />

      {/* Detail Modal (read-only) */}
      <PruningRequestFormModal
        open={view.open}
        onOpenChange={view.onOpenChange}
        request={view.item}
        readOnly
      />

      {/* Cancel Confirmation Dialog */}
      <CancelPruningRequestModal
        request={cancelModal.request}
        isOpen={cancelModal.isOpen}
        onClose={() => setCancelModal({ isOpen: false, request: null })}
        onSuccess={() => {
          setCancelModal({ isOpen: false, request: null });
          refetch();
        }}
      />
    </div>
  );
}
