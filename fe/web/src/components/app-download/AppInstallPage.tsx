'use client';

import Link from 'next/link';
import { Apple, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui';
import { BrandLockup } from '@/components/brand/BrandLockup';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { getAppDownloadUrl, type AppPlatform } from '@/lib/api/app-releases';
import { useLatestAppRelease } from '@/lib/hooks/useLatestAppRelease';

function formatBytes(bytes: number | null): string | null {
  if (!bytes || bytes <= 0) return null;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

const PLATFORM_LABEL: Record<AppPlatform, string> = { android: 'Android', ios: 'iOS' };

/**
 * Public install page rendered at /android and /ios. Reads the latest published
 * release from the registry and shows version + notes + a one-tap download.
 * For a platform with nothing published (e.g. iOS today) it shows a friendly
 * "coming soon" state instead of an error.
 */
export function AppInstallPage({ platform }: { platform: AppPlatform }) {
  const { data, status } = useLatestAppRelease(platform);
  const Icon = platform === 'ios' ? Apple : Smartphone;
  const size = data ? formatBytes(data.fileSize) : null;

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
              <h1 className="text-nb-h2 text-nb-black">Aplikasi SEKAR</h1>
              <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-nb-gray-600">
                {PLATFORM_LABEL[platform]}
              </p>
            </div>
          </div>

          {status === 'loading' && (
            <p className="py-6 text-center text-nb-body-sm text-nb-gray-600">Memuat versi terbaru…</p>
          )}

          {status === 'error' && (
            <p className="py-6 text-center text-nb-body-sm text-nb-danger-dark">
              Gagal memuat info rilis. Coba muat ulang halaman.
            </p>
          )}

          {(status === 'notFound' || (status === 'success' && !data)) && (
            <div className="py-4">
              <p className="text-nb-body-sm text-nb-gray-700">
                {platform === 'ios'
                  ? 'Aplikasi iOS belum tersedia. Versi App Store / TestFlight akan diumumkan di sini.'
                  : 'Belum ada rilis yang dipublikasikan. Silakan cek kembali nanti.'}
              </p>
            </div>
          )}

          {status === 'success' && data && (
            <div className="space-y-4">
              <dl className="space-y-1.5 text-nb-body-sm">
                <div className="flex justify-between">
                  <dt className="text-nb-gray-600">Versi</dt>
                  <dd className="font-mono font-bold text-nb-black">v{data.version}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-nb-gray-600">Build</dt>
                  <dd className="font-mono text-nb-black">{data.buildNumber}</dd>
                </div>
                {size && (
                  <div className="flex justify-between">
                    <dt className="text-nb-gray-600">Ukuran</dt>
                    <dd className="font-mono text-nb-black">{size}</dd>
                  </div>
                )}
              </dl>

              {data.notes && (
                <p className="whitespace-pre-line rounded-nb-base border-2 border-nb-black bg-nb-background p-3 text-nb-body-sm text-nb-gray-700">
                  {data.notes}
                </p>
              )}

              {platform === 'android' ? (
                <>
                  <a href={getAppDownloadUrl('android')} download className="block">
                    <Button variant="default" fullWidth leftIcon={<Download className="size-4" />}>
                      Unduh APK (v{data.version})
                    </Button>
                  </a>
                  <p className="text-nb-caption text-nb-gray-600">
                    Setelah terunduh, buka berkasnya dan izinkan pemasangan dari sumber ini bila
                    diminta.
                  </p>
                </>
              ) : (
                <a href={getAppDownloadUrl('ios')} className="block">
                  <Button variant="default" fullWidth leftIcon={<Download className="size-4" />}>
                    Pasang (v{data.version})
                  </Button>
                </a>
              )}
            </div>
          )}
        </div>

        <p className="mt-5 text-center text-nb-caption text-nb-gray-600">
          <Link href="/login" className="font-bold text-nb-black underline underline-offset-2">
            ← Kembali ke halaman masuk
          </Link>
        </p>
      </div>
    </div>
  );
}
