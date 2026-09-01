/**
 * Seeds List Page (Phase 3) — seed inventory master list
 * Access: admin_rayon, kepala_rayon, management, admin_system, superadmin
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Search, Eye, Pencil, Plus } from 'lucide-react';

import { useAuth } from '@/lib/auth/hooks';
import { useSeeds } from '@/lib/api/seeds';
import {
  Card,
  CardContent,
  Button,
  FormInput,
  DataTable,
  PageHeader,
  Badge,
  DetailModal,
  type ColumnDef,
  type DataTableRowAction,
} from '@/components/ui';
import { SeedFormModal } from '@/components/seeds/SeedFormModal';
import { PlantSeedRow } from '@/lib/api/seeds';
import { formatDate } from '@/lib/utils/time';
import { useViewModal } from '@/lib/hooks/use-view-modal';

const ALLOWED_ROLES = [
  'admin_rayon',
  'kepala_rayon',
  'management',
  'admin_system',
  'superadmin',
];

const EDIT_ALLOWED_ROLES = [
  'admin_rayon',
  'kepala_rayon',
  'management',
  'superadmin',
];

const LOW_STOCK_THRESHOLD = 10;

export default function SeedsListPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation(['seeds', 'common']);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const view = useViewModal<PlantSeedRow>();
  const [formOpen, setFormOpen] = useState(false);
  const [editingSeed, setEditingSeed] = useState<PlantSeedRow | null>(null);
  const limit = 20;

  const { data: seedsData, isLoading: seedsLoading, refetch } = useSeeds({
    search,
    page,
    limit,
  });

  const allowed = !!user && ALLOWED_ROLES.includes(user.role);
  const canEdit = !!user && EDIT_ALLOWED_ROLES.includes(user.role);

  const rowActions = useCallback(
    (row: PlantSeedRow): DataTableRowAction<PlantSeedRow>[] => [
      {
        key: 'view',
        label: t('common:actions.view'),
        icon: Eye,
        onClick: () => {
          view.openWith(row);
        },
      },
      {
        key: 'edit',
        label: t('common:actions.edit'),
        icon: Pencil,
        hidden: !canEdit,
        onClick: () => {
          setEditingSeed(row);
          setFormOpen(true);
        },
      },
    ],
    [view, canEdit, t]
  );

  useEffect(() => {
    if (!authLoading && user && !allowed) {
      router.push('/');
    }
  }, [user, authLoading, allowed, router]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-nb-gray-600">{t('common:actions.loading')}</p>
      </div>
    );
  }

  if (!allowed) return null;

  const seeds = seedsData?.items || [];
  const total = seedsData?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const columns: ColumnDef<PlantSeedRow>[] = [
    {
      id: 'id',
      accessorKey: 'id',
      header: t('seeds:listTable.columnId'),
      enableSorting: false,
      meta: { label: t('seeds:listTable.columnId'), defaultHidden: true, filterVariant: 'text' },
      cell: ({ row }) => (
        <span className="font-mono text-[11px] text-nb-gray-600">{row.original.id}</span>
      ),
    },
    {
      id: 'nameId',
      header: t('seeds:listTable.columnName'),
      enableSorting: false,
      meta: { label: t('seeds:listTable.columnName'), filterVariant: 'text' },
      cell: ({ row }) => (
        <span className="font-semibold text-nb-black">{row.original.nameId}</span>
      ),
    },
    {
      id: 'unit',
      header: t('seeds:listTable.columnUnit'),
      enableSorting: false,
      meta: { label: t('seeds:listTable.columnUnit'), filterVariant: 'text' },
      cell: ({ row }) => {
        return <span className="text-nb-body-sm">{t(`seeds:units.${row.original.unit}`) || row.original.unit}</span>;
      },
    },
    {
      id: 'stockQty',
      header: t('seeds:listTable.columnStock'),
      enableSorting: false,
      meta: { label: t('seeds:listTable.columnStock'), filterVariant: 'number' },
      cell: ({ row }) => {
        const isLowStock = row.original.stockQty < LOW_STOCK_THRESHOLD;
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono text-nb-body-sm">{row.original.stockQty}</span>
            {isLowStock && (
              <Badge variant="warning" size="sm">
                {t('seeds:stockIndicator.lowStockLabel')}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: 'createdAt',
      accessorKey: 'createdAt',
      header: t('seeds:listTable.columnCreatedAt'),
      enableSorting: false,
      meta: { label: t('seeds:listTable.columnCreatedAt'), defaultHidden: true, filterVariant: 'date' },
      cell: ({ row }) => (
        <span className="text-nb-body-sm text-nb-gray-600">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: 'updatedAt',
      accessorKey: 'updatedAt',
      header: t('seeds:listTable.columnUpdatedAt'),
      enableSorting: false,
      meta: { label: t('seeds:listTable.columnUpdatedAt'), defaultHidden: true, filterVariant: 'date' },
      cell: ({ row }) => (
        <span className="text-nb-body-sm text-nb-gray-600">
          {formatDate(row.original.updatedAt)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader description={t('seeds:list.description')} />

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div className="flex-1">
              <FormInput
                label={t('seeds:list.searchLabel')}
                type="text"
                placeholder={t('seeds:list.searchPlaceholder')}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                leftIcon={<Search className="w-5 h-5" />}
              />
            </div>
            {canEdit && (
              <Button
                onClick={() => {
                  setEditingSeed(null);
                  setFormOpen(true);
                }}
                leftIcon={<Plus className="h-5 w-5" />}
              >
                {t('seeds:list.createButton')}
              </Button>
            )}
          </div>

          <DataTable
            columns={columns}
            data={seeds}
            loading={seedsLoading}
            enablePagination={false}
            getRowId={(s) => s.id}
            rowActions={rowActions}
            emptyTitle={t('seeds:list.emptyTitle')}
          />

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between font-mono text-[11px] text-nb-gray-600">
              <span>
                {t('seeds:listPagination.pageLabel')} <b className="text-nb-black">{page}</b> / {totalPages} · {total} {t('seeds:listPagination.itemsLabel')}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ‹
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  ›
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <DetailModal
        open={view.open}
        onOpenChange={view.onOpenChange}
        title={t('seeds:listModal.title')}
        rows={view.item ? [
          { label: t('seeds:listModal.labelName'), value: view.item.nameId },
          {
            label: t('seeds:listModal.labelUnit'),
            value: t(`seeds:units.${view.item.unit}`) || view.item.unit,
          },
          {
            label: t('seeds:listModal.labelStock'),
            value: (
              <div className="flex items-center gap-2">
                <span>{view.item.stockQty}</span>
                {view.item.stockQty < LOW_STOCK_THRESHOLD && (
                  <Badge variant="warning" size="sm">
                    {t('seeds:stockIndicator.lowStockLabel')}
                  </Badge>
                )}
              </div>
            ),
          },
          { label: t('seeds:listModal.labelCreatedAt'), value: formatDate(view.item.createdAt) },
          { label: t('seeds:listModal.labelUpdatedAt'), value: formatDate(view.item.updatedAt) },
        ] : []}
      />

      <SeedFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        seed={editingSeed}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
