'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';
import { cn, nbFocusRing } from '@/lib/utils/cn';
import { formatLatLng } from '@/lib/utils/geo';
import { MapDisplayModal } from '@/components/maps/MapDisplayModal';
import type { MarkerEntityKind } from '@/lib/constants/markerDefaults';

interface CoordinateLinkProps {
  lat?: number | string | null;
  lng?: number | string | null;
  className?: string;
  /** Title for the display modal (e.g. the rayon/area name). */
  label?: string;
  /** Optional boundary + styling to preview the entity, not just a bare pin. */
  boundary?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  borderColor?: string | null;
  fillColor?: string | null;
  fillOpacity?: number | null;
  markerImageUrl?: string | null;
  entityKind?: MarkerEntityKind;
}

/**
 * Renders `-7.xxx, 112.xxx` followed by a map-pin button that opens a modal
 * showing the coordinate on a Google Map (with an external-link fallback when
 * no Maps key is configured). Falls back to an em dash when either coordinate
 * is missing. Reused by the Area + Rayon datatables / detail modals.
 */
export function CoordinateLink({
  lat,
  lng,
  className,
  label,
  boundary,
  borderColor,
  fillColor,
  fillOpacity,
  markerImageUrl,
  entityKind,
}: CoordinateLinkProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const latNum = lat == null || lat === '' ? NaN : Number(lat);
  const lngNum = lng == null || lng === '' ? NaN : Number(lng);
  if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
    return <span className="text-nb-gray-500">—</span>;
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="font-mono text-nb-body-sm">{formatLatLng(latNum, lngNum)}</span>
      <button
        type="button"
        aria-label={t('components:coordinateLink.viewLocation')}
        title={t('components:coordinateLink.viewLocation')}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={cn('text-nb-primary hover:text-nb-primary-hover', nbFocusRing)}
      >
        <MapPin className="h-4 w-4" aria-hidden />
      </button>
      <MapDisplayModal
        open={open}
        onOpenChange={setOpen}
        lat={latNum}
        lng={lngNum}
        title={label ?? t('components:coordinateLink.defaultLabel')}
        boundary={boundary}
        borderColor={borderColor}
        fillColor={fillColor}
        fillOpacity={fillOpacity}
        markerImageUrl={markerImageUrl}
        entityKind={entityKind}
      />
    </span>
  );
}
