'use client';

/**
 * SimpleMonitoringMap — the live monitoring map on Google Maps. Renders:
 *   - rayon + area boundary overlays (always, independent of live workers),
 *   - area centre markers (overdue-plant count badge when set),
 *   - worker pins coloured by status, with selection (highlight + pan-to).
 *
 * Wrapped in GoogleMapsGate so it degrades to a placeholder when no key is set.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, Marker, Polygon, InfoWindow } from '@react-google-maps/api';
import { useTranslation } from 'react-i18next';
import { GoogleMapsGate } from '@/components/maps/GoogleMapsGate';
import { POLYGON_STYLES } from '@/lib/constants/monitoring';
import type { BoundariesResponse } from '@/lib/api/monitoring-types';
import { type MonitoringLayers, DEFAULT_LAYERS } from '@/lib/monitoring/layers';
import { NodeMarkerLayer, type NodeMarker } from './NodeMarkerLayer';
import { WorkerClusterLayer, type MapBounds } from './WorkerClusterLayer';

export interface SimpleWorker {
  user_id: string;
  full_name: string;
  lat: number;
  lng: number;
  status: string;
  role: string;
  is_within_area: boolean;
  is_scheduled: boolean;
}

export interface SimpleMonitoringMapProps {
  /**
   * `true` (area scope) → cluster individual worker pins. `false` → draw the
   * drill-down node markers (Surabaya / rayons / areas) from `nodeMarkers`.
   */
  showWorkers: boolean;
  /** Current drill scope — gates which boundary layers draw. */
  scope?: 'surabaya' | 'city' | 'rayon' | 'area';
  nodeMarkers?: NodeMarker[];
  onDrillNode?: (node: NodeMarker) => void;
  workers: SimpleWorker[];
  boundaries?: BoundariesResponse | null;
  selectedId?: string | null;
  onSelect?: (userId: string) => void;
  /** Phase 3-8: per-area overdue plant counts — area markers with overdue
   *  species turn danger-tinted and show the count. */
  overdueByArea?: Record<string, number> | null;
  /** Which overlays to draw (rayon border/fill, area border/pins, petugas). */
  layers?: MonitoringLayers;
  /** Imperative focus target (from search / drill) — pan + zoom to this point. */
  focusTarget?: { lat: number; lng: number; zoom?: number; key: number } | null;
}

const SURABAYA = { lat: -7.2575, lng: 112.7521 };

// Concrete colors for Google overlay options (can't read CSS custom props).
/* eslint-disable sekar-design/no-inline-hex-colors -- Google overlay options, not rendered style tokens */
const BLACK = '#1C1917';
const WHITE = '#FFFFFF';
const AREA_MARKER = '#D97706';
const AREA_MARKER_OVERDUE = '#DC2626';
/* eslint-enable sekar-design/no-inline-hex-colors */

// Native Google Maps gesture UX: greedy scroll/pinch zoom + drag pan (the camera
// controls are enough, so the +/- zoom buttons are off). The only on-map control
// is a single My-Location button (added natively in createLocateControl).
const MAP_OPTIONS: google.maps.MapOptions = {
  streetViewControl: false,
  fullscreenControl: false,
  mapTypeControl: false,
  zoomControl: false,
  gestureHandling: 'greedy',
  clickableIcons: false,
  mapTypeId: 'roadmap',
};

const DEFAULT_ZOOM = 11;
// Alpha for the rayon fill when tinted with its configured color.
const RAYON_FILL_ALPHA = 0.18;

/** GeoJSON Polygon/MultiPolygon → array of Google outer-ring paths. */
function geometryToPaths(geom: GeoJSON.Geometry | null): google.maps.LatLngLiteral[][] {
  if (!geom) return [];
  if (geom.type === 'Polygon') {
    return [geom.coordinates[0].map(([lng, lat]) => ({ lat, lng }))];
  }
  if (geom.type === 'MultiPolygon') {
    return geom.coordinates.map((poly) => poly[0].map(([lng, lat]) => ({ lat, lng })));
  }
  return [];
}

interface AreaPin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  understaffed: boolean;
}

/** Convert a hex color to an `rgba()` string with the given alpha (for fills). */
function hexToRgba(hex: string, alpha: number): string | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const int = parseInt(m[1], 16);
  return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${alpha})`;
}

/**
 * Build a native-looking My-Location control button and register it in the map's
 * control stack (RIGHT_BOTTOM) so Google lays it out above the zoom control —
 * no overlap, Google-app-like UX. Pure DOM (runs once on map load).
 */
function createLocateControl(map: google.maps.Map, onClick: () => void, ariaLabel: string): void {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-label', ariaLabel);
  btn.title = ariaLabel;
  /* eslint-disable sekar-design/no-inline-hex-colors, sekar-design/prefer-nb-shadow-utility --
     Native Google Maps control chrome (mimics the built-in zoom control), not app UI. */
  Object.assign(btn.style, {
    width: '40px',
    height: '40px',
    margin: '0 10px 10px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#fff',
    border: '0',
    borderRadius: '2px',
    boxShadow: 'rgba(0,0,0,0.3) 0 1px 4px -1px',
    cursor: 'pointer',
  } as CSSStyleDeclaration);
  // Google-style crosshair location glyph.
  btn.innerHTML =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5f6368" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>';
  /* eslint-enable sekar-design/no-inline-hex-colors, sekar-design/prefer-nb-shadow-utility */
  btn.addEventListener('click', onClick);
  map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(btn);
}

function MonitoringMapInner({
  showWorkers,
  scope,
  nodeMarkers,
  onDrillNode,
  workers,
  boundaries,
  selectedId,
  onSelect,
  overdueByArea,
  layers = DEFAULT_LAYERS,
  focusTarget,
}: SimpleMonitoringMapProps) {
  const { t } = useTranslation();
  const mapRef = useRef<google.maps.Map | null>(null);
  const locateMeRef = useRef<() => void>(() => {});
  const locateAddedRef = useRef(false);
  const didFitRef = useRef(false);
  const [hoverAreaId, setHoverAreaId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [bounds, setBounds] = useState<MapBounds | null>(null);

  // Track viewport zoom + bounds so supercluster recomputes on pan/zoom.
  const syncViewport = useCallback((map: google.maps.Map) => {
    const z = map.getZoom();
    if (typeof z === 'number') setZoom(z);
    const b = map.getBounds();
    if (b) {
      const ne = b.getNorthEast();
      const sw = b.getSouthWest();
      setBounds({ north: ne.lat(), east: ne.lng(), south: sw.lat(), west: sw.lng() });
    }
  }, []);

  // Flatten boundary geometry into renderable pieces. Rayon polygons keep their
  // configured color so the map can tint the fill/border per rayon.
  const { rayonPolys, areaPaths, areaPins } = useMemo(() => {
    const rayonPolys: { paths: google.maps.LatLngLiteral[]; color: string | null }[] = [];
    const areaPaths: google.maps.LatLngLiteral[][] = [];
    const areaPins: AreaPin[] = [];
    for (const rayon of boundaries?.rayons ?? []) {
      geometryToPaths(rayon.boundary_polygon).forEach((p) =>
        rayonPolys.push({ paths: p, color: rayon.color ?? null })
      );
      for (const area of rayon.areas) {
        geometryToPaths(area.boundary_polygon).forEach((p) => areaPaths.push(p));
        if (typeof area.center_lat === 'number' && typeof area.center_lng === 'number') {
          areaPins.push({
            id: area.id,
            name: area.name,
            lat: area.center_lat,
            lng: area.center_lng,
            understaffed: area.is_understaffed,
          });
        }
      }
    }
    return { rayonPolys, areaPaths, areaPins };
  }, [boundaries]);

  // Fit the map to the served region once geometry/markers are available.
  const fitToContent = useCallback(
    (map: google.maps.Map) => {
      if (didFitRef.current) return;
      const bounds = new google.maps.LatLngBounds();
      let has = false;
      const extend = (p: google.maps.LatLngLiteral) => {
        bounds.extend(p);
        has = true;
      };
      rayonPolys.forEach((poly) => poly.paths.forEach(extend));
      areaPaths.forEach((path) => path.forEach(extend));
      areaPins.forEach((a) => extend({ lat: a.lat, lng: a.lng }));
      workers.forEach((w) => w.lat && w.lng && extend({ lat: w.lat, lng: w.lng }));
      if (has) {
        map.fitBounds(bounds, 48);
        didFitRef.current = true;
      }
    },
    [rayonPolys, areaPaths, areaPins, workers]
  );

  const handleMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      fitToContent(map);
      syncViewport(map);
      // Add the single My-Location control once (onLoad can fire again on a
      // remount / Strict-Mode double-invoke — guard against duplicate buttons).
      if (!locateAddedRef.current) {
        createLocateControl(map, () => locateMeRef.current(), t('monitoring:map.locateMeAriaLabel'));
        locateAddedRef.current = true;
      }
    },
    [fitToContent, syncViewport, t]
  );

  const handleIdle = useCallback(() => {
    if (mapRef.current) syncViewport(mapRef.current);
  }, [syncViewport]);

  // Fit once content arrives after the map already loaded (async boundaries).
  useEffect(() => {
    if (mapRef.current) fitToContent(mapRef.current);
  }, [fitToContent]);

  // Pan to the selected worker.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const w = workers.find((x) => x.user_id === selectedId);
    if (w?.lat && w?.lng) {
      map.panTo({ lat: w.lat, lng: w.lng });
      map.setZoom(Math.max(map.getZoom() ?? 14, 15));
    }
  }, [selectedId, workers]);

  const locateMe = useCallback(() => {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const map = mapRef.current;
      if (!map) return;
      map.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      map.setZoom(Math.max(map.getZoom() ?? 14, 15));
    });
  }, []);
  useEffect(() => {
    locateMeRef.current = locateMe;
  }, [locateMe]);

  // Imperative focus (from search / drill): pan + zoom to a point.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusTarget) return;
    map.panTo({ lat: focusTarget.lat, lng: focusTarget.lng });
    if (focusTarget.zoom) map.setZoom(Math.max(map.getZoom() ?? 12, focusTarget.zoom));
  }, [focusTarget]);

  const selectedWorker =
    showWorkers && selectedId ? workers.find((w) => w.user_id === selectedId) : null;
  const hoverArea = hoverAreaId ? areaPins.find((a) => a.id === hoverAreaId) : null;
  // Area centre pins only clutter the node view (node markers already carry
  // counts); keep them for the drilled worker view or when the plant overlay is
  // on — and only when the areaPins layer is enabled.
  const showAreaPins = layers.areaPins && (showWorkers || !!overdueByArea);
  // Scope-gate boundary polygons: rayon outlines from the city view down, area
  // outlines only once inside a rayon. At the top (Surabaya) the map shows just
  // the Surabaya node bubble.
  const showRayonPolys = scope !== 'surabaya';
  const showAreaBorders = scope === 'rayon' || scope === 'area';

  const handleClusterZoom = useCallback((lat: number, lng: number, expansionZoom: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.panTo({ lat, lng });
    map.setZoom(expansionZoom);
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={SURABAYA}
        zoom={DEFAULT_ZOOM}
        onLoad={handleMapLoad}
        onIdle={handleIdle}
        options={MAP_OPTIONS}
      >
        {/* Rayon boundaries — outline + tinted fill (one `rayon` toggle). */}
        {layers.rayon && showRayonPolys &&
          rayonPolys.map((poly, i) => {
            const stroke = poly.color ?? POLYGON_STYLES.rayon.stroke;
            const fill =
              (poly.color && hexToRgba(poly.color, RAYON_FILL_ALPHA)) ??
              POLYGON_STYLES.rayon.fill;
            return (
              <Polygon
                key={`rayon-${i}`}
                paths={poly.paths}
                options={{
                  strokeColor: stroke,
                  strokeWeight: POLYGON_STYLES.rayon.strokeWidth,
                  strokeOpacity: 0.9,
                  fillColor: fill,
                  fillOpacity: RAYON_FILL_ALPHA,
                  clickable: false,
                  zIndex: 1,
                }}
              />
            );
          })}

        {/* Area boundaries — outline + fill (one `area` toggle); only inside a rayon. */}
        {layers.area && showAreaBorders &&
          areaPaths.map((path, i) => (
            <Polygon
              key={`area-${i}`}
              paths={path}
              options={{
                strokeColor: POLYGON_STYLES.area.stroke,
                strokeWeight: POLYGON_STYLES.area.strokeWidth,
                strokeOpacity: 1,
                fillColor: POLYGON_STYLES.area.fill,
                fillOpacity: POLYGON_STYLES.area.fillOpacity,
                clickable: false,
                zIndex: 2,
              }}
            />
          ))}

        {/* Area centre markers */}
        {showAreaPins &&
          areaPins.map((area) => {
          const overdue = overdueByArea?.[area.id] ?? 0;
          const danger = overdue > 0 || area.understaffed;
          return (
            <Marker
              key={`area-pin-${area.id}`}
              position={{ lat: area.lat, lng: area.lng }}
              onMouseOver={() => setHoverAreaId(area.id)}
              onMouseOut={() => setHoverAreaId((cur) => (cur === area.id ? null : cur))}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 9,
                fillColor: danger ? AREA_MARKER_OVERDUE : AREA_MARKER,
                fillOpacity: 1,
                strokeColor: BLACK,
                strokeWeight: 2,
              }}
              label={{
                text: overdue > 0 ? String(overdue) : 'A',
                color: WHITE,
                fontSize: '10px',
                fontWeight: '700',
              }}
              zIndex={3}
            />
          );
        })}

        {/* Drill-down node markers (Surabaya / rayon / area) or clustered worker pins. */}
        {!showWorkers ? (
          <NodeMarkerLayer nodes={nodeMarkers ?? []} onDrill={onDrillNode} />
        ) : layers.petugas ? (
          <WorkerClusterLayer
            workers={workers}
            zoom={zoom}
            bounds={bounds}
            selectedId={selectedId}
            onSelect={onSelect}
            onClusterClick={handleClusterZoom}
          />
        ) : null}

        {/* Info windows */}
        {hoverArea && (
          <InfoWindow
            position={{ lat: hoverArea.lat, lng: hoverArea.lng }}
            onCloseClick={() => setHoverAreaId(null)}
            options={{ disableAutoPan: true }}
          >
            <div className="text-xs font-semibold text-nb-black">
              {hoverArea.name}
              {(overdueByArea?.[hoverArea.id] ?? 0) > 0 && (
                <> · {t('monitoring:map.overduePlantLabel', { count: overdueByArea?.[hoverArea.id] })}</>
              )}
            </div>
          </InfoWindow>
        )}

        {selectedWorker?.lat && selectedWorker?.lng && (
          <InfoWindow
            position={{ lat: selectedWorker.lat, lng: selectedWorker.lng }}
            onCloseClick={() => onSelect?.(selectedWorker.user_id)}
            options={{ disableAutoPan: true, pixelOffset: new google.maps.Size(0, -18) }}
          >
            <div className="text-xs font-semibold text-nb-black">{selectedWorker.full_name}</div>
          </InfoWindow>
        )}
        {/* My-Location is a native map control (stacked with zoom, bottom-right). */}
      </GoogleMap>
    </div>
  );
}

export function SimpleMonitoringMap(props: SimpleMonitoringMapProps) {
  const { t } = useTranslation();
  return (
    <GoogleMapsGate
      fallback={
        <div className="absolute inset-0 flex items-center justify-center bg-nb-gray-100 p-6 text-center">
          <p className="text-nb-body-sm text-nb-gray-600">
            {t('monitoring:map.unavailable')}
          </p>
        </div>
      }
    >
      <MonitoringMapInner {...props} />
    </GoogleMapsGate>
  );
}
