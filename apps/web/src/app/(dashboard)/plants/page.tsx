'use client';

/**
 * Plants Catalog Page — plant species master data on the standardized DataTable
 * (toolbar search, per-column filter, sort, column-toggle, client pagination).
 * Create/edit/delete via PlantFormModal + ConfirmDialog pattern.
 */

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Combobox,
  ConfirmDialog,
  DataTable,
  PageHeader,
  type ColumnDef,
  type DataTableRowAction,
} from '@/components/ui';
import { PlantFormModal } from '@/components/plants/PlantFormModal';
import {
  useSpeciesCatalog,
  useDeletePlantSpecies,
  type PlantSpeciesRow,
} from '@/lib/api/plants';
import { useAreas } from '@/lib/api/areas';
import { getErrorMessage } from '@/lib/api/client';
import { useViewModal } from '@/lib/hooks/use-view-modal';
import { formatDate } from '@/lib/utils/time';

export default function PlantsPage() {
  const router = useRouter();
  const { t } = useTranslation(['plants', 'common']);

  // Fetch the whole catalog once; the DataTable handles search/sort/filter/paging.
  const { data: catalogData, isLoading, refetch } = useSpeciesCatalog(1, '', 1000);
  const species = useMemo(() => catalogData?.data ?? [], [catalogData]);

  const { data: areasResponse } = useAreas({ limit: 1000 });
  const areaOptions = useMemo(
    () => (areasResponse?.data ?? []).map((area) => ({ value: area.id, label: area.name })),
    [areasResponse]
  );

  // Form modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState<PlantSpeciesRow | null>(null);

  // View/detail modal
  const view = useViewModal<PlantSpeciesRow>();

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; plant: PlantSpeciesRow | null }>({
    isOpen: false,
    plant: null,
  });
  const deleteMutation = useDeletePlantSpecies();

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
        meta: {
          label: t('plants:catalogTable.columnCategory'),
          filterVariant: 'enum' as const,
          enumOptions: [
            { value: 'tree', label: t('plants:categoryLabels.tree') },
            { value: 'shrub', label: t('plants:categoryLabels.shrub') },
            { value: 'groundcover', label: t('plants:categoryLabels.groundcover') },
            { value: 'flower', label: t('plants:categoryLabels.flower') },
          ],
        },
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
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        header: t('plants:catalogTable.columnCreated'),
        meta: { label: t('plants:catalogTable.columnCreated'), defaultHidden: true, filterVariant: 'date' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: 'updatedAt',
        accessorKey: 'updatedAt',
        header: t('plants:catalogTable.columnUpdated'),
        meta: { label: t('plants:catalogTable.columnUpdated'), defaultHidden: true, filterVariant: 'date' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {formatDate(row.original.updatedAt)}
          </span>
        ),
      },
    ],
    [t]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteDialog.plant) return;
    try {
      await deleteMutation.mutateAsync(deleteDialog.plant.id);
      toast.success(
        t('plants:successDeleted', { name: deleteDialog.plant.nameId })
      );
      refetch();
      setDeleteDialog({ isOpen: false, plant: null });
    } catch (err) {
      const message = getErrorMessage(err);
      // Check for 409 conflict (referenced by other entities)
      if (message.includes('409') || message.includes('Conflict')) {
        toast.error(t('plants:deleteErrorConflict'));
      } else {
        toast.error(t('plants:deleteErrorMessage'));
      }
    }
  }, [deleteDialog.plant, deleteMutation, refetch, t]);

  const rowActions = useCallback(
    (plant: PlantSpeciesRow): DataTableRowAction<PlantSpeciesRow>[] => [
      {
        key: 'view',
        label: t('plants:actionView'),
        icon: Eye,
        onClick: () => {
          view.openWith(plant);
        },
      },
      {
        key: 'edit',
        label: t('plants:actionEdit'),
        icon: Pencil,
        onClick: () => {
          setEditingPlant(plant);
          setFormOpen(true);
        },
      },
      {
        key: 'delete',
        label: t('plants:actionDelete'),
        icon: Trash2,
        variant: 'danger',
        onClick: () => setDeleteDialog({ isOpen: true, plant }),
      },
    ],
    [t, view]
  );

  return (
    <div className="space-y-6">
      <PageHeader
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
        rowActions={rowActions}
        actions={
          <Button onClick={() => {
            setEditingPlant(null);
            setFormOpen(true);
          }} leftIcon={<Plus className="h-5 w-5" />}>
            {t('plants:buttonAdd')}
          </Button>
        }
        emptyTitle={t('plants:catalog.emptyTitle')}
        emptyDescription={t('plants:catalog.emptyDescription')}
        emptyAction={
          <Button onClick={() => {
            setEditingPlant(null);
            setFormOpen(true);
          }} leftIcon={<Plus className="h-5 w-5" />}>
            {t('plants:buttonAddFirst')}
          </Button>
        }
      />

      <PlantFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        plant={editingPlant}
        onSuccess={() => refetch()}
      />

      {view.item && (
        <PlantFormModal
          open={view.open}
          onOpenChange={view.onOpenChange}
          plant={view.item}
          readOnly
        />
      )}

      <ConfirmDialog
        open={deleteDialog.isOpen}
        onOpenChange={(isOpen) => setDeleteDialog({ ...deleteDialog, isOpen })}
        title={t('plants:deleteConfirmTitle')}
        description={t('plants:deleteConfirmDescription', { name: deleteDialog.plant?.nameId })}
        confirmLabel={t('common:delete')}
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
