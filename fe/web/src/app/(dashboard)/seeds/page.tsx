/**
 * Seeds List Page (Phase 3) — seed inventory master list
 * Access: admin_data, kepala_rayon, top_management, admin_system, superadmin
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Eye } from 'lucide-react';

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
import { PlantSeedRow } from '@/lib/api/seeds';
import { formatDate } from '@/lib/utils/time';
import { useViewModal } from '@/lib/hooks/use-view-modal';

const ALLOWED_ROLES = [
  'admin_data',
  'kepala_rayon',
  'top_management',
  'admin_system',
  'superadmin',
];

const LOW_STOCK_THRESHOLD = 10;

export default function SeedsListPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const view = useViewModal<PlantSeedRow>();
  const limit = 20;

  const { data: seedsData, isLoading: seedsLoading } = useSeeds({
    search,
    page,
    limit,
  });

  const allowed = !!user && ALLOWED_ROLES.includes(user.role);

  const rowActions = useCallback(
    (row: PlantSeedRow): DataTableRowAction<PlantSeedRow>[] => [
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

  useEffect(() => {
    if (!authLoading && user && !allowed) {
      router.push('/');
    }
  }, [user, authLoading, allowed, router]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-nb-gray-600">Memuat...</p>
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
      header: 'ID',
      enableSorting: false,
      meta: { label: 'ID', defaultHidden: true, filterVariant: 'text' },
      cell: ({ row }) => (
        <span className="font-mono text-[11px] text-nb-gray-600">{row.original.id}</span>
      ),
    },
    {
      id: 'nameId',
      header: 'Nama Bibit',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Nama Bibit' },
      cell: ({ row }) => (
        <span className="font-semibold text-nb-black">{row.original.nameId}</span>
      ),
    },
    {
      id: 'unit',
      header: 'Satuan',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Satuan' },
      cell: ({ row }) => {
        const unitLabels: Record<string, string> = {
          gram: 'gram',
          piece: 'buah',
          packet: 'paket',
        };
        return <span className="text-nb-body-sm">{unitLabels[row.original.unit] || row.original.unit}</span>;
      },
    },
    {
      id: 'stockQty',
      header: 'Stok',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Stok' },
      cell: ({ row }) => {
        const isLowStock = row.original.stockQty < LOW_STOCK_THRESHOLD;
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono text-nb-body-sm">{row.original.stockQty}</span>
            {isLowStock && (
              <Badge variant="warning" size="sm">
                Rendah
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: 'createdAt',
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
      id: 'updatedAt',
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
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Manajemen Bibit"
        description="Kelola inventaris bibit dan transaksi"
      />

      <Card>
        <CardContent className="p-4">
          <div className="mb-4">
            <FormInput
              label="Cari bibit"
              type="text"
              placeholder="Cari bibit berdasarkan nama…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              leftIcon={<Search className="w-5 h-5" />}
            />
          </div>

          <DataTable
            columns={columns}
            data={seeds}
            loading={seedsLoading}
            enablePagination={false}
            getRowId={(s) => s.id}
            rowActions={rowActions}
            emptyTitle="Tidak ada bibit tersedia"
          />

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between font-mono text-[11px] text-nb-gray-600">
              <span>
                Halaman <b className="text-nb-black">{page}</b> / {totalPages} · {total} bibit
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
        title="Detail Bibit"
        rows={view.item ? [
          { label: 'Nama Bibit', value: view.item.nameId },
          {
            label: 'Satuan',
            value: ({
              gram: 'gram',
              piece: 'buah',
              packet: 'paket',
            } as Record<string, string>)[view.item.unit] || view.item.unit,
          },
          {
            label: 'Stok',
            value: (
              <div className="flex items-center gap-2">
                <span>{view.item.stockQty}</span>
                {view.item.stockQty < LOW_STOCK_THRESHOLD && (
                  <Badge variant="warning" size="sm">
                    Rendah
                  </Badge>
                )}
              </div>
            ),
          },
          { label: 'Dibuat', value: formatDate(view.item.createdAt) },
          { label: 'Diperbarui', value: formatDate(view.item.updatedAt) },
        ] : []}
      />
    </div>
  );
}
