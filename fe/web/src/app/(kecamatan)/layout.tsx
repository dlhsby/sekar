import { ReactNode } from 'react';
import type { Metadata } from 'next';
import { SekarMark } from '@/components/brand/SekarMark';
import { KecamatanNav } from '@/components/layout/KecamatanNav';

export const metadata: Metadata = {
  title: 'SEKAR — Portal Kecamatan',
  description: 'Portal pengajuan permintaan pemotongan pohon kepada DLH Kota Surabaya',
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: 'SEKAR — Portal Kecamatan',
    description:
      'Portal pengajuan permintaan pemotongan pohon kepada DLH Kota Surabaya',
    type: 'website',
    locale: 'id_ID',
    siteName: 'SEKAR',
  },
};

/**
 * Kecamatan layout
 *
 * Minimal top-bar shell for the staff_kecamatan role — no dashboard sidebar,
 * just the SEKAR brand + Kirim Permintaan / Permintaan Saya nav and logout.
 */
export default function KecamatanLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-nb-background">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b-2 border-nb-black bg-nb-sidebar px-4">
        <div className="flex items-center gap-3">
          <span
            className="flex size-8 items-center justify-center rounded-nb-sm border-2 border-white/30 bg-nb-white"
            aria-hidden="true"
          >
            <SekarMark size={22} />
          </span>
          <div>
            <span className="text-nb-h3 font-bold uppercase tracking-wide text-white">SEKAR</span>
            <span className="ml-2 hidden text-nb-caption uppercase tracking-wide text-white/70 sm:inline">
              Portal Kecamatan
            </span>
          </div>
        </div>

        <KecamatanNav />
      </header>

      <main id="main-content" className="flex-1">
        {children}
      </main>
    </div>
  );
}
