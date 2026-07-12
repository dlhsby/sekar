'use client';

/**
 * Location Detail Page
 * View area information with map
 */

import { useState, use } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Trash2, Map as MapIcon } from 'lucide-react';
import { Button, Badge, Card, CardContent, CardHeader } from '@/components/ui';
import { GoogleBoundaryEditor } from '@/components/maps/GoogleBoundaryEditor';
import { DeleteLocationModal } from '@/components/locations';
import { LocationFormModal } from '@/components/locations';
import { LocationWorkersCard } from '@/components/locations';
import { useLocation, useLocationBoundary, useUpdateLocationBoundary } from '@/lib/api/locations';
import { useAuth } from '@/lib/auth/hooks';
import { formatArea, formatCoordinates } from '@/lib/utils/geo';

export default function AreaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { data: area, isLoading, error } = useLocation(id);
  const [deleteModal, setDeleteModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editingBoundary, setEditingBoundary] = useState(false);
  const [boundaryDraft, setBoundaryDraft] = useState<GeoJSON.Polygon | null>(null);

  const isAdmin =
    user?.role === 'admin_system' || user?.role === 'superadmin' || user?.role === 'top_management';

  // Worker assignment matches the backend gate (USER_MANAGERS + kepala_rayon).
  // top_management has full admin_system parity.
  const canManageWorkers =
    user?.role === 'admin_system' ||
    user?.role === 'superadmin' ||
    user?.role === 'top_management' ||
    user?.role === 'kepala_rayon';

  const { data: boundaryData } = useLocationBoundary(id);
  const { mutate: updateBoundary, isPending: isSavingBoundary } = useUpdateLocationBoundary();

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
            <h3 className="font-bold text-lg mb-2">{t('admin:areas.detailTitle')}</h3>
            <p className="text-sm text-nb-gray-600 mb-4">
              {t('admin:areas.detailNotFound')}
            </p>
            <Button onClick={() => router.push('/locations')}>{t('common:actions.back')}</Button>
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
          <nav aria-label={t("common:nav.breadcrumbAria")} className="flex items-center gap-3 mb-2">
            <Button
              onClick={() => router.push('/locations')}
              variant="secondary"
              size="sm"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              {t('common:actions.back')}
            </Button>
          </nav>
          <h1 className="text-3xl font-black">{area.name}</h1>

          {/* Badges */}
          <div className="flex items-center gap-2 mt-3">
            {area.rayon && <Badge variant="default">📍 {area.rayon.name}</Badge>}
            {area.locationType && (
              <Badge variant={area.locationType.category === 'ACTIVE' ? 'success' : 'warning'}>
                {area.locationType.name}
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
            >{t("common:actions.edit")}</Button>
            <Button
              onClick={() => setDeleteModal(true)}
              variant="destructive"
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              {t('common:actions.delete')}
            </Button>
          </div>
        )}
      </div>

      {/* Map */}
      <Card variant="elevated" className="overflow-hidden">
        <CardHeader className="bg-nb-gray-100">
          <h2 className="font-bold text-lg">{t('admin:areas.mapTitle')}</h2>
        </CardHeader>
        <CardContent className="p-4">
          <div aria-label={t('monitoring:map.areaMapAriaLabel')}>
            <GoogleBoundaryEditor
              readonly
              initialPolygon={area.boundary_polygon}
              pin={areaCenter}
              height={480}
              manualFallback={
                <div className="border-2 border-nb-black bg-nb-gray-100 p-6 text-center">
                  <p className="text-nb-body-sm text-nb-gray-700">{t('admin:areas.mapUnavailable')}</p>
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
            <h2 className="font-bold text-lg">{t('admin:areas.basicInfoTitle')}</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="font-bold text-nb-gray-700">{t('admin:areas.detailName')}:</span>
              <span>{area.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-nb-gray-700">{t('admin:areas.detailRayon')}:</span>
              <span>{area.rayon?.name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-nb-gray-700">{t('admin:areas.detailType')}:</span>
              <span>{area.locationType?.name || '-'}</span>
            </div>
            {area.address && (
              <div>
                <div className="font-bold text-nb-gray-700 mb-1">{t('admin:areas.detailAddress')}:</div>
                <p className="text-sm text-nb-gray-600">{area.address}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coverage Info */}
        <Card variant="elevated">
          <CardHeader className="bg-nb-gray-100">
            <h2 className="font-bold text-lg">{t('admin:areas.coverageInfoTitle')}</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Coverage Location */}
            {area.coverage_area && (
              <div className="bg-nb-warning/20 border-2 border-nb-black p-4">
                <div className="text-sm font-bold text-nb-gray-700 mb-1">{t('admin:areas.coverageLabel')}</div>
                <div className="text-3xl font-black">{formatArea(area.coverage_area)}</div>
              </div>
            )}

            {/* Center Coordinates */}
            {area.gps_lat && area.gps_lng && (
              <div>
                <div className="font-bold text-nb-gray-700 mb-2">{t('admin:areas.coordinatesTitle')}</div>
                <div className="bg-nb-gray-100 border-2 border-nb-black p-3 font-mono text-sm">
                  {formatCoordinates(Number(area.gps_lng), Number(area.gps_lat))}
                </div>
              </div>
            )}

            {/* Radius (if applicable) */}
            {area.radius_meters && (
              <div className="flex justify-between">
                <span className="font-bold text-nb-gray-700">{t('admin:areas.radiusLabel')}:</span>
                <span>{area.radius_meters} {t('admin:areas.meterUnit')}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assigned workers roster + assign/remove (ADR-013) */}
      <LocationWorkersCard areaId={id} canManage={canManageWorkers} />

      {/* Boundary Section (Phase 2D) */}
      <Card variant="elevated">
        <CardHeader className="bg-nb-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <MapIcon className="w-5 h-5" />
              {t('admin:areas.boundaryTitle')}
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
                {boundaryData?.boundary_polygon ? t('admin:areas.editBoundaryBtn') : t('admin:areas.addBoundaryBtn')}
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
                      {t('admin:areas.boundaryMapUnavailable')}
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
                  {t('admin:areas.saveBoundary')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditingBoundary(false);
                    setBoundaryDraft(null);
                  }}
                  disabled={isSavingBoundary}
                >
                  {t('common:actions.cancel')}
                </Button>
              </div>
            </div>
          ) : boundaryData?.boundary_polygon ? (
            <div className="flex items-center gap-3 text-sm text-nb-gray-600">
              <span>
                {t('admin:areas.polygonActive')}{' '}
                <strong>{boundaryData.boundary_polygon.coordinates[0].length - 1} {t('admin:areas.pointsUnit')}</strong>
              </span>
              {boundaryData.coverage_area && (
                <span>· {t('admin:areas.coverageLabel')}: {formatArea(boundaryData.coverage_area)}</span>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-nb-gray-500">
              <MapIcon className="w-10 h-10 mx-auto mb-3 text-nb-gray-300" />
              <p className="font-semibold">{t('common:empty.noBoundary')}</p>
              <p className="text-sm mt-1">
                {isAdmin
                  ? t('admin:areas.addBoundaryHelper')
                  : t('admin:areas.boundaryNotConfigured')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Modal */}
      <DeleteLocationModal
        area={area}
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onSuccess={() => router.push('/locations')}
      />

      <LocationFormModal open={editModal} onOpenChange={setEditModal} area={area} />
    </div>
  );
}
