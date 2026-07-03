/**
 * Rayons List Page — rayon master data on the standardized DataTable.
 * Create/edit happen in a modal; delete actions are permission-gated.
 * Access: Admin System / Superadmin only.
 */

'use client';

import { useCallback, useMemo, useState } from 'react';
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  DataTable,
  PageHeader,
  CoordinateLink,
  ConfirmDialog,
  type ColumnDef,
  type DataTableRowAction,
} from '@/components/ui';
import { RayonFormModal } from '@/components/rayons/RayonFormModal';
import { useRayons, useDeleteRayon } from '@/lib/api/rayons';
import { useUsers } from '@/lib/api/users';
import { useAuth } from '@/lib/auth/hooks';
import { ADMIN_ROLES } from '@/lib/constants/roles';
import { getErrorMessage } from '@/lib/api/client';
import { useViewModal } from '@/lib/hooks/use-view-modal';
import type { Rayon } from '@/types/models';

export default function RayonsPage() {
  const { user } = useAuth();
  const isAdmin = user && ADMIN_ROLES.includes(user.role);

  const { data: rayonsData, isLoading, error, refetch } = useRayons();
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

  const deleteRayon = useDeleteRayon();

  const [formOpen, setFormOpen] = useState(false);
  const [editingRayon, setEditingRayon] = useState<Rayon | null>(null);
  const view = useViewModal<Rayon>();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingRayon, setDeletingRayon] = useState<Rayon | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const columns = useMemo<ColumnDef<Rayon>[]>(
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
        enableSorting: true,
        meta: { label: 'Nama', filterVariant: 'text' },
        cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
      },
      {
        id: 'color',
        accessorKey: 'color',
        header: 'Warna',
        enableSorting: false,
        meta: { label: 'Warna', filterVariant: 'text' },
        cell: ({ row }) => {
          const color = row.original.color;
          return (
            <span className="inline-flex items-center gap-2">
              {color ? (
                <>
                  <div
                    className="h-4 w-4 border-2 border-nb-black"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                  <span className="font-mono text-nb-body-sm text-nb-gray-600">{color}</span>
                </>
              ) : (
                <span className="text-nb-gray-500">—</span>
              )}
            </span>
          );
        },
      },
      {
        id: 'coordinates',
        accessorFn: (r) => (r.center_lat && r.center_lng ? 'Ada' : '—'),
        header: 'Koordinat',
        enableSorting: false,
        meta: { label: 'Koordinat', filterVariant: 'text' },
        cell: ({ row }) => (
          <CoordinateLink lat={row.original.center_lat} lng={row.original.center_lng} />
        ),
      },
      {
        id: 'description',
        accessorKey: 'description',
        header: 'Deskripsi',
        enableSorting: true,
        meta: { label: 'Deskripsi', defaultHidden: true, filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {row.original.description ?? '—'}
          </span>
        ),
      },
      {
        id: 'created_by',
        accessorFn: (r) => actorName(r.created_by),
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
        accessorFn: (r) => actorName(r.updated_by),
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
    (r: Rayon): DataTableRowAction<Rayon>[] => [
      {
        key: 'view',
        label: 'Lihat',
        icon: Eye,
        onClick: () => {
          view.openWith(r);
        },
      },
      {
        key: 'edit',
        label: 'Ubah',
        icon: Pencil,
        disabled: !isAdmin,
        onClick: () => {
          setEditingRayon(r);
          setFormOpen(true);
        },
      },
      {
        key: 'delete',
        label: 'Hapus',
        icon: Trash2,
        variant: 'danger',
        hidden: !isAdmin,
        onClick: () => {
          setDeletingRayon(r);
          setDeleteOpen(true);
        },
      },
    ],
    [isAdmin, view]
  );

  const handleDelete = async () => {
    if (!deletingRayon) return;

    setDeleteError(null);
    try {
      await deleteRayon.mutateAsync(deletingRayon.id);
      toast.success(`Rayon "${deletingRayon.name}" berhasil dihapus`);
      setDeleteOpen(false);
      setDeletingRayon(null);
      refetch();
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err);
      // Surface inline (dialog stays open), matching the Area/User delete flows.
      setDeleteError(
        errorMsg.includes('masih memiliki') || errorMsg.includes('area')
          ? `Rayon "${deletingRayon.name}" masih memiliki area. Hapus area terlebih dahulu.`
          : errorMsg,
      );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Rayon" description="Kelola 7 rayon di Kota Surabaya" />

      <DataTable
        columns={columns}
        data={rayons}
        loading={isLoading}
        error={!!error}
        onRetry={() => refetch()}
        onRefresh={() => refetch()}
        getRowId={(r) => r.id}
        searchPlaceholder="Cari rayon…"
        rowActions={rowActions}
        actions={
          isAdmin ? (
            <Button
              onClick={() => {
                setEditingRayon(null);
                setFormOpen(true);
              }}
              leftIcon={<Plus className="h-5 w-5" />}
            >
              Tambah Rayon
            </Button>
          ) : undefined
        }
        emptyTitle="Belum Ada Rayon"
        emptyDescription="Mulai dengan menambahkan rayon pertama."
        emptyAction={
          isAdmin ? (
            <Button
              onClick={() => {
                setEditingRayon(null);
                setFormOpen(true);
              }}
              leftIcon={<Plus className="h-5 w-5" />}
            >
              Tambah Rayon Pertama
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

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open) setDeleteError(null);
          setDeleteOpen(open);
        }}
        title="Hapus Rayon"
        description={
          deletingRayon && (
            <>
              Anda akan menghapus rayon <strong>{deletingRayon.name}</strong>. Tindakan ini tidak
              dapat dibatalkan.
            </>
          )
        }
        confirmLabel="Hapus"
        cancelLabel="Batal"
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
