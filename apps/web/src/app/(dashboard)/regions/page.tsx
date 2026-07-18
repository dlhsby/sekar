'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Eye, Pencil, Trash2, Power, Settings2 } from 'lucide-react';
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
  StatusPill,
  mapStyleColorColumn,
  type ColumnDef,
  type DataTableRowAction,
} from '@/components/ui';
import { usePermissions } from '@/lib/auth/usePermissions';
import { getErrorMessage } from '@/lib/api/client';
import {
  useRegions,
  useDeleteRegion,
  useDeactivateRegion,
  useActivateRegion,
  type Region,
} from '@/lib/api/regions';
import { useRayons } from '@/lib/api/rayons';
import { RegionFormModal } from '@/components/regions/RegionFormModal';
import { CapacityModal } from '@/components/schedules/CapacityModal';
import type { StaffSubject } from '@/lib/api/location-staff-requirements';

export default function RegionsPage() {
  const { t } = useTranslation(['admin', 'common', 'schedules', 'validation']);
  const { can } = usePermissions();
  // Management grid shows deactivated kawasan too — pickers elsewhere keep the
  // active-only default.
  const { data: regions = [], isLoading, error, refetch } = useRegions(undefined, true);
  // Resolver, not a picker: include deactivated rayons or a kawasan under one
  // would show a raw id and lose its staffing level.
  const { data: rayons = [] } = useRayons(true);
  const deleteRegion = useDeleteRegion();
  const deactivateRegion = useDeactivateRegion();
  const activateRegion = useActivateRegion();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Region | null>(null);
  const [viewing, setViewing] = useState<Region | null>(null);
  const [toDelete, setToDelete] = useState<Region | null>(null);
  const [capacitySubject, setCapacitySubject] = useState<StaffSubject | null>(null);

  const canManage = can('region:create') || can('region:update') || can('region:delete');
  const rayonName = useMemo(
    () => new Map(rayons.map((r) => [r.id, r.name])),
    [rayons],
  );
  const rayonFilterOptions = useMemo(
    () => rayons.map((r) => ({ label: r.name, value: r.name })),
    [rayons],
  );
  // Which tier owns capacity is the parent RAYON's call, not the kawasan's.
  const rayonLevel = useMemo(
    () => new Map(rayons.map((r) => [r.id, r.staffing_level ?? 'region'])),
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
      mapStyleColorColumn<Region>(t('common:color')),
      {
        id: 'coordinates',
        accessorFn: (r) =>
          r.center_lat && r.center_lng
            ? `${Number(r.center_lat).toFixed(6)}, ${Number(r.center_lng).toFixed(6)}`
            : '',
        header: t('admin:shared.columnCoordinates'),
        // Raw lat/lng sorts and filters meaninglessly — the accessor exists only
        // so global search can match a pasted coordinate.
        enableSorting: false,
        enableColumnFilter: false,
        meta: { label: t('admin:shared.columnCoordinates') },
        cell: ({ row }) => (
          <CoordinateLink
            lat={row.original.center_lat}
            lng={row.original.center_lng}
            label={row.original.name}
            boundary={row.original.boundary_polygon}
            borderColor={row.original.border_color}
            fillColor={row.original.fill_color}
            fillOpacity={row.original.fill_opacity}
            markerIcon={row.original.marker_icon}
            entityKind="region"
          />
        ),
      },
      {
        id: 'boundary_polygon',
        accessorFn: (r) => (r.boundary_polygon ? t('admin:shared.boundaryYes') : t('admin:shared.boundaryNo')),
        header: t('admin:shared.columnBoundary'),
        meta: {
          label: t('admin:shared.columnBoundary'),
          filterVariant: 'enum',
          filterOptions: [
            { value: t('admin:shared.boundaryYes'), label: t('admin:shared.boundaryYes') },
            { value: t('admin:shared.boundaryNo'), label: t('admin:shared.boundaryNo') },
          ],
        },
        cell: ({ row }) =>
          row.original.boundary_polygon ? (
            <StatusPill tone="ok" dot>
              {t('admin:shared.boundaryYes')}
            </StatusPill>
          ) : (
            <StatusPill tone="neutral" dot>
              {t('admin:shared.boundaryNo')}
            </StatusPill>
          ),
      },
      {
        id: 'is_active',
        accessorFn: (r) =>
          r.is_active ? t('admin:shared.statusActive') : t('admin:shared.statusInactive'),
        header: t('admin:shared.columnStatus'),
        meta: {
          label: t('admin:shared.columnStatus'),
          filterVariant: 'enum',
          filterOptions: [
            { value: t('admin:shared.statusActive'), label: t('admin:shared.statusActive') },
            { value: t('admin:shared.statusInactive'), label: t('admin:shared.statusInactive') },
          ],
        },
        cell: ({ row }) =>
          row.original.is_active ? (
            <StatusPill tone="ok" dot>
              {t('admin:shared.statusActive')}
            </StatusPill>
          ) : (
            <StatusPill tone="neutral" dot>
              {t('admin:shared.statusInactive')}
            </StatusPill>
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

  /**
   * Toggle a kawasan's active flag. Deactivation is guarded server-side (409
   * while active lokasi still reference it) — `getErrorMessage` localizes that
   * by its error code, so the toast explains why it was refused.
   */
  const handleToggleActive = async (r: Region) => {
    try {
      if (r.is_active) {
        await deactivateRegion.mutateAsync(r.id);
        toast.success(t('admin:shared.successDeactivated', { name: r.name }));
      } else {
        await activateRegion.mutateAsync(r.id);
        toast.success(t('admin:shared.successActivated', { name: r.name }));
      }
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

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
      key: 'capacity',
      label: t('schedules:staffCapacity.title'),
      icon: Settings2,
      hidden: !can('region:update') || rayonLevel.get(r.rayon_id) !== 'region',
      onClick: () => setCapacitySubject({ type: 'region', id: r.id, name: r.name }),
    },
    {
      key: 'toggle-active',
      label: r.is_active
        ? t('admin:shared.actionDeactivate')
        : t('admin:shared.actionActivate'),
      icon: Power,
      hidden: !can('region:update'),
      onClick: () => handleToggleActive(r),
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
        createAction={{
          label: t('admin:regions.buttonAdd'),
          hidden: !can('region:create'),
          onClick: () => {
            setEditing(null);
            setFormOpen(true);
          },
        }}
        emptyTitle={t('admin:regions.emptyTitle')}
      />

      {/* Same editor the Jadwal board uses — capacity is one concept, one modal. */}
      <CapacityModal
        open={capacitySubject !== null}
        onOpenChange={(o) => !o && setCapacitySubject(null)}
        subject={capacitySubject}
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
