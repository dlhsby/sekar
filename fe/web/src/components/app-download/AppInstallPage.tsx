'use client';

import Link from 'next/link';
import { Apple, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui';
import { BrandLockup } from '@/components/brand/BrandLockup';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { getAppDownloadUrl, type AppPlatform } from '@/lib/api/app-releases';
import { useLatestAppRelease } from '@/lib/hooks/useLatestAppRelease';
import { useAuth } from '@/lib/auth/hooks';
import { useTranslation } from 'react-i18next';

function formatBytes(bytes: number | null): string | null {
  if (!bytes || bytes <= 0) return null;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

const PLATFORM_LABEL: Record<AppPlatform, string> = {
  android: 'Android',
  ios: 'iOS',
  android_x86: 'Android (x86 / Emulator)',
};

/**
 * Public install page rendered at /android and /ios. Reads the latest published
 * release from the registry and shows version + notes + a one-tap download.
 * For a platform with nothing published (e.g. iOS today) it shows a friendly
 * "coming soon" state instead of an error.
 */
export function AppInstallPage({ platform }: { platform: AppPlatform }) {
  const { t } = useTranslation();
  const { data, status } = useLatestAppRelease(platform);
  const { user } = useAuth();
  const Icon = platform === 'ios' ? Apple : Smartphone;
  // Both `android` and `android_x86` ship a sideloadable APK.
  const isAndroid = platform.startsWith('android');
  const size = data ? formatBytes(data.fileSize) : null;
  // Context-aware "back" link: logged-in visitors go to the dashboard, logged-out
  // (e.g. a field worker who scanned the QR) go to login.
  const back = user
    ? { href: '/', label: t('install-help:download.backToDashboard') }
    : { href: '/login', label: t('install-help:download.backToLogin') };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-nb-background px-6 py-12">
      <ThemeToggle className="absolute right-6 top-6 z-20" />

      <div className="w-full max-w-[380px]">
        <div className="mb-8">
          <BrandLockup />
        </div>

        <div className="rounded-nb-md border-2 border-nb-black bg-nb-white p-6 shadow-nb-lg">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-nb-base border-2 border-nb-black bg-nb-primary text-nb-black">
              <Icon className="size-6" />
            </span>
            <div>
              <h1 className="text-nb-h2 text-nb-black">{t('install-help:download.title')}</h1>
              <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-nb-gray-600">
                {PLATFORM_LABEL[platform]}
              </p>
            </div>
          </div>

          {status === 'loading' && (
            <p className="py-6 text-center text-nb-body-sm text-nb-gray-600">{t('install-help:download.loadingRelease')}</p>
          )}

          {status === 'error' && (
            <p className="py-6 text-center text-nb-body-sm text-nb-danger-dark">
              {t('install-help:download.errorLoading')}
            </p>
          )}

          {(status === 'notFound' || (status === 'success' && !data)) && (
            <div className="py-4">
              <p className="text-nb-body-sm text-nb-gray-700">
                {platform === 'ios'
                  ? t('install-help:download.iOSNotFound')
                  : t('install-help:download.notFound')}
              </p>
            </div>
          )}

          {status === 'success' && data && (
            <div className="space-y-4">
              <dl className="space-y-1.5 text-nb-body-sm">
                <div className="flex justify-between">
                  <dt className="text-nb-gray-600">{t('install-help:download.version')}</dt>
                  <dd className="font-mono font-bold text-nb-black">v{data.version}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-nb-gray-600">{t('install-help:download.build')}</dt>
                  <dd className="font-mono text-nb-black">{data.buildNumber}</dd>
                </div>
                {size && (
                  <div className="flex justify-between">
                    <dt className="text-nb-gray-600">{t('install-help:download.size')}</dt>
                    <dd className="font-mono text-nb-black">{size}</dd>
                  </div>
                )}
              </dl>

              {data.notes && (
                <p className="whitespace-pre-line rounded-nb-base border-2 border-nb-black bg-nb-background p-3 text-nb-body-sm text-nb-gray-700">
                  {data.notes}
                </p>
              )}

              {isAndroid ? (
                <>
                  <a href={getAppDownloadUrl(platform)} download className="block">
                    <Button variant="default" fullWidth leftIcon={<Download className="size-4" />}>
                      {t('install-help:download.downloadAPK', { version: data.version })}
                    </Button>
                  </a>
                  <p className="text-nb-caption text-nb-gray-600">
                    {platform === 'android_x86'
                      ? t('install-help:download.x86Instructions')
                      : t('install-help:download.androidInstructions')}
                  </p>
                </>
              ) : (
                <a href={getAppDownloadUrl('ios')} className="block">
                  <Button variant="default" fullWidth leftIcon={<Download className="size-4" />}>
                    {t('install-help:download.install', { version: data.version })}
                  </Button>
                </a>
              )}
            </div>
          )}
        </div>

        <p className="mt-5 text-center text-nb-caption text-nb-gray-600">
          <Link href={back.href} className="font-bold text-nb-black underline underline-offset-2">
            {back.label}
          </Link>
        </p>
      </div>
    </div>
  );
}
