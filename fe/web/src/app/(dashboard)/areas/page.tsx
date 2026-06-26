'use client';

/**
 * Areas List Page — area master data on the standardized DataTable (toolbar
 * search, per-column filter, sort, column-toggle, client pagination). Admin
 * roles get an inline edit/delete actions column.
 */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import { Badge, Button, DataTable, PageHeader, type ColumnDef } from '@/components/ui';
import { DeleteAreaModal } from '@/components/areas/DeleteAreaModal';
import { useAreas } from '@/lib/api/areas';
import { useAuth } from '@/lib/auth/hooks';
import { formatArea } from '@/lib/utils/geo';
import type { Area } from '@/types/models';

export default function AreasPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; area: Area | null }>({
    isOpen: false,
    area: null,
  });

  // Fetch the full set once; the DataTable handles search/sort/filter/paging.
  const { data: areasData, isLoading, error, refetch } = useAreas({ limit: 1000 });
  const areas = useMemo(() => areasData?.data ?? [], [areasData]);

  const isAdmin =
    user?.role === 'admin_system' || user?.role === 'superadmin' || user?.role === 'top_management';

  const columns = useMemo<ColumnDef<Area>[]>(() => {
    const base: ColumnDef<Area>[] = [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Nama',
        enableSorting: true,
        meta: { label: 'Nama', filterVariant: 'text' },
        cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
      },
      {
        id: 'code',
        accessorKey: 'code',
        header: 'Kode',
        enableSorting: true,
        meta: { label: 'Kode', filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="font-mono text-nb-body-sm text-nb-gray-600">{row.original.code}</span>
        ),
      },
      {
        id: 'rayon',
        accessorFn: (a) => a.rayon?.name ?? '',
        header: 'Rayon',
        enableSorting: true,
        meta: { label: 'Rayon', filterVariant: 'text' },
        cell: ({ row }) => <span>{row.original.rayon?.name ?? '—'}</span>,
      },
      {
        id: 'area_type',
        accessorFn: (a) => a.area_type?.name ?? '',
        header: 'Tipe',
        enableSorting: true,
        meta: { label: 'Tipe', filterVariant: 'text' },
        cell: ({ row }) =>
          row.original.area_type ? (
            <Badge
              variant={row.original.area_type.category === 'ACTIVE' ? 'success' : 'warning'}
              size="sm"
            >
              {row.original.area_type.name}
            </Badge>
          ) : (
            <span className="text-nb-gray-500">—</span>
          ),
      },
      {
        id: 'coverage_area',
        accessorKey: 'coverage_area',
        header: 'Luas',
        enableSorting: true,
        meta: { label: 'Luas', filterVariant: 'number', align: 'right' },
        cell: ({ row }) => (
          <span className="tabular-nums text-nb-gray-600">
            {row.original.coverage_area ? formatArea(row.original.coverage_area) : '—'}
          </span>
        ),
      },
    ];

    if (!isAdmin) return base;

    return [
      ...base,
      {
        id: 'actions',
        header: 'Aksi',
        enableSorting: false,
        enableColumnFilter: false,
        meta: { label: 'Aksi', pinRight: true },
        cell: ({ row }) => (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/areas/${row.original.id}`)}
              aria-label={`Lihat ${row.original.name}`}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/areas/${row.original.id}/edit`)}
              aria-label={`Ubah ${row.original.name}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteModal({ isOpen: true, area: row.original })}
              aria-label={`Hapus ${row.original.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ];
  }, [isAdmin, router]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Area"
        description="Kelola area kerja dan batas wilayah"
        actions={
          isAdmin ? (
            <Button onClick={() => router.push('/areas/new')} leftIcon={<Plus className="h-5 w-5" />}>
              Tambah Area
            </Button>
          ) : undefined
        }
      />

      <DataTable
        columns={columns}
        data={areas}
        loading={isLoading}
        error={!!error}
        onRetry={() => refetch()}
        getRowId={(r) => r.id}
        searchPlaceholder="Cari nama atau kode area…"
        onRowClick={(a) => router.push(`/areas/${a.id}`)}
        emptyTitle="Belum Ada Area"
        emptyDescription="Mulai dengan menambahkan area kerja pertama."
        emptyAction={
          isAdmin ? (
            <Button onClick={() => router.push('/areas/new')} leftIcon={<Plus className="h-5 w-5" />}>
              Tambah Area Pertama
            </Button>
          ) : undefined
        }
      />

      <DeleteAreaModal
        area={deleteModal.area}
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, area: null })}
        onSuccess={() => setDeleteModal({ isOpen: false, area: null })}
      />
    </div>
  );
}
