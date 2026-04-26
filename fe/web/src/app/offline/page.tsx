'use client';

import { WifiOff, RefreshCw } from 'lucide-react';

/**
 * Offline fallback page
 *
 * Precached by the service worker. Displayed when a navigation request fails
 * and no cached version of the requested page exists.
 */
export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-nb-background flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-sm w-full text-center">
        {/* SEKAR logo */}
        <div
          className="mx-auto mb-8 w-20 h-20 rounded-nb-md border-2 border-nb-black flex items-center justify-center font-bold text-4xl shadow-nb-sm"
          style={{
            background: 'var(--color-nb-sidebar-bg)',
            color: 'var(--color-nb-primary)',
          }}
          aria-hidden="true"
        >
          S
        </div>

        {/* Offline icon */}
        <div className="mx-auto mb-6 w-16 h-16 rounded-full border-2 border-nb-black flex items-center justify-center bg-nb-warning/30">
          <WifiOff className="h-8 w-8 text-nb-black" aria-hidden="true" />
        </div>

        {/* Heading */}
        <h1 className="text-nb-h1 font-bold text-nb-black uppercase tracking-wide mb-3">
          Anda Sedang Offline
        </h1>

        <p className="text-nb-body text-nb-gray-600 mb-8">
          Tidak dapat memuat halaman ini karena koneksi internet tidak tersedia. Periksa koneksi
          Anda dan coba lagi.
        </p>

        {/* Retry button */}
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-nb-base border-2 border-nb-black bg-nb-primary px-6 py-3 text-nb-body font-bold uppercase text-nb-black shadow-nb-sm hover:shadow-nb-md active:shadow-none transition-shadow min-h-[48px]"
        >
          <RefreshCw className="h-5 w-5" aria-hidden="true" />
          Coba Lagi
        </button>

        {/* Helpful note */}
        <p className="mt-6 text-nb-caption text-nb-gray-500">
          Data yang sudah dimuat sebelumnya masih dapat diakses melalui menu navigasi.
        </p>
      </div>
    </div>
  );
}
