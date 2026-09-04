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

/**
 * A fill the map does not paint. `react-native-maps` has no fillOpacity prop —
 * the alpha lives in the colour — so "fill off" is a fully transparent colour
 * rather than an omitted polygon (the outline may still be wanted).
 */
const TRANSPARENT = 'rgba(0,0,0,0)';

// ─── Props ────────────────────────────────────────────────────────────────────

interface BoundaryOverlayProps {
  districts: DistrictBoundary[];
  /** Detail (marker) taps — open the node's detail sheet/modal. */
  onDistrictMarkerPress: (district: DistrictBoundary) => void;
  onAreaMarkerPress: (area: AreaBoundary) => void;
  /** Drill (bubble) taps — enter the child level + zoom in. */
  /**
   * Phase 3 sub-phase 3-5: layer-toggle gating. When `false`, the matching
   * boundary polygon layer is skipped entirely so the "Pengaturan" toggles
   * actually change what the user sees.
   */
  showDistricts?: boolean;
  showAreas?: boolean;
  /** Draw kawasan polygons. New: the payload's `regions[]` was previously discarded. */
  showRegions?: boolean;
  /**
   * Outline and fill are INDEPENDENT facets per tier (the map settings let an
   * operator ask for a wash with no border, or a border with no wash). The
   * `show*` flags above decide whether the polygon is mounted at all — scope
   * plus "either facet"; these decide which half of it paints.
   */
  districtOutline?: boolean;
  districtFill?: boolean;
  regionOutline?: boolean;
  regionFill?: boolean;
  areaOutline?: boolean;
  areaFill?: boolean;
  /** At region scope, narrow to the drilled kawasan so the view actually narrows. */
  regionId?: string | null;
  /**
   * Ratio **bubbles** — the drill-in targets for the CHILD level (district bubbles
   * at city scope, area bubbles at district scope). Each carries `hadir/terjadwal`
   * and drills deeper on tap. Distinct from the current-node icon markers below.
   */
  /**
   * Icon **markers** — the CURRENT node's geographic pin (selected district at
   * district scope, selected area at area scope). Opens the detail sheet on tap.
   */
  showDistrictMarker?: boolean;
  showAreaMarker?: boolean;
}


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

// ─── Component ────────────────────────────────────────────────────────────────

export const BoundaryOverlay = React.memo(function BoundaryOverlay({
  districts,
  onDistrictMarkerPress,
  onAreaMarkerPress,
  showDistricts = true,
  showAreas = true,
  showRegions = false,
  districtOutline = true,
  districtFill = true,
  regionOutline = true,
  regionFill = true,
  areaOutline = true,
  areaFill = true,
  regionId = null,
  showDistrictMarker = false,
  showAreaMarker = false,
}: BoundaryOverlayProps): React.JSX.Element {
  // Stable per-district colors (sorted-id → fixed palette), built once per rayon set.
  const districtColors = useMemo(
    () => buildDistrictColorMap(districts.map(r => r.id)),
    [districts],
  );

  return (
    <>
      {/* Kawasan polygons — between the rayon and its lokasi. At region scope
          only the drilled kawasan draws, so the view narrows the way it does on
          web; at district scope all of the rayon's kawasan draw. */}
      {showRegions &&
        districts.flatMap(district =>
          (district.regions ?? [])
            .filter(region => !regionId || region.id === regionId)
            .flatMap(region =>
              geometryToRings(region.boundary_polygon).map((ring, i) => (
                <Polygon
                  key={`region-poly-${region.id}-${i}`}
                  coordinates={ring}
                  strokeColor={region.border_color ?? districtColor(districtColors, district.id).stroke}
                  fillColor={
                    !regionFill
                      ? TRANSPARENT
                      : region.fill_color
                        ? withAlpha(region.fill_color, region.fill_opacity ?? 0.1)
                        : withAlpha(districtColor(districtColors, district.id).stroke, 0.08)
                  }
                  strokeWidth={regionOutline ? 1.5 : 0}
                />
              )),
            ),
        )}

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
            fillColor={districtFill ? fill : TRANSPARENT}
            strokeWidth={districtOutline ? 2 : 0}
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
                fillColor={areaFill ? withAlpha(nbColors.warningLight, 0.15) : TRANSPARENT}
                strokeWidth={areaOutline ? 2 : 0}
              />
            ));
          }
          // No polygon → draw nothing. The radius circle that used to stand in
          // here is retired; drawing one would invent a geofence.
          return [];
        }),
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
