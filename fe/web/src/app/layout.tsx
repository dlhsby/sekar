import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SEKAR - Sistem Evaluasi Kerja Satgas RTH',
  description:
    'Worker tracking and task management system for DLH Surabaya - municipal department managing parks and green spaces',
  keywords: ['SEKAR', 'DLH Surabaya', 'Worker Tracking', 'RTH', 'Park Management'],
  authors: [{ name: 'DLH Surabaya' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={inter.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
