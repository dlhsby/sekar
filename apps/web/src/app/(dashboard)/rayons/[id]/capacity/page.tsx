/**
 * Rayon Capacity Calendar — CAP-1 (Phase 3-11)
 *
 * Weekly service-capacity grid for one rayon. Read: admin_rayon (own rayon,
 * server-enforced), kepala_rayon, management, admin_system, superadmin.
 * Write (PUT upsert): kepala_rayon, management, superadmin — matches
 * apps/be/src/modules/service-capacity/service-capacity.controller.ts.
 */

'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/lib/auth/hooks';
import { useRayon } from '@/lib/api/rayons';
import { getRolling12WeekWindow } from '@/lib/utils/iso-week';
import { CapacityWeeklyGrid } from '@/components/capacity/CapacityWeeklyGrid';
import { FormSelect, PageHeader, StatusPill } from '@/components/ui';

const ALLOWED_ROLES = [
  'admin_rayon',
  'kepala_rayon',
  'management',
  'admin_system',
  'superadmin',
];
const WRITE_ROLES = ['kepala_rayon', 'management', 'superadmin'];

// The booking pipeline only consumes 'pruning' today (pruning-requests
// disposition); extend when new service types reach production.
const SERVICE_TYPES = ['pruning'];

interface CapacityPageProps {
  // Next 16: route params are a Promise and must be unwrapped with `use()`.
  params: Promise<{ id: string }>;
}

export default function RayonCapacityPage({ params }: CapacityPageProps) {
  const { t } = useTranslation();
  const { id } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const currentWindow = useMemo(() => getRolling12WeekWindow(), []);
  const [year, setYear] = useState(currentWindow.year);

  const { data: rayon, isLoading: rayonLoading } = useRayon(id);

  const allowed = !!user && ALLOWED_ROLES.includes(user.role);
  const canEdit = !!user && WRITE_ROLES.includes(user.role);

  useEffect(() => {
    if (!authLoading && user && !allowed) {
      router.push('/');
    }
  }, [user, authLoading, allowed, router]);

  // Current year → rolling 12-week window from this week; other years → W1-12.
  const { fromWeek, toWeek } =
    year === currentWindow.year
      ? {
          fromWeek: currentWindow.fromWeek,
          toWeek: Math.max(currentWindow.fromWeek, currentWindow.toWeek),
        }
      : { fromWeek: 1, toWeek: 12 };

  const yearOptions = useMemo(
    () =>
      [currentWindow.year - 1, currentWindow.year, currentWindow.year + 1].map((y) => ({
        value: String(y),
        label: String(y),
      })),
    [currentWindow.year],
  );

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-nb-gray-600">{t('common:actions.loading')}</p>
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <div className="space-y-5">
      <PageHeader
        data-testid="page-header"
        title={t('schedules:capacity.pageTitle')}
        description={
          rayonLoading
            ? t('schedules:capacity.pageDescriptionLoading')
            : t('schedules:capacity.pageDescription', { name: rayon?.name ?? '' })
        }
        actions={
          !canEdit ? <StatusPill tone="neutral">{t('schedules:capacity.readOnlyStatus')}</StatusPill> : undefined
        }
      />

      <div className="max-w-[160px]">
        <FormSelect
          label={t('schedules:capacity.yearLabel')}
          options={yearOptions}
          value={String(year)}
          onChange={(v) => {
            const parsed = parseInt(v, 10);
            if (!Number.isNaN(parsed)) setYear(parsed);
          }}
        />
      </div>

      <CapacityWeeklyGrid
        rayonId={id}
        year={year}
        fromWeek={fromWeek}
        toWeek={toWeek}
        serviceTypes={SERVICE_TYPES}
        canEdit={canEdit}
      />
    </div>
  );
}
