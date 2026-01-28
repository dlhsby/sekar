'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NBTable, NBTableColumn } from '@/components/nb/NBTable';
import { NBInput } from '@/components/nb/NBInput';
import { NBSelect } from '@/components/nb/NBSelect';
import { NBButton } from '@/components/nb/NBButton';
import { RoleBadge } from '@/components/users/RoleBadge';
import { DeleteUserModal } from '@/components/users/DeleteUserModal';
import { useUsers } from '@/lib/api/users';
import { User, UserRole } from '@/types/models';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

/**
 * Users List Page
 *
 * Features:
 * - List all users with pagination
 * - Search by name or email
 * - Filter by role
 * - Create new user
 * - Edit existing user
 * - Delete user with confirmation
 * - Loading and empty states
 * - Admin only access
 */
export default function UsersPage() {
  const router = useRouter();

  // Filters state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Delete modal state
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Fetch users with filters
  const { data, isLoading, error } = useUsers({
    search: search || undefined,
    role: roleFilter as UserRole | undefined,
    page,
    limit,
  });

  // Role filter options
  const roleOptions = [
    { value: '', label: 'Semua Role' },
    { value: 'Admin', label: 'Admin' },
    { value: 'TopManagement', label: 'Top Management' },
    { value: 'KepalaRayon', label: 'Kepala Rayon' },
    { value: 'KoordinatorLapangan', label: 'Koordinator Lapangan' },
    { value: 'Worker', label: 'Worker' },
    { value: 'Linmas', label: 'Linmas' },
  ];

  // Table columns
  const columns: NBTableColumn<User>[] = [
    {
      key: 'name',
      title: 'Nama',
      sortable: true,
    },
    {
      key: 'email',
      title: 'Email',
      sortable: true,
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
        <span className="text-sm">
          {row.rayon ? `${row.rayon.name} (${row.rayon.code})` : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Aksi',
      align: 'center',
      render: (_, row) => (
        <div className="flex items-center justify-center gap-2">
          <NBButton
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/users/${row.id}`);
            }}
            aria-label={`Edit ${row.name}`}
          >
            <PencilIcon className="w-4 h-4" />
          </NBButton>
          <NBButton
            variant="danger"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setUserToDelete(row);
            }}
            aria-label={`Delete ${row.name}`}
          >
            <TrashIcon className="w-4 h-4" />
          </NBButton>
        </div>
      ),
    },
  ];

  // Handle delete success
  const handleDeleteSuccess = () => {
    setUserToDelete(null);
    // Success toast would go here
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setSearch('');
    setRoleFilter('');
    setPage(1);
  };

  const hasFilters = search || roleFilter;
  const users = data?.data || [];
  const totalPages = data?.meta.totalPages || 1;
  const total = data?.meta.total || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Users</h1>
          <p className="text-sm text-nb-gray-600 mt-1">
            Kelola data user dan hak akses
          </p>
        </div>
        <NBButton
          variant="primary"
          onClick={() => router.push('/users/new')}
          leftIcon={<PlusIcon className="w-5 h-5" />}
        >
          Tambah User
        </NBButton>
      </div>

      {/* Filters */}
      <div className="bg-nb-white border-3 border-nb-black shadow-nb-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <NBInput
              label="Cari User"
              placeholder="Cari berdasarkan nama atau email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              leftIcon={<MagnifyingGlassIcon className="w-5 h-5" />}
            />
          </div>

          {/* Role Filter */}
          <NBSelect
            label="Filter Role"
            options={roleOptions}
            value={roleFilter}
            onChange={(value) => {
              setRoleFilter(value as string);
              setPage(1);
            }}
          />
        </div>

        {/* Clear Filters */}
        {hasFilters && (
          <div className="mt-4">
            <NBButton variant="secondary" size="sm" onClick={handleClearFilters}>
              Clear Filters
            </NBButton>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-nb-danger/10 border-2 border-nb-danger px-4 py-3">
          <p className="text-sm text-nb-danger font-medium">
            Gagal memuat data user. Silakan coba lagi.
          </p>
        </div>
      )}

      {/* Table */}
      <div className="bg-nb-white border-3 border-nb-black shadow-nb-sm">
        <NBTable
          columns={columns}
          data={users}
          loading={isLoading}
          emptyText={
            hasFilters
              ? 'Tidak ada user yang sesuai dengan filter'
              : 'Belum ada user. Klik tombol "Tambah User" untuk membuat user baru.'
          }
          rowKey="id"
        />

        {/* Pagination */}
        {!isLoading && users.length > 0 && (
          <div className="px-6 py-4 border-t-2 border-nb-black flex items-center justify-between">
            <div className="text-sm text-nb-gray-600">
              Menampilkan {users.length} dari {total} user
            </div>
            <div className="flex items-center gap-2">
              <NBButton
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </NBButton>
              <span className="text-sm font-medium px-3">
                Halaman {page} dari {totalPages}
              </span>
              <NBButton
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </NBButton>
            </div>
          </div>
        )}
      </div>

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
