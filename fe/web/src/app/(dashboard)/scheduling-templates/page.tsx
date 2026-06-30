/**
 * Template Penjadwalan Page — worker roster with permanent scheduling template
 * (rayon + shift + default areas). Admins can edit templates via UserFormModal.
 */

'use client';

import { useCallback, useMemo, useState } from 'react';
import { Pencil } from 'lucide-react';
import {
  DataTable,
  PageHeader,
  RoleAvatar,
  type ColumnDef,
  type DataTableRowAction,
} from '@/components/ui';
import { RolePill } from '@/components/users/RolePill';
import { UserFormModal } from '@/components/users/UserFormModal';
import { useUsers } from '@/lib/api/users';
import { useUser } from '@/lib/auth/hooks';
import { ADMIN_ROLES } from '@/lib/constants/roles';
import type { User } from '@/types/models';

export default function SchedulingTemplatesPage() {
  const currentUser = useUser();
  const canEdit = !!currentUser && (ADMIN_ROLES.includes(currentUser.role) || currentUser.role === 'admin_data');

  const { data, isLoading, error, refetch } = useUsers({ limit: 1000 });
  const users = useMemo(() => data?.data ?? [], [data]);
  const total = data?.meta?.total ?? users.length;

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
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
        id: 'shift',
        accessorFn: (u) => {
          if (!u.shift_definition) return '';
          return `${u.shift_definition.name} (${u.shift_definition.start_time}-${u.shift_definition.end_time})`;
        },
        header: 'Shift',
        meta: { label: 'Shift', filterVariant: 'text' },
        cell: ({ row }) => {
          const shift = row.original.shift_definition;
          return (
            <span className="text-nb-body-sm">
              {shift ? `${shift.name} (${shift.start_time}-${shift.end_time})` : '—'}
            </span>
          );
        },
      },
      {
        id: 'area_count',
        accessorFn: (u) => u.user_areas?.length ?? 0,
        header: 'Area',
        meta: { label: 'Area', filterVariant: 'text' },
        cell: ({ row }) => {
          const count = row.original.user_areas?.length ?? 0;
          return <span className="text-nb-body-sm">{count > 0 ? `${count} area` : '—'}</span>;
        },
      },
      {
        id: 'status',
        accessorFn: (u) => (u.is_active ? 'Aktif' : 'Nonaktif'),
        header: 'Status',
        meta: { label: 'Status', filterVariant: 'text', defaultHidden: true },
        cell: ({ row }) => (
          <span className="text-nb-body-sm">
            {row.original.is_active ? 'Aktif' : 'Nonaktif'}
          </span>
        ),
      },
    ],
    [],
  );

  const rowActions = useCallback(
    (u: User): DataTableRowAction<User>[] => [
      {
        key: 'edit',
        label: 'Ubah Template',
        icon: Pencil,
        hidden: !canEdit,
        onClick: () => {
          setEditingUser(u);
          setFormOpen(true);
        },
      },
    ],
    [canEdit],
  );

  return (
    <div className="space-y-5">
      <PageHeader description={total ? `${total} pengguna terdaftar` : undefined} />

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
      />

      <UserFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editingUser}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
