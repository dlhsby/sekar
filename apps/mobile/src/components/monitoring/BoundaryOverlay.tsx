/**
 * BoundaryOverlay Component
 * Phase 2D Gap #2: Renders rayon + area boundary polygons with center markers.
 * Layer order: rayon polygons -> area polygons -> area center markers -> rayon center markers.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker, Polygon, Circle } from 'react-native-maps';
import type { LatLng, MapMarkerProps } from 'react-native-maps';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBText } from '../nb/NBText';
import {
  nbColors,
  nbBorders,
  nbRadius,
  nbShadows,
  withAlpha,
} from '../../constants/nbTokens';
import type { RayonBoundary, AreaBoundary } from '../../types/models.types';
import { geometryToRings } from '../../utils/geoJsonUtils';
import { buildRayonColorMap, rayonColor } from './rayonColors';
import { healthColor, rosterHealth } from './markerSpec';

// ─── Props ────────────────────────────────────────────────────────────────────

interface BoundaryOverlayProps {
  rayons: RayonBoundary[];
  /** Detail (marker) taps — open the node's detail sheet/modal. */
  onRayonMarkerPress: (rayon: RayonBoundary) => void;
  onAreaMarkerPress: (area: AreaBoundary) => void;
  /** Drill (bubble) taps — enter the child level + zoom in. */
  onRayonBubblePress: (rayon: RayonBoundary) => void;
  onAreaBubblePress: (area: AreaBoundary) => void;
  /**
   * Phase 3 sub-phase 3-5: layer-toggle gating. When `false`, the matching
   * boundary polygon layer is skipped entirely so the "Pengaturan" toggles
   * actually change what the user sees.
   */
  showRayons?: boolean;
  showAreas?: boolean;
  /**
   * Ratio **bubbles** — the drill-in targets for the CHILD level (rayon bubbles
   * at city scope, area bubbles at rayon scope). Each carries `hadir/terjadwal`
   * and drills deeper on tap. Distinct from the current-node icon markers below.
   */
  showRayonBubbles?: boolean;
  showAreaBubbles?: boolean;
  /**
   * Icon **markers** — the CURRENT node's geographic pin (selected rayon at
   * rayon scope, selected area at area scope). Opens the detail sheet on tap.
   */
  showRayonMarker?: boolean;
  showAreaMarker?: boolean;
  /**
   * Ratio per rayon/area id (`active-and-inside-area / terjadwal`), shown on the
   * child bubbles so each drill target carries its count.
   */
  rosterById?: Record<string, { activeInside: number; scheduled: number }>;
}

type MarkerRoster = { activeInside: number; scheduled: number };

// ─── Marker pin (current node → detail) ─────────────────────────────────────────
//
// The CURRENT node's geographic icon pin (rayon office / area pin). Tapping it
// opens the node's detail sheet — it does NOT drill (you are already here), so
// it carries no ratio; the ratio lives on the child bubbles instead.

function MarkerPin({
  coordinate,
  onPress,
  zIndex,
  testID,
  children,
}: {
  coordinate: LatLng;
  onPress: MapMarkerProps['onPress'];
  zIndex: number;
  testID?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Marker
      coordinate={coordinate}
      onPress={onPress}
      tracksViewChanges={false}
      zIndex={zIndex}
      anchor={{ x: 0.5, y: 1 }}
      testID={testID}
    >
      <View style={styles.markerStack}>{children}</View>
    </Marker>
  );
}

// ─── Node bubble (child aggregate → drill) ──────────────────────────────────────
//
// A ratio bubble for a CHILD node (a rayon at city scope, an area at rayon
// scope). Shows the node name + `hadir/terjadwal`, health-colored, and drills
// one level deeper on tap. Keeps tracksViewChanges on briefly whenever the ratio
// changes so react-native-maps captures the count into the native bitmap once
// the aggregate loads (a plain tracksViewChanges={false} freezes it before the
// async count arrives).

function NodeBubble({
  coordinate,
  roster,
  label,
  onPress,
  zIndex,
  testID,
}: {
  coordinate: LatLng;
  roster?: MarkerRoster;
  label: string;
  onPress: MapMarkerProps['onPress'];
  zIndex: number;
  testID?: string;
}): React.JSX.Element {
  const [tracks, setTracks] = useState(true);
  const activeInside = roster?.activeInside;
  const scheduled = roster?.scheduled;
  useEffect(() => {
    setTracks(true);
    const id = setTimeout(() => setTracks(false), 600);
    return () => clearTimeout(id);
  }, [activeInside, scheduled]);
  const color = roster ? healthColor(rosterHealth(roster.scheduled, roster.activeInside)) : nbColors.black;
  return (
    <Marker
      coordinate={coordinate}
      onPress={onPress}
      tracksViewChanges={tracks}
      zIndex={zIndex}
      anchor={{ x: 0.5, y: 0.5 }}
      testID={testID}
    >
      <View style={[styles.bubble, { borderColor: color }]}>
        <NBText variant="caption" numberOfLines={1} style={styles.bubbleLabel}>
          {label}
        </NBText>
        <NBText variant="caption" style={[styles.bubbleRatio, { color }]}>
          {roster ? `${roster.activeInside}/${roster.scheduled}` : '—'}
        </NBText>
      </View>
    </Marker>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export const BoundaryOverlay = React.memo(function BoundaryOverlay({
  rayons,
  onRayonMarkerPress,
  onAreaMarkerPress,
  onRayonBubblePress,
  onAreaBubblePress,
  showRayons = true,
  showAreas = true,
  showRayonBubbles = false,
  showAreaBubbles = false,
  showRayonMarker = false,
  showAreaMarker = false,
  rosterById,
}: BoundaryOverlayProps): React.JSX.Element {
  // Stable per-rayon colors (sorted-id → fixed palette), built once per rayon set.
  const rayonColors = useMemo(
    () => buildRayonColorMap(rayons.map(r => r.id)),
    [rayons],
  );

  return (
    <>
      {/* Layer 1: Rayon polygons (one <Polygon> per outer ring — handles
          both Polygon and MultiPolygon geometries). Each rayon gets its own
          fixed color so the 7 Rayon are visually separable. */}
      {showRayons && rayons.flatMap(rayon => {
        const rings = geometryToRings(rayon.boundary_polygon);
        // Prefer the DB-driven color; fall back to the deterministic palette
        // (covers rayons seeded before the color column / non-geographic ones).
        const { stroke, fill } = rayon.color
          ? { stroke: rayon.color, fill: withAlpha(rayon.color, 0.14) }
          : rayonColor(rayonColors, rayon.id);
        return rings.map((ring, i) => (
          <Polygon
            key={`rayon-poly-${rayon.id}-${i}`}
            coordinates={ring}
            strokeColor={stroke}
            fillColor={fill}
            strokeWidth={2}
            lineDashPattern={[8, 4]}
          />
        ));
      })}

      {/* Layer 2: Area polygons / circles. MultiPolygon areas (e.g. Taman
          Buk Tong, Menur RSJ sisi barat/timur) emit one <Polygon> per
          member-polygon outer ring; only areas with no usable geometry at
          all fall back to a <Circle>. */}
      {showAreas && rayons.flatMap(rayon =>
        rayon.areas.flatMap(area => {
          const rings = geometryToRings(area.boundary_polygon);
          if (rings.length > 0) {
            return rings.map((ring, i) => (
              <Polygon
                key={`area-poly-${area.id}-${i}`}
                coordinates={ring}
                strokeColor={nbColors.black}
                fillColor={withAlpha(nbColors.warningLight, 0.15)}
                strokeWidth={2}
              />
            ));
          }
          return [
            <Circle
              key={`area-circle-${area.id}`}
              center={{ latitude: Number(area.center_lat), longitude: Number(area.center_lng) }}
              radius={Number(area.radius_meters)}
              strokeColor={nbColors.black}
              fillColor={withAlpha(nbColors.warningLight, 0.15)}
              strokeWidth={2}
            />,
          ];
        }),
      )}

      {/* Layer 3a: Area BUBBLES — a rayon's areas as ratio drill targets (rayon
          scope). Tap → drill into the area (its workers). */}
      {showAreaBubbles && rayons.flatMap(rayon =>
        rayon.areas.map(area => (
          <NodeBubble
            key={`area-bubble-${area.id}`}
            coordinate={{ latitude: Number(area.center_lat), longitude: Number(area.center_lng) }}
            roster={rosterById?.[area.id]}
            label={area.name}
            onPress={(e) => { e?.stopPropagation?.(); onAreaBubblePress(area); }}
            zIndex={20}
          />
        )),
      )}

      {/* Layer 3b: Area MARKER — the current (selected) area's icon pin (area
          scope). Tap → open its detail modal. */}
      {showAreaMarker && rayons.flatMap(rayon =>
        rayon.areas.map(area => (
          <MarkerPin
            key={`area-center-${area.id}`}
            coordinate={{ latitude: Number(area.center_lat), longitude: Number(area.center_lng) }}
            onPress={(e) => { e?.stopPropagation?.(); onAreaMarkerPress(area); }}
            zIndex={20}
          >
            <View style={[
              styles.areaCenterMarker,
              area.is_understaffed && styles.areaCenterUnderstaffed,
            ]}>
              <MaterialCommunityIcons name="map-marker" size={16} color={nbColors.white} />
            </View>
          </MarkerPin>
        )),
      )}

      {/* Layer 4a: Rayon BUBBLES — the 7 rayons as ratio drill targets (city
          scope). Tap → drill into the rayon (its areas). */}
      {showRayonBubbles && rayons.map(rayon => (
        <NodeBubble
          key={`rayon-bubble-${rayon.id}`}
          coordinate={{ latitude: Number(rayon.center_lat), longitude: Number(rayon.center_lng) }}
          roster={rosterById?.[rayon.id]}
          label={rayon.name}
          onPress={(e) => { e?.stopPropagation?.(); onRayonBubblePress(rayon); }}
          zIndex={10}
        />
      ))}

      {/* Layer 4b: Rayon MARKER — the current (selected) rayon's office pin
          (rayon scope). Tap → open its detail modal. */}
      {showRayonMarker && rayons.map(rayon => (
        <MarkerPin
          key={`rayon-center-${rayon.id}`}
          coordinate={{ latitude: Number(rayon.center_lat), longitude: Number(rayon.center_lng) }}
          onPress={(e) => { e?.stopPropagation?.(); onRayonMarkerPress(rayon); }}
          zIndex={10}
        >
          <View style={styles.rayonCenterMarker}>
            <MaterialCommunityIcons name="office-building" size={18} color={nbColors.white} />
            {rayon.understaffed_area_count > 0 && (
              <View style={styles.understaffedBadge}>
                <NBText variant="caption" color="white" style={{ fontSize: 9, fontWeight: 'bold' }}>
                  {rayon.understaffed_area_count}
                </NBText>
              </View>
            )}
          </View>
        </MarkerPin>
      ))}
    </>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Icon pin, anchored by the pin tip (y:1).
  markerStack: {
    alignItems: 'center',
    gap: 2,
  },
  // Child-node ratio bubble (drill target): compact named pill with a count.
  bubble: {
    alignItems: 'center',
    minWidth: 40,
    maxWidth: 96,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    backgroundColor: nbColors.white,
    ...nbShadows.sm,
  },
  bubbleLabel: {
    color: nbColors.black,
    fontWeight: '700',
    fontSize: 10,
    lineHeight: 13,
  },
  bubbleRatio: {
    fontWeight: '800',
    fontSize: 11,
    lineHeight: 14,
  },
  areaCenterMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: nbColors.warning,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.white,
    ...nbShadows.sm,
  },
  areaCenterUnderstaffed: {
    borderColor: nbColors.dangerDark,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  rayonCenterMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    // Audit H7: was '#2563EB' (exact match to nbColors.requestUnderReview).
    backgroundColor: nbColors.requestUnderReview,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.white,
    ...nbShadows.md,
  },
  understaffedBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: nbColors.dangerDark,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
