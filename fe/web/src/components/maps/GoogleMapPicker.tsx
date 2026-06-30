'use client';

/**
 * Drop-pin coordinate picker on a Google Map.
 *
 * Place a pin by: searching an address (geocoding), clicking the map, or
 * dragging the existing pin. Emits the chosen `{ lat, lng }`. When no Google
 * Maps key is configured it renders `manualFallback` (typically the lat/lng
 * number inputs) so coordinates remain settable. Used by the Rayon + Area
 * master-data forms.
 */

import { useCallback, useState } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { Search, X, Loader2 } from 'lucide-react';
import { Button, Input } from '@/components/ui';
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
  /** When provided and a point is set, shows a "clear" button (optional coords). */
  onClear?: () => void;
  /** Rendered when Google Maps is unavailable (no key / load error). */
  manualFallback?: React.ReactNode;
  /** Map height in pixels. */
  height?: number;
}

/** Inner component — only mounted once the Google Maps SDK is loaded. */
function PickerMap({ lat, lng, onChange, onClear, height = 320 }: Omit<GoogleMapPickerProps, 'manualFallback'>) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

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

  const handleSearch = useCallback(async () => {
    const address = query.trim();
    if (!address) return;
    setSearching(true);
    setSearchError(null);
    try {
      const geocoder = new google.maps.Geocoder();
      const { results } = await geocoder.geocode({ address, region: 'ID' });
      if (!results || results.length === 0) {
        setSearchError('Lokasi tidak ditemukan. Coba kata kunci lain.');
        return;
      }
      const loc = results[0].geometry.location;
      onChange({ lat: loc.lat(), lng: loc.lng() });
    } catch {
      setSearchError('Pencarian lokasi gagal. Coba lagi.');
    } finally {
      setSearching(false);
    }
  }, [query, onChange]);

  return (
    <div className="space-y-2">
      {/* Geocoding search — note: type=button + Enter handling so it never submits the parent form */}
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <Input
            type="text"
            value={query}
            placeholder="Cari alamat atau tempat…"
            leftIcon={<Search className="h-4 w-4" />}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleSearch();
              }
            }}
            aria-label="Cari lokasi"
          />
          {searchError && (
            <p className="mt-1 text-nb-body-sm font-medium text-nb-danger" role="alert">
              {searchError}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void handleSearch()}
          disabled={searching || !query.trim()}
          leftIcon={searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        >
          Cari
        </Button>
      </div>

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

      <div className="flex items-center justify-between gap-2">
        <p className="text-nb-body-sm text-nb-gray-500">
          {point
            ? 'Seret pin atau klik peta untuk memindahkan titik koordinat.'
            : 'Cari, klik peta, atau masukkan koordinat manual untuk menentukan titik.'}
        </p>
        {onClear && point && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            leftIcon={<X className="h-4 w-4" />}
          >
            Hapus titik
          </Button>
        )}
      </div>
    </div>
  );
}

export function GoogleMapPicker({ manualFallback, ...rest }: GoogleMapPickerProps) {
  return (
    <GoogleMapsGate fallback={manualFallback ?? null}>
      <PickerMap {...rest} />
    </GoogleMapsGate>
  );
}
