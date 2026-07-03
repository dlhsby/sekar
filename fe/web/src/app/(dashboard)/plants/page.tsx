'use client';

/**
 * Plants Catalog Page — plant species master data on the standardized DataTable
 * (toolbar search, per-column filter, sort, column-toggle, client pagination).
 */

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  Badge,
  Combobox,
  DataTable,
  PageHeader,
  type ColumnDef,
} from '@/components/ui';
import { useSpeciesCatalog, type PlantSpeciesRow } from '@/lib/api/plants';
import { useAreas } from '@/lib/api/areas';

export default function PlantsPage() {
  const router = useRouter();
  const { t } = useTranslation(['plants', 'common']);

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
        id: 'id',
        accessorKey: 'id',
        header: t('plants:catalogTable.columnId'),
        enableSorting: false,
        meta: { label: t('plants:catalogTable.columnId'), defaultHidden: true, filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-nb-gray-600">{row.original.id}</span>
        ),
      },
      {
        id: 'nameId',
        accessorKey: 'nameId',
        header: t('plants:catalogTable.columnName'),
        enableSorting: true,
        meta: { label: t('plants:catalogTable.columnName'), filterVariant: 'text' },
        cell: ({ row }) => <span className="font-semibold">{row.original.nameId}</span>,
      },
      {
        id: 'nameLatin',
        accessorKey: 'nameLatin',
        header: t('plants:catalogTable.columnNameLatin'),
        enableSorting: true,
        meta: { label: t('plants:catalogTable.columnNameLatin'), filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="italic text-nb-gray-600">{row.original.nameLatin || '—'}</span>
        ),
      },
      {
        id: 'category',
        accessorKey: 'category',
        header: t('plants:catalogTable.columnCategory'),
        enableSorting: true,
        meta: { label: t('plants:catalogTable.columnCategory'), filterVariant: 'text' },
        cell: ({ row }) => (
          <Badge variant="outline" size="sm">
            {t(`plants:categoryLabels.${row.original.category}`) || row.original.category}
          </Badge>
        ),
      },
      {
        id: 'defaultPruningCycleDays',
        accessorKey: 'defaultPruningCycleDays',
        header: t('plants:catalogTable.columnPruningCycle'),
        enableSorting: true,
        meta: { label: t('plants:catalogTable.columnPruningCycle'), filterVariant: 'number', align: 'right' },
        cell: ({ row }) => (
          <span className="text-nb-gray-600">{row.original.defaultPruningCycleDays ?? '—'}</span>
        ),
      },
    ],
    [t]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('plants:catalog.title')}
        description={t('plants:catalog.description')}
        actions={
          <Combobox
            options={areaOptions}
            value=""
            onValueChange={(v) => {
              if (v) router.push(`/plants/${v}`);
            }}
            placeholder={t('plants:catalog.comboboxPlaceholder')}
            aria-label={t('plants:catalog.comboboxAriaLabel')}
            className="w-56"
          />
        }
      />

      <DataTable
        columns={columns}
        data={species}
        loading={isLoading}
        getRowId={(r) => r.id}
        searchPlaceholder={t('plants:catalog.searchPlaceholder')}
        emptyTitle={t('plants:catalog.emptyTitle')}
        emptyDescription={t('plants:catalog.emptyDescription')}
      />
    </div>
  );
}
