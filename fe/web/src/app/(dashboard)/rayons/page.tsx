/**
 * Rayons List Page — 7 rayon master data on the standardized DataTable.
 * Access: Admin System / Superadmin / TopManagement only.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye } from 'lucide-react';

import { useAuth } from '@/lib/auth/hooks';
import { useRayonsWithStats } from '@/lib/api/rayons';
import { useUsers } from '@/lib/api/users';
import { formatArea } from '@/lib/utils/geo';
import type { Rayon, RayonStats } from '@/types/models';
import {
  Badge,
  DataTable,
  PageHeader,
  Spinner,
  DetailModal,
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

  const [viewOpen, setViewOpen] = useState(false);
  const [viewingRayon, setViewingRayon] = useState<RayonRow | null>(null);

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
    (r: RayonRow): DataTableRowAction<RayonRow>[] => [
      {
        key: 'view',
        label: 'Lihat',
        icon: Eye,
        onClick: () => {
          setViewingRayon(r);
          setViewOpen(true);
        },
      },
    ],
    []
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

      <DetailModal
        open={viewOpen}
        onOpenChange={setViewOpen}
        title="Detail Rayon"
        rows={viewingRayon ? [
          { label: 'Kode', value: viewingRayon.code },
          { label: 'Nama', value: viewingRayon.name },
          { label: 'Area', value: viewingRayon.total_areas },
          { label: 'Petugas', value: viewingRayon.total_users },
          { label: 'Petugas Aktif', value: viewingRayon.active_users },
          { label: 'Luas Cakupan', value: formatArea(viewingRayon.total_coverage_area) },
          { label: 'Deskripsi', value: viewingRayon.description },
          { label: 'Dibuat oleh', value: actorName(viewingRayon.created_by) },
          { label: 'Diperbarui oleh', value: actorName(viewingRayon.updated_by) },
        ] : []}
      />
    </div>
  );
}
