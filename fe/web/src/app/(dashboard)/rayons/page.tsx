/**
 * Rayons List Page — 7 rayon master data on the standardized DataTable.
 * Access: Admin System / Superadmin / TopManagement only.
 */

'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Eye } from 'lucide-react';

import { useAuth } from '@/lib/auth/hooks';
import { useRayonsWithStats } from '@/lib/api/rayons';
import { formatArea } from '@/lib/utils/geo';
import type { Rayon, RayonStats } from '@/types/models';
import {
  Badge,
  DataTable,
  PageHeader,
  Spinner,
  type ColumnDef,
  type DataTableRowAction,
} from '@/components/ui';

const ALLOWED_ROLES = ['admin_system', 'superadmin', 'top_management'];

type RayonRow = Rayon & Omit<RayonStats, 'rayon_id'>;

export default function RayonsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { rayons, stats, isLoading } = useRayonsWithStats();

  const allowed = !!user && ALLOWED_ROLES.includes(user.role);

  // Access control: redirect unauthorized roles to the dashboard home.
  useEffect(() => {
    if (!authLoading && user && !allowed) router.push('/');
  }, [user, authLoading, allowed, router]);

  const rows = useMemo<RayonRow[]>(
    () =>
      rayons.map((rayon) => {
        const s = stats.find((st) => st.rayon_id === rayon.id);
        return {
          ...rayon,
          total_areas: s?.total_areas ?? 0,
          total_users: s?.total_users ?? 0,
          active_users: s?.active_users ?? 0,
          total_coverage_area: s?.total_coverage_area ?? 0,
        };
      }),
    [rayons, stats]
  );

  const columns = useMemo<ColumnDef<RayonRow>[]>(
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
        id: 'code',
        accessorKey: 'code',
        header: 'Kode',
        enableSorting: true,
        meta: { label: 'Kode', filterVariant: 'text' },
        cell: ({ row }) => (
          <Badge variant="outline" size="sm">
            {row.original.code}
          </Badge>
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
        id: 'total_areas',
        accessorKey: 'total_areas',
        header: 'Area',
        enableSorting: true,
        meta: { label: 'Area', filterVariant: 'number', align: 'right' },
        cell: ({ row }) => <span className="tabular-nums">{row.original.total_areas}</span>,
      },
      {
        id: 'total_users',
        accessorKey: 'total_users',
        header: 'Petugas',
        enableSorting: true,
        meta: { label: 'Petugas', filterVariant: 'number', align: 'right' },
        cell: ({ row }) => <span className="tabular-nums">{row.original.total_users}</span>,
      },
      {
        id: 'active_users',
        accessorKey: 'active_users',
        header: 'Petugas Aktif',
        enableSorting: true,
        meta: { label: 'Petugas Aktif', filterVariant: 'number', align: 'right' },
        cell: ({ row }) => <span className="tabular-nums">{row.original.active_users}</span>,
      },
      {
        id: 'total_coverage_area',
        accessorKey: 'total_coverage_area',
        header: 'Luas Cakupan',
        enableSorting: true,
        meta: { label: 'Luas Cakupan', filterVariant: 'number', align: 'right' },
        cell: ({ row }) => (
          <span className="tabular-nums text-nb-gray-600">
            {formatArea(row.original.total_coverage_area)}
          </span>
        ),
      },
    ],
    []
  );

  const rowActions = useCallback(
    (r: RayonRow): DataTableRowAction<RayonRow>[] => [
      { key: 'view', label: 'Lihat', icon: Eye, onClick: () => router.push(`/rayons/${r.id}`) },
    ],
    [router]
  );

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center" aria-busy="true">
        <Spinner label="Memuat..." />
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rayon"
        description="Kelola dan monitor 7 rayon di Kota Surabaya"
      />

      <DataTable
        columns={columns}
        data={rows}
        loading={isLoading}
        getRowId={(r) => r.id}
        searchPlaceholder="Cari rayon…"
        onRowClick={(r) => router.push(`/rayons/${r.id}`)}
        rowActions={rowActions}
        emptyTitle="Tidak ada rayon"
        emptyDescription="Belum ada rayon yang terdaftar dalam sistem."
      />
    </div>
  );
}
