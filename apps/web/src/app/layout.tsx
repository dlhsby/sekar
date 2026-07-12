import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { OfflineBanner } from '@/components/pwa/OfflineBanner';
import { UpdateToast } from '@/components/pwa/UpdateToast';
import { resolveServerLang } from '@/lib/i18n/server-metadata';
import { resolveServerTheme } from '@/lib/theme-server';
import { PAGE_METADATA } from '@/lib/i18n/page-metadata';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-body',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-display',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-mono',
  display: 'swap',
});

// PWA install affordance is gated by the same flag as the service worker
// (providers.tsx). Modern Chrome/Edge make a page installable from a valid
// manifest ALONE (no SW required), so the manifest link must also respect the
// flag — otherwise staging (FEATURE_PWA=false) still shows an install prompt.
const pwaEnabled = process.env.NEXT_PUBLIC_FEATURE_PWA === 'true';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await resolveServerLang();
  const m = PAGE_METADATA[lang].root;
  return {
    // Resolves relative OG/Twitter image URLs (e.g. /og-image.png) against the
    // real site origin instead of Next's localhost:3000 default.
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://sekar.wahyutrip.com'),
    title: {
      template: '%s · SEKAR',
      default: m.title,
    },
    description: m.description,
    keywords: ['SEKAR', 'DLH Surabaya', 'Worker Tracking', 'RTH', 'Park Management', 'Satgas', 'Monitoring'],
    authors: [{ name: 'DLH Surabaya' }],
    // Only advertise the manifest when PWA is enabled — its mere presence makes
    // the page installable in Chromium (SW not required).
    ...(pwaEnabled ? { manifest: '/manifest.webmanifest' } : {}),
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title: m.title,
      description: m.description,
      type: 'website',
      locale: m.ogLocale,
      siteName: 'SEKAR',
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: 'SEKAR Dashboard',
        },
      ],
    },
    // iOS add-to-home-screen affordance — also gated by the PWA flag.
    ...(pwaEnabled
      ? {
          appleWebApp: {
            capable: true,
            statusBarStyle: 'black-translucent' as const,
            title: 'SEKAR',
          },
        }
      : {}),
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1A4D2E',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [lang, theme] = await Promise.all([resolveServerLang(), resolveServerTheme()]);
  return (
    // Theme class is rendered server-side from the `sekar-theme` cookie (no inline
    // no-flash script). suppressHydrationWarning covers the first-visit case where
    // the client store resolves the system preference and updates the class.
    <html lang={lang} className={theme === 'dark' ? 'dark' : undefined} suppressHydrationWarning>
      <head>{pwaEnabled && <link rel="apple-touch-icon" href="/apple-icon.png" />}</head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
        <OfflineBanner />
        <UpdateToast />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
