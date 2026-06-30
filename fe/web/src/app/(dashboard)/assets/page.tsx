'use client';

import { useCallback, useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, QrCode, Eye, Pencil, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  DataTable,
  FormSelect,
  PageHeader,
  StatusPill,
  Tabs,
  TabItem,
  DetailModal,
  type ColumnDef,
  type DataTableRowAction,
} from '@/components/ui';
import { useUser } from '@/lib/auth/hooks';
import { useAssets, useAssetCategories, useDeleteAsset, type AssetStatus } from '@/lib/api/assets';
import { useUsers } from '@/lib/api/users';
import { AssetFormModal } from '@/components/assets/AssetFormModal';
import { formatDate } from '@/lib/utils/time';
import { useViewModal } from '@/lib/hooks/use-view-modal';
import type { Asset } from '@/lib/api/assets';

const ASSET_MANAGER_ROLES = ['korlap', 'kepala_rayon', 'admin_system', 'superadmin'];

const STATUS_TONE_MAP: Record<AssetStatus, 'ok' | 'info' | 'warn' | 'neutral' | 'bad'> = {
  available: 'ok',
  in_use: 'info',
  maintenance: 'warn',
  retired: 'neutral',
  lost: 'bad',
};

const STATUS_LABELS: Record<AssetStatus, string> = {
  available: 'Tersedia',
  in_use: 'Digunakan',
  maintenance: 'Perawatan',
  retired: 'Pensiun',
  lost: 'Hilang',
};

export default function AssetsPage() {
  const user = useUser();
  const isManager = user && ASSET_MANAGER_ROLES.includes(user.role);

  const [statusFilter, setStatusFilter] = useState<AssetStatus | undefined>();
  // 'all' sentinel — Radix Select forbids an empty-string item value.
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const [formOpen, setFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const view = useViewModal<Asset>();

  const { mutate: deleteAsset } = useDeleteAsset();

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

  const statusTabs: TabItem[] = [
    { key: '', label: 'Semua' },
    { key: 'available', label: 'Tersedia' },
    { key: 'in_use', label: 'Digunakan' },
    { key: 'maintenance', label: 'Perawatan' },
  ];

  const handleStatusChange = (key: string) => {
    setStatusFilter((key as AssetStatus) || undefined);
    setCurrentPage(1);
  };

  const categoryOptions = useMemo(
    () => [
      { value: 'all', label: 'Semua Kategori' },
      ...(categories?.map((cat) => ({ value: cat.id, label: cat.name })) || []),
    ],
    [categories]
  );

  const columns: ColumnDef<Asset>[] = useMemo(
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
        id: 'asset_code',
        accessorKey: 'asset_code',
        header: 'Kode',
        enableSorting: false,
        meta: { label: 'Kode' },
        cell: ({ row }) => <span className="font-mono text-nb-body-sm">{row.original.asset_code}</span>,
      },
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Nama',
        enableSorting: false,
        meta: { label: 'Nama' },
      },
      {
        id: 'category',
        header: 'Kategori',
        enableSorting: false,
        enableColumnFilter: false,
        meta: { label: 'Kategori' },
        cell: ({ row }) => row.original.category?.name || '—',
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        enableSorting: false,
        meta: { label: 'Status' },
        cell: ({ row }) => (
          <StatusPill tone={STATUS_TONE_MAP[row.original.status]}>
            {STATUS_LABELS[row.original.status]}
          </StatusPill>
        ),
      },
      {
        id: 'area',
        header: 'Lokasi',
        enableSorting: false,
        enableColumnFilter: false,
        meta: { label: 'Lokasi' },
        cell: ({ row }) => row.original.area?.name || row.original.rayon?.name || '—',
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
      {
        id: 'updated_at',
        accessorKey: 'updated_at',
        header: 'Diperbarui',
        enableSorting: false,
        meta: { label: 'Diperbarui', defaultHidden: true, filterVariant: 'date' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {formatDate(row.original.updated_at)}
          </span>
        ),
      },
      {
        id: 'created_by',
        accessorFn: (a) => actorName(a.created_by),
        header: 'Dibuat oleh',
        enableSorting: false,
        meta: { label: 'Dibuat oleh', defaultHidden: true, filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {actorName(row.original.created_by)}
          </span>
        ),
      },
      {
        id: 'updated_by',
        accessorFn: (a) => actorName(a.updated_by),
        header: 'Diperbarui oleh',
        enableSorting: false,
        meta: { label: 'Diperbarui oleh', defaultHidden: true, filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {actorName(row.original.updated_by)}
          </span>
        ),
      },
    ],
    [actorName]
  );

  const rowActions = useCallback(
    (asset: Asset): DataTableRowAction<Asset>[] => [
      {
        key: 'view',
        label: 'Lihat',
        icon: Eye,
        onClick: () => {
          view.openWith(asset);
        },
      },
      {
        key: 'edit',
        label: 'Ubah',
        icon: Pencil,
        disabled: !isManager,
        onClick: () => {
          setEditingAsset(asset);
          setFormOpen(true);
        },
      },
      {
        key: 'delete',
        label: 'Hapus',
        icon: Trash2,
        variant: 'danger',
        hidden: !isManager,
        onClick: () => deleteAsset(asset.id),
      },
    ],
    [isManager, deleteAsset, view]
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Aset" description="Kelola aset dan perawatan" />

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
                label="Kategori"
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
            emptyTitle="Tidak ada aset"
            actions={
              isManager ? (
                <div className="flex gap-2">
                  <Link href="/assets/qr">
                    <Button variant="outline" leftIcon={<QrCode className="w-4 h-4" />}>
                      QR Batch
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
                    Tambah
                  </Button>
                </div>
              ) : undefined
            }
          />

          {assetsData?.meta && assetsData.meta.totalPages > 1 && (
            <div className="p-4 border-t-2 border-nb-black flex justify-between items-center">
              <span className="text-nb-body-sm text-nb-gray-600">
                Halaman {currentPage} dari {assetsData.meta.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === assetsData.meta.totalPages}
                  onClick={() =>
                    setCurrentPage(Math.min(assetsData.meta.totalPages, currentPage + 1))
                  }
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          )}
      </Card>

      <AssetFormModal open={formOpen} onOpenChange={setFormOpen} asset={editingAsset} />

      <DetailModal
        open={view.open}
        onOpenChange={view.onOpenChange}
        title="Detail Aset"
        rows={view.item ? [
          { label: 'Kode', value: view.item.asset_code },
          { label: 'Nama', value: view.item.name },
          { label: 'Kategori', value: view.item.category?.name },
          {
            label: 'Status',
            value: (
              <StatusPill tone={STATUS_TONE_MAP[view.item.status]}>
                {STATUS_LABELS[view.item.status]}
              </StatusPill>
            ),
          },
          { label: 'Lokasi', value: view.item.area?.name || view.item.rayon?.name },
          { label: 'Dibuat', value: formatDate(view.item.created_at) },
          { label: 'Dibuat oleh', value: actorName(view.item.created_by) },
          { label: 'Diperbarui', value: formatDate(view.item.updated_at) },
          { label: 'Diperbarui oleh', value: actorName(view.item.updated_by) },
        ] : []}
      />
    </div>
  );
}
