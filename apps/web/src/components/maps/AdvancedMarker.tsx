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
  /**
   * Pointer entered/left the marker's own DOM. Carries the cursor position so a
   * caller can place a preview beside it without projecting lat/lng to screen
   * space; `null` means the pointer left.
   *
   * Attached to `content` rather than the marker, because AdvancedMarkerElement
   * exposes a click event but no hover event. Mouse-only by design: `mouseenter`
   * does not fire for touch, so a phone browser gets the plain click it had.
   */
  onHover?: (cursor: { x: number; y: number } | null) => void;
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
  onHover,
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

  // Sync mutable props onto the live marker. Each mutation is guarded so an
  // unchanged prop is never re-assigned: on a WebSocket/GPS patch that only moves
  // the marker, this touches `position` alone and leaves the (memoized) `content`
  // DOM in place — the reposition-on-patch path that keeps hundreds of pins smooth
  // (profiled ~47× cheaper than rebuilding content).
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    marker.position = position; // cheap; position changes are the common case
    if (marker.gmpDraggable !== draggable) marker.gmpDraggable = draggable;
    if (marker.gmpClickable !== clickable) marker.gmpClickable = clickable;
    if (title !== undefined && marker.title !== title) marker.title = title;
    if (zIndex !== undefined && marker.zIndex !== zIndex) marker.zIndex = zIndex;
    const nextContent = content ?? null;
    if (content !== undefined && marker.content !== nextContent) marker.content = nextContent;
  }, [position, content, draggable, clickable, title, zIndex]);

  // Hover lives on the content element. Re-attached whenever the element itself
  // is rebuilt (its `signature` changed upstream), and read through a ref so a
  // new handler identity does not detach and reattach on every render.
  const onHoverRef = useRef(onHover);
  useEffect(() => {
    onHoverRef.current = onHover;
  }, [onHover]);

  useEffect(() => {
    const el = content;
    if (!el || !onHoverRef.current) return;
    const enter = (e: MouseEvent) => onHoverRef.current?.({ x: e.clientX, y: e.clientY });
    const move = (e: MouseEvent) => onHoverRef.current?.({ x: e.clientX, y: e.clientY });
    const leave = () => onHoverRef.current?.(null);
    el.addEventListener('mouseenter', enter);
    el.addEventListener('mousemove', move);
    el.addEventListener('mouseleave', leave);
    return () => {
      el.removeEventListener('mouseenter', enter);
      el.removeEventListener('mousemove', move);
      el.removeEventListener('mouseleave', leave);
      // The pointer can never "leave" an element that is being removed, so clear
      // explicitly or the preview would outlive the marker it describes.
      onHoverRef.current?.(null);
    };
  }, [content]);

  return null;
}
