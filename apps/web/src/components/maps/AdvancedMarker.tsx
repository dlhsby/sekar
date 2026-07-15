'use client';

/**
 * Imperative React wrapper around `google.maps.marker.AdvancedMarkerElement`,
 * the modern replacement for the deprecated `google.maps.Marker`. Renders no DOM
 * of its own — it attaches/detaches the marker on the parent `<GoogleMap>` (via
 * `useGoogleMap()`) as a child.
 *
 * Requirements (both provided by GoogleMapsGate + the map's options):
 *  - the `marker` library is loaded (`libraries: ['marker']`), and
 *  - the map has a vector `mapId` — Advanced Markers only render on vector maps.
 *
 * `content` is an optional DOM node used as the marker's visual (e.g. an <img>
 * for an icon or a styled <div> pin); omit it for Google's default pin.
 */

import { useEffect, useRef } from 'react';
import { useGoogleMap } from '@react-google-maps/api';

export interface AdvancedMarkerProps {
  position: google.maps.LatLngLiteral;
  /** DOM visual for the marker; omit for the default pin. */
  content?: HTMLElement | null;
  draggable?: boolean;
  clickable?: boolean;
  title?: string;
  zIndex?: number;
  onClick?: () => void;
  onDragEnd?: (position: google.maps.LatLngLiteral) => void;
}

function toLatLngLiteral(
  p: google.maps.LatLng | google.maps.LatLngLiteral | null | undefined,
): google.maps.LatLngLiteral | null {
  if (!p) return null;
  const lat = typeof p.lat === 'function' ? p.lat() : (p.lat as number);
  const lng = typeof p.lng === 'function' ? p.lng() : (p.lng as number);
  return { lat, lng };
}

export function AdvancedMarker({
  position,
  content,
  draggable = false,
  clickable = true,
  title,
  zIndex,
  onClick,
  onDragEnd,
}: AdvancedMarkerProps) {
  const map = useGoogleMap();
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  // Keep the latest handlers without re-attaching listeners each render.
  const onClickRef = useRef(onClick);
  const onDragEndRef = useRef(onDragEnd);
  useEffect(() => {
    onClickRef.current = onClick;
    onDragEndRef.current = onDragEnd;
  });

  // Create the marker once the map + marker library are ready; tear down on unmount.
  useEffect(() => {
    const markerLib = google.maps.marker;
    if (!map || !markerLib?.AdvancedMarkerElement) return;

    const marker = new markerLib.AdvancedMarkerElement({ map, position });
    markerRef.current = marker;

    const listeners: google.maps.MapsEventListener[] = [
      marker.addListener('click', () => onClickRef.current?.()),
      marker.addListener('dragend', () => {
        const p = toLatLngLiteral(marker.position);
        if (p) onDragEndRef.current?.(p);
      }),
    ];

    return () => {
      listeners.forEach((l) => l.remove());
      marker.map = null;
      markerRef.current = null;
    };
    // Recreate only when the map instance changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // Sync mutable props onto the live marker.
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    marker.position = position;
    marker.gmpDraggable = draggable;
    marker.gmpClickable = clickable;
    if (title !== undefined) marker.title = title;
    if (zIndex !== undefined) marker.zIndex = zIndex;
    if (content !== undefined) marker.content = content ?? null;
  }, [position, content, draggable, clickable, title, zIndex]);

  return null;
}
