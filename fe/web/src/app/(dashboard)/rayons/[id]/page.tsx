/**
 * Rayon Detail Page — RAY-1 (Phase 4-R revamp)
 * Access: admin_system, superadmin, top_management, kepala_rayon
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search } from 'lucide-react';

import { useAuth } from '@/lib/auth/hooks';
import { useRayon, useRayonStats, useRayonAreas } from '@/lib/api/rayons';
import RayonStatsCards from '@/components/rayons/RayonStatsCards';
import {
  Card,
  CardContent,
  Button,
  FormInput,
  DataTable,
  PageHeader,
  StatusPill,
} from '@/components/ui';
import { Area } from '@/types/models';
import { formatArea } from '@/lib/utils/geo';
import type { ColumnDef } from '@/components/ui/data-table';

// Lowercase roles per ADR-009 (the prior PascalCase gate matched nothing and
// redirected every user to a non-existent /dashboard).
const ALLOWED_ROLES = ['admin_system', 'superadmin', 'top_management', 'kepala_rayon'];

interface RayonDetailPageProps {
  params: { id: string };
}

export default function RayonDetailPage({ params }: RayonDetailPageProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: rayon, isLoading: rayonLoading } = useRayon(params.id);
  const { data: stats, isLoading: statsLoading } = useRayonStats(params.id);
  const { data: areasData, isLoading: areasLoading } = useRayonAreas(params.id, {
    search,
    page,
    limit,
  });

  const allowed = !!user && ALLOWED_ROLES.includes(user.role);

  useEffect(() => {
    if (!authLoading && user && !allowed) {
      router.push('/');
    }
  }, [user, authLoading, allowed, router]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-nb-gray-600">Memuat...</p>
      </div>
    );
  }

  if (!allowed) return null;

  const areas = areasData?.data || [];
  const pagination = areasData?.meta;

  const columns: ColumnDef<Area>[] = [
    {
      key: 'name',
      header: 'Nama Area',
      cell: (area) => (
        <Link href={`/areas/${area.id}`} className="font-semibold text-nb-primary hover:underline">
          {area.name}
        </Link>
      ),
    },
    {
      key: 'area_type',
      header: 'Tipe',
      cell: (area) => <span className="text-nb-body-sm">{area.area_type?.name || '—'}</span>,
    },
    {
      key: 'coverage_area',
      header: 'Luas Tutupan',
      cell: (area) => (
        <span className="font-mono text-nb-body-sm">
          {area.coverage_area ? formatArea(area.coverage_area) : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: () => (
        <StatusPill tone="ok" dot>
          Aktif
        </StatusPill>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={rayonLoading ? 'Memuat…' : `Rayon ${rayon?.name ?? ''}`}
        description={rayon?.description || undefined}
        actions={
          stats ? <StatusPill tone="neutral">{stats.total_users} petugas</StatusPill> : undefined
        }
      />

      {/* KPI strip */}
      <RayonStatsCards stats={stats} loading={statsLoading} />

      {/* Areas list */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-4">
            <FormInput
              label="Cari area"
              type="text"
              placeholder="Cari area berdasarkan nama atau kode…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              leftIcon={<Search className="w-5 h-5" />}
            />
          </div>

          <DataTable<Area>
            columns={columns}
            data={areas}
            loading={areasLoading}
            emptyMessage="Tidak ada area di rayon ini"
          />

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between font-mono text-[11px] text-nb-gray-600">
              <span>
                Halaman <b className="text-nb-black">{pagination.page}</b> / {pagination.totalPages} ·{' '}
                {pagination.total} area
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page === 1}
                >
                  ‹
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page === pagination.totalPages}
                >
                  ›
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
