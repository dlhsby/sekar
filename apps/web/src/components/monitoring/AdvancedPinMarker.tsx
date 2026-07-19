'use client';

/**
 * AdvancedPinMarker — one monitoring pin on an AdvancedMarkerElement, with the
 * reposition-on-patch guarantee built in.
 *
 * The pin's DOM `content` is memoized by `signature` (which deliberately EXCLUDES
 * position). Because each pin is a stable, keyed React element, its `useMemo`
 * survives re-renders: a WebSocket/GPS patch that only moves the marker leaves the
 * memoized `content` untouched, so the underlying marker only updates `position`
 * — never rebuilds its DOM (profiled ~47× cheaper than clear-and-rebuild, the
 * whole reason the layer runs on Advanced Markers). When a marker leaves the
 * scope React unmounts it, discarding its memo — natural eviction, no shared cache.
 */
import { useMemo } from 'react';
import { AdvancedMarker } from '@/components/maps/AdvancedMarker';

export interface AdvancedPinMarkerProps {
  position: google.maps.LatLngLiteral;
  /** Cache key for `content`: rebuild only when this changes. Exclude position. */
  signature: string;
  /** Builds the pin's DOM element; called only when `signature` changes. */
  build: () => HTMLElement;
  onClick?: () => void;
  title?: string;
  zIndex?: number;
}

export function AdvancedPinMarker({
  position,
  signature,
  build,
  onClick,
  title,
  zIndex,
}: AdvancedPinMarkerProps) {
  // `signature` is the intended cache key; `build` is a fresh closure each render
  // by design, so it is deliberately not a dependency.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const content = useMemo(() => build(), [signature]);
  return (
    <AdvancedMarker
      position={position}
      content={content}
      onClick={onClick}
      title={title}
      zIndex={zIndex}
    />
  );
}
