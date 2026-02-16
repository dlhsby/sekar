'use client';

/**
 * Areas List Page
 * Displays all areas with filtering and actions
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, LayoutGrid, Table as TableIcon, Search } from 'lucide-react';
import {
  Button,
  FormInput,
  FormSelect,
  Card,
  CardContent,
  Skeleton,
  SkeletonCard,
  EmptyState,
} from '@/components/ui';
import { AreaCard } from '@/components/areas/AreaCard';
import { DeleteAreaModal } from '@/components/areas/DeleteAreaModal';
import { useAreas } from '@/lib/api/areas';
import { useRayons } from '@/lib/api/rayons';
import { useAreaTypes } from '@/lib/api/area-types';
import { useAuth } from '@/lib/auth/hooks';
import type { Area, AreaFilters } from '@/types/models';

type ViewMode = 'grid' | 'table';

export default function AreasPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filters, setFilters] = useState<AreaFilters>({
    search: '',
    rayon_id: 'all',
    area_type_id: 'all',
    page: 1,
    limit: 12,
  });
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    area: Area | null;
  }>({ isOpen: false, area: null });

  // Fetch data
  const {
    data: areasData,
    isLoading,
    error,
  } = useAreas({
    ...filters,
    rayon_id: filters.rayon_id !== 'all' ? filters.rayon_id : undefined,
    area_type_id: filters.area_type_id !== 'all' ? filters.area_type_id : undefined,
  });
  const { data: rayonsData } = useRayons();
  const { data: areaTypes } = useAreaTypes();

  // Check if user is admin
  const isAdmin = user?.role === 'admin_system' || user?.role === 'superadmin' || user?.role === 'top_management';

  // Handle filter changes
  const handleSearchChange = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value, page: 1 }));
  };

  const handleRayonChange = (value: string) => {
    setFilters((prev) => ({ ...prev, rayon_id: value, page: 1 }));
  };

  const handleAreaTypeChange = (value: string) => {
    setFilters((prev) => ({ ...prev, area_type_id: value, page: 1 }));
  };

  // Handle actions
  const handleView = (area: Area) => {
    router.push(`/areas/${area.id}`);
  };

  const handleEdit = (area: Area) => {
    router.push(`/areas/${area.id}/edit`);
  };

  const handleDelete = (area: Area) => {
    setDeleteModal({ isOpen: true, area });
  };

  const handleCreateNew = () => {
    router.push('/areas/new');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton variant="heading" className="w-48" />
          <Skeleton variant="button" className="w-32" />
        </div>

        {/* Filters Skeleton */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Skeleton className="h-12 flex-1" />
              <Skeleton className="h-12 w-48" />
              <Skeleton className="h-12 w-48" />
            </div>
          </CardContent>
        </Card>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <EmptyState
          variant="error"
          description={
            error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat data.'
          }
          action={{
            label: 'Coba Lagi',
            onClick: () => window.location.reload(),
          }}
        />
      </div>
    );
  }

  const areas = areasData?.data || [];
  const totalAreas = areasData?.meta?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black">Area Kerja</h1>
          <p className="text-nb-gray-600 mt-1">Kelola area kerja dan batas wilayah</p>
        </div>

        {isAdmin && (
          <Button onClick={handleCreateNew} leftIcon={<Plus className="w-5 h-5" />}>
            Tambah Area
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 flex-wrap items-end">
            {/* Search */}
            <div className="flex-1 min-w-0">
              <FormInput
                label="Cari Area"
                placeholder="Cari nama atau kode area..."
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                leftIcon={<Search className="w-5 h-5" />}
              />
            </div>

            {/* Rayon Filter */}
            <div className="w-full sm:w-48">
              <FormSelect
                label="Filter Rayon"
                options={[
                  { value: 'all', label: 'Semua Rayon' },
                  ...(rayonsData?.map((rayon) => ({
                    value: rayon.id,
                    label: rayon.name,
                  })) || []),
                ]}
                value={filters.rayon_id}
                onChange={(value) => handleRayonChange(value)}
              />
            </div>

            {/* Area Type Filter */}
            <div className="w-full sm:w-48">
              <FormSelect
                label="Filter Tipe"
                options={[
                  { value: 'all', label: 'Semua Tipe' },
                  ...(areaTypes?.map((type) => ({
                    value: type.id,
                    label: type.name,
                  })) || []),
                ]}
                value={filters.area_type_id}
                onChange={(value) => handleAreaTypeChange(value)}
              />
            </div>

            {/* View Toggle */}
            <div className="flex gap-2">
              <Button
                onClick={() => setViewMode('grid')}
                variant={viewMode === 'grid' ? 'default' : 'secondary'}
                size="sm"
              >
                <LayoutGrid className="w-4 h-4 mr-1" />
                Grid
              </Button>
              <Button
                onClick={() => setViewMode('table')}
                variant={viewMode === 'table' ? 'default' : 'secondary'}
                size="sm"
              >
                <TableIcon className="w-4 h-4 mr-1" />
                Tabel
              </Button>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-3 text-sm text-nb-gray-600">
            Menampilkan <strong>{areas.length}</strong> dari <strong>{totalAreas}</strong> area
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {areas.length === 0 ? (
        // Empty state
        <EmptyState
          variant={
            filters.search || filters.rayon_id !== 'all' || filters.area_type_id !== 'all'
              ? 'noResults'
              : 'noData'
          }
          title={
            filters.search || filters.rayon_id !== 'all' || filters.area_type_id !== 'all'
              ? 'Area Tidak Ditemukan'
              : 'Belum Ada Area'
          }
          description={
            filters.search || filters.rayon_id !== 'all' || filters.area_type_id !== 'all'
              ? 'Tidak ada area yang sesuai dengan filter. Coba ubah kriteria pencarian.'
              : 'Mulai dengan menambahkan area kerja pertama.'
          }
          action={
            isAdmin &&
            !filters.search &&
            filters.rayon_id === 'all' &&
            filters.area_type_id === 'all'
              ? {
                  label: 'Tambah Area Pertama',
                  onClick: handleCreateNew,
                }
              : undefined
          }
        />
      ) : viewMode === 'grid' ? (
        // Grid view
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {areas.map((area) => (
            <AreaCard
              key={area.id}
              area={area}
              onView={handleView}
              onEdit={isAdmin ? handleEdit : undefined}
              onDelete={isAdmin ? handleDelete : undefined}
              showActions
            />
          ))}
        </div>
      ) : (
        // Table view (TODO: implement table view)
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-nb-gray-600">Table view coming soon...</p>
          </CardContent>
        </Card>
      )}

      {/* Delete Modal */}
      <DeleteAreaModal
        area={deleteModal.area}
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, area: null })}
        onSuccess={() => {
          setDeleteModal({ isOpen: false, area: null });
        }}
      />
    </div>
  );
}
