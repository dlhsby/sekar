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

/** Build-time Google Maps key (inlined by Next). */
const BUILD_TIME_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || null;

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
  // Prefer the build-time key (inlined by Next) so maps load without an
  // auth-gated /config/maps round-trip. Fall back to the backend-served key
  // (which also powers mobile + geocoding) when not baked.
  const needConfig = !BUILD_TIME_KEY;
  const { data, isLoading } = useMapsConfig({ enabled: needConfig });
  const apiKey = BUILD_TIME_KEY ?? data?.googleMapsApiKey ?? null;

  if (needConfig && isLoading) return <>{loading ?? <DefaultLoading />}</>;
  if (!apiKey) return <>{fallback}</>;

  return (
    <ScriptGate apiKey={apiKey} fallback={fallback} loading={loading}>
      {children}
    </ScriptGate>
  );
}
