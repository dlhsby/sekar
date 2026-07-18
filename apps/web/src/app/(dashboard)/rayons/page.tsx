/**
 * Rayons List Page — rayon master data on the standardized DataTable.
 * Create/edit happen in a modal; delete actions are permission-gated.
 * Access: Admin System / Superadmin only.
 */

'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Eye, Pencil, Trash2, Power, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  DataTable,
  PageHeader,
  CoordinateLink,
  StatusPill,
  ConfirmDialog,
  mapStyleColorColumn,
  type ColumnDef,
  type DataTableRowAction,
} from '@/components/ui';
import { RayonFormModal } from '@/components/rayons/RayonFormModal';
import { CapacityModal } from '@/components/schedules/CapacityModal';
import type { StaffSubject } from '@/lib/api/location-staff-requirements';
import {
  useRayons,
  useDeleteRayon,
  useDeactivateRayon,
  useActivateRayon,
} from '@/lib/api/rayons';
import { useUsers } from '@/lib/api/users';
import { useAuth } from '@/lib/auth/hooks';
import { ADMIN_ROLES } from '@/lib/constants/roles';
import { getErrorMessage } from '@/lib/api/client';
import { useViewModal } from '@/lib/hooks/use-view-modal';
import { formatDate } from '@/lib/utils/time';
import type { Rayon } from '@/types/models';

export default function RayonsPage() {
  const { t } = useTranslation(['admin', 'common', 'schedules', 'validation']);
  const { user } = useAuth();
  const isAdmin = user && ADMIN_ROLES.includes(user.role);

  // Management grid shows deactivated rayons too — pickers/filters elsewhere
  // keep the active-only default.
  const { data: rayonsData, isLoading, error, refetch } = useRayons(true);
  const rayons = useMemo(() => rayonsData || [], [rayonsData]);

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

  const staffingLabel = useCallback(
    (level?: string | null): string => {
      const key =
        level === 'rayon'
          ? 'staffingLevelRayon'
          : level === 'location'
            ? 'staffingLevelLocation'
            : level === 'region'
              ? 'staffingLevelRegion'
              : null;
      return key ? t(`admin:rayons.form.${key}`) : '—';
    },
    [t]
  );

  const deleteRayon = useDeleteRayon();
  const deactivateRayon = useDeactivateRayon();
  const activateRayon = useActivateRayon();

  const [formOpen, setFormOpen] = useState(false);
  const [editingRayon, setEditingRayon] = useState<Rayon | null>(null);
  const view = useViewModal<Rayon>();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingRayon, setDeletingRayon] = useState<Rayon | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [capacitySubject, setCapacitySubject] = useState<StaffSubject | null>(null);

  const columns = useMemo<ColumnDef<Rayon>[]>(
    () => [
      {
        id: 'id',
        accessorKey: 'id',
        header: t('admin:rayons.columnId'),
        enableSorting: false,
        meta: { label: t('admin:rayons.columnId'), defaultHidden: true, filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-nb-gray-600">{row.original.id}</span>
        ),
      },
      {
        id: 'name',
        accessorKey: 'name',
        header: t('admin:rayons.columnName'),
        enableSorting: true,
        meta: { label: t('admin:rayons.columnName'), filterVariant: 'text' },
        cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
      },
      {
        id: 'staffing_level',
        accessorKey: 'staffing_level',
        header: t('admin:rayons.form.staffingLevel'),
        enableSorting: false,
        meta: {
          label: t('admin:rayons.form.staffingLevel'),
          filterVariant: 'enum',
          filterOptions: [
            { value: 'rayon', label: t('admin:rayons.form.staffingLevelRayon') },
            { value: 'region', label: t('admin:rayons.form.staffingLevelRegion') },
            { value: 'location', label: t('admin:rayons.form.staffingLevelLocation') },
          ],
        },
        cell: ({ row }) => <span className="text-nb-body-sm">{staffingLabel(row.original.staffing_level)}</span>,
      },
      mapStyleColorColumn<Rayon>(t('common:color')),
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
            entityKind="rayon"
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
        enableSorting: true,
        meta: { label: t('admin:shared.description'), filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {row.original.description ?? '—'}
          </span>
        ),
      },
      {
        id: 'created_by',
        accessorFn: (r) => actorName(r.created_by),
        header: t('admin:rayons.columnCreatedBy'),
        meta: { label: t('admin:rayons.columnCreatedBy'), defaultHidden: true, filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {actorName(row.original.created_by)}
          </span>
        ),
      },
      {
        id: 'created_at',
        accessorKey: 'created_at',
        header: t('admin:rayons.columnCreated'),
        meta: { label: t('admin:rayons.columnCreated'), defaultHidden: true, filterVariant: 'date' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
      {
        id: 'updated_by',
        accessorFn: (r) => actorName(r.updated_by),
        header: t('admin:rayons.columnUpdatedBy'),
        meta: { label: t('admin:rayons.columnUpdatedBy'), defaultHidden: true, filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {actorName(row.original.updated_by)}
          </span>
        ),
      },
      {
        id: 'updated_at',
        accessorKey: 'updated_at',
        header: t('admin:rayons.columnUpdated'),
        meta: { label: t('admin:rayons.columnUpdated'), defaultHidden: true, filterVariant: 'date' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {formatDate(row.original.updated_at)}
          </span>
        ),
      },
    ],
    [actorName, staffingLabel, t]
  );

  /**
   * Toggle a rayon's active flag. Deactivation is guarded server-side (409 while
   * active kawasan/lokasi/petugas still reference it) — `getErrorMessage`
   * localizes that by its error code, so the toast explains why it was refused.
   */
  const handleToggleActive = useCallback(
    async (r: Rayon) => {
      try {
        if (r.is_active) {
          await deactivateRayon.mutateAsync(r.id);
          toast.success(t('admin:shared.successDeactivated', { name: r.name }));
        } else {
          await activateRayon.mutateAsync(r.id);
          toast.success(t('admin:shared.successActivated', { name: r.name }));
        }
        refetch();
      } catch (err: unknown) {
        toast.error(getErrorMessage(err));
      }
    },
    [activateRayon, deactivateRayon, refetch, t]
  );

  const rowActions = useCallback(
    (r: Rayon): DataTableRowAction<Rayon>[] => [
      {
        key: 'view',
        label: t('admin:rayons.actionView'),
        icon: Eye,
        onClick: () => {
          view.openWith(r);
        },
      },
      {
        key: 'edit',
        label: t('admin:rayons.actionEdit'),
        icon: Pencil,
        disabled: !isAdmin,
        onClick: () => {
          setEditingRayon(r);
          setFormOpen(true);
        },
      },
      {
        key: 'capacity',
        label: t('schedules:staffCapacity.title'),
        icon: Settings2,
        // Capacity lives on exactly the tier this rayon nominates; `region` is
        // the column default when unset.
        hidden: !isAdmin || (r.staffing_level ?? 'region') !== 'rayon',
        onClick: () => setCapacitySubject({ type: 'rayon', id: r.id, name: r.name }),
      },
      {
        key: 'toggle-active',
        label: r.is_active
          ? t('admin:shared.actionDeactivate')
          : t('admin:shared.actionActivate'),
        icon: Power,
        hidden: !isAdmin,
        onClick: () => handleToggleActive(r),
      },
      {
        key: 'delete',
        label: t('admin:rayons.actionDelete'),
        icon: Trash2,
        variant: 'danger',
        hidden: !isAdmin,
        onClick: () => {
          setDeletingRayon(r);
          setDeleteOpen(true);
        },
      },
    ],
    [handleToggleActive, isAdmin, view, t]
  );

  const handleDelete = async () => {
    if (!deletingRayon) return;

    setDeleteError(null);
    try {
      await deleteRayon.mutateAsync(deletingRayon.id);
      toast.success(t('admin:rayons.successDeleted', { name: deletingRayon.name }));
      setDeleteOpen(false);
      setDeletingRayon(null);
      refetch();
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err);
      // Surface inline (dialog stays open), matching the Area/User delete flows.
      setDeleteError(
        errorMsg.includes('masih memiliki') || errorMsg.includes('area')
          ? t('admin:shared.rayonHasAreas', { name: deletingRayon.name })
          : errorMsg,
      );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        description={rayons.length ? t('admin:rayons.totalCount', { count: rayons.length }) : undefined}
      />

      <DataTable
        columns={columns}
        data={rayons}
        loading={isLoading}
        error={!!error}
        onRetry={() => refetch()}
        onRefresh={() => refetch()}
        getRowId={(r) => r.id}
        searchPlaceholder={t('admin:rayons.searchPlaceholder')}
        rowActions={rowActions}
        createAction={{
          label: t('admin:rayons.buttonAdd'),
          hidden: !isAdmin,
          onClick: () => {
            setEditingRayon(null);
            setFormOpen(true);
          },
        }}
        emptyTitle={t('admin:rayons.emptyTitle')}
        emptyDescription={t('admin:rayons.emptyDescription')}
        emptyAction={
          isAdmin ? (
            <Button
              onClick={() => {
                setEditingRayon(null);
                setFormOpen(true);
              }}
              leftIcon={<Plus className="h-5 w-5" />}
            >
              {t('admin:rayons.buttonAddFirst')}
            </Button>
          ) : undefined
        }
      />

      <RayonFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        rayon={editingRayon}
        onSuccess={() => refetch()}
      />

      {/* Detail = the edit form, read-only (shows the map + boundary + pin). */}
      <RayonFormModal open={view.open} onOpenChange={view.onOpenChange} rayon={view.item} readOnly />

      {/* Same editor the Jadwal board uses — capacity is one concept, one modal. */}
      <CapacityModal
        open={capacitySubject !== null}
        onOpenChange={(o) => !o && setCapacitySubject(null)}
        subject={capacitySubject}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open) setDeleteError(null);
          setDeleteOpen(open);
        }}
        title={t('admin:shared.deleteRayon')}
        description={
          deletingRayon && (
            <>
              {t('admin:shared.deleteConfirmation', { name: deletingRayon.name })}
            </>
          )
        }
        confirmLabel={t('admin:shared.delete')}
        cancelLabel={t('admin:shared.cancel')}
        variant="destructive"
        loading={deleteRayon.isPending}
        onConfirm={handleDelete}
      >
        {deleteError && (
          <div className="bg-nb-danger/10 border-2 border-nb-danger px-4 py-3">
            <p className="text-sm text-nb-danger font-medium">{deleteError}</p>
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}
