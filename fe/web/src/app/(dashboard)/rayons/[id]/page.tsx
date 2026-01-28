/**
 * Rayon Detail Page
 * Display rayon information, statistics, and list of areas
 * Access: Admin + TopManagement only
 */

'use client';

import { useAuth } from '@/lib/auth/hooks';
import { useRayon, useRayonStats, useRayonAreas } from '@/lib/api/rayons';
import RayonStatsCards from '@/components/rayons/RayonStatsCards';
import { NBCard, NBCardHeader, NBCardContent, NBBadge, NBTable, NBInput } from '@/components/nb';
import { NBTableColumn } from '@/components/nb/NBTable';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Area } from '@/types/models';
import { formatArea } from '@/lib/utils/geo';

interface RayonDetailPageProps {
  params: {
    id: string;
  };
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

  // Access control: Only Admin and TopManagement
  useEffect(() => {
    if (!authLoading && user && !['Admin', 'TopManagement'].includes(user.role)) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-nb-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  // Access denied for non-authorized roles
  if (!['Admin', 'TopManagement'].includes(user.role)) {
    return null;
  }

  const areas = areasData?.data || [];
  const pagination = areasData?.meta;

  // Table columns
  const columns: NBTableColumn<Area>[] = [
    {
      key: 'name',
      title: 'Nama Area',
      render: (_value: unknown, area: Area) => (
        <Link
          href={`/areas/${area.id}`}
          className="text-nb-primary font-semibold hover:underline"
        >
          {area.name}
        </Link>
      ),
    },
    {
      key: 'code',
      title: 'Kode',
      render: (_value: unknown, area: Area) => (
        <NBBadge variant="primary" size="sm">
          {area.code}
        </NBBadge>
      ),
    },
    {
      key: 'area_type',
      title: 'Tipe',
      render: (_value: unknown, area: Area) => area.area_type?.name || '-',
    },
    {
      key: 'coverage_area',
      title: 'Luas Tutupan',
      render: (_value: unknown, area: Area) =>
        area.coverage_area ? formatArea(area.coverage_area) : '-',
    },
    {
      key: 'description',
      title: 'Deskripsi',
      render: (_value: unknown, area: Area) => (
        <span className="text-sm text-gray-600 line-clamp-1">
          {area.description || '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="container mx-auto p-6">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm">
        <ol className="flex items-center space-x-2">
          <li>
            <Link
              href="/rayons"
              className="text-nb-primary hover:underline font-semibold"
            >
              Rayon
            </Link>
          </li>
          <li className="text-gray-400">/</li>
          <li className="text-gray-600">
            {rayonLoading ? 'Memuat...' : rayon?.name || 'Detail'}
          </li>
        </ol>
      </nav>

      {/* Back Button */}
      <div className="mb-6">
        <Link
          href="/rayons"
          className="inline-flex items-center text-nb-primary font-semibold hover:underline"
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Kembali ke Daftar Rayon
        </Link>
      </div>

      {/* Rayon Info Header */}
      {rayonLoading ? (
        <div className="mb-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          </div>
        </div>
      ) : rayon ? (
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-nb-black mb-2">
                {rayon.name}
              </h1>
              <NBBadge variant="primary" size="lg">
                {rayon.code}
              </NBBadge>
            </div>
          </div>
          {rayon.description && (
            <p className="text-gray-600 max-w-3xl">
              {rayon.description}
            </p>
          )}
        </div>
      ) : null}

      {/* Statistics Cards */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-nb-black mb-4">Statistik</h2>
        <RayonStatsCards stats={stats} loading={statsLoading} />
      </div>

      {/* Areas List */}
      <div>
        <NBCard variant="elevated">
          <NBCardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-nb-black">
                Daftar Area di Rayon Ini
              </h2>
              {stats && (
                <NBBadge variant="primary">
                  {stats.total_areas} Area
                </NBBadge>
              )}
            </div>
          </NBCardHeader>

          <NBCardContent>
            {/* Search */}
            <div className="mb-4">
              <NBInput
                label="Cari Area"
                type="text"
                placeholder="Cari area berdasarkan nama atau kode..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1); // Reset to first page
                }}
                leftIcon={
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                }
              />
            </div>

            {/* Table */}
            <NBTable<Area>
              columns={columns}
              data={areas}
              loading={areasLoading}
              emptyText="Tidak ada area di rayon ini"
            />

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t-3 border-black">
                <div className="text-sm text-gray-600">
                  Halaman {pagination.page} dari {pagination.totalPages} (
                  {pagination.total} total area)
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={pagination.page === 1}
                    className="px-4 py-2 border-3 border-black bg-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 active:translate-x-[2px] active:translate-y-[2px] transition-all"
                  >
                    Sebelumnya
                  </button>
                  <button
                    onClick={() =>
                      setPage(p => Math.min(pagination.totalPages, p + 1))
                    }
                    disabled={pagination.page === pagination.totalPages}
                    className="px-4 py-2 border-3 border-black bg-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 active:translate-x-[2px] active:translate-y-[2px] transition-all"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </NBCardContent>
        </NBCard>
      </div>
    </div>
  );
}
