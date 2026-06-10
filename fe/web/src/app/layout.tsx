import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { OfflineBanner } from '@/components/pwa/OfflineBanner';
import { UpdateToast } from '@/components/pwa/UpdateToast';

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

export const metadata: Metadata = {
  title: 'SEKAR - Sistem Evaluasi Kinerja Satgas RTH',
  description:
    'Worker tracking and task management system for DLH Surabaya - municipal department managing parks and green spaces',
  keywords: ['SEKAR', 'DLH Surabaya', 'Worker Tracking', 'RTH', 'Park Management'],
  authors: [{ name: 'DLH Surabaya' }],
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SEKAR',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1A4D2E',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        {/* Apply the saved theme before first paint to avoid a flash of the
            wrong theme. Mirrors the logic in src/lib/theme.ts. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('sekar-theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(t!=='light'&&t!=='dark'&&m)){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
        <OfflineBanner />
        <UpdateToast />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
