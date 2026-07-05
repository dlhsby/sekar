import { ReactNode } from 'react';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/i18n/server-metadata';
import { resolveServerLang } from '@/lib/i18n/server-metadata';
import { SekarMark } from '@/components/brand/SekarMark';
import { KecamatanNav } from '@/components/layout/KecamatanNav';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('kecamatanPortal');
}

/**
 * Kecamatan layout
 *
 * Minimal top-bar shell for the staff_kecamatan role — no dashboard sidebar,
 * just the SEKAR brand + Kirim Permintaan / Permintaan Saya nav and logout.
 */
export default async function KecamatanLayout({ children }: { children: ReactNode }) {
  const lang = await resolveServerLang();
  const portalSubtitle = lang === 'en' ? 'District Portal' : 'Portal Kecamatan';
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
            <span className="ml-2 hidden text-nb-caption uppercase tracking-wide text-white/70 sm:inline">{portalSubtitle}</span>
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
