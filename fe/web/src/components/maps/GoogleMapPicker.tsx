'use client';

/**
 * Drop-pin coordinate picker on a Google Map.
 *
 * Click the map to drop a pin, or drag the existing pin to fine-tune. Emits the
 * chosen `{ lat, lng }`. When no Google Maps key is configured it renders
 * `manualFallback` (typically the lat/lng number inputs) so coordinates remain
 * settable. Used by the Rayon + Area master-data forms.
 */

import { useCallback } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { GoogleMapsGate } from './GoogleMapsGate';

/** Surabaya city center — sensible default when no coordinate is set yet. */
const SURABAYA_CENTER = { lat: -7.2575, lng: 112.7521 };

const MAP_OPTIONS: google.maps.MapOptions = {
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
};

export interface GoogleMapPickerProps {
  lat: number | null | undefined;
  lng: number | null | undefined;
  onChange: (coords: { lat: number; lng: number }) => void;
  /** Rendered when Google Maps is unavailable (no key / load error). */
  manualFallback?: React.ReactNode;
  /** Map height in pixels. */
  height?: number;
}

export function GoogleMapPicker({
  lat,
  lng,
  onChange,
  manualFallback,
  height = 320,
}: GoogleMapPickerProps) {
  const hasPoint =
    lat != null && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
  const point = hasPoint ? { lat: Number(lat), lng: Number(lng) } : null;
  const center = point ?? SURABAYA_CENTER;

  const handlePlace = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      onChange({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    },
    [onChange]
  );

  return (
    <GoogleMapsGate fallback={manualFallback ?? null}>
      <div className="space-y-2">
        <div className="overflow-hidden rounded-nb-base border-2 border-nb-black shadow-nb-sm">
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: `${height}px` }}
            center={center}
            zoom={point ? 15 : 12}
            onClick={handlePlace}
            options={MAP_OPTIONS}
          >
            {point && <Marker position={point} draggable onDragEnd={handlePlace} />}
          </GoogleMap>
        </div>
        <p className="text-nb-body-sm text-nb-gray-500">
          {point
            ? 'Seret pin atau klik peta untuk memindahkan titik koordinat.'
            : 'Klik di peta untuk menjatuhkan pin koordinat.'}
        </p>
      </div>
    </GoogleMapsGate>
  );
}
