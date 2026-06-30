'use client';

import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { cn, nbFocusRing } from '@/lib/utils/cn';
import { formatLatLng } from '@/lib/utils/geo';
import { MapDisplayModal } from '@/components/maps/MapDisplayModal';

interface CoordinateLinkProps {
  lat?: number | string | null;
  lng?: number | string | null;
  className?: string;
  /** Title for the display modal (e.g. the rayon/area name). */
  label?: string;
}

/**
 * Renders `-7.xxx, 112.xxx` followed by a map-pin button that opens a modal
 * showing the coordinate on a Google Map (with an external-link fallback when
 * no Maps key is configured). Falls back to an em dash when either coordinate
 * is missing. Reused by the Area + Rayon datatables / detail modals.
 */
export function CoordinateLink({ lat, lng, className, label }: CoordinateLinkProps) {
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
        aria-label="Lihat lokasi di peta"
        title="Lihat lokasi di peta"
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
        title={label ?? 'Lokasi'}
      />
    </span>
  );
}
