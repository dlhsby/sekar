import type { Metadata } from 'next';
import { AppInstallPage } from '@/components/app-download/AppInstallPage';

export const metadata: Metadata = {
  title: 'Unduh Aplikasi Android (x86 / Emulator) · SEKAR',
  description:
    'Unduh varian x86/x86_64 aplikasi SEKAR untuk emulator dan PC (Android Studio, WSA, Google Play Games). HP biasa gunakan /android.',
  robots: { index: false, follow: false },
};

export default function AndroidX86DownloadPage() {
  return <AppInstallPage platform="android_x86" />;
}
