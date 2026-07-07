'use client';

import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CalendarPlus, ClipboardPlus, UserPlus } from 'lucide-react';

import {
  KpiGrid,
  KpiTile,
  PageHeader,
  SectionCard,
  EmptyState,
} from '@/components/ui';
import { useUser } from '@/lib/auth/hooks';
import { ROLE_LABELS } from '@/lib/constants/roles';
import { useMonitoringAggregate } from '@/lib/api/monitoring-v2';
import { useTasks } from '@/lib/api/tasks';
import { usePruningRequests } from '@/lib/api/pruning-requests';
import { useOvertimes } from '@/lib/api/overtime';
import { useNotifications } from '@/lib/api/notifications';
import { usePlantStatusSummary } from '@/lib/api/plants';
import { formatRelativeTime } from '@/lib/utils/time';
import { cn } from '@/lib/utils/cn';

const ADMIN_ROLES = new Set(['admin_system', 'superadmin', 'top_management']);

// Presence model (current shift): HADIR = scheduled + clocked in, split into
// Aktif (fresh ping) / Tidak aktif (offline or stale), each with a dalam/luar
// sub-count; plus TIDAK HADIR = scheduled but not clocked in. Ad-hoc /
// unscheduled clock-ins are excluded from all counts by the backend.
type DonutKey = 'aktif' | 'tidak_aktif';

const DONUT_META: { key: DonutKey; labelKey: string; color: string }[] = [
  { key: 'aktif', labelKey: 'active', color: 'var(--color-status-active)' },
  { key: 'tidak_aktif', labelKey: 'idle', color: 'var(--color-status-idle)' },
];

const NUM = '—';

export default function DashboardPage() {
  const { t } = useTranslation();
  const user = useUser();
  const router = useRouter();
  const isAdmin = !!user && ADMIN_ROLES.has(user.role);

  const aggregate = useMonitoringAggregate('city');
  const tasks = useTasks();
  const pruning = usePruningRequests({ status: 'submitted' });
  const overtime = useOvertimes({ status: 'pending' });
  const notifications = useNotifications();
  const plantSummary = usePlantStatusSummary();

  // Rayons that currently have overdue plant maintenance (Phase 3-8 widget)
  const overdueRayons = useMemo(
    () => (plantSummary.data?.rayons ?? []).filter((r) => r.overdue > 0),
    [plantSummary.data]
  );
  const totalOverduePlants = useMemo(
    () => overdueRayons.reduce((sum, r) => sum + r.overdue, 0),
    [overdueRayons]
  );

  const counts = useMemo(() => {
    const d = aggregate.data;
    if (!d) return null;
    const p = d.presence_totals;
    const aktif = {
      total: p.aktif.dalam + p.aktif.luar,
      inside: p.aktif.dalam,
      outside: p.aktif.luar,
    };
    const tidak_aktif = {
      total: p.tidak_aktif.dalam + p.tidak_aktif.luar,
      inside: p.tidak_aktif.dalam,
      outside: p.tidak_aktif.luar,
    };
    return {
      scheduled: d.roster_totals.scheduled,
      hadir: d.roster_totals.clocked_in,
      tidak_hadir: d.roster_totals.not_clocked_in,
      aktif,
      tidak_aktif,
    };
  }, [aggregate.data]);

  // Count per donut segment (Aktif / Tidak aktif of the hadir workers).
  const donutCount = useCallback(
    (key: DonutKey): number => {
      if (!counts) return 0;
      return key === 'aktif' ? counts.aktif.total : counts.tidak_aktif.total;
    },
    [counts]
  );

  // Per-rayon hadir/scheduled, from the aggregate's rayon nodes.
  const perRayon = useMemo(
    () =>
      (aggregate.data?.nodes ?? []).map((n) => ({
        name: n.name,
        hadir: n.roster.clocked_in,
        scheduled: n.roster.scheduled,
      })),
    [aggregate.data]
  );

  // Conic-gradient donut: Aktif vs Tidak aktif split of the hadir workers.
  const donutGradient = useMemo(() => {
    if (!counts || counts.hadir === 0) return 'var(--color-nb-gray-200)';
    let acc = 0;
    const segments = DONUT_META.map(({ key, color }) => {
      const start = (acc / counts.hadir) * 100;
      acc += donutCount(key);
      const end = (acc / counts.hadir) * 100;
      return `${color} ${start}% ${end}%`;
    });
    return `conic-gradient(${segments.join(', ')})`;
  }, [counts, donutCount]);

  const recent = (notifications.data ?? []).slice(0, 5);

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${t('home:greeting')}, ${user?.full_name?.split(' ')[0] ?? t('home:user')}`}
        description={user ? ROLE_LABELS[user.role] || user.role : undefined}
      />

      {/* KPI tiles */}
      <KpiGrid columns={4}>
        <KpiTile
          tone="white"
          label={t('home:kpi.activeOfficers')}
          value={counts ? `${counts.hadir} / ${counts.scheduled}` : NUM}
        />
        <KpiTile
          tone="white"
          label={t('home:kpi.tasks')}
          value={tasks.data?.meta.total ?? NUM}
        />
        <KpiTile
          tone="yellow"
          label={t('home:kpi.incomingRequests')}
          value={pruning.data?.meta.total ?? NUM}
        />
        <KpiTile
          tone="white"
          label={t('home:kpi.pendingOvertimes')}
          value={overtime.data?.meta.total ?? NUM}
        />
      </KpiGrid>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Status breakdown */}
        <SectionCard
          title={t('home:statusSection.title')}
          meta={
            counts
              ? t('home:statusMeta', {
                  hadir: counts.hadir,
                  scheduled: counts.scheduled,
                  rayons: perRayon.length,
                })
              : undefined
          }
        >
          {!counts ? (
            <p className="py-6 text-center text-nb-body-sm text-nb-gray-600">
              {aggregate.isLoading ? t('home:statusSection.loading') : t('home:statusSection.unavailable')}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-6">
                {/* Donut: Aktif vs Tidak aktif of the hadir workers; center = hadir. */}
                <div
                  className="relative size-32 shrink-0 rounded-full border-2 border-nb-black"
                  style={{ background: donutGradient }}
                  role="img"
                  aria-label={t('home:ariaStatus', { hadir: counts.hadir, scheduled: counts.scheduled })}
                >
                  <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full border-2 border-nb-black bg-nb-white">
                    <span className="font-heading text-2xl font-extrabold leading-none text-nb-black">
                      {counts.hadir}
                    </span>
                    <span className="font-mono text-[10px] uppercase text-nb-gray-600">
                      {t('home:statusSection.present')}
                    </span>
                  </div>
                </div>
                <ul className="flex-1 space-y-1.5">
                  {/* HADIR breakdown: Aktif / Tidak aktif, each dalam·luar. */}
                  {DONUT_META.map(({ key, labelKey, color }) => {
                    const split = key === 'aktif' ? counts.aktif : counts.tidak_aktif;
                    const pct = counts.hadir ? Math.round((split.total / counts.hadir) * 100) : 0;
                    return (
                      <li key={key} className="flex items-center gap-2 text-nb-body-sm">
                        <span
                          className="mt-1 size-3 shrink-0 self-start rounded-sm border border-nb-black"
                          style={{ background: color }}
                        />
                        <span className="flex-1">
                          <span className="text-nb-gray-700">{t(`home:statusSection.${labelKey}`)}</span>
                          {split.total > 0 && (
                            <span className="block font-mono text-[10px] text-nb-gray-500">
                              {split.inside} {t('common:ui.withinArea')} · {split.outside}{' '}
                              {t('common:ui.outsideArea')}
                            </span>
                          )}
                        </span>
                        <span className="self-start font-mono text-[12px] font-bold text-nb-black">
                          {split.total} · {pct}%
                        </span>
                      </li>
                    );
                  })}
                  {/* Tidak Hadir — scheduled for this shift but not clocked in. */}
                  <li className="flex items-center gap-2 border-t border-nb-gray-200 pt-1.5 text-nb-body-sm">
                    <span
                      className="size-3 shrink-0 rounded-sm border border-nb-black"
                      style={{ background: 'var(--color-status-missing)' }}
                    />
                    <span className="flex-1 text-nb-gray-700">{t('home:statusSection.absent')}</span>
                    <span className="font-mono text-[12px] font-bold text-nb-danger-dark">
                      {counts.tidak_hadir}
                    </span>
                  </li>
                </ul>
              </div>

              {perRayon.length > 0 && (
                <>
                  <p className="mt-5 mb-2 font-mono text-[10px] font-bold uppercase tracking-wide text-nb-gray-600">
                    {t('home:statusSection.perRayon')}
                  </p>
                  <div className="space-y-1.5">
                    {perRayon.map((r) => {
                      const ratio = r.scheduled ? r.hadir / r.scheduled : 0;
                      const barColor =
                        ratio >= 0.75
                          ? 'var(--color-status-active)'
                          : ratio >= 0.5
                            ? 'var(--color-status-idle)'
                            : 'var(--color-status-missing)';
                      return (
                        <div key={r.name} className="flex items-center gap-3 text-nb-body-sm">
                          <span className="w-20 shrink-0 truncate text-nb-gray-700">{r.name}</span>
                          <div className="h-3 flex-1 overflow-hidden rounded-full border border-nb-black bg-nb-gray-100">
                            <div
                              className="h-full"
                              style={{ width: `${Math.min(100, ratio * 100)}%`, background: barColor }}
                            />
                          </div>
                          <span className="w-12 shrink-0 text-right font-mono text-[11px] font-bold text-nb-black">
                            {r.hadir}/{r.scheduled}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </SectionCard>

        {/* Quick actions + recent feed */}
        <div className="space-y-5">
          <SectionCard title={t('home:quickActions.title')} tone="yellow">
            <div className="grid grid-cols-3 gap-2">
              <QuickAction href="/tasks/new" icon={<ClipboardPlus className="size-5" />} label={t('home:quickActions.newTask')} />
              {isAdmin && (
                <QuickAction href="/users" icon={<UserPlus className="size-5" />} label={t('home:quickActions.newUser')} />
              )}
              <QuickAction href="/schedules" icon={<CalendarPlus className="size-5" />} label={t('home:quickActions.schedule')} />
            </div>
          </SectionCard>

          {/* Phase 3-8 close-out: plant maintenance overdue widget */}
          <SectionCard
            title={t('home:plants.title')}
            action={
              <Link
                href="/plants"
                className="font-mono text-[11px] font-bold text-nb-black underline underline-offset-2"
              >
                {t('home:plants.viewAll')}
              </Link>
            }
          >
            {plantSummary.isLoading ? (
              <p className="text-nb-body-sm text-nb-gray-500">{t('common:actions.loading')}</p>
            ) : overdueRayons.length === 0 ? (
              <p className="text-nb-body-sm text-nb-gray-600">
                {t('home:plants.allOnSchedule')} 🌿
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-nb-body-sm text-nb-gray-700">
                  {t('home:plants.overdueCount', { count: totalOverduePlants, rayons: overdueRayons.length })}
                </p>
                <ul className="space-y-1.5">
                  {overdueRayons.map((r) => (
                    <li
                      key={r.rayon_id ?? 'none'}
                      className="flex items-center justify-between gap-2 text-nb-body-sm"
                    >
                      <span className="min-w-0 truncate text-nb-gray-700">
                        {r.rayon_name ?? t('home:plants.noRayon')}
                        {r.overdue_areas[0] && (
                          <span className="text-nb-gray-500"> · {r.overdue_areas[0].area_name}</span>
                        )}
                      </span>
                      <span className="shrink-0 rounded-nb-sm border border-nb-danger bg-nb-danger-light/30 px-1.5 py-0.5 font-mono text-[11px] font-bold text-nb-danger-dark">
                        {r.overdue}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title={t('home:notifications.title')}
            action={
              <Link
                href="/notifications"
                className="font-mono text-[11px] font-bold text-nb-black underline underline-offset-2"
              >
                {t('home:notifications.viewAll')}
              </Link>
            }
            flush
          >
            {recent.length === 0 ? (
              <div className="p-4">
                <EmptyState variant="noData" size="sm" title={t('home:notifications.empty')} />
              </div>
            ) : (
              <ul>
                {recent.map((n) => {
                  return (
                    <li key={n.id} className="border-b border-nb-gray-200 last:border-b-0">
                      <button
                        type="button"
                        onClick={() => router.push(`/notifications/${n.id}`)}
                        className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-nb-primary-soft"
                      >
                        <span
                          className={cn(
                            'mt-1.5 size-2 shrink-0 rounded-full',
                            n.is_read ? 'bg-nb-gray-300' : 'bg-nb-primary'
                          )}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-nb-body-sm font-bold text-nb-black">
                            {n.title}
                          </span>
                          <span className="block truncate text-nb-body-sm text-nb-gray-600">
                            {n.body}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-nb-gray-500">
                          {formatRelativeTime(n.created_at)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 rounded-nb-base border-2 border-nb-black bg-nb-white px-2 py-3.5 text-center shadow-nb-xs transition-shadow hover:shadow-nb-sm focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-nb-primary focus-visible:outline-offset-2"
    >
      <span className="text-nb-black">{icon}</span>
      <span className="text-nb-caption font-bold text-nb-black">{label}</span>
    </Link>
  );
}
