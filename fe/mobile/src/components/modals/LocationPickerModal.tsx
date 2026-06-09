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
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import MapView, {
  PROVIDER_GOOGLE,
  Region,
} from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { NBModal } from '../nb';
import { NBButton } from '../nb';
import { NBText } from '../nb/NBText';
import { requestLocationPermission } from '../../services/permissions/permissionService';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
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

  // May 2026 — switched to "drag the map, pin stays in the center" UX
  // (FakeGPS-style). The pin is a static overlay; the picked coordinate is
  // the center of the visible map region, recomputed on every pan-end.
  const handleRegionChangeComplete = useCallback((r: Region) => {
    setRegion(r);
    setCoords({ lat: r.latitude, lng: r.longitude });
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

  const footerContent = (
    <View style={styles.footerContent}>
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
  );

  return (
    <NBModal
      visible={visible}
      onClose={onClose}
      title="Pilih Titik Lokasi"
      type="fullscreen"
      noPadding
      footer={footerContent}
    >
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_GOOGLE}
          region={region}
          onRegionChangeComplete={handleRegionChangeComplete}
          scrollEnabled
          zoomEnabled
          pitchEnabled={false}
          rotateEnabled={false}
        />

        {/* Fixed center pin overlay — FakeGPS-style picker. The marker
            sits at the geometric center of the map view; whatever
            coordinate the map is centered on becomes the picked one. */}
        <View pointerEvents="none" style={styles.centerPinWrap}>
          <MaterialCommunityIcons
            name="map-marker"
            size={48}
            color={nbColors.danger}
            style={styles.centerPin}
          />
          <View style={styles.pinShadow} />
        </View>

        {/* Hint banner — top */}
        <View style={styles.hintBanner} pointerEvents="none">
          <NBText variant="caption" color="black" style={styles.hintText}>
            Geser peta agar penanda jatuh di titik yang Anda inginkan.
          </NBText>
        </View>

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
    position: 'relative',
  },
  // Fixed center-pin overlay (FakeGPS-style picker)
  centerPinWrap: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    // Pin point sits at the visual center; offset so the marker tip lines up
    // with the screen center (icon is 48 px, tip is at the bottom).
    marginLeft: -24,
    marginTop: -48,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  centerPin: {
    // Drop shadow on the pin itself for visibility against light/dark map tiles.
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  pinShadow: {
    width: 12,
    height: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.35)',
    marginTop: -6,
  },
  hintBanner: {
    position: 'absolute',
    top: nbSpacing.md,
    alignSelf: 'center',
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.xs,
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    ...nbShadows.sm,
  },
  hintText: {
    textAlign: 'center',
  },
  // Floating zoom column (top-right) — pushed down so it doesn't overlap
  // the centered hint banner at top: nbSpacing.md.
  zoomCol: {
    position: 'absolute',
    top: nbSpacing.md + 52,
    right: nbSpacing.md,
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
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
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.full,
    ...nbShadows.md,
  },
  footerContent: {
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
