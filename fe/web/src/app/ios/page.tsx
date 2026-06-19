import type { Metadata } from 'next';
import { AppInstallPage } from '@/components/app-download/AppInstallPage';

export const metadata: Metadata = {
  title: 'Unduh Aplikasi iOS · SEKAR',
  description: 'Unduh aplikasi mobile SEKAR untuk iOS.',
};

export default function IosDownloadPage() {
  return <AppInstallPage platform="ios" />;
}
