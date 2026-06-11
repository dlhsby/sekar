/**
 * useMarkerPreview Hook
 * Manages marker preview card state and positioning logic.
 * Consolidated from MapDashboardScreen lines 135–136, 363–397.
 */

import { useState, useCallback } from 'react';
import MapView from 'react-native-maps';
import type { MarkerPreviewData } from '../../../components/monitoring/MarkerPreview';

const MAP_PADDING = { top: 60, right: 64, bottom: 88, left: 0 };

interface UseMarkerPreviewReturn {
  markerPreview: MarkerPreviewData | null;
  setMarkerPreview: (data: MarkerPreviewData | null) => void;
  mapLayout: { width: number; height: number };
  setMapLayout: (layout: { width: number; height: number }) => void;
  showMarkerPreview: (
    coordinate: { latitude: number; longitude: number },
    card: MarkerPreviewData['card'],
    anchorOffset: number,
    onDetail: () => void,
  ) => void;
  dismissPreview: () => void;
}

export function useMarkerPreview(
  mapRef: React.RefObject<MapView | null>,
  currentRegion: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number },
): UseMarkerPreviewReturn {
  const [markerPreview, setMarkerPreview] = useState<MarkerPreviewData | null>(null);
  const [mapLayout, setMapLayout] = useState({ width: 0, height: 0 });

  const showMarkerPreview = useCallback(
    (
      coordinate: { latitude: number; longitude: number },
      card: MarkerPreviewData['card'],
      anchorOffset: number,
      onDetail: () => void,
    ) => {
      const { width, height } = mapLayout;
      if (width <= 0 || height <= 0) { return; }
      mapRef.current?.animateToRegion(
        {
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
          latitudeDelta: currentRegion.latitudeDelta,
          longitudeDelta: currentRegion.longitudeDelta,
        },
        300,
      );
      const x = MAP_PADDING.left + (width - MAP_PADDING.left - MAP_PADDING.right) / 2;
      const y = MAP_PADDING.top + (height - MAP_PADDING.top - MAP_PADDING.bottom) / 2;
      setMarkerPreview({ x, y, anchorOffset, card, onDetail });
    },
    [mapLayout, currentRegion, mapRef],
  );

  const dismissPreview = useCallback(() => {
    setMarkerPreview((prev) => (prev ? null : prev));
  }, []);

  return {
    markerPreview,
    setMarkerPreview,
    mapLayout,
    setMapLayout,
    showMarkerPreview,
    dismissPreview,
  };
}
