'use client';

import * as React from 'react';
import { useMemo } from 'react';
import { GoogleMap, Marker, Polygon } from '@react-google-maps/api';
import { GoogleMapsGate } from '@/components/maps/GoogleMapsGate';
import { useMapId } from '@/lib/api/config';
import { POLYGON_STYLES } from '@/lib/constants/monitoring';
import { geometryToPaths } from '@/lib/maps/geometry';

/** The tier being shown — decides the fallback styling when nothing is set. */
export type AreaLevel = 'district' | 'region' | 'location';

export interface AreaBoundaryMapProps {
  /** Shown when Google Maps is unavailable (no key / load failure). */
  mapsFallback: React.ReactNode;
  boundary?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  /** Centre pin (district centre / lokasi GPS). */
  pin?: { lat: number; lng: number } | null;
  level: AreaLevel;
  /** Per-level map styling (ADR-045). Falls back to monitoring's palette. */
  borderColor?: string | null;
  fillColor?: string | null;
  borderOpacity?: number | null;
  fillOpacity?: number | null;
  height?: number;
}

const SURABAYA = { lat: -7.2575, lng: 112.7521 };

/** Same gesture UX as the monitoring map: greedy zoom/pan, no chrome. */
const MAP_OPTIONS: google.maps.MapOptions = {
  streetViewControl: false,
  fullscreenControl: false,
  mapTypeControl: false,
  zoomControl: false,
  gestureHandling: 'greedy',
  clickableIcons: false,
};

/**
 * A single area's boundary + centre pin, drawn in ITS OWN colours (ADR-045),
 * matching how the monitoring map renders the same geography.
 *
 * Deliberately not `SimpleMonitoringMap`: that component is bound to monitoring's
 * model — live workers, clusters, drill nodes, layer toggles, a boundaries
 * response for the whole city. Showing one area needs none of it, and reusing it
 * would drag all of it in. What's shared is the visual language (coloured
 * outline + translucent fill + centre marker) and the gesture UX, not the data.
 */
export function AreaBoundaryMap({
  boundary,
  pin,
  level,
  borderColor,
  fillColor,
  borderOpacity,
  fillOpacity,
  height = 420,
  mapsFallback,
}: AreaBoundaryMapProps) {
  const mapId = useMapId();
  const paths = useMemo(() => (geometryToPaths(boundary)), [boundary]);

  // Frame the boundary; fall back to the pin, then to Surabaya.
  const center = useMemo(() => {
    const points = paths.flat();
    if (points.length > 0) {
      const lat = points.reduce((a, p) => a + p.lat, 0) / points.length;
      const lng = points.reduce((a, p) => a + p.lng, 0) / points.length;
      return { lat, lng };
    }
    return pin ?? SURABAYA;
  }, [paths, pin]);

  const fallback = level === 'district' ? POLYGON_STYLES.district : POLYGON_STYLES.area;
  const stroke = borderColor ?? fallback.stroke;
  const fill = fillColor ?? fallback.fill;

  const onLoad = (map: google.maps.Map) => {
    const points = paths.flat();
    if (points.length === 0) return;
    // Fit the whole outline rather than guessing a zoom — a district and a lokasi
    // differ by orders of magnitude in size.
    const bounds = new google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 24);
  };

  return (
    <GoogleMapsGate fallback={mapsFallback}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height }}
        center={center}
        zoom={paths.length > 0 ? 12 : 14}
        options={{ ...MAP_OPTIONS, mapId: mapId ?? undefined }}
        onLoad={onLoad}
      >
        {paths.map((path, i) => (
          <Polygon
            key={i}
            paths={path}
            options={{
              strokeColor: stroke,
              strokeWeight: fallback.strokeWidth,
              strokeOpacity: borderOpacity ?? 0.9,
              fillColor: fill,
              fillOpacity: fillOpacity ?? fallback.fillOpacity,
              clickable: false,
            }}
          />
        ))}
        {pin && <Marker position={pin} />}
      </GoogleMap>
    </GoogleMapsGate>
  );
}
