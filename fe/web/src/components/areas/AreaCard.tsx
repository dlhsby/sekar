'use client';

/**
 * Area Card Component
 * Displays area information in grid view
 */

import { Eye, Edit, Trash2 } from 'lucide-react';
import { Card, Badge, Button, CardContent } from '@/components/ui';
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

export function AreaCard({ area, onView, onEdit, onDelete, showActions = true }: AreaCardProps) {
  // Get map preview image
  const mapUrl = getStaticMapUrl(
    [Number(area.gps_lng ?? 0), Number(area.gps_lat ?? 0)],
    area.boundary_polygon,
    400,
    200
  );

  return (
    <Card variant="elevated" className="overflow-hidden">
      {/* Map Preview */}
      <div className="relative w-full h-48 bg-nb-gray-100 border-b-2 border-nb-black">
        <img src={mapUrl} alt={`Peta ${area.name}`} className="w-full h-full object-cover" />
      </div>

      {/* Content */}
      <CardContent className="space-y-3">
        {/* Title */}
        <div>
          <h3 className="font-bold text-lg leading-tight">{area.name}</h3>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {area.rayon && (
            <Badge variant="default" size="sm">
              📍 {area.rayon.name}
            </Badge>
          )}
          {area.areaType && (
            <Badge variant={area.areaType.category === 'ACTIVE' ? 'success' : 'warning'} size="sm">
              {area.areaType.name}
            </Badge>
          )}
        </div>

        {/* Coverage Area */}
        {area.coverage_area && (
          <div className="bg-nb-warning/20 border-2 border-nb-black px-3 py-2">
            <div className="text-xs font-bold text-nb-gray-700 mb-1">Luas Area</div>
            <div className="text-xl font-black">{formatArea(area.coverage_area)}</div>
          </div>
        )}

        {/* Address */}
        {area.address && (
          <p className="text-sm text-nb-gray-600 line-clamp-2">{area.address}</p>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => onView?.(area)}
              size="sm"
              className="flex-1"
              leftIcon={<Eye className="w-4 h-4" />}
            >
              Lihat
            </Button>
            {onEdit && (
              <Button
                onClick={() => onEdit(area)}
                variant="secondary"
                size="sm"
                aria-label={`Ubah area ${area.name}`}
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                onClick={() => onDelete(area)}
                variant="destructive"
                size="sm"
                aria-label={`Hapus area ${area.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
