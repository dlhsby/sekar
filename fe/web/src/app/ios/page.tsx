import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/i18n/server-metadata';
import { AppInstallPage } from '@/components/app-download/AppInstallPage';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('iosDownload');
}

export default function IosDownloadPage() {
  return <AppInstallPage platform="ios" />;
}
