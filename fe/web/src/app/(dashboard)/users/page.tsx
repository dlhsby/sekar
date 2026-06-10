/**
 * Users List Page — USR-1 (Phase 4-R revamp)
 * Access: ADMIN_ROLES
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  FormInput,
  DataTable,
  DataTableColumn,
  SkeletonTable,
  EmptyState,
  PageHeader,
  RoleAvatar,
  StatusPill,
} from '@/components/ui';
import { RolePill, RolePillButton } from '@/components/users/RolePill';
import { DeleteUserModal } from '@/components/users/DeleteUserModal';
import { useUsers } from '@/lib/api/users';
import { User, UserRole } from '@/types/models';
import { ROLE_LABELS } from '@/lib/constants/roles';

const ROLE_KEYS = Object.keys(ROLE_LABELS) as UserRole[];

export default function UsersPage() {
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | null>(null);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const { data, isLoading, error } = useUsers({
    search: search || undefined,
    role: roleFilter ?? undefined,
    page,
    limit,
  });

  const columns: DataTableColumn<User>[] = [
    {
      key: 'full_name',
      title: 'Pengguna',
      sortable: true,
      'aria-sort': 'none' as const,
      render: (_, row) => (
        <div className="flex items-center gap-2.5">
          <RoleAvatar name={row.full_name} role={row.role} src={row.profile_picture_url} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-bold text-nb-black">{row.full_name}</p>
            <p className="truncate font-mono text-[11px] text-nb-gray-600">{row.username}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      title: 'Role',
      render: (_, row) => <RolePill role={row.role} />,
    },
    {
      key: 'rayon',
      title: 'Rayon',
      render: (_, row) => (
        <span className="text-nb-body-sm">{row.rayon ? row.rayon.name : '—'}</span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (_, row) =>
        row.is_active ? (
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
      key: 'actions',
      title: 'Aksi',
      align: 'center',
      render: (_, row) => (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/users/${row.id}`);
            }}
            aria-label={`Edit ${row.full_name}`}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setUserToDelete(row);
            }}
            aria-label={`Hapus ${row.full_name}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const setRole = (role: UserRole | null) => {
    setRoleFilter(role);
    setPage(1);
  };

  const users = data?.data || [];
  const totalPages = data?.meta.totalPages || 1;
  const total = data?.meta.total || 0;

  return (
    <div className="space-y-5">
      <PageHeader
        description={total ? `${total} pengguna terdaftar` : undefined}
        actions={
          <Button onClick={() => router.push('/users/new')} leftIcon={<Plus className="w-5 h-5" />}>
            Tambah pengguna
          </Button>
        }
      />

      {/* Role-accent filter pills */}
      <div className="flex flex-wrap gap-2">
        <RolePillButton active={roleFilter === null} onClick={() => setRole(null)}>
          Semua
        </RolePillButton>
        {ROLE_KEYS.map((role) => (
          <RolePillButton
            key={role}
            role={role}
            active={roleFilter === role}
            onClick={() => setRole(roleFilter === role ? null : role)}
          >
            {ROLE_LABELS[role]}
          </RolePillButton>
        ))}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <FormInput
            label="Cari pengguna"
            placeholder="Cari berdasarkan nama atau username…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            leftIcon={<Search className="w-5 h-5" />}
          />
        </CardContent>
      </Card>

      {isLoading && (
        <Card>
          <CardContent className="p-6">
            <SkeletonTable rows={5} />
          </CardContent>
        </Card>
      )}

      {!isLoading && error && (
        <EmptyState
          variant="error"
          title="Gagal memuat data pengguna"
          description="Terjadi kesalahan saat mengambil data. Silakan coba lagi."
          action={{ label: 'Coba Lagi', onClick: () => window.location.reload() }}
        />
      )}

      {!isLoading && !error && (
        <DataTable
          columns={columns}
          data={users}
          loading={false}
          emptyText={
            search || roleFilter
              ? 'Tidak ada pengguna yang sesuai dengan filter'
              : 'Belum ada pengguna. Klik "Tambah pengguna" untuk membuat yang baru.'
          }
          rowKey="id"
        />
      )}

      {!isLoading && users.length > 0 && (
        <div
          className="flex items-center justify-between font-mono text-[11px] text-nb-gray-600"
          aria-live="polite"
        >
          <span>
            Menampilkan {users.length} dari <b className="text-nb-black">{total}</b>
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ‹
            </Button>
            <span className="px-2">
              <b className="text-nb-black">{page}</b> / {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              ›
            </Button>
          </div>
        </div>
      )}

      <DeleteUserModal
        user={userToDelete}
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onSuccess={() => setUserToDelete(null)}
      />
    </div>
  );
}
