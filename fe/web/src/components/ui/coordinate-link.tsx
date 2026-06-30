'use client';

import { MapPin } from 'lucide-react';
import { cn, nbFocusRing } from '@/lib/utils/cn';
import { formatLatLng, googleMapsUrl } from '@/lib/utils/geo';

interface CoordinateLinkProps {
  lat?: number | string | null;
  lng?: number | string | null;
  className?: string;
}

/**
 * Renders `-7.xxx, 112.xxx` followed by a map-pin icon that opens Google Maps
 * at those coordinates in a new tab. Falls back to an em dash when either
 * coordinate is missing. Reused by the Area + Rayon datatables / detail modals.
 */
export function CoordinateLink({ lat, lng, className }: CoordinateLinkProps) {
  const latNum = lat == null || lat === '' ? NaN : Number(lat);
  const lngNum = lng == null || lng === '' ? NaN : Number(lng);
  if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
    return <span className="text-nb-gray-500">—</span>;
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="font-mono text-nb-body-sm">{formatLatLng(latNum, lngNum)}</span>
      <a
        href={googleMapsUrl(latNum, lngNum)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Lihat di Google Maps"
        title="Lihat di Google Maps"
        onClick={(e) => e.stopPropagation()}
        className={cn('text-nb-primary hover:text-nb-primary-hover', nbFocusRing)}
      >
        <MapPin className="h-4 w-4" aria-hidden />
      </a>
    </span>
  );
}
