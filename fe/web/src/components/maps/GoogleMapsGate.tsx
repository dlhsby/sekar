'use client';

/**
 * Google Maps loader gate.
 *
 * Fetches the API key at runtime (GET /config/maps) and loads the Google Maps
 * JS SDK once. Renders `children` only after the SDK is ready; renders
 * `fallback` when no key is configured or loading fails (graceful degradation
 * to manual inputs / external links). Loading is lazy — this only fires when a
 * map actually mounts.
 */

import type { ReactNode } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { Spinner } from '@/components/ui';
import { useMapsConfig } from '@/lib/api/config';

export interface GoogleMapsGateProps {
  children: ReactNode;
  /** Rendered when no key is set or the config/script fails to load. */
  fallback: ReactNode;
  /** Rendered while config is fetching or the script is loading. */
  loading?: ReactNode;
}

function DefaultLoading() {
  return (
    <div className="flex h-[320px] items-center justify-center rounded-nb-base border-2 border-nb-black bg-nb-gray-100">
      <Spinner label="Memuat peta…" />
    </div>
  );
}

function ScriptGate({ apiKey, children, fallback, loading }: { apiKey: string } & GoogleMapsGateProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'sekar-google-maps-script',
    googleMapsApiKey: apiKey,
  });

  if (loadError) return <>{fallback}</>;
  if (!isLoaded) return <>{loading ?? <DefaultLoading />}</>;
  return <>{children}</>;
}

export function GoogleMapsGate({ children, fallback, loading }: GoogleMapsGateProps) {
  const { data, isLoading, isError } = useMapsConfig();
  const apiKey = data?.googleMapsApiKey ?? null;

  if (isLoading) return <>{loading ?? <DefaultLoading />}</>;
  if (isError || !apiKey) return <>{fallback}</>;

  return (
    <ScriptGate apiKey={apiKey} fallback={fallback} loading={loading}>
      {children}
    </ScriptGate>
  );
}
