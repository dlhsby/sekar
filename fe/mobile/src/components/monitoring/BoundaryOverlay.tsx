/**
 * BoundaryOverlay Component
 * Phase 2D Gap #2: Renders rayon + area boundary polygons with center markers.
 * Layer order: rayon polygons -> area polygons -> area center markers -> rayon center markers.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker, Polygon, Circle } from 'react-native-maps';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBText } from '../nb/NBText';
import {
  nbColors,
  nbBorders,
  nbShadows,
  nbTypography,
  withAlpha,
} from '../../constants/nbTokens';
import type { RayonBoundary, AreaBoundary } from '../../types/models.types';
import { geometryToRings } from '../../utils/geoJsonUtils';

// ─── Props ────────────────────────────────────────────────────────────────────

interface BoundaryOverlayProps {
  rayons: RayonBoundary[];
  onRayonPress: (rayon: RayonBoundary) => void;
  onAreaPress: (area: AreaBoundary) => void;
  /**
   * Phase 3 sub-phase 3-5: layer-toggle gating. When `false`, the matching
   * layer is skipped entirely so the MonitoringToggleSheet ("Tampilan Peta")
   * actually changes what the user sees.
   */
  showRayons?: boolean;
  showAreas?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const BoundaryOverlay = React.memo(function BoundaryOverlay({
  rayons,
  onRayonPress,
  onAreaPress,
  showRayons = true,
  showAreas = true,
}: BoundaryOverlayProps): React.JSX.Element {
  return (
    <>
      {/* Layer 1: Rayon polygons (one <Polygon> per outer ring — handles
          both Polygon and MultiPolygon geometries). */}
      {showRayons && rayons.flatMap(rayon => {
        const rings = geometryToRings(rayon.boundary_polygon);
        return rings.map((ring, i) => (
          <Polygon
            key={`rayon-poly-${rayon.id}-${i}`}
            coordinates={ring}
            strokeColor={nbColors.requestUnderReview}
            fillColor={withAlpha(nbColors.requestUnderReview, 0.08)}
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

      {/* Layer 3: Area center markers */}
      {showAreas && rayons.flatMap(rayon =>
        rayon.areas.map(area => (
          <Marker
            key={`area-center-${area.id}`}
            coordinate={{ latitude: Number(area.center_lat), longitude: Number(area.center_lng) }}
            onPress={() => onAreaPress(area)}
            tracksViewChanges={false}
            zIndex={20}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={[
              styles.areaCenterMarker,
              area.is_understaffed && styles.areaCenterUnderstaffed,
            ]}>
              <MaterialCommunityIcons
                name="map-marker"
                size={16}
                color={nbColors.white}
              />
            </View>
          </Marker>
        )),
      )}

      {/* Layer 4: Rayon center markers */}
      {showRayons && rayons.map(rayon => (
        <Marker
          key={`rayon-center-${rayon.id}`}
          coordinate={{ latitude: Number(rayon.center_lat), longitude: Number(rayon.center_lng) }}
          onPress={() => onRayonPress(rayon)}
          tracksViewChanges={false}
          zIndex={10}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={styles.rayonCenterMarker}>
            <MaterialCommunityIcons
              name="office-building"
              size={18}
              color={nbColors.white}
            />
            {rayon.understaffed_area_count > 0 && (
              <View style={styles.understaffedBadge}>
                <Text style={styles.understaffedBadgeText}>
                  {rayon.understaffed_area_count}
                </Text>
              </View>
            )}
          </View>
        </Marker>
      ))}
    </>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  areaCenterMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: nbColors.warning,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: nbBorders.base,
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
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: nbBorders.base,
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
  understaffedBadgeText: {
    color: nbColors.white,
    fontSize: 9,
    fontWeight: nbTypography.fontWeight.bold,
  },
});
