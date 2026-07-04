import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/i18n/server-metadata';
import { AppInstallPage } from '@/components/app-download/AppInstallPage';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('androidDownload');
}

export default function AndroidDownloadPage() {
  return <AppInstallPage platform="android" />;
}
