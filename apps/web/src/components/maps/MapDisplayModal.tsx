'use client';

/**
 * Read-only map preview modal backed by Google Maps.
 *
 * Shows a marker at the given coordinate; when a `boundary` is supplied it also
 * draws the polygon with the entity's configured border/fill colors and frames
 * the map to it, and renders the entity's configured marker image (or the
 * per-kind system default) instead of Google's generic pin — a faithful preview
 * of how the rayon/region/lokasi is styled. Falls back to an external link when
 * no Google Maps key is configured. Opened by CoordinateLink from the Rayon +
 * Area tables / detail modals.
 */

import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import { GoogleMap, Polygon } from '@react-google-maps/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/components/ui';
import { cn, nbFocusRing } from '@/lib/utils/cn';
import { formatLatLng, googleMapsUrl } from '@/lib/utils/geo';
import { geometryToPaths } from '@/lib/maps/geometry';
import { entityMarkerDefault, type MarkerEntityKind } from '@/lib/constants/markerDefaults';
import { useMapId } from '@/lib/api/config';
import { GoogleMapsGate } from './GoogleMapsGate';
import { AdvancedMarker } from './AdvancedMarker';

/* eslint-disable sekar-design/no-inline-hex-colors -- Google Maps overlay colors (dynamic), not CSS tokens */
const FALLBACK_STROKE = '#1C1917';
const FALLBACK_FILL = '#78716C';
/* eslint-enable sekar-design/no-inline-hex-colors */

const MAP_OPTIONS: google.maps.MapOptions = {
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  clickableIcons: false,
};

export interface MapDisplayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lat: number;
  lng: number;
  title?: string;
  /** Boundary to draw with the entity's colors + frame the map to. */
  boundary?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  /** Polygon stroke (border) color — the entity's configured `border_color`. */
  borderColor?: string | null;
  /** Polygon fill color — the entity's configured `fill_color`. */
  fillColor?: string | null;
  /** Fill opacity 0–1 (entity's `fill_opacity`); defaults to a light tint. */
  fillOpacity?: number | null;
  /** Configured marker image; null → the per-kind system default (`entityKind`). */
  markerImageUrl?: string | null;
  /** Entity kind, so an unset marker previews its system default pin. */
  entityKind?: MarkerEntityKind;
}

function ExternalLinkRow({ lat, lng }: { lat: number; lng: number }) {
  const { t } = useTranslation();
  return (
    <a
      href={googleMapsUrl(lat, lng)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1.5 font-bold text-nb-primary hover:text-nb-primary-hover',
        nbFocusRing
      )}
    >
      <ExternalLink className="h-4 w-4" aria-hidden />
      {t('components:mapDisplayModal.openInGoogleMaps')}
    </a>
  );
}

export function MapDisplayModal({
  open,
  onOpenChange,
  lat,
  lng,
  title,
  boundary,
  borderColor,
  fillColor,
  fillOpacity,
  markerImageUrl,
  entityKind,
}: MapDisplayModalProps) {
  const { t } = useTranslation();
  const mapId = useMapId();
  const position = { lat, lng };
  const modalTitle = title ?? t('components:mapDisplayModal.title');

  const paths = useMemo(() => geometryToPaths(boundary), [boundary]);
  const stroke = borderColor || FALLBACK_STROKE;
  const fill = fillColor || borderColor || FALLBACK_FILL;
  // Stored 0–1. A light tint by default so the base map stays readable.
  const opacity = fillOpacity == null ? 0.25 : fillOpacity;

  // The entity's configured marker image, or its per-kind system default; null
  // keeps Google's generic pin (callers that pass neither).
  const markerContent = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const url = markerImageUrl ?? (entityKind ? entityMarkerDefault(entityKind) : null);
    if (!url) return null;
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.style.width = '38px';
    img.style.height = '47px';
    img.style.objectFit = 'contain';
    return img;
  }, [markerImageUrl, entityKind]);

  // Frame the map to the boundary when present (overrides center/zoom on load).
  const handleLoad = useCallback(
    (map: google.maps.Map) => {
      if (!paths.length) return;
      const bounds = new google.maps.LatLngBounds();
      paths.forEach((ring) => ring.forEach((pt) => bounds.extend(pt)));
      map.fitBounds(bounds, 24);
    },
    [paths]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <GoogleMapsGate
            fallback={
              <div className="rounded-nb-base border-2 border-nb-black bg-nb-gray-100 p-4">
                <p className="mb-2 text-nb-body-sm text-nb-gray-700">
                  {t('components:mapDisplayModal.unavailable')}
                </p>
                <ExternalLinkRow lat={lat} lng={lng} />
              </div>
            }
          >
            <div className="overflow-hidden rounded-nb-base border-2 border-nb-black shadow-nb-sm">
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '360px' }}
                center={position}
                zoom={16}
                onLoad={handleLoad}
                options={{ ...MAP_OPTIONS, mapId: mapId ?? undefined }}
              >
                {paths.map((path, i) => (
                  <Polygon
                    key={i}
                    paths={path}
                    options={{
                      strokeColor: stroke,
                      strokeOpacity: 1,
                      strokeWeight: 2,
                      fillColor: fill,
                      fillOpacity: opacity,
                      clickable: false,
                    }}
                  />
                ))}
                <AdvancedMarker position={position} content={markerContent} />
              </GoogleMap>
            </div>
          </GoogleMapsGate>
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-nb-body-sm">{formatLatLng(lat, lng)}</span>
            <ExternalLinkRow lat={lat} lng={lng} />
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
