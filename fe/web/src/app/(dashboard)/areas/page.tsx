'use client';

/**
 * Areas List Page — area master data on the standardized DataTable (toolbar
 * search, per-column filter, sort, column-toggle, refresh, kebab row actions).
 * Create/edit happen in a full-screen modal (the form embeds a boundary map).
 */

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  DataTable,
  PageHeader,
  type ColumnDef,
  type DataTableRowAction,
} from '@/components/ui';
import { DeleteAreaModal } from '@/components/areas/DeleteAreaModal';
import { AreaFormModal } from '@/components/areas/AreaFormModal';
import { useAreas } from '@/lib/api/areas';
import { useUsers } from '@/lib/api/users';
import { useAuth } from '@/lib/auth/hooks';
import { formatArea } from '@/lib/utils/geo';
import { formatDate } from '@/lib/utils/time';
import type { Area } from '@/types/models';

export default function AreasPage() {
  const router = useRouter();
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

  const [formOpen, setFormOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
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
        id: 'code',
        accessorKey: 'code',
        header: 'Kode',
        meta: { label: 'Kode', filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="font-mono text-nb-body-sm text-nb-gray-600">{row.original.code}</span>
        ),
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
        accessorFn: (a) => a.area_type?.name ?? '',
        header: 'Tipe',
        meta: { label: 'Tipe', filterVariant: 'text' },
        cell: ({ row }) =>
          row.original.area_type ? (
            <Badge
              variant={row.original.area_type.category === 'ACTIVE' ? 'success' : 'warning'}
              size="sm"
            >
              {row.original.area_type.name}
            </Badge>
          ) : (
            <span className="text-nb-gray-500">—</span>
          ),
      },
      {
        id: 'coverage_area',
        accessorKey: 'coverage_area',
        header: 'Luas',
        meta: { label: 'Luas', filterVariant: 'number', align: 'right' },
        cell: ({ row }) => (
          <span className="tabular-nums text-nb-gray-600">
            {row.original.coverage_area ? formatArea(row.original.coverage_area) : '—'}
          </span>
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
      { key: 'view', label: 'Lihat', icon: Eye, onClick: () => router.push(`/areas/${a.id}`) },
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
        key: 'delete',
        label: 'Hapus',
        icon: Trash2,
        variant: 'danger',
        hidden: !isAdmin,
        onClick: () => setDeleteModal({ isOpen: true, area: a }),
      },
    ],
    [router, isAdmin]
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
        searchPlaceholder="Cari nama atau kode area…"
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
    </div>
  );
}
