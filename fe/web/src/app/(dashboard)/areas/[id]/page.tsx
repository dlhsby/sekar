'use client';

/**
 * Area Detail Page
 * View area information with map
 */

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Trash2, Map as MapIcon } from 'lucide-react';
import { Button, Badge, Card, CardContent, CardHeader } from '@/components/ui';
import { GoogleBoundaryEditor } from '@/components/maps/GoogleBoundaryEditor';
import { DeleteAreaModal } from '@/components/areas/DeleteAreaModal';
import { AreaFormModal } from '@/components/areas/AreaFormModal';
import { AreaWorkersCard } from '@/components/areas/AreaWorkersCard';
import { useArea, useAreaBoundary, useUpdateAreaBoundary } from '@/lib/api/areas';
import { useAuth } from '@/lib/auth/hooks';
import { formatArea, formatCoordinates } from '@/lib/utils/geo';

export default function AreaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { data: area, isLoading, error } = useArea(id);
  const [deleteModal, setDeleteModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editingBoundary, setEditingBoundary] = useState(false);
  const [boundaryDraft, setBoundaryDraft] = useState<GeoJSON.Polygon | null>(null);

  const isAdmin =
    user?.role === 'admin_system' || user?.role === 'superadmin' || user?.role === 'top_management';

  // Worker assignment matches the backend gate (USER_MANAGERS + kepala_rayon).
  const canManageWorkers =
    user?.role === 'admin_system' || user?.role === 'superadmin' || user?.role === 'kepala_rayon';

  const { data: boundaryData } = useAreaBoundary(id);
  const { mutate: updateBoundary, isPending: isSavingBoundary } = useUpdateAreaBoundary();

  const handleSaveBoundary = () => {
    updateBoundary(
      { id, data: { boundary_polygon: boundaryDraft } },
      {
        onSuccess: () => {
          setEditingBoundary(false);
          setBoundaryDraft(null);
        },
      }
    );
  };

  // Center pin for the read-only map + boundary editor reference.
  const areaCenter =
    area?.gps_lat != null && area?.gps_lng != null
      ? { lat: Number(area.gps_lat), lng: Number(area.gps_lng) }
      : null;

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-12 w-64 bg-nb-gray-200 border-2 border-nb-black animate-pulse" />
        <div className="h-96 bg-nb-gray-200 border-2 border-nb-black animate-pulse" />
        <div className="grid grid-cols-2 gap-6">
          <div className="h-48 bg-nb-gray-200 border-2 border-nb-black animate-pulse" />
          <div className="h-48 bg-nb-gray-200 border-2 border-nb-black animate-pulse" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !area) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="border-nb-danger">
          <CardContent className="p-8 text-center max-w-md">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="font-bold text-lg mb-2">Area Tidak Ditemukan</h3>
            <p className="text-sm text-nb-gray-600 mb-4">
              Area yang Anda cari tidak ditemukan atau telah dihapus.
            </p>
            <Button onClick={() => router.push('/areas')}>Kembali ke Daftar Area</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex-1">
          <nav aria-label="Navigasi breadcrumb" className="flex items-center gap-3 mb-2">
            <Button
              onClick={() => router.push('/areas')}
              variant="secondary"
              size="sm"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Kembali
            </Button>
          </nav>
          <h1 className="text-3xl font-black">{area.name}</h1>

          {/* Badges */}
          <div className="flex items-center gap-2 mt-3">
            {area.rayon && <Badge variant="default">📍 {area.rayon.name}</Badge>}
            {area.areaType && (
              <Badge variant={area.areaType.category === 'ACTIVE' ? 'success' : 'warning'}>
                {area.areaType.name}
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        {isAdmin && (
          <div className="flex gap-3">
            <Button
              onClick={() => setEditModal(true)}
              variant="secondary"
              leftIcon={<Edit className="w-4 h-4" />}
            >
              Edit
            </Button>
            <Button
              onClick={() => setDeleteModal(true)}
              variant="destructive"
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Hapus
            </Button>
          </div>
        )}
      </div>

      {/* Map */}
      <Card variant="elevated" className="overflow-hidden">
        <CardHeader className="bg-nb-gray-100">
          <h2 className="font-bold text-lg">Peta Area</h2>
        </CardHeader>
        <CardContent className="p-4">
          <div aria-label="Peta area">
            <GoogleBoundaryEditor
              readonly
              initialPolygon={area.boundary_polygon}
              pin={areaCenter}
              height={480}
              manualFallback={
                <div className="border-2 border-nb-black bg-nb-gray-100 p-6 text-center">
                  <p className="text-nb-body-sm text-nb-gray-700">Peta tidak tersedia.</p>
                </div>
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card variant="elevated">
          <CardHeader className="bg-nb-gray-100">
            <h2 className="font-bold text-lg">Informasi Dasar</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="font-bold text-nb-gray-700">Nama:</span>
              <span>{area.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-nb-gray-700">Rayon:</span>
              <span>{area.rayon?.name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-nb-gray-700">Tipe Area:</span>
              <span>{area.areaType?.name || '-'}</span>
            </div>
            {area.address && (
              <div>
                <div className="font-bold text-nb-gray-700 mb-1">Alamat:</div>
                <p className="text-sm text-nb-gray-600">{area.address}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coverage Info */}
        <Card variant="elevated">
          <CardHeader className="bg-nb-gray-100">
            <h2 className="font-bold text-lg">Informasi Luas</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Coverage Area */}
            {area.coverage_area && (
              <div className="bg-nb-warning/20 border-2 border-nb-black p-4">
                <div className="text-sm font-bold text-nb-gray-700 mb-1">Luas Area</div>
                <div className="text-3xl font-black">{formatArea(area.coverage_area)}</div>
              </div>
            )}

            {/* Center Coordinates */}
            {area.gps_lat && area.gps_lng && (
              <div>
                <div className="font-bold text-nb-gray-700 mb-2">Koordinat Pusat:</div>
                <div className="bg-nb-gray-100 border-2 border-nb-black p-3 font-mono text-sm">
                  {formatCoordinates(Number(area.gps_lng), Number(area.gps_lat))}
                </div>
              </div>
            )}

            {/* Radius (if applicable) */}
            {area.radius_meters && (
              <div className="flex justify-between">
                <span className="font-bold text-nb-gray-700">Radius:</span>
                <span>{area.radius_meters} meter</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assigned workers roster + assign/remove (ADR-013) */}
      <AreaWorkersCard areaId={id} canManage={canManageWorkers} />

      {/* Boundary Section (Phase 2D) */}
      <Card variant="elevated">
        <CardHeader className="bg-nb-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <MapIcon className="w-5 h-5" />
              Batas Area (Boundary)
            </h2>
            {isAdmin && !editingBoundary && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Edit className="w-4 h-4" />}
                onClick={() => {
                  setBoundaryDraft(boundaryData?.boundary_polygon ?? null);
                  setEditingBoundary(true);
                }}
              >
                {boundaryData?.boundary_polygon ? 'Edit Boundary' : 'Tambah Boundary'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editingBoundary ? (
            <div className="space-y-4">
              <GoogleBoundaryEditor
                initialPolygon={boundaryDraft}
                onPolygonChange={setBoundaryDraft}
                pin={areaCenter}
                height={480}
                manualFallback={
                  <div className="border-2 border-nb-black bg-nb-gray-100 p-6 text-center">
                    <p className="text-nb-body-sm text-nb-gray-700">
                      Peta tidak tersedia — batas tidak dapat digambar tanpa Google Maps.
                    </p>
                  </div>
                }
              />
              <div className="flex gap-3">
                <Button
                  onClick={handleSaveBoundary}
                  loading={isSavingBoundary}
                  disabled={isSavingBoundary}
                >
                  Simpan Boundary
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditingBoundary(false);
                    setBoundaryDraft(null);
                  }}
                  disabled={isSavingBoundary}
                >
                  Batal
                </Button>
              </div>
            </div>
          ) : boundaryData?.boundary_polygon ? (
            <div className="flex items-center gap-3 text-sm text-nb-gray-600">
              <span>
                Polygon aktif dengan{' '}
                <strong>{boundaryData.boundary_polygon.coordinates[0].length - 1} titik</strong>
              </span>
              {boundaryData.coverage_area && (
                <span>· Luas: {formatArea(boundaryData.coverage_area)}</span>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-nb-gray-500">
              <MapIcon className="w-10 h-10 mx-auto mb-3 text-nb-gray-300" />
              <p className="font-semibold">Belum ada boundary polygon</p>
              <p className="text-sm mt-1">
                {isAdmin
                  ? 'Klik "Tambah Boundary" untuk menggambar batas area.'
                  : 'Boundary polygon belum dikonfigurasi.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Modal */}
      <DeleteAreaModal
        area={area}
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onSuccess={() => router.push('/areas')}
      />

      <AreaFormModal open={editModal} onOpenChange={setEditModal} area={area} />
    </div>
  );
}
