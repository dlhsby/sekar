'use client';

import { useEffect, useState } from 'react';
import { appReleasesApi, type AppPlatform, type AppRelease } from '@/lib/api/app-releases';

export type AppReleaseStatus = 'loading' | 'success' | 'notFound' | 'error';

/**
 * Fetch the latest published mobile release. Deliberately provider-free
 * (plain fetch-in-effect, not TanStack Query) so it works on the PUBLIC login
 * page and /android · /ios pages, which render outside the dashboard's
 * QueryClientProvider. A 404 (nothing published yet) is surfaced as `notFound`
 * rather than an error so the UI can show a friendly "not available" state.
 */
export function useLatestAppRelease(platform: AppPlatform = 'android') {
  const [data, setData] = useState<AppRelease | null>(null);
  const [status, setStatus] = useState<AppReleaseStatus>('loading');

  useEffect(() => {
    // `status` starts at 'loading'; we only flip it from the async callbacks
    // (avoids a synchronous setState in the effect body). `platform` is constant
    // per page, so no mid-life reset is needed.
    let active = true;
    appReleasesApi
      .getLatest(platform)
      .then((release) => {
        if (!active) return;
        setData(release);
        setStatus('success');
      })
      .catch((error: unknown) => {
        if (!active) return;
        const code = (error as { response?: { status?: number } })?.response?.status;
        setStatus(code === 404 ? 'notFound' : 'error');
      });
    return () => {
      active = false;
    };
  }, [platform]);

  return { data, status };
}
