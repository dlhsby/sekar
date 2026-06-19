'use client';

import Link from 'next/link';
import { Smartphone } from 'lucide-react';
import { useLatestAppRelease } from '@/lib/hooks/useLatestAppRelease';

/**
 * Login-page hint pointing field workers (satgas/linmas/korlap) to the native
 * Android app, with the live version once the registry responds. Links to the
 * public /android page rather than embedding the download flow here.
 */
export function AppDownloadLoginLink() {
  const { data, status } = useLatestAppRelease('android');
  const versionLabel = status === 'success' && data ? ` (v${data.version})` : '';

  return (
    <Link
      href="/android"
      className="mt-6 flex items-center justify-center gap-2 rounded-nb-base border-2 border-nb-black bg-nb-white px-4 py-3 text-nb-body-sm font-bold text-nb-black shadow-nb-sm transition-all duration-100 hover:bg-nb-gray-50 active:translate-x-0.5 active:translate-y-0.5 active:shadow-nb-active focus-visible:outline focus-visible:outline-4 focus-visible:outline-nb-primary/50 focus-visible:outline-offset-2"
    >
      <Smartphone className="size-4" />
      Unduh Aplikasi Android{versionLabel}
    </Link>
  );
}
