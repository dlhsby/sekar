/**
 * BoundaryOverlay Component
 * Phase 2D Gap #2: Renders district + area boundary polygons with center markers.
 * Layer order: district polygons -> area polygons -> area center markers -> district center markers.
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
import type { DistrictBoundary, AreaBoundary } from '../../types/models.types';
import { geometryToRings } from '../../utils/geoJsonUtils';
import { buildDistrictColorMap, districtColor } from './districtColors';
import { healthColor, rosterHealth } from './markerSpec';

// ─── Props ────────────────────────────────────────────────────────────────────

interface BoundaryOverlayProps {
  districts: DistrictBoundary[];
  /** Detail (marker) taps — open the node's detail sheet/modal. */
  onDistrictMarkerPress: (district: DistrictBoundary) => void;
  onAreaMarkerPress: (area: AreaBoundary) => void;
  /** Drill (bubble) taps — enter the child level + zoom in. */
  onDistrictBubblePress: (district: DistrictBoundary) => void;
  onAreaBubblePress: (area: AreaBoundary) => void;
  /**
   * Phase 3 sub-phase 3-5: layer-toggle gating. When `false`, the matching
   * boundary polygon layer is skipped entirely so the "Pengaturan" toggles
   * actually change what the user sees.
   */
  showDistricts?: boolean;
  showAreas?: boolean;
  /**
   * Ratio **bubbles** — the drill-in targets for the CHILD level (district bubbles
   * at city scope, area bubbles at district scope). Each carries `hadir/terjadwal`
   * and drills deeper on tap. Distinct from the current-node icon markers below.
   */
  showDistrictBubbles?: boolean;
  showAreaBubbles?: boolean;
  /**
   * Icon **markers** — the CURRENT node's geographic pin (selected district at
   * district scope, selected area at area scope). Opens the detail sheet on tap.
   */
  showDistrictMarker?: boolean;
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
// The CURRENT node's geographic icon pin (district office / area pin). Tapping it
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
// A ratio bubble for a CHILD node (a district at city scope, an area at district
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
  districts,
  onDistrictMarkerPress,
  onAreaMarkerPress,
  onDistrictBubblePress,
  onAreaBubblePress,
  showDistricts = true,
  showAreas = true,
  showDistrictBubbles = false,
  showAreaBubbles = false,
  showDistrictMarker = false,
  showAreaMarker = false,
  rosterById,
}: BoundaryOverlayProps): React.JSX.Element {
  // Stable per-district colors (sorted-id → fixed palette), built once per rayon set.
  const districtColors = useMemo(
    () => buildDistrictColorMap(districts.map(r => r.id)),
    [districts],
  );

  return (
    <>
      {/* Layer 1: District polygons (one <Polygon> per outer ring — handles
          both Polygon and MultiPolygon geometries). Each district gets its own
          fixed color so the 7 Rayon are visually separable. */}
      {showDistricts && districts.flatMap(district => {
        const rings = geometryToRings(district.boundary_polygon);
        // Prefer the DB-driven color; fall back to the deterministic palette
        // (covers districts seeded before the color column / non-geographic ones).
        const { stroke, fill } = district.color
          ? { stroke: district.color, fill: withAlpha(district.color, 0.14) }
          : districtColor(districtColors, district.id);
        return rings.map((ring, i) => (
          <Polygon
            key={`district-poly-${district.id}-${i}`}
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
      {showAreas && districts.flatMap(district =>
        district.areas.flatMap(area => {
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
          // No polygon → draw nothing. The radius circle that used to stand in
          // here is retired; drawing one would invent a geofence.
          return [];
        }),
      )}

      {/* Layer 3a: Area BUBBLES — a district's areas as ratio drill targets (district
          scope). Tap → drill into the area (its workers). */}
      {showAreaBubbles && districts.flatMap(district =>
        district.areas.map(area => (
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
      {showAreaMarker && districts.flatMap(district =>
        district.areas.map(area => (
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

      {/* Layer 4a: District BUBBLES — the 7 districts as ratio drill targets (city
          scope). Tap → drill into the district (its areas). */}
      {showDistrictBubbles && districts.map(district => (
        <NodeBubble
          key={`district-bubble-${district.id}`}
          coordinate={{ latitude: Number(district.center_lat), longitude: Number(district.center_lng) }}
          roster={rosterById?.[district.id]}
          label={district.name}
          onPress={(e) => { e?.stopPropagation?.(); onDistrictBubblePress(district); }}
          zIndex={10}
        />
      ))}

      {/* Layer 4b: District MARKER — the current (selected) district's office pin
          (district scope). Tap → open its detail modal. */}
      {showDistrictMarker && districts.map(district => (
        <MarkerPin
          key={`district-center-${district.id}`}
          coordinate={{ latitude: Number(district.center_lat), longitude: Number(district.center_lng) }}
          onPress={(e) => { e?.stopPropagation?.(); onDistrictMarkerPress(district); }}
          zIndex={10}
        >
          <View style={styles.districtCenterMarker}>
            <MaterialCommunityIcons name="office-building" size={18} color={nbColors.white} />
            {district.understaffed_area_count > 0 && (
              <View style={styles.understaffedBadge}>
                <NBText variant="caption" color="white" style={{ fontSize: 9, fontWeight: 'bold' }}>
                  {district.understaffed_area_count}
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
  districtCenterMarker: {
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
