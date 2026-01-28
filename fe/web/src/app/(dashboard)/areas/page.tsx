'use client';

/**
 * Areas List Page
 * Displays all areas with filtering and actions
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NBButton, NBInput, NBSelect } from '@/components/nb';
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
    rayon_id: '',
    area_type_id: '',
    page: 1,
    limit: 12,
  });
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    area: Area | null;
  }>({ isOpen: false, area: null });

  // Fetch data
  const { data: areasData, isLoading, error } = useAreas(filters);
  const { data: rayonsData } = useRayons();
  const { data: areaTypes } = useAreaTypes();

  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.role === 'top_management';

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
          <div className="h-10 w-48 bg-gray-200 border-4 border-black rounded animate-pulse" />
          <div className="h-12 w-32 bg-gray-200 border-4 border-black rounded animate-pulse" />
        </div>

        {/* Filters Skeleton */}
        <div className="flex gap-3">
          <div className="h-12 flex-1 bg-gray-200 border-4 border-black rounded animate-pulse" />
          <div className="h-12 w-48 bg-gray-200 border-4 border-black rounded animate-pulse" />
          <div className="h-12 w-48 bg-gray-200 border-4 border-black rounded animate-pulse" />
        </div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-96 bg-gray-200 border-4 border-black rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-red-100 border-4 border-black p-8 rounded-lg text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="font-bold text-lg mb-2">Error Memuat Data</h3>
          <p className="text-sm text-gray-600 mb-4">
            {error instanceof Error ? error.message : 'Terjadi kesalahan'}
          </p>
          <NBButton onClick={() => window.location.reload()} variant="primary">
            Coba Lagi
          </NBButton>
        </div>
      </div>
    );
  }

  const areas = areasData?.data || [];
  const totalAreas = areasData?.meta.total || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black">Area Kerja</h1>
          <p className="text-gray-600 mt-1">
            Kelola area kerja dan batas wilayah
          </p>
        </div>

        {isAdmin && (
          <NBButton onClick={handleCreateNew} variant="primary">
            ➕ Tambah Area
          </NBButton>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border-4 border-black p-4 rounded-lg">
        <div className="flex gap-3 flex-wrap items-end">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <NBInput
              label="Cari Area"
              placeholder="🔍 Cari nama atau kode area..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          {/* Rayon Filter */}
          <div className="w-48">
            <NBSelect
              label="Filter Rayon"
              options={[
                { value: '', label: 'Semua Rayon', disabled: false },
                ...(rayonsData?.map((rayon) => ({
                  value: rayon.id,
                  label: rayon.name,
                  disabled: false,
                })) || []),
              ]}
              value={filters.rayon_id}
              onChange={(value) => handleRayonChange(value as string)}
            />
          </div>

          {/* Area Type Filter */}
          <div className="w-48">
            <NBSelect
              label="Filter Tipe"
              options={[
                { value: '', label: 'Semua Tipe', disabled: false },
                ...(areaTypes?.map((type) => ({
                  value: type.id,
                  label: type.name,
                  disabled: false,
                })) || []),
              ]}
              value={filters.area_type_id}
              onChange={(value) => handleAreaTypeChange(value as string)}
            />
          </div>

          {/* View Toggle */}
          <div className="flex gap-2">
            <NBButton
              onClick={() => setViewMode('grid')}
              variant={viewMode === 'grid' ? 'primary' : 'secondary'}
              size="sm"
            >
              🔲 Grid
            </NBButton>
            <NBButton
              onClick={() => setViewMode('table')}
              variant={viewMode === 'table' ? 'primary' : 'secondary'}
              size="sm"
            >
              📋 Tabel
            </NBButton>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-3 text-sm text-gray-600">
          Menampilkan <strong>{areas.length}</strong> dari{' '}
          <strong>{totalAreas}</strong> area
        </div>
      </div>

      {/* Content */}
      {areas.length === 0 ? (
        // Empty state
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">🗺️</div>
            <h3 className="font-bold text-xl mb-2">Belum Ada Area</h3>
            <p className="text-gray-600 mb-6">
              {filters.search || filters.rayon_id || filters.area_type_id
                ? 'Tidak ada area yang sesuai dengan filter.'
                : 'Mulai dengan menambahkan area kerja pertama.'}
            </p>
            {isAdmin && !filters.search && !filters.rayon_id && !filters.area_type_id && (
              <NBButton onClick={handleCreateNew} variant="primary">
                ➕ Tambah Area Pertama
              </NBButton>
            )}
          </div>
        </div>
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
        <div className="bg-white border-4 border-black p-8 rounded-lg text-center">
          <p className="text-gray-600">Table view coming soon...</p>
        </div>
      )}

      {/* Delete Modal */}
      <DeleteAreaModal
        area={deleteModal.area}
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, area: null })}
        onSuccess={() => {
          // Refresh will happen automatically due to query invalidation
          setDeleteModal({ isOpen: false, area: null });
        }}
      />
    </div>
  );
}
