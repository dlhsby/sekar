/**
 * LocationPickerModal — fullscreen pin-drop picker.
 *
 * Used by `SubmitScreen` (staff_kecamatan) so the requester can fine-tune
 * the exact GPS coordinate of the tree to be pruned, similar to picking a
 * location in WhatsApp. The marker starts at `initial` (typically the
 * user's current GPS); the user can drag it, tap the map to relocate, use
 * the in-map zoom controls, or tap the "use my current location" button to
 * snap the pin to the device GPS. On confirm, the picked `{lat, lng}` is
 * returned to the caller.
 *
 * Wrapped in `NBModal type="fullscreen"` so the design tokens (header chrome,
 * safe-area insets, Reset/Apply footer) match the rest of the app and the
 * action buttons aren't cropped by the system gesture bar.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import MapView, {
  MapPressEvent,
  Marker,
  MarkerDragStartEndEvent,
  PROVIDER_GOOGLE,
  Region,
} from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { NBModal, NBButton } from '../nb';
import { NBText } from '../nb/NBText';
import { requestLocationPermission } from '../../services/permissions/permissionService';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbBorderRadius,
  nbShadows,
} from '../../constants/nbTokens';

interface PickedCoords {
  lat: number;
  lng: number;
}

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  /** Initial coordinate. Falls back to Surabaya centroid if null. */
  initial: PickedCoords | null;
  onConfirm: (coords: PickedCoords) => void;
}

const SURABAYA_CENTROID: PickedCoords = { lat: -7.2575, lng: 112.7521 };
const DEFAULT_ZOOM_DELTA = 0.005;
const MIN_ZOOM_DELTA = 0.0008;
const MAX_ZOOM_DELTA = 0.5;

function clampDelta(d: number): number {
  return Math.min(Math.max(d, MIN_ZOOM_DELTA), MAX_ZOOM_DELTA);
}

export function LocationPickerModal({
  visible,
  onClose,
  initial,
  onConfirm,
}: LocationPickerModalProps): React.JSX.Element {
  const start = initial ?? SURABAYA_CENTROID;
  const [coords, setCoords] = useState<PickedCoords>(start);
  const [region, setRegion] = useState<Region>({
    latitude: start.lat,
    longitude: start.lng,
    latitudeDelta: DEFAULT_ZOOM_DELTA,
    longitudeDelta: DEFAULT_ZOOM_DELTA,
  });
  const [gpsLoading, setGpsLoading] = useState(false);
  const mapRef = useRef<MapView>(null);

  // Reset picker state every time the modal is reopened.
  useEffect(() => {
    if (visible) {
      const next = initial ?? SURABAYA_CENTROID;
      setCoords(next);
      setRegion({
        latitude: next.lat,
        longitude: next.lng,
        latitudeDelta: DEFAULT_ZOOM_DELTA,
        longitudeDelta: DEFAULT_ZOOM_DELTA,
      });
    }
  }, [visible, initial]);

  const handleMapPress = useCallback((e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setCoords({ lat: latitude, lng: longitude });
  }, []);

  const handleDragEnd = useCallback((e: MarkerDragStartEndEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setCoords({ lat: latitude, lng: longitude });
  }, []);

  const animateTo = useCallback(
    (lat: number, lng: number, deltaOverride?: number) => {
      const next: Region = {
        latitude: lat,
        longitude: lng,
        latitudeDelta: clampDelta(deltaOverride ?? region.latitudeDelta),
        longitudeDelta: clampDelta(deltaOverride ?? region.longitudeDelta),
      };
      setRegion(next);
      mapRef.current?.animateToRegion(next, 250);
    },
    [region.latitudeDelta, region.longitudeDelta],
  );

  const handleZoomIn = useCallback(() => {
    animateTo(coords.lat, coords.lng, region.latitudeDelta / 2);
  }, [animateTo, coords.lat, coords.lng, region.latitudeDelta]);

  const handleZoomOut = useCallback(() => {
    animateTo(coords.lat, coords.lng, region.latitudeDelta * 2);
  }, [animateTo, coords.lat, coords.lng, region.latitudeDelta]);

  const handleUseMyLocation = useCallback(async () => {
    setGpsLoading(true);
    try {
      const perm = await requestLocationPermission();
      if (perm.status !== 'granted') {
        setGpsLoading(false);
        return;
      }
      Geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCoords({ lat, lng });
          animateTo(lat, lng, DEFAULT_ZOOM_DELTA);
          setGpsLoading(false);
        },
        () => { setGpsLoading(false); },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
      );
    } catch {
      setGpsLoading(false);
    }
  }, [animateTo]);

  const handleConfirm = useCallback(() => {
    onConfirm(coords);
    onClose();
  }, [coords, onClose, onConfirm]);

  return (
    <NBModal
      visible={visible}
      onClose={onClose}
      type="fullscreen"
      title="Pilih Titik Lokasi"
      footer={
        <View style={styles.footer}>
          <NBText variant="caption" color="gray500" style={styles.coordsText}>
            Titik: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
          </NBText>
          <View style={styles.footerActions}>
            <NBButton
              title="Batal"
              variant="secondary"
              onPress={onClose}
              style={styles.footerBtn}
            />
            <NBButton
              title="Gunakan Titik Ini"
              variant="primary"
              onPress={handleConfirm}
              style={styles.footerBtn}
              testID="location-picker-confirm"
            />
          </View>
        </View>
      }
    >
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_GOOGLE}
          region={region}
          onRegionChangeComplete={(r) => setRegion(r)}
          onPress={handleMapPress}
          scrollEnabled
          zoomEnabled
          pitchEnabled={false}
          rotateEnabled={false}
        >
          <Marker
            coordinate={{ latitude: coords.lat, longitude: coords.lng }}
            draggable
            onDragEnd={handleDragEnd}
            title="Titik permohonan"
            description="Tarik untuk menyesuaikan posisi"
          />
        </MapView>

        {/* Zoom controls — top-right floating column */}
        <View style={styles.zoomCol} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handleZoomIn}
            accessibilityRole="button"
            accessibilityLabel="Perbesar"
          >
            <MaterialCommunityIcons name="plus" size={22} color={nbColors.black} />
          </TouchableOpacity>
          <View style={styles.iconBtnDivider} />
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handleZoomOut}
            accessibilityRole="button"
            accessibilityLabel="Perkecil"
          >
            <MaterialCommunityIcons name="minus" size={22} color={nbColors.black} />
          </TouchableOpacity>
        </View>

        {/* Use-my-location button — bottom-right floating */}
        <TouchableOpacity
          style={styles.gpsBtn}
          onPress={handleUseMyLocation}
          disabled={gpsLoading}
          accessibilityRole="button"
          accessibilityLabel="Gunakan lokasi saya"
        >
          {gpsLoading ? (
            <ActivityIndicator size="small" color={nbColors.black} />
          ) : (
            <MaterialCommunityIcons name="crosshairs-gps" size={24} color={nbColors.black} />
          )}
        </TouchableOpacity>
      </View>
    </NBModal>
  );
}

const styles = StyleSheet.create({
  mapWrap: {
    flex: 1,
    margin: -nbSpacing.lg, // cancel out NBModal fullscreenBody padding
    position: 'relative',
  },
  // Floating zoom column (top-right)
  zoomCol: {
    position: 'absolute',
    top: nbSpacing.md,
    right: nbSpacing.md,
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    borderRadius: nbBorderRadius.base,
    overflow: 'hidden',
    ...nbShadows.md,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: nbColors.white,
  },
  iconBtnDivider: {
    height: 1,
    backgroundColor: nbColors.black,
  },
  // Floating GPS button (bottom-right of map area)
  gpsBtn: {
    position: 'absolute',
    bottom: nbSpacing.md,
    right: nbSpacing.md,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    borderRadius: nbBorderRadius.full,
    ...nbShadows.md,
  },
  footer: {
    gap: nbSpacing.sm,
  },
  coordsText: {
    textAlign: 'center',
  },
  footerActions: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
  },
  footerBtn: {
    flex: 1,
  },
});

export default LocationPickerModal;
