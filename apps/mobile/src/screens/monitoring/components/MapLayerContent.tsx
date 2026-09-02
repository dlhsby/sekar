/**
 * MapLayerContent Component
 * Renders all MapView child elements: boundary overlays, area status, user markers, preview card.
 * Consolidated from MapDashboardScreen lines 620–715.
 */

import React, { useCallback, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AreaStatusOverlay } from '../../../components/monitoring/AreaStatusOverlay';
import { PlantOverlayLayer } from '../../../components/monitoring/PlantOverlayLayer';
import { BoundaryOverlay } from '../../../components/monitoring/BoundaryOverlay';
import { NodeMarkerLayer, type NodeMarker } from '../../../components/monitoring/NodeMarkerLayer';
import { TeamMarkerLayer } from '../../../components/monitoring/TeamMarkerLayer';
import type { TeamGroup } from '../../../utils/teamGrouping';
import { UserMarker, type LabelMode } from '../../../components/monitoring/UserMarker';
import type { LiveUser } from '../../../types/models.types';
import { isZoomLike, type MonitoringMode } from '../../../store/slices/monitoringV2Slice';
import { tiersFor, ALL_TIERS } from '../../../utils/zoomTiers';
import { deltaToZoom } from '../../../utils/mercator';
import { useProgressiveReveal } from '../../../utils/progressiveReveal';
import { useAffinity } from '../../../utils/affinity';
import {
  showsBoundary,
  showsFill,
  showsNodeLabel,
  showsPolygon,
  type MonitoringV2VisibleLayers,
} from '../../../utils/layerVisibility';

interface MapLayerContentProps {
  mapReady: boolean;
  boundaries: any;
  visibleLayers: MonitoringV2VisibleLayers;
  visibleUsers: LiveUser[];
  selectedUser: LiveUser | null;
  /** The node whose detail sheet is open, exempted from reveal demotion: the
   *  card would otherwise describe something the map is showing as a dot. */
  openNodeId: string | null;
  labelMode: LabelMode;
  currentRegion: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  boundaryKey: number;
  /** Current drill scope — gates which boundary layers + markers show. */
  scope: 'city' | 'district' | 'region' | 'location';
  /** The drilled node's id — the plant layer needs it to know which lokasi. */
  viewId?: string | null;
  /** The district being viewed (district/location scope) — scopes markers to it. */
  districtId: string | null;
  /** The selected location (location scope) — only its boundary is drawn, on demand. */
  areaId: string | null;
  /** The drilled kawasan (region scope) — narrows which kawasan outline draws. */
  regionId?: string | null;
  /** Monitoring mode — `zoom` draws every tier of the subtree at once. */
  mode?: MonitoringMode;
  /** Attendance ratio per rayon/location id, shown on the geographic markers. */
  rosterById: Record<string, { activeInside: number; scheduled: number }>;
  /** Drill bubbles composed from the aggregate (district → regions ∪ region-less
   *  lokasi; region → the kawasan's lokasi). Replaces the boundary-derived bubbles
   *  so kawasan (no polygon) can render. */
  nodeMarkers: NodeMarker[];
  /** Bubble tap → drill into that node (variant decides the target scope). */
  onNodeDrill: (node: NodeMarker) => void;
  /** Collapsed team bubbles (ADR-048) to render alongside worker pins. */
  teamGroups: TeamGroup[];
  /** Team bubble tap → select the team (members-only view). */
  onTeamPress: (team: TeamGroup) => void;
  /** Unified drill-down: true → worker markers (location scope). */
  showWorkers: boolean;
  /** Bubble taps — drill into the child level (city→district, district→area). */
  onDistrictDrill: (district: any) => void;
  onAreaDrill: (area: any) => void;
  /** Marker taps — open the current node's detail sheet. */
  onDistrictDetail: (district: any) => void;
  onAreaDetail: (area: any) => void;
  onMarkerPress: (user: LiveUser) => void;
}

export function MapLayerContent({
  mapReady,
  boundaries,
  visibleLayers,
  visibleUsers,
  selectedUser,
  openNodeId,
  labelMode,
  currentRegion,
  boundaryKey,
  scope,
  viewId,
  districtId,
  areaId,
  regionId = null,
  mode = 'drill',
  rosterById,
  nodeMarkers,
  onNodeDrill,
  teamGroups,
  onTeamPress,
  showWorkers,
  onDistrictDrill,
  onAreaDrill,
  onDistrictDetail,
  onAreaDetail,
  onMarkerPress,
}: MapLayerContentProps): React.JSX.Element {
  const { t } = useTranslation();

  // Scope the boundary set to the drill level. City → all districts; district → the
  // current district (its locations are markers, not polygons, so nothing heavy draws);
  // location → the current district but ONLY the selected location's polygon (drawn on
  // demand when its marker is tapped) — this keeps the map cheap.
  const scopedDistricts = useMemo(() => {
    const all = boundaries?.districts ?? [];
    if (scope === 'location') {
      return all
        .filter((r: any) => r.id === districtId)
        .map((r: any) => ({ ...r, areas: (r.areas ?? []).filter((a: any) => a.id === areaId) }));
    }
    if (scope === 'district') {
      return all.filter((r: any) => r.id === districtId);
    }
    return all;
  }, [boundaries, scope, districtId, areaId]);

  // Viewport mode adds DEPTH to the bbox: a box at city height is the whole
  // city, so "only what is on screen" still drew every kawasan and lokasi at
  // once. Tiers now arrive as there is room for them.
  // Scope, not just camera span: drilling into a rayon reveals its subtree at
  // any span. A rayon that spans the whole city otherwise leaves the camera wide
  // after the fit and the gate shows nothing at all inside it.
  const tiers =
    mode === 'viewport'
      ? tiersFor({ latitudeDelta: currentRegion.latitudeDelta, scope })
      : ALL_TIERS;
  // Rayon outline follows its toggle from the city view down. Location outlines draw
  // ONLY at location scope (the one selected location) — never all-at-once at district scope.
  // The Surabaya top level was retired (PR2) — district boundaries show at every
  // tier when toggled (city is now the top, and it draws the district outlines).
  // "Show the polygon" is now OR over outline+fill; which of the two actually
  // paints is decided inside BoundaryOverlay. Gating on the outline alone would
  // drop a fill-only tier entirely.
  const showDistrictBoundaries = showsPolygon(visibleLayers.district) && tiers.district;
  // Lokasi outlines used to draw ONLY at location scope. Web draws them from
  // district scope down (the lokasi that have a node marker), so a supervisor
  // sees the shapes as soon as they drill in rather than one at a time.
  // Viewport draws exactly what zoom draws — the server already narrowed the
  // payload, so nothing here needs to know which of the two it is.
  const isZoom = isZoomLike(mode);
  const showAreaBoundaries =
    tiers.location &&
    showsPolygon(visibleLayers.lokasi) &&
    (isZoom || scope === 'location' || scope === 'district' || scope === 'region');
  // Kawasan outlines — new. The payload has carried `regions[]` since ADR-045;
  // mobile had no field for it, so the tier it drills THROUGH was invisible.
  const showRegionBoundaries =
    tiers.region &&
    showsPolygon(visibleLayers.kawasan) &&
    (isZoom || scope === 'district' || scope === 'region');

  // Drill BUBBLES now come from the aggregate (NodeMarkerLayer below) so the
  // kawasan tier — which has no boundary polygon — can render. BoundaryOverlay keeps
  // the polygons + the current node's DETAIL marker:
  //   • district → the selected district MARKER (detail)
  //   • location  → the selected location MARKER (detail) + worker markers
  const showDistrictBubbles = false;
  const showAreaBubbles = false;
  const showDistrictMarker = scope === 'district';
  const showAreaMarker = scope === 'location';
  const showBoundaryLayer =
    showDistrictBoundaries || showAreaBoundaries || showRegionBoundaries ||
    showDistrictMarker || showAreaMarker;

  // Bubbles obey the same depth gate as the polygons, or a tier would draw its
  // pins with no shape (and, at city height, hundreds of them at once).
  const tierScopedNodes = useMemo(
    () =>
      nodeMarkers.filter(n =>
        n.variant === 'district'
          ? tiers.district
          : n.variant === 'region'
            ? tiers.region
            : tiers.location,
      ),
    [nodeMarkers, tiers],
  );

  // ── Progressive reveal ─────────────────────────────────────────────────────
  // Ranks what the tiers admitted, so a crowd becomes a handful of full pins and
  // a field of dots rather than a wall of identical markers. Mirrors web; the
  // only platform difference is getting to a zoom level, which the camera does
  // not report directly (see `mercator.deltaToZoom`).
  const { affinityOf, visit } = useAffinity();
  // Read per render, not once: the viewport width changes on rotation, and a
  // stale width would rank against a screen that no longer exists.
  const { width: viewportWidth } = useWindowDimensions();
  const zoom = deltaToZoom(currentRegion.longitudeDelta, viewportWidth);

  const revealNodes = useMemo(
    () =>
      tierScopedNodes.map(n => ({
        id: n.id,
        lat: n.lat,
        lng: n.lng,
        variant: n.variant,
        scheduled: n.scheduled,
        clocked_in: n.clocked_in,
        belum_hadir: n.belum_hadir,
        tidak_hadir: n.tidak_hadir,
      })),
    [tierScopedNodes],
  );

  const revealWorkers = useMemo(
    () =>
      visibleUsers.map(u => ({
        user_id: u.id,
        lat: u.latitude,
        lng: u.longitude,
        status: u.status,
        is_within_area: u.is_within_area,
        is_scheduled: u.is_scheduled !== false,
      })),
    [visibleUsers],
  );

  const reveal = useProgressiveReveal({
    enabled: mode === 'viewport',
    zoom,
    nodes: revealNodes,
    workers: revealWorkers,
    affinityOf,
    // Whatever a sheet is describing stays drawn, or the card documents
    // something the map has left anonymous.
    exemptWorkerIds: [selectedUser?.id ?? null],
    exemptNodeIds: [openNodeId],
  });

  /** Engaging with someone is what makes them familiar — see `affinity.ts`. */
  const pressWorker = useCallback(
    (user: LiveUser) => {
      visit(user.id);
      onMarkerPress(user);
    },
    [visit, onMarkerPress],
  );

  return (
    <>
      {/* Boundary overlay — polygons (toggle-gated) + geographic drill markers
          (scope-gated). Keyed by scope so a drill-out fully remounts the layer
          and no stale markers linger. */}
      {mapReady && scopedDistricts.length > 0 && showBoundaryLayer && (
        <BoundaryOverlay
          key={`boundary-${scope}-${boundaryKey}`}
          districts={scopedDistricts}
          onDistrictBubblePress={onDistrictDrill}
          onAreaBubblePress={onAreaDrill}
          onDistrictMarkerPress={onDistrictDetail}
          onAreaMarkerPress={onAreaDetail}
          showDistricts={showDistrictBoundaries}
          showAreas={showAreaBoundaries}
          showRegions={showRegionBoundaries}
          // Outline and fill are independent facets: the show* flags above mount
          // the polygon (scope + either facet), these decide which half paints.
          districtOutline={showsBoundary(visibleLayers.district)}
          districtFill={showsFill(visibleLayers.district)}
          regionOutline={showsBoundary(visibleLayers.kawasan)}
          regionFill={showsFill(visibleLayers.kawasan)}
          areaOutline={showsBoundary(visibleLayers.lokasi)}
          areaFill={showsFill(visibleLayers.lokasi)}
          regionId={regionId}
          showDistrictBubbles={showDistrictBubbles}
          showAreaBubbles={showAreaBubbles}
          showDistrictMarker={showDistrictMarker}
          showAreaMarker={showAreaMarker}
          rosterById={rosterById}
        />
      )}

      {/* Drill nodes from the aggregate — district nodes (city), regions ∪
          region-less lokasi (district), a kawasan's lokasi (region); every tier
          at once in zoom/viewport. Tap → drill. */}
      {mapReady && tierScopedNodes.length > 0 && (
        <NodeMarkerLayer
          nodes={tierScopedNodes}
          onDrill={onNodeDrill}
          // Labels are their own facet: hiding a dense tier's names keeps the
          // pins, which is the common ask at a wide zoom.
          showLabels={{
            district: showsNodeLabel(visibleLayers.district),
            region: showsNodeLabel(visibleLayers.kawasan),
            location: showsNodeLabel(visibleLayers.lokasi),
          }}
          // Progressive reveal. Null outside viewport mode, which the layer reads
          // as "draw everything in full" — so drill and zoom are unchanged.
          promoted={reveal.promotedNodes}
          labelled={reveal.labelledNodes}
        />
      )}

      {/* Team bubbles (ADR-048) — a ≥2-member team collapses to one team-colored
          marker; tapping it shows the team's members and hides the other workers. */}
      {mapReady && showWorkers && teamGroups.length > 0 && (
        <TeamMarkerLayer teams={teamGroups} onTeamPress={onTeamPress} />
      )}

      {/* Phase 3: Area status overlay (plant health tints) — inside a district only */}
      {mapReady && showAreaBoundaries && scopedDistricts.length > 0 && (
        <AreaStatusOverlay
          districts={scopedDistricts}
          boundaryKey={boundaryKey}
        />
      )}

      {/* Notable plants — lokasi scope only, because the endpoint is
          per-location. Was a stub until now: the toggle controlled nothing. */}
      {mapReady && (
        <PlantOverlayLayer
          visible={visibleLayers.plants}
          areaId={scope === 'location' ? (viewId ?? null) : null}
        />
      )}

      {/* Worker pins. One marker per person — no clustering.
          Clustering was removed here for the same reason it was removed from
          web: it HID PEOPLE, which is not a property of screen size. A merged
          bubble hides its members on a phone exactly as it did on a desktop.
          The reveal withholds DETAIL and never withholds a marker: a demoted
          worker still draws, at their true position, still pressable. */}
      {showWorkers &&
        visibleUsers.map(user => {
          const demoted =
            reveal.promotedWorkers != null && !reveal.promotedWorkers.has(user.id);
          // The label pass feeds the EXISTING labelMode rather than a second
          // switch; two switches for one behaviour would eventually disagree.
          const userLabelMode: LabelMode =
            reveal.labelledWorkers != null && !reveal.labelledWorkers.has(user.id)
              ? 'none'
              : labelMode;
          return (
            <UserMarker
              key={`user-${user.id}-${user.status}-${userLabelMode}-${demoted ? 'dot' : 'pin'}`}
              user={user}
              onPress={pressWorker}
              labelMode={userLabelMode}
              demoted={demoted}
            />
          );
        })}
    </>
  );
}
