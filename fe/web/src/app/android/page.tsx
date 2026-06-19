import type { Metadata } from 'next';
import { AppInstallPage } from '@/components/app-download/AppInstallPage';

export const metadata: Metadata = {
  title: 'Unduh Aplikasi Android · SEKAR',
  description: 'Unduh aplikasi mobile SEKAR untuk Android.',
};

export default function AndroidDownloadPage() {
  return <AppInstallPage platform="android" />;
}
