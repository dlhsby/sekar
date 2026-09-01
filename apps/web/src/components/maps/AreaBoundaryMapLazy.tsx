'use client';

/**
 * Lazy entry for AreaBoundaryMap — keeps Google Maps out of the day board's
 * initial JS. The board is a dense page that most operators use without ever
 * opening a map, so the map only arrives when one is asked for. ssr:false: the
 * map is browser-only. Mirrors SimpleMonitoringMapLazy.
 */
import dynamic from 'next/dynamic';

export const AreaBoundaryMap = dynamic(
  () => import('./AreaBoundaryMap').then((m) => m.AreaBoundaryMap),
  {
    ssr: false,
    loading: () => <div className="h-[420px] w-full animate-pulse bg-nb-gray-100" aria-hidden />,
  }
);
