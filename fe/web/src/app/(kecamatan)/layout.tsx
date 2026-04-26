import { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SEKAR — Portal Kecamatan',
  description: 'Portal pengajuan permintaan pemotongan pohon DLH Surabaya',
};

/**
 * Kecamatan layout
 *
 * Minimal top-bar shell for the staff_kecamatan role.
 * No dashboard sidebar — only Submit Request / My Requests / Profile.
 * Routes will be populated in sub-phase 3-10.
 */
export default function KecamatanLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-nb-background">
      {/* Top bar */}
      <header className="flex items-center justify-between h-14 px-4 border-b-2 border-nb-black bg-nb-sidebar shrink-0">
        <div className="flex items-center gap-3">
          {/* SEKAR logo mark */}
          <div
            className="flex items-center justify-center w-8 h-8 rounded-nb-sm border-2 border-white/30 font-bold text-white"
            style={{ background: 'var(--color-nb-primary)' }}
            aria-hidden="true"
          >
            S
          </div>
          <div>
            <span className="text-nb-h3 font-bold text-white uppercase tracking-wide">SEKAR</span>
            <span className="hidden sm:inline ml-2 text-nb-caption text-white/70 uppercase tracking-wide">
              Portal Kecamatan
            </span>
          </div>
        </div>

        {/* Placeholder logout — wired up in sub-phase 3-10 */}
        <nav aria-label="Navigasi kecamatan" className="flex items-center gap-2">
          <a
            href="/login"
            className="rounded-nb-base border-2 border-white/30 px-3 py-1 text-nb-caption font-semibold uppercase text-white hover:bg-white/10"
          >
            Keluar
          </a>
        </nav>
      </header>

      <main id="main-content" className="flex-1">
        {children}
      </main>
    </div>
  );
}
