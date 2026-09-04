/**
 * useMapOperations Hook
 * Manages map camera operations: geolocation, compass reset, zoom in/out, cluster focus.
 * Consolidated from MapDashboardScreen lines 494–574.
 */

import { useCallback } from 'react';
import MapView from 'react-native-maps';
import { readPosition } from '../../../services/location/verifiedPosition';

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
}

export function useMapOperations(
  mapRef: React.RefObject<MapView | null>,
  currentRegion: CurrentRegion,
): UseMapOperationsReturn {
  const handleMyLocation = useCallback(() => {
    // allowMocked: this only recentres the supervisor's map. Nothing is
    // recorded, so refusing a mocked fix would break the button on an emulator
    // for no security gain.
    readPosition({ allowMocked: true })
      .then((pos) => {
        mapRef.current?.animateToRegion(
          {
            latitude: pos.latitude,
            longitude: pos.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          300,
        );
      })
      .catch(() => {});
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

  return {
    handleMyLocation,
    resetHeading,
    handleZoomIn,
    handleZoomOut,
  };
}
