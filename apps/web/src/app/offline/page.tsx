'use client';

import { WifiOff, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SekarLogoBox } from '@/components/brand/SekarLogoBox';

/**
 * Offline fallback page
 *
 * Precached by the service worker. Displayed when a navigation request fails
 * and no cached version of the requested page exists.
 */
export default function OfflinePage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-nb-background flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-sm w-full text-center">
        {/* SEKAR pinwheel logo */}
        <div className="mb-8 flex justify-center">
          <SekarLogoBox size={72} />
        </div>

        {/* Offline icon */}
        <div className="mx-auto mb-6 w-16 h-16 rounded-full border-2 border-nb-black flex items-center justify-center bg-nb-warning/30">
          <WifiOff className="h-8 w-8 text-nb-black" aria-hidden="true" />
        </div>

        {/* Heading */}
        <h1 className="text-nb-h1 font-bold text-nb-black uppercase tracking-wide mb-3">{t("common:offline.title")}</h1>

        <p className="text-nb-body text-nb-gray-600 mb-8">{t("common:offline.body")}</p>

        {/* Retry button */}
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-nb-base border-2 border-nb-black bg-nb-primary px-6 py-3 text-nb-body font-bold uppercase text-nb-black shadow-nb-sm hover:shadow-nb-md active:shadow-none transition-shadow min-h-[48px]"
        >
          <RefreshCw className="h-5 w-5" aria-hidden="true" />
          {t("common:actions.retry")}
        </button>

        {/* Helpful note */}
        <p className="mt-6 text-nb-caption text-nb-gray-500">{t("common:offline.cachedNote")}</p>
      </div>
    </div>
  );
}
