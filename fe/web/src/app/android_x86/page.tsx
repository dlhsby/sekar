import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/i18n/server-metadata';
import { AppInstallPage } from '@/components/app-download/AppInstallPage';

export async function generateMetadata(): Promise<Metadata> {
  return { ...(await pageMetadata('androidX86Download')), robots: { index: false, follow: false } };
}

export default function AndroidX86DownloadPage() {
  return <AppInstallPage platform="android_x86" />;
}
