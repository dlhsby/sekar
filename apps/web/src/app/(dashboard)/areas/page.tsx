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
import { DeleteAreaModal } from '@/components/areas/DeleteAreaModal';
import { AreaFormModal } from '@/components/areas/AreaFormModal';
import { useAreas, useDeactivateArea, useActivateArea } from '@/lib/api/areas';
import { useUsers } from '@/lib/api/users';
import { useAuth } from '@/lib/auth/hooks';
import { useViewModal } from '@/lib/hooks/use-view-modal';
import { formatArea } from '@/lib/utils/geo';
import { formatDate } from '@/lib/utils/time';
import type { Area } from '@/types/models';

export default function AreasPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin =
    user?.role === 'admin_system' || user?.role === 'superadmin' || user?.role === 'top_management';

  const { data: areasData, isLoading, error, refetch } = useAreas({ limit: 1000 });
  const areas = useMemo(() => areasData?.data ?? [], [areasData]);

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

  const deactivateArea = useDeactivateArea();
  const activateArea = useActivateArea();

  const [formOpen, setFormOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const view = useViewModal<Area>();
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; area: Area | null }>({
    isOpen: false,
    area: null,
  });

  const columns = useMemo<ColumnDef<Area>[]>(
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
        meta: { label: t('admin:areas.columnRayon'), filterVariant: 'enum' },
        cell: ({ row }) => <span>{row.original.rayon?.name ?? '—'}</span>,
      },
      {
        id: 'area_type',
        accessorFn: (a) => a.areaType?.name ?? '',
        header: t('admin:areas.columnType'),
        meta: { label: t('admin:areas.columnType'), filterVariant: 'enum' },
        cell: ({ row }) =>
          row.original.areaType ? (
            <Badge
              variant={row.original.areaType.category === 'ACTIVE' ? 'success' : 'warning'}
              size="sm"
            >
              {row.original.areaType.name}
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
        meta: { label: t('admin:areas.columnCoordinates'), filterVariant: 'text' },
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
        accessorFn: (a) => (a.boundary_polygon ? t('admin:areas.boundaryYes') : '—'),
        header: t('admin:areas.columnBoundary'),
        meta: { label: t('admin:areas.columnBoundary'), filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {row.original.boundary_polygon ? t('admin:areas.boundaryYes') : '—'}
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
        meta: { label: t('admin:areas.columnStatus'), filterVariant: 'enum' },
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
    ],
    [actorName]
  );

  const rowActions = useCallback(
    (a: Area): DataTableRowAction<Area>[] => [
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

      <AreaFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        area={editingArea}
        onSuccess={() => refetch()}
      />

      <DeleteAreaModal
        area={deleteModal.area}
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, area: null })}
        onSuccess={() => setDeleteModal({ isOpen: false, area: null })}
      />

      {/* Detail = the edit form, read-only (shows the map + boundary + pin). */}
      <AreaFormModal open={view.open} onOpenChange={view.onOpenChange} area={view.item} readOnly />
    </div>
  );
}
