'use client';

/**
 * Areas List Page — area master data on the standardized DataTable (toolbar
 * search, per-column filter, sort, column-toggle, refresh, kebab row actions).
 * Create/edit happen in a full-screen modal (the form embeds a boundary map).
 */

import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Eye, Pencil, Trash2, Power } from 'lucide-react';
import {
  Badge,
  Button,
  DataTable,
  PageHeader,
  StatusPill,
  CoordinateLink,
  type ColumnDef,
  type DataTableRowAction,
} from '@/components/ui';
import { DeleteLocationModal } from '@/components/locations';
import { LocationFormModal } from '@/components/locations';
import { useLocations, useDeactivateLocation, useActivateLocation } from '@/lib/api/locations';
import { useUsers } from '@/lib/api/users';
import { useRayons } from '@/lib/api/rayons';
import { useLocationTypes } from '@/lib/api/location-types';
import { useAuth } from '@/lib/auth/hooks';
import { useViewModal } from '@/lib/hooks/use-view-modal';
import { formatArea } from '@/lib/utils/geo';
import { formatDate } from '@/lib/utils/time';
import type { Location } from '@/types/models';

export default function AreasPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin =
    user?.role === 'admin_system' || user?.role === 'superadmin' || user?.role === 'top_management';

  // include_inactive: the admin grid must show deactivated areas too (and
  // let them be reactivated) — otherwise deactivating one makes it vanish
  // from the grid entirely, with no way back short of the API directly.
  const { data: areasData, isLoading, error, refetch } = useLocations({
    limit: 1000,
    include_inactive: true,
  });
  const areas = useMemo(() => areasData?.data ?? [], [areasData]);

  // Full master-data lists so the enum column filters can list every possible
  // value (incl. ones with zero matching areas) instead of only values that
  // happen to appear in the currently loaded rows.
  const { data: allRayons } = useRayons();
  const rayonFilterOptions = useMemo(
    () => (allRayons ?? []).map((r) => ({ value: r.name, label: r.name })),
    [allRayons]
  );
  const { data: allLocationTypes } = useLocationTypes();
  const locationTypeFilterOptions = useMemo(
    () => (allLocationTypes ?? []).map((t) => ({ value: t.name, label: t.name })),
    [allLocationTypes]
  );

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

  const deactivateArea = useDeactivateLocation();
  const activateArea = useActivateLocation();

  const [formOpen, setFormOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Location | null>(null);
  const view = useViewModal<Location>();
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; area: Location | null }>({
    isOpen: false,
    area: null,
  });

  const columns = useMemo<ColumnDef<Location>[]>(
    () => [
      {
        id: 'id',
        accessorKey: 'id',
        header: t('admin:areas.columnId'),
        enableSorting: false,
        meta: { label: t('admin:areas.columnId'), defaultHidden: true, filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-nb-gray-600">{row.original.id}</span>
        ),
      },
      {
        id: 'name',
        accessorKey: 'name',
        header: t('admin:areas.columnName'),
        meta: { label: t('admin:areas.columnName'), filterVariant: 'text' },
        cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
      },
      {
        id: 'rayon',
        accessorFn: (a) => a.rayon?.name ?? '',
        header: t('admin:areas.columnRayon'),
        meta: {
          label: t('admin:areas.columnRayon'),
          filterVariant: 'enum',
          filterOptions: rayonFilterOptions,
        },
        cell: ({ row }) => <span>{row.original.rayon?.name ?? '—'}</span>,
      },
      {
        id: 'location_type',
        accessorFn: (a) => a.locationType?.name ?? '',
        header: t('admin:areas.columnType'),
        meta: {
          label: t('admin:areas.columnType'),
          filterVariant: 'enum',
          filterOptions: locationTypeFilterOptions,
        },
        cell: ({ row }) =>
          row.original.locationType ? (
            <Badge
              variant={row.original.locationType.category === 'ACTIVE' ? 'success' : 'warning'}
              size="sm"
            >
              {row.original.locationType.name}
            </Badge>
          ) : (
            <span className="text-nb-gray-500">—</span>
          ),
      },
      {
        id: 'coordinates',
        accessorFn: (a) =>
          a.gps_lat && a.gps_lng
            ? `${Number(a.gps_lat).toFixed(6)}, ${Number(a.gps_lng).toFixed(6)}`
            : '',
        header: t('admin:areas.columnCoordinates'),
        enableColumnFilter: false,
        meta: { label: t('admin:areas.columnCoordinates') },
        cell: ({ row }) =>
          row.original.gps_lat && row.original.gps_lng ? (
            <CoordinateLink
              lat={Number(row.original.gps_lat)}
              lng={Number(row.original.gps_lng)}
              label={row.original.name}
            />
          ) : (
            <span className="text-nb-gray-500">—</span>
          ),
      },
      {
        id: 'boundary_polygon',
        accessorFn: (a) => (a.boundary_polygon ? t('admin:areas.boundaryYes') : t('admin:areas.boundaryNo')),
        header: t('admin:areas.columnBoundary'),
        meta: {
          label: t('admin:areas.columnBoundary'),
          filterVariant: 'enum',
          filterOptions: [
            { value: t('admin:areas.boundaryYes'), label: t('admin:areas.boundaryYes') },
            { value: t('admin:areas.boundaryNo'), label: t('admin:areas.boundaryNo') },
          ],
        },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {row.original.boundary_polygon ? t('admin:areas.boundaryYes') : t('admin:areas.boundaryNo')}
          </span>
        ),
      },
      {
        id: 'coverage_area',
        accessorKey: 'coverage_area',
        header: t('admin:areas.columnArea'),
        meta: { label: t('admin:areas.columnArea'), defaultHidden: true, filterVariant: 'number', align: 'right' },
        cell: ({ row }) => (
          <span className="tabular-nums text-nb-gray-600">
            {row.original.coverage_area ? formatArea(row.original.coverage_area) : '—'}
          </span>
        ),
      },
      {
        id: 'radius_meters',
        accessorKey: 'radius_meters',
        header: t('admin:areas.columnRadius'),
        meta: { label: t('admin:areas.columnRadius'), defaultHidden: true, filterVariant: 'number', align: 'right' },
        cell: ({ row }) => (
          <span className="tabular-nums text-nb-gray-600">
            {row.original.radius_meters ?? '—'}
          </span>
        ),
      },
      {
        id: 'address',
        accessorKey: 'address',
        header: t('admin:areas.columnAddress'),
        meta: { label: t('admin:areas.columnAddress'), defaultHidden: true, filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600 max-w-xs truncate">
            {row.original.address ?? '—'}
          </span>
        ),
      },
      {
        id: 'is_active',
        accessorFn: (a) => (a.is_active ? t('admin:areas.statusActive') : t('admin:areas.statusInactive')),
        header: t('admin:areas.columnStatus'),
        meta: {
          label: t('admin:areas.columnStatus'),
          filterVariant: 'enum',
          filterOptions: [
            { value: t('admin:areas.statusActive'), label: t('admin:areas.statusActive') },
            { value: t('admin:areas.statusInactive'), label: t('admin:areas.statusInactive') },
          ],
        },
        cell: ({ row }) =>
          row.original.is_active ? (
            <StatusPill tone="ok" dot>
              {t('admin:areas.statusActive')}
            </StatusPill>
          ) : (
            <StatusPill tone="neutral" dot>
              {t('admin:areas.statusInactive')}
            </StatusPill>
          ),
      },
      {
        id: 'created_by',
        accessorFn: (a) => actorName(a.created_by),
        header: t('admin:areas.columnCreatedBy'),
        meta: { label: t('admin:areas.columnCreatedBy'), defaultHidden: true, filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {actorName(row.original.created_by)}
          </span>
        ),
      },
      {
        id: 'created_at',
        accessorKey: 'created_at',
        header: t('admin:areas.columnCreated'),
        meta: { label: t('admin:areas.columnCreated'), defaultHidden: true, filterVariant: 'date' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
      {
        id: 'updated_by',
        accessorFn: (a) => actorName(a.updated_by),
        header: t('admin:areas.columnUpdatedBy'),
        meta: { label: t('admin:areas.columnUpdatedBy'), defaultHidden: true, filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {actorName(row.original.updated_by)}
          </span>
        ),
      },
      {
        id: 'updated_at',
        accessorKey: 'updated_at',
        header: t('admin:areas.columnUpdated'),
        meta: { label: t('admin:areas.columnUpdated'), defaultHidden: true, filterVariant: 'date' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {formatDate(row.original.updated_at)}
          </span>
        ),
      },
    ],
    [actorName, rayonFilterOptions, locationTypeFilterOptions]
  );

  const rowActions = useCallback(
    (a: Location): DataTableRowAction<Location>[] => [
      {
        key: 'view',
        label: t('admin:areas.actionView'),
        icon: Eye,
        onClick: () => {
          view.openWith(a);
        },
      },
      {
        key: 'edit',
        label: t('admin:areas.actionEdit'),
        icon: Pencil,
        disabled: !isAdmin,
        onClick: () => {
          setEditingArea(a);
          setFormOpen(true);
        },
      },
      {
        key: 'toggle-active',
        label: a.is_active === false ? t('admin:areas.actionActivate') : t('admin:areas.actionDeactivate'),
        icon: Power,
        hidden: !isAdmin,
        onClick: () =>
          a.is_active === false ? activateArea.mutate(a.id) : deactivateArea.mutate(a.id),
      },
      {
        key: 'delete',
        label: t('admin:areas.actionDelete'),
        icon: Trash2,
        variant: 'danger',
        hidden: !isAdmin,
        onClick: () => setDeleteModal({ isOpen: true, area: a }),
      },
    ],
    [isAdmin, deactivateArea, activateArea, view, t]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        description={
          areasData?.meta.total
            ? t('admin:areas.totalCount', { count: areasData.meta.total })
            : undefined
        }
      />

      <DataTable
        columns={columns}
        data={areas}
        loading={isLoading}
        error={!!error}
        onRetry={() => refetch()}
        onRefresh={() => refetch()}
        getRowId={(r) => r.id}
        searchPlaceholder={t('admin:areas.searchPlaceholder')}
        rowActions={rowActions}
        actions={
          isAdmin ? (
            <Button
              onClick={() => {
                setEditingArea(null);
                setFormOpen(true);
              }}
              leftIcon={<Plus className="h-5 w-5" />}
            >
              {t('admin:areas.buttonAdd')}
            </Button>
          ) : undefined
        }
        emptyTitle={t('admin:areas.emptyTitle')}
        emptyDescription={t('admin:areas.emptyDescription')}
        emptyAction={
          isAdmin ? (
            <Button
              onClick={() => {
                setEditingArea(null);
                setFormOpen(true);
              }}
              leftIcon={<Plus className="h-5 w-5" />}
            >
              {t('admin:areas.buttonAddFirst')}
            </Button>
          ) : undefined
        }
      />

      <LocationFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        area={editingArea}
        onSuccess={() => refetch()}
      />

      <DeleteLocationModal
        area={deleteModal.area}
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, area: null })}
        onSuccess={() => setDeleteModal({ isOpen: false, area: null })}
      />

      {/* Detail = the edit form, read-only (shows the map + boundary + pin). */}
      <LocationFormModal open={view.open} onOpenChange={view.onOpenChange} area={view.item} readOnly />
    </div>
  );
}
