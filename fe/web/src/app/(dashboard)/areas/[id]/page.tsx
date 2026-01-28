'use client';

/**
 * Area Detail Page
 * View area information with map
 */

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { NBButton, NBBadge, NBCard } from '@/components/nb';
import { Map } from '@/components/maps/Map';
import { DeleteAreaModal } from '@/components/areas/DeleteAreaModal';
import { useArea } from '@/lib/api/areas';
import { useAuth } from '@/lib/auth/hooks';
import { formatArea, formatCoordinates, polygonToFeature } from '@/lib/utils/geo';
import { polygonColors } from '@/lib/maps/styles';
import type mapboxgl from 'mapbox-gl';

export default function AreaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { data: area, isLoading, error } = useArea(id);
  const [deleteModal, setDeleteModal] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'top_management';

  // Handle map load - draw polygon
  const handleMapLoad = (map: mapboxgl.Map) => {
    if (!area?.boundary_polygon) return;

    // Add polygon source and layer
    map.addSource('area-polygon', {
      type: 'geojson',
      data: polygonToFeature(area.boundary_polygon),
    });

    // Add fill layer
    map.addLayer({
      id: 'area-fill',
      type: 'fill',
      source: 'area-polygon',
      paint: {
        'fill-color': polygonColors.fill,
        'fill-opacity': polygonColors.fillOpacity,
      },
    });

    // Add outline layer
    map.addLayer({
      id: 'area-outline',
      type: 'line',
      source: 'area-polygon',
      paint: {
        'line-color': polygonColors.stroke,
        'line-width': polygonColors.strokeWidth,
      },
    });

    // Fit bounds to polygon
    const coords = area.boundary_polygon.coordinates[0];
    const bounds = coords.reduce(
      (bounds, coord) => {
        return bounds.extend(coord as [number, number]);
      },
      new (map as any).constructor.LngLatBounds(coords[0], coords[0])
    );

    map.fitBounds(bounds, { padding: 50 });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-12 w-64 bg-gray-200 border-4 border-black rounded animate-pulse" />
        <div className="h-96 bg-gray-200 border-4 border-black rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 gap-6">
          <div className="h-48 bg-gray-200 border-4 border-black rounded-lg animate-pulse" />
          <div className="h-48 bg-gray-200 border-4 border-black rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !area) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-red-100 border-4 border-black p-8 rounded-lg text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="font-bold text-lg mb-2">Area Tidak Ditemukan</h3>
          <p className="text-sm text-gray-600 mb-4">
            Area yang Anda cari tidak ditemukan atau telah dihapus.
          </p>
          <NBButton onClick={() => router.push('/areas')} variant="primary">
            Kembali ke Daftar Area
          </NBButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <NBButton
              onClick={() => router.push('/areas')}
              variant="secondary"
              size="sm"
            >
              ← Kembali
            </NBButton>
          </div>
          <h1 className="text-3xl font-black">{area.name}</h1>
          <p className="text-gray-600 mt-1 font-mono">{area.code}</p>

          {/* Badges */}
          <div className="flex items-center gap-2 mt-3">
            {area.rayon && (
              <NBBadge variant="primary">📍 {area.rayon.name}</NBBadge>
            )}
            {area.area_type && (
              <NBBadge
                variant={
                  area.area_type.category === 'ACTIVE' ? 'success' : 'warning'
                }
              >
                {area.area_type.name}
              </NBBadge>
            )}
          </div>
        </div>

        {/* Actions */}
        {isAdmin && (
          <div className="flex gap-3">
            <NBButton
              onClick={() => router.push(`/areas/${area.id}/edit`)}
              variant="secondary"
            >
              ✏️ Edit
            </NBButton>
            <NBButton
              onClick={() => setDeleteModal(true)}
              variant="danger"
            >
              🗑️ Hapus
            </NBButton>
          </div>
        )}
      </div>

      {/* Map */}
      <NBCard variant="elevated" className="overflow-hidden">
        <div className="bg-gray-100 border-b-4 border-black p-4">
          <h2 className="font-bold text-lg">Peta Area</h2>
        </div>
        <div className="p-4">
          <Map
            center={[area.center_longitude, area.center_latitude]}
            zoom={15}
            className="h-[500px]"
            onLoad={handleMapLoad}
          />
        </div>
      </NBCard>

      {/* Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <NBCard variant="elevated">
          <div className="bg-gray-100 border-b-4 border-black p-4">
            <h2 className="font-bold text-lg">Informasi Dasar</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between">
              <span className="font-bold text-gray-700">Nama:</span>
              <span>{area.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-gray-700">Kode:</span>
              <span className="font-mono">{area.code}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-gray-700">Rayon:</span>
              <span>{area.rayon?.name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-gray-700">Tipe Area:</span>
              <span>{area.area_type?.name || '-'}</span>
            </div>
            {area.description && (
              <div>
                <div className="font-bold text-gray-700 mb-1">Deskripsi:</div>
                <p className="text-sm text-gray-600">{area.description}</p>
              </div>
            )}
          </div>
        </NBCard>

        {/* Coverage Info */}
        <NBCard variant="elevated">
          <div className="bg-gray-100 border-b-4 border-black p-4">
            <h2 className="font-bold text-lg">Informasi Luas</h2>
          </div>
          <div className="p-4 space-y-4">
            {/* Coverage Area */}
            {area.coverage_area && (
              <div className="bg-amber-100 border-4 border-black p-4 rounded-lg">
                <div className="text-sm font-bold text-gray-700 mb-1">
                  Luas Area
                </div>
                <div className="text-3xl font-black">
                  {formatArea(area.coverage_area)}
                </div>
              </div>
            )}

            {/* Center Coordinates */}
            <div>
              <div className="font-bold text-gray-700 mb-2">
                Koordinat Pusat:
              </div>
              <div className="bg-gray-100 border-4 border-black p-3 rounded font-mono text-sm">
                {formatCoordinates(area.center_longitude, area.center_latitude)}
              </div>
            </div>

            {/* Radius (if applicable) */}
            {area.radius_meters && (
              <div className="flex justify-between">
                <span className="font-bold text-gray-700">Radius:</span>
                <span>{area.radius_meters} meter</span>
              </div>
            )}
          </div>
        </NBCard>
      </div>

      {/* Staff Requirements Section (placeholder) */}
      <NBCard variant="outlined">
        <div className="bg-gray-100 border-b-4 border-black p-4">
          <h2 className="font-bold text-lg">Kebutuhan Tenaga Kerja</h2>
        </div>
        <div className="p-8 text-center text-gray-500">
          <p className="mb-4">
            Fitur kebutuhan tenaga kerja akan tersedia setelah staff
            requirements diimplementasikan.
          </p>
          {isAdmin && (
            <NBButton variant="secondary" disabled>
              ➕ Atur Kebutuhan Staff
            </NBButton>
          )}
        </div>
      </NBCard>

      {/* Delete Modal */}
      <DeleteAreaModal
        area={area}
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onSuccess={() => router.push('/areas')}
      />
    </div>
  );
}
