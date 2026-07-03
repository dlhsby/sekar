'use client';

/**
 * Unified boundary + center-pin editor on a single Google Map.
 *
 * One map does everything the Area/Rayon master-data forms need:
 *   - draw a boundary polygon (click vertices on the map, then finish), edit an
 *     existing single-part polygon's vertices, or clear it,
 *   - drop / drag the center coordinate pin (or search an address to place it),
 *   - show an existing boundary loaded from the database — Polygon OR
 *     MultiPolygon (KMZ/shapefile imports are commonly multi-part).
 *
 * Drawing is implemented with plain map clicks — Google removed the Drawing
 * library's DrawingManager in Maps JS v3.65. Editing always produces a single
 * Polygon; a multi-part boundary is shown read-only (vertex edit disabled) and
 * can be replaced via "redraw" — leaving it untouched preserves the original.
 *
 * The pin is fully controlled by the parent (`pin` + `onPinChange`) so callers
 * keep ownership of any centroid-follow logic. Omit `onPolygonChange` to render
 * the boundary read-only; omit `onPinChange` to render the pin static. When no
 * Google Maps key is configured it renders `manualFallback` so coordinates stay
 * settable via manual inputs.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, Marker, Polygon, Polyline } from '@react-google-maps/api';
import { Search, X, Loader2, Pencil, Trash2, Check, MapPin } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { GoogleMapsGate } from './GoogleMapsGate';
import { calculatePolygonArea, formatArea } from '@/lib/utils/geo';

/** Surabaya city center — sensible default when nothing is set yet. */
const SURABAYA_CENTER = { lat: -7.2575, lng: 112.7521 };

// Neo-Brutalism boundary styling (concrete colors — Google overlay options can't
// read CSS custom properties).
// eslint-disable-next-line sekar-design/no-inline-hex-colors -- Google overlay option, not a rendered style token
const BOUNDARY_STROKE = '#1C1917';
// eslint-disable-next-line sekar-design/no-inline-hex-colors -- Google overlay option, not a rendered style token
const BOUNDARY_FILL = '#7FBC8C';

const POLYGON_OPTIONS: google.maps.PolygonOptions = {
  strokeColor: BOUNDARY_STROKE,
  strokeWeight: 3,
  fillColor: BOUNDARY_FILL,
  fillOpacity: 0.25,
  clickable: false,
};

const DRAFT_LINE_OPTIONS: google.maps.PolylineOptions = {
  strokeColor: BOUNDARY_STROKE,
  strokeWeight: 2,
  clickable: false,
  icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '10px' }],
};

const VERTEX_ICON: google.maps.Symbol = {
  path: 0 /* google.maps.SymbolPath.CIRCLE — literal so it's defined before the SDK loads */,
  scale: 5,
  fillColor: BOUNDARY_FILL,
  fillOpacity: 1,
  strokeColor: BOUNDARY_STROKE,
  strokeWeight: 2,
};

type LatLng = { lat: number; lng: number };
type BoundaryGeometry = GeoJSON.Polygon | GeoJSON.MultiPolygon;

export interface GoogleBoundaryEditorProps {
  /** Existing boundary to seed the editor with (Polygon or MultiPolygon). */
  initialPolygon?: BoundaryGeometry | null;
  /** Emit the drawn/edited polygon (or null when cleared). Always a single
   *  Polygon. Omit → read-only boundary. */
  onPolygonChange?: (polygon: GeoJSON.Polygon | null) => void;
  /** Controlled center pin. */
  pin?: LatLng | null;
  /** Emit pin changes (drag / click / search). Omit → static pin. */
  onPinChange?: (coords: LatLng) => void;
  /** When set and a pin exists, shows a "clear pin" button. */
  onClearPin?: () => void;
  /** On create: request the browser location once and drop the pin there when no
   *  pin is set yet (falls back silently to the map default if denied). */
  autoLocateOnMount?: boolean;
  /** Reports the boundary's approximate area in m² whenever it changes. */
  onAreaChange?: (areaMeters: number) => void;
  /** Force display-only (no toolbar, no dragging, no search). */
  readonly?: boolean;
  /** Map height in pixels. */
  height?: number;
  /** Rendered when Google Maps is unavailable (no key / load error). */
  manualFallback?: React.ReactNode;
}

/** One GeoJSON ring ([lng,lat] pairs, entries may be string-serialized) → Google
 *  path. Coerces to numbers, drops non-finite points and the closing duplicate. */
function ringToLatLngs(ring: unknown): LatLng[] {
  if (!Array.isArray(ring)) return [];
  const pts = ring
    .map((c) => {
      const pair = c as [unknown, unknown];
      return { lat: Number(pair?.[1]), lng: Number(pair?.[0]) };
    })
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (
    pts.length > 1 &&
    pts[0].lat === pts[pts.length - 1].lat &&
    pts[0].lng === pts[pts.length - 1].lng
  ) {
    pts.pop();
  }
  return pts;
}

/** Boundary geometry → one outer-ring path per polygon (>= 3 points). */
function geometryToPaths(geom: BoundaryGeometry | null | undefined): LatLng[][] {
  if (!geom) return [];
  if (geom.type === 'Polygon') {
    return [ringToLatLngs(geom.coordinates?.[0])].filter((p) => p.length >= 3);
  }
  if (geom.type === 'MultiPolygon') {
    return (geom.coordinates ?? [])
      .map((poly) => ringToLatLngs(poly?.[0]))
      .filter((p) => p.length >= 3);
  }
  return [];
}

/** Google path → GeoJSON polygon (re-closes the ring). Null when < 3 points. */
function pathToPolygon(path: LatLng[]): GeoJSON.Polygon | null {
  if (path.length < 3) return null;
  const ring = path.map((p) => [p.lng, p.lat] as [number, number]);
  ring.push([path[0].lng, path[0].lat]);
  return { type: 'Polygon', coordinates: [ring] };
}

/** Read a live Google Polygon's outer path into plain lat/lng points. */
function readPolygonPath(poly: google.maps.Polygon): LatLng[] {
  return poly
    .getPath()
    .getArray()
    .map((ll) => ({ lat: ll.lat(), lng: ll.lng() }));
}

function ringArea(ring: LatLng[]): number {
  return ring.length >= 3 ? calculatePolygonArea(pathToPolygon(ring)!) : 0;
}

function BoundaryMap({
  initialPolygon,
  onPolygonChange,
  pin,
  onPinChange,
  onClearPin,
  onAreaChange,
  autoLocateOnMount = false,
  readonly = false,
  height = 420,
}: Omit<GoogleBoundaryEditorProps, 'manualFallback'>) {
  const editablePolygon = !readonly && !!onPolygonChange;
  const editablePin = !readonly && !!onPinChange;

  const [paths, setPaths] = useState<LatLng[][]>(() => geometryToPaths(initialPolygon));
  const [drawing, setDrawing] = useState(false);
  const [draft, setDraft] = useState<LatLng[]>([]);
  // Explicit "place the location pin" mode — only while active do map clicks set
  // the pin, so searching/panning/locating never move it unintentionally.
  const [placingPin, setPlacingPin] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const pathListeners = useRef<google.maps.MapsEventListener[]>([]);

  const multiPart = paths.length > 1;
  const editableVertex = editablePolygon && !multiPart && !drawing;

  const hasPin =
    pin != null && Number.isFinite(Number(pin.lat)) && Number.isFinite(Number(pin.lng));
  const point = hasPin ? { lat: Number(pin!.lat), lng: Number(pin!.lng) } : null;

  const area = useMemo(() => {
    if (drawing) return ringArea(draft);
    return paths.reduce((sum, ring) => sum + ringArea(ring), 0);
  }, [drawing, draft, paths]);

  // Commit a single finished/edited ring (or clear) to state + parent.
  const commit = useCallback(
    (ring: LatLng[]) => {
      const polygon = pathToPolygon(ring);
      setPaths(polygon ? [ring] : []);
      onPolygonChange?.(polygon);
      onAreaChange?.(polygon ? calculatePolygonArea(polygon) : 0);
    },
    [onPolygonChange, onAreaChange]
  );

  // Fit the map to the boundary/pin when it first loads.
  const handleMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      const allPoints = paths.flat();
      if (allPoints.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        allPoints.forEach((p) => bounds.extend(p));
        map.fitBounds(bounds, 48);
      } else if (point) {
        map.setCenter(point);
        map.setZoom(15);
      }

      // "My location" control inside the map's own control stack — Google lays it
      // out next to the native zoom/map-type controls (no overlap). Camera only.
      const locBtn = document.createElement('button');
      locBtn.type = 'button';
      locBtn.title = 'Lokasi saya';
      locBtn.setAttribute('aria-label', 'Lokasi saya');
      /* eslint-disable sekar-design/no-inline-hex-colors -- Google-native map control styling (white control + Google-blue icon), not app tokens */
      locBtn.style.cssText =
        'background:#fff;border:0;border-radius:2px;box-shadow:0 1px 4px -1px rgba(0,0,0,.3);width:40px;height:40px;margin:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;';
      locBtn.innerHTML =
        '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#1a73e8" d="M12 8c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm8.9 3A9 9 0 0 0 13 3.1V1h-2v2.1A9 9 0 0 0 3.1 11H1v2h2.1A9 9 0 0 0 11 20.9V23h2v-2.1a9 9 0 0 0 7.9-7.9H23v-2h-2.1zM12 19a7 7 0 1 1 0-14 7 7 0 0 1 0 14z"/></svg>';
      /* eslint-enable sekar-design/no-inline-hex-colors */
      locBtn.addEventListener('click', () => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition((pos) => {
          const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          map.panTo(c);
          map.setZoom(Math.max(map.getZoom() ?? 15, 16));
        });
      });
      map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(locBtn);
    },
    // Only on mount — paths/point are the initial values here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Re-read the live (single) polygon after a vertex edit/drag.
  const syncFromPolygon = useCallback(() => {
    if (!polygonRef.current) return;
    commit(readPolygonPath(polygonRef.current));
  }, [commit]);

  const attachPolygon = useCallback(
    (poly: google.maps.Polygon) => {
      polygonRef.current = poly;
      pathListeners.current.forEach((l) => l.remove());
      pathListeners.current = [];
      const mvc = poly.getPath();
      pathListeners.current = [
        mvc.addListener('set_at', syncFromPolygon),
        mvc.addListener('insert_at', syncFromPolygon),
        mvc.addListener('remove_at', syncFromPolygon),
      ];
    },
    [syncFromPolygon]
  );

  const detachPolygon = useCallback(() => {
    pathListeners.current.forEach((l) => l.remove());
    pathListeners.current = [];
    polygonRef.current = null;
  }, []);

  useEffect(() => () => pathListeners.current.forEach((l) => l.remove()), []);

  // Toolbar actions -----------------------------------------------------------
  // Note: drawing does NOT clear the existing boundary until "Selesai" commits,
  // so cancelling a redraw restores the original (incl. multi-part boundaries).
  const startDrawing = useCallback(() => {
    if (!editablePolygon) return;
    setPlacingPin(false);
    setDrawing(true);
    setDraft([]);
  }, [editablePolygon]);

  const finishDrawing = useCallback(() => {
    if (draft.length < 3) return;
    setDrawing(false);
    commit(draft);
    setDraft([]);
  }, [draft, commit]);

  const cancelDrawing = useCallback(() => {
    setDrawing(false);
    setDraft([]);
  }, []);

  const clearPolygon = useCallback(() => {
    if (!editablePolygon) return;
    setDrawing(false);
    setDraft([]);
    setPaths([]);
    onPolygonChange?.(null);
    onAreaChange?.(0);
  }, [editablePolygon, onPolygonChange, onAreaChange]);

  const undoLastVertex = useCallback(() => setDraft((prev) => prev.slice(0, -1)), []);

  // Map interactions ----------------------------------------------------------
  // Map clicks add boundary vertices while drawing, or set the pin ONLY while in
  // explicit "place pin" mode. Otherwise clicks do nothing, so panning/exploring
  // never changes the boundary or the location.
  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const coords = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      if (drawing) {
        setDraft((prev) => [...prev, coords]);
      } else if (placingPin && editablePin) {
        onPinChange?.(coords);
      }
    },
    [drawing, placingPin, editablePin, onPinChange]
  );

  // On create, center the map on the current location once — WITHOUT dropping a
  // pin (the user places the location point explicitly).
  const autoLocatedRef = useRef(false);
  useEffect(() => {
    if (
      autoLocatedRef.current ||
      !autoLocateOnMount ||
      typeof navigator === 'undefined' ||
      !navigator.geolocation
    ) {
      return;
    }
    autoLocatedRef.current = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        mapRef.current?.setZoom(15);
      },
      () => {
        /* denied / unavailable → keep the map default */
      }
    );
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePinDrag = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!editablePin || !e.latLng) return;
      onPinChange?.({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    },
    [editablePin, onPinChange]
  );

  // Search just pans the map (explore) — it does NOT move the location pin.
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
      mapRef.current?.panTo({ lat: loc.lat(), lng: loc.lng() });
      mapRef.current?.setZoom(Math.max(mapRef.current?.getZoom() ?? 15, 16));
    } catch {
      setSearchError('Pencarian lokasi gagal. Coba lagi.');
    } finally {
      setSearching(false);
    }
  }, [query]);

  return (
    <div className="space-y-2">
      {/* Address search (pin placement) */}
      {editablePin && (
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
            leftIcon={
              searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )
            }
          >
            Cari
          </Button>
        </div>
      )}

      {/* Combined toolbar: boundary + location-pin actions share one row */}
      {(editablePolygon || editablePin) && (
        <div className="space-y-1">
          {drawing ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={finishDrawing}
                disabled={draft.length < 3}
                leftIcon={<Check className="h-4 w-4" />}
              >
                Selesai ({draft.length})
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={undoLastVertex}
                disabled={draft.length === 0}
              >
                Batalkan titik
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={cancelDrawing}
                leftIcon={<X className="h-4 w-4" />}
              >
                Batal
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {editablePolygon && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={startDrawing}
                    leftIcon={<Pencil className="h-4 w-4" />}
                  >
                    {paths.length > 0 ? 'Gambar ulang batas' : 'Gambar batas'}
                  </Button>
                  {paths.length > 0 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={clearPolygon}
                      leftIcon={<Trash2 className="h-4 w-4" />}
                    >
                      Hapus batas
                    </Button>
                  )}
                </>
              )}
              {editablePin && (
                <>
                  <Button
                    type="button"
                    variant={placingPin ? 'default' : 'secondary'}
                    size="sm"
                    onClick={() => setPlacingPin((v) => !v)}
                    leftIcon={
                      placingPin ? <Check className="h-4 w-4" /> : <MapPin className="h-4 w-4" />
                    }
                  >
                    {placingPin
                      ? 'Selesai menempatkan'
                      : point
                        ? 'Ubah titik lokasi'
                        : 'Tempatkan titik lokasi'}
                  </Button>
                  {onClearPin && point && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onClearPin}
                      leftIcon={<X className="h-4 w-4" />}
                    >
                      Hapus titik
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
          {multiPart && !drawing && (
            <p className="text-nb-body-sm text-nb-warning-dark">
              Batas terdiri dari {paths.length} bagian — edit titik dinonaktifkan. Gunakan
              &quot;Gambar ulang batas&quot; untuk menggantinya dengan satu poligon.
            </p>
          )}
        </div>
      )}

      <div className="relative overflow-hidden rounded-nb-base border-2 border-nb-black shadow-nb-sm">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: `${height}px` }}
          center={point ?? SURABAYA_CENTER}
          zoom={point ? 15 : 12}
          onLoad={handleMapLoad}
          onClick={handleMapClick}
          onDblClick={drawing ? finishDrawing : undefined}
          options={{
            // Keep Google's native controls (zoom, map type, fullscreen) visible.
            streetViewControl: false,
            mapTypeControl: true,
            fullscreenControl: true,
            zoomControl: true,
            mapTypeId: 'roadmap',
            // Suppress Google's built-in POI/place info windows so clicking a
            // business icon draws/pins instead of opening a place card.
            clickableIcons: false,
            disableDoubleClickZoom: drawing,
            draggableCursor: drawing || placingPin ? 'crosshair' : undefined,
          }}
        >
          {/* Committed / existing boundary (each part; first is editable when single) */}
          {!drawing &&
            paths.map((ring, i) => {
              const editable = editableVertex && i === 0;
              return (
                <Polygon
                  key={`poly-${i}`}
                  paths={ring}
                  editable={editable}
                  onLoad={editable ? attachPolygon : undefined}
                  onUnmount={editable ? detachPolygon : undefined}
                  onMouseUp={editable ? syncFromPolygon : undefined}
                  options={POLYGON_OPTIONS}
                />
              );
            })}

          {/* In-progress draft while drawing */}
          {drawing && draft.length > 0 && (
            <>
              <Polyline path={draft} options={DRAFT_LINE_OPTIONS} />
              {draft.map((v, i) => (
                <Marker key={`draft-${i}`} position={v} icon={VERTEX_ICON} clickable={false} />
              ))}
            </>
          )}

          {point && (
            <Marker
              position={point}
              draggable={editablePin && !drawing}
              onDragEnd={handlePinDrag}
            />
          )}
        </GoogleMap>
      </div>

      {/* Footer: area readout + hints */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-nb-body-sm text-nb-gray-500">
          {drawing
            ? 'Klik di peta untuk menambah titik. Klik "Selesai" (min. 3 titik) atau klik dua kali untuk mengakhiri.'
            : placingPin
              ? 'Klik di peta untuk menaruh titik lokasi (bisa diulang). Tekan "Selesai menempatkan" bila sudah.'
              : editablePolygon && paths.length === 0
                ? 'Tekan "Gambar batas" untuk mulai menggambar poligon.'
                : editablePin
                  ? 'Geser/cari peta atau gunakan kontrol lokasi (pojok kanan bawah) untuk menjelajah. Tekan "Tempatkan/Ubah titik lokasi" untuk menaruh titik; pin juga bisa diseret.'
                  : 'Tampilan peta.'}
        </p>
      </div>

      {area > 0 && (
        <div className="flex items-center gap-2 border-2 border-nb-black bg-nb-warning/20 px-4 py-2">
          <span className="font-bold">Luas:</span>
          <span className="text-xl font-black">{formatArea(area)}</span>
        </div>
      )}
    </div>
  );
}

export function GoogleBoundaryEditor({ manualFallback, ...rest }: GoogleBoundaryEditorProps) {
  return (
    <GoogleMapsGate fallback={manualFallback ?? null}>
      <BoundaryMap {...rest} />
    </GoogleMapsGate>
  );
}
