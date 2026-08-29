/**
 * Notable-plant markers — the heritage and specimen trees inside a lokasi.
 *
 * This was a stub for three phases: it took a `visible` prop, returned `null`
 * unconditionally, and the Tanaman layer toggle in the tools sheet therefore
 * controlled nothing at all. A control that does nothing is worse than an
 * absent one, because the operator concludes there are no plants.
 *
 * **Lokasi scope only, deliberately.** The API is per-location
 * (`GET /areas/:id/notable-plants`), so drawing city-wide would be one request
 * per lokasi — roughly 950. Narrowing to the drilled lokasi costs one request
 * and matches the map's own logic: a tree is the densest thing on it, and the
 * tier rules already reveal the densest layer last.
 *
 * Mirrors web's `PlantMarkerLayer`, including the heritage ring — that is the
 * distinction an operator scans for; the rest belongs in the callout.
 */
import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchNotablePlants } from '../../store/slices/plantsSlice';
import { nbColors } from '../../constants/nbTokens';
import type { NotablePlant } from '../../types/plant.types';

/**
 * Coerce a coordinate, treating "absent" as unusable rather than as zero.
 *
 * `Number(null)` is 0, not NaN — so a plant recorded without a fix sails
 * through a bare `Number.isFinite` guard and pins at (0, 0), in the Atlantic.
 * This exact trap was already fixed once in `useGeoIndex`; it is written out
 * here so the next person does not have to rediscover it.
 */
const coord = (v: unknown): number => {
  if (v === null || v === undefined || v === '') return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

interface PlantOverlayLayerProps {
  visible: boolean;
  /** The drilled lokasi. Null at every other scope — nothing to fetch or draw. */
  areaId?: string | null;
  onSelect?: (plant: NotablePlant) => void;
}

export function PlantOverlayLayer({
  visible,
  areaId,
  onSelect,
}: PlantOverlayLayerProps): React.JSX.Element | null {
  const dispatch = useAppDispatch();
  const byArea = useAppSelector(s => s.plants.notableByArea);

  // Fetched only when the layer is ON and a lokasi is open: asking while the
  // toggle is off would be a request for something nobody is looking at.
  useEffect(() => {
    if (!visible || !areaId || byArea[areaId]) return;
    void dispatch(fetchNotablePlants(areaId));
  }, [visible, areaId, byArea, dispatch]);

  const plants = useMemo(() => {
    const rows = (areaId ? byArea[areaId] : undefined) ?? [];
    return rows.filter(p => !Number.isNaN(coord(p.gpsLat)) && !Number.isNaN(coord(p.gpsLng)));
  }, [byArea, areaId]);

  if (!visible || !areaId || plants.length === 0) return null;

  return (
    <>
      {plants.map(plant => (
        <Marker
          key={`plant-${plant.id}`}
          coordinate={{ latitude: coord(plant.gpsLat), longitude: coord(plant.gpsLng) }}
          onPress={() => onSelect?.(plant)}
          tracksViewChanges={false}
          anchor={{ x: 0.5, y: 0.5 }}
          zIndex={3}
          testID={`plant-marker-${plant.id}`}
        >
          <View
            style={[
              styles.pin,
              { borderColor: plant.heritage ? nbColors.warning : nbColors.gray600 },
            ]}
          >
            <MaterialCommunityIcons name="tree" size={14} color={nbColors.successDark} />
          </View>
        </Marker>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    backgroundColor: nbColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
