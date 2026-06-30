'use client';

/**
 * Areas List Page — area master data on the standardized DataTable (toolbar
 * search, per-column filter, sort, column-toggle, refresh, kebab row actions).
 * Create/edit happen in a full-screen modal (the form embeds a boundary map).
 */

import { useCallback, useMemo, useState } from 'react';
import { Plus, Eye, Pencil, Trash2, Power } from 'lucide-react';
import {
  Badge,
  Button,
  DataTable,
  PageHeader,
  StatusPill,
  DetailModal,
  CoordinateLink,
  type ColumnDef,
  type DataTableRowAction,
} from '@/components/ui';
import { DeleteAreaModal } from '@/components/areas/DeleteAreaModal';
import { AreaFormModal } from '@/components/areas/AreaFormModal';
import { useAreas, useDeactivateArea, useActivateArea } from '@/lib/api/areas';
import { useUsers } from '@/lib/api/users';
import { useAuth } from '@/lib/auth/hooks';
import { formatArea } from '@/lib/utils/geo';
import { formatDate } from '@/lib/utils/time';
import type { Area } from '@/types/models';

export default function AreasPage() {
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
  const [viewOpen, setViewOpen] = useState(false);
  const [viewingArea, setViewingArea] = useState<Area | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; area: Area | null }>({
    isOpen: false,
    area: null,
  });

  const columns = useMemo<ColumnDef<Area>[]>(
    () => [
      {
        id: 'id',
        accessorKey: 'id',
        header: 'ID',
        enableSorting: false,
        meta: { label: 'ID', defaultHidden: true, filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-nb-gray-600">{row.original.id}</span>
        ),
      },
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Nama',
        meta: { label: 'Nama', filterVariant: 'text' },
        cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
      },
      {
        id: 'rayon',
        accessorFn: (a) => a.rayon?.name ?? '',
        header: 'Rayon',
        meta: { label: 'Rayon', filterVariant: 'text' },
        cell: ({ row }) => <span>{row.original.rayon?.name ?? '—'}</span>,
      },
      {
        id: 'area_type',
        accessorFn: (a) => a.areaType?.name ?? '',
        header: 'Tipe',
        meta: { label: 'Tipe', filterVariant: 'text' },
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
        header: 'Koordinat',
        meta: { label: 'Koordinat', filterVariant: 'text' },
        cell: ({ row }) =>
          row.original.gps_lat && row.original.gps_lng ? (
            <CoordinateLink
              lat={Number(row.original.gps_lat)}
              lng={Number(row.original.gps_lng)}
            />
          ) : (
            <span className="text-nb-gray-500">—</span>
          ),
      },
      {
        id: 'boundary_polygon',
        accessorFn: (a) => (a.boundary_polygon ? 'Ada' : '—'),
        header: 'Batas Wilayah',
        meta: { label: 'Batas Wilayah', filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {row.original.boundary_polygon ? 'Ada' : '—'}
          </span>
        ),
      },
      {
        id: 'coverage_area',
        accessorKey: 'coverage_area',
        header: 'Luas',
        meta: { label: 'Luas', defaultHidden: true, filterVariant: 'number', align: 'right' },
        cell: ({ row }) => (
          <span className="tabular-nums text-nb-gray-600">
            {row.original.coverage_area ? formatArea(row.original.coverage_area) : '—'}
          </span>
        ),
      },
      {
        id: 'radius_meters',
        accessorKey: 'radius_meters',
        header: 'Radius (m)',
        meta: { label: 'Radius (m)', defaultHidden: true, filterVariant: 'number', align: 'right' },
        cell: ({ row }) => (
          <span className="tabular-nums text-nb-gray-600">
            {row.original.radius_meters ?? '—'}
          </span>
        ),
      },
      {
        id: 'address',
        accessorKey: 'address',
        header: 'Alamat',
        meta: { label: 'Alamat', defaultHidden: true, filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600 max-w-xs truncate">
            {row.original.address ?? '—'}
          </span>
        ),
      },
      {
        id: 'is_active',
        accessorFn: (a) => (a.is_active ? 'Aktif' : 'Nonaktif'),
        header: 'Status',
        meta: { label: 'Status', filterVariant: 'text' },
        cell: ({ row }) =>
          row.original.is_active ? (
            <StatusPill tone="ok" dot>
              Aktif
            </StatusPill>
          ) : (
            <StatusPill tone="neutral" dot>
              Nonaktif
            </StatusPill>
          ),
      },
      {
        id: 'created_at',
        accessorKey: 'created_at',
        header: 'Dibuat',
        meta: { label: 'Dibuat', defaultHidden: true, filterVariant: 'date' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
      {
        id: 'updated_at',
        accessorKey: 'updated_at',
        header: 'Diperbarui',
        meta: { label: 'Diperbarui', defaultHidden: true, filterVariant: 'date' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {formatDate(row.original.updated_at)}
          </span>
        ),
      },
      {
        id: 'created_by',
        accessorFn: (a) => actorName(a.created_by),
        header: 'Dibuat oleh',
        meta: { label: 'Dibuat oleh', defaultHidden: true, filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {actorName(row.original.created_by)}
          </span>
        ),
      },
      {
        id: 'updated_by',
        accessorFn: (a) => actorName(a.updated_by),
        header: 'Diperbarui oleh',
        meta: { label: 'Diperbarui oleh', defaultHidden: true, filterVariant: 'text' },
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
        label: 'Lihat',
        icon: Eye,
        onClick: () => {
          setViewingArea(a);
          setViewOpen(true);
        },
      },
      {
        key: 'edit',
        label: 'Ubah',
        icon: Pencil,
        disabled: !isAdmin,
        onClick: () => {
          setEditingArea(a);
          setFormOpen(true);
        },
      },
      {
        key: 'toggle-active',
        label: a.is_active === false ? 'Aktifkan' : 'Nonaktifkan',
        icon: Power,
        hidden: !isAdmin,
        onClick: () =>
          a.is_active === false ? activateArea.mutate(a.id) : deactivateArea.mutate(a.id),
      },
      {
        key: 'delete',
        label: 'Hapus',
        icon: Trash2,
        variant: 'danger',
        hidden: !isAdmin,
        onClick: () => setDeleteModal({ isOpen: true, area: a }),
      },
    ],
    [isAdmin, deactivateArea, activateArea]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Area"
        description="Kelola area kerja dan batas wilayah"
      />

      <DataTable
        columns={columns}
        data={areas}
        loading={isLoading}
        error={!!error}
        onRetry={() => refetch()}
        onRefresh={() => refetch()}
        getRowId={(r) => r.id}
        searchPlaceholder="Cari nama area…"
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
              Tambah Area
            </Button>
          ) : undefined
        }
        emptyTitle="Belum Ada Area"
        emptyDescription="Mulai dengan menambahkan area kerja pertama."
        emptyAction={
          isAdmin ? (
            <Button
              onClick={() => {
                setEditingArea(null);
                setFormOpen(true);
              }}
              leftIcon={<Plus className="h-5 w-5" />}
            >
              Tambah Area Pertama
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

      <DetailModal
        open={viewOpen}
        onOpenChange={setViewOpen}
        title="Detail Area"
        rows={viewingArea ? [
          { label: 'Nama', value: viewingArea.name },
          { label: 'Rayon', value: viewingArea.rayon?.name ?? '—' },
          {
            label: 'Tipe',
            value: viewingArea.areaType ? (
              <Badge
                variant={viewingArea.areaType.category === 'ACTIVE' ? 'success' : 'warning'}
                size="sm"
              >
                {viewingArea.areaType.name}
              </Badge>
            ) : (
              '—'
            ),
          },
          {
            label: 'Koordinat',
            value:
              viewingArea.gps_lat && viewingArea.gps_lng ? (
                <CoordinateLink
                  lat={Number(viewingArea.gps_lat)}
                  lng={Number(viewingArea.gps_lng)}
                />
              ) : null,
          },
          { label: 'Alamat', value: viewingArea.address ?? null },
          { label: 'Luas', value: viewingArea.coverage_area ? formatArea(viewingArea.coverage_area) : null },
          { label: 'Radius (m)', value: viewingArea.radius_meters },
          {
            label: 'Status',
            value: (
              <StatusPill tone={viewingArea.is_active ? 'ok' : 'neutral'} dot>
                {viewingArea.is_active ? 'Aktif' : 'Nonaktif'}
              </StatusPill>
            ),
          },
          { label: 'Batas Wilayah', value: viewingArea.boundary_polygon ? 'Ada' : 'Tidak ada' },
          { label: 'Dibuat', value: formatDate(viewingArea.created_at) },
          { label: 'Dibuat oleh', value: actorName(viewingArea.created_by) },
          { label: 'Diperbarui', value: formatDate(viewingArea.updated_at) },
          { label: 'Diperbarui oleh', value: actorName(viewingArea.updated_by) },
        ] : []}
      />
    </div>
  );
}
