/**
 * useMapOperations Hook
 * Manages map camera operations: geolocation, compass reset, zoom in/out, cluster focus.
 * Consolidated from MapDashboardScreen lines 494–574.
 */

import { useCallback } from 'react';
import MapView from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';

interface CurrentRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface UseMapOperationsReturn {
  handleMyLocation: () => void;
  resetHeading: () => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleClusterPress: (center: { latitude: number; longitude: number }) => void;
}

export function useMapOperations(
  mapRef: React.RefObject<MapView | null>,
  currentRegion: CurrentRegion,
): UseMapOperationsReturn {
  const handleMyLocation = useCallback(() => {
    Geolocation.getCurrentPosition(
      pos => {
        mapRef.current?.animateToRegion(
          {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          300,
        );
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, [mapRef]);

  const resetHeading = useCallback(() => {
    mapRef.current?.animateCamera({ heading: 0, pitch: 0 }, { duration: 300 });
  }, [mapRef]);

  const handleZoomIn = useCallback(() => {
    mapRef.current?.animateToRegion(
      {
        latitude: currentRegion.latitude,
        longitude: currentRegion.longitude,
        latitudeDelta: currentRegion.latitudeDelta / 2,
        longitudeDelta: currentRegion.longitudeDelta / 2,
      },
      250,
    );
  }, [currentRegion, mapRef]);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.animateToRegion(
      {
        latitude: currentRegion.latitude,
        longitude: currentRegion.longitude,
        latitudeDelta: currentRegion.latitudeDelta * 2,
        longitudeDelta: currentRegion.longitudeDelta * 2,
      },
      250,
    );
  }, [currentRegion, mapRef]);

  const handleClusterPress = useCallback(
    (center: { latitude: number; longitude: number }) => {
      mapRef.current?.animateToRegion(
        {
          latitude: center.latitude,
          longitude: center.longitude,
          latitudeDelta: currentRegion.latitudeDelta / 3,
          longitudeDelta: currentRegion.longitudeDelta / 3,
        },
        300,
      );
    },
    [currentRegion, mapRef],
  );

  return {
    handleMyLocation,
    resetHeading,
    handleZoomIn,
    handleZoomOut,
    handleClusterPress,
  };
}
