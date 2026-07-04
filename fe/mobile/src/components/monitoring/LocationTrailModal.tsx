/**
 * LocationTrailModal
 *
 * A tall NBModal *sheet* (~92% height, drag-to-dismiss from the handle) that
 * hosts its OWN MapView for a worker's GPS trail. Keeping this MapView separate
 * from the main monitoring map means:
 *   - the main map keeps its boundary overlays + worker markers untouched
 *   - this map only ever has trail features (Polyline + Marker), so
 *     react-native-maps' Fabric MapView.addFeature stays in its happy path
 *
 * Sheet config that makes a hosted map usable:
 *   - `sheetHeight="92%"` — a fixed snap (a map has no intrinsic content height)
 *   - `enableContentPanningGesture={false}` — map pans don't fight the sheet;
 *     drag-to-close works from the handle only
 *   - non-scrolling body (NBModal renders BottomSheetView for fixed sheets) so
 *     the map's flex:1 container fills the sheet
 *
 * Layout:
 *   - Title bar: worker name + date stepper (headerRight) + close
 *   - Body: MapView (absoluteFill) + bottom stats bar + loading/error/empty
 *   - Float: refresh FAB above the stats bar
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { NBModal } from '../nb/NBModal';
import { nbSpacing } from '../../constants/nbTokens';
import { SURABAYA_CITY_REGION } from '../../utils/mapUtils';
import {
  LocationTrailMapLayers,
  LocationTrailOverlay,
  useLocationHistory,
} from './LocationTrail';
import { TrailDateStepper } from './TrailDateStepper';
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
  const { t } = useTranslation();
  const mapRef = useRef<MapView>(null);
  // Read here (in the normal tree) — inside gorhom's portal the inset reads 0.
  const insets = useSafeAreaInsets();
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

  const title = user?.full_name ?? t('monitoring:locationTrail.defaultTitle');
  // Shrink long names so they fit the title bar alongside the date stepper +
  // close; short names keep the default h3 size.
  const titleStyle = useMemo(() => {
    const n = title.length;
    if (n <= 16) { return undefined; }
    if (n <= 22) { return { fontSize: 16 }; }
    if (n <= 30) { return { fontSize: 14 }; }
    return { fontSize: 12 };
  }, [title]);

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
    <NBModal
      visible={visible}
      onClose={onClose}
      type="sheet"
      sheetHeight="92%"
      enableContentPanningGesture={false}
      noPadding
      title={title}
      titleStyle={titleStyle}
      headerRight={user ? <TrailDateStepper date={date} onDateChange={handleDateChange} /> : undefined}
      testID="location-trail-modal"
    >
      <View style={styles.container}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          userInterfaceStyle="light"
          style={StyleSheet.absoluteFill}
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
            onRetry={refresh}
            bottomInset={insets.bottom}
          />
        )}

        {/* Refresh FAB — refetches the same userId/date trail */}
        <View style={styles.fabAnchor} pointerEvents="box-none">
          <MapFab
            icon="refresh"
            onPress={refresh}
            accessibilityLabel={t('components:ui.mapControls.updateHistory')}
            disabled={isLoading}
          />
        </View>
      </View>
    </NBModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fabAnchor: {
    position: 'absolute',
    right: nbSpacing.md,
    bottom: STATS_BAR_HEIGHT + nbSpacing.md,
  },
});
