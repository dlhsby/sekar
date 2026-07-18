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
import { useTranslation } from 'react-i18next';
import { GoogleMap, Polygon, Polyline } from '@react-google-maps/api';
import { Search, X, Loader2, Pencil, Trash2, Check, MapPin } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { GoogleMapsGate } from './GoogleMapsGate';
import { AdvancedMarker } from './AdvancedMarker';
import { useMapId } from '@/lib/api/config';
import { calculatePolygonArea, formatArea } from '@/lib/utils/geo';

/** Small white circle DOM node for a draft-boundary vertex (AdvancedMarker content). */
function createVertexDot(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText =
    'width:10px;height:10px;border-radius:9999px;background:var(--color-nb-white);border:2px solid var(--color-nb-black);';
  return el;
}

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
  // ── Live style preview (ADR-045): draw the boundary + pin as the entity is
  //    configured, so editing colors/marker updates the map immediately. All
  //    optional — omit to keep the neutral Neo-Brutalism default styling.
  /** Boundary stroke color (`border_color`). */
  strokeColor?: string | null;
  /** Boundary stroke opacity 0–1 (`border_opacity`); defaults opaque. */
  strokeOpacity?: number | null;
  /** Boundary fill color (`fill_color`); null/empty → unfilled. */
  fillColor?: string | null;
  /** Boundary fill opacity 0–1 (`fill_opacity`). */
  fillOpacity?: number | null;
  /** Center-pin marker image (`marker_image_url` or the per-kind default). */
  markerImageUrl?: string | null;
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
  strokeColor,
  strokeOpacity,
  fillColor,
  fillOpacity,
  markerImageUrl,
}: Omit<GoogleBoundaryEditorProps, 'manualFallback'>) {
  const { t } = useTranslation();
  const editablePolygon = !readonly && !!onPolygonChange;
  const editablePin = !readonly && !!onPinChange;

  // Merge the entity's configured style over the neutral default so the preview
  // reflects the form live; an unset/empty fill color draws no fill.
  const polygonOptions = useMemo<google.maps.PolygonOptions>(() => {
    const hasFill = !!fillColor;
    return {
      ...POLYGON_OPTIONS,
      strokeColor: strokeColor || POLYGON_OPTIONS.strokeColor,
      strokeOpacity: strokeOpacity ?? 1,
      fillColor: hasFill ? (fillColor as string) : POLYGON_OPTIONS.fillColor,
      fillOpacity: hasFill ? (fillOpacity ?? 0.25) : 0,
    };
  }, [strokeColor, strokeOpacity, fillColor, fillOpacity]);

  // Center-pin visual = the configured marker image (or per-kind default),
  // rebuilt when the URL changes; null → Google's default pin.
  const pinContent = useMemo(() => {
    if (typeof document === 'undefined' || !markerImageUrl) return null;
    const img = document.createElement('img');
    img.src = markerImageUrl;
    img.alt = '';
    img.style.width = '34px';
    img.style.height = '42px';
    img.style.objectFit = 'contain';
    return img;
  }, [markerImageUrl]);

  const [paths, setPaths] = useState<LatLng[][]>(() => geometryToPaths(initialPolygon));
  const [drawing, setDrawing] = useState(false);
  const [draft, setDraft] = useState<LatLng[]>([]);
  // Explicit "place the location pin" mode — only while active do map clicks set
  // the pin, so searching/panning/locating never move it unintentionally.
  const [placingPin, setPlacingPin] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const mapId = useMapId();
  const mapRef = useRef<google.maps.Map | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const pathListeners = useRef<google.maps.MapsEventListener[]>([]);

  const multiPart = paths.length > 1;
  const editableVertex = editablePolygon && !multiPart && !drawing;

  const hasPin =
    pin != null && Number.isFinite(Number(pin.lat)) && Number.isFinite(Number(pin.lng));
  const pinLat = hasPin ? Number(pin!.lat) : null;
  const pinLng = hasPin ? Number(pin!.lng) : null;
  // Stable object identity unless the coordinate itself actually changes — the
  // map's `center` prop below is bound to this value, and @react-google-maps/api
  // re-centers the map whenever `center` receives a NEW reference. Without this
  // memo, editing the boundary polygon (which re-renders this component with no
  // pin change) would recreate `point` from scratch every render and keep
  // snapping the map's focus back to the pin mid-edit.
  const point = useMemo<LatLng | null>(
    () => (pinLat != null && pinLng != null ? { lat: pinLat, lng: pinLng } : null),
    [pinLat, pinLng]
  );

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
      locBtn.title = t('admin:maps.boundary.myLocationTitle');
      locBtn.setAttribute('aria-label', t('admin:maps.boundary.myLocationTitle'));
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
    (coords: LatLng) => {
      if (!editablePin) return;
      onPinChange?.(coords);
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
        setSearchError(t('admin:maps.boundary.locationNotFound'));
        return;
      }
      const loc = results[0].geometry.location;
      mapRef.current?.panTo({ lat: loc.lat(), lng: loc.lng() });
      mapRef.current?.setZoom(Math.max(mapRef.current?.getZoom() ?? 15, 16));
    } catch {
      setSearchError(t('admin:maps.boundary.searchError'));
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
              placeholder={t('admin:maps.boundary.searchPlaceholder')}
              leftIcon={<Search className="h-4 w-4" />}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleSearch();
                }
              }}
              aria-label={t('admin:maps.boundary.searchLabel')}
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
            {t('admin:maps.boundary.searchButton')}
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
                {t('admin:maps.boundary.finishButton')} ({draft.length})
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={undoLastVertex}
                disabled={draft.length === 0}
              >
                {t('admin:maps.boundary.undoButton')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={cancelDrawing}
                leftIcon={<X className="h-4 w-4" />}
              >
                {t('admin:maps.boundary.cancelButton')}
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
                    {paths.length > 0 ? t('admin:maps.boundary.redrawBoundaryButton') : t('admin:maps.boundary.drawBoundaryButton')}
                  </Button>
                  {paths.length > 0 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={clearPolygon}
                      leftIcon={<Trash2 className="h-4 w-4" />}
                    >
                      {t('admin:maps.boundary.deleteBoundaryButton')}
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
                      ? t('admin:maps.boundary.finishPlacingButton')
                      : point
                        ? t('admin:maps.boundary.changePinButton')
                        : t('admin:maps.boundary.placePinButton')}
                  </Button>
                  {onClearPin && point && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onClearPin}
                      leftIcon={<X className="h-4 w-4" />}
                    >
                      {t('admin:maps.boundary.deletePinButton')}
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
          {multiPart && !drawing && (
            <p className="text-nb-body-sm text-nb-warning-dark">
              {t('admin:maps.boundary.multiPartWarning', { count: paths.length })}
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
            // Vector map + Map ID → required for AdvancedMarkerElement.
            mapId: mapId ?? undefined,
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
                  options={polygonOptions}
                />
              );
            })}

          {/* In-progress draft while drawing */}
          {drawing && draft.length > 0 && (
            <>
              <Polyline path={draft} options={DRAFT_LINE_OPTIONS} />
              {draft.map((v, i) => (
                <AdvancedMarker
                  key={`draft-${i}`}
                  position={v}
                  clickable={false}
                  content={createVertexDot()}
                />
              ))}
            </>
          )}

          {point && (
            <AdvancedMarker
              position={point}
              content={pinContent}
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
            ? t('admin:maps.boundary.drawingHint')
            : placingPin
              ? t('admin:maps.boundary.placingPinHint')
              : editablePolygon && paths.length === 0
                ? t('admin:maps.boundary.noBoundaryHint')
                : editablePin
                  ? t('admin:maps.boundary.exploreHint')
                  : t('admin:maps.boundary.emptyHint')}
        </p>
      </div>

      {area > 0 && (
        <div className="flex items-center gap-2 border-2 border-nb-black bg-nb-warning/20 px-4 py-2">
          <span className="font-bold">{t('admin:maps.boundary.areaLabel')}</span>
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
