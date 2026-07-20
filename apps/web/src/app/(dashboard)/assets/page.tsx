'use client';

import { useCallback, useState, useMemo } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Plus, QrCode, Eye, Pencil, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  FormSelect,
  PageHeader,
  StatusPill,
  Tabs,
  TabItem,
  DetailModal,
  useToast,
  type ColumnDef,
  type DataTableRowAction,
} from '@/components/ui';
import { useUser } from '@/lib/auth/hooks';
import { useAssets, useAssetCategories, useDeleteAsset, type AssetStatus } from '@/lib/api/assets';
import { useUsers } from '@/lib/api/users';
import { AssetFormModal } from '@/components/assets/AssetFormModal';
import { formatDate } from '@/lib/utils/time';
import { useViewModal } from '@/lib/hooks/use-view-modal';
import { getErrorMessage } from '@/lib/api/client';
import type { Asset } from '@/lib/api/assets';

const ASSET_MANAGER_ROLES = ['korlap', 'kepala_rayon', 'management', 'admin_system', 'superadmin'];

const STATUS_TONE_MAP: Record<AssetStatus, 'ok' | 'info' | 'warn' | 'neutral' | 'bad'> = {
  available: 'ok',
  in_use: 'info',
  maintenance: 'warn',
  retired: 'neutral',
  lost: 'bad',
};

function getStatusLabels(t: ReturnType<typeof useTranslation>['t']): Record<AssetStatus, string> {
  return {
    available: t('assets:status.available'),
    in_use: t('assets:status.in_use'),
    maintenance: t('assets:status.maintenance'),
    retired: t('assets:status.retired'),
    lost: t('assets:status.lost'),
  };
}

export default function AssetsPage() {
  const { t } = useTranslation(['assets']);
  const { toast } = useToast();
  const user = useUser();
  const isManager = user && ASSET_MANAGER_ROLES.includes(user.role);

  const [statusFilter, setStatusFilter] = useState<AssetStatus | undefined>();
  // 'all' sentinel — Radix Select forbids an empty-string item value.
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const [formOpen, setFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const view = useViewModal<Asset>();

  const { mutate: deleteAsset, isPending: isDeleting } = useDeleteAsset();

  const { data: assetsData, isLoading: assetsLoading } = useAssets({
    status: statusFilter,
    category_id: categoryFilter === 'all' ? undefined : categoryFilter,
    page: currentPage,
    limit: pageSize,
  });

  const { data: categories } = useAssetCategories();

  // Resolve actor ids (created_by/updated_by) to names via the user list.
  const { data: usersData } = useUsers({ limit: 1000 });
  const userNameById = useMemo(
    () => new Map((usersData?.data ?? []).map((u) => [u.id, u.full_name])),
    [usersData]
  );
  const actorName = useCallback(
    (id?: string): string => (id ? (userNameById.get(id) ?? '—') : '—'),
    [userNameById]
  );

  const statusLabels = getStatusLabels(t);
  const statusTabs: TabItem[] = [
    { key: '', label: t('list.allCategories') },
    { key: 'available', label: statusLabels.available },
    { key: 'in_use', label: statusLabels.in_use },
    { key: 'maintenance', label: statusLabels.maintenance },
  ];

  const handleStatusChange = (key: string) => {
    setStatusFilter((key as AssetStatus) || undefined);
    setCurrentPage(1);
  };

  const categoryOptions = useMemo(
    () => [
      { value: 'all', label: t('list.allCategories') },
      ...(categories?.map((cat) => ({ value: cat.id, label: cat.name })) || []),
    ],
    [categories, t]
  );

  const handleDeleteConfirm = async () => {
    if (!assetToDelete) return;
    try {
      await deleteAsset(assetToDelete.id);
      toast({
        level: 'success',
        title: t('detail.deleteSuccess'),
      });
      setDeleteConfirmOpen(false);
      setAssetToDelete(null);
    } catch (error) {
      toast({
        level: 'danger',
        title: getErrorMessage(error),
      });
    }
  };

  const columns: ColumnDef<Asset>[] = useMemo(
    () => [
      {
        id: 'id',
        accessorKey: 'id',
        header: t('list.columns.id'),
        enableSorting: false,
        meta: { label: t('list.columns.id'), defaultHidden: true, filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-nb-gray-600">{row.original.id}</span>
        ),
      },
      {
        id: 'asset_code',
        accessorKey: 'asset_code',
        header: t('list.columns.code'),
        enableSorting: false,
        meta: { label: t('list.columns.code') },
        cell: ({ row }) => <span className="font-mono text-nb-body-sm">{row.original.asset_code}</span>,
      },
      {
        id: 'name',
        accessorKey: 'name',
        header: t('list.columns.name'),
        enableSorting: false,
        meta: { label: t('list.columns.name') },
      },
      {
        id: 'category',
        header: t('list.columns.category'),
        enableSorting: false,
        enableColumnFilter: false,
        meta: { label: t('list.columns.category') },
        cell: ({ row }) => row.original.category?.name || '—',
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: t('list.columns.status'),
        enableSorting: false,
        meta: {
          label: t('list.columns.status'),
          filterVariant: 'enum',
          filterOptions: (Object.keys(statusLabels) as AssetStatus[]).map((s) => ({
            value: s,
            label: statusLabels[s],
          })),
        },
        cell: ({ row }) => (
          <StatusPill tone={STATUS_TONE_MAP[row.original.status]}>
            {statusLabels[row.original.status]}
          </StatusPill>
        ),
      },
      {
        id: 'area',
        header: t('list.columns.location'),
        enableSorting: false,
        enableColumnFilter: false,
        meta: { label: t('list.columns.location') },
        cell: ({ row }) => row.original.area?.name || row.original.district?.name || '—',
      },
      {
        id: 'created_by',
        accessorFn: (a) => actorName(a.created_by),
        header: t('list.columns.createdBy'),
        enableSorting: false,
        meta: { label: t('list.columns.createdBy'), defaultHidden: true, filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {actorName(row.original.created_by)}
          </span>
        ),
      },
      {
        id: 'created_at',
        accessorKey: 'created_at',
        header: t('list.columns.createdAt'),
        enableSorting: false,
        meta: { label: t('list.columns.createdAt'), defaultHidden: true, filterVariant: 'date' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
      {
        id: 'updated_by',
        accessorFn: (a) => actorName(a.updated_by),
        header: t('list.columns.updatedBy'),
        enableSorting: false,
        meta: { label: t('list.columns.updatedBy'), defaultHidden: true, filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {actorName(row.original.updated_by)}
          </span>
        ),
      },
      {
        id: 'updated_at',
        accessorKey: 'updated_at',
        header: t('list.columns.updatedAt'),
        enableSorting: false,
        meta: { label: t('list.columns.updatedAt'), defaultHidden: true, filterVariant: 'date' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {formatDate(row.original.updated_at)}
          </span>
        ),
      },
    ],
    [actorName, t, statusLabels]
  );

  const rowActions = useCallback(
    (asset: Asset): DataTableRowAction<Asset>[] => [
      {
        key: 'view',
        label: t('list.actions.view'),
        icon: Eye,
        onClick: () => {
          view.openWith(asset);
        },
      },
      {
        key: 'edit',
        label: t('list.actions.edit'),
        icon: Pencil,
        disabled: !isManager,
        onClick: () => {
          setEditingAsset(asset);
          setFormOpen(true);
        },
      },
      {
        key: 'delete',
        label: t('list.actions.delete'),
        icon: Trash2,
        variant: 'danger',
        hidden: !isManager,
        onClick: () => {
          setAssetToDelete(asset);
          setDeleteConfirmOpen(true);
        },
      },
    ],
    [isManager, view, t]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        description={
          assetsData?.meta.total
            ? t('page.totalCount', { count: assetsData.meta.total })
            : undefined
        }
      />

      <Card variant="default">
        <div className="p-4 space-y-4">
          <Tabs
            tabs={statusTabs}
            value={statusFilter || ''}
            onValueChange={handleStatusChange}
          />

          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <FormSelect
                label={t('list.categoryLabel')}
                options={categoryOptions}
                value={categoryFilter}
                onChange={(value) => {
                  setCategoryFilter(value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card variant="default">
          <DataTable
            columns={columns}
            data={assetsData?.data ?? []}
            loading={assetsLoading}
            enablePagination={false}
            getRowId={(asset) => asset.id}
            rowActions={rowActions}
            emptyTitle={t('list.emptyTitle')}
            actions={
              isManager ? (
                <div className="flex gap-2">
                  <Link href="/assets/qr">
                    <Button variant="outline" leftIcon={<QrCode className="w-4 h-4" />}>
                      {t('list.qrBatch')}
                    </Button>
                  </Link>
                  <Button
                    variant="default"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => {
                      setEditingAsset(null);
                      setFormOpen(true);
                    }}
                  >
                    {t('list.add')}
                  </Button>
                </div>
              ) : undefined
            }
          />

          {assetsData?.meta && assetsData.meta.totalPages > 1 && (
            <div className="p-4 border-t-2 border-nb-black flex justify-between items-center">
              <span className="text-nb-body-sm text-nb-gray-600">
                {t('list.pagination.page')} {currentPage} {t('list.pagination.of')} {assetsData.meta.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                >
                  {t('list.pagination.previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === assetsData.meta.totalPages}
                  onClick={() =>
                    setCurrentPage(Math.min(assetsData.meta.totalPages, currentPage + 1))
                  }
                >
                  {t('list.pagination.next')}
                </Button>
              </div>
            </div>
          )}
      </Card>

      <AssetFormModal open={formOpen} onOpenChange={setFormOpen} asset={editingAsset} />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t('detail.deleteConfirm')}
        description={assetToDelete ? t('list.columns.code') + ': ' + assetToDelete.asset_code : undefined}
        confirmLabel={t('list.actions.delete')}
        cancelLabel={t('form.cancel')}
        loading={isDeleting}
        onConfirm={handleDeleteConfirm}
      />

      <DetailModal
        open={view.open}
        onOpenChange={view.onOpenChange}
        title={t('detail.title')}
        rows={view.item ? [
          { label: t('detail.code'), value: view.item.asset_code },
          { label: t('detail.name'), value: view.item.name },
          { label: t('detail.category'), value: view.item.category?.name },
          {
            label: t('detail.status'),
            value: (
              <StatusPill tone={STATUS_TONE_MAP[view.item.status]}>
                {statusLabels[view.item.status]}
              </StatusPill>
            ),
          },
          { label: t('detail.location'), value: view.item.area?.name || view.item.district?.name },
          { label: t('detail.createdAt'), value: formatDate(view.item.created_at) },
          { label: t('detail.createdBy'), value: actorName(view.item.created_by) },
          { label: t('detail.updatedAt'), value: formatDate(view.item.updated_at) },
          { label: t('detail.updatedBy'), value: actorName(view.item.updated_by) },
        ] : []}
      />
    </div>
  );
}
