'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, QrCode } from 'lucide-react';
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
} from '@/components/ui';
import { useUser } from '@/lib/auth/hooks';
import { useAssets, useAssetCategories, type AssetStatus } from '@/lib/api/assets';
import type { DataTableColumn } from '@/components/ui';
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

  const { data: assetsData, isLoading: assetsLoading } = useAssets({
    status: statusFilter,
    category_id: categoryFilter === 'all' ? undefined : categoryFilter,
    page: currentPage,
    limit: pageSize,
  });

  const { data: categories, isLoading: categoriesLoading } = useAssetCategories();

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

  const columns: DataTableColumn<Asset>[] = [
    {
      key: 'asset_code',
      header: 'Kode',
      cell: (asset) => <span className="font-mono text-nb-body-sm">{asset.asset_code}</span>,
    },
    {
      key: 'name',
      header: 'Nama',
    },
    {
      key: 'category',
      header: 'Kategori',
      cell: (asset) => asset.category?.name || '—',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (asset) => (
        <StatusPill tone={STATUS_TONE_MAP[asset.status]}>
          {STATUS_LABELS[asset.status]}
        </StatusPill>
      ),
    },
    {
      key: 'area',
      header: 'Lokasi',
      cell: (asset) => asset.area?.name || asset.rayon?.name || '—',
    },
    {
      key: 'actions',
      header: '',
      cell: (asset) => (
        <Link href={`/assets/${asset.id}`}>
          <Button variant="ghost" size="sm">
            Detail
          </Button>
        </Link>
      ),
    },
  ];

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
              <Link href="/assets/new">
                <Button variant="default" leftIcon={<Plus className="w-4 h-4" />}>
                  Tambah
                </Button>
              </Link>
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
            onRowClick={(asset) => {
              window.location.href = `/assets/${asset.id}`;
            }}
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
    </div>
  );
}
