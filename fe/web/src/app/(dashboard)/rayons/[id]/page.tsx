/**
 * Rayon Detail Page
 * Display rayon information, statistics, and list of areas
 * Access: Admin + TopManagement only
 */

'use client';

import { useAuth } from '@/lib/auth/hooks';
import { useRayon, useRayonStats, useRayonAreas } from '@/lib/api/rayons';
import RayonStatsCards from '@/components/rayons/RayonStatsCards';
import { Card, CardHeader, CardContent, Badge, FormInput, Button, DataTable } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Area } from '@/types/models';
import { formatArea } from '@/lib/utils/geo';
import type { ColumnDef } from '@/components/ui/data-table';

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
  const columns: ColumnDef<Area>[] = [
    {
      key: 'name',
      header: 'Nama Area',
      cell: (area) => (
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
      header: 'Kode',
      cell: (area) => (
        <Badge variant="default" size="sm">
          {area.code}
        </Badge>
      ),
    },
    {
      key: 'area_type',
      header: 'Tipe',
      cell: (area) => area.area_type?.name || '-',
    },
    {
      key: 'coverage_area',
      header: 'Luas Tutupan',
      cell: (area) =>
        area.coverage_area ? formatArea(area.coverage_area) : '-',
    },
    {
      key: 'description',
      header: 'Deskripsi',
      cell: (area) => (
        <span className="text-sm text-nb-gray-600 line-clamp-1">
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/rayons')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Kembali ke Daftar Rayon
        </Button>
      </div>

      {/* Rayon Info Header */}
      {rayonLoading ? (
        <div className="mb-8">
          <div className="animate-pulse">
            <div className="h-8 bg-nb-gray-200 w-1/3 mb-2"></div>
            <div className="h-4 bg-nb-gray-200 w-1/4 mb-4"></div>
          </div>
        </div>
      ) : rayon ? (
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-nb-black mb-2">
                {rayon.name}
              </h1>
              <Badge variant="default" size="lg">
                {rayon.code}
              </Badge>
            </div>
          </div>
          {rayon.description && (
            <p className="text-nb-gray-600 max-w-3xl">
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
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-nb-black">
                Daftar Area di Rayon Ini
              </h2>
              {stats && (
                <Badge variant="default">
                  {stats.total_areas} Area
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {/* Search */}
            <div className="mb-4">
              <FormInput
                label="Cari Area"
                type="text"
                placeholder="Cari area berdasarkan nama atau kode..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1); // Reset to first page
                }}
                leftIcon={<Search className="w-5 h-5" />}
              />
            </div>

            {/* Table */}
            <DataTable<Area>
              columns={columns}
              data={areas}
              loading={areasLoading}
              emptyMessage="Tidak ada area di rayon ini"
            />

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t-3 border-nb-black">
                <div className="text-sm text-nb-gray-600">
                  Halaman {pagination.page} dari {pagination.totalPages} (
                  {pagination.total} total area)
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={pagination.page === 1}
                    leftIcon={<ChevronLeft className="w-4 h-4" />}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setPage(p => Math.min(pagination.totalPages, p + 1))
                    }
                    disabled={pagination.page === pagination.totalPages}
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
