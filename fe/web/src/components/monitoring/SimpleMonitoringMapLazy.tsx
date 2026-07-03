'use client';

/**
 * Lazy entry for SimpleMonitoringMap: defers the Google Maps map component out
 * of the monitoring page's initial JS. ssr:false — the map is browser-only.
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
