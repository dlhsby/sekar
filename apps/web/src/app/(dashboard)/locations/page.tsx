'use client';

/**
 * Areas List Page — area master data on the standardized DataTable (toolbar
 * search, per-column filter, sort, column-toggle, refresh, kebab row actions).
 * Create/edit happen in a full-screen modal (the form embeds a boundary map).
 */

import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Eye, Pencil, Trash2, Power, Settings2 } from 'lucide-react';
import {
  Badge,
  Button,
  DataTable,
  PageHeader,
  StatusPill,
  CoordinateLink,
  mapStyleColorColumn,
  type ColumnDef,
  type DataTableRowAction,
} from '@/components/ui';
import { DeleteLocationModal } from '@/components/locations/DeleteLocationModal';
import { LocationFormModal } from '@/components/locations/LocationFormModal';
import { CapacityModal } from '@/components/schedules/CapacityModal';
import type { StaffSubject } from '@/lib/api/location-staff-requirements';
import { useLocations, useDeactivateLocation, useActivateLocation } from '@/lib/api/locations';
import { useUsers } from '@/lib/api/users';
import { useRayons } from '@/lib/api/rayons';
import { useLocationTypes } from '@/lib/api/location-types';
import { useAuth } from '@/lib/auth/hooks';
import { useViewModal } from '@/lib/hooks/use-view-modal';
import { formatArea } from '@/lib/utils/geo';
import { formatDate } from '@/lib/utils/time';
import type { Location } from '@/types/models';

export default function LocationsPage() {
  const { t } = useTranslation(['admin', 'common', 'schedules', 'validation']);
  const { user } = useAuth();
  const isAdmin =
    user?.role === 'admin_system' || user?.role === 'superadmin' || user?.role === 'management';

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
  // Resolver, not a picker: a lokasi under a deactivated rayon must still
  // resolve its rayon's staffing level.
  const { data: allRayons } = useRayons(true);
  const rayonFilterOptions = useMemo(
    () => (allRayons ?? []).map((r) => ({ value: r.name, label: r.name })),
    [allRayons]
  );
  // Which tier owns capacity is the parent RAYON's call, not the lokasi's.
  const rayonLevel = useMemo(
    () => new Map((allRayons ?? []).map((r) => [r.id, r.staffing_level ?? 'region'])),
    [allRayons]
  );
  const { data: allAreaTypes } = useLocationTypes();
  const locationTypeFilterOptions = useMemo(
    () => (allAreaTypes ?? []).map((t) => ({ value: t.name, label: t.name })),
    [allAreaTypes]
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
  const [capacitySubject, setCapacitySubject] = useState<StaffSubject | null>(null);

  const columns = useMemo<ColumnDef<Location>[]>(
    () => [
      {
        id: 'id',
        accessorKey: 'id',
        header: t('admin:locations.columnId'),
        enableSorting: false,
        meta: { label: t('admin:locations.columnId'), defaultHidden: true, filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-nb-gray-600">{row.original.id}</span>
        ),
      },
      {
        id: 'name',
        accessorKey: 'name',
        header: t('admin:locations.columnName'),
        meta: { label: t('admin:locations.columnName'), filterVariant: 'text' },
        cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
      },
      {
        id: 'rayon',
        accessorFn: (a) => a.rayon?.name ?? '',
        header: t('admin:locations.columnRayon'),
        meta: {
          label: t('admin:locations.columnRayon'),
          filterVariant: 'enum',
          filterOptions: rayonFilterOptions,
        },
        cell: ({ row }) => <span>{row.original.rayon?.name ?? '—'}</span>,
      },
      {
        id: 'area_type',
        accessorFn: (a) => a.locationType?.name ?? '',
        header: t('admin:locations.columnType'),
        meta: {
          label: t('admin:locations.columnType'),
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
        header: t('admin:shared.columnCoordinates'),
        // Raw lat/lng sorts and filters meaninglessly — the accessor exists only
        // so global search can match a pasted coordinate.
        enableSorting: false,
        enableColumnFilter: false,
        meta: { label: t('admin:shared.columnCoordinates') },
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
        accessorFn: (a) => (a.boundary_polygon ? t('admin:shared.boundaryYes') : t('admin:shared.boundaryNo')),
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
        id: 'coverage_area',
        accessorKey: 'coverage_area',
        header: t('admin:locations.columnArea'),
        meta: { label: t('admin:locations.columnArea'), defaultHidden: true, filterVariant: 'number', align: 'right' },
        cell: ({ row }) => (
          <span className="tabular-nums text-nb-gray-600">
            {row.original.coverage_area ? formatArea(row.original.coverage_area) : '—'}
          </span>
        ),
      },
      mapStyleColorColumn<Location>(t('common:color')),
      {
        id: 'address',
        accessorKey: 'address',
        header: t('admin:locations.columnAddress'),
        meta: { label: t('admin:locations.columnAddress'), defaultHidden: true, filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600 max-w-xs truncate">
            {row.original.address ?? '—'}
          </span>
        ),
      },
      {
        id: 'is_active',
        accessorFn: (a) => (a.is_active ? t('admin:locations.statusActive') : t('admin:locations.statusInactive')),
        header: t('admin:locations.columnStatus'),
        meta: {
          label: t('admin:locations.columnStatus'),
          filterVariant: 'enum',
          filterOptions: [
            { value: t('admin:locations.statusActive'), label: t('admin:locations.statusActive') },
            { value: t('admin:locations.statusInactive'), label: t('admin:locations.statusInactive') },
          ],
        },
        cell: ({ row }) =>
          row.original.is_active ? (
            <StatusPill tone="ok" dot>
              {t('admin:locations.statusActive')}
            </StatusPill>
          ) : (
            <StatusPill tone="neutral" dot>
              {t('admin:locations.statusInactive')}
            </StatusPill>
          ),
      },
      {
        id: 'created_by',
        accessorFn: (a) => actorName(a.created_by),
        header: t('admin:locations.columnCreatedBy'),
        meta: { label: t('admin:locations.columnCreatedBy'), defaultHidden: true, filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {actorName(row.original.created_by)}
          </span>
        ),
      },
      {
        id: 'created_at',
        accessorKey: 'created_at',
        header: t('admin:locations.columnCreated'),
        meta: { label: t('admin:locations.columnCreated'), defaultHidden: true, filterVariant: 'date' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
      {
        id: 'updated_by',
        accessorFn: (a) => actorName(a.updated_by),
        header: t('admin:locations.columnUpdatedBy'),
        meta: { label: t('admin:locations.columnUpdatedBy'), defaultHidden: true, filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {actorName(row.original.updated_by)}
          </span>
        ),
      },
      {
        id: 'updated_at',
        accessorKey: 'updated_at',
        header: t('admin:locations.columnUpdated'),
        meta: { label: t('admin:locations.columnUpdated'), defaultHidden: true, filterVariant: 'date' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {formatDate(row.original.updated_at)}
          </span>
        ),
      },
    ],
    [t, actorName, rayonFilterOptions, locationTypeFilterOptions]
  );

  const rowActions = useCallback(
    (a: Location): DataTableRowAction<Location>[] => [
      {
        key: 'view',
        label: t('admin:locations.actionView'),
        icon: Eye,
        onClick: () => {
          view.openWith(a);
        },
      },
      {
        key: 'edit',
        label: t('admin:locations.actionEdit'),
        icon: Pencil,
        disabled: !isAdmin,
        onClick: () => {
          setEditingArea(a);
          setFormOpen(true);
        },
      },
      {
        key: 'capacity',
        label: t('schedules:staffCapacity.title'),
        icon: Settings2,
        // Capacity belongs to whichever tier the parent RAYON nominates — a
        // lokasi only owns it when that rayon is lokasi-scoped.
        hidden: !isAdmin || rayonLevel.get(a.rayon_id ?? '') !== 'location',
        onClick: () => setCapacitySubject({ type: 'location', id: a.id, name: a.name }),
      },
      {
        key: 'toggle-active',
        label: a.is_active === false ? t('admin:locations.actionActivate') : t('admin:locations.actionDeactivate'),
        icon: Power,
        hidden: !isAdmin,
        onClick: () =>
          a.is_active === false ? activateArea.mutate(a.id) : deactivateArea.mutate(a.id),
      },
      {
        key: 'delete',
        label: t('admin:locations.actionDelete'),
        icon: Trash2,
        variant: 'danger',
        hidden: !isAdmin,
        onClick: () => setDeleteModal({ isOpen: true, area: a }),
      },
    ],
    [isAdmin, deactivateArea, activateArea, rayonLevel, view, t]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        description={
          areasData?.meta.total
            ? t('admin:locations.totalCount', { count: areasData.meta.total })
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
        searchPlaceholder={t('admin:locations.searchPlaceholder')}
        rowActions={rowActions}
        createAction={{
          label: t('admin:locations.buttonAdd'),
          hidden: !isAdmin,
          onClick: () => {
            setEditingArea(null);
            setFormOpen(true);
          },
        }}
        emptyTitle={t('admin:locations.emptyTitle')}
        emptyDescription={t('admin:locations.emptyDescription')}
        emptyAction={
          isAdmin ? (
            <Button
              onClick={() => {
                setEditingArea(null);
                setFormOpen(true);
              }}
              leftIcon={<Plus className="h-5 w-5" />}
            >
              {t('admin:locations.buttonAddFirst')}
            </Button>
          ) : undefined
        }
      />

      <CapacityModal
        open={capacitySubject !== null}
        onOpenChange={(o) => !o && setCapacitySubject(null)}
        subject={capacitySubject}
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
