/**
 * Kecamatan "Permintaan Saya" — KEC-1 (Phase 4-R).
 *
 * Lists the staff_kecamatan user's own submissions (GET /pruning-requests?mine=true),
 * newest-first, with a status pill per request. Mirrors the mobile
 * MyRequestsScreen. Read-only — submission happens on the sibling form page.
 */

'use client';

import Link from 'next/link';
import { intlLocale } from '@/lib/i18n/date-locale';
import { useRouter } from 'next/navigation';
import { Plus, TreePine } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button, EmptyState, SectionCard, SkeletonCard, StatusPill } from '@/components/ui';
import { useMyPruningRequests } from '@/lib/api/pruning-requests';
import {
  getPruningRequestStatusLabel,
  PRUNING_REQUEST_STATUS_BADGES,
  PRUNING_REQUEST_STATUS_TONES,
} from '@/lib/constants/pruning-requests';

function expectedLabel(req: {
  expectedDate: string | null;
  expectedYear: number | null;
  expectedIsoWeek: number | null;
}): string {
  if (req.expectedDate) return new Date(req.expectedDate).toLocaleDateString(intlLocale());
  if (req.expectedYear && req.expectedIsoWeek) return `Minggu ${req.expectedIsoWeek}/${req.expectedYear}`;
  return 'Belum ditentukan';
}

export default function MyPruningRequestsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, isLoading, isError } = useMyPruningRequests();
  const requests = data ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-nb-h2 text-nb-black">{t('pruning:myRequests.pageTitle')}</h1>
          <p className="mt-0.5 text-nb-body-sm text-nb-gray-600">
            {t('pruning:myRequests.description')}
          </p>
        </div>
        <Button asChild leftIcon={<Plus className="size-4" />}>
          <Link href="/pruning-submit">{t('common:actions.create')}</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : isError ? (
        <EmptyState
          variant="error"
          title={t('pruning:myRequests.errorTitle')}
          description={t('pruning:myRequests.errorDescription')}
        />
      ) : requests.length === 0 ? (
        <EmptyState
          variant="noData"
          title={t('pruning:myRequests.emptyTitle')}
          description={t('pruning:myRequests.emptyDescription')}
          action={{
            label: t('pruning:myRequests.emptyAction'),
            onClick: () => router.push('/pruning-submit'),
          }}
        />
      ) : (
        <ul className="space-y-3">
          {requests.map((req) => (
            <li key={req.id}>
              <SectionCard className="transition-shadow hover:shadow-nb-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <TreePine className="size-4 shrink-0 text-nb-primary" aria-hidden="true" />
                      <span className="font-mono text-[12px] font-bold text-nb-black">
                        {req.referenceCode}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-nb-body-sm text-nb-gray-700">{req.address}</p>
                    <p className="mt-1 font-mono text-[11px] text-nb-gray-500">
                      {new Date(req.createdAt).toLocaleDateString(intlLocale())} · {expectedLabel(req)}
                    </p>
                  </div>
                  <StatusPill tone={PRUNING_REQUEST_STATUS_TONES[req.status]} dot>
                    {getPruningRequestStatusLabel(req.status, t)}
                  </StatusPill>
                </div>
              </SectionCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
