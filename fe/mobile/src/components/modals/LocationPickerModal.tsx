/**
 * LocationPickerModal — draggable-marker map picker.
 *
 * Used by `SubmitScreen` (staff_kecamatan) so the requester can fine-tune the
 * exact GPS coordinate of the tree to be pruned, similar to picking a location
 * in WhatsApp. The marker starts at `initial` (typically the user's current
 * GPS); the user can either drag it or tap the map to relocate it. On confirm,
 * the picked `{lat, lng}` is returned to the caller.
 *
 * Distinct from `LocationMapModal` (read-only display of current location +
 * area boundary). Built as a separate component so each can evolve
 * independently.
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import MapView, { MapPressEvent, Marker, MarkerDragEndEvent, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBText } from '../nb/NBText';
import { NBButton } from '../nb';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbShadows,
  nbBorderRadius,
} from '../../constants/nbTokens';

interface PickedCoords {
  lat: number;
  lng: number;
}

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  /**
   * Starting coordinate. If null, the modal centres on Surabaya city centroid
   * so the user has a reasonable area to drag from.
   */
  initial: PickedCoords | null;
  onConfirm: (coords: PickedCoords) => void;
}

// Surabaya city centroid — fallback when GPS is not yet available.
const SURABAYA_CENTROID: PickedCoords = { lat: -7.2575, lng: 112.7521 };

export function LocationPickerModal({
  visible,
  onClose,
  initial,
  onConfirm,
}: LocationPickerModalProps): React.JSX.Element {
  const start = initial ?? SURABAYA_CENTROID;
  const [coords, setCoords] = useState<PickedCoords>(start);

  // Reset to the latest `initial` whenever the modal is reopened.
  React.useEffect(() => {
    if (visible) {
      setCoords(initial ?? SURABAYA_CENTROID);
    }
  }, [visible, initial]);

  const region: Region = useMemo(
    () => ({
      latitude: coords.lat,
      longitude: coords.lng,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    }),
    // Only recompute the initial region when the modal opens; otherwise the
    // map keeps following the marker, which fights with user pan/zoom.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible],
  );

  const handleMapPress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setCoords({ lat: latitude, lng: longitude });
  };

  const handleDragEnd = (e: MarkerDragEndEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setCoords({ lat: latitude, lng: longitude });
  };

  const handleConfirm = () => {
    onConfirm(coords);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View
          style={styles.modalContent}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => false}
        >
          <View style={styles.header}>
            <View style={styles.titleWrap}>
              <NBText variant="h2" color="black">Pilih Titik Lokasi</NBText>
              <NBText variant="body-sm" color="gray600" style={styles.subtitle}>
                Geser pin atau ketuk peta untuk mengubah titik koordinat.
              </NBText>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Tutup pemilih lokasi"
            >
              <MaterialCommunityIcons name="close" size={24} color={nbColors.black} />
            </TouchableOpacity>
          </View>

          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={region}
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
          </View>

          <View style={styles.footer}>
            <NBText variant="caption" color="gray500">
              Koordinat: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
            </NBText>
            <View style={styles.actions}>
              <NBButton
                title="Batal"
                variant="secondary"
                onPress={onClose}
                style={styles.actionBtn}
              />
              <NBButton
                title="Gunakan Titik Ini"
                variant="primary"
                onPress={handleConfirm}
                style={styles.actionBtn}
                testID="location-picker-confirm"
              />
            </View>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: nbColors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: nbColors.surface,
    borderTopWidth: nbBorders.base,
    borderLeftWidth: nbBorders.base,
    borderRightWidth: nbBorders.base,
    borderColor: nbColors.black,
    maxHeight: '90%',
    flexShrink: 1,
    ...nbShadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
    borderBottomWidth: nbBorders.base,
    borderBottomColor: nbColors.black,
  },
  titleWrap: {
    flex: 1,
    paddingRight: nbSpacing.md,
  },
  subtitle: {
    marginTop: nbSpacing.xs,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapContainer: {
    height: 380,
    borderBottomWidth: nbBorders.base,
    borderBottomColor: nbColors.black,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  footer: {
    padding: nbSpacing.md,
    gap: nbSpacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
    marginTop: nbSpacing.xs,
  },
  actionBtn: {
    flex: 1,
  },
});

export default LocationPickerModal;
