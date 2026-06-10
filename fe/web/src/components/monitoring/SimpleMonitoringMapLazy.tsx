'use client';

/**
 * Lazy entry for SimpleMonitoringMap (Phase 4-7 G1): defers the mapbox-gl
 * bundle (~230 kB gz) out of the monitoring page's initial JS. ssr:false —
 * Mapbox GL is browser-only.
 */
import dynamic from 'next/dynamic';

export const SimpleMonitoringMap = dynamic(
  () => import('./SimpleMonitoringMap').then((m) => m.SimpleMonitoringMap),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 animate-pulse bg-nb-gray-100" aria-hidden="true" />
    ),
  }
);
