'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Eye, Pencil, Trash2, MapPin } from 'lucide-react';
import {
  Button,
  CoordinateLink,
  DataTable,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  type ColumnDef,
  type DataTableRowAction,
} from '@/components/ui';
import { usePermissions } from '@/lib/auth/usePermissions';
import { getErrorMessage } from '@/lib/api/client';
import { useRegions, useDeleteRegion, type Region } from '@/lib/api/regions';
import { useRayons } from '@/lib/api/rayons';
import { RegionFormModal } from '@/components/regions/RegionFormModal';
import { AssignAreasModal } from '@/components/regions/AssignAreasModal';

export default function RegionsPage() {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const { data: regions = [], isLoading, error, refetch } = useRegions();
  const { data: rayons = [] } = useRayons();
  const deleteRegion = useDeleteRegion();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Region | null>(null);
  const [assigning, setAssigning] = useState<Region | null>(null);
  const [viewing, setViewing] = useState<Region | null>(null);
  const [toDelete, setToDelete] = useState<Region | null>(null);

  const canManage = can('region:create') || can('region:update') || can('region:delete');
  const rayonName = useMemo(
    () => new Map(rayons.map((r) => [r.id, r.name])),
    [rayons],
  );
  const rayonFilterOptions = useMemo(
    () => rayons.map((r) => ({ label: r.name, value: r.name })),
    [rayons],
  );

  const columns = useMemo<ColumnDef<Region>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: t('admin:regions.columnName'),
        meta: { label: t('admin:regions.columnName'), filterVariant: 'text' },
        cell: ({ row }) => <span className="font-bold text-nb-black">{row.original.name}</span>,
      },
      {
        id: 'rayon',
        accessorFn: (r) => rayonName.get(r.rayon_id) ?? r.rayon_id,
        header: t('admin:regions.columnRayon'),
        meta: {
          label: t('admin:regions.columnRayon'),
          filterVariant: 'enum',
          filterOptions: rayonFilterOptions,
        },
      },
      {
        id: 'fill',
        header: t('admin:regions.columnStyle'),
        enableSorting: false,
        cell: ({ row }) => {
          const border = row.original.border_color ?? null;
          const fill = row.original.fill_color ?? null;
          const shown = fill ?? border;
          return shown ? (
            <span className="inline-flex items-center gap-2">
              <span
                className="h-4 w-4 border-2"
                style={{ backgroundColor: fill ?? 'transparent', borderColor: border ?? 'var(--color-nb-black)' }}
                title={shown}
              />
              <span className="font-mono text-nb-body-sm text-nb-gray-600">{shown}</span>
            </span>
          ) : (
            <span className="text-nb-gray-500">—</span>
          );
        },
      },
      {
        id: 'coordinates',
        header: t('admin:areas.columnCoordinates'),
        enableSorting: false,
        enableColumnFilter: false,
        meta: { label: t('admin:areas.columnCoordinates') },
        cell: ({ row }) => (
          <CoordinateLink lat={row.original.center_lat} lng={row.original.center_lng} />
        ),
      },
      {
        id: 'description',
        accessorKey: 'description',
        header: t('admin:shared.description'),
        meta: { label: t('admin:shared.description'), defaultHidden: true, filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">{row.original.description ?? '—'}</span>
        ),
      },
    ],
    [t, rayonName, rayonFilterOptions],
  );

  const rowActions = (r: Region): DataTableRowAction<Region>[] => [
    { key: 'view', label: t('common:actions.view'), icon: Eye, onClick: () => setViewing(r) },
    {
      key: 'edit',
      label: t('common:actions.edit'),
      icon: Pencil,
      hidden: !can('region:update'),
      onClick: () => {
        setEditing(r);
        setFormOpen(true);
      },
    },
    {
      key: 'assign-areas',
      label: t('admin:regions.assignAreas.action'),
      icon: MapPin,
      hidden: !can('region:update'),
      onClick: () => setAssigning(r),
    },
    {
      key: 'delete',
      label: t('common:actions.delete'),
      icon: Trash2,
      variant: 'danger',
      hidden: !can('region:delete'),
      onClick: () => setToDelete(r),
    },
  ];

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteRegion.mutateAsync(toDelete.id);
      toast.success(t('admin:regions.successDeleted'));
      setToDelete(null);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (!can('region:read')) {
    return <EmptyState variant="error" title={t('admin:regions.denied')} />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-nb-h1">{t('admin:regions.pageTitle')}</h1>
        <p className="text-nb-body-sm text-nb-gray-600">{t('admin:regions.description')}</p>
      </div>

      <DataTable
        columns={columns}
        data={regions}
        loading={isLoading}
        error={!!error}
        onRetry={() => refetch()}
        onRefresh={() => refetch()}
        getRowId={(r) => r.id}
        searchPlaceholder={t('admin:regions.searchPlaceholder')}
        rowActions={rowActions}
        actions={
          can('region:create') ? (
            <Button
              leftIcon={<Plus className="size-4" />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              {t('admin:regions.buttonAdd')}
            </Button>
          ) : undefined
        }
        emptyTitle={t('admin:regions.emptyTitle')}
      />

      {canManage && (
        <RegionFormModal
          open={formOpen}
          onOpenChange={setFormOpen}
          region={editing}
          onSuccess={() => refetch()}
        />
      )}
      {viewing && (
        <RegionFormModal
          open={!!viewing}
          onOpenChange={(o) => !o && setViewing(null)}
          region={viewing}
          readOnly
        />
      )}
      <AssignAreasModal
        open={!!assigning}
        onOpenChange={(o) => !o && setAssigning(null)}
        region={assigning}
        onSuccess={() => refetch()}
      />

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t('admin:regions.deleteTitle')}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-nb-body-sm text-nb-black">
              {t('admin:regions.deleteMessage', { name: toDelete?.name })}
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              {t('common:actions.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} loading={deleteRegion.isPending}>
              {t('common:actions.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
