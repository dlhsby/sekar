/**
 * LocationTrailModal
 *
 * Fullscreen modal that hosts its OWN MapView for showing a worker's GPS trail.
 * Keeping this MapView separate from the main monitoring map means:
 *   - the main map keeps its boundary overlays + worker markers untouched
 *   - this map only ever has trail features (Polyline + Marker), so
 *     react-native-maps' Fabric MapView.addFeature stays in its happy path
 *
 * Layout:
 *   - Top:    NB header (back arrow + worker name + date stepper / picker)
 *   - Map:    fills the remaining space; Polyline + Marker children only
 *   - Bottom: NB stats bar (distance / in-area / out-of-area)
 *   - Float:  refresh FAB at bottom-right above the stats bar
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, StyleSheet, StatusBar } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { nbColors, nbSpacing } from '../../constants/nbTokens';
import { SURABAYA_CITY_REGION } from '../../utils/mapUtils';
import {
  LocationTrailMapLayers,
  LocationTrailOverlay,
  useLocationHistory,
} from './LocationTrail';
import { MapFab } from './MapFab';
import type { LiveUser } from '../../types/models.types';

interface LocationTrailModalProps {
  visible: boolean;
  user: LiveUser | null;
  onClose: () => void;
}

// Reserve room above the bottom stats bar for the refresh FAB.
const STATS_BAR_HEIGHT = 84;

function todayISODate(): string {
  return new Date().toISOString().split('T')[0];
}

export function LocationTrailModal({
  visible,
  user,
  onClose,
}: LocationTrailModalProps): React.JSX.Element {
  const mapRef = useRef<MapView>(null);
  const [date, setDate] = useState<string>(todayISODate);

  // Reset to today whenever the modal opens for a new user
  useEffect(() => {
    if (visible && user) {
      setDate(todayISODate());
    }
  }, [visible, user]);

  const { history, isLoading, error, refresh } = useLocationHistory(
    visible ? user?.id : undefined,
    date,
  );

  const handleDateChange = useCallback((next: string) => {
    setDate(next);
  }, []);

  const initialRegion = useMemo(() => {
    if (user?.latitude != null && user?.longitude != null) {
      return {
        latitude: user.latitude,
        longitude: user.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
    }
    return SURABAYA_CITY_REGION;
  }, [user]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <StatusBar barStyle="dark-content" backgroundColor={nbColors.white} />
      <View style={styles.container}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          userInterfaceStyle="light"
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation={false}
          showsMyLocationButton={false}
          toolbarEnabled={false}
        >
          {user && (
            <LocationTrailMapLayers
              history={history}
              isLoading={isLoading}
              mapRef={mapRef}
            />
          )}
        </MapView>

        {/* Trail overlay UI — siblings of MapView, never MapView children */}
        {user && (
          <LocationTrailOverlay
            history={history}
            isLoading={isLoading}
            error={error}
            date={date}
            onDateChange={handleDateChange}
            userName={user.full_name}
            onClose={onClose}
          />
        )}

        {/* Refresh FAB — refetches the same userId/date trail */}
        <View style={styles.fabAnchor} pointerEvents="box-none">
          <MapFab
            icon="refresh"
            onPress={refresh}
            accessibilityLabel="Perbarui riwayat"
            disabled={isLoading}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: nbColors.background,
  },
  map: {
    flex: 1,
  },
  fabAnchor: {
    position: 'absolute',
    right: nbSpacing.md,
    bottom: STATS_BAR_HEIGHT + nbSpacing.md,
  },
});
