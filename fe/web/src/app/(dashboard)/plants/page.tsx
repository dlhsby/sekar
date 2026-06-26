'use client';

/**
 * Plants Catalog Page — plant species master data on the standardized DataTable
 * (toolbar search, per-column filter, sort, column-toggle, client pagination).
 */

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Badge,
  Combobox,
  DataTable,
  PageHeader,
  type ColumnDef,
} from '@/components/ui';
import { useSpeciesCatalog, type PlantSpeciesRow } from '@/lib/api/plants';
import { useAreas } from '@/lib/api/areas';

const CATEGORY_LABELS: Record<string, string> = {
  tree: 'Pohon',
  shrub: 'Semak',
  groundcover: 'Penutup Tanah',
  flower: 'Bunga',
};

export default function PlantsPage() {
  const router = useRouter();

  // Fetch the whole catalog once; the DataTable handles search/sort/filter/paging.
  const { data: catalogData, isLoading } = useSpeciesCatalog(1, '', 1000);
  const species = useMemo(() => catalogData?.data ?? [], [catalogData]);

  const { data: areasResponse } = useAreas({ limit: 1000 });
  const areaOptions = useMemo(
    () => (areasResponse?.data ?? []).map((area) => ({ value: area.id, label: area.name })),
    [areasResponse]
  );

  const columns = useMemo<ColumnDef<PlantSpeciesRow>[]>(
    () => [
      {
        id: 'nameId',
        accessorKey: 'nameId',
        header: 'Nama',
        enableSorting: true,
        meta: { label: 'Nama', filterVariant: 'text' },
        cell: ({ row }) => <span className="font-semibold">{row.original.nameId}</span>,
      },
      {
        id: 'nameLatin',
        accessorKey: 'nameLatin',
        header: 'Nama Latin',
        enableSorting: true,
        meta: { label: 'Nama Latin', filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="italic text-nb-gray-600">{row.original.nameLatin || '—'}</span>
        ),
      },
      {
        id: 'category',
        accessorKey: 'category',
        header: 'Kategori',
        enableSorting: true,
        meta: { label: 'Kategori', filterVariant: 'text' },
        cell: ({ row }) => (
          <Badge variant="outline" size="sm">
            {CATEGORY_LABELS[row.original.category] || row.original.category}
          </Badge>
        ),
      },
      {
        id: 'defaultPruningCycleDays',
        accessorKey: 'defaultPruningCycleDays',
        header: 'Siklus Pangkas (hari)',
        enableSorting: true,
        meta: { label: 'Siklus Pangkas (hari)', filterVariant: 'number', align: 'right' },
        cell: ({ row }) => (
          <span className="text-nb-gray-600">{row.original.defaultPruningCycleDays ?? '—'}</span>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tanaman"
        description="Katalog spesies tanaman dan pengelolaan per area"
        actions={
          <Combobox
            options={areaOptions}
            value=""
            onValueChange={(v) => {
              if (v) router.push(`/plants/${v}`);
            }}
            placeholder="Ke area…"
            aria-label="Ke area"
            className="w-56"
          />
        }
      />

      <DataTable
        columns={columns}
        data={species}
        loading={isLoading}
        getRowId={(r) => r.id}
        searchPlaceholder="Cari nama atau nama Latin…"
        emptyTitle="Belum ada spesies"
        emptyDescription="Katalog tanaman masih kosong."
      />
    </div>
  );
}
