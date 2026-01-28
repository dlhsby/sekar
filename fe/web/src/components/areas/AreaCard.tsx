'use client';

/**
 * Area Card Component
 * Displays area information in grid view
 */

import { NBCard, NBBadge, NBButton } from '@/components/nb';
import { formatArea } from '@/lib/utils/geo';
import { getStaticMapUrl } from '@/lib/utils/static-map';
import type { Area } from '@/types/models';

export interface AreaCardProps {
  area: Area;
  onView?: (area: Area) => void;
  onEdit?: (area: Area) => void;
  onDelete?: (area: Area) => void;
  showActions?: boolean;
}

export function AreaCard({
  area,
  onView,
  onEdit,
  onDelete,
  showActions = true,
}: AreaCardProps) {
  // Get map preview image
  const mapUrl = getStaticMapUrl(
    [area.center_longitude, area.center_latitude],
    area.boundary_polygon,
    400,
    200
  );

  return (
    <NBCard variant="elevated" className="overflow-hidden">
      {/* Map Preview */}
      <div className="relative w-full h-48 bg-gray-100 border-b-4 border-black">
        <img
          src={mapUrl}
          alt={`Peta ${area.name}`}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <div>
          <h3 className="font-bold text-lg leading-tight mb-1">{area.name}</h3>
          <p className="text-sm text-gray-600 font-mono">{area.code}</p>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {area.rayon && (
            <NBBadge variant="primary" size="sm">
              📍 {area.rayon.name}
            </NBBadge>
          )}
          {area.area_type && (
            <NBBadge
              variant={area.area_type.category === 'ACTIVE' ? 'success' : 'warning'}
              size="sm"
            >
              {area.area_type.name}
            </NBBadge>
          )}
        </div>

        {/* Coverage Area */}
        {area.coverage_area && (
          <div className="bg-amber-100 border-2 border-black px-3 py-2 rounded">
            <div className="text-xs font-bold text-gray-700 mb-1">Luas Area</div>
            <div className="text-xl font-black">{formatArea(area.coverage_area)}</div>
          </div>
        )}

        {/* Description */}
        {area.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{area.description}</p>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 pt-2">
            <NBButton
              onClick={() => onView?.(area)}
              variant="primary"
              size="sm"
              className="flex-1"
            >
              👁️ Lihat
            </NBButton>
            {onEdit && (
              <NBButton
                onClick={() => onEdit(area)}
                variant="secondary"
                size="sm"
              >
                ✏️
              </NBButton>
            )}
            {onDelete && (
              <NBButton
                onClick={() => onDelete(area)}
                variant="danger"
                size="sm"
              >
                🗑️
              </NBButton>
            )}
          </div>
        )}
      </div>
    </NBCard>
  );
}
