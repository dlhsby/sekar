/**
 * Users List Page (Phase 2C - 8 roles)
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
  FormSelect,
  DataTable,
  DataTableColumn,
  SkeletonTable,
  EmptyState,
} from '@/components/ui';
import { RoleBadge } from '@/components/users/RoleBadge';
import { DeleteUserModal } from '@/components/users/DeleteUserModal';
import { useUsers } from '@/lib/api/users';
import { User, UserRole } from '@/types/models';
import { ROLE_LABELS } from '@/lib/constants/roles';

// Build role options from centralized constants
const roleOptions = [
  { value: '__ALL__', label: 'Semua Role' },
  ...Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label })),
];

export default function UsersPage() {
  const router = useRouter();

  // Filters state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('__ALL__');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Delete modal state
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Fetch users with filters
  const { data, isLoading, error } = useUsers({
    search: search || undefined,
    role: roleFilter === '__ALL__' ? undefined : (roleFilter as UserRole),
    page,
    limit,
  });

  // Table columns
  const columns: DataTableColumn<User>[] = [
    {
      key: 'full_name',
      title: 'Nama',
      sortable: true,
      'aria-sort': 'none' as const,
    },
    {
      key: 'username',
      title: 'Username',
      sortable: true,
      'aria-sort': 'none' as const,
    },
    {
      key: 'role',
      title: 'Role',
      render: (_, row) => <RoleBadge role={row.role} />,
    },
    {
      key: 'rayon',
      title: 'Rayon',
      render: (_, row) => (
        <span className="text-sm">{row.rayon ? `${row.rayon.name} (${row.rayon.code})` : '-'}</span>
      ),
    },
    {
      key: 'area',
      title: 'Area',
      render: (_, row) => <span className="text-sm">{row.area ? `${row.area.name}` : '-'}</span>,
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
            aria-label={`Delete ${row.full_name}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const handleDeleteSuccess = () => {
    setUserToDelete(null);
  };

  const handleClearFilters = () => {
    setSearch('');
    setRoleFilter('__ALL__');
    setPage(1);
  };

  const hasFilters = search || (roleFilter && roleFilter !== '__ALL__');
  const users = data?.data || [];
  const totalPages = data?.meta.totalPages || 1;
  const total = data?.meta.total || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Users</h1>
          <p className="text-sm text-nb-gray-600 mt-1">Kelola data user dan hak akses</p>
        </div>
        <Button onClick={() => router.push('/users/new')} leftIcon={<Plus className="w-5 h-5" />}>
          Tambah User
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <FormInput
                label="Cari User"
                placeholder="Cari berdasarkan nama atau username..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                leftIcon={<Search className="w-5 h-5" />}
              />
            </div>

            {/* Role Filter */}
            <FormSelect
              label="Filter Role"
              options={roleOptions}
              value={roleFilter}
              onChange={(value) => {
                setRoleFilter(value);
                setPage(1);
              }}
            />
          </div>

          {/* Clear Filters */}
          {hasFilters && (
            <div className="mt-4">
              <Button variant="secondary" size="sm" onClick={handleClearFilters}>
                Reset Filter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="p-6">
            <SkeletonTable rows={5} />
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <EmptyState
          variant="error"
          title="Gagal memuat data user"
          description="Terjadi kesalahan saat mengambil data. Silakan coba lagi."
          action={{
            label: 'Coba Lagi',
            onClick: () => window.location.reload(),
          }}
        />
      )}

      {/* Table */}
      {!isLoading && !error && (
        <DataTable
          columns={columns}
          data={users}
          loading={false}
          emptyText={
            hasFilters
              ? 'Tidak ada user yang sesuai dengan filter'
              : 'Belum ada user. Klik tombol "Tambah User" untuk membuat user baru.'
          }
          rowKey="id"
        />
      )}

      {/* Pagination */}
      {!isLoading && users.length > 0 && (
        <Card>
          <CardContent className="px-6 py-4 flex items-center justify-between" aria-live="polite">
            <div className="text-sm text-nb-gray-600">
              Menampilkan {users.length} dari {total} user
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Sebelumnya
              </Button>
              <span className="text-sm font-medium px-3">
                Halaman {page} dari {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Selanjutnya
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteUserModal
        user={userToDelete}
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
