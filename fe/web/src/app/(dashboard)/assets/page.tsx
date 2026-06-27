'use client';

import { useCallback, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, QrCode, Eye, Pencil, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  FormSelect,
  PageHeader,
  SkeletonTable,
  StatusPill,
  Tabs,
  TabItem,
  type ColumnDef,
  type DataTableRowAction,
} from '@/components/ui';
import { useUser } from '@/lib/auth/hooks';
import { useAssets, useAssetCategories, useDeleteAsset, type AssetStatus } from '@/lib/api/assets';
import { AssetFormModal } from '@/components/assets/AssetFormModal';
import { formatDate } from '@/lib/utils/time';
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
  const router = useRouter();
  const user = useUser();
  const isManager = user && ASSET_MANAGER_ROLES.includes(user.role);

  const [statusFilter, setStatusFilter] = useState<AssetStatus | undefined>();
  // 'all' sentinel — Radix Select forbids an empty-string item value.
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const [formOpen, setFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const { mutate: deleteAsset } = useDeleteAsset();

  const { data: assetsData, isLoading: assetsLoading } = useAssets({
    status: statusFilter,
    category_id: categoryFilter === 'all' ? undefined : categoryFilter,
    page: currentPage,
    limit: pageSize,
  });

  const { data: categories } = useAssetCategories();

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
    ],
    []
  );

  const rowActions = useCallback(
    (asset: Asset): DataTableRowAction<Asset>[] => [
      { key: 'view', label: 'Lihat', icon: Eye, onClick: () => router.push(`/assets/${asset.id}`) },
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
    [router, isManager, deleteAsset]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aset"
        description="Kelola aset dan perawatan"
        actions={
          isManager && (
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
          )
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

      {assetsLoading ? (
        <SkeletonTable rows={5} />
      ) : !assetsData?.data?.length ? (
        <EmptyState variant="noData" title="Tidak ada aset" />
      ) : (
        <Card variant="default">
          <DataTable
            columns={columns}
            data={assetsData.data}
            enablePagination={false}
            getRowId={(asset) => asset.id}
            rowActions={rowActions}
          />

          {assetsData.meta && assetsData.meta.totalPages > 1 && (
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
      )}

      <AssetFormModal open={formOpen} onOpenChange={setFormOpen} asset={editingAsset} />
    </div>
  );
}
