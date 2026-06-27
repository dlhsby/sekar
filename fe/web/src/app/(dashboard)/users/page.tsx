/**
 * Users List Page — account master data on the standardized DataTable
 * (toolbar search, per-column filter, sort, column-toggle, refresh, kebab row
 * actions). Create/edit happen in a modal; actions are permission-gated.
 */

'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import {
  Button,
  DataTable,
  PageHeader,
  RoleAvatar,
  StatusPill,
  type ColumnDef,
  type DataTableRowAction,
} from '@/components/ui';
import { RolePill } from '@/components/users/RolePill';
import { DeleteUserModal } from '@/components/users/DeleteUserModal';
import { UserFormModal } from '@/components/users/UserFormModal';
import { useUsers } from '@/lib/api/users';
import { useUser } from '@/lib/auth/hooks';
import { ADMIN_ROLES } from '@/lib/constants/roles';
import { formatDate } from '@/lib/utils/time';
import type { User } from '@/types/models';

export default function UsersPage() {
  const router = useRouter();
  const currentUser = useUser();
  // Full management (create/edit/delete) is admin-only; other roles that can
  // reach this page (admin_data) get a view-only kebab.
  const canManage = !!currentUser && ADMIN_ROLES.includes(currentUser.role);

  const { data, isLoading, error, refetch } = useUsers({ limit: 1000 });
  const users = useMemo(() => data?.data ?? [], [data]);
  const total = data?.meta?.total ?? users.length;

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const columns = useMemo<ColumnDef<User>[]>(
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
        id: 'full_name',
        accessorKey: 'full_name',
        header: 'Pengguna',
        meta: { label: 'Pengguna', filterVariant: 'text' },
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="flex items-center gap-2.5">
              <RoleAvatar name={u.full_name} role={u.role} src={u.profile_picture_url} size="sm" />
              <div className="min-w-0">
                <p className="truncate font-bold text-nb-black">{u.full_name}</p>
                <p className="truncate font-mono text-[11px] text-nb-gray-600">{u.username}</p>
              </div>
            </div>
          );
        },
      },
      {
        id: 'username',
        accessorKey: 'username',
        header: 'Username',
        meta: { label: 'Username', defaultHidden: true, filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="font-mono text-nb-body-sm">{row.original.username}</span>
        ),
      },
      {
        id: 'role',
        accessorKey: 'role',
        header: 'Role',
        meta: { label: 'Role', filterVariant: 'text' },
        cell: ({ row }) => <RolePill role={row.original.role} />,
      },
      {
        id: 'rayon',
        accessorFn: (u) => u.rayon?.name ?? '',
        header: 'Rayon',
        meta: { label: 'Rayon', filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm">{row.original.rayon?.name ?? '—'}</span>
        ),
      },
      {
        id: 'status',
        accessorFn: (u) => (u.is_active ? 'Aktif' : 'Nonaktif'),
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
    ],
    []
  );

  const rowActions = useCallback(
    (u: User): DataTableRowAction<User>[] => [
      { key: 'view', label: 'Lihat', icon: Eye, onClick: () => router.push(`/users/${u.id}`) },
      {
        key: 'edit',
        label: 'Ubah',
        icon: Pencil,
        disabled: !canManage,
        onClick: () => {
          setEditingUser(u);
          setFormOpen(true);
        },
      },
      {
        key: 'delete',
        label: 'Hapus',
        icon: Trash2,
        variant: 'danger',
        hidden: !canManage,
        onClick: () => setUserToDelete(u),
      },
    ],
    [router, canManage]
  );

  return (
    <div className="space-y-5">
      <PageHeader
        description={total ? `${total} pengguna terdaftar` : undefined}
        actions={
          canManage ? (
            <Button
              onClick={() => {
                setEditingUser(null);
                setFormOpen(true);
              }}
              leftIcon={<Plus className="h-5 w-5" />}
            >
              Tambah Pengguna
            </Button>
          ) : undefined
        }
      />

      <DataTable
        columns={columns}
        data={users}
        loading={isLoading}
        error={!!error}
        onRetry={() => refetch()}
        onRefresh={() => refetch()}
        getRowId={(u) => u.id}
        searchPlaceholder="Cari nama atau username…"
        rowActions={rowActions}
        emptyTitle="Belum ada pengguna"
        emptyDescription={
          canManage ? 'Klik "Tambah Pengguna" untuk membuat yang baru.' : undefined
        }
      />

      <UserFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editingUser}
        onSuccess={() => refetch()}
      />

      <DeleteUserModal
        user={userToDelete}
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onSuccess={() => setUserToDelete(null)}
      />
    </div>
  );
}
