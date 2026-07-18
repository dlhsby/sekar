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
import { geometryToPaths } from '@/lib/maps/geometry';
import type { BoundariesResponse } from '@/lib/api/monitoring-types';
import { type MonitoringLayers, DEFAULT_LAYERS } from '@/lib/monitoring/layers';
import { NodeMarkerLayer, type NodeMarker } from './NodeMarkerLayer';
import { WorkerClusterLayer, type MapBounds } from './WorkerClusterLayer';
import { nodeDetailIcon } from '@/lib/monitoring/markers';

/** The current node's own pin (selected rayon at rayon scope / area at area scope). */
export interface CurrentNodeMarker {
  variant: 'rayon' | 'area';
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface SimpleWorker {
  user_id: string;
  full_name: string;
  lat: number;
  lng: number;
  status: string;
  role: string;
  /** The role's configured marker icon (null → the client default glyph for the role). */
  role_marker_icon?: string | null;
  is_within_area: boolean;
  is_scheduled: boolean;
  team_id?: string | null;
  team_name?: string | null;
  team_color?: string | null;
}

export interface SimpleMonitoringMapProps {
  /**
   * `true` (area scope) → cluster individual worker pins. `false` → draw the
   * drill-down node markers (Surabaya / rayons / regions / areas) from `nodeMarkers`.
   */
  showWorkers: boolean;
  /** Current drill scope — gates which boundary layers draw. */
  scope?: 'surabaya' | 'city' | 'rayon' | 'region' | 'area';
  nodeMarkers?: NodeMarker[];
  onDrillNode?: (node: NodeMarker) => void;
  /** The current node's own pin (rayon/area) — opens detail on click, no drill. */
  currentNode?: CurrentNodeMarker | null;
  onNodeDetail?: (node: CurrentNodeMarker) => void;
  /** Selected area id — at area scope only its boundary is drawn (on demand). */
  areaId?: string | null;
  workers: SimpleWorker[];
  boundaries?: BoundariesResponse | null;
  selectedId?: string | null;
  onSelect?: (userId: string) => void;
  /** Which overlays to draw (rayon/kawasan/lokasi boundaries, petugas, team bubbles). */
  layers?: MonitoringLayers;
  /** Imperative focus target (from search / drill). `exact` sets the zoom
   *  absolutely (used to zoom OUT on drill-back); otherwise it only zooms in. */
  focusTarget?: { lat: number; lng: number; zoom?: number; exact?: boolean; key: number } | null;
}

const SURABAYA = { lat: -7.2575, lng: 112.7521 };

// Concrete colors for Google overlay options (can't read CSS custom props).
// Native Google Maps gesture UX: greedy scroll/pinch zoom + drag pan (the camera
// controls are enough, so the +/- zoom buttons are off). The only on-map control
// is a single My-Location button (added natively in createLocateControl).
// Declutter the base map: hide third-party POIs (businesses, restaurants,
// buildings) and transit so only our own area markers + labels stand out. Park
// geometry stays visible (green context matters for a parks dept); only its
// labels/icons are muted.
const DECLUTTER_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.attraction', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.medical', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.place_of_worship', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.school', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.sports_complex', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

const MAP_OPTIONS: google.maps.MapOptions = {
  streetViewControl: false,
  fullscreenControl: false,
  mapTypeControl: false,
  zoomControl: false,
  gestureHandling: 'greedy',
  clickableIcons: false,
  mapTypeId: 'roadmap',
  styles: DECLUTTER_STYLES,
};

const DEFAULT_ZOOM = 11;
// Zoom at which individual worker pins take over from node markers inside a
// rayon/kawasan (matches the page's ZOOM_AREA drill target).
const WORKER_REVEAL_ZOOM = 15;
// Alpha for the rayon fill when tinted with its configured color.
const RAYON_FILL_ALPHA = 0.18;

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
  currentNode,
  onNodeDetail,
  areaId,
  workers,
  boundaries,
  selectedId,
  onSelect,
  layers = DEFAULT_LAYERS,
  focusTarget,
}: SimpleMonitoringMapProps) {
  const { t } = useTranslation();
  const mapRef = useRef<google.maps.Map | null>(null);
  const locateMeRef = useRef<() => void>(() => {});
  const locateAddedRef = useRef(false);
  const didFitRef = useRef(false);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [bounds, setBounds] = useState<MapBounds | null>(null);

  // Workers reveal by ZOOM, not only by clicking into an area (ADR-046: "workers
  // render only at deeper zoom"). Once you zoom past the area threshold inside a
  // rayon/kawasan, individual worker pins take over from the node markers.
  const renderWorkers =
    showWorkers ||
    (zoom >= WORKER_REVEAL_ZOOM && (scope === 'rayon' || scope === 'region'));

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
  const { rayonPolys, regionPolys, areaPaths } = useMemo(() => {
    const rayonPolys: { paths: google.maps.LatLngLiteral[]; color: string | null }[] = [];
    const regionPolys: { paths: google.maps.LatLngLiteral[]; color: string | null }[] = [];
    const areaPaths: { id: string; paths: google.maps.LatLngLiteral[]; color: string | null }[] = [];
    for (const rayon of boundaries?.rayons ?? []) {
      geometryToPaths(rayon.boundary_polygon).forEach((p) =>
        rayonPolys.push({ paths: p, color: rayon.color ?? null })
      );
      for (const region of rayon.regions ?? []) {
        geometryToPaths(region.boundary_polygon).forEach((p) =>
          regionPolys.push({ paths: p, color: region.color ?? null })
        );
      }
      for (const area of rayon.areas) {
        geometryToPaths(area.boundary_polygon).forEach((p) =>
          areaPaths.push({ id: area.id, paths: p, color: area.color ?? null })
        );
      }
    }
    return { rayonPolys, regionPolys, areaPaths };
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
      areaPaths.forEach((area) => area.paths.forEach(extend));
      workers.forEach((w) => w.lat && w.lng && extend({ lat: w.lat, lng: w.lng }));
      if (has) {
        map.fitBounds(bounds, 48);
        didFitRef.current = true;
      }
    },
    [rayonPolys, areaPaths, workers]
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
    if (focusTarget.zoom) {
      // `exact` sets the zoom absolutely (drill-back zoom-out); otherwise only
      // tighten (drill-in / focus-on-marker never zooms further out).
      map.setZoom(
        focusTarget.exact ? focusTarget.zoom : Math.max(map.getZoom() ?? 12, focusTarget.zoom)
      );
    }
  }, [focusTarget]);

  const selectedWorker =
    renderWorkers && selectedId ? workers.find((w) => w.user_id === selectedId) : null;
  // Scope-gate boundary polygons: rayon outlines from the city view down, area
  // outlines only once inside a rayon. At the top (Surabaya) the map shows just
  // the Surabaya node bubble.
  const showRayonPolys = scope !== 'surabaya';
  // Kawasan outlines are drawn tinted once you're inside a rayon (rayon/region scope).
  const showRegionPolys = scope === 'rayon' || scope === 'region';
  // Area outlines are on-demand: only at area scope, and only the SELECTED area's
  // polygon (mirrors mobile — never all of a rayon's areas at once).
  const showAreaBorders = scope === 'area';
  const visibleAreaPaths = useMemo(
    () => (scope === 'area' && areaId ? areaPaths.filter((a) => a.id === areaId) : areaPaths),
    [areaPaths, scope, areaId]
  );

  // At area scope, frame the SELECTED area's boundary once it loads — a reliable
  // "focus in" that beats a fixed zoom (areas vary in size). Runs once per area.
  const fittedAreaRef = useRef<string | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || scope !== 'area' || !areaId) {
      fittedAreaRef.current = null;
      return;
    }
    if (fittedAreaRef.current === areaId) return;
    const b = new google.maps.LatLngBounds();
    let has = false;
    visibleAreaPaths.forEach((a) =>
      a.paths.forEach((p) => {
        b.extend(p);
        has = true;
      })
    );
    if (!has) return;
    map.fitBounds(b, 80);
    fittedAreaRef.current = areaId;
  }, [scope, areaId, visibleAreaPaths]);

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

        {/* Kawasan (region) boundaries — outline + light tint in the kawasan's
            own color; drawn once you're inside a rayon. */}
        {layers.kawasan && showRegionPolys &&
          regionPolys.map((poly, i) => {
            const stroke = poly.color ?? POLYGON_STYLES.rayon.stroke;
            const fill =
              (poly.color && hexToRgba(poly.color, RAYON_FILL_ALPHA * 0.6)) ??
              POLYGON_STYLES.rayon.fill;
            return (
              <Polygon
                key={`region-${i}`}
                paths={poly.paths}
                options={{
                  strokeColor: stroke,
                  strokeWeight: 1.5,
                  strokeOpacity: 0.85,
                  fillColor: fill,
                  fillOpacity: RAYON_FILL_ALPHA * 0.6,
                  clickable: false,
                  zIndex: 2,
                }}
              />
            );
          })}

        {/* Lokasi boundaries — outline + fill in the lokasi's own color when set
            (one `lokasi` toggle); only the selected area at area scope (on-demand). */}
        {layers.lokasi && showAreaBorders &&
          visibleAreaPaths.map((area, i) => (
            <Polygon
              key={`area-${area.id}-${i}`}
              paths={area.paths}
              options={{
                strokeColor: area.color ?? POLYGON_STYLES.area.stroke,
                strokeWeight: POLYGON_STYLES.area.strokeWidth,
                strokeOpacity: 1,
                fillColor:
                  (area.color && hexToRgba(area.color, POLYGON_STYLES.area.fillOpacity)) ??
                  POLYGON_STYLES.area.fill,
                fillOpacity: POLYGON_STYLES.area.fillOpacity,
                clickable: false,
                zIndex: 3,
              }}
            />
          ))}

        {/* Drill-down node markers (Surabaya / rayon / area) — always drawn, the
            map's primary content — or clustered worker pins (gated by `petugas`).
            `teamBubbles` collapses each team's members into one bubble. */}
        {!renderWorkers ? (
          <NodeMarkerLayer nodes={nodeMarkers ?? []} onDrill={onDrillNode} zoom={zoom} />
        ) : layers.petugas ? (
          <WorkerClusterLayer
            workers={workers}
            zoom={zoom}
            bounds={bounds}
            selectedId={selectedId}
            onSelect={onSelect}
            onClusterClick={handleClusterZoom}
            teamBubbles={layers.teamBubbles}
          />
        ) : null}

        {/* Current-node pin (selected rayon at rayon scope / area at area scope):
            an icon marker that opens the node's detail — never drills. */}
        {currentNode && (
          <Marker
            key={`current-node-${currentNode.id}`}
            position={{ lat: currentNode.lat, lng: currentNode.lng }}
            onClick={() => onNodeDetail?.(currentNode)}
            icon={nodeDetailIcon(currentNode.variant)}
            zIndex={50}
            title={currentNode.name}
          />
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
